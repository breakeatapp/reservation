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
        // Rediriger vers l'espace du premier RP
        router.push(`/${data.rps[0].slug}/mon-espace`)
      } else {
        setError('Aucun espace trouvé pour cet email. Contactez votre concierge.')
      }
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase block">Accès Privé</span>
          <span className="font-playfair text-lg text-[#F5F5F3]">Élite Reservations</span>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-5">
        {/* Fond */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90"
            alt="Luxury hospitality"
            fill
            className="object-cover opacity-15"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B]/80 via-[#0B0B0B]/50 to-[#0B0B0B]" />
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto text-center">

          <p className="text-[9px] tracking-[0.6em] text-[#F5F5F3]/20 uppercase mb-6">
            ✦ Conciergerie Privée ✦
          </p>

          <h1 className="font-playfair text-4xl md:text-6xl text-[#F5F5F3] mb-4 leading-tight">
            Des expériences
            <span className="block italic text-[#F5F5F3]/40">d'exception</span>
          </h1>

          <p className="text-[#F5F5F3]/30 text-sm leading-relaxed mb-12 max-w-sm mx-auto">
            Service de réservation privé. Accès sur invitation uniquement.
          </p>

          {/* ── Accès client ── */}
          <div className="bg-[#111]/80 backdrop-blur-sm border border-white/8 p-6 mb-4">
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F5F3]/25 mb-4">
              Accéder à mon espace
            </p>
            <form onSubmit={handleAccess} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="flex-1 bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F5F3]/15"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 text-white text-[11px] tracking-[0.2em] uppercase bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] hover:opacity-90 transition-opacity disabled:opacity-40 flex-shrink-0"
              >
                {loading ? '...' : '→'}
              </button>
            </form>
            {error && (
              <p className="text-[#F5F5F3]/30 text-xs mt-3 leading-relaxed">{error}</p>
            )}
            <p className="text-[#F5F5F3]/12 text-[10px] mt-3">
              Entrez l'email utilisé lors de votre inscription
            </p>
          </div>

          {/* Message pour les nouveaux */}
          <div className="border border-white/5 p-5">
            <p className="text-[#F5F5F3]/20 text-xs leading-relaxed">
              Vous n'avez pas encore accès ?<br />
              <span className="text-[#F5F5F3]/35">Ce service fonctionne sur invitation — contactez votre concierge attitré.</span>
            </p>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-[#F5F5F3]/10 text-[10px] tracking-wider uppercase">
          Élite Reservations · Service privé · Accès sur invitation
        </p>
      </footer>

    </div>
  )
}
