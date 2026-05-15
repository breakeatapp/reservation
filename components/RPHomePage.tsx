'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import type { RPProfile } from '@/lib/supabase'
import type { Destination, Establishment } from '@/lib/data'

type Props = {
  profile: RPProfile
  destinations: Destination[]
  establishments: Establishment[]
}

export default function RPHomePage({ profile, destinations, establishments }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [connectedName, setConnectedName] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lire le nom du client connecté depuis localStorage
  useEffect(() => {
    const rpSlug = profile.slug
    const savedRp = localStorage.getItem('itinera_guest_rp')
    const savedName = localStorage.getItem('itinera_guest_name')
    const savedEmail = localStorage.getItem('itinera_guest_email')
    if (savedRp === rpSlug && (savedName || savedEmail)) {
      setConnectedName(savedName || savedEmail || '')
    }
  }, [profile.slug])

  const slug = profile.slug
  const accent = profile.accent_color || '#5B3DF5'

  const byDest = destinations.map(d => ({
    dest: d,
    venues: establishments.filter(e => e.destination === d.slug),
  })).filter(g => g.venues.length > 0)

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link href={`/${slug}`} className="group flex-shrink-0">
            <span className="text-[8px] tracking-[0.4em] text-[#F5F5F3]/25 uppercase block leading-none">
              Accès Privé
            </span>
            <span className="font-playfair text-lg text-[#F5F5F3] group-hover:opacity-80 transition-opacity">
              {profile.logo_text || profile.display_name}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href={`/${slug}/mon-espace`} className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase hover:text-[#F5F5F3] transition-colors"
              style={{ color: connectedName ? accent + 'cc' : undefined }}
            >
              {connectedName ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {connectedName.split(' ')[0]}
                </>
              ) : (
                <span className="text-[#F5F5F3]/50">Mon Compte</span>
              )}
            </Link>
          </div>

          {/* Mobile : bouton "Mon compte" toujours visible + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href={`/${slug}/mon-espace`}
              className="flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase border px-3 py-2 transition-colors"
              style={connectedName
                ? { borderColor: accent + '40', color: accent + 'cc' }
                : { borderColor: 'rgba(245,245,243,0.10)', color: 'rgba(245,245,243,0.60)' }
              }
            >
              {connectedName ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                  {connectedName.split(' ')[0]}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Mon compte
                </>
              )}
            </Link>
            <button className="text-[#F5F5F3]/50 p-2" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="w-5 space-y-1.5">
                <span className={`block h-px bg-[#F5F5F3]/50 transition-all origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-px bg-[#F5F5F3]/50 transition-opacity ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block h-px bg-[#F5F5F3]/50 transition-all origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Menu mobile déroulant */}
        {menuOpen && (
          <div className="md:hidden bg-[#111] border-t border-white/5 px-6 py-5 space-y-3">
            <Link href={`/${slug}/mon-espace`} className="flex items-center gap-3 text-[12px] tracking-[0.2em] uppercase text-[#F5F5F3]/70 py-2" onClick={() => setMenuOpen(false)}>
              <span>👤</span> Mon Compte
            </Link>
            <div className="pt-2">
              <Link href={`/${slug}/book`} className="block text-[11px] tracking-[0.2em] uppercase text-white py-3 text-center" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }} onClick={() => setMenuOpen(false)}>
                Faire une réservation unique
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {profile.cover_image ? (
            <Image src={profile.cover_image} alt={profile.display_name} fill className="object-cover opacity-25" priority />
          ) : (
            <Image
              src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90"
              alt="Luxury hospitality"
              fill
              className="object-cover opacity-20"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B]/70 via-[#0B0B0B]/30 to-[#0B0B0B]" />
        </div>

        <div className="relative z-10 text-center px-5 max-w-4xl mx-auto">
          {connectedName ? (
            <div className="inline-flex items-center gap-2 border border-white/10 px-4 py-2 mb-6 backdrop-blur-sm"
              style={{ background: accent + '12' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: accent + 'cc' }}>
                Bienvenue, {connectedName.split(' ')[0]} ✦
              </span>
            </div>
          ) : (
            <p className="text-[9px] tracking-[0.6em] text-[#F5F5F3]/25 uppercase mb-6">
              ✦ {profile.display_name} · Private Access ✦
            </p>
          )}
          <h1 className="font-playfair text-4xl md:text-7xl text-[#F5F5F3] mb-6 leading-tight">
            {profile.tagline}
          </h1>
          <p className="text-[#F5F5F3]/55 text-sm max-w-lg mx-auto mb-10 leading-relaxed">
            {destinations.length} destination{destinations.length > 1 ? 's' : ''} · {establishments.length} établissement{establishments.length > 1 ? 's' : ''} sélectionné{establishments.length > 1 ? 's' : ''}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href={`/${slug}/book`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white text-[11px] tracking-[0.3em] uppercase px-8 py-4 hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
            >
              Faire une réservation unique
            </Link>
            <Link
              href={`/${slug}/trip`}
              className="w-full sm:w-auto inline-flex items-center justify-center border border-white/25 text-[#F5F5F3]/70 text-[11px] tracking-[0.3em] uppercase px-8 py-4 hover:border-white/50 hover:text-[#F5F5F3] transition-all"
            >
              Planifier mon séjour
            </Link>
            <Link
              href={`/${slug}/mon-espace`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/12 text-[#F5F5F3]/45 text-[11px] tracking-[0.3em] uppercase px-8 py-4 hover:border-white/30 hover:text-[#F5F5F3]/70 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mon compte
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20">
          <div className="w-px h-10 bg-gradient-to-b from-[#F5F5F3] to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── DESTINATIONS ── */}
      <section id="destinations" className="py-20 px-5">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-14">
            <p className="text-[10px] tracking-[0.5em] text-[#F5F5F3]/40 uppercase mb-4">Sélection exclusive</p>
            <h2 className="font-playfair text-3xl md:text-5xl text-[#F5F5F3]">Vos destinations</h2>
          </div>

          {/* Grid destinations */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-16">
            {destinations.map(dest => (
              <Link
                key={dest.slug}
                href={`/${slug}/book?destination=${dest.slug}`}
                className="group relative overflow-hidden aspect-[4/3] block"
              >
                <Image src={dest.image} alt={dest.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/20 to-transparent" />
                <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/60 uppercase mb-1">
                    {dest.emoji} {dest.country}
                  </div>
                  <h3 className="font-playfair text-lg md:text-2xl text-[#F5F5F3] mb-0.5">{dest.name}</h3>
                  <p className="text-[#F5F5F3]/55 text-[10px]">
                    {establishments.filter(e => e.destination === dest.slug).length} établissement{establishments.filter(e => e.destination === dest.slug).length > 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Venues par destination */}
          {byDest.map(({ dest, venues }) => (
            <div key={dest.slug} className="mb-14">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[#F5F5F3]/20 text-lg">{dest.emoji}</span>
                <h3 className="font-playfair text-xl md:text-2xl text-[#F5F5F3]">{dest.name}</h3>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {venues.map(v => (
                  <Link
                    key={v.slug}
                    href={`/${slug}/book?venue=${encodeURIComponent(v.name)}`}
                    className="group bg-[#141414] border border-white/5 p-4 hover:border-white/10 transition-all hover:bg-[#1A1A1A]"
                  >
                    <div className="relative h-32 mb-3 overflow-hidden">
                      <Image src={v.image} alt={v.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-70" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent" />
                      <div className="absolute top-2 right-2">
                        <span className="text-[9px] tracking-wider text-[#F5F5F3]/40 bg-[#0B0B0B]/60 px-2 py-0.5 backdrop-blur-sm">
                          {v.type}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-playfair text-base text-[#F5F5F3] mb-1">{v.name}</h4>
                    <p className="text-[#F5F5F3]/55 text-xs leading-relaxed line-clamp-2">{v.shortDesc}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] tracking-wider text-[#F5F5F3]/45">{v.priceRange}</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/45 group-hover:text-[#F5F5F3]/80 transition-colors">
                        Réserver →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MON COMPTE CTA ── */}
      <section className="py-16 px-5 border-t border-white/5 bg-[#0E0E0E]">
        <div className="max-w-md mx-auto text-center">
          <div className="w-12 h-12 mx-auto mb-5 flex items-center justify-center border border-white/8"
            style={{ background: `${accent}12` }}>
            <svg className="w-5 h-5 text-[#F5F5F3]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-[9px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase mb-3">Espace personnel</p>
          <h2 className="font-playfair text-2xl text-[#F5F5F3] mb-3">Mon compte</h2>
          <p className="text-[#F5F5F3]/30 text-sm leading-relaxed mb-7">
            Suivez vos réservations, modifiez-les et planifiez votre prochain séjour depuis votre espace personnel.
          </p>
          <Link
            href={`/${slug}/mon-espace`}
            className="inline-flex items-center gap-2 border border-white/15 text-[#F5F5F3]/60 text-[11px] tracking-[0.25em] uppercase px-8 py-3.5 hover:border-white/30 hover:text-[#F5F5F3] transition-all"
          >
            Accéder à mon compte →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-5 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-playfair text-[#F5F5F3]/70">{profile.display_name}</p>
            <p className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/35 uppercase mt-1">Accès sur invitation · Traitement confidentiel</p>
          </div>
          <div className="flex items-center gap-5">
            <Link href={`/${slug}/book`} className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/45 hover:text-[#F5F5F3]/70 transition-colors">
              Réserver
            </Link>
            <Link href={`/${slug}/mon-espace`} className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/45 hover:text-[#F5F5F3]/70 transition-colors">
              Mon Compte
            </Link>
            {/* Lien discret dashboard RP — non visible par les clients */}
            <Link href={`/${slug}/dashboard`} className="text-[8px] tracking-[0.2em] uppercase text-[#F5F5F3]/8 hover:text-[#F5F5F3]/20 transition-colors">
              RP
            </Link>
          </div>
        </div>
      </footer>

      {/* ── BARRE DE NAVIGATION FIXE MOBILE ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0B]/98 backdrop-blur-md border-t border-white/8">
        <div className="grid grid-cols-3 h-16">
          <Link href={`/${slug}`} className="flex flex-col items-center justify-center gap-1 text-[#F5F5F3]/50 hover:text-[#F5F5F3]/80 transition-colors active:bg-white/3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[9px] tracking-wider uppercase">Accueil</span>
          </Link>

          <Link href={`/${slug}/book`} className="flex flex-col items-center justify-center gap-1 transition-colors active:bg-white/3" style={{ color: accent + 'ee' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[9px] tracking-wider uppercase">Réserver</span>
          </Link>

          <Link href={`/${slug}/mon-espace`} className="flex flex-col items-center justify-center gap-1 text-[#F5F5F3]/50 hover:text-[#F5F5F3]/80 transition-colors active:bg-white/3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[9px] tracking-wider uppercase">Mon compte</span>
          </Link>
        </div>
      </div>

      {/* Spacer pour la barre fixe mobile */}
      <div className="md:hidden h-16" />

    </div>
  )
}
