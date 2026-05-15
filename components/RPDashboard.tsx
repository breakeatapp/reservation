'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RPProfile, Reservation, ReservationStatus, RPClientNote } from '@/lib/supabase'
import { parseVenueEntry, serializeVenueEntry, ALL_SERVICES } from '@/lib/venue-utils'

type Props = { profile: RPProfile }

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  declined: 'Refusé',
  cancelled: 'Annulé',
}
const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/25',
  declined: 'bg-red-500/10 text-red-400 border-red-500/25',
  cancelled: 'bg-white/5 text-[#F5F5F3]/20 border-white/8',
}
const STATUS_DOT: Record<ReservationStatus, string> = {
  pending: 'bg-amber-400 animate-pulse',
  confirmed: 'bg-green-400',
  declined: 'bg-red-400',
  cancelled: 'bg-[#F5F5F3]/15',
}

const VIP_TAGS = ['', 'VIP', 'Gold', 'Régulier', 'Corporate', 'Blacklist']
const VIP_COLORS: Record<string, string> = {
  '': 'text-[#F5F5F3]/20',
  VIP: 'text-purple-400',
  Gold: 'text-amber-400',
  Régulier: 'text-blue-400',
  Corporate: 'text-cyan-400',
  Blacklist: 'text-red-400',
}

function buildWhatsAppMessage(r: Reservation, profile: RPProfile): string {
  const extras = [
    r.occasion ? `🎉 Occasion : ${r.occasion}` : '',
    r.seating ? `🪑 Placement : ${r.seating}` : '',
    r.vip_level && r.vip_level !== '' ? `⭐ Profil : ${r.vip_level}` : '',
    r.budget_level && r.budget_level !== '' ? `💰 Budget : ${r.budget_level}` : '',
  ].filter(Boolean)

  return [
    `🏠 *${r.establishment}*`,
    r.destination ? `📍 ${r.destination}` : '',
    ``,
    `📅 ${r.date}`,
    `🕐 ${r.time}`,
    `👥 ${r.guests} personne${r.guests > 1 ? 's' : ''}`,
    ``,
    `👤 *CLIENT*`,
    `${r.first_name} ${r.last_name}`,
    `📞 ${r.phone}`,
    `✉️ ${r.email}`,
    extras.length > 0 ? `` : '',
    ...extras,
    r.special_requests ? `` : '',
    r.special_requests ? `📝 "${r.special_requests}"` : '',
  ].filter(l => l !== undefined).join('\n')
}

type MainView = 'list' | 'clients' | 'config'

// Toutes les destinations disponibles dans la plateforme
const ALL_DESTINATIONS = [
  { slug: 'saint-tropez', name: 'Saint-Tropez', emoji: '⛵' },
  { slug: 'dubai', name: 'Dubai', emoji: '🏙️' },
  { slug: 'miami', name: 'Miami', emoji: '🌴' },
  { slug: 'cannes', name: 'Cannes', emoji: '🎬' },
  { slug: 'monaco', name: 'Monaco', emoji: '🎰' },
  { slug: 'courchevel', name: 'Courchevel', emoji: '⛷️' },
  { slug: 'saint-barth', name: 'Saint-Barthélemy', emoji: '🌊' },
  { slug: 'ibiza', name: 'Ibiza', emoji: '🎶' },
  { slug: 'mykonos', name: 'Mykonos', emoji: '🏛️' },
  { slug: 'maldives', name: 'Maldives', emoji: '🌺' },
]

