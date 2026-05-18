'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DESTINATIONS = [
  { slug: 'saint-tropez', name: 'Saint-Tropez' },
  { slug: 'dubai', name: 'Dubai' },
  { slug: 'miami', name: 'Miami' },
  { slug: 'cannes', name: 'Cannes' },
  { slug: 'monaco', name: 'Monaco' },
  { slug: 'courchevel', name: 'Courchevel' },
  { slug: 'saint-barth', name: 'Saint-Barthélemy' },
  { slug: 'ibiza', name: 'Ibiza' },
  { slug: 'mykonos', name: 'Mykonos' },
  { slug: 'maldives', name: 'Maldives' },
  { slug: 'aspen', name: 'Aspen' },
  { slug: 'tulum', name: 'Tulum' },
  { slug: 'cavalaire', name: 'Cavalaire-sur-Mer' },
  { slug: 'milan', name: 'Milan' },
  { slug: 'rome', name: 'Rome' },
  { slug: 'abu-dhabi', name: 'Abu Dhabi' },
  { slug: 'jeddah', name: 'Jeddah' },
]

type View = 'login' | 'forgot'

export default function HostLoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')

  // Login state
  const [venueName, setVenueName] = useState('')
  const [destination, setDestination] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Forgot password state
  const [forgotVenueName, setForgotVenueName] = useState('')
  const [forgotDestination, setForgotDestination] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueName.trim() || !destination || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/host/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_name: venueName.trim(), destination, password }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('itinera_host_slug', data.slug)
        localStorage.setItem('itinera_host_name', data.venueName)
        if (data.destination) localStorage.setItem('itinera_host_destination', data.destination)
        router.push(`/host/${data.slug}`)
      } else {
        setError(data.error || 'Identifiants incorrects.')
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    if (!forgotVenueName.trim() || !forgotDestination || !newPassword) {
      setForgotError('Veuillez remplir tous les champs obligatoires.')
      return
    }
    if (newPassword.length < 6) {
      setForgotError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('Les mots de passe ne correspondent pas.')
      return
    }
    setForgotLoading(true)
    try {
      const res = await fetch('/api/host/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_name: forgotVenueName.trim(),
          destination: forgotDestination,
          email: forgotEmail.trim() || undefined,
          new_password: newPassword,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setForgotSuccess(true)
      } else {
        setForgotError(data.error || 'Établissement introuvable.')
      }
    } catch {
      setForgotError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA] flex flex-col">

      {/* Navbar */}
      <nav className="px-6 py-5 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Private Access</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
        </div>
        <button
          onClick={() => router.push('/')}
          className="text-[#F5F7FA]/30 text-[10px] tracking-[0.2em] uppercase hover:text-[#F5F7FA]/60 transition-colors"
        >
          ← Retour
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">

          {/* ── LOGIN ── */}
          {view === 'login' && (
            <>
              <div className="mb-10 text-center">
                <p className="text-[9px] tracking-[0.5em] uppercase text-[#6E5BFF]/60 mb-2">Itinera Venues</p>
                <h1 className="font-playfair text-3xl text-[#F5F7FA] tracking-wide">Venue Access</h1>
                <p className="text-[#F5F7FA]/30 text-xs mt-3">
                  Accédez à votre tableau de bord pour gérer vos réservations.
                </p>
              </div>

              <div className="bg-[#181C23] border border-white/8 p-7">
                <form onSubmit={handleLogin} className="space-y-4">

                  <div>
                    <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                      Nom de l'établissement
                    </label>
                    <input
                      type="text"
                      value={venueName}
                      onChange={e => setVenueName(e.target.value)}
                      placeholder="ex: La Ferme, Nobu, Le Club 55..."
                      autoFocus
                      required
                      className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                      Ville
                    </label>
                    <select
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                      required
                      className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0F1115]">Sélectionner une ville...</option>
                      {DESTINATIONS.map(d => (
                        <option key={d.slug} value={d.slug} className="bg-[#0F1115]">
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                    />
                  </div>

                  {error && (
                    <p className="text-red-400/70 text-xs leading-relaxed">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 text-white text-[11px] tracking-[0.25em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors disabled:opacity-40 mt-2"
                  >
                    {loading ? '...' : 'Accéder au dashboard →'}
                  </button>
                </form>
              </div>

              {/* Bottom links */}
              <div className="mt-6 text-center space-y-3">
                <button
                  onClick={() => setView('forgot')}
                  className="text-[10px] tracking-[0.15em] uppercase text-[#F5F7FA]/25 hover:text-[#F5F7FA]/50 transition-colors"
                >
                  Mot de passe oublié ?
                </button>
                <div className="border-t border-white/5 pt-3">
                  <p className="text-[10px] text-[#F5F7FA]/20 mb-1">Pas encore de compte ?</p>
                  <button
                    onClick={() => router.push('/host/register')}
                    className="text-[10px] tracking-[0.2em] uppercase text-[#6E5BFF]/60 hover:text-[#6E5BFF] transition-colors underline underline-offset-2"
                  >
                    Créer l'accès de mon établissement →
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── MOT DE PASSE OUBLIÉ ── */}
          {view === 'forgot' && (
            <>
              <div className="mb-8 text-center">
                <p className="text-[9px] tracking-[0.5em] uppercase text-[#6E5BFF]/60 mb-2">Itinera Venues</p>
                <h1 className="font-playfair text-2xl text-[#F5F7FA] tracking-wide">Réinitialiser</h1>
                <p className="text-[#F5F7FA]/30 text-xs mt-3 leading-relaxed">
                  Identifiez votre établissement pour changer votre mot de passe.
                </p>
              </div>

              <div className="bg-[#181C23] border border-white/8 p-7">
                {forgotSuccess ? (
                  <div className="text-center py-4">
                    <p className="text-emerald-400 text-sm mb-2">✓ Mot de passe mis à jour</p>
                    <p className="text-[#F5F7FA]/40 text-xs mb-5">Vous pouvez maintenant vous connecter.</p>
                    <button
                      onClick={() => { setView('login'); setForgotSuccess(false) }}
                      className="text-[10px] tracking-[0.2em] uppercase text-[#6E5BFF] hover:text-[#8B7FFF] transition-colors"
                    >
                      ← Se connecter
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4">

                    <div>
                      <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                        Nom de l'établissement *
                      </label>
                      <input
                        type="text"
                        value={forgotVenueName}
                        onChange={e => setForgotVenueName(e.target.value)}
                        placeholder="ex: La Ferme"
                        autoFocus
                        required
                        className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                        Ville *
                      </label>
                      <select
                        value={forgotDestination}
                        onChange={e => setForgotDestination(e.target.value)}
                        required
                        className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-[#0F1115]">Sélectionner...</option>
                        {DESTINATIONS.map(d => (
                          <option key={d.slug} value={d.slug} className="bg-[#0F1115]">{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                        Email <span className="normal-case tracking-normal text-[#F5F7FA]/20">(si renseigné lors de l'inscription)</span>
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="contact@restaurant.com"
                        className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                        Nouveau mot de passe *
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 caractères"
                        required
                        className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                        Confirmer le mot de passe *
                      </label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={`w-full bg-[#0F1115] border text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F7FA]/20 transition-colors ${
                          confirmNewPassword && confirmNewPassword !== newPassword ? 'border-red-500/40' : 'border-white/10'
                        }`}
                      />
                    </div>

                    {forgotError && (
                      <p className="text-red-400/70 text-xs leading-relaxed">{forgotError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading || (!!confirmNewPassword && confirmNewPassword !== newPassword)}
                      className="w-full py-3.5 text-white text-[11px] tracking-[0.25em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors disabled:opacity-40"
                    >
                      {forgotLoading ? '...' : 'Réinitialiser le mot de passe →'}
                    </button>
                  </form>
                )}
              </div>

              {!forgotSuccess && (
                <div className="mt-5 text-center">
                  <button
                    onClick={() => { setView('login'); setForgotError('') }}
                    className="text-[10px] tracking-[0.2em] uppercase text-[#F5F7FA]/25 hover:text-[#F5F7FA]/50 transition-colors"
                  >
                    ← Retour à la connexion
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}
