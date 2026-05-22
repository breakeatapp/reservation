'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GroupRegisterPage() {
  const router = useRouter()
  const [groupName, setGroupName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!groupName.trim() || !email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.')
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
      const res = await fetch('/api/group/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: groupName, email, password }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('itinera_group_slug', data.slug)
        localStorage.setItem('itinera_group_name', data.group_name)
        router.push(`/group/${data.slug}`)
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
      <nav className="px-6 py-5 flex items-center justify-between">
        <div>
          <span className="text-[8px] tracking-[0.5em] text-[#F5F7FA]/20 uppercase block">Itinera</span>
          <span className="font-playfair text-lg text-[#F5F7FA] tracking-wide">ITINERA</span>
        </div>
        <button
          onClick={() => router.push('/group')}
          className="text-[#F5F7FA]/30 text-[10px] tracking-[0.2em] uppercase hover:text-[#F5F7FA]/60 transition-colors"
        >
          ← Connexion
        </button>
      </nav>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <p className="text-[9px] tracking-[0.5em] uppercase text-[#6E5BFF]/60 mb-2">Hospitality Group</p>
            <h1 className="font-playfair text-3xl text-[#F5F7FA] tracking-wide">Créer votre groupe</h1>
            <p className="text-[#F5F7FA]/30 text-xs mt-3 leading-relaxed">
              Gérez plusieurs établissements depuis un seul dashboard.
            </p>
          </div>

          <div className="bg-[#181C23] border border-white/8 p-7">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Nom du groupe *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="ex: Bagatelle Group, Costes..."
                  autoFocus
                  required
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[9px] tracking-[0.3em] uppercase text-[#F5F7FA]/40 mb-2">
                  Email du groupe *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@votregroupe.com"
                  required
                  className="w-full bg-[#0F1115] border border-white/10 text-[#F5F7FA] px-4 py-3 text-sm focus:border-[#6E5BFF]/40 outline-none placeholder-[#F5F7FA]/20 transition-colors"
                />
              </div>

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
                    confirmPassword && confirmPassword !== password ? 'border-red-500/40' : 'border-white/10'
                  }`}
                />
              </div>

              {error && <p className="text-red-400/70 text-xs leading-relaxed">{error}</p>}

              <button
                type="submit"
                disabled={loading || (!!confirmPassword && confirmPassword !== password)}
                className="w-full py-3.5 text-white text-[11px] tracking-[0.25em] uppercase bg-[#6E5BFF] hover:bg-[#5B3DF5] transition-colors disabled:opacity-40 mt-2"
              >
                {loading ? 'Création en cours...' : 'Créer mon groupe →'}
              </button>
            </form>
          </div>

          <p className="text-center text-[10px] text-[#F5F7FA]/20 mt-5">
            Déjà un compte ?{' '}
            <button onClick={() => router.push('/group')} className="text-[#6E5BFF]/60 hover:text-[#6E5BFF] underline transition-colors">
              Se connecter
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
