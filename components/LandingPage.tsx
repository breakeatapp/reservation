'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/client/rps?email=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.rps && data.rps.length > 0) {
        const rp = data.rps[0]
        localStorage.setItem('itinera_guest_email', trimmed)
        localStorage.setItem('itinera_guest_rp', rp.slug)
        if (data.firstName) localStorage.setItem('itinera_guest_name', data.firstName)
        router.push(`/${rp.slug}/mon-espace`)
      } else {
        setError('No access found. Check your email or contact your RP.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA]">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Private Access</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-5">
        {/* Fond cinématique */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90"
            alt="Private hospitality"
            fill
            className="object-cover opacity-10"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0F1115]/90 via-[#0F1115]/60 to-[#0F1115]" />
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto text-center">

          {/* Eyebrow */}
          <p className="text-[9px] tracking-[0.6em] text-[#F5F7FA]/20 uppercase mb-8">
            ✦ Hospitality Planning Between RPs & Guests ✦
          </p>

          {/* Headline */}
          <h1 className="font-playfair text-4xl md:text-5xl text-[#F5F7FA] mb-4 leading-tight">
            Private access to the
            <span className="block italic text-[#F5F7FA]/35">world's most requested venues.</span>
          </h1>

          {/* Sub */}
          <p className="text-[#F5F7FA]/30 text-sm leading-relaxed mb-12 max-w-sm mx-auto">
            From WhatsApp chaos to structured hospitality management.
          </p>

          {/* ── Accès guest ── */}
          <div className="bg-[#181C23]/90 backdrop-blur-sm border border-white/6 p-6 mb-4">
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F7FA]/25 mb-4">
              Access my space
            </p>
            <form onSubmit={handleAccess} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 bg-[#0F1115] border border-white/8 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/20 outline-none placeholder-[#F5F7FA]/15 transition-colors"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 text-white text-[11px] tracking-[0.2em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors disabled:opacity-40 flex-shrink-0"
              >
                {loading ? '...' : '→'}
              </button>
            </form>
            {error && (
              <p className="text-[#F5F7FA]/30 text-xs mt-3 leading-relaxed">{error}</p>
            )}
            <p className="text-[#F5F7FA]/12 text-[10px] mt-3">
              Enter the email used when your RP invited you
            </p>
          </div>

          {/* Message nouveaux guests */}
          <div className="border border-white/5 p-5">
            <p className="text-[#F5F7FA]/20 text-xs leading-relaxed">
              Access is by invitation only.<br />
              <span className="text-[#F5F7FA]/35">Contact your RP to request access to the network.</span>
            </p>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-[#F5F7FA]/10 text-[10px] tracking-wider uppercase">
          ITINERA · Hospitality Planning Between RPs & Guests
        </p>
      </footer>

    </div>
  )
}
