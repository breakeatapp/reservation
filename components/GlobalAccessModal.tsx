'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Coordonnées géographiques précises (projection équirectangulaire) ─────────
// x = (longitude + 180) / 360 * 100
// y = (90 - latitude)  / 180 * 100
const CITY_MAP: Record<string, { x: number; y: number; name: string }> = {
  'london':        { x: 49.97, y: 21.39, name: 'London' },
  'paris':         { x: 50.65, y: 22.86, name: 'Paris' },
  'courchevel':    { x: 51.84, y: 24.77, name: 'Courchevel' },
  'milan':         { x: 52.55, y: 24.75, name: 'Milan' },
  'rome':          { x: 53.47, y: 26.72, name: 'Rome' },
  'cavalaire':     { x: 51.81, y: 25.96, name: 'Cavalaire' },
  'cannes':        { x: 51.95, y: 25.80, name: 'Cannes' },
  'monaco':        { x: 52.06, y: 25.71, name: 'Monaco' },
  'saint-tropez':  { x: 51.84, y: 25.96, name: 'Saint-Tropez' },
  'ibiza':         { x: 50.40, y: 28.38, name: 'Ibiza' },
  'mykonos':       { x: 56.77, y: 29.19, name: 'Mykonos' },
  'jeddah':        { x: 60.88, y: 37.90, name: 'Jeddah' },
  'abu-dhabi':     { x: 65.10, y: 36.40, name: 'Abu Dhabi' },
  'dubai':         { x: 65.36, y: 35.89, name: 'Dubai' },
  'maldives':      { x: 70.97, y: 47.89, name: 'Maldives' },
  'saint-barth':   { x: 32.55, y: 40.06, name: 'Saint-Barth' },
  'miami':         { x: 27.72, y: 35.68, name: 'Miami' },
  'tulum':         { x: 25.71, y: 38.78, name: 'Tulum' },
  'aspen':         { x: 20.33, y: 28.23, name: 'Aspen' },
  'new-york':      { x: 26.35, y: 29.17, name: 'New York' },
  'los-angeles':   { x: 17.23, y: 32.50, name: 'Los Angeles' },
  'bali':          { x: 74.08, y: 45.17, name: 'Bali' },
  'phuket':        { x: 72.94, y: 43.89, name: 'Phuket' },
  'marrakech':     { x: 46.78, y: 33.33, name: 'Marrakech' },
  'barcelona':     { x: 50.90, y: 27.83, name: 'Barcelona' },
  'saint-jean-cap-ferrat': { x: 52.06, y: 25.74, name: 'Cap Ferrat' },
}

// ── Helpers avatar ─────────────────────────────────────────────────────────────
const PALETTE = ['#5B3DF5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#B45309', '#DC2626']
function avatarColor(name: string): string {
  let h = 0
  for (const c of name) h = ((h << 5) - h) + c.charCodeAt(0)
  return PALETTE[Math.abs(h) % PALETTE.length]
}
function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
}

// ── Types ──────────────────────────────────────────────────────────────────────
type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'
type RPCard = {
  slug: string
  display_name: string
  tagline: string
  destinations: string[]
  connection_status: ConnectionStatus | 'self'
  is_ambassador: boolean
  is_trusted: boolean
  reservation_count: number
}
type CityData = { slug: string; count: number; hasConnection: boolean }
type Props = { rpSlug: string; rpPassword: string; onClose: () => void }

