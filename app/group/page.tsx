'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GroupLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/group/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('itinera_group_slug', data.slug)
        localStorage.setItem('itinera_group_name', data.group_name)
        router.push(`/group/${data.slug}`)
      } else {
        setError(data.error || 'Identifiants incorrects.')
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F5F7FA] flex flex-col">
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
          <div className="mb-10 text-center">
            <p className="text-[9px] tracking-[0.5em] uppercase text-[#6E5BFF]/60 mb-2">Hospitality Group</p>
            <h1 className="font-playfair text-3xl text-[#F5F7FA] tracking-wide">Group Access</h1>
            <p className="text-[#F5F7FA]/30 text-xs mt-3">
              Dashboard central de votre groupe.
            </p>
          </div>

          <div className="bg-[#181C23] border border-white/8 p-7">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Email du groupe
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@votregroupe.com"
                  autoFocus
                  required
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-white/25 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                />
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

              {error && <p className="text-red-400/70 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-white text-[11px] tracking-[0.25em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors disabled:opacity-40 mt-2"
              >
                {loading ? '...' : 'Accéder au dashboard →'}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-[#F5F7FA]/20 mb-1">Pas encore de compte ?</p>
            <button
              onClick={() => router.push('/group/register')}
              className="text-[10px] tracking-[0.2em] uppercase text-[#6E5BFF]/60 hover:text-[#6E5BFF] transition-colors underline underline-offset-2"
            >
              Créer mon groupe →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
