'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) setError('Lien invalide. Recommencez la procédure.')
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Minimum 6 caractères.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/rp/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur.'); return }
      setSuccess(true)
      setTimeout(() => router.push('/register'), 3000)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-6 py-16">
      <div className="text-center mb-10">
        <p className="text-[9px] tracking-[0.6em] text-[#F5F5F3]/20 uppercase mb-3">✦ ITINERA ✦</p>
        <h1 className="font-playfair text-3xl text-[#F5F5F3] mb-2">Nouveau mot de passe</h1>
        <p className="text-[#F5F5F3]/30 text-sm">Choisissez un nouveau mot de passe pour votre dashboard</p>
      </div>

      {success ? (
        <div className="w-full max-w-md text-center border border-green-500/20 bg-green-500/5 p-8">
          <p className="text-green-400 text-sm mb-2">✓ Mot de passe mis à jour avec succès</p>
          <p className="text-[#F5F5F3]/30 text-xs">Redirection vers la connexion...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              autoComplete="new-password"
              className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
              className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
              required
            />
          </div>
          {error && (
            <p className="text-red-400/70 text-xs text-center border border-red-500/15 bg-red-500/5 px-4 py-3">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-4 bg-[#5B3DF5] text-white text-[11px] tracking-[0.3em] uppercase hover:bg-[#4930cc] transition-colors disabled:opacity-40"
          >
            {loading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe →'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
