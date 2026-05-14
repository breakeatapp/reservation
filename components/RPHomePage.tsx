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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const slug = profile.slug
  const accent = profile.accent_color || '#5B3DF5'

  // Grouper les établissements par destination
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
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href={`/${slug}`} className="group">
            <span className="text-[9px] tracking-[0.4em] text-[#F5F5F3]/30 uppercase block leading-none">
              Accès Privé
            </span>
            <span className="font-playfair text-xl text-[#F5F5F3] group-hover:opacity-80 transition-opacity">
              {profile.logo_text || profile.display_name}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <Link href={`/${slug}#destinations`} className="text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
              Destinations
            </Link>
            <Link href={`/${slug}/trip`} className="text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
              Mon Voyage
            </Link>
            <Link href={`/${slug}/mon-espace`} className="text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
              Mon Espace
            </Link>
            <Link
              href={`/${slug}/book`}
              className="text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 transition-all duration-300 border text-[#F5F5F3] border-white/20 hover:border-white/50"
            >
              Réserver
            </Link>
          </div>

          <button className="md:hidden text-[#F5F5F3]/60" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-6 space-y-1.5">
              <span className={`block h-px bg-[#F5F5F3]/60 transition-all ${menuOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
              <span className={`block h-px bg-[#F5F5F3]/60 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-px bg-[#F5F5F3]/60 transition-all ${menuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
            </div>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#141414] border-t border-white/5 px-6 py-6 space-y-4">
            <Link href={`/${slug}#destinations`} className="block text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]/50" onClick={() => setMenuOpen(false)}>Destinations</Link>
            <Link href={`/${slug}/trip`} className="block text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]/50" onClick={() => setMenuOpen(false)}>Mon Voyage</Link>
            <Link href={`/${slug}/mon-espace`} className="block text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3]/50" onClick={() => setMenuOpen(false)}>Mon Espace</Link>
            <Link href={`/${slug}/book`} className="block text-[11px] tracking-[0.2em] uppercase text-[#F5F5F3] border border-white/20 px-5 py-3 text-center" onClick={() => setMenuOpen(false)}>Réserver</Link>
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

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-[9px] tracking-[0.6em] text-[#F5F5F3]/30 uppercase mb-6">
            ✦ Accès Privé · {profile.display_name} ✦
          </p>
          <h1 className="font-playfair text-5xl md:text-7xl text-[#F5F5F3] mb-6 leading-tight">
            {profile.tagline.split(' ').slice(0, 3).join(' ')}
            <span className="block italic text-[#F5F5F3]/60">
              {profile.tagline.split(' ').slice(3).join(' ')}
            </span>
          </h1>
          <p className="text-[#F5F5F3]/40 text-base max-w-lg mx-auto mb-10 leading-relaxed">
            {destinations.length} destination{destinations.length > 1 ? 's' : ''} · {establishments.length} établissement{establishments.length > 1 ? 's' : ''} sélectionné{establishments.length > 1 ? 's' : ''}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${slug}/trip`}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase px-10 py-4 hover:opacity-90 transition-opacity"
            >
              Planifier mon séjour
            </Link>
            <Link
              href={`/${slug}/book`}
              className="inline-flex items-center justify-center border border-white/20 text-[#F5F5F3]/70 text-[11px] tracking-[0.3em] uppercase px-10 py-4 hover:border-white/40 hover:text-[#F5F5F3] transition-all"
            >
              Réservation unique
            </Link>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20">
          <div className="w-px h-10 bg-gradient-to-b from-[#F5F5F3] to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── DESTINATIONS ── */}
      <section id="destinations" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-[9px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase mb-4">Sélection exclusive</p>
            <h2 className="font-playfair text-4xl md:text-5xl text-[#F5F5F3]">
              Vos destinations
            </h2>
          </div>

          {/* Grid destinations */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
            {destinations.map(dest => (
              <Link
                key={dest.slug}
                href={`/${slug}/book?destination=${dest.slug}`}
                className="group relative overflow-hidden aspect-[4/3] block"
              >
                <Image src={dest.image} alt={dest.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/30 to-transparent" />
                <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/40 uppercase mb-1">
                    {dest.emoji} {dest.country}
                  </div>
                  <h3 className="font-playfair text-2xl text-[#F5F5F3] mb-1">{dest.name}</h3>
                  <p className="text-[#F5F5F3]/40 text-xs">
                    {establishments.filter(e => e.destination === dest.slug).length} établissement{establishments.filter(e => e.destination === dest.slug).length > 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Venues par destination */}
          {byDest.map(({ dest, venues }) => (
            <div key={dest.slug} className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-[#F5F5F3]/20 text-lg">{dest.emoji}</span>
                <h3 className="font-playfair text-2xl text-[#F5F5F3]">{dest.name}</h3>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {venues.map(v => (
                  <Link
                    key={v.slug}
                    href={`/${slug}/book?venue=${encodeURIComponent(v.name)}`}
                    className="group bg-[#141414] border border-white/5 p-5 hover:border-white/10 transition-all hover:bg-[#1A1A1A]"
                  >
                    <div className="relative h-36 mb-4 overflow-hidden">
                      <Image src={v.image} alt={v.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-70" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span className="text-[9px] tracking-wider text-[#F5F5F3]/40 bg-[#0B0B0B]/60 px-2 py-0.5 backdrop-blur-sm">
                          {v.type}
                        </span>
                      </div>
                    </div>
                    <h4 className="font-playfair text-lg text-[#F5F5F3] mb-1">{v.name}</h4>
                    <p className="text-[#F5F5F3]/30 text-xs leading-relaxed line-clamp-2">{v.shortDesc}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[9px] tracking-wider text-[#F5F5F3]/20">{v.priceRange}</span>
                      <span className="text-[10px] tracking-[0.2em] uppercase text-[#5B3DF5]/60 group-hover:text-[#8B5CF6] transition-colors">
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

      {/* ── TRIP PLANNER CTA ── */}
      <section className="py-20 px-6 bg-[#0F0F0F] border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[9px] tracking-[0.5em] text-[#5B3DF5]/40 uppercase mb-6">Planification complète</p>
          <h2 className="font-playfair text-4xl text-[#F5F5F3] mb-5 leading-tight">
            Planifiez votre voyage
            <span className="italic text-[#F5F5F3]/40 block">en quelques minutes</span>
          </h2>
          <p className="text-[#F5F5F3]/30 leading-relaxed mb-10 max-w-xl mx-auto">
            Composez votre itinéraire sur plusieurs jours — déjeuners, dîners, beach clubs, soirées.
            Nous gérons chaque réservation à votre place.
          </p>
          <Link
            href={`/${slug}/trip`}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase px-12 py-4 hover:opacity-90 transition-opacity"
          >
            Composer mon itinéraire
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-playfair text-[#F5F5F3]/40">{profile.display_name}</p>
            <p className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/20 uppercase mt-1">Accès sur invitation · Traitement confidentiel</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href={`/${slug}/book`} className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 transition-colors">
              Réserver
            </Link>
            <Link href={`/${slug}/trip`} className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 transition-colors">
              Mon Voyage
            </Link>
            <Link href={`/${slug}/mon-espace`} className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 transition-colors">
              Mon Espace
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
