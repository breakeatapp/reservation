'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-noir/95 backdrop-blur-sm border-b border-gold/20' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="group">
          <span className="text-[10px] tracking-[0.3em] text-gold/60 uppercase block leading-none group-hover:text-gold transition-colors">
            ✦ Private Access
          </span>
          <span className="font-playfair text-xl text-cream group-hover:text-gold transition-colors">
            ITINERA
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          <Link href="/#destinations" className="text-[11px] tracking-[0.2em] uppercase text-cream/60 hover:text-gold transition-colors">
            Destinations
          </Link>
          <Link href="/trip-planner" className="text-[11px] tracking-[0.2em] uppercase text-cream/60 hover:text-violet-light transition-colors">
            Mon Voyage
          </Link>
          <Link href="/reservation" className="text-[11px] tracking-[0.2em] uppercase bg-gold/10 border border-gold/40 text-gold hover:bg-gold hover:text-noir px-5 py-2.5 transition-all duration-300">
            Réserver
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-gold"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="w-6 space-y-1.5">
            <span className={`block h-px bg-gold transition-all ${menuOpen ? 'rotate-45 translate-y-2.5' : ''}`} />
            <span className={`block h-px bg-gold transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-px bg-gold transition-all ${menuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-noir-light border-t border-gold/20 px-6 py-6 space-y-4">
          <Link href="/#destinations" className="block text-[11px] tracking-[0.2em] uppercase text-cream/60 hover:text-gold" onClick={() => setMenuOpen(false)}>
            Destinations
          </Link>
          <Link href="/#concept" className="block text-[11px] tracking-[0.2em] uppercase text-cream/60 hover:text-gold" onClick={() => setMenuOpen(false)}>
            Notre Service
          </Link>
          <Link href="/trip-planner" className="block text-[11px] tracking-[0.2em] uppercase text-cream/60 hover:text-violet-light" onClick={() => setMenuOpen(false)}>
            Mon Voyage
          </Link>
          <Link href="/reservation" className="block text-[11px] tracking-[0.2em] uppercase text-gold border border-gold/40 px-5 py-3 text-center" onClick={() => setMenuOpen(false)}>
            Réserver
          </Link>
        </div>
      )}
    </nav>
  )
}