// ── Component ──────────────────────────────────────────────────────────────────
export default function GlobalAccessModal({ rpSlug, rpPassword, onClose }: Props) {
  const [cities, setCities] = useState<CityData[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [cityRPs, setCityRPs] = useState<RPCard[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [partnersOnly, setPartnersOnly] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Load cities on mount
  useEffect(() => {
    fetch(`/api/network/cities?rp_slug=${encodeURIComponent(rpSlug)}`, {
      headers: { 'x-rp-password': rpPassword },
    })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCities(d) })
      .catch(() => {})
  }, [rpSlug, rpPassword])

  // Load RPs for a city
  const selectCity = useCallback(async (dest: string) => {
    setSelectedCity(dest)
    setSearch('')
    setCityLoading(true)
    setCityRPs([])
    try {
      const r = await fetch(
        `/api/network/city/${encodeURIComponent(dest)}?rp_slug=${encodeURIComponent(rpSlug)}`,
        { headers: { 'x-rp-password': rpPassword } }
      )
      const d = await r.json()
      if (Array.isArray(d)) setCityRPs(d)
    } catch { /* ignore */ }
    finally { setCityLoading(false) }
  }, [rpSlug, rpPassword])

  // Send / accept connection
  const sendRequest = async (toSlug: string) => {
    setConnecting(toSlug)
    try {
      await fetch('/api/network/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': rpPassword },
        body: JSON.stringify({ from_slug: rpSlug, to_slug: toSlug }),
      })
      if (selectedCity) await selectCity(selectedCity)
    } catch { /* ignore */ }
    finally { setConnecting(null) }
  }

  // Search suggestions
  const searchResults = search.trim().length > 0
    ? Object.entries(CITY_MAP).filter(([, v]) =>
        v.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 6)
    : []

  // Visible cities on map
  const mapCities = partnersOnly ? cities.filter(c => c.hasConnection) : cities
  const partnerCount = cities.filter(c => c.hasConnection).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#04090f' }}>

      {/* ── Header ── */}
      <div
        className="flex-shrink-0 border-b border-white/5"
        style={{ background: 'rgba(4,9,15,0.97)' }}
      >
        {/* Ligne 1 : titre + fermer */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <span className="text-[7px] tracking-[0.6em] text-white/20 uppercase block">Itinera</span>
            <span className="font-playfair text-lg text-white tracking-widest">GLOBAL ACCESS</span>
          </div>
          <div className="flex items-center gap-2">
            {/* My Partners toggle */}
            <button
              onClick={() => setPartnersOnly(!partnersOnly)}
              className={`hidden md:flex items-center gap-2 px-3 py-2 text-[9px] tracking-[0.15em] uppercase border transition-all ${
                partnersOnly
                  ? 'border-[#5B3DF5]/50 text-[#5B3DF5] bg-[#5B3DF5]/10'
                  : 'border-white/10 text-white/35 hover:border-white/20 hover:text-white/60'
              }`}
            >
              Partenaires {partnerCount > 0 && <span className="opacity-60">{partnerCount}</span>}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center border border-white/10 text-white/35 hover:text-white hover:border-white/25 transition-all text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Ligne 2 : barre de recherche ville prominente */}
        <div className="px-5 pb-3 relative">
          <div className="flex items-center gap-3 bg-white/4 border border-white/12 px-4 py-3 hover:border-white/20 transition-colors focus-within:border-[#3B82F6]/40 focus-within:bg-[#3B82F6]/4">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/30 flex-shrink-0">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une ville — Paris, Dubai, Miami…"
              className="bg-transparent text-white/80 text-[13px] tracking-wide placeholder-white/20 outline-none flex-1"
            />
            {search ? (
              <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/70 text-lg leading-none transition-colors">×</button>
            ) : (
              <span className="text-[10px] tracking-[0.2em] text-white/15 uppercase hidden sm:block">Ville</span>
            )}
          </div>

          {/* Dropdown résultats */}
          {searchResults.length > 0 && (
            <div className="absolute left-5 right-5 top-full mt-0.5 bg-[#0a1220] border border-white/12 z-30 shadow-2xl">
              {searchResults.map(([slug, info]) => {
                const cityData = cities.find(c => c.slug === slug)
                const hasRPs = cityData && cityData.count > 0
                return (
                  <button
                    key={slug}
                    onClick={() => { selectCity(slug); setSearch('') }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      {hasRPs && (
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: '#3B82F6', boxShadow: '0 0 6px 2px rgba(59,130,246,0.5)' }}
                        />
                      )}
                      <span className={`text-[13px] ${hasRPs ? 'text-white/80' : 'text-white/35'}`}>{info.name}</span>
                    </div>
                    {cityData ? (
                      <span className="text-[10px] text-[#3B82F6]/50 tracking-wider">
                        {cityData.count} opérateur{cityData.count > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/15 tracking-wider">Aucun opérateur</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Map + Panel ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* ── World map background ── */}
        {/* Fond sombre */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #04090f 0%, #060d18 50%, #04090f 100%)' }} />

        {/* Continents — blanc très atténué sur fond sombre = outlines subtils */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/World_map_blank_without_borders.svg/2560px-World_map_blank_without_borders.svg.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            opacity: 0.06,
          }}
        />

        {/* Overlay subtil pour profondeur */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#04090f]/70 via-transparent to-[#04090f]/80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04090f]/50 via-transparent to-[#04090f]/50 pointer-events-none" />

        {/* Empty state */}
        {mapCities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/15">
              {partnersOnly ? 'Aucun partenaire actif' : 'Chargement du réseau…'}
            </p>
          </div>
        )}

        {/* ── City dots ── */}
        {mapCities.map(city => {
          const pos = CITY_MAP[city.slug]
          if (!pos) return null
          const isSelected = selectedCity === city.slug
          const isPartner = city.hasConnection

          return (
            <button
              key={city.slug}
              onClick={() => selectCity(city.slug)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              title={pos.name}
            >
              {/* Ping ring */}
              {!isSelected && (
                <span
                  className="absolute rounded-full animate-ping"
                  style={{
                    width: 18, height: 18,
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: isPartner ? '#5B3DF5' : '#3B82F6',
                    opacity: 0.25,
                  }}
                />
              )}
              {/* Dot */}
              <span
                className="relative block rounded-full transition-all duration-200 z-10"
                style={{
                  width:  isSelected ? 14 : 9,
                  height: isSelected ? 14 : 9,
                  background: isSelected
                    ? '#fff'
                    : isPartner
                    ? '#7C5CFC'
                    : '#3B82F6',
                  boxShadow: isSelected
                    ? '0 0 0 3px rgba(255,255,255,0.15), 0 0 16px 4px rgba(255,255,255,0.35)'
                    : isPartner
                    ? '0 0 12px 3px rgba(124,92,252,0.7)'
                    : '0 0 10px 3px rgba(59,130,246,0.6)',
                }}
              />
              {/* City label */}
              <span
                className="absolute whitespace-nowrap pointer-events-none"
                style={{ top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 }}
              >
                <span className="text-[8px] tracking-wider text-white/40 group-hover:text-white/70 transition-colors block text-center">
                  {pos.name}
                </span>
                {city.count > 0 && (
                  <span className="text-[7px] text-[#3B82F6]/60 block text-center">{city.count}</span>
                )}
              </span>
            </button>
          )
        })}

        {/* Légende */}
        <div className="absolute bottom-5 left-5 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full block" style={{ background: '#3B82F6', boxShadow: '0 0 6px 2px rgba(59,130,246,0.5)' }} />
            <span className="text-[8px] tracking-[0.2em] uppercase text-white/25">Opérateur actif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full block" style={{ background: '#7C5CFC', boxShadow: '0 0 6px 2px rgba(124,92,252,0.6)' }} />
            <span className="text-[8px] tracking-[0.2em] uppercase text-white/25">Partenaire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold leading-none"
              style={{ color: '#FFE500', textShadow: '0 0 6px rgba(255,229,0,0.6)' }}
            >★</span>
            <span className="text-[8px] tracking-[0.2em] uppercase text-white/25">Ambassadeur</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[9px] font-bold leading-none"
              style={{ color: '#00FF87', textShadow: '0 0 6px rgba(0,255,135,0.5)' }}
            >✓</span>
            <span className="text-[8px] tracking-[0.2em] uppercase text-white/25">Certifié</span>
          </div>
        </div>

        {/* Label bas */}
        <div className="absolute bottom-5 right-5 pointer-events-none">
          <p className="text-[7px] tracking-[0.5em] uppercase text-white/10">Global Hospitality Network</p>
        </div>

        {/* ── Panel droit — RPs d'une ville ── */}
        {selectedCity && (
          <div
            className="absolute top-0 right-0 bottom-0 overflow-y-auto z-20"
            style={{
              width: 'min(380px, 100%)',
              background: 'rgba(8,13,22,0.98)',
              backdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Panel header */}
            <div
              className="sticky top-0 z-10 px-5 py-4 flex items-center justify-between border-b border-white/5"
              style={{ background: 'rgba(8,13,22,0.99)' }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: '#3B82F6', boxShadow: '0 0 8px 2px rgba(59,130,246,0.6)' }}
                  />
                  <h2 className="font-playfair text-xl text-white leading-tight">
                    {CITY_MAP[selectedCity]?.name ?? selectedCity}
                  </h2>
                </div>
                <p className="text-[8px] tracking-[0.3em] uppercase text-[#3B82F6]/40 mt-0.5 pl-4">
                  {cityRPs.filter(r => r.slug !== rpSlug).length} opérateur{cityRPs.filter(r => r.slug !== rpSlug).length !== 1 ? 's' : ''} actif{cityRPs.filter(r => r.slug !== rpSlug).length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                className="text-white/30 hover:text-white text-xl transition-colors leading-none w-8 h-8 flex items-center justify-center border border-white/8 hover:border-white/20"
              >
                ×
              </button>
            </div>

            {/* RP cards */}
            <div className="p-4 space-y-3">
              {cityLoading ? (
                <div className="py-16 text-center">
                  <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase animate-pulse">Chargement…</p>
                </div>
              ) : cityRPs.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-white/15 text-[10px] tracking-[0.3em] uppercase">Aucun opérateur</p>
                </div>
              ) : cityRPs.map(rp => {
                const isMe = rp.slug === rpSlug
                const color = avatarColor(rp.display_name)
                const inits = initials(rp.display_name)

                return (
                  <div
                    key={rp.slug}
                    className="border p-4 transition-colors"
                    style={{
                      background: '#0d1422',
                      borderColor: rp.connection_status === 'accepted'
                        ? 'rgba(124,92,252,0.2)'
                        : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[12px] font-semibold"
                        style={{ background: color }}
                      >
                        {inits}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Nom + badges statut réseau */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <p className="text-white text-sm font-medium leading-tight">{rp.display_name}</p>
                          {isMe && (
                            <span className="text-[8px] tracking-[0.2em] uppercase text-[#5B3DF5]/60 border border-[#5B3DF5]/20 px-1.5 py-0.5">Vous</span>
                          )}
                          {!isMe && rp.connection_status === 'accepted' && (
                            <span className="text-[8px] tracking-[0.2em] uppercase text-[#7C5CFC]/80 border border-[#7C5CFC]/25 px-1.5 py-0.5">✓ Partenaire</span>
                          )}
                          {!isMe && rp.connection_status === 'pending_received' && (
                            <span className="text-[8px] tracking-[0.2em] uppercase text-amber-400/70 border border-amber-400/20 px-1.5 py-0.5">Vous a contacté</span>
                          )}
                        </div>

                        {/* Pastilles Ambassador + Trust */}
                        {(rp.is_ambassador || rp.is_trusted) && (
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {rp.is_ambassador && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase font-semibold px-2 py-0.5 border"
                                style={{
                                  color: '#FFE500',
                                  borderColor: 'rgba(255,229,0,0.35)',
                                  background: 'rgba(255,229,0,0.08)',
                                  boxShadow: '0 0 8px 1px rgba(255,229,0,0.2)',
                                }}
                              >
                                ★ Ambassadeur
                              </span>
                            )}
                            {rp.is_trusted && (
                              <span
                                className="inline-flex items-center gap-1 text-[9px] tracking-[0.15em] uppercase font-semibold px-2 py-0.5 border"
                                style={{
                                  color: '#00FF87',
                                  borderColor: 'rgba(0,255,135,0.30)',
                                  background: 'rgba(0,255,135,0.07)',
                                  boxShadow: '0 0 8px 1px rgba(0,255,135,0.18)',
                                }}
                              >
                                ✓ Certifié
                              </span>
                            )}
                          </div>
                        )}

                        {rp.tagline && (
                          <p className="text-white/30 text-xs leading-relaxed">{rp.tagline}</p>
                        )}
                        {rp.destinations.length > 0 && (
                          <p className="text-[10px] text-white/20 mt-1.5 tracking-wide">
                            {rp.destinations.slice(0, 4).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {!isMe && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        {rp.connection_status === 'accepted' ? (
                          <p className="text-[10px] tracking-[0.2em] uppercase text-[#7C5CFC]/60 text-center py-1">
                            ✓ Connecté — Partenaire
                          </p>
                        ) : rp.connection_status === 'pending_sent' ? (
                          <p className="text-[10px] tracking-[0.2em] uppercase text-amber-400/40 text-center py-1">
                            ⏳ Demande envoyée
                          </p>
                        ) : rp.connection_status === 'pending_received' ? (
                          <button
                            onClick={() => sendRequest(rp.slug)}
                            disabled={connecting === rp.slug}
                            className="w-full py-2 text-[10px] tracking-[0.2em] uppercase bg-green-500/10 border border-green-500/25 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-40"
                          >
                            {connecting === rp.slug ? '…' : '✓ Accepter la demande'}
                          </button>
                        ) : (
                          <button
                            onClick={() => sendRequest(rp.slug)}
                            disabled={connecting === rp.slug}
                            className="w-full py-2 text-[10px] tracking-[0.2em] uppercase border border-white/8 text-white/40 hover:bg-[#3B82F6]/8 hover:border-[#3B82F6]/25 hover:text-white/70 transition-all disabled:opacity-40"
                          >
                            {connecting === rp.slug ? '…' : 'Request Introduction'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
