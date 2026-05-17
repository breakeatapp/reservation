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
  rp_name?: string   // nom du concierge ayant créé la réservation
  rp_slug?: string
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
  confirmed: 'text-green-400 bg-green-400/10 border-green-400/20',
  declined: 'text-red-400 bg-red-400/10 border-red-400/20',
  cancelled: 'text-[#F5F7FA]/30 bg-white/5 border-white/10',
}

export default function HostDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [venueName, setVenueName] = useState('')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterTab>('pending')
  const [updating, setUpdating] = useState<string | null>(null)

  // Auth check
  useEffect(() => {
    const storedSlug = localStorage.getItem('itinera_host_slug')
    const storedName = localStorage.getItem('itinera_host_name')
    if (storedSlug !== slug) {
      router.replace('/host')
      return
    }
    if (storedName) setVenueName(storedName)
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
    if (storedSlug === slug) {
      fetchReservations()
    }
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
        setReservations(prev =>
          prev.map(r => (r.id === id ? { ...r, status } : r))
        )
      }
    } catch {
      // silently fail — the card will keep its old state
    } finally {
      setUpdating(null)
    }
  }

  const logout = () => {
    localStorage.removeItem('itinera_host_slug')
    localStorage.removeItem('itinera_host_name')
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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'pending', label: 'À confirmer' },
    { key: 'confirmed', label: 'Confirmées' },
    { key: 'declined', label: 'Déclinées' },
    { key: 'all', label: 'Toutes' },
  ]

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA]">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F1115]/95 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Itinera Host</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
        </div>
        <div className="flex items-center gap-4">
          {venueName && (
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#F5F7FA]/40 hidden sm:block">
              {venueName}
            </span>
          )}
          <button
            onClick={logout}
            className="text-[10px] tracking-[0.2em] uppercase text-[#F5F7FA]/30 hover:text-[#F5F7FA]/60 transition-colors border border-white/8 hover:border-white/15 px-3 py-1.5"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">

        <div className="mb-8">
          <p className="text-[9px] tracking-[0.4em] uppercase text-[#6E5BFF]/60 mb-1">Dashboard</p>
          <h1 className="font-playfair text-3xl text-[#F5F7FA]">Réservations à venir</h1>
          {venueName && (
            <p className="text-[#F5F7FA]/40 text-sm mt-1">{venueName}</p>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/5 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors border-b-2 -mb-px ${
                filter === tab.key
                  ? 'text-[#6E5BFF] border-[#6E5BFF]'
                  : 'text-[#F5F7FA]/30 border-transparent hover:text-[#F5F7FA]/60'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1.5 text-[9px] ${filter === tab.key ? 'text-[#6E5BFF]/70' : 'text-[#F5F7FA]/20'}`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center">
            <p className="text-[#F5F7FA]/20 text-xs tracking-[0.3em] uppercase animate-pulse">Chargement...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-red-400/60 text-sm">{error}</p>
            <button onClick={fetchReservations} className="mt-4 text-[10px] text-[#6E5BFF]/60 hover:text-[#6E5BFF] uppercase tracking-widest transition-colors">
              Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[#F5F7FA]/20 text-xs tracking-[0.3em] uppercase">
              {filter === 'pending'
                ? 'Aucune réservation en attente'
                : filter === 'confirmed'
                ? 'Aucune réservation confirmée'
                : filter === 'declined'
                ? 'Aucune réservation déclinée'
                : 'Aucune réservation'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="bg-[#181C23] border border-white/8 p-5">

                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[#F5F7FA] font-medium text-sm">
                      {r.first_name} {r.last_name}
                    </p>
                    <p className="text-[#F5F7FA]/40 text-xs mt-0.5">
                      {r.date} · {r.time} · {r.guests} personne{r.guests > 1 ? 's' : ''}
                    </p>
                    {r.occasion && (
                      <p className="text-[#F5F7FA]/30 text-xs mt-0.5">🎉 {r.occasion}</p>
                    )}
                    {r.special_requests && (
                      <p className="text-[#F5F7FA]/30 text-xs mt-1 italic">"{r.special_requests}"</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 border ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>

                {/* Concierge */}
                {r.rp_name && (
                  <div className="flex items-center gap-1.5 border-t border-white/5 pt-2.5 mt-1">
                    <span className="text-[#F5F7FA]/15 text-[9px]">via</span>
                    <span className="text-[10px] tracking-[0.15em] text-[#6E5BFF]/60 uppercase">{r.rp_name}</span>
                  </div>
                )}

                {/* Action buttons — only if not cancelled */}
                {r.status !== 'cancelled' && (
                  <div className="flex gap-2 mt-4">
                    {r.status !== 'confirmed' && (
                      <button
                        onClick={() => updateStatus(r.id, 'confirmed')}
                        disabled={updating === r.id}
                        className="flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase bg-green-500/8 border border-green-500/20 text-green-400 hover:bg-green-500/15 transition-colors disabled:opacity-40"
                      >
                        ✓ Confirmer
                      </button>
                    )}
                    {r.status !== 'declined' && (
                      <button
                        onClick={() => updateStatus(r.id, 'declined')}
                        disabled={updating === r.id}
                        className="flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                      >
                        ✗ Décliner
                      </button>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
