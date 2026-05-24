'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

type ReservationStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

type Reservation = {
  id: string
  first_name: string
  last_name: string
  date: string
  time: string
  guests: number
  occasion?: string
  special_requests?: string
  status: ReservationStatus
  establishment: string
  destination?: string
  phone?: string
  email?: string
  nationality?: string
  vip_level?: string
  vip_tag?: string          // depuis rp_client_notes
  internal_note?: string    // JSON: { note, nationality, products }
  rp_name?: string
  rp_slug?: string
  created_at?: string
}

// Couleurs VIP identiques au dashboard RP
const VIP_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  'Ultra VIP': { text: 'text-rose-300',    border: 'border-rose-300/40',    bg: 'bg-rose-300/10' },
  'VVIP':      { text: 'text-fuchsia-400', border: 'border-fuchsia-400/40', bg: 'bg-fuchsia-400/10' },
  'VIP':       { text: 'text-purple-400',  border: 'border-purple-400/40',  bg: 'bg-purple-400/10' },
  'Premium':   { text: 'text-emerald-400', border: 'border-emerald-400/40', bg: 'bg-emerald-400/10' },
  'Gold':      { text: 'text-amber-400',   border: 'border-amber-400/40',   bg: 'bg-amber-400/10' },
  'Régulier':  { text: 'text-blue-400',    border: 'border-blue-400/40',    bg: 'bg-blue-400/10' },
  'Corporate': { text: 'text-cyan-400',    border: 'border-cyan-400/40',    bg: 'bg-cyan-400/10' },
  'Blacklist': { text: 'text-red-400',     border: 'border-red-400/40',     bg: 'bg-red-400/10' },
}

function getVipStyle(tag: string) {
  return VIP_COLORS[tag] ?? { text: 'text-amber-300', border: 'border-amber-300/40', bg: 'bg-amber-300/10' }
}

// Parse la note interne JSON du concierge
function parseClientProfile(raw?: string): { note: string; nationality: string; products: string[] } {
  if (!raw) return { note: '', nationality: '', products: [] }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        note: parsed.note || '',
        nationality: parsed.nationality || '',
        products: Array.isArray(parsed.products) ? parsed.products : [],
      }
    }
  } catch { /* texte brut */ }
  return { note: raw, nationality: '', products: [] }
}

type FilterTab = 'pending' | 'confirmed' | 'declined' | 'all'
type MainTab = 'reservations' | 'partners'

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  declined: 'Déclinée',
  cancelled: 'Annulée',
}

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  confirmed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  declined: 'text-red-400 bg-red-400/10 border-red-400/20',
  cancelled: 'text-[#F5F7FA]/25 bg-white/5 border-white/8',
}

