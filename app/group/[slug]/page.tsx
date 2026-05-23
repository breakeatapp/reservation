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

type Partner = {
  rp_slug: string
  rp_display_name: string
  connected_at: string
}

type VenueStat = {
  venue_slug: string
  venue_name: string
  destination: string
  total: number
  confirmed: number
  pending: number
  declined: number
  guests: number
}

type RpStat = {
  rp_slug: string
  rp_name: string
  connected_at: string
  total: number
  confirmed: number
  guests: number
  venues: VenueStat[]
}

export default function GroupDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [groupName, setGroupName] = useState('')
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Partenaires RP
  const [groupCode, setGroupCode] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [loadingCode, setLoadingCode] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [removingPartner, setRemovingPartner] = useState<string | null>(null)

  // Stats
  const [rpStats, setRpStats] = useState<RpStat[]>([])
  const [expandedRp, setExpandedRp] = useState<string | null>(null)

  // Formulaire création venue
  const [venueName, setVenueName] = useState('')
  const [destination, setDestination] = useState('')
  const [venueEmail, setVenueEmail] = useState('')
  const [venueCategory, setVenueCategory] = useState('')
  const [venuePassword, setVenuePassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState<{ venue_name: string; destination: string; slug: string } | null>(null)

  // Subscription
  const [subStatus, setSubStatus] = useState<string>('free')
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/stripe/subscription-status?plan=group&slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (d.status) setSubStatus(d.status) })
      .catch(() => {})
  }, [slug])

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'group',
          profileSlug: slug,
          returnUrl: `${window.location.origin}/group/${slug}`,
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

  const fetchPartners = useCallback(async () => {
    try {
      const res = await fetch(`/api/group/${slug}/partners`)
      const data = await res.json()
      if (data.partners) setPartners(data.partners)
    } catch {
      // silencieux
    }
  }, [slug])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/group/${slug}/stats`)
      const data = await res.json()
      if (data.stats) setRpStats(data.stats)
    } catch {
      // silencieux
    }
  }, [slug])

  const fetchGroupCode = useCallback(async () => {
    setLoadingCode(true)
    try {
      const res = await fetch(`/api/group/${slug}/invite-code`)
      const data = await res.json()
      if (data.code) setGroupCode(data.code)
    } catch {
      // silencieux
    } finally {
      setLoadingCode(false)
    }
  }, [slug])

  useEffect(() => {
    const savedSlug = localStorage.getItem('itinera_group_slug')
    const savedName = localStorage.getItem('itinera_group_name')
    if (savedSlug !== slug) {
      router.replace('/group')
      return
    }
    if (savedName) setGroupName(savedName)
    fetchVenues()
    fetchPartners()
    fetchGroupCode()
    fetchStats()
  }, [slug, router, fetchVenues, fetchPartners, fetchGroupCode, fetchStats])

  const handleRemovePartner = async (rpSlug: string) => {
    if (!confirm('Retirer ce concierge du groupe ? Il perdra l\'accès à tous vos établissements.')) return
    setRemovingPartner(rpSlug)
    try {
      await fetch(`/api/group/${slug}/partners`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rpSlug }),
      })
      setPartners(prev => prev.filter(p => p.rp_slug !== rpSlug))
    } catch {
      // silencieux
    } finally {
      setRemovingPartner(null)
    }
  }

  const handleCopyCode = () => {
    if (!groupCode) return
    navigator.clipboard.writeText(groupCode).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!venueName.trim() || !destination || !venuePassword.trim()) {
      setCreateError('Nom, ville et mot de passe sont requis.')
      return
    }
    if (!venueEmail.trim()) {
      setCreateError('Un email de contact est requis.')
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
        <div className="flex items-center gap-3">
          {subStatus === 'active' ? (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
            >
              {portalLoading ? '…' : '✦ Abonnement'}
            </button>
          ) : (
            <button
              onClick={() => router.push(`/subscribe/group?slug=${slug}`)}
              className="text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              ✦ Pro
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-[#F5F7FA]/25 text-[10px] tracking-[0.2em] uppercase hover:text-[#F5F7FA]/50 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* ── Bannière abonnement ── */}
      {subStatus === 'active' && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-amber-500/8 border-b border-amber-500/20">
          <span className="text-[9px] tracking-[0.2em] uppercase text-amber-400">✦ Itinera Group Pro · Abonnement actif</span>
          <button onClick={openPortal} disabled={portalLoading} className="text-[9px] uppercase text-amber-400/70 hover:text-amber-400 transition-colors underline underline-offset-2">
            {portalLoading ? '…' : 'Gérer / Résilier'}
          </button>
        </div>
      )}
      {subStatus === 'past_due' && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-red-500/8 border-b border-red-500/20">
          <span className="text-[9px] tracking-[0.2em] uppercase text-red-400">⚠ Paiement en attente — mettez à jour votre carte</span>
          <button onClick={openPortal} disabled={portalLoading} className="text-[9px] uppercase text-red-400/70 hover:text-red-400 transition-colors underline underline-offset-2">
            {portalLoading ? '…' : 'Mettre à jour'}
          </button>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-5 py-10">

        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <div className="bg-[#181C23] border border-white/5 p-5">
            <p className="text-[8px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-1">Établissements</p>
            <p className="font-playfair text-3xl text-[#F5F7FA]">{venues.length}</p>
          </div>
          <div className="bg-[#181C23] border border-white/5 p-5">
            <p className="text-[8px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-1">Réservations</p>
            <p className="font-playfair text-3xl text-[#F5F7FA]">
              {venues.reduce((acc, v) => acc + v.reservation_count, 0)}
            </p>
          </div>
          <div className="bg-[#181C23] border border-white/5 p-5">
            <p className="text-[8px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-1">Villes actives</p>
            <p className="font-playfair text-3xl text-[#F5F7FA]">
              {new Set(venues.map(v => v.destination)).size}
            </p>
          </div>
          <div className="bg-[#181C23] border border-white/5 p-5">
            <p className="text-[8px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-1">Concierges</p>
            <p className="font-playfair text-3xl text-[#F5F7FA]">{partners.length}</p>
          </div>
        </div>

        {/* ── Section Concierges partenaires ── */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="text-[10px] tracking-[0.4em] uppercase text-[#F5F7FA]/40">Concierges partenaires</h2>
            <span className="flex-1 h-px bg-white/5" />
          </div>

          <div className="bg-[#181C23] border border-white/5 p-6 mb-4">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#6E5BFF]/50 mb-2">Code d'invitation groupe</p>
            <p className="text-[#F5F7FA]/40 text-xs leading-relaxed mb-5">
              Partagez ce code à vos concierges partenaires. En l'entrant dans leur dashboard,
              ils seront automatiquement connectés à <span className="text-[#F5F7FA]/70">tous vos établissements</span> — actuels et futurs.
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 bg-[#0F1115] border border-white/10 px-4 py-3 flex items-center justify-between">
                {loadingCode ? (
                  <span className="text-[#F5F7FA]/20 text-sm tracking-widest">...</span>
                ) : groupCode ? (
                  <span className="font-mono text-[#F5F7FA] tracking-[0.4em] text-sm">{groupCode}</span>
                ) : (
                  <span className="text-[#F5F7FA]/20 text-xs">Code non généré</span>
                )}
              </div>
              <button
                onClick={handleCopyCode}
                disabled={!groupCode || loadingCode}
                className="px-4 py-3 text-[10px] tracking-[0.2em] uppercase border transition-colors disabled:opacity-30 flex-shrink-0
                  border-[#6E5BFF]/30 text-[#6E5BFF]/70 hover:border-[#6E5BFF]/60 hover:text-[#6E5BFF]"
              >
                {copiedCode ? '✓ Copié' : 'Copier'}
              </button>
            </div>
          </div>

          {/* Liste des RPs connectés */}
          {partners.length === 0 ? (
            <div className="border border-white/5 px-5 py-8 text-center">
              <p className="text-[#F5F7FA]/25 text-xs">Aucun concierge partenaire pour l'instant.</p>
              <p className="text-[#F5F7FA]/15 text-[10px] mt-1">Partagez le code ci-dessus à vos concierges.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {partners.map(p => (
                <div key={p.rp_slug} className="bg-[#181C23] border border-white/5 px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[#F5F7FA]/80 text-sm">{p.rp_display_name || p.rp_slug}</p>
                    <p className="text-[#F5F7FA]/25 text-[10px] mt-0.5">
                      Partenaire depuis le {new Date(p.connected_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] tracking-widest uppercase px-2 py-1 border border-emerald-500/20 text-emerald-400/60">
                      {venues.length} venue{venues.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => handleRemovePartner(p.rp_slug)}
                      disabled={removingPartner === p.rp_slug}
                      className="text-[9px] tracking-[0.15em] uppercase text-red-400/40 hover:text-red-400/70 transition-colors disabled:opacity-30"
                    >
                      {removingPartner === p.rp_slug ? '...' : 'Retirer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section Performances par RP ── */}
        {rpStats.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-5">
              <h2 className="text-[10px] tracking-[0.4em] uppercase text-[#F5F7FA]/40">Performances concierges</h2>
              <span className="flex-1 h-px bg-white/5" />
            </div>

            <div className="space-y-3">
              {rpStats.map(rp => {
                const isExpanded = expandedRp === rp.rp_slug
                const maxTotal = Math.max(...rp.venues.map(v => v.total), 1)

                return (
                  <div key={rp.rp_slug} className="bg-[#181C23] border border-white/5">

                    {/* Header RP — cliquable */}
                    <button
                      onClick={() => setExpandedRp(isExpanded ? null : rp.rp_slug)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/2 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="text-[#F5F7FA]/80 text-sm">{rp.rp_name}</p>
                          <p className="text-[#F5F7FA]/25 text-[10px] mt-0.5">
                            {rp.total} réservation{rp.total !== 1 ? 's' : ''} · {rp.guests} guest{rp.guests !== 1 ? 's' : ''}
                            {rp.total > 0 && (
                              <span className="ml-2 text-emerald-400/50">
                                · {Math.round((rp.confirmed / rp.total) * 100)}% confirmées
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] tracking-widest uppercase px-2 py-1 border border-[#6E5BFF]/20 text-[#6E5BFF]/50">
                          {rp.venues.filter(v => v.total > 0).length}/{venues.length} venue{venues.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[#F5F7FA]/20 text-xs">{isExpanded ? '↑' : '↓'}</span>
                      </div>
                    </button>

                    {/* Détail par venue */}
                    {isExpanded && (
                      <div className="border-t border-white/5 px-5 py-4 space-y-4">
                        {rp.venues.map(v => (
                          <div key={v.venue_slug}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div>
                                <span className="text-[#F5F7FA]/60 text-xs">{v.venue_name}</span>
                                <span className="text-[#F5F7FA]/20 text-[9px] ml-2 uppercase tracking-wider">
                                  {DESTINATIONS.find(d => d.slug === v.destination)?.name ?? v.destination}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[9px]">
                                {v.confirmed > 0 && <span className="text-emerald-400/60">{v.confirmed} conf.</span>}
                                {v.pending > 0 && <span className="text-amber-400/50">{v.pending} att.</span>}
                                {v.declined > 0 && <span className="text-red-400/40">{v.declined} déc.</span>}
                                <span className="text-[#F5F7FA]/40 font-medium w-6 text-right">{v.total}</span>
                              </div>
                            </div>
                            {/* Barre de progression */}
                            <div className="h-px bg-white/5 w-full overflow-hidden">
                              {v.total > 0 && (
                                <div
                                  className="h-full bg-[#6E5BFF]/40"
                                  style={{ width: `${(v.total / maxTotal) * 100}%` }}
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Section Établissements ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] tracking-[0.4em] uppercase text-[#F5F7FA]/40">Vos établissements</h2>
            <span className="flex-1 h-px bg-white/5" />
          </div>
          <button
            onClick={() => { setShowCreateForm(v => !v); setCreateSuccess(null); setCreateError('') }}
            className="text-[10px] tracking-[0.2em] uppercase text-[#6E5BFF] hover:text-[#8B7FFF] transition-colors border border-[#6E5BFF]/30 hover:border-[#6E5BFF]/60 px-4 py-2 ml-4 flex-shrink-0"
          >
            + Ajouter
          </button>
        </div>

        {/* Formulaire création venue */}
        {showCreateForm && (
          <div className="bg-[#181C23] border border-[#6E5BFF]/20 p-6 mb-6">
            <h3 className="text-[9px] tracking-[0.4em] uppercase text-[#6E5BFF]/60 mb-5">Nouvel établissement</h3>

            {createSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 mb-4">
                <p className="text-emerald-400 text-xs mb-1">✓ {createSuccess.venue_name} créé avec succès</p>
                {partners.length > 0 && (
                  <p className="text-[#F5F7FA]/40 text-[10px] mb-1">
                    {partners.length} concierge{partners.length > 1 ? 's' : ''} partenaire{partners.length > 1 ? 's' : ''} connecté{partners.length > 1 ? 's' : ''} automatiquement.
                  </p>
                )}
                <p className="text-[#F5F7FA]/40 text-[10px]">
                  Connexion : <span className="text-[#F5F7FA]/70">{createSuccess.venue_name}</span> · <span className="text-[#F5F7FA]/70">{DESTINATIONS.find(d => d.slug === createSuccess.destination)?.name ?? createSuccess.destination}</span>
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
                  <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">Email réservations *</label>
                  <input
                    type="email"
                    value={venueEmail}
                    onChange={e => setVenueEmail(e.target.value)}
                    placeholder="resa@votre-venue.com"
                    required
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
                    placeholder="Mot de passe transmis à l'hôte pour se connecter"
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

        {/* ── Mon abonnement ── */}
        <div className="mt-10 border border-white/8 bg-[#181C23] p-6">
          <p className="text-[9px] tracking-[0.4em] uppercase text-amber-400/60 mb-4">Mon abonnement</p>

          {subStatus === 'active' ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                  ✓ Actif
                </span>
              </div>
              <p className="text-[#F5F7FA] text-sm mt-2 mb-1">Itinera Group — <span className="text-[#F5F7FA]/50">149,90 € / mois</span></p>
              <p className="text-[#F5F7FA]/30 text-xs leading-relaxed mb-5">
                Gérez votre abonnement, consultez vos factures ou résiliez depuis le portail Stripe sécurisé.
              </p>
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="w-full py-3 text-[10px] tracking-[0.3em] uppercase border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
              >
                {portalLoading ? 'Chargement…' : '→ Gérer / Résilier l\'abonnement'}
              </button>
            </div>
          ) : subStatus === 'past_due' ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  ⚠ Paiement en attente
                </span>
              </div>
              <p className="text-[#F5F7FA]/30 text-xs leading-relaxed mb-5">
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
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 bg-white/5 text-[#F5F7FA]/30 border border-white/8">
                  Gratuit
                </span>
              </div>
              <p className="text-[#F5F7FA]/30 text-xs leading-relaxed mb-5">
                Passez à Itinera Group Pro pour gérer plusieurs établissements sans limite.
              </p>
              <button
                onClick={() => router.push(`/subscribe/group?slug=${slug}`)}
                className="w-full py-3 text-[10px] tracking-[0.3em] uppercase border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                ✦ Passer à Pro — 149,90 € / mois
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
