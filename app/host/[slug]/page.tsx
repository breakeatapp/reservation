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
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-sm border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Itinera Venues</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchReservations}
            className="text-[9px] tracking-[0.2em] uppercase text-[#F5F7FA]/25 hover:text-[#F5F7FA]/50 transition-colors"
          >
            ↻
          </button>
          <button
            onClick={logout}
            className="text-[10px] tracking-[0.2em] uppercase text-[#F5F7FA]/30 hover:text-[#F5F7FA]/60 transition-colors border border-white/8 hover:border-white/15 px-3 py-1.5"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Venue identity ── */}
        <div className="mb-8">
          <p className="text-[9px] tracking-[0.4em] uppercase text-[#6E5BFF]/50 mb-2">Venue Dashboard</p>
          <h1 className="font-playfair text-4xl text-[#F5F7FA] tracking-wide leading-tight capitalize">
            {venueName || '—'}
          </h1>
          {destDisplay && (
            <p className="text-[#6E5BFF]/70 text-sm tracking-[0.15em] uppercase mt-1.5">
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
                  <p className={`text-[8px] tracking-[0.2em] uppercase transition-colors ${isActive ? 'text-[#6E5BFF]/70' : 'text-[#F5F7FA]/25'}`}>
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
            <button onClick={fetchReservations} className="text-[10px] text-[#6E5BFF]/60 hover:text-[#6E5BFF] uppercase tracking-widest transition-colors">
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
                            <span className="text-[9px] tracking-[0.2em] uppercase text-[#6E5BFF]/60 border border-[#6E5BFF]/20 px-2 py-0.5">
                              {r.destination.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          )}
                        </div>

                        {/* Guest name + VIP badge inline */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#F5F7FA]/80 font-medium text-sm">
                            {r.first_name} {r.last_name}
                          </p>
                          {/* VIP — or/amber */}
                          {(r.vip_tag || r.vip_level) && (
                            <span className="text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 border border-amber-400/40 text-amber-300 bg-amber-400/10 font-medium">
                              ✦ {r.vip_tag || r.vip_level}
                            </span>
                          )}
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
                            <span className="text-[10px] tracking-[0.15em] text-[#6E5BFF]/60 uppercase">{r.rp_name}</span>
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

      </main>
    </div>
  )
}