export default function HostDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [venueName, setVenueName] = useState('')
  const [venueDestination, setVenueDestination] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterTab>('pending')
  const [updating, setUpdating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // ── Partners tab ──
  const [mainTab, setMainTab] = useState<MainTab>('reservations')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false)
  const [inviteCodeError, setInviteCodeError] = useState('')
  const [connections, setConnections] = useState<{ rp_slug: string; rp_display_name: string; created_at: string }[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [connectionsError, setConnectionsError] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  // Subscription
  const [subStatus, setSubStatus] = useState<string>('free')
  const [subEndDate, setSubEndDate] = useState<string | null>(null)
  const [coveredByGroup, setCoveredByGroup] = useState(false)
  const [groupName, setGroupName] = useState<string>('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [justSubscribed, setJustSubscribed] = useState(false)

  useEffect(() => {
    fetch(`/api/stripe/subscription-status?plan=venue&slug=${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.status) setSubStatus(d.status)
        if (d.endDate) setSubEndDate(d.endDate)
        if (d.coveredByGroup) { setCoveredByGroup(true); setGroupName(d.groupName ?? '') }
      })
      .catch(() => {})
  }, [slug])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('subscribed=1')) {
      setJustSubscribed(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'venue',
          profileSlug: slug,
          returnUrl: `${window.location.origin}/host/${slug}`,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silencieux
    } finally {
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    const storedSlug = localStorage.getItem('itinera_host_slug')
    const storedName = localStorage.getItem('itinera_host_name')
    const storedDest = localStorage.getItem('itinera_host_destination')
    if (storedSlug !== slug) { router.replace('/host'); return }
    if (storedName) setVenueName(storedName)
    if (storedDest) setVenueDestination(storedDest)
  }, [slug, router])

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/host/${slug}/reservations`)
      if (!res.ok) {
        if (res.status === 401) { router.replace('/host'); return }
        setError('Erreur lors du chargement des réservations.')
        return
      }
      const data = await res.json()
      setReservations(Array.isArray(data) ? data : [])
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  useEffect(() => {
    const storedSlug = localStorage.getItem('itinera_host_slug')
    if (storedSlug === slug) fetchReservations()
  }, [slug, fetchReservations])

  const updateStatus = async (id: string, status: 'confirmed' | 'declined') => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/host/${slug}/reservations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      }
    } catch { /* silently fail */ }
    finally { setUpdating(null) }
  }

  const logout = () => {
    localStorage.removeItem('itinera_host_slug')
    localStorage.removeItem('itinera_host_name')
    localStorage.removeItem('itinera_host_destination')
    router.push('/host')
  }

  const loadInviteCode = useCallback(async () => {
    if (inviteCode) return
    setInviteCodeLoading(true)
    setInviteCodeError('')
    try {
      const res = await fetch(`/api/host/${slug}/invite-code`)
      if (res.ok) {
        const data = await res.json()
        setInviteCode(data.code)
      } else {
        const data = await res.json().catch(() => ({}))
        setInviteCodeError(data.error || 'Impossible de générer le code.')
      }
    } catch {
      setInviteCodeError('Erreur réseau. Réessayez.')
    } finally {
      setInviteCodeLoading(false)
    }
  }, [slug, inviteCode])

  const loadConnections = useCallback(async () => {
    setConnectionsLoading(true)
    setConnectionsError('')
    try {
      const res = await fetch(`/api/host/${slug}/connections`)
      if (res.ok) {
        const data = await res.json()
        setConnections(Array.isArray(data) ? data : [])
      } else {
        const data = await res.json().catch(() => ({}))
        setConnectionsError(data.error || 'Impossible de charger les connexions.')
      }
    } catch {
      setConnectionsError('Erreur réseau. Réessayez.')
    } finally {
      setConnectionsLoading(false)
    }
  }, [slug])

  // Charger les connexions dès le montage (pas seulement au switch d'onglet)
  useEffect(() => {
    const storedSlug = localStorage.getItem('itinera_host_slug')
    if (storedSlug === slug) loadConnections()
  }, [slug, loadConnections])

  // Charger le code d'invitation quand on arrive sur l'onglet
  useEffect(() => {
    if (mainTab === 'partners') {
      loadInviteCode()
    }
  }, [mainTab, loadInviteCode])

  const filtered = filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter)

  const counts = {
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    declined: reservations.filter(r => r.status === 'declined').length,
    all: reservations.length,
  }

  // Format destination for display
  const destDisplay = venueDestination
    ? venueDestination.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    : ''

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-sm border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Itinera Venues</span>
            <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
          </div>
          <div className="flex items-center gap-3">
            {mainTab === 'reservations' && (
              <button
                onClick={fetchReservations}
                className="text-[9px] tracking-[0.2em] uppercase text-[#F5F7FA]/25 hover:text-[#F5F7FA]/50 transition-colors"
              >
                ↻
              </button>
            )}
            {coveredByGroup ? null : subStatus === 'active' ? (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              >
                {portalLoading ? '…' : '✦ Abonnement'}
              </button>
            ) : (
              <button
                onClick={() => router.push(`/subscribe/venue?slug=${slug}`)}
                className="text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                ✦ Pro
              </button>
            )}
            <button
              onClick={logout}
              className="text-[10px] tracking-[0.2em] uppercase text-[#F5F7FA]/30 hover:text-[#F5F7FA]/60 transition-colors border border-white/8 hover:border-white/15 px-3 py-1.5"
            >
              Déconnexion
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {([
            { key: 'reservations' as MainTab, label: 'Réservations' },
            { key: 'partners' as MainTab, label: 'Partenaires' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`text-[9px] tracking-[0.2em] uppercase px-3 py-1.5 border transition-all ${
                mainTab === tab.key
                  ? 'border-[#6E5BFF] text-[#6E5BFF] bg-[#6E5BFF]/8'
                  : 'border-white/8 text-[#F5F7FA]/25 hover:border-white/15 hover:text-[#F5F7FA]/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Bannière confirmation abonnement ── */}
      {justSubscribed && (
        <div className="flex items-center justify-between px-5 py-3 bg-emerald-500/15 border-b border-emerald-500/30">
          <span className="text-[10px] tracking-[0.15em] uppercase text-emerald-300 font-medium">
            ✦ Abonnement activé — Bienvenue sur Itinera Venue Pro !
          </span>
          <button onClick={() => setJustSubscribed(false)} className="text-emerald-400/50 hover:text-emerald-400 text-xs ml-4">✕</button>
        </div>
      )}

      {/* ── Bannière abonnement ── */}
      {coveredByGroup ? (
        <div className="flex items-center px-5 py-2.5 bg-[#6E5BFF]/8 border-b border-[#6E5BFF]/20">
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#6E5BFF]/80">
            ✦ Couvert par {groupName || 'votre groupe'} · Accès complet inclus
          </span>
        </div>
      ) : subStatus === 'active' && !justSubscribed ? (
        <div className="flex items-center justify-between px-5 py-2.5 bg-emerald-500/8 border-b border-emerald-500/20">
          <span className="text-[9px] tracking-[0.2em] uppercase text-emerald-400">✦ Itinera Venue Pro · Abonnement actif</span>
          <button onClick={openPortal} disabled={portalLoading} className="text-[9px] uppercase text-emerald-400/70 hover:text-emerald-400 transition-colors underline underline-offset-2">
            {portalLoading ? '…' : 'Gérer / Résilier'}
          </button>
        </div>
      ) : subStatus === 'past_due' ? (
        <div className="flex items-center justify-between px-5 py-2.5 bg-amber-500/8 border-b border-amber-500/20">
          <span className="text-[9px] tracking-[0.2em] uppercase text-amber-400">⚠ Paiement en attente — mettez à jour votre carte</span>
          <button onClick={openPortal} disabled={portalLoading} className="text-[9px] uppercase text-amber-400/70 hover:text-amber-400 transition-colors underline underline-offset-2">
            {portalLoading ? '…' : 'Mettre à jour'}
          </button>
        </div>
      ) : null}

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Reservations tab ── */}
        {mainTab === 'reservations' && (<>

        {/* ── Venue identity ── */}
        <div className="mb-8">
          <p className="text-[9px] tracking-[0.4em] uppercase text-[#6E5BFF] mb-2">Venue Dashboard</p>
          <h1 className="font-playfair text-4xl text-[#F5F7FA] tracking-wide leading-tight capitalize">
            {venueName || '—'}
          </h1>
          {destDisplay && (
            <p className="text-[#6E5BFF] text-sm tracking-[0.15em] uppercase mt-1.5">
              {destDisplay}
            </p>
          )}
        </div>

        {/* ── Stats / filtres ── */}
        {!loading && !error && (
          <div className="grid grid-cols-4 gap-2 mb-8">
            {([
              { key: 'all'      as FilterTab, label: 'Total',      value: counts.all,       numColor: 'text-[#F5F7FA]' },
              { key: 'pending'  as FilterTab, label: 'En attente', value: counts.pending,   numColor: 'text-amber-400' },
              { key: 'confirmed'as FilterTab, label: 'Confirmé',   value: counts.confirmed, numColor: 'text-emerald-400' },
              { key: 'declined' as FilterTab, label: 'Refusé',     value: counts.declined,  numColor: 'text-red-400' },
            ]).map(stat => {
              const isActive = filter === stat.key
              return (
                <div
                  key={stat.key}
                  onClick={() => setFilter(stat.key)}
                  className={`bg-[#181C23] p-4 text-center cursor-pointer transition-all border ${
                    isActive
                      ? 'border-[#6E5BFF] shadow-[0_0_0_1px_#6E5BFF]'
                      : 'border-white/5 hover:border-white/12'
                  }`}
                >
                  <p className={`text-2xl font-light mb-1 ${stat.numColor}`}>{stat.value}</p>
                  <p className={`text-[8px] tracking-[0.2em] uppercase transition-colors ${isActive ? 'text-[#6E5BFF]' : 'text-[#F5F7FA]/25'}`}>
                    {stat.label}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="py-20 text-center">
            <p className="text-[#F5F7FA]/20 text-xs tracking-[0.3em] uppercase animate-pulse">Chargement...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-red-400/60 text-sm mb-4">{error}</p>
            <button onClick={fetchReservations} className="text-[10px] text-[#6E5BFF] hover:text-[#6E5BFF] uppercase tracking-widest transition-colors">
              Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[#F5F7FA]/15 text-xs tracking-[0.3em] uppercase">
              {filter === 'pending' ? 'Aucune réservation en attente'
                : filter === 'confirmed' ? 'Aucune réservation confirmée'
                : filter === 'declined' ? 'Aucune réservation déclinée'
                : 'Aucune réservation'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => {
              const isExpanded = expanded === r.id
              return (
                <div
                  key={r.id}
                  className="bg-[#181C23] border border-white/8 hover:border-white/12 transition-colors"
                >
                  {/* ── Card header — always visible ── */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-start justify-between gap-3">

                      {/* Left: guest + details */}
                      <div className="min-w-0 flex-1">

                        {/* Venue + destination prominently */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-playfair text-[#F5F7FA] text-base">{r.establishment}</span>
                          {r.destination && (
                            <span className="text-[9px] tracking-[0.2em] uppercase text-[#6E5BFF] border border-[#6E5BFF]/30 px-2 py-0.5">
                              {r.destination.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          )}
                        </div>

                        {/* Guest name + VIP badge inline */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#F5F7FA]/80 font-medium text-sm">
                            {r.first_name} {r.last_name}
                          </p>
                          {/* VIP — couleur selon le statut */}
                          {(r.vip_tag || r.vip_level) && (() => {
                            const tag = r.vip_tag || r.vip_level || ''
                            const s = getVipStyle(tag)
                            return (
                              <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border font-medium ${s.text} ${s.border} ${s.bg}`}>
                                ✦ {tag}
                              </span>
                            )
                          })()}
                          {/* Produits — violet */}
                          {(() => {
                            const prof = parseClientProfile(r.internal_note)
                            return prof.products.length > 0 ? (
                              <span className="text-[9px] tracking-[0.1em] px-2 py-0.5 border border-[#6E5BFF]/30 text-[#9B8FFF] bg-[#6E5BFF]/8">
                                🍾 {prof.products[0]}{prof.products.length > 1 ? ` +${prof.products.length - 1}` : ''}
                              </span>
                            ) : null
                          })()}
                        </div>

                        {/* Date · time · guests */}
                        <p className="text-[#F5F7FA]/40 text-xs mt-1">
                          {r.date} · {r.time} · {r.guests} personne{r.guests > 1 ? 's' : ''}
                        </p>

                        {/* Occasion */}
                        {r.occasion && (
                          <p className="text-[#F5F7FA]/35 text-xs mt-0.5">🎉 {r.occasion}</p>
                        )}

                        {/* Date de réception */}
                        {r.created_at && (
                          <p className="text-[#F5F7FA]/15 text-[9px] mt-1">
                            Reçue le {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {/* Right: status + expand arrow */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 border ${STATUS_COLOR[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        <span className={`text-[#F5F7FA]/20 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          ▾
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded detail ── */}
                  {isExpanded && (() => {
                    const profile = parseClientProfile(r.internal_note)
                    const vip = r.vip_tag || r.vip_level || ''
                    const hasClientProfile = vip || profile.note || profile.nationality || profile.products.length > 0

                    return (
                      <div className="border-t border-white/5 px-5 pb-5 space-y-4 mt-1">

                        {/* ── Fiche client VIP ── */}
                        {hasClientProfile && (
                          <div className="mt-4 bg-[#0F1115] border border-amber-400/15 p-4">
                            <p className="text-[8px] tracking-[0.3em] uppercase text-amber-400/50 mb-3">Profil client</p>
                            <div className="space-y-2">
                              {vip && (
                                <div className="flex items-center gap-2">
                                  <span className="text-amber-400 text-xs">✦</span>
                                  <span className="text-amber-400/80 text-xs tracking-wider uppercase">{vip}</span>
                                </div>
                              )}
                              {profile.nationality && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[#F5F7FA]/25 text-[9px] tracking-wider uppercase w-20 flex-shrink-0 pt-0.5">Nationalité</span>
                                  <span className="text-[#F5F7FA]/70 text-sm">{profile.nationality}</span>
                                </div>
                              )}
                              {profile.products.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[#F5F7FA]/25 text-[9px] tracking-wider uppercase w-20 flex-shrink-0 pt-0.5">Produits</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {profile.products.map((p, i) => (
                                      <span key={i} className="text-[10px] border border-amber-400/20 text-amber-400/70 px-2 py-0.5">
                                        🍾 {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {profile.note && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[#F5F7FA]/25 text-[9px] tracking-wider uppercase w-20 flex-shrink-0 pt-0.5">Note</span>
                                  <span className="text-[#F5F7FA]/60 text-sm italic">{profile.note}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ── Demandes spéciales ── */}
                        {r.special_requests && (
                          <div className="bg-[#0F1115] border-l-2 border-[#6E5BFF]/30 px-4 py-3">
                            <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F7FA]/25 mb-1">Demandes spéciales</p>
                            <p className="text-[#F5F7FA]/60 text-sm italic">"{r.special_requests}"</p>
                          </div>
                        )}

                        {/* ── Contact client ── */}
                        <div className="grid grid-cols-2 gap-3">
                          {r.phone && (
                            <div>
                              <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F7FA]/25 mb-1">Téléphone</p>
                              <a href={`tel:${r.phone}`} className="text-[#F5F7FA]/60 text-sm hover:text-[#F5F7FA] transition-colors">
                                {r.phone}
                              </a>
                            </div>
                          )}
                          {r.email && (
                            <div>
                              <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F7FA]/25 mb-1">Email</p>
                              <p className="text-[#F5F7FA]/60 text-sm truncate">{r.email}</p>
                            </div>
                          )}
                          {r.nationality && !profile.nationality && (
                            <div>
                              <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F7FA]/25 mb-1">Nationalité</p>
                              <p className="text-[#F5F7FA]/60 text-sm">{r.nationality}</p>
                            </div>
                          )}
                        </div>

                        {/* ── Concierge ── */}
                        {r.rp_name && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[8px] tracking-[0.3em] uppercase text-[#F5F7FA]/20">Via concierge</span>
                            <span className="text-[10px] tracking-[0.15em] text-[#6E5BFF] uppercase">{r.rp_name}</span>
                          </div>
                        )}

                        {/* ── WhatsApp client ── */}
                        {r.phone && (
                          <a
                            href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '').replace(/^0/, '33')}?text=${encodeURIComponent(`Bonjour ${r.first_name}, votre réservation chez ${r.establishment} le ${r.date} à ${r.time} pour ${r.guests} personne${r.guests > 1 ? 's' : ''} est`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[#25D366] border border-[#25D366]/20 hover:bg-[#25D366]/10 px-4 py-2 transition-colors"
                          >
                            💬 Contacter le client
                          </a>
                        )}

                        {/* ── Actions confirmer / décliner ── */}
                        {r.status !== 'cancelled' && (
                          <div className="flex gap-2">
                            {r.status !== 'confirmed' && (
                              <button
                                onClick={() => updateStatus(r.id, 'confirmed')}
                                disabled={updating === r.id}
                                className="flex-1 py-3 text-[10px] tracking-[0.25em] uppercase bg-emerald-500/8 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15 transition-colors disabled:opacity-40"
                              >
                                ✓ Confirmer
                              </button>
                            )}
                            {r.status !== 'declined' && (
                              <button
                                onClick={() => updateStatus(r.id, 'declined')}
                                disabled={updating === r.id}
                                className="flex-1 py-3 text-[10px] tracking-[0.25em] uppercase bg-red-500/8 border border-red-500/25 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                              >
                                ✗ Décliner
                              </button>
                            )}
                          </div>
                        )}

                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}

        </>)}

        {/* ── Partners tab ── */}
        {mainTab === 'partners' && (
          <>
          <div className="space-y-6">

            {/* Explainer */}
            <div className="bg-[#181C23] border border-[#6E5BFF]/20 p-5">
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#6E5BFF] mb-2">Comment ça marche ?</p>
              <p className="text-[#F5F7FA]/40 text-xs leading-relaxed">
                Partagez votre code d'invitation aux concierges de confiance. Une fois connectés, leurs réservations apparaîtront automatiquement dans votre dashboard et vous recevrez les notifications par email.
              </p>
            </div>

            {/* Invite code */}
            <div className="bg-[#181C23] border border-white/8 p-5">
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30 mb-1">Code d'invitation</p>
              <p className="text-[#F5F7FA]/25 text-[10px] mb-4 leading-relaxed">
                Transmettez ce code à vos concierges partenaires. Ils le saisissent dans leur dashboard pour créer la connexion.
              </p>

              {inviteCodeLoading ? (
                <div className="bg-[#0F1115] border border-white/5 px-4 py-4 text-center">
                  <p className="text-[#F5F7FA]/20 text-xs tracking-[0.3em] uppercase animate-pulse">Génération...</p>
                </div>
              ) : inviteCodeError ? (
                <div className="bg-[#0F1115] border border-red-500/20 px-4 py-3 text-center">
                  <p className="text-red-400/70 text-xs mb-2">{inviteCodeError}</p>
                  <button
                    onClick={() => { setInviteCode(null); loadInviteCode() }}
                    className="text-[9px] tracking-[0.2em] uppercase text-[#6E5BFF] hover:text-[#6E5BFF] transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              ) : inviteCode ? (
                <div className="bg-[#0F1115] border border-[#6E5BFF]/20 px-4 py-4 flex items-center justify-between gap-3">
                  <span className="text-[#6E5BFF] text-2xl font-mono tracking-[0.4em] font-light">{inviteCode}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode)
                      setCodeCopied(true)
                      setTimeout(() => setCodeCopied(false), 2000)
                    }}
                    className="text-[9px] tracking-[0.2em] uppercase text-[#6E5BFF] hover:text-[#6E5BFF] transition-colors flex-shrink-0 border border-[#6E5BFF]/20 hover:border-[#6E5BFF]/50 px-3 py-1.5"
                  >
                    {codeCopied ? '✓ Copié !' : 'Copier'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={loadInviteCode}
                  className="w-full py-3 text-[10px] tracking-[0.25em] uppercase border border-[#6E5BFF]/40 text-[#6E5BFF] hover:bg-[#6E5BFF]/8 transition-colors"
                >
                  Générer un code
                </button>
              )}
            </div>

            {/* Connected RPs */}
            <div className="bg-[#181C23] border border-white/8 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/30">Concierges connectés</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#F5F7FA]/20">{connections.length} partenaire{connections.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => { setConnections([]); setConnectionsError(''); loadConnections() }}
                    disabled={connectionsLoading}
                    className="text-[9px] tracking-[0.15em] uppercase text-[#6E5BFF]/50 hover:text-[#6E5BFF] transition-colors disabled:opacity-30 border border-[#6E5BFF]/20 hover:border-[#6E5BFF]/40 px-2 py-1"
                    title="Rafraîchir la liste des partenaires"
                  >
                    ↻ Rafraîchir
                  </button>
                </div>
              </div>

              {connectionsLoading ? (
                <p className="text-[#F5F7FA]/20 text-xs text-center py-4 tracking-[0.2em] uppercase animate-pulse">Chargement...</p>
              ) : connectionsError ? (
                <p className="text-red-400/60 text-xs text-center py-4">{connectionsError}</p>
              ) : connections.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[#F5F7FA]/15 text-xs tracking-[0.2em] uppercase">Aucun concierge connecté</p>
                  <p className="text-[#F5F7FA]/10 text-[10px] mt-2">Partagez votre code d'invitation ci-dessus</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map(c => (
                    <div key={c.rp_slug} className="flex items-center justify-between bg-[#0F1115] border border-white/5 px-4 py-3">
                      <div>
                        <p className="text-[#F5F7FA]/70 text-sm">{c.rp_display_name || c.rp_slug}</p>
                        <p className="text-[#F5F7FA]/20 text-[9px] mt-0.5 tracking-wider font-mono">{c.rp_slug}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] tracking-[0.15em] uppercase text-emerald-400/60 border border-emerald-400/20 px-2 py-0.5">
                          ✓ Connecté
                        </span>
                        {c.created_at && (
                          <p className="text-[#F5F7FA]/15 text-[8px] mt-1">
                            depuis le {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Mon abonnement ── */}
          <div className="mt-6 border border-white/8 bg-[#181C23] p-5">
            <p className="text-[9px] tracking-[0.4em] uppercase text-emerald-400/60 mb-4">Mon abonnement</p>

            {coveredByGroup ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-[#6E5BFF]/10 text-[#6E5BFF] border border-[#6E5BFF]/25">
                    ✦ Couvert
                  </span>
                </div>
                <p className="text-[#F5F7FA] text-sm mt-2 mb-1">
                  Accès complet inclus
                </p>
                <p className="text-[#F5F7FA]/30 text-xs leading-relaxed">
                  Votre établissement bénéficie de l'abonnement Group de <strong className="text-[#6E5BFF]/70">{groupName || 'votre groupe'}</strong>.
                  Aucun abonnement individuel requis.
                </p>
              </div>
            ) : subStatus === 'active' ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">✓ Actif</span>
                  {subEndDate && (
                    <span className="text-[9px] text-[#F5F7FA]/30">
                      Renouvellement le {new Date(subEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <p className="text-[#F5F7FA] text-sm mb-1">Itinera Venue Pro <span className="text-[#F5F7FA]/40">— 49,90 € / mois</span></p>
                <p className="text-[#F5F7FA]/30 text-xs leading-relaxed mb-5">
                  Accès complet à toutes les fonctionnalités. Gérez votre abonnement ou résiliez à tout moment.
                </p>
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full py-3 text-[10px] tracking-[0.3em] uppercase border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                >
                  {portalLoading ? 'Chargement…' : '→ Gérer / Résilier l\'abonnement'}
                </button>
              </div>
            ) : subStatus === 'past_due' ? (
              <div>
                <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20">⚠ Paiement en attente</span>
                <p className="text-[#F5F7FA]/30 text-xs leading-relaxed mt-3 mb-5">
                  Un paiement a échoué. Mettez à jour votre carte pour éviter la suspension.
                </p>
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full py-3 text-[10px] tracking-[0.3em] uppercase border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40"
                >
                  {portalLoading ? 'Chargement…' : '→ Mettre à jour le paiement'}
                </button>
              </div>
            ) : (
              <div>
                <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-white/5 text-[#F5F7FA]/30 border border-white/8">Plan gratuit</span>
                <p className="text-[#F5F7FA]/30 text-xs leading-relaxed mt-3 mb-5">
                  Passez à Itinera Venue Pro pour débloquer toutes les fonctionnalités sans limite.
                </p>
                <button
                  onClick={() => router.push(`/subscribe/venue?slug=${slug}`)}
                  className="w-full py-3 text-[10px] tracking-[0.3em] uppercase border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  ✦ Passer à Pro — 49,90 € / mois
                </button>
              </div>
            )}
          </div>
          </>
        )}

      </main>
    </div>
  )
}
