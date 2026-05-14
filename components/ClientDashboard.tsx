'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RPProfile } from '@/lib/supabase'
import Link from 'next/link'

type Props = { profile: RPProfile }

type ClientReservation = {
  id: string
  created_at: string
  establishment: string
  destination: string
  date: string
  time: string
  guests: number
  occasion?: string
  seating?: string
  special_requests?: string
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
  rp_slug?: string
}

type RPSummary = {
  slug: string
  displayName: string
  accentColor: string
  logoText: string
  totalCount: number
  pendingCount: number
  confirmedCount: number
}

const SERVICES = [
  { group: 'Restaurant', options: [
    'Premier service — Déjeuner (12h30)',
    'Deuxième service — Déjeuner (14h30)',
    'Premier service — Dîner (19h30)',
    'Deuxième service — Dîner (21h30)',
  ]},
  { group: 'Beach Club', options: [
    'Beach Club — Ouverture (11h00)',
    'Beach Club — Sunset (17h00)',
  ]},
  { group: 'Club / Soirée', options: [
    'Club — Entrée early (22h00)',
    'Club — Entrée late night (00h00)',
  ]},
  { group: 'Autre', options: ['Brunch (11h00)', 'Cocktails (18h00)'] },
]

const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    sublabel: 'Notre équipe revient vers vous sous 24h',
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400 animate-pulse',
    canModify: true,
    canCancel: true,
  },
  confirmed: {
    label: 'Confirmée ✦',
    sublabel: 'Votre table est réservée',
    color: 'text-green-400',
    bg: 'bg-green-500/8',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
    canModify: true,
    canCancel: true,
  },
  declined: {
    label: 'Non disponible',
    sublabel: 'Contactez-nous pour une alternative',
    color: 'text-red-400',
    bg: 'bg-red-500/8',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    canModify: false,
    canCancel: false,
  },
  cancelled: {
    label: 'Annulée',
    sublabel: 'Cette réservation a été annulée',
    color: 'text-[#F5F5F3]/25',
    bg: 'bg-white/3',
    border: 'border-white/8',
    dot: 'bg-[#F5F5F3]/20',
    canModify: false,
    canCancel: false,
  },
}

type Screen = 'home' | 'reservations'

