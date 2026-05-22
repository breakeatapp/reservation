'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

const DESTINATIONS = [
  { slug: 'abu-dhabi', name: 'Abu Dhabi' },
  { slug: 'aspen', name: 'Aspen' },
  { slug: 'cannes', name: 'Cannes' },
  { slug: 'cavalaire', name: 'Cavalaire-sur-Mer' },
  { slug: 'courchevel', name: 'Courchevel' },
  { slug: 'dubai', name: 'Dubai' },
  { slug: 'ibiza', name: 'Ibiza' },
  { slug: 'jeddah', name: 'Jeddah' },
  { slug: 'maldives', name: 'Maldives' },
  { slug: 'miami', name: 'Miami' },
  { slug: 'milan', name: 'Milan' },
  { slug: 'monaco', name: 'Monaco' },
  { slug: 'mykonos', name: 'Mykonos' },
  { slug: 'rome', name: 'Rome' },
  { slug: 'saint-barth', name: 'Saint-Barthélemy' },
  { slug: 'saint-tropez', name: 'Saint-Tropez' },
  { slug: 'tulum', name: 'Tulum' },
]

type Venue = {
  slug: string
  venue_name: string
  destination: string
  email: string | null
  category: string | null
  active: boolean
  reservation_count: number
}

export default function GroupDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [groupName, setGroupName] = useState('')
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Formulaire création venue
  const [venueName, setVenueName] = useState('')
  const [destination, setDestination] = useState('')
  const [venueEmail, setVenueEmail] = useState('')
  const [venueCategory, setVenueCategory] = useState('')
  const [venuePassword, setVenuePassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState<{ venue_name: string; destination: string; slug: string } | null>(null)

  const fetchVenues = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/group/${slug}/venues`)
      const data = await res.json()
      if (data.venues) {
        setGroupName(data.group_name)
        setVenues(data.venues)
      } else {
        router.replace('/group')
      }
    } catch {
      router.replace('/group')
    } finally {
      setLoading(false)
    }
  }, [slug, router])

  useEffect(() => {
    const savedSlug = localStorage.getItem('itinera_group_slug')
    const savedName = localStorage.getItem('itinera_group_name')
    if (savedSlug !== slug) {
      router.replace('/group')
      return
    }
    if (savedName) setGroupName(savedName)
    fetchVenues()
  }, [slug, router, fetchVenues])

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!venueName.trim() || !destination || !venuePassword.trim()) {
      setCreateError('Nom, ville et mot de passe sont requis.')
      return
    }
    if (venuePassword.length < 6) {
      setCreateError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/group/${slug}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_name: venueName,
          destination,
          email: venueEmail,
          category: venueCategory,
          password: venuePassword,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCreateSuccess({ venue_name: data.venue_name, destination: data.destination, slug: data.slug })
        setVenueName('')
        setDestination('')
        setVenueEmail('')
        setVenueCategory('')
        setVenuePassword('')
        fetchVenues()
      } else {
        setCreateError(data.error || 'Erreur lors de la création.')
      }
    } catch {
      setCreateError('Erreur réseau.')
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('itinera_group_slug')
    localStorage.removeItem('itinera_group_name')
    router.replace('/group')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <p className="text-[#F5F7FA]/30 text-sm tracking-wider">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA]">

      {/* Header */}
      <nav className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#6E5BFF]/40 uppercase block">Hospitality Group</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">{groupName}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-[#F5F7FA]/25 text-[10px] tracking-[0.2em] uppercase hover:text-[#F5F7FA]/50 transition-colors"
        >
          Déconnexion
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-5 py-10">

        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          <div className="bg-[#181C23] border border-white/5 p-5">
            <p className="text-[8px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-1">Établissements</p>
            <p className="font-playfair text-3xl text-[#F5F7FA]">{venues.length}</p>
          </div>
          <div className="bg-[#181C23] border border-white/5 p-5">
            <p className="text-[8px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-1">Réservations totales</p>
            <p className="font-playfair text-3xl text-[#F5F7FA]">
              {venues.reduce((acc, v) => acc + v.reservation_count, 0)}
            </p>
          </div>
          <div className="bg-[#181C23] border border-white/5 p-5 col-span-2 sm:col-span-1">
            <p className="text-[8px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-1">Villes actives</p>
            <p className="font-playfair text-3xl text-[#F5F7FA]">
              {new Set(venues.map(v => v.destination)).size}
            </p>
          </div>
        </div>

        {/* Liste des venues */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[10px] tracking-[0.4em] uppercase text-[#F5F7FA]/40">Vos établissements</h2>
          <button
            onClick={() => { setShowCreateForm(v => !v); setCreateSuccess(null); setCreateError('') }}
            className="text-[10px] tracking-[0.2em] uppercase text-[#6E5BFF] hover:text-[#8B7FFF] transition-colors border border-[#6E5BFF]/30 hover:border-[#6E5BFF]/60 px-4 py-2"
          >
            + Ajouter un établissement
          </button>
        </div>

        {/* Formulaire création venue */}
        {showCreateForm && (
          <div className="bg-[#181C23] border border-[#6E5BFF]/20 p-6 mb-6">
            <h3 className="text-[9px] tracking-[0.4em] uppercase text-[#6E5BFF]/60 mb-5">Nouvel établissement</h3>

            {createSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 mb-4">
                <p className="text-emerald-400 text-xs mb-1">✓ {createSuccess.venue_name} créé avec succès</p>
                <p className="text-[#F5F7FA]/40 text-[10px]">
                  Identifiant de connexion : <span className="text-[#F5F7FA]/70">{createSuccess.venue_name}</span> · <span className="text-[#F5F7FA]/70">{DESTINATIONS.find(d => d.slug === createSuccess.destination)?.name ?? createSuccess.destination}</span>
                </p>
                <button
                  onClick={() => router.push(`/host/${createSuccess.slug}`)}
                  className="text-[10px] text-[#6E5BFF] hover:text-[#8B7FFF] transition-colors mt-1 block"
                >
                  Accéder au dashboard de ce venue →
                </button>
              </div>
            )}

            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">Nom *</label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={e => setVenueName(e.target.value)}
                    placeholder="ex: Bagatelle St-Tropez"
                    required
                    className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">Ville *</label>
                  <select
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    required
                    className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-[#0F1115]">Sélectionner...</option>
                    {DESTINATIONS.map(d => (
                      <option key={d.slug} value={d.slug} className="bg-[#0F1115]">{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">Email réservations</label>
                  <input
                    type="email"
                    value={venueEmail}
                    onChange={e => setVenueEmail(e.target.value)}
                    placeholder="resa@votre-venue.com"
                    className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">Type d'établissement</label>
                  <input
                    type="text"
                    value={venueCategory}
                    onChange={e => setVenueCategory(e.target.value)}
                    placeholder="ex: Restaurant, Beach Club..."
                    className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">Mot de passe du venue *</label>
                  <input
                    type="text"
                    value={venuePassword}
                    onChange={e => setVenuePassword(e.target.value)}
                    placeholder="Mot de passe que vous transmettrez à l'hôte"
                    required
                    className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                  />
                  <p className="text-[9px] text-[#F5F7FA]/20 mt-1.5">Ce mot de passe sera utilisé par l'hôte pour se connecter sur /host</p>
                </div>
              </div>

              {createError && <p className="text-red-400/70 text-xs">{createError}</p>}

              <button
                type="submit"
                disabled={creating}
                className="py-3 px-6 text-white text-[11px] tracking-[0.25em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors disabled:opacity-40"
              >
                {creating ? 'Création...' : 'Créer l\'établissement →'}
              </button>
            </form>
          </div>
        )}

        {/* Grille des venues */}
        {venues.length === 0 ? (
          <div className="bg-[#181C23] border border-white/5 p-10 text-center">
            <p className="text-[#F5F7FA]/30 text-sm mb-4">Aucun établissement créé pour l'instant.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-[10px] tracking-[0.2em] uppercase text-[#6E5BFF] hover:text-[#8B7FFF] transition-colors"
            >
              + Ajouter votre premier établissement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {venues.map(venue => (
              <div key={venue.slug} className="bg-[#181C23] border border-white/5 p-5 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[#F5F7FA] text-sm font-medium">{venue.venue_name}</p>
                    <p className="text-[#F5F7FA]/35 text-[10px] tracking-wider mt-0.5">
                      {DESTINATIONS.find(d => d.slug === venue.destination)?.name ?? venue.destination}
                      {venue.category && <span className="ml-2 text-[#F5F7FA]/20">· {venue.category}</span>}
                    </p>
                  </div>
                  <span className={`text-[8px] tracking-widest uppercase px-2 py-1 border ${
                    venue.active ? 'border-emerald-500/20 text-emerald-400/60' : 'border-red-500/20 text-red-400/60'
                  }`}>
                    {venue.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F7FA]/20">Réservations</p>
                      <p className="text-[#F5F7FA]/70 text-sm font-medium">{venue.reservation_count}</p>
                    </div>
                    {venue.email && (
                      <div>
                        <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F7FA]/20">Email</p>
                        <p className="text-[#F5F7FA]/40 text-[10px]">{venue.email}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/host/${venue.slug}`)}
                    className="text-[9px] tracking-[0.2em] uppercase text-[#6E5BFF]/60 hover:text-[#6E5BFF] transition-colors border border-[#6E5BFF]/20 hover:border-[#6E5BFF]/40 px-3 py-1.5"
                  >
                    Dashboard →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
