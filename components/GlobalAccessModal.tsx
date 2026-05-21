'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Images Unsplash par destination (stables, CDN Unsplash) ───────────────────
const DEST_IMAGE: Record<string, string> = {
  'abu-dhabi':             'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=600&q=80',
  'aspen':                 'https://images.unsplash.com/photo-1632169500697-44e42bfee090?w=600&q=80',
  'bali':                  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80',
  'barcelona':             'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80',
  'cannes':                'https://images.unsplash.com/photo-1659642081604-8c2eef905d9b?w=600&q=80',
  'cavalaire':             'https://images.unsplash.com/photo-1520516280893-4a40e5b9ae61?w=600&q=80',
  'courchevel':            'https://images.unsplash.com/photo-1630404379166-4bce8dffda32?w=600&q=80',
  'dubai':                 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80',
  'ibiza':                 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
  'jeddah':                'https://images.unsplash.com/photo-1564839558940-eefc9a8d8d70?w=600&q=80',
  'london':                'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80',
  'los-angeles':           'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=600&q=80',
  'maldives':              'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600&q=80',
  'marrakech':             'https://images.unsplash.com/photo-1597212618440-806262de4f3a?w=600&q=80',
  'miami':                 'https://images.unsplash.com/photo-1503891450247-ee5f8ec46dc3?w=600&q=80',
  'milan':                 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80',
  'monaco':                'https://images.unsplash.com/photo-1658988856200-056dfdb42025?w=600&q=80',
  'mykonos':               'https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?w=600&q=80',
  'new-york':              'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80',
  'paris':                 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=600&q=80',
  'phuket':                'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=600&q=80',
  'rome':                  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80',
  'saint-barth':           'https://images.unsplash.com/photo-1441034281545-98b3b0d4f9bb?w=600&q=80',
  'saint-jean-cap-ferrat': 'https://images.unsplash.com/photo-1701362611184-41ca0368311c?w=600&q=80',
  'saint-tropez':          'https://images.unsplash.com/photo-1663219943556-c58791315de8?w=600&q=80',
  'tulum':                 'https://images.unsplash.com/photo-1601918774516-8e4acb1e2d55?w=600&q=80',
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80'

// ── Labels affichés ───────────────────────────────────────────────────────────
const DEST_LABEL: Record<string, string> = {
  'abu-dhabi':             'Abu Dhabi',
  'aspen':                 'Aspen',
  'bali':                  'Bali',
  'barcelona':             'Barcelona',
  'cannes':                'Cannes',
  'cavalaire':             'Cavalaire',
  'courchevel':            'Courchevel',
  'dubai':                 'Dubai',
  'ibiza':                 'Ibiza',
  'jeddah':                'Jeddah',
  'london':                'London',
  'los-angeles':           'Los Angeles',
  'maldives':              'Maldives',
  'marrakech':             'Marrakech',
  'miami':                 'Miami',
  'milan':                 'Milan',
  'monaco':                'Monaco',
  'mykonos':               'Mykonos',
  'new-york':              'New York',
  'paris':                 'Paris',
  'phuket':                'Phuket',
  'rome':                  'Rome',
  'saint-barth':           'Saint-Barth',
  'saint-jean-cap-ferrat': 'Cap Ferrat',
  'saint-tropez':          'Saint-Tropez',
  'tulum':                 'Tulum',
}

function destLabel(slug: string): string {
  return DEST_LABEL[slug] ?? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
// Pour les villes non répertoriées, utilise picsum.photos/seed/{slug} :
// image cohérente (même seed = même photo), gratuite, sans clé API.
function destImage(slug: string): string {
  return DEST_IMAGE[slug] ?? `https://picsum.photos/seed/${encodeURIComponent(slug)}/600/400`
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const PALETTE = ['#5B3DF5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#B45309', '#DC2626']
function avatarColor(name: string): string {
  let h = 0; for (const c of name) h = ((h << 5) - h) + c.charCodeAt(0)
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}

// ── Types ──────────────────────────────────────────────────────────────────────
type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'self'
type RPCard = {
  slug: string
  display_name: string
  tagline: string
  destinations: string[]
  connection_status: ConnectionStatus
  is_ambassador: boolean
  is_trusted: boolean
  reservation_count: number
}
type CityData = {
  slug: string
  name?: string      // nom personnalisé pour les destinations custom (fourni par l'API)
  image?: string     // image personnalisée stockée dans le JSON de la destination
  count: number
  hasConnection: boolean
  hasAmbassador: boolean
  hasTrusted: boolean
  isSelf: boolean
}
type PendingInvite = {
  from_slug: string
  display_name: string
  tagline: string
  created_at: string
}
type PartnerRP = {
  slug: string
  display_name: string
  tagline: string
  email: string
  whatsapp: string
  is_ambassador: boolean
  is_trusted: boolean
  destinations: string[]
}
type Props = { rpSlug: string; rpPassword: string; onClose: () => void }

// ── Formatage numéro WhatsApp → lien wa.me ───────────────────────────────────
function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GlobalAccessModal({ rpSlug, rpPassword, onClose }: Props) {
  const [activeTab, setActiveTab]         = useState<'destinations' | 'partners'>('destinations')
  const [cities, setCities]               = useState<CityData[]>([])
  const [selectedCity, setSelectedCity]   = useState<string | null>(null)
  const [cityRPs, setCityRPs]             = useState<RPCard[]>([])
  const [cityLoading, setCityLoading]     = useState(false)
  const [connecting, setConnecting]       = useState<string | null>(null)
  const [search, setSearch]               = useState('')
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [respondingTo, setRespondingTo]   = useState<string | null>(null)
  const [partners, setPartners]           = useState<PartnerRP[]>([])
  const [partnersLoading, setPartnersLoading] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null)
  const [partnerSearch, setPartnerSearch] = useState('')

  // Charger les destinations au montage
  useEffect(() => {
    fetch(`/api/network/cities?rp_slug=${encodeURIComponent(rpSlug)}`, {
      headers: { 'x-rp-password': rpPassword },
    })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCities(d) })
      .catch(() => {})
  }, [rpSlug, rpPassword])

  // Charger les invitations en attente
  const fetchPending = useCallback(async () => {
    try {
      const r = await fetch(`/api/network/pending?rp_slug=${encodeURIComponent(rpSlug)}`, {
        headers: { 'x-rp-password': rpPassword },
      })
      const d = await r.json()
      if (Array.isArray(d)) setPendingInvites(d)
    } catch { /* ignore */ }
  }, [rpSlug, rpPassword])

  useEffect(() => { fetchPending() }, [fetchPending])

  // Charger les partenaires une seule fois à l'ouverture de l'onglet
  // On utilise un ref pour éviter les double-fetch causés par les re-renders
  const partnersFetchedRef = useRef(false)

  useEffect(() => {
    if (activeTab !== 'partners') return
    if (partnersFetchedRef.current) return
    partnersFetchedRef.current = true
    setPartnersLoading(true)
    fetch(`/api/network/partners?rp_slug=${encodeURIComponent(rpSlug)}`, {
      headers: { 'x-rp-password': rpPassword },
    })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPartners(d) })
      .catch(() => {})
      .finally(() => setPartnersLoading(false))
  }, [activeTab, rpSlug, rpPassword])

  // Charger les RP d'une destination
  const selectCity = useCallback(async (dest: string) => {
    setSelectedCity(dest)
    setCityLoading(true)
    setCityRPs([])
    try {
      const r = await fetch(
        `/api/network/city/${encodeURIComponent(dest)}?rp_slug=${encodeURIComponent(rpSlug)}`,
        { headers: { 'x-rp-password': rpPassword } }
      )
      const d = await r.json()
      if (Array.isArray(d)) setCityRPs(d)
    } catch { /* ignore */ } finally { setCityLoading(false) }
  }, [rpSlug, rpPassword])

  // Envoyer une demande de connexion
  const sendRequest = async (toSlug: string) => {
    setConnecting(toSlug)
    try {
      await fetch('/api/network/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': rpPassword },
        body: JSON.stringify({ from_slug: rpSlug, to_slug: toSlug }),
      })
      if (selectedCity) await selectCity(selectedCity)
    } catch { /* ignore */ } finally { setConnecting(null) }
  }

  // Accepter / refuser une invitation reçue
  const respondToInvite = async (fromSlug: string, action: 'accept' | 'decline') => {
    setRespondingTo(fromSlug)
    try {
      await fetch('/api/network/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': rpPassword },
        body: JSON.stringify({ from_slug: fromSlug, to_slug: rpSlug, action }),
      })
      // Retirer l'invite de la liste localement (optimistic)
      setPendingInvites(prev => prev.filter(p => p.from_slug !== fromSlug))
      // Rafraîchir les destinations si une ville est sélectionnée (le nouveau partenaire y apparaît)
      if (action === 'accept' && selectedCity) await selectCity(selectedCity)
    } catch { /* ignore */ } finally { setRespondingTo(null) }
  }

  // Destinations filtrées + triées alphabétiquement
  const filteredCities = cities
    .filter(c =>
      !search.trim() ||
      destLabel(c.slug).toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => destLabel(a.slug).localeCompare(destLabel(b.slug)))

  // Grouper les RP par tier
  const selfRP      = cityRPs.filter(r => r.connection_status === 'self')
  const ambassadors = cityRPs.filter(r => r.is_ambassador)
  const trusted     = cityRPs.filter(r => r.is_trusted && !r.is_ambassador)
  const connectedRPs = cityRPs.filter(r => !r.is_ambassador && !r.is_trusted && r.connection_status === 'accepted')
  const others       = cityRPs.filter(r => !r.is_ambassador && !r.is_trusted && r.connection_status !== 'accepted' && r.connection_status !== 'self')

  const selectedData = cities.find(c => c.slug === selectedCity)
  const totalCount   = selectedData?.count ?? cityRPs.filter(r => r.connection_status !== 'self').length

  // ── Rendu d'une card RP ───────────────────────────────────────────────────────
  const renderRP = (rp: RPCard) => {
    const isAmbassador = rp.is_ambassador
    const isTrusted    = rp.is_trusted && !rp.is_ambassador
    const isConnected  = rp.connection_status === 'accepted'
    const isSelf       = rp.connection_status === 'self'
    const isPending    = rp.connection_status === 'pending_sent' || rp.connection_status === 'pending_received'

    return (
      <div
        key={rp.slug}
        className="flex items-center gap-3 p-3"
        style={{
          background: isSelf
            ? 'rgba(201,168,76,0.05)'
            : isAmbassador ? 'rgba(255,229,0,0.025)'
            : 'rgba(255,255,255,0.02)',
          border: isSelf
            ? '1px solid rgba(201,168,76,0.2)'
            : isAmbassador ? '1px solid rgba(255,229,0,0.1)'
            : isTrusted ? '1px solid rgba(0,255,135,0.08)'
            : isConnected ? '1px solid rgba(59,130,246,0.12)'
            : '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-[13px] font-semibold text-white"
          style={{ background: isSelf ? 'rgba(201,168,76,0.25)' : avatarColor(rp.display_name) }}
        >
          {initials(rp.display_name)}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          {/* Nom */}
          <p className="text-white/85 text-[13px] font-medium leading-none">{rp.display_name}</p>

          {/* Tagline */}
          {rp.tagline && (
            <p className="text-[11px] text-white/25 truncate mt-0.5">{rp.tagline}</p>
          )}

          {/* ── Statut lisible ────────────────────────────────── */}
          <div className="mt-1.5">
            {isAmbassador && (
              <span
                className="inline-flex items-center gap-1 text-[9px] tracking-[0.2em] uppercase font-semibold"
                style={{ color: '#FFE500', filter: 'drop-shadow(0 0 3px rgba(255,229,0,0.5))' }}
              >
                <span className="text-[11px]">★</span> Ambassadeur Itinera
              </span>
            )}
            {isTrusted && (
              <span
                className="inline-flex items-center gap-1 text-[9px] tracking-[0.2em] uppercase font-medium"
                style={{ color: '#00FF87' }}
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 flex-shrink-0" style={{ fill: '#00FF87' }}>
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
                Opérateur Trusted
              </span>
            )}
            {isConnected && !isAmbassador && !isTrusted && (
              <span
                className="inline-flex items-center gap-1 text-[9px] tracking-[0.2em] uppercase"
                style={{ color: '#3B82F6' }}
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 flex-shrink-0" style={{ fill: '#3B82F6' }}>
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
                Partenaire
              </span>
            )}
            {isPending && (
              <span
                className="inline-flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 flex-shrink-0" style={{ fill: 'rgba(255,255,255,0.2)' }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
                </svg>
                En attente
              </span>
            )}
            {!isAmbassador && !isTrusted && !isConnected && !isPending && !isSelf && (
              <span
                className="text-[9px] tracking-[0.15em] uppercase"
                style={{ color: 'rgba(255,255,255,0.15)' }}
              >Opérateur</span>
            )}
          </div>
        </div>

        {/* Action */}
        {!isSelf && (
          <div className="flex-shrink-0 pl-1">
            {isConnected ? (
              <span className="text-[10px] text-[#3B82F6]/50 tracking-wider">Connecté ✓</span>
            ) : isPending ? (
              <span className="text-[10px] text-white/20">En attente…</span>
            ) : (
              <button
                onClick={() => sendRequest(rp.slug)}
                disabled={connecting === rp.slug}
                className="px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase transition-all disabled:opacity-40"
                style={{ border: '1px solid rgba(91,61,245,0.3)', color: 'rgba(91,61,245,0.8)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(91,61,245,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {connecting === rp.slug ? '…' : 'Connecter'}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Section avec titre + liste de RP
  const renderSection = (title: string, color: string, rps: RPCard[]) => {
    if (rps.length === 0) return null
    return (
      <div className="mt-5 first:mt-0">
        <p className="text-[9px] tracking-[0.35em] uppercase px-0.5 pb-2" style={{ color }}>{title}</p>
        <div className="space-y-1.5">{rps.map(renderRP)}</div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#04090f' }}>

      {/* ── Header ── */}
      <div
        className="flex-shrink-0 border-b border-white/5"
        style={{ background: 'rgba(4,9,15,0.98)' }}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">

          {/* Gauche : back + titre */}
          <div className="flex items-center gap-3">
            {selectedCity && (
              <button
                onClick={() => { setSelectedCity(null); setCityRPs([]) }}
                className="w-8 h-8 flex items-center justify-center border border-white/10 text-white/40 hover:text-white hover:border-white/25 transition-all text-sm"
                title="Retour aux destinations"
              >←</button>
            )}
            <div>
              <span
                className="text-[7px] tracking-[0.6em] uppercase block"
                style={{ color: 'rgba(201,168,76,0.45)' }}
              >Itinera</span>
              <span
                className="font-playfair text-lg tracking-widest"
                style={{ color: '#C9A84C' }}
              >GLOBAL ACCESS</span>
            </div>
          </div>

          {/* Droite : info + fermer */}
          <div className="flex items-center gap-3">
            {!selectedCity && cities.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: '#3B82F6', boxShadow: '0 0 5px 2px rgba(59,130,246,0.4)' }}
                />
                <span className="text-[10px] text-white/20 tracking-[0.12em] uppercase">
                  {cities.length} destination{cities.length > 1 ? 's' : ''} actives
                </span>
              </div>
            )}
            {selectedCity && (
              <p className="text-[11px] text-white/25 tracking-[0.25em] uppercase hidden sm:block">
                {selectedData?.name ?? destLabel(selectedCity)}
              </p>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center border border-white/10 text-white/35 hover:text-white hover:border-white/25 transition-all text-xl leading-none"
            >×</button>
          </div>
        </div>

        {/* Onglets Destinations / Mon réseau (vue principale uniquement) */}
        {!selectedCity && (
          <div className="flex border-b border-white/5">
            <button
              onClick={() => setActiveTab('destinations')}
              className="flex-1 py-2.5 text-[9px] tracking-[0.3em] uppercase transition-all border-b-2"
              style={{
                color: activeTab === 'destinations' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.2)',
                borderColor: activeTab === 'destinations' ? 'rgba(255,255,255,0.2)' : 'transparent',
              }}
            >
              Destinations
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className="flex-1 py-2.5 text-[9px] tracking-[0.3em] uppercase transition-all border-b-2 flex items-center justify-center gap-1.5"
              style={{
                color: activeTab === 'partners' ? '#C9A84C' : 'rgba(255,255,255,0.2)',
                borderColor: activeTab === 'partners' ? 'rgba(201,168,76,0.4)' : 'transparent',
              }}
            >
              Mon réseau
              {partners.length > 0 && (
                <span
                  className="text-[8px] font-semibold opacity-70"
                >({partners.length})</span>
              )}
            </button>
          </div>
        )}

        {/* Barre de recherche (vue principale uniquement) */}
        {!selectedCity && (
          <div className="px-5 pb-3 pt-3">
            <div
              className="flex items-center gap-3 border border-white/8 px-4 py-2.5 focus-within:border-white/18 transition-colors"
              style={{ background: 'rgba(255,255,255,0.025)' }}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/20 flex-shrink-0">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                value={activeTab === 'destinations' ? search : partnerSearch}
                onChange={e => activeTab === 'destinations' ? setSearch(e.target.value) : setPartnerSearch(e.target.value)}
                placeholder={activeTab === 'destinations' ? 'Rechercher une destination…' : 'Rechercher un partenaire…'}
                className="bg-transparent text-white/70 text-[13px] placeholder-white/18 outline-none flex-1"
              />
              {(activeTab === 'destinations' ? search : partnerSearch) && (
                <button
                  onClick={() => activeTab === 'destinations' ? setSearch('') : setPartnerSearch('')}
                  className="text-white/25 hover:text-white/60 text-lg leading-none"
                >×</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Invitations en attente ── */}
        {!selectedCity && pendingInvites.length > 0 && (
          <div
            className="mx-4 md:mx-5 mt-4 border"
            style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)' }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 border-b"
              style={{ borderColor: 'rgba(201,168,76,0.15)' }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: '#C9A84C', boxShadow: '0 0 6px 2px rgba(201,168,76,0.5)' }}
              />
              <span
                className="text-[9px] tracking-[0.35em] uppercase font-medium"
                style={{ color: 'rgba(201,168,76,0.75)' }}
              >
                {pendingInvites.length} demande{pendingInvites.length > 1 ? 's' : ''} de connexion
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(201,168,76,0.08)' }}>
              {pendingInvites.map(inv => (
                <div key={inv.from_slug} className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-[12px] font-semibold text-white"
                    style={{ background: avatarColor(inv.display_name) }}
                  >
                    {initials(inv.display_name)}
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white/85 text-[13px] font-medium leading-none">{inv.display_name}</p>
                    {inv.tagline && (
                      <p className="text-[11px] text-white/25 truncate mt-0.5">{inv.tagline}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => respondToInvite(inv.from_slug, 'accept')}
                      disabled={respondingTo === inv.from_slug}
                      className="px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase font-medium transition-all disabled:opacity-40"
                      style={{
                        background: 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.35)',
                        color: '#C9A84C',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.22)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.12)' }}
                    >
                      {respondingTo === inv.from_slug ? '…' : 'Accepter'}
                    </button>
                    <button
                      onClick={() => respondToInvite(inv.from_slug, 'decline')}
                      disabled={respondingTo === inv.from_slug}
                      className="px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase transition-all disabled:opacity-40"
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.25)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Vue Mon réseau ── */}
        {!selectedCity && activeTab === 'partners' && (
          <div className="p-4 md:p-5">
            {partnersLoading && (
              <div className="text-center py-16 text-white/15 text-sm tracking-wider">Chargement…</div>
            )}

            {!partnersLoading && partners.length === 0 && (
              <div className="text-center py-16 px-4">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 border border-white/8 mb-5"
                  style={{ background: 'rgba(255,255,255,0.025)' }}
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white/15">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                </div>
                <p className="text-white/40 text-sm font-medium mb-2">Aucun partenaire connecté</p>
                <p className="text-white/18 text-[12px] leading-relaxed max-w-xs mx-auto">
                  Connectez-vous à d'autres conciergeries depuis l'onglet Destinations pour les voir apparaître ici.
                </p>
              </div>
            )}

            {!partnersLoading && partners.length > 0 && (() => {
              const filtered = partners.filter(p =>
                !partnerSearch.trim() ||
                p.display_name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
                p.tagline.toLowerCase().includes(partnerSearch.toLowerCase()) ||
                p.destinations.some(d => d.toLowerCase().includes(partnerSearch.toLowerCase()))
              ).sort((a, b) => a.display_name.localeCompare(b.display_name))

              return (
                <div>
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/15 mb-4">
                    {filtered.length} partenaire{filtered.length !== 1 ? 's' : ''} · réseau accepté
                  </p>
                  <div className="space-y-1.5">
                    {filtered.map(partner => {
                      const isOpen = selectedPartner === partner.slug
                      const hasEmail = !!partner.email
                      const hasWA = !!partner.whatsapp

                      return (
                        <div
                          key={partner.slug}
                          style={{
                            border: isOpen
                              ? '1px solid rgba(201,168,76,0.25)'
                              : '1px solid rgba(255,255,255,0.06)',
                            background: isOpen ? 'rgba(201,168,76,0.03)' : 'transparent',
                          }}
                        >
                          {/* Ligne principale — cliquable */}
                          <button
                            onClick={() => setSelectedPartner(isOpen ? null : partner.slug)}
                            className="w-full flex items-center gap-3 p-3 text-left transition-colors"
                            style={{ background: 'transparent' }}
                            onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          >
                            {/* Avatar */}
                            <div
                              className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-[13px] font-semibold text-white"
                              style={{ background: avatarColor(partner.display_name) }}
                            >
                              {initials(partner.display_name)}
                            </div>

                            {/* Infos */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white/85 text-[13px] font-medium leading-none">{partner.display_name}</span>

                                {/* Statut prioritaire */}
                                {partner.is_ambassador ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[8px] tracking-wider px-1.5 py-0.5 font-semibold"
                                    style={{ color: '#FFE500', border: '1px solid rgba(255,229,0,0.25)', background: 'rgba(255,229,0,0.06)', filter: 'drop-shadow(0 0 2px rgba(255,229,0,0.3))' }}
                                  >★ Ambassadeur</span>
                                ) : partner.is_trusted ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[8px] tracking-wider px-1.5 py-0.5"
                                    style={{ color: '#00FF87', border: '1px solid rgba(0,255,135,0.2)', background: 'rgba(0,255,135,0.05)' }}
                                  >✓ Trusted</span>
                                ) : (
                                  <span
                                    className="text-[8px] tracking-wider px-1.5 py-0.5"
                                    style={{ color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.06)' }}
                                  >Partenaire</span>
                                )}
                              </div>
                              {partner.tagline && (
                                <p className="text-[11px] text-white/25 truncate mt-0.5">{partner.tagline}</p>
                              )}
                              {partner.destinations.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {partner.destinations.slice(0, 4).map(d => (
                                    <span
                                      key={d}
                                      className="text-[9px] px-1.5 py-px"
                                      style={{ color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.07)' }}
                                    >
                                      {destLabel(d)}
                                    </span>
                                  ))}
                                  {partner.destinations.length > 4 && (
                                    <span className="text-[9px] text-white/15">+{partner.destinations.length - 4}</span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Chevron */}
                            <span
                              className="flex-shrink-0 text-white/20 transition-transform duration-200"
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}
                            >▾</span>
                          </button>

                          {/* Panneau de contact — visible si ouvert */}
                          {isOpen && (
                            <div
                              className="border-t px-3 pb-3 pt-2.5 space-y-2"
                              style={{ borderColor: 'rgba(201,168,76,0.12)' }}
                            >
                              <p className="text-[8px] tracking-[0.3em] uppercase text-white/18 mb-2">Contacter</p>

                              {/* Email */}
                              {hasEmail ? (
                                <a
                                  href={`mailto:${partner.email}`}
                                  className="flex items-center gap-3 px-3 py-2.5 transition-colors group"
                                  style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.25)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)' }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/30 flex-shrink-0 group-hover:fill-[#3B82F6]/60 transition-colors">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                  </svg>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] text-white/25 tracking-[0.2em] uppercase">Email</p>
                                    <p className="text-[12px] text-white/55 truncate">{partner.email}</p>
                                  </div>
                                  <span className="text-[10px] text-white/15 group-hover:text-[#3B82F6]/40 transition-colors">↗</span>
                                </a>
                              ) : (
                                <div
                                  className="flex items-center gap-3 px-3 py-2.5"
                                  style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/10 flex-shrink-0">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                  </svg>
                                  <p className="text-[11px] text-white/18 italic">Adresse email non renseignée</p>
                                </div>
                              )}

                              {/* WhatsApp */}
                              {hasWA ? (
                                <a
                                  href={waLink(partner.whatsapp)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-3 px-3 py-2.5 transition-colors group"
                                  style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(37,211,102,0.25)'; e.currentTarget.style.background = 'rgba(37,211,102,0.04)' }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0 transition-colors group-hover:fill-[#25D366]/70" style={{ fill: 'rgba(255,255,255,0.3)' }}>
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] text-white/25 tracking-[0.2em] uppercase">WhatsApp</p>
                                    <p className="text-[12px] text-white/55 truncate">{partner.whatsapp}</p>
                                  </div>
                                  <span className="text-[10px] text-white/15 group-hover:text-[#25D366]/40 transition-colors">↗</span>
                                </a>
                              ) : (
                                <div
                                  className="flex items-center gap-3 px-3 py-2.5"
                                  style={{ border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/10 flex-shrink-0">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  <p className="text-[11px] text-white/18 italic">WhatsApp non renseigné</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Grille de destinations ── */}
        {!selectedCity && activeTab === 'destinations' && (
          <div className="p-4 md:p-5">
            {/* Sous-titre */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/15">
                Accès destinations · réseau de concierges
              </p>
            </div>

            {filteredCities.length === 0 && !search && (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 border border-white/8 mb-5" style={{ background: 'rgba(255,255,255,0.025)' }}>
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white/15">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <p className="text-white/40 text-sm font-medium mb-2">Aucune destination configurée</p>
                <p className="text-white/18 text-[12px] leading-relaxed max-w-xs mx-auto mb-5">
                  Pour apparaître sur le réseau Global Access, activez vos destinations depuis votre profil.
                </p>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2.5 border text-[11px] tracking-[0.15em] uppercase"
                  style={{ borderColor: 'rgba(201,168,76,0.3)', color: 'rgba(201,168,76,0.7)', background: 'rgba(201,168,76,0.05)' }}
                >
                  <span>Dashboard</span>
                  <span style={{ color: 'rgba(201,168,76,0.4)' }}>→</span>
                  <span>Configuration</span>
                  <span style={{ color: 'rgba(201,168,76,0.4)' }}>→</span>
                  <span>Destinations actives</span>
                </div>
              </div>
            )}
            {filteredCities.length === 0 && search && (
              <p className="text-center text-white/15 text-sm py-20">
                Aucun résultat pour «&nbsp;{search}&nbsp;»
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredCities.map(city => {
                // Couleur prioritaire : le tier le plus élevé présent dans la ville
                const dotColor = city.hasAmbassador ? '#C9A84C'
                  : city.hasTrusted    ? '#00FF87'
                  : city.hasConnection ? '#7C5CFC'
                  : '#3B82F6'
                const dotGlow  = city.hasAmbassador ? 'rgba(201,168,76,0.65)'
                  : city.hasTrusted    ? 'rgba(0,255,135,0.5)'
                  : city.hasConnection ? 'rgba(124,92,252,0.55)'
                  : 'rgba(59,130,246,0.5)'

                return (
                  <button
                    key={city.slug}
                    onClick={() => selectCity(city.slug)}
                    className="relative overflow-hidden text-left focus:outline-none group"
                    style={{
                      aspectRatio: '3/2',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {/* Photo destination */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={city.image ?? destImage(city.slug)}
                      alt={destLabel(city.slug)}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      onError={e => { e.currentTarget.src = FALLBACK_IMAGE }}
                    />

                    {/* Overlay dégradé bas */}
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.08) 100%)' }}
                    />

                    {/* Haut droite : point prioritaire + nombre */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: dotColor, boxShadow: `0 0 8px 3px ${dotGlow}` }}
                      />
                      <span className="text-[12px] font-medium text-white/85">{city.count}</span>
                    </div>

                    {/* Haut gauche : icône du tier le plus élevé uniquement */}
                    {city.hasAmbassador ? (
                      <span
                        className="absolute top-2.5 left-2.5 text-[12px]"
                        style={{ color: '#FFE500', filter: 'drop-shadow(0 0 4px rgba(255,229,0,0.85))' }}
                      >★</span>
                    ) : city.hasTrusted ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="absolute top-2.5 left-2.5 w-3.5 h-3.5"
                        style={{ fill: '#00FF87', filter: 'drop-shadow(0 0 3px rgba(0,255,135,0.7))' }}
                      >
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                      </svg>
                    ) : null}

                    {/* Bas : nom + sous-titre */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <div className="flex items-end justify-between gap-1">
                        <div className="min-w-0">
                          <p className="text-white text-[13px] font-medium tracking-wide leading-tight">
                            {city.name ?? destLabel(city.slug)}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                            {`${city.count} opérateur${city.count !== 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hover : bordure interne */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Liste RP d'une destination ── */}
        {selectedCity && (
          <div className="max-w-xl mx-auto">

            {/* Bandeau destination */}
            <div className="relative h-24 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedData?.image ?? destImage(selectedCity)}
                alt={destLabel(selectedCity)}
                className="absolute inset-0 w-full h-full object-cover"
                onError={e => { e.currentTarget.src = FALLBACK_IMAGE }}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(4,9,15,0.94) 0%, rgba(4,9,15,0.6) 100%)' }}
              />
              <div className="relative flex items-center justify-between h-full px-5">
                <div>
                  <p className="text-[8px] tracking-[0.45em] uppercase text-white/25 mb-1">
                    Accès destination
                  </p>
                  <h2 className="font-playfair text-xl text-white">{selectedData?.name ?? destLabel(selectedCity)}</h2>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-light" style={{ color: 'rgba(255,255,255,0.85)' }}>{totalCount}</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/25">
                    opérateur{totalCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Sections RP */}
            <div className="px-4 py-5">
              {cityLoading && (
                <div className="text-center py-16 text-white/15 text-sm tracking-wider">Chargement…</div>
              )}

              {!cityLoading && cityRPs.length === 0 && (
                <div className="text-center py-16 text-white/15 text-sm">
                  Aucun opérateur enregistré dans cette destination
                </div>
              )}

              {!cityLoading && cityRPs.length > 0 && (
                <div>
                  {renderSection('Ambassadeurs', 'rgba(255,229,0,0.5)', ambassadors)}
                  {renderSection('Opérateurs Trusted', 'rgba(0,255,135,0.4)', trusted)}
                  {renderSection('Partenaires', 'rgba(59,130,246,0.45)', connectedRPs)}
                  {renderSection('Opérateurs actifs', 'rgba(255,255,255,0.2)', others)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