export default function ClientDashboard({ profile }: Props) {
  const accent = profile.accent_color || '#5B3DF5'
  const router = useRouter()

  // Identité client
  const [email, setEmail] = useState('')
  const [clientFirstName, setClientFirstName] = useState('')
  const [rpList, setRpList] = useState<RPSummary[]>([])
  const [identifyLoading, setIdentifyLoading] = useState(false)
  const [notRegistered, setNotRegistered] = useState(false)
  const [autoLoginDone, setAutoLoginDone] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Navigation
  const [screen, setScreen] = useState<Screen>('home')
  const [viewingRp, setViewingRp] = useState<RPSummary | null>(null)

  // Réservations
  const [reservations, setReservations] = useState<ClientReservation[]>([])
  const [resaLoading, setResaLoading] = useState(false)

  // Édition
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editGuests, setEditGuests] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // ── Auto-login depuis localStorage ───────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('elite_client_email')
    const savedName = localStorage.getItem('elite_client_name')
    const savedRp = localStorage.getItem('elite_client_rp')
    if (!saved || savedRp !== profile.slug) {
      // Pas de session → retour à la landing page
      router.replace('/')
      return
    }

    // Vérifier que l'email est toujours inscrit
    setIdentifyLoading(true)
    fetch(`/api/client/check?email=${encodeURIComponent(saved)}&rp=${profile.slug}`)
      .then(r => r.json())
      .then(async check => {
        if (!check.registered) {
          localStorage.removeItem('elite_client_email')
          localStorage.removeItem('elite_client_name')
          localStorage.removeItem('elite_client_rp')
          router.replace('/')
          return
        }
        // Charger les RPs
        const res = await fetch(`/api/client/rps?email=${encodeURIComponent(saved)}`)
        const data = await res.json()
        setEmail(saved)
        const firstName = data.firstName || savedName || check.clientName?.split(' ')[0] || ''
        setClientFirstName(firstName)
        if (firstName) localStorage.setItem('elite_client_name', firstName)
        const rps: RPSummary[] = data.rps ?? []
        if (!rps.some(r => r.slug === profile.slug)) {
          rps.unshift({
            slug: profile.slug,
            displayName: profile.display_name,
            accentColor: accent,
            logoText: profile.logo_text ?? profile.slug.toUpperCase().slice(0, 4),
            totalCount: 0, pendingCount: 0, confirmedCount: 0,
          })
        }
        setRpList(rps)
      })
      .catch(() => {})
      .finally(() => { setIdentifyLoading(false); setAutoLoginDone(true) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetIdentity = () => {
    localStorage.removeItem('elite_client_email')
    localStorage.removeItem('elite_client_name')
    localStorage.removeItem('elite_client_rp')
    setEmail('')
    setClientFirstName('')
    setRpList([])
    setNotRegistered(false)
    setError('')
    setShowAccountMenu(false)
    setDeleteConfirm(false)
    router.replace('/')
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await fetch('/api/client/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, rpSlug: profile.slug }),
      })
    } catch { /* non-bloquant */ }
    finally { setDeleteLoading(false) }
    resetIdentity()
  }

  // ── Sélection d'un RP → charger ses réservations ─────────────
  const selectRP = async (rp: RPSummary) => {
    setViewingRp(rp)
    setResaLoading(true)
    setError('')
    setEditingId(null)
    setCancelConfirmId(null)
    try {
      const res = await fetch(
        `/api/client/reservations?email=${encodeURIComponent(email)}&rpSlug=${rp.slug}`
      )
      const data = await res.json()
      setReservations(Array.isArray(data) ? data : [])
      setScreen('reservations')
    } catch {
      setError('Erreur lors du chargement.')
    } finally {
      setResaLoading(false)
    }
  }

  // ── Édition ───────────────────────────────────────────────────
  const startEdit = (r: ClientReservation) => {
    setCancelConfirmId(null)
    setEditingId(r.id)
    setEditDate('')
    setEditTime(r.time)
    setEditGuests(String(r.guests))
    setEditNotes(r.special_requests ?? '')
    setError('')
  }

  const cancelEdit = () => { setEditingId(null); setError('') }

  const handleSaveEdit = async (r: ClientReservation) => {
    setSaveLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/modify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: r.id, email, action: 'modify',
          date: editDate || undefined,
          time: editTime !== r.time ? editTime : undefined,
          guests: editGuests !== String(r.guests) ? editGuests : undefined,
          specialRequests: editNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur.'); return }
      setReservations(prev => prev.map(item =>
        item.id === r.id ? {
          ...item, time: editTime, guests: parseInt(editGuests),
          special_requests: editNotes,
          ...(editDate ? {
            date: new Date(editDate).toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })
          } : {}),
        } : item
      ))
      setSuccessMsg('Modification enregistrée. Votre RP a été notifié.')
      setSaveSuccess(r.id)
      setEditingId(null)
      setTimeout(() => { setSaveSuccess(null); setSuccessMsg('') }, 4000)
    } catch { setError('Erreur réseau.') }
    finally { setSaveLoading(false) }
  }

  const handleCancel = async (r: ClientReservation) => {
    setSaveLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/modify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, email, action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur.'); return }
      setReservations(prev => prev.map(item =>
        item.id === r.id ? { ...item, status: 'cancelled' as const } : item
      ))
      setRpList(prev => prev.map(rp =>
        rp.slug === viewingRp?.slug
          ? { ...rp, totalCount: Math.max(0, rp.totalCount - 1) }
          : rp
      ))
      setCancelConfirmId(null)
      setSuccessMsg('Réservation annulée. Votre RP a été notifié.')
      setSaveSuccess(r.id)
      setTimeout(() => { setSaveSuccess(null); setSuccessMsg('') }, 4000)
    } catch { setError('Erreur réseau.') }
    finally { setSaveLoading(false) }
  }

  // ════════════════════════════════════════════════════════════════
  // ── ÉCRAN ACCUEIL ────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  if (screen === 'home') {
    const isIdentified = !notRegistered && (!!clientFirstName || (!!email && rpList.length > 0))

    // Chargement auto-login
    if (!autoLoginDone && identifyLoading) {
      return (
        <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin w-6 h-6 text-[#F5F5F3]/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-[#F5F5F3]/20 text-xs tracking-wider">Reconnexion...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">

        {/* Header */}
        <div className="px-5 pt-10 pb-6 max-w-md mx-auto">
          <Link
            href={`/${profile.slug}`}
            className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/15 uppercase hover:text-[#F5F5F3]/35 transition-colors block mb-8"
          >
            ← {profile.display_name}
          </Link>

          {isIdentified ? (
            <div className="mb-8">
              <p className="text-[10px] tracking-[0.5em] uppercase mb-2" style={{ color: accent + '70' }}>
                Mon espace
              </p>
              <h1 className="font-playfair text-4xl text-[#F5F5F3] leading-tight">
                Bienvenue{clientFirstName ? ',' : ''}<br />
                {clientFirstName && (
                  <span style={{ color: accent }}>{clientFirstName}</span>
                )}
                {clientFirstName && <span className="text-[#F5F5F3]/20 text-3xl"> ✦</span>}
              </h1>
              <p className="text-[#F5F5F3]/25 text-sm mt-2">{email}</p>
            </div>
          ) : (
            <div className="mb-8">
              <p className="text-[10px] tracking-[0.5em] uppercase mb-2" style={{ color: accent + '70' }}>
                Mon espace
              </p>
              <h1 className="font-playfair text-4xl text-[#F5F5F3] leading-tight mb-2">
                Bienvenue
              </h1>
              <p className="text-[#F5F5F3]/25 text-sm leading-relaxed">
                Identifiez-vous pour accéder à vos réservations.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 max-w-md mx-auto space-y-6 pb-20">

          {/* ── Accès refusé (email non inscrit) ── */}
          {notRegistered && (
            <div className="bg-[#141414] border border-white/8 p-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center border border-white/10"
                  style={{ background: accent + '10' }}>
                  <svg className="w-6 h-6 text-[#F5F5F3]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F5F3]/20 mb-3">Accès réservé</p>
                <h2 className="font-playfair text-xl text-[#F5F5F3] mb-2">Service sur invitation</h2>
                <p className="text-[#F5F5F3]/30 text-sm leading-relaxed">
                  <span className="text-[#F5F5F3]/50">{email}</span> n'est pas encore inscrit
                  à notre service de conciergerie.
                </p>
              </div>

              <div className="border-t border-white/5 pt-5 space-y-2">
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F5F3]/20 mb-3 text-center">
                  Contactez {profile.display_name}
                </p>
                {profile.whatsapp && (
                  <a
                    href={`https://wa.me/${profile.whatsapp}?text=${encodeURIComponent(`Bonjour, je souhaite accéder au service de conciergerie. Mon email : ${email}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 border border-white/8 hover:border-white/20 p-4 transition-all group"
                  >
                    <span className="text-xl">💬</span>
                    <div className="flex-1">
                      <p className="text-[#F5F5F3]/70 text-sm group-hover:text-[#F5F5F3] transition-colors">WhatsApp</p>
                      <p className="text-[#F5F5F3]/20 text-xs">Demander un accès</p>
                    </div>
                    <span className="text-[#F5F5F3]/15 group-hover:text-[#F5F5F3]/40">›</span>
                  </a>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}?subject=Demande%20d%27acc%C3%A8s%20conciergerie&body=Bonjour%2C%20je%20souhaite%20acc%C3%A9der%20au%20service.%20Mon%20email%20%3A%20${email}`}
                    className="flex items-center gap-3 border border-white/8 hover:border-white/20 p-4 transition-all group"
                  >
                    <span className="text-xl">✉️</span>
                    <div className="flex-1">
                      <p className="text-[#F5F5F3]/70 text-sm group-hover:text-[#F5F5F3] transition-colors">Email</p>
                      <p className="text-[#F5F5F3]/20 text-xs">Demander un accès</p>
                    </div>
                    <span className="text-[#F5F5F3]/15 group-hover:text-[#F5F5F3]/40">›</span>
                  </a>
                )}
              </div>

              <button
                onClick={resetIdentity}
                className="mt-4 w-full text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors py-2 text-center"
              >
                ← Essayer un autre email
              </button>
            </div>
          )}

          {/* ── Sélection du RP ── */}
          {isIdentified && (
            <div>
              <p className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/20 uppercase mb-3">
                Votre{rpList.length > 1 ? 's' : ''} RP
              </p>
              <div className="space-y-2">
                {rpList.map(rp => (
                  <button
                    key={rp.slug}
                    onClick={() => selectRP(rp)}
                    disabled={resaLoading}
                    className="w-full flex items-center gap-4 bg-[#141414] border border-white/5 hover:border-white/12 p-4 text-left transition-all group disabled:opacity-40"
                  >
                    <div
                      className="w-11 h-11 flex items-center justify-center flex-shrink-0 text-white text-[10px] tracking-wider font-medium"
                      style={{ background: `${rp.accentColor}25`, border: `1px solid ${rp.accentColor}40` }}
                    >
                      {rp.logoText?.slice(0, 2) ?? rp.slug.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#F5F5F3] text-sm font-medium mb-1">{rp.displayName}</p>
                      {rp.totalCount > 0 ? (
                        <div className="flex items-center gap-3 text-[10px]">
                          <span className="text-[#F5F5F3]/30">{rp.totalCount} résa{rp.totalCount > 1 ? 's' : ''}</span>
                          {rp.pendingCount > 0 && <span className="text-amber-400/70">· {rp.pendingCount} en attente</span>}
                          {rp.confirmedCount > 0 && <span className="text-green-400/60">· {rp.confirmedCount} confirmée{rp.confirmedCount > 1 ? 's' : ''}</span>}
                        </div>
                      ) : (
                        <p className="text-[#F5F5F3]/20 text-[10px]">Aucune réservation</p>
                      )}
                    </div>
                    <span className="text-[#F5F5F3]/10 group-hover:text-[#F5F5F3]/30 transition-colors flex-shrink-0">›</span>
                  </button>
                ))}
              </div>

              {/* Menu compte */}
              <div className="mt-4">
                <button
                  onClick={() => { setShowAccountMenu(v => !v); setDeleteConfirm(false) }}
                  className="w-full text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/15 hover:text-[#F5F5F3]/35 transition-colors py-2 text-center"
                >
                  ··· Options du compte
                </button>

                {showAccountMenu && (
                  <div className="mt-2 bg-[#141414] border border-white/5 overflow-hidden">
                    <button
                      onClick={resetIdentity}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[#F5F5F3]/40 hover:text-[#F5F5F3]/70 hover:bg-white/3 transition-all text-sm border-b border-white/5"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Se déconnecter</span>
                    </button>

                    {!deleteConfirm ? (
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-red-400/30 hover:text-red-400/60 hover:bg-red-500/5 transition-all text-sm"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Supprimer mon compte</span>
                      </button>
                    ) : (
                      <div className="px-4 py-4 bg-red-500/5 border-t border-red-500/10">
                        <p className="text-red-400/70 text-xs mb-3">Confirmer la suppression ? Votre historique de réservations sera conservé.</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setDeleteConfirm(false)}
                            className="border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.15em] uppercase py-2.5 hover:border-white/20 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                            className="bg-red-500/80 hover:bg-red-500 text-white text-[10px] tracking-[0.15em] uppercase py-2.5 transition-colors disabled:opacity-40"
                          >
                            {deleteLoading ? '...' : 'Confirmer'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Actions rapides ── */}
          {isIdentified && (
            <div>
              <p className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/20 uppercase mb-3">Actions rapides</p>
              <div className="space-y-2">
                <Link
                  href={`/${profile.slug}/book`}
                  className="w-full flex items-center gap-4 bg-[#141414] border border-white/5 hover:border-white/10 p-4 transition-all group"
                >
                  <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
                    🍽️
                  </div>
                  <div className="flex-1">
                    <p className="text-[#F5F5F3] text-sm font-medium">Réserver une table</p>
                    <p className="text-[#F5F5F3]/25 text-xs">Confirmation sous 24h</p>
                  </div>
                  <span className="text-[#F5F5F3]/10 group-hover:text-[#F5F5F3]/30 transition-colors">›</span>
                </Link>

                <Link
                  href={`/${profile.slug}/trip`}
                  className="w-full flex items-center gap-4 bg-[#141414] border border-white/5 hover:border-white/10 p-4 transition-all group"
                >
                  <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
                    🗺️
                  </div>
                  <div className="flex-1">
                    <p className="text-[#F5F5F3] text-sm font-medium">Planifier mon voyage</p>
                    <p className="text-[#F5F5F3]/25 text-xs">Itinéraire multi-jours</p>
                  </div>
                  <span className="text-[#F5F5F3]/10 group-hover:text-[#F5F5F3]/30 transition-colors">›</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // ── ÉCRAN RÉSERVATIONS ───────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">

      <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => { setScreen('home'); setError('') }}
          className="text-[#F5F5F3]/25 hover:text-[#F5F5F3]/60 transition-colors text-lg flex-shrink-0"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] tracking-[0.3em] uppercase truncate" style={{ color: (viewingRp?.accentColor ?? accent) + '60' }}>
            {viewingRp?.displayName ?? profile.display_name}
          </p>
          <p className="text-sm text-[#F5F5F3]/40 truncate">{clientFirstName || email}</p>
        </div>
        {resaLoading && (
          <svg className="animate-spin w-4 h-4 text-[#F5F5F3]/20 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto pb-24">

        {saveSuccess && successMsg && (
          <div className="border border-green-500/20 bg-green-500/8 text-green-400 text-sm px-4 py-3 mb-4 flex items-center gap-2">
            <span>✓</span><span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="border border-red-400/20 bg-red-400/5 text-red-400/70 text-sm px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {resaLoading ? (
          <div className="flex items-center justify-center h-40 text-[#F5F5F3]/20 text-sm">Chargement…</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-6 opacity-20">✦</span>
            <h2 className="font-playfair text-2xl text-[#F5F5F3]/30 mb-3">Aucune réservation</h2>
            <p className="text-[#F5F5F3]/15 text-sm mb-8">
              Aucune réservation avec {viewingRp?.displayName ?? profile.display_name}.
            </p>
            <Link
              href={`/${profile.slug}/book`}
              className="inline-block text-white text-[11px] tracking-[0.2em] uppercase py-4 px-8 hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
            >
              Faire une réservation
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[#F5F5F3]/20 text-sm mb-5">
              {reservations.length} réservation{reservations.length > 1 ? 's' : ''}
            </p>

            <div className="space-y-4">
              {reservations.map(r => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.declined
                const isEditing = editingId === r.id
                const isConfirmingCancel = cancelConfirmId === r.id

                return (
                  <div key={r.id} className={`border ${cfg.border} ${cfg.bg}`}>

                    <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-[#F5F5F3]/20 text-[10px]">{cfg.sublabel}</p>
                      </div>
                    </div>

                    <div className="px-5 py-4">
                      <p className="font-playfair text-lg text-[#F5F5F3] mb-0.5">{r.establishment}</p>
                      <p className="text-[#F5F5F3]/25 text-[10px] uppercase tracking-wider mb-4">{r.destination}</p>

                      {!isEditing && !isConfirmingCancel ? (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            {[
                              { label: 'Date', value: r.date },
                              { label: 'Service', value: r.time },
                              { label: 'Personnes', value: `${r.guests}` },
                            ].map(item => (
                              <div key={item.label}>
                                <p className="text-[8px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1">{item.label}</p>
                                <p className="text-[#F5F5F3]/70 text-xs leading-tight">{item.value}</p>
                              </div>
                            ))}
                          </div>
                          {r.special_requests && (
                            <div className="border-l-2 border-white/10 pl-3 mb-3">
                              <p className="text-[#F5F5F3]/30 text-xs italic">"{r.special_requests}"</p>
                            </div>
                          )}

                          {(cfg.canModify || cfg.canCancel) && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {cfg.canModify && (
                                <button
                                  onClick={() => startEdit(r)}
                                  className="border text-[9px] tracking-[0.2em] uppercase py-2.5 hover:opacity-80 transition-all"
                                  style={{ borderColor: (viewingRp?.accentColor ?? accent) + '30', color: (viewingRp?.accentColor ?? accent) + '90' }}
                                >
                                  ✎ Modifier
                                </button>
                              )}
                              {cfg.canCancel && (
                                <button
                                  onClick={() => { setCancelConfirmId(r.id); setEditingId(null) }}
                                  className="border border-red-500/15 text-red-400/40 text-[9px] tracking-[0.2em] uppercase py-2.5 hover:bg-red-500/5 hover:border-red-500/30 hover:text-red-400/60 transition-all"
                                >
                                  ✕ Annuler
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      ) : isConfirmingCancel ? (
                        <div className="space-y-4">
                          <div className="border border-red-500/20 bg-red-500/5 p-4 text-center">
                            <p className="text-red-400/80 text-sm font-medium mb-1">Confirmer l'annulation ?</p>
                            <p className="text-[#F5F5F3]/30 text-xs">Votre RP sera notifié. Action irréversible.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setCancelConfirmId(null)} disabled={saveLoading}
                              className="border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase py-3 hover:border-white/20 transition-colors disabled:opacity-40">
                              Retour
                            </button>
                            <button onClick={() => handleCancel(r)} disabled={saveLoading}
                              className="bg-red-500/80 hover:bg-red-500 text-white text-[10px] tracking-[0.2em] uppercase py-3 transition-colors disabled:opacity-40">
                              {saveLoading ? 'En cours...' : 'Annuler la résa'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: (viewingRp?.accentColor ?? accent) + '70' }}>
                            Modifier la réservation
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Nouvelle date</label>
                              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none [color-scheme:dark]" />
                              <p className="text-[8px] text-[#F5F5F3]/15 mt-1">Actuelle : {r.date}</p>
                            </div>
                            <div>
                              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Personnes</label>
                              <select value={editGuests} onChange={e => setEditGuests(e.target.value)}
                                className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none cursor-pointer">
                                {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                                  <option key={n} value={n} className="bg-[#0B0B0B]">{n} personne{n > 1 ? 's' : ''}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Service</label>
                            <select value={editTime} onChange={e => setEditTime(e.target.value)}
                              className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none cursor-pointer">
                              {SERVICES.map(g => (
                                <optgroup key={g.group} label={`─ ${g.group}`}>
                                  {g.options.map(o => (
                                    <option key={o} value={o} className="bg-[#0B0B0B]">{o}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Notes</label>
                            <textarea rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                              className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none resize-none placeholder-[#F5F5F3]/15"
                              placeholder="Informations complémentaires..." />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={cancelEdit} disabled={saveLoading}
                              className="border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase py-3 hover:border-white/20 transition-colors disabled:opacity-40">
                              Retour
                            </button>
                            <button onClick={() => handleSaveEdit(r)} disabled={saveLoading}
                              className="text-white text-[10px] tracking-[0.2em] uppercase py-3 hover:opacity-90 transition-opacity disabled:opacity-40"
                              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
                              {saveLoading ? 'Envoi...' : 'Confirmer'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-3">
              <Link href={`/${profile.slug}/book`}
                className="flex flex-col items-center gap-1.5 border border-white/8 py-4 hover:border-white/15 transition-colors text-center">
                <span className="text-xl">🍽️</span>
                <span className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/30">Réserver</span>
              </Link>
              <Link href={`/${profile.slug}/trip`}
                className="flex flex-col items-center gap-1.5 border py-4 transition-colors text-center"
                style={{ borderColor: accent + '30' }}>
                <span className="text-xl">🗺️</span>
                <span className="text-[9px] tracking-[0.2em] uppercase" style={{ color: accent + '70' }}>Planifier</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