export default function RPDashboard({ profile }: Props) {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all')
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [mainView, setMainView] = useState<MainView>('list')

  // Fiche client
  const [clientNote, setClientNote] = useState<RPClientNote | null>(null)
  const [editVipTag, setEditVipTag] = useState('')
  const [editInternalNote, setEditInternalNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  // Notes clients indexées par email (pour affichage dans la liste)
  const [clientNotes, setClientNotes] = useState<Record<string, RPClientNote>>({})

  // Clients list
  const [clients, setClients] = useState<RPClientNote[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Ajout client
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addClientEmail, setAddClientEmail] = useState('')
  const [addClientName, setAddClientName] = useState('')
  const [addClientLoading, setAddClientLoading] = useState(false)
  const [addClientSuccess, setAddClientSuccess] = useState('')
  const [addClientError, setAddClientError] = useState('')

  // Configuration
  const [configDests, setConfigDests] = useState<string[]>(profile.activated_destinations ?? [])
  const [configVenues, setConfigVenues] = useState<string[]>(profile.activated_venues ?? [])
  const [configTagline, setConfigTagline] = useState(profile.tagline || 'Hospitality, Organized.')
  const [configAccent, setConfigAccent] = useState(profile.accent_color || '#5B3DF5')
  const [configLogoText, setConfigLogoText] = useState(profile.logo_text || '')
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [configError, setConfigError] = useState('')
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueDest, setNewVenueDest] = useState('')
  const [newVenueServices, setNewVenueServices] = useState<string[]>([])
  const [showServicePicker, setShowServicePicker] = useState(false)
  // Villes personnalisées
  const [newCityName, setNewCityName] = useState('')
  const [newCityCountry, setNewCityCountry] = useState('')

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    try {
      const [resaRes, clientRes] = await Promise.all([
        fetch(`/api/rp/${profile.slug}/reservations`, {
          headers: { 'x-rp-password': password },
        }),
        fetch(`/api/rp/${profile.slug}/clients`, {
          headers: { 'x-rp-password': password },
        }),
      ])
      if (resaRes.ok) {
        const data = await resaRes.json()
        setReservations(Array.isArray(data) ? data : [])
      }
      if (clientRes.ok) {
        const clientData: RPClientNote[] = await clientRes.json()
        // Indexer par email pour lookup O(1)
        const map: Record<string, RPClientNote> = {}
        clientData.forEach(c => { map[c.client_email.toLowerCase()] = c })
        setClientNotes(map)
      }
    } finally {
      setLoading(false)
    }
  }, [password, profile.slug])

  const fetchClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        headers: { 'x-rp-password': password },
      })
      if (res.ok) {
        const data = await res.json()
        setClients(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoadingClients(false)
    }
  }, [password, profile.slug])

  const loadClientNote = useCallback(async (email: string) => {
    setClientNote(null)
    try {
      const res = await fetch(
        `/api/rp/${profile.slug}/clients?email=${encodeURIComponent(email)}`,
        { headers: { 'x-rp-password': password } }
      )
      if (res.ok) {
        const data = await res.json()
        setClientNote(data)
        setEditVipTag(data?.vip_tag ?? '')
        setEditInternalNote(data?.internal_note ?? '')
      }
    } catch {
      // ignore
    }
  }, [password, profile.slug])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === profile.dashboard_password) {
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  useEffect(() => {
    if (authenticated) fetchReservations()
  }, [authenticated, fetchReservations])

  // Charger la fiche client quand une réservation est sélectionnée
  useEffect(() => {
    if (selected) {
      loadClientNote(selected.email)
      setNoteSaved(false)
    }
  }, [selected, loadClientNote])

  // Charger les clients quand on change de vue
  useEffect(() => {
    if (authenticated && mainView === 'clients') fetchClients()
  }, [authenticated, mainView, fetchClients])

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setUpdating(id)
    await fetch(`/api/rp/${profile.slug}/reservations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
      body: JSON.stringify({ id, status }),
    })
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev)
    setUpdating(null)
  }

  const saveClientNote = async () => {
    if (!selected) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          clientEmail: selected.email,
          clientName: `${selected.first_name} ${selected.last_name}`,
          vipTag: editVipTag,
          internalNote: editInternalNote,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setClientNote(data)
        // Mettre à jour l'index en temps réel → visible immédiatement dans la liste
        setClientNotes(prev => ({ ...prev, [data.client_email.toLowerCase()]: data }))
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 3000)
      }
    } finally {
      setSavingNote(false)
    }
  }

  const copyMessage = async (r: Reservation) => {
    await navigator.clipboard.writeText(buildWhatsAppMessage(r, profile))
    setCopied(r.id)
    setTimeout(() => setCopied(null), 2500)
  }

  const whatsappToEstablishment = (r: Reservation) => {
    const phone = r.establishment_phone?.replace(/[^0-9]/g, '')
    const msg = buildWhatsAppMessage(r, profile)
    return phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  const whatsappShare = (r: Reservation) =>
    `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(r, profile))}`

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)
  const counts = {
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    declined: reservations.filter(r => r.status === 'declined').length,
  }

  // ── LOGIN ─────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <p className="text-[10px] tracking-[0.5em] text-[#5B3DF5]/50 uppercase mb-3">Espace RP</p>
            <h1 className="font-playfair text-3xl text-[#F5F5F3]">{profile.display_name}</h1>
            <p className="text-[#F5F5F3]/20 text-xs mt-2 tracking-wider">Dashboard de gestion</p>
          </div>
          <form onSubmit={handleLogin} className="bg-[#141414] border border-white/5 p-8">
            <label className="block text-[9px] tracking-[0.3em] text-[#F5F5F3]/30 uppercase mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm focus:border-white/30 outline-none transition-colors mb-4"
              placeholder="••••••••"
              autoFocus
            />
            {authError && <p className="text-red-400/60 text-xs mb-4">Mot de passe incorrect.</p>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.25em] uppercase py-3.5 hover:opacity-90 transition-opacity"
            >
              Accéder
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── VUE DÉTAIL ────────────────────────────────────────────────
  if (selected) {
    const msg = buildWhatsAppMessage(selected, profile)
    const vipColor = VIP_COLORS[editVipTag] || 'text-[#F5F5F3]/20'

    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-[#F5F5F3]/40 hover:text-[#F5F5F3] p-1 text-lg">←</button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#F5F5F3] truncate">{selected.first_name} {selected.last_name}</p>
            <p className="text-[10px] text-[#F5F5F3]/30 truncate">{selected.establishment} · {selected.date}</p>
          </div>
          <span className={`text-[9px] tracking-wider uppercase border px-2 py-1 flex-shrink-0 ${STATUS_STYLES[selected.status]}`}>
            {STATUS_LABELS[selected.status]}
          </span>
        </div>

        <div className="px-4 py-5 space-y-3 pb-24 max-w-2xl mx-auto">

          {/* Réservation */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/40 uppercase mb-3">Réservation</p>
            <p className="font-playfair text-xl text-[#F5F5F3] mb-0.5">{selected.establishment}</p>
            <p className="text-[#F5F5F3]/25 text-xs uppercase tracking-wider mb-4">{selected.destination}</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Date', value: selected.date },
                { label: 'Service', value: selected.time },
                { label: 'Personnes', value: `${selected.guests}` },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[8px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1">{item.label}</p>
                  <p className="text-[#F5F5F3]/80 text-sm leading-tight">{item.value}</p>
                </div>
              ))}
            </div>
            {(selected.occasion || selected.seating) && (
              <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-[#F5F5F3]/40">
                {selected.occasion && <span>🎉 {selected.occasion}</span>}
                {selected.seating && <span>🪑 {selected.seating}</span>}
              </div>
            )}
            {selected.special_requests && (
              <div className="mt-3 pt-3 border-t border-white/5 border-l-2 border-l-[#5B3DF5]/30 pl-3">
                <p className="text-[#F5F5F3]/40 text-xs italic">"{selected.special_requests}"</p>
              </div>
            )}
          </div>

          {/* Client */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/40 uppercase">Client</p>
              {editVipTag && (
                <span className={`text-[9px] tracking-[0.15em] uppercase font-medium ${vipColor}`}>
                  ✦ {editVipTag}
                </span>
              )}
            </div>
            <p className="text-[#F5F5F3] font-medium mb-3">{selected.first_name} {selected.last_name}</p>
            <div className="space-y-2">
              <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
                <span>📞</span><span className="text-sm">{selected.phone}</span>
              </a>
              <a href={`mailto:${selected.email}`} className="flex items-center gap-3 text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
                <span>✉️</span><span className="text-sm">{selected.email}</span>
              </a>
            </div>
            {clientNote?.internal_note && (
              <div className="mt-3 pt-3 border-t border-white/5 border-l-2 border-l-amber-500/30 pl-3">
                <p className="text-[8px] tracking-wider text-amber-400/40 uppercase mb-1">Note privée</p>
                <p className="text-[#F5F5F3]/40 text-xs italic">"{clientNote.internal_note}"</p>
              </div>
            )}
          </div>

          {/* ── FICHE CLIENT ── */}
          <div className="bg-[#141414] border border-amber-500/10 p-5">
            <p className="text-[9px] tracking-[0.3em] text-amber-400/40 uppercase mb-4">Fiche client privée</p>

            <div className="mb-3">
              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-2">Tag VIP</label>
              <div className="flex flex-wrap gap-2">
                {VIP_TAGS.map(tag => (
                  <button
                    key={tag || 'none'}
                    onClick={() => setEditVipTag(tag)}
                    className={`px-3 py-1.5 text-[9px] tracking-[0.2em] uppercase border transition-all ${
                      editVipTag === tag
                        ? `border-current ${VIP_COLORS[tag] || 'text-[#F5F5F3]/30'} bg-current/10`
                        : 'border-white/10 text-[#F5F5F3]/25 hover:border-white/20'
                    }`}
                  >
                    {tag || 'Aucun'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-2">Note interne</label>
              <textarea
                rows={3}
                value={editInternalNote}
                onChange={e => setEditInternalNote(e.target.value)}
                className="w-full bg-[#0B0B0B] border border-white/8 text-[#F5F5F3] px-3 py-2.5 text-xs focus:border-amber-500/30 outline-none resize-none placeholder-[#F5F5F3]/15"
                placeholder="Notes confidentielles sur ce client..."
              />
            </div>

            <button
              onClick={saveClientNote}
              disabled={savingNote}
              className="w-full border border-amber-500/20 text-amber-400/60 text-[10px] tracking-[0.2em] uppercase py-3 hover:bg-amber-500/5 hover:border-amber-500/40 transition-all disabled:opacity-40"
            >
              {savingNote ? 'Enregistrement...' : noteSaved ? '✓ Fiche sauvegardée' : '✎ Sauvegarder la fiche'}
            </button>

            {clientNote && (
              <p className="text-[8px] text-[#F5F5F3]/15 text-center mt-2">
                {clientNote.total_resas} réservation{clientNote.total_resas > 1 ? 's' : ''} au total avec ce RP
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/40 uppercase mb-3">Envoyer sur WhatsApp</p>
            <div className="bg-[#0B0B0B] p-3 rounded mb-3 font-mono text-[10px] text-[#F5F5F3]/30 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {msg}
            </div>
            <div className="space-y-2">
              <a
                href={whatsappToEstablishment(selected)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-[11px] tracking-[0.2em] uppercase py-3.5 hover:opacity-90 transition-opacity"
              >
                <WhatsAppIcon /> Envoyer à {selected.establishment}
              </a>
              <a
                href={whatsappShare(selected)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-[#25D366]/30 text-[#25D366]/70 text-[11px] tracking-[0.2em] uppercase py-3 hover:bg-[#25D366]/5 transition-colors"
              >
                <WhatsAppIcon /> Choisir le contact
              </a>
              <button
                onClick={() => copyMessage(selected)}
                className="flex items-center justify-center gap-2 w-full border border-white/8 text-[#F5F5F3]/30 text-[11px] tracking-[0.2em] uppercase py-3 hover:border-white/15 transition-colors"
              >
                {copied === selected.id ? '✓ Copié !' : '📋 Copier le message'}
              </button>
            </div>
          </div>

          {/* Actions statut — masqué seulement si annulé par le client */}
          {selected.status !== 'cancelled' && (
            <div className="bg-[#141414] border border-white/5 p-5">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/40 uppercase mb-4">Modifier le statut</p>
              <div className="grid grid-cols-2 gap-2">

                {/* ✓ Confirmer — disponible si pas déjà confirmé */}
                {selected.status !== 'confirmed' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'confirmed')}
                    disabled={!!updating}
                    className="col-span-1 py-3.5 text-[10px] tracking-[0.2em] uppercase bg-green-500/8 border border-green-500/20 text-green-400 hover:bg-green-500/15 transition-colors disabled:opacity-40"
                  >
                    ✓ Confirmer
                  </button>
                )}

                {/* ✕ Refuser — disponible si pas déjà refusé */}
                {selected.status !== 'declined' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'declined')}
                    disabled={!!updating}
                    className="col-span-1 py-3.5 text-[10px] tracking-[0.2em] uppercase bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                  >
                    ✕ Refuser
                  </button>
                )}

                {/* ↩ Remettre en attente — disponible si confirmé ou refusé */}
                {(selected.status === 'confirmed' || selected.status === 'declined') && (
                  <button
                    onClick={() => updateStatus(selected.id, 'pending')}
                    disabled={!!updating}
                    className="col-span-2 py-3 text-[10px] tracking-[0.2em] uppercase border border-white/10 text-[#F5F5F3]/30 hover:border-white/20 hover:text-[#F5F5F3]/50 transition-colors disabled:opacity-40"
                  >
                    ↩ Remettre en attente
                  </button>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Ajouter un client ─────────────────────────────────────────
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addClientEmail.trim()) return
    setAddClientLoading(true)
    setAddClientError('')
    setAddClientSuccess('')
    try {
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          clientEmail: addClientEmail.trim().toLowerCase(),
          clientName: addClientName.trim(),
          vipTag: '',
          internalNote: '',
          sendWelcome: true,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        const emailSent = d.welcomeEmailSent ? ' · Email de bienvenue envoyé' : ''
        setAddClientSuccess(`✓ ${addClientName || addClientEmail} ajouté${emailSent}`)
        setAddClientEmail('')
        setAddClientName('')
        setAddClientOpen(false)
        fetchClients()
      } else {
        const d = await res.json()
        setAddClientError(d.error || 'Erreur lors de l\'ajout.')
      }
    } catch {
      setAddClientError('Erreur réseau.')
    } finally {
      setAddClientLoading(false)
    }
  }

  // ── SAVE CONFIG ───────────────────────────────────────────────
  const saveConfig = async () => {
    setConfigSaving(true)
    setConfigError('')
    try {
      const res = await fetch(`/api/rp/${profile.slug}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          activated_destinations: configDests,
          activated_venues: configVenues,
          tagline: configTagline,
          accent_color: configAccent,
          logo_text: configLogoText,
        }),
      })
      if (res.ok) {
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
      } else {
        const d = await res.json()
        setConfigError(d.error || 'Erreur lors de la sauvegarde.')
      }
    } catch {
      setConfigError('Erreur réseau.')
    } finally {
      setConfigSaving(false)
    }
  }

  const toggleDest = (slug: string) => {
    setConfigDests(prev =>
      prev.includes(slug) ? prev.filter(d => d !== slug) : [...prev, slug]
    )
  }

  const addCustomCity = () => {
    const name = newCityName.trim()
    if (!name) return
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    // Vérifier que ce slug n'existe pas déjà
    if (configDests.includes(slug)) return
    const isExisting = configDests.some(raw => { try { return JSON.parse(raw).slug === slug } catch { return false } })
    if (isExisting) return
    const entry = JSON.stringify({ slug, name, country: newCityCountry.trim() || '', emoji: '📍' })
    setConfigDests(prev => [...prev, entry])
    setNewCityName('')
    setNewCityCountry('')
  }

  const removeCustomCity = (entry: string) => {
    setConfigDests(prev => prev.filter(d => d !== entry))
  }

  const addCustomVenue = () => {
    const name = newVenueName.trim()
    if (!name) return
    const existing = configVenues.map(parseVenueEntry)
    if (existing.some(v => v.name === name)) return
    const serialized = serializeVenueEntry({
      name,
      destination: newVenueDest || undefined,
      services: newVenueServices.length > 0 ? newVenueServices : undefined,
    })
    setConfigVenues(prev => [...prev, serialized])
    setNewVenueName('')
    setNewVenueDest('')
    setNewVenueServices([])
    setShowServicePicker(false)
  }

  const removeVenue = (raw: string) => {
    setConfigVenues(prev => prev.filter(v => v !== raw))
  }

  const toggleNewVenueService = (s: string) => {
    setNewVenueServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  // ── VUE CONFIGURATION ─────────────────────────────────────────
  if (mainView === 'config') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/40 uppercase">Configuration</p>
            <h1 className="font-playfair text-lg text-[#F5F5F3]">{profile.display_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="text-[10px] tracking-[0.2em] uppercase px-4 py-2 transition-colors disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${configAccent}, ${configAccent}bb)`, color: 'white' }}
            >
              {configSaving ? '...' : configSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => setMainView('list')}
              className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 transition-colors border border-white/5 hover:border-white/15 px-3 py-2"
            >
              ← Retour
            </button>
          </div>
        </div>

        {configError && (
          <div className="mx-4 mt-4 border border-red-500/20 bg-red-500/5 text-red-400 text-sm px-4 py-3">
            {configError}
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">

          {/* ── Profil ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/40 uppercase mb-4">Profil public</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[8px] tracking-wider text-[#F5F5F3]/30 uppercase mb-1.5">Tagline</label>
                <input
                  type="text"
                  value={configTagline}
                  onChange={e => setConfigTagline(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 transition-colors"
                  placeholder="Hospitality, Organized."
                />
              </div>
              <div>
                <label className="block text-[8px] tracking-wider text-[#F5F5F3]/30 uppercase mb-1.5">Texte logo</label>
                <input
                  type="text"
                  value={configLogoText}
                  onChange={e => setConfigLogoText(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 transition-colors"
                  placeholder="ÉLITE"
                />
              </div>
              <div>
                <label className="block text-[8px] tracking-wider text-[#F5F5F3]/30 uppercase mb-1.5">Couleur accent</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={configAccent}
                    onChange={e => setConfigAccent(e.target.value)}
                    className="w-12 h-10 cursor-pointer bg-transparent border-0 outline-none"
                  />
                  <span className="text-[#F5F5F3]/40 text-sm font-mono">{configAccent}</span>
                  <div className="flex gap-2 ml-auto">
                    {['#5B3DF5', '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF'].map(c => (
                      <button key={c} onClick={() => setConfigAccent(c)}
                        className="w-6 h-6 rounded-full border-2 transition-all"
                        style={{ background: c, borderColor: configAccent === c ? 'white' : 'transparent' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Destinations ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/40 uppercase">Destinations actives</p>
              <span className="text-[10px] text-[#F5F5F3]/30">{configDests.length} sélectionnée{configDests.length > 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ALL_DESTINATIONS.map(dest => {
                const active = configDests.includes(dest.slug)
                return (
                  <button
                    key={dest.slug}
                    onClick={() => toggleDest(dest.slug)}
                    className={`flex items-center gap-3 p-3 border text-left transition-all ${
                      active
                        ? 'border-[#5B3DF5]/50 bg-[#5B3DF5]/8 text-[#F5F5F3]'
                        : 'border-white/5 text-[#F5F5F3]/30 hover:border-white/15'
                    }`}
                  >
                    <span className="text-lg">{dest.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{dest.name}</p>
                    </div>
                    <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center ${
                      active ? 'border-[#5B3DF5] bg-[#5B3DF5]' : 'border-white/15'
                    }`}>
                      {active && <span className="text-white text-[10px]">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[#F5F5F3]/20 text-[10px] mt-3">
              Si aucune destination n'est sélectionnée, toutes sont accessibles.
            </p>

            {/* ── Villes personnalisées (JSON dans configDests) ── */}
            {(() => {
              const customEntries = configDests.filter(raw => { try { const p = JSON.parse(raw); return !!(p?.slug && p?.name) } catch { return false } })
              return customEntries.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 mb-2">Villes personnalisées actives</p>
                  {customEntries.map(raw => {
                    const city = JSON.parse(raw)
                    return (
                      <div key={raw} className="flex items-center gap-2 bg-[#0B0B0B] border border-[#5B3DF5]/20 px-3 py-2">
                        <span>📍</span>
                        <span className="text-[#F5F5F3]/80 text-sm flex-1">{city.name}</span>
                        {city.country && <span className="text-[#F5F5F3]/30 text-xs">{city.country}</span>}
                        <button onClick={() => removeCustomCity(raw)} className="text-[#F5F5F3]/20 hover:text-red-400/60 transition-colors text-lg">×</button>
                      </div>
                    )
                  })}
                </div>
              ) : null
            })()}

            {/* ── Ajouter une ville ── */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 mb-3">Ajouter une ville non listée</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCity() } }}
                  placeholder="Nom de la ville…"
                  className="flex-1 bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2 text-sm outline-none focus:border-white/25 placeholder-[#F5F5F3]/20 transition-colors"
                />
                <input
                  type="text"
                  value={newCityCountry}
                  onChange={e => setNewCityCountry(e.target.value)}
                  placeholder="Pays"
                  className="w-28 bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2 text-sm outline-none focus:border-white/25 placeholder-[#F5F5F3]/20 transition-colors"
                />
                <button
                  onClick={addCustomCity}
                  disabled={!newCityName.trim()}
                  className="px-4 py-2 border border-[#5B3DF5]/40 text-[#5B3DF5]/70 text-[11px] tracking-[0.2em] uppercase hover:bg-[#5B3DF5]/8 transition-colors disabled:opacity-30 flex-shrink-0"
                >
                  + Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* ── Restaurants & Venues ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/40 uppercase mb-1">Restaurants & venues personnalisés</p>
            <p className="text-[#F5F5F3]/30 text-xs mb-5 leading-relaxed">
              Ajoutez des adresses de votre choix avec leurs créneaux. Si vide, tous les établissements de vos destinations sont proposés.
            </p>

            {/* ── Formulaire ajout venue ── */}
            <div className="bg-[#0B0B0B] border border-white/8 p-4 mb-4 space-y-3">
              {/* Ligne 1 : ville + nom */}
              <div className="flex gap-2">
                <select
                  value={newVenueDest}
                  onChange={e => setNewVenueDest(e.target.value)}
                  className="bg-[#141414] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 transition-colors w-44 flex-shrink-0"
                >
                  <option value="" className="bg-[#141414]">Ville…</option>
                  {configDests.length > 0
                    ? configDests.map(raw => {
                        let slug = raw, label = raw
                        try {
                          const p = JSON.parse(raw)
                          if (p?.slug && p?.name) { slug = p.slug; label = p.name }
                        } catch { label = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/-/g, ' ') }
                        return (
                          <option key={slug} value={slug} className="bg-[#141414]">{label}</option>
                        )
                      })
                    : <option value="" disabled className="bg-[#141414]">Activez d'abord des destinations</option>
                  }
                </select>
                <input
                  type="text"
                  value={newVenueName}
                  onChange={e => setNewVenueName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomVenue() } }}
                  placeholder="Nom du restaurant ou venue…"
                  className="flex-1 bg-[#141414] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 placeholder-[#F5F5F3]/20 transition-colors"
                />
              </div>

              {/* Ligne 2 : créneaux */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowServicePicker(p => !p)}
                  className="text-[10px] tracking-[0.2em] uppercase text-[#5B3DF5]/60 hover:text-[#5B3DF5] transition-colors flex items-center gap-2"
                >
                  <span>{showServicePicker ? '▾' : '▸'}</span>
                  Configurer les créneaux
                  {newVenueServices.length > 0 && (
                    <span className="bg-[#5B3DF5]/20 text-[#5B3DF5]/80 text-[9px] px-2 py-0.5 rounded-full">
                      {newVenueServices.length} sélectionné{newVenueServices.length > 1 ? 's' : ''}
                    </span>
                  )}
                </button>

                {showServicePicker && (
                  <div className="mt-3 grid grid-cols-1 gap-1.5">
                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 mb-1">
                      Laisser vide = tous les créneaux proposés
                    </p>
                    {ALL_SERVICES.map(s => (
                      <label key={s} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() => toggleNewVenueService(s)}
                          className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                            newVenueServices.includes(s)
                              ? 'border-[#5B3DF5] bg-[#5B3DF5]/20'
                              : 'border-white/15 hover:border-white/30'
                          }`}
                        >
                          {newVenueServices.includes(s) && (
                            <svg className="w-2.5 h-2.5 text-[#5B3DF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          onClick={() => toggleNewVenueService(s)}
                          className={`text-xs transition-colors ${newVenueServices.includes(s) ? 'text-[#F5F5F3]/80' : 'text-[#F5F5F3]/35 group-hover:text-[#F5F5F3]/55'}`}
                        >
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton ajouter */}
              <button
                onClick={addCustomVenue}
                disabled={!newVenueName.trim()}
                className="w-full py-2.5 border border-[#5B3DF5]/40 text-[#5B3DF5]/70 text-[11px] tracking-[0.2em] uppercase hover:bg-[#5B3DF5]/8 transition-colors disabled:opacity-30"
              >
                + Ajouter à ma liste
              </button>
            </div>

            {/* ── Liste venues actifs ── */}
            {configVenues.length > 0 ? (
              <div className="space-y-1.5">
                {configVenues.map((raw, idx) => {
                  const vc = parseVenueEntry(raw)
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-[#0B0B0B] border border-white/5 px-3 py-2.5">
                      {vc.destination && (
                        <span className="text-[9px] tracking-[0.15em] uppercase text-[#5B3DF5]/50 flex-shrink-0 hidden sm:block">
                          {vc.destination.replace(/-/g, ' ')}
                        </span>
                      )}
                      <span className="text-[#F5F5F3]/70 text-sm flex-1 truncate">{vc.name}</span>
                      {vc.services && vc.services.length > 0 ? (
                        <span className="text-[9px] text-[#F5F5F3]/25 flex-shrink-0">
                          {vc.services.length} créneau{vc.services.length > 1 ? 'x' : ''}
                        </span>
                      ) : (
                        <span className="text-[9px] text-[#F5F5F3]/15 flex-shrink-0">tous</span>
                      )}
                      <button
                        onClick={() => removeVenue(raw)}
                        className="text-[#F5F5F3]/20 hover:text-red-400/60 transition-colors text-lg flex-shrink-0 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[#F5F5F3]/20 text-xs italic text-center py-4">
                Aucune venue spécifique — tous les établissements de vos destinations sont affichés.
              </p>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={saveConfig}
            disabled={configSaving}
            className="w-full py-4 text-white text-[11px] tracking-[0.3em] uppercase hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${configAccent}, ${configAccent}bb)` }}
          >
            {configSaving ? 'Sauvegarde en cours...' : configSaved ? '✓ Configuration sauvegardée' : 'Sauvegarder la configuration'}
          </button>

        </div>
      </div>
    )
  }

  // ── VUE CLIENTS ───────────────────────────────────────────────
  if (mainView === 'clients') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.4em] text-amber-400/30 uppercase">Fiches clients</p>
            <h1 className="font-playfair text-lg text-[#F5F5F3]">{profile.display_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddClientOpen(v => !v); setAddClientError(''); setAddClientSuccess('') }}
              className="text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-amber-500/20 text-amber-400/60 hover:bg-amber-500/8 transition-colors"
            >
              + Ajouter
            </button>
            <button
              onClick={() => setMainView('list')}
              className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#5B3DF5]/60 transition-colors border border-white/5 hover:border-[#5B3DF5]/20 px-3 py-2"
            >
              ← Retour
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">

          {/* Formulaire ajout client */}
          {addClientOpen && (
            <form onSubmit={handleAddClient} className="m-4 bg-[#141414] border border-amber-500/15 p-5">
              <p className="text-[9px] tracking-[0.3em] text-amber-400/50 uppercase mb-4">Ajouter un client</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Prénom & Nom</label>
                  <input
                    type="text"
                    value={addClientName}
                    onChange={e => setAddClientName(e.target.value)}
                    className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-amber-500/30"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={addClientEmail}
                    onChange={e => setAddClientEmail(e.target.value)}
                    className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-amber-500/30"
                    placeholder="jean@email.com"
                    required
                  />
                </div>
              </div>
              {addClientError && <p className="text-red-400/60 text-xs mb-3">{addClientError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddClientOpen(false)}
                  className="flex-1 border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase py-2.5 hover:border-white/20 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addClientLoading}
                  className="flex-1 border border-amber-500/30 text-amber-400/70 text-[10px] tracking-[0.2em] uppercase py-2.5 hover:bg-amber-500/8 transition-colors disabled:opacity-40"
                >
                  {addClientLoading ? 'Ajout...' : 'Confirmer'}
                </button>
              </div>
            </form>
          )}

          {addClientSuccess && (
            <div className="mx-4 my-2 border border-green-500/20 bg-green-500/8 text-green-400 text-sm px-4 py-3">
              {addClientSuccess}
            </div>
          )}

          {loadingClients ? (
            <div className="flex items-center justify-center h-40 text-[#F5F5F3]/20 text-sm">Chargement...</div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3 text-center px-8">
              <span className="text-4xl opacity-20">👤</span>
              <p className="text-[#F5F5F3]/20 text-sm">Aucun client inscrit.</p>
              <p className="text-[#F5F5F3]/10 text-xs">Ajoutez des clients avec le bouton "+ Ajouter" ci-dessus.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {clients.map(c => {
                const vipColor = VIP_COLORS[c.vip_tag] || 'text-[#F5F5F3]/20'
                return (
                  <div key={c.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-[#F5F5F3] text-sm font-medium">{c.client_name || c.client_email}</p>
                      {c.vip_tag && (
                        <span className={`text-[9px] tracking-[0.2em] uppercase font-medium flex-shrink-0 ${vipColor}`}>
                          ✦ {c.vip_tag}
                        </span>
                      )}
                    </div>
                    <p className="text-[#F5F5F3]/30 text-xs mb-1">{c.client_email}</p>
                    <div className="flex items-center gap-3 text-[#F5F5F3]/20 text-[10px]">
                      <span>{c.total_resas ?? 0} résa{(c.total_resas ?? 0) > 1 ? 's' : ''}</span>
                      {c.internal_note && (
                        <>
                          <span>·</span>
                          <span className="truncate max-w-[180px] italic">"{c.internal_note}"</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LISTE RÉSERVATIONS ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/40 uppercase">Dashboard RP</p>
          <h1 className="font-playfair text-lg text-[#F5F5F3]">{profile.display_name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMainView('config')}
            className="text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white transition-colors border border-white/20 hover:border-white/50 px-3 py-2"
          >
            ⚙ Config
          </button>
          <button
            onClick={() => setMainView('clients')}
            className="text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white transition-colors border border-white/20 hover:border-white/50 px-3 py-2"
          >
            👤 Clients
          </button>
          <button
            onClick={fetchReservations}
            className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/70 hover:text-white transition-colors border border-white/20 hover:border-white/50 px-3 py-2"
          >
            {loading
              ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : '↻'
            }
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Compteurs / filtres */}
      <div className="grid grid-cols-4 border-b border-white/5">
        {(['all', 'pending', 'confirmed', 'declined'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`py-4 text-center transition-all border-b-2 ${filter === s ? 'border-[#5B3DF5] bg-[#5B3DF5]/5' : 'border-transparent hover:bg-white/3'}`}
          >
            <div className={`text-2xl font-light ${
              filter === s ? 'text-white' :
              s === 'pending' ? 'text-amber-300/80' :
              s === 'confirmed' ? 'text-green-300/80' :
              s === 'declined' ? 'text-red-300/60' :
              'text-white/70'
            }`}>
              {counts[s]}
            </div>
            <div className={`text-[8px] tracking-wider uppercase mt-0.5 ${
              filter === s ? 'text-white/70' :
              s === 'pending' ? 'text-amber-300/50' :
              s === 'confirmed' ? 'text-green-300/50' :
              s === 'declined' ? 'text-red-300/40' :
              'text-white/40'
            }`}>
              {s === 'all' ? 'Total' : STATUS_LABELS[s as ReservationStatus]}
            </div>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="divide-y divide-white/5 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#F5F5F3]/20 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-center px-8">
            <span className="text-4xl opacity-20">✦</span>
            <p className="text-[#F5F5F3]/20 text-sm">
              {reservations.length === 0 ? 'Aucune réservation reçue pour le moment.' : 'Aucune réservation dans ce filtre.'}
            </p>
          </div>
        ) : (
          filtered.map(r => {
            const note = clientNotes[r.email?.toLowerCase() ?? '']
            const vipTag = note?.vip_tag
            const vipColor = vipTag ? (VIP_COLORS[vipTag] || 'text-[#F5F5F3]/30') : ''
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left px-4 py-4 hover:bg-[#141414] transition-colors active:bg-[#141414]"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT[r.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-[#F5F5F3] text-sm truncate">
                          {r.first_name} {r.last_name}
                        </span>
                        {vipTag && (
                          <span className={`text-[8px] tracking-[0.2em] uppercase font-medium flex-shrink-0 ${vipColor}`}>
                            · {vipTag}
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] tracking-wider uppercase border px-2 py-0.5 flex-shrink-0 ${STATUS_STYLES[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <p className="text-[#F5F5F3]/40 text-xs truncate mb-1">{r.establishment}</p>
                    <div className="flex items-center gap-2 text-[#F5F5F3]/20 text-[10px]">
                      <span>{r.date}</span>
                      <span>·</span>
                      <span>{r.guests} pers.</span>
                      {r.occasion && <><span>·</span><span>{r.occasion}</span></>}
                    </div>
                  </div>
                  <span className="text-[#F5F5F3]/10 flex-shrink-0 mt-1">›</span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
