'use client'

import { useState, useEffect, useCallback } from 'react'

// ── City coordinates on equirectangular world map (left%, top%) ──────────────
const CITY_MAP: Record<string, { x: number; y: number; name: string }> = {
  'london':       { x: 50.0, y: 26.0, name: 'London' },
  'paris':        { x: 51.2, y: 27.5, name: 'Paris' },
  'courchevel':   { x: 52.2, y: 28.0, name: 'Courchevel' },
  'milan':        { x: 53.0, y: 29.0, name: 'Milan' },
  'cavalaire':    { x: 52.4, y: 31.2, name: 'Cavalaire' },
  'cannes':       { x: 52.6, y: 31.0, name: 'Cannes' },
  'monaco':       { x: 52.9, y: 31.0, name: 'Monaco' },
  'saint-tropez': { x: 52.5, y: 31.5, name: 'Saint-Tropez' },
  'rome':         { x: 53.7, y: 31.2, name: 'Rome' },
  'ibiza':        { x: 51.0, y: 33.0, name: 'Ibiza' },
  'mykonos':      { x: 56.6, y: 32.5, name: 'Mykonos' },
  'jeddah':       { x: 61.2, y: 41.0, name: 'Jeddah' },
  'abu-dhabi':    { x: 63.9, y: 40.5, name: 'Abu Dhabi' },
  'dubai':        { x: 64.3, y: 40.0, name: 'Dubai' },
  'maldives':     { x: 69.5, y: 53.0, name: 'Maldives' },
  'saint-barth':  { x: 32.2, y: 43.0, name: 'Saint-Barth' },
  'miami':        { x: 27.5, y: 40.5, name: 'Miami' },
  'tulum':        { x: 25.5, y: 42.5, name: 'Tulum' },
  'aspen':        { x: 21.5, y: 34.5, name: 'Aspen' },
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
const PALETTE = ['#5B3DF5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#B45309', '#DC2626']

function avatarColor(name: string): string {
  let h = 0
  for (const c of name) h = ((h << 5) - h) + c.charCodeAt(0)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2)
}

// ── Types ─────────────────────────────────────────────────────────────────────
type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

type RPCard = {
  slug: string
  display_name: string
  tagline: string
  destinations: string[]
  connection_status: ConnectionStatus | 'self'
}

type CityData = {
  slug: string
  count: number
  hasConnection: boolean
}

