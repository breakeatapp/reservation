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

  // Choix initial GUEST / RP (null = écran de choix)
  const [userType, setUserType] = useState<'guest' | null>(null)

  // Formulaire code d'invitation
  const [showCodeForm, setShowCodeForm] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [codeError, setCodeError] = useState('')

  const extractSlugFromInvite = (value: string) => {
    const input = value.trim().toLowerCase()
    if (!input) return ''
    const cleaned = input
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(/[?#]/)[0]
      .replace(/^\/+/, '')
    const parts = cleaned.split('/').filter(Boolean)
    if (parts.length === 0) return cleaned
    const firstPartIsDomain = parts[0].includes('.')
    return firstPartIsDomain ? (parts[1] ?? '') : parts[0]
  }

  // Auto-redirect si session guest valide
  useEffect(() => {
    const savedEmail = localStorage.getItem('itinera_guest_email')
    const savedRp = localStorage.getItem('itinera_guest_rp')
    const savedName = localStorage.getItem('itinera_guest_name')
    const isValidSlug = savedRp && /^[a-z0-9-]+$/.test(savedRp)
    if (savedEmail && isValidSlug) {
      setSavedSession({ email: savedEmail, rp: savedRp!, name: savedName || savedEmail })
      router.replace(`/${savedRp}`)
    } else if (savedRp && !isValidSlug) {
      localStorage.removeItem('itinera_guest_rp')
      localStorage.removeItem('itinera_guest_email')
      localStorage.removeItem('itinera_guest_name')
    }
  }, [router])

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
        const rp = data.rps[0]
        localStorage.setItem('itinera_guest_email', trimmed)
        localStorage.setItem('itinera_guest_rp', rp.slug)
        localStorage.setItem('itinera_guest_rps', JSON.stringify(data.rps))
        if (data.firstName) localStorage.setItem('itinera_guest_name', data.firstName)
        router.push(`/${rp.slug}`)
      } else {
        setError('Email non reconnu. Vérifiez votre adresse ou contactez votre concierge.')
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
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

          {/* Headline */}
          <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#F5F7FA] mb-5 text-center leading-snug tracking-wide px-4">
            Private access to structured hospitality.
          </h1>

          {/* Sub */}
          <p className="text-[11px] tracking-[0.25em] uppercase leading-relaxed mb-12 max-w-xs mx-auto" style={{ color: '#6E5BFF' }}>
            From WhatsApp chaos to modern hospitality planning.
          </p>

          {/* ── Session active (guest connecté) ── */}
          {savedSession ? (
            <div className="bg-[#181C23]/90 backdrop-blur-sm border border-white/10 p-6 mb-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#6E5BFF]/80">Connecté</p>
              </div>
              <p className="text-[#F5F7FA]/70 text-sm mb-1 font-medium">{savedSession.name}</p>
              <p className="text-[#F5F7FA]/35 text-xs mb-5">{savedSession.email}</p>
              <button
                onClick={() => router.push(`/${savedSession.rp}/mon-espace`)}
                className="w-full py-3.5 text-white text-[11px] tracking-[0.2em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors mb-3"
              >
                Mon membership →
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
                      router.push(`/${rp.slug}/mon-espace`)
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

          ) : userType === 'guest' ? (
            /* ── Formulaire guest ── */
            <>
              <div className="bg-[#181C23]/90 backdrop-blur-sm border border-white/10 p-6 mb-4">
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#F5F7FA]/45 mb-4">
                  Accéder à mon membership
                </p>
                <form onSubmit={handleAccess} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus
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
                {error && <p className="text-red-400/70 text-xs mt-3 leading-relaxed">{error}</p>}
                <p className="text-[#F5F7FA]/35 text-[11px] mt-3">
                  Entrez l'email avec lequel votre concierge vous a invité
                </p>
              </div>

              {/* Lien d'invitation */}
              {showCodeForm ? (
                <div className="border border-[#6E5BFF]/30 bg-[#6E5BFF]/5 p-5">
                  <p className="text-[10px] tracking-[0.4em] uppercase text-[#6E5BFF]/70 mb-1">Rejoindre un RP</p>
                  <p className="text-[#F5F7FA]/30 text-[11px] mb-4">Collez le lien envoyé par votre concierge</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value)}
                      placeholder="https://itinera.click/votre-lien/mon-espace"
                      autoComplete="off"
                      autoFocus
                      className="flex-1 bg-[#0F1115] border border-white/12 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/50 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                    />
                    <button
                      onClick={() => {
                        const code = extractSlugFromInvite(inviteCode)
                        if (code) router.push(`/${code}/mon-espace`)
                      }}
                      className="px-5 py-3 text-white text-[11px] tracking-[0.2em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors flex-shrink-0"
                    >
                      →
                    </button>
                  </div>
                  {codeError && <p className="text-red-400/70 text-xs mt-3 leading-relaxed">{codeError}</p>}
                  <button
                    onClick={() => { setShowCodeForm(false); setCodeError(''); setInviteCode('') }}
                    className="text-[#F5F7FA]/25 text-[10px] hover:text-[#F5F7FA]/50 transition-colors mt-4 block"
                  >
                    ← Retour
                  </button>
                </div>
              ) : (
                <div className="border border-white/8 p-5 text-center">
                  <p className="text-[#F5F7FA]/40 text-xs leading-relaxed mb-3">
                    Accès sur invitation uniquement.<br />
                    <span className="text-[#F5F7FA]/55">Contactez votre concierge pour rejoindre le réseau.</span>
                  </p>
                  <button
                    onClick={() => setShowCodeForm(true)}
                    className="text-[#6E5BFF]/60 text-[10px] hover:text-[#6E5BFF] transition-colors underline"
                  >
                    Vous avez un lien d'invitation ?
                  </button>
                </div>
              )}

              <button
                onClick={() => { setUserType(null); setError('') }}
                className="text-[#F5F7FA]/25 text-[10px] hover:text-[#F5F7FA]/50 transition-colors mt-5 block mx-auto"
              >
                ← Retour
              </button>
            </>

          ) : (
            /* ── Choix initial GUEST / RP / HOST ── */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">

              {/* GUEST */}
              <button
                onClick={() => setUserType('guest')}
                className="group border border-white/10 hover:border-[#6E5BFF]/60 bg-[#181C23] hover:bg-[#6E5BFF]/8 p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center"
              >
                <span className="text-2xl opacity-50 group-hover:opacity-80 transition-opacity">👤</span>
                <div>
                  <span className="font-playfair text-xl text-[#F5F7FA] tracking-widest group-hover:text-white transition-colors block mb-1">
                    GUEST
                  </span>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#F5F7FA]/30 group-hover:text-[#F5F7FA]/50 transition-colors">
                    Book access to experiences
                  </span>
                </div>
                <span className="w-6 h-px bg-[#6E5BFF]/0 group-hover:bg-[#6E5BFF]/60 transition-all duration-300" />
              </button>

              {/* RP */}
              <button
                onClick={() => router.push('/register')}
                className="group border border-white/10 hover:border-[#6E5BFF]/60 bg-[#181C23] hover:bg-[#6E5BFF]/8 p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center"
              >
                <span className="text-2xl opacity-50 group-hover:opacity-80 transition-opacity">👥</span>
                <div>
                  <span className="font-playfair text-xl text-[#F5F7FA] tracking-widest group-hover:text-white transition-colors block mb-1">
                    RP
                  </span>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#F5F7FA]/30 group-hover:text-[#F5F7FA]/50 transition-colors">
                    Manage access for your guests
                  </span>
                </div>
                <span className="w-6 h-px bg-[#6E5BFF]/0 group-hover:bg-[#6E5BFF]/60 transition-all duration-300" />
              </button>

              {/* ITINERA HOST */}
              <button
                onClick={() => router.push('/host')}
                className="group border border-white/10 hover:border-[#6E5BFF]/60 bg-[#181C23] hover:bg-[#6E5BFF]/8 p-8 transition-all duration-300 flex flex-col items-center justify-center gap-4 text-center"
              >
                <span className="text-2xl opacity-50 group-hover:opacity-80 transition-opacity">🔔</span>
                <div>
                  <span className="font-playfair text-xl text-[#F5F7FA] tracking-widest group-hover:text-white transition-colors block mb-1">
                    HOST
                  </span>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#F5F7FA]/30 group-hover:text-[#F5F7FA]/50 transition-colors">
                    Manage reservations for your venue
                  </span>
                </div>
                <span className="w-6 h-px bg-[#6E5BFF]/0 group-hover:bg-[#6E5BFF]/60 transition-all duration-300" />
              </button>

            </div>
          )}

          {/* Sign in hint — shown only on selection screen */}
          {!userType && !savedSession && !rpPicker && (
            <p className="mt-8 text-[10px] tracking-[0.25em] uppercase text-[#F5F7FA]/25">
              Already have an account?{' '}
              <button
                onClick={() => setUserType('guest')}
                className="text-[#F5F7FA]/40 hover:text-[#F5F7FA]/70 transition-colors underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          )}

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-[#F5F7FA]/30 text-[10px] tracking-wider uppercase">
          ITINERA · Hospitality Planning Between RPs & Guests
        </p>
      </footer>

    </div>
  )
}
