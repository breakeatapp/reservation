'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Reservation, ReservationStatus } from '@/lib/supabase'

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  declined: 'Refusé',
  cancelled: 'Annulé',
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  declined: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelled: 'bg-white/5 text-[#F5F5F3]/20 border-white/8',
}

function buildWhatsAppMessage(r: Reservation): string {
  const extras = [
    r.occasion ? `🎉 Occasion : ${r.occasion}` : '',
    r.seating ? `🪑 Placement souhaité : ${r.seating}` : '',
    r.vip_level && r.vip_level !== 'Standard' ? `⭐ Profil client : ${r.vip_level}` : '',
    r.budget_level && r.budget_level !== 'Non précisé' ? `💰 Budget : ${r.budget_level}` : '',
  ].filter(Boolean)

  const lines = [
    `✦ DEMANDE DE RÉSERVATION — ÉLITE RESERVATIONS`,
    ``,
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
    r.special_requests ? `📝 *Demandes spéciales :*` : '',
    r.special_requests ? `"${r.special_requests}"` : '',
    ``,
    `─────────────────`,
    `Merci de confirmer la disponibilité — ITINERA`,
  ].filter(l => l !== undefined && l !== null)

  return lines.join('\n')
}

export default function AdminDashboard() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reservations', {
        headers: { 'x-admin-token': password },
      })
      if (res.ok) {
        const data = await res.json()
        setReservations(data)
      }
    } finally {
      setLoading(false)
    }
  }, [password])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length > 0) {
      setAuthenticated(true)
      setAuthError(false)
    }
  }

  useEffect(() => {
    if (authenticated) fetchReservations()
  }, [authenticated, fetchReservations])

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setUpdating(id)
    await fetch('/api/admin/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
      body: JSON.stringify({ id, status }),
    })
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setUpdating(null)
  }

  const copyMessage = (r: Reservation) => {
    const msg = buildWhatsAppMessage(r)
    navigator.clipboard.writeText(msg)
    setCopied(r.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)
  const counts = {
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    declined: reservations.filter(r => r.status === 'declined').length,
  }

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <p className="text-[10px] tracking-[0.4em] text-violet-light/60 uppercase mb-3">Accès restreint</p>
            <h1 className="font-playfair text-3xl text-[#F5F5F3]">Dashboard Manager</h1>
          </div>
          <form onSubmit={handleLogin} className="bg-[#1A1A1A] border border-white/5 p-8">
            <label className="block text-[10px] tracking-[0.25em] text-[#F5F5F3]/40 uppercase mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-4 py-3 text-sm focus:border-violet-light outline-none transition-colors mb-4"
              placeholder="••••••••"
              autoFocus
            />
            {authError && (
              <p className="text-red-400/70 text-xs mb-4">Mot de passe incorrect.</p>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.25em] uppercase py-3 hover:opacity-90 transition-opacity"
            >
              Accéder
            </button>
          </form>
          <p className="text-center text-[#F5F5F3]/20 text-xs mt-4">
            Défini dans .env.local → ADMIN_PASSWORD
          </p>
        </div>
      </div>
    )
  }

  const selectedReservation = reservations.find(r => r.id === selectedId)

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[9px] tracking-[0.3em] text-violet-light/50 uppercase">Dashboard</p>
            <h1 className="font-playfair text-xl text-[#F5F5F3]">ITINERA</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReservations}
            className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/40 hover:text-violet-light transition-colors border border-white/10 px-3 py-1.5"
          >
            ↻ Actualiser
          </button>
          <a
            href="/"
            className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/40 hover:text-[#F5F5F3] transition-colors"
          >
            ← Site
          </a>
        </div>
      </div>

      <div className="flex h-[calc(100vh-61px)]">
        {/* Left column — list */}
        <div className="w-full md:w-[420px] border-r border-white/5 flex flex-col">
          {/* Stats */}
          <div className="grid grid-cols-4 border-b border-white/5">
            {(['all', 'pending', 'confirmed', 'declined'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`py-4 text-center transition-colors border-b-2 ${
                  filter === s ? 'border-violet-light' : 'border-transparent'
                }`}
              >
                <div className={`text-lg font-light ${filter === s ? 'text-violet-light' : 'text-[#F5F5F3]/40'}`}>
                  {counts[s]}
                </div>
                <div className="text-[8px] tracking-wider uppercase text-[#F5F5F3]/30 mt-0.5">
                  {s === 'all' ? 'Total' : STATUS_LABELS[s as ReservationStatus]}
                </div>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-[#F5F5F3]/30 text-sm">
                Chargement...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#F5F5F3]/20 text-sm gap-2">
                <span className="text-2xl">✦</span>
                Aucune réservation
              </div>
            ) : (
              filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                  className={`w-full text-left px-5 py-4 border-b border-white/5 hover:bg-[#1A1A1A] transition-colors ${
                    selectedId === r.id ? 'bg-[#1A1A1A] border-l-2 border-l-violet-light' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-[#F5F5F3]">
                      {r.first_name} {r.last_name}
                    </span>
                    <span className={`text-[9px] tracking-wider uppercase border px-2 py-0.5 flex-shrink-0 ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  <p className="text-[#F5F5F3]/50 text-xs mb-1">{r.establishment}</p>
                  <div className="flex items-center gap-3 text-[#F5F5F3]/30 text-[10px]">
                    <span>{r.date}</span>
                    <span>·</span>
                    <span>{r.time}</span>
                    <span>·</span>
                    <span>{r.guests} pers.</span>
                  </div>
                  {r.vip_level && (
                    <span className="inline-block mt-1.5 text-[9px] tracking-wider text-gold border border-gold/20 px-1.5 py-0.5">
                      {r.vip_level}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right column — detail */}
        <div className="hidden md:flex flex-1 flex-col overflow-y-auto">
          {!selectedReservation ? (
            <div className="flex flex-col items-center justify-center h-full text-[#F5F5F3]/20 gap-3">
              <span className="text-4xl">✦</span>
              <p className="text-sm tracking-wider">Sélectionne une réservation</p>
            </div>
          ) : (
            <div className="p-8 max-w-2xl">
              {/* Ticket header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-[10px] tracking-[0.3em] text-violet-light/60 uppercase mb-1">
                    Ticket #{selectedReservation.id.slice(0, 8).toUpperCase()}
                  </p>
                  <h2 className="font-playfair text-3xl text-[#F5F5F3]">
                    {selectedReservation.first_name} {selectedReservation.last_name}
                  </h2>
                  <p className="text-[#F5F5F3]/40 text-sm mt-1">
                    Reçu le {new Date(selectedReservation.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className={`text-[10px] tracking-wider uppercase border px-3 py-1.5 ${STATUS_STYLES[selectedReservation.status]}`}>
                  {STATUS_LABELS[selectedReservation.status]}
                </span>
              </div>

              <div className="h-px bg-gradient-to-r from-violet-DEFAULT/30 to-transparent mb-6" />

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-px bg-white/5 mb-6">
                {[
                  { label: 'Établissement', value: selectedReservation.establishment },
                  { label: 'Destination', value: selectedReservation.destination },
                  { label: 'Date', value: selectedReservation.date },
                  { label: 'Heure', value: selectedReservation.time },
                  { label: 'Personnes', value: `${selectedReservation.guests} personne${selectedReservation.guests > 1 ? 's' : ''}` },
                  { label: 'Email', value: selectedReservation.email },
                  { label: 'Téléphone', value: selectedReservation.phone },
                  selectedReservation.occasion ? { label: 'Occasion', value: selectedReservation.occasion } : null,
                  selectedReservation.seating ? { label: 'Placement', value: selectedReservation.seating } : null,
                  selectedReservation.vip_level ? { label: 'Profil VIP', value: selectedReservation.vip_level } : null,
                  selectedReservation.budget_level ? { label: 'Budget', value: selectedReservation.budget_level } : null,
                ].filter(Boolean).map((item) => (
                  <div key={item!.label} className="bg-[#1A1A1A] p-4">
                    <p className="text-[9px] tracking-[0.2em] text-[#F5F5F3]/30 uppercase mb-1">{item!.label}</p>
                    <p className="text-[#F5F5F3] text-sm">{item!.value}</p>
                  </div>
                ))}
              </div>

              {selectedReservation.special_requests && (
                <div className="bg-[#1A1A1A] border-l-2 border-violet-light px-4 py-3 mb-6">
                  <p className="text-[9px] tracking-[0.2em] text-[#F5F5F3]/30 uppercase mb-1">Notes</p>
                  <p className="text-[#F5F5F3]/70 text-sm italic">"{selectedReservation.special_requests}"</p>
                </div>
              )}

              {/* Message WhatsApp généré */}
              <div className="bg-[#1A1A1A] border border-white/5 p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] tracking-[0.2em] text-[#F5F5F3]/40 uppercase">Message WhatsApp généré</p>
                  <button
                    onClick={() => copyMessage(selectedReservation)}
                    className="text-[10px] tracking-wider text-violet-light hover:text-violet-DEFAULT transition-colors border border-violet-DEFAULT/30 px-2 py-1"
                  >
                    {copied === selectedReservation.id ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
                <pre className="text-[#F5F5F3]/60 text-xs leading-relaxed whitespace-pre-wrap font-inter">
                  {buildWhatsAppMessage(selectedReservation)}
                </pre>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/${selectedReservation.establishment_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(buildWhatsAppMessage(selectedReservation))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-[11px] tracking-[0.2em] uppercase py-3 hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Envoyer sur WhatsApp — {selectedReservation.establishment}
                </a>

                {/* Status buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateStatus(selectedReservation.id, 'confirmed')}
                    disabled={selectedReservation.status === 'confirmed' || updating === selectedReservation.id}
                    className="py-3 text-[11px] tracking-[0.2em] uppercase bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✓ Confirmer
                  </button>
                  <button
                    onClick={() => updateStatus(selectedReservation.id, 'declined')}
                    disabled={selectedReservation.status === 'declined' || updating === selectedReservation.id}
                    className="py-3 text-[11px] tracking-[0.2em] uppercase bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✕ Refuser
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