type Props = {
  rpSlug: string
  rpPassword: string
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GlobalAccessModal({ rpSlug, rpPassword, onClose }: Props) {
  const [cities, setCities] = useState<CityData[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [cityRPs, setCityRPs] = useState<RPCard[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [partnersOnly, setPartnersOnly] = useState(false)

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
    setCityLoading(true)
    setCityRPs([])
    try {
      const r = await fetch(`/api/network/city/${encodeURIComponent(dest)}?rp_slug=${encodeURIComponent(rpSlug)}`, {
        headers: { 'x-rp-password': rpPassword },
      })
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

  const visibleCities = partnersOnly ? cities.filter(c => c.hasConnection) : cities

  const partnerCount = cities.filter(c => c.hasConnection).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#080B12' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#080B12]/95 backdrop-blur-sm">
        <div>
          <span className="text-[8px] tracking-[0.6em] text-white/20 uppercase block">Itinera</span>
          <span className="font-playfair text-lg text-white tracking-widest">NETWORK</span>
        </div>
        <div className="flex items-center gap-3">
          {/* My Partners toggle */}
          <button
            onClick={() => setPartnersOnly(!partnersOnly)}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.15em] uppercase border transition-all ${
              partnersOnly
                ? 'border-[#5B3DF5]/50 text-[#5B3DF5] bg-[#5B3DF5]/10'
                : 'border-white/10 text-white/35 hover:border-white/20 hover:text-white/60'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            My Partners {partnerCount > 0 && <span className="opacity-60">{partnerCount}</span>}
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center border border-white/10 text-white/35 hover:text-white hover:border-white/25 transition-all text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Map + Panel ── */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={e => {
          // Close the side panel when clicking the map background (not the panel itself)
          if (selectedCity && e.target === e.currentTarget) setSelectedCity(null)
        }}
      >

        {/* World map background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/World_map_blank_without_borders.svg/2560px-World_map_blank_without_borders.svg.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            filter: 'invert(1) brightness(0.08)',
          }}
        />

        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080B12]/60 via-transparent to-[#080B12]/80 pointer-events-none" />

        {/* Empty state when no cities */}
        {visibleCities.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-[10px] tracking-[0.4em] uppercase text-white/15">
                {partnersOnly ? 'Aucun partenaire actif' : 'Aucun opérateur disponible'}
              </p>
            </div>
          </div>
        )}

        {/* City dots */}
        {visibleCities.map(city => {
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
              <span
                className="absolute rounded-full animate-ping opacity-30"
                style={{
                  width: 20, height: 20,
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: isPartner ? '#5B3DF5' : '#3B82F6',
                }}
              />
              {/* Dot */}
              <span
                className="relative block rounded-full transition-all duration-200"
                style={{
                  width: isSelected ? 14 : 10,
                  height: isSelected ? 14 : 10,
                  background: isSelected ? '#fff' : isPartner ? '#5B3DF5' : '#3B82F6',
                  boxShadow: isSelected
                    ? '0 0 12px 4px rgba(255,255,255,0.4)'
                    : isPartner
                    ? '0 0 10px 3px rgba(91,61,245,0.6)'
                    : '0 0 8px 2px rgba(59,130,246,0.5)',
                }}
              />
              {/* City label + count */}
              <span className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                <span className="text-[9px] tracking-wider text-white/45 group-hover:text-white/75 transition-colors">
                  {pos.name}
                </span>
                <span className="text-[8px] text-[#5B3DF5]/70 ml-1">{city.count}</span>
              </span>
            </button>
          )
        })}

        {/* Bottom label */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <p className="text-[8px] tracking-[0.6em] uppercase text-white/10">Global Hospitality Network</p>
        </div>

        {/* ── Right panel ── */}
        {selectedCity && (
          <div
            className="absolute top-0 right-0 bottom-0 bg-[#0C0F16]/98 backdrop-blur-xl border-l border-white/5 overflow-y-auto"
            style={{ width: 'min(380px, 100%)' }}
          >
            {/* Panel header */}
            <div className="sticky top-0 bg-[#0C0F16] border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-playfair text-xl text-white leading-tight">
                  {CITY_MAP[selectedCity]?.name}
                </h2>
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#5B3DF5]/50 mt-0.5">
                  {cityRPs.filter(r => r.slug !== rpSlug).length} opérateur{cityRPs.filter(r => r.slug !== rpSlug).length > 1 ? 's' : ''} actif{cityRPs.filter(r => r.slug !== rpSlug).length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                className="text-white/30 hover:text-white text-xl transition-colors leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* RP cards */}
            <div className="p-4 space-y-3">
              {cityLoading ? (
                <div className="py-16 text-center">
                  <p className="text-white/20 text-[10px] tracking-[0.3em] uppercase animate-pulse">Chargement...</p>
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
                  <div key={rp.slug} className="bg-[#13161E] border border-white/5 p-4">
                    <div className="flex items-start gap-3">

                      {/* Avatar */}
                      <div
                        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[13px] font-semibold"
                        style={{ background: color }}
                      >
                        {inits}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          <p className="text-white text-sm font-medium leading-tight">{rp.display_name}</p>
                          {isMe && (
                            <span className="text-[8px] tracking-[0.2em] uppercase text-[#5B3DF5]/60 border border-[#5B3DF5]/20 px-1.5 py-0.5">Vous</span>
                          )}
                          {!isMe && rp.connection_status === 'accepted' && (
                            <span className="text-[8px] tracking-[0.2em] uppercase text-green-400/70 border border-green-400/20 px-1.5 py-0.5">✓ Partner</span>
                          )}
                          {!isMe && rp.connection_status === 'pending_received' && (
                            <span className="text-[8px] tracking-[0.2em] uppercase text-amber-400/70 border border-amber-400/20 px-1.5 py-0.5">Vous a contacté</span>
                          )}
                        </div>

                        {/* Tagline */}
                        {rp.tagline && (
                          <p className="text-white/30 text-xs leading-relaxed">{rp.tagline}</p>
                        )}

                        {/* Destinations */}
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
                          <p className="text-[10px] tracking-[0.2em] uppercase text-green-400/50 text-center py-1">
                            ✓ Connecté
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
                            {connecting === rp.slug ? '...' : '✓ Accepter la demande'}
                          </button>
                        ) : (
                          <button
                            onClick={() => sendRequest(rp.slug)}
                            disabled={connecting === rp.slug}
                            className="w-full py-2 text-[10px] tracking-[0.2em] uppercase bg-white/3 border border-white/8 text-white/40 hover:bg-[#5B3DF5]/10 hover:border-[#5B3DF5]/30 hover:text-white/70 transition-all disabled:opacity-40"
                          >
                            {connecting === rp.slug ? '...' : 'Request Introduction'}
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
