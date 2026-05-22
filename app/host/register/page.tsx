'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DESTINATIONS = [
  { slug: 'abu-dhabi', name: 'Abu Dhabi', country: 'Émirats Arabes Unis' },
  { slug: 'aspen', name: 'Aspen', country: 'États-Unis' },
  { slug: 'cannes', name: 'Cannes', country: 'France' },
  { slug: 'cavalaire', name: 'Cavalaire-sur-Mer', country: 'France' },
  { slug: 'courchevel', name: 'Courchevel', country: 'France' },
  { slug: 'dubai', name: 'Dubai', country: 'Émirats Arabes Unis' },
  { slug: 'ibiza', name: 'Ibiza', country: 'Espagne' },
  { slug: 'jeddah', name: 'Jeddah', country: 'Arabie Saoudite' },
  { slug: 'maldives', name: 'Maldives', country: 'Maldives' },
  { slug: 'miami', name: 'Miami', country: 'États-Unis' },
  { slug: 'milan', name: 'Milan', country: 'Italie' },
  { slug: 'monaco', name: 'Monaco', country: 'Monaco' },
  { slug: 'mykonos', name: 'Mykonos', country: 'Grèce' },
  { slug: 'rome', name: 'Rome', country: 'Italie' },
  { slug: 'saint-barth', name: 'Saint-Barthélemy', country: 'France' },
  { slug: 'saint-tropez', name: 'Saint-Tropez', country: 'France' },
  { slug: 'tulum', name: 'Tulum', country: 'Mexique' },
]


export default function HostRegisterPage() {
  const router = useRouter()

  const [venueName, setVenueName] = useState('')
  const [destination, setDestination] = useState('')
  const [category, setCategory] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!venueName.trim() || !destination || !password) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/host/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue_name: venueName, destination, category, email, password }),
      })
      const data = await res.json()

      if (data.success) {
        // Auto-login after registration
        localStorage.setItem('itinera_host_slug', data.slug)
        localStorage.setItem('itinera_host_name', data.venueName)
        if (data.destination) localStorage.setItem('itinera_host_destination', data.destination)
        router.push(`/host/${data.slug}`)
      } else {
        setError(data.error || 'Une erreur est survenue.')
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA] flex flex-col">

      {/* Navbar */}
      <nav className="px-6 py-5 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Itinera Venues</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
        </div>
        <button
          onClick={() => router.push('/host')}
          className="text-[#F5F7FA]/30 text-[10px] tracking-[0.2em] uppercase hover:text-[#F5F7FA]/60 transition-colors"
        >
          ← Connexion
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="mb-8 text-center">
            <p className="text-[9px] tracking-[0.5em] uppercase text-[#6E5BFF]/60 mb-2">Itinera Venues</p>
            <h1 className="font-playfair text-3xl text-[#F5F7FA] tracking-wide">Créer votre accès</h1>
            <p className="text-[#F5F7FA]/30 text-xs mt-3 leading-relaxed">
              Gérez vos réservations et confirmez les demandes<br />de vos partenaires concierges.
            </p>
          </div>

          <div className="bg-[#181C23] border border-white/8 p-7">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Venue name */}
              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={e => setVenueName(e.target.value)}
                  placeholder="ex: Nobu, Le Club 55, Pacha..."
                  autoFocus
                  required
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Ville *
                </label>
                <select
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  required
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none transition-colors cursor-pointer"
                >
                  <option value="" className="bg-[#0F1115]">Sélectionner une ville...</option>
                  {DESTINATIONS.map(d => (
                    <option key={d.slug} value={d.slug} className="bg-[#0F1115]">
                      {d.name} — {d.country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Type d'établissement <span className="text-[#F5F7FA]/20 normal-case tracking-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="ex: Restaurant, Beach Club, Night Club..."
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Email <span className="text-[#F5F7FA]/20 normal-case tracking-normal">(optionnel)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@votre-restaurant.com"
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  autoComplete="new-password"
                  required
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  className={`w-full bg-[#0F1115] border text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500/40'
                      : 'border-white/10'
                  }`}
                />
              </div>

              {error && (
                <p className="text-red-400/70 text-xs leading-relaxed">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || (!!confirmPassword && confirmPassword !== password)}
                className="w-full py-3.5 text-white text-[11px] tracking-[0.25em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors disabled:opacity-40 mt-2"
              >
                {loading ? 'Création en cours...' : 'Créer mon accès →'}
              </button>

            </form>
          </div>

          <p className="text-center text-[10px] text-[#F5F7FA]/20 mt-5 leading-relaxed">
            En créant un compte, votre établissement sera visible<br />
            des concierges partenaires ITINERA.
          </p>

        </div>
      </main>
    </div>
  )
}
