'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedSession, setSavedSession] = useState<{ email: string; rp: string; name: string } | null>(null)
  const [rpPicker, setRpPicker] = useState<{ rps: { slug: string; displayName: string }[]; email: string; firstName: string } | null>(null)

  // Vérifier si le client est déjà connecté
  useEffect(() => {
    const savedEmail = localStorage.getItem('itinera_guest_email')
    const savedRp = localStorage.getItem('itinera_guest_rp')
    const savedName = localStorage.getItem('itinera_guest_name')
    if (savedEmail && savedRp) {
      setSavedSession({ email: savedEmail, rp: savedRp, name: savedName || savedEmail })
    }
  }, [])

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/client/rps?email=${encodeURIComponent(trimmed)}`)
      const data = await res.json()

      if (data.rps && data.rps.length >= 1) {
        // Sauvegarder tous les slugs RP pour le picker sur RPHomePage
        const rp = data.rps[0]
        localStorage.setItem('itinera_guest_email', trimmed)
        localStorage.setItem('itinera_guest_rp', rp.slug)
        localStorage.setItem('itinera_guest_rps', JSON.stringify(data.rps))
        if (data.firstName) localStorage.setItem('itinera_guest_name', data.firstName)
        router.push(`/${rp.slug}`)
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

        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">

          {/* Headline — big title centré, police uniforme */}
          <h1 className="font-playfair text-5xl md:text-6xl text-[#F5F7FA] mb-6 text-center leading-tight">
            Private access to the<br />
            Hospitality Planning<br />
            Between RPs &amp; Guests
          </h1>

          {/* Sub */}
          <p className="text-[#F5F7FA]/50 text-sm leading-relaxed mb-12 max-w-sm mx-auto">
            From WhatsApp chaos to structured hospitality management.
          </p>

          {/* ── Session active → Mon compte ── */}
          {savedSession ? (
            <div className="bg-[#181C23]/90 backdrop-blur-sm border border-white/10 p-6 mb-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#6E5BFF]/80">
                  Connecté
                </p>
              </div>
              <p className="text-[#F5F7FA]/70 text-sm mb-1 font-medium">{savedSession.name}</p>
              <p className="text-[#F5F7FA]/35 text-xs mb-5">{savedSession.email}</p>
              <button
                onClick={() => router.push(`/${savedSession.rp}`)}
                className="w-full py-3.5 text-white text-[11px] tracking-[0.2em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors mb-3"
              >
                Mon compte →
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('itinera_guest_email')
                  localStorage.removeItem('itinera_guest_name')
                  localStorage.removeItem('itinera_guest_rp')
                  setSavedSession(null)
                }}
                className="text-[#F5F7FA]/25 text-[10px] hover:text-[#F5F7FA]/50 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          ) : rpPicker ? (
            /* ── Sélecteur RP (plusieurs RPs) ── */
            <div className="bg-[#181C23]/90 backdrop-blur-sm border border-white/10 p-6">
              <p className="text-[10px] tracking-[0.4em] uppercase text-[#F5F7FA]/45 mb-1">
                Bienvenue{rpPicker.firstName ? `, ${rpPicker.firstName}` : ''}
              </p>
              <p className="text-[#F5F7FA]/60 text-sm mb-5">Avec quel RP souhaitez-vous accéder ?</p>
              <div className="space-y-2">
                {rpPicker.rps.map(rp => (
                  <button
                    key={rp.slug}
                    onClick={() => {
                      localStorage.setItem('itinera_guest_email', rpPicker.email)
                      localStorage.setItem('itinera_guest_rp', rp.slug)
                      if (rpPicker.firstName) localStorage.setItem('itinera_guest_name', rpPicker.firstName)
                      router.push(`/${rp.slug}`)
                    }}
                    className="w-full py-3.5 text-white text-[11px] tracking-[0.2em] uppercase bg-[#1E2229] border border-white/10 hover:border-[#6E5BFF]/50 hover:bg-[#6E5BFF]/10 transition-all text-left px-4"
                  >
                    {rp.displayName || rp.slug}
                    <span className="float-right text-[#F5F7FA]/30">→</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setRpPicker(null)}
                className="text-[#F5F7FA]/25 text-[10px] hover:text-[#F5F7FA]/50 transition-colors mt-4 block"
              >
                ← Retour
              </button>
            </div>
          ) : (
            <>
              {/* ── Accès guest ── */}
              <div className="bg-[#181C23]/90 backdrop-blur-sm border border-white/10 p-6 mb-4">
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#F5F7FA]/45 mb-4">
                  Accéder à mon espace
                </p>
                <form onSubmit={handleAccess} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-[#0F1115] border border-white/12 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/30 outline-none placeholder-[#F5F7FA]/30 transition-colors"
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
                  <p className="text-red-400/70 text-xs mt-3 leading-relaxed">{error}</p>
                )}
                <p className="text-[#F5F7FA]/35 text-[11px] mt-3">
                  Entrez l'email avec lequel votre RP vous a invité
                </p>
              </div>

              {/* Message nouveaux guests */}
              <div className="border border-white/8 p-5">
                <p className="text-[#F5F7FA]/40 text-xs leading-relaxed">
                  Accès sur invitation uniquement.<br />
                  <span className="text-[#F5F7FA]/55">Contactez votre RP pour rejoindre le réseau.</span>
                </p>
              </div>
            </>
          )}

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center space-y-3">
        <p className="text-[#F5F7FA]/30 text-[10px] tracking-wider uppercase">
          ITINERA · Hospitality Planning Between RPs & Guests
        </p>
        <p className="text-[#F5F7FA]/20 text-[10px]">
          Vous êtes un RP ?{' '}
          <a href="/register" className="text-[#6E5BFF]/60 hover:text-[#6E5BFF] underline transition-colors">
            Créez votre espace gratuitement →
          </a>
        </p>
      </footer>

    </div>
  )
}
