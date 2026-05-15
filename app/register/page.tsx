'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function RegisterPage() {
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-génère le slug depuis le nom
  useEffect(() => {
    if (!slugEdited && displayName) {
      setSlug(slugify(displayName))
    }
  }, [displayName, slugEdited])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!displayName.trim() || !email.trim() || !password.trim()) {
      setError('Merci de remplir tous les champs obligatoires.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      setError('Identifiant invalide — lettres minuscules, chiffres et tirets uniquement.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/rp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.trim(),
          password,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.')
        return
      }

      // Redirection directe vers le dashboard
      router.push(`/${slug}/dashboard`)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const inviteLink = slug ? `itinera.click/${slug}` : 'itinera.click/votre-nom'

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-6 py-16">

      {/* Logo */}
      <div className="text-center mb-12">
        <p className="text-[9px] tracking-[0.6em] text-[#F5F5F3]/20 uppercase mb-3">✦ ITINERA ✦</p>
        <h1 className="font-playfair text-3xl md:text-4xl text-[#F5F5F3] mb-2">
          Créez votre espace RP
        </h1>
        <p className="text-[#F5F5F3]/30 text-sm">
          Gratuit · Prêt en 60 secondes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">

        {/* Nom */}
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">
            Ton prénom & nom ou nom de l'agence *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Rémi Dupont"
            className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
            autoFocus
          />
        </div>

        {/* Lien d'invitation — affiché live */}
        <div className="bg-[#141414] border border-white/5 px-4 py-3.5">
          <p className="text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/25 mb-1.5">
            Lien d'invitation client
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[#F5F5F3]/20 text-sm">itinera.click/</span>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(slugify(e.target.value)); setSlugEdited(true) }}
              className="flex-1 bg-transparent text-[#5B3DF5] text-sm outline-none placeholder-[#5B3DF5]/30 border-b border-[#5B3DF5]/20 focus:border-[#5B3DF5]/50 transition-colors pb-0.5"
              placeholder="votre-nom"
            />
          </div>
          <p className="text-[9px] text-[#F5F5F3]/15 mt-2">
            Ce lien est partagé à vos clients pour accéder à votre espace
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">
            Email professionnel *
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="remi@email.com"
            className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
          />
          <p className="text-[9px] text-[#F5F5F3]/15 mt-1.5">
            Vous recevrez les notifications de réservation sur cet email
          </p>
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">
            WhatsApp <span className="text-[#F5F5F3]/15 normal-case tracking-normal">— optionnel</span>
          </label>
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
          />
        </div>

        {/* Mot de passe */}
        <div>
          <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">
            Mot de passe du dashboard *
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="6 caractères minimum"
            className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
          />
        </div>

        {/* Erreur */}
        {error && (
          <p className="text-red-400/70 text-xs text-center border border-red-500/15 bg-red-500/5 px-4 py-3">
            {error}
          </p>
        )}

        {/* CTA */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#5B3DF5] text-white text-[11px] tracking-[0.3em] uppercase hover:bg-[#4930cc] transition-colors disabled:opacity-40 mt-2"
        >
          {loading ? 'Création en cours...' : 'Créer mon espace'}
        </button>

        {/* Lien dashboard existant */}
        <p className="text-center text-[10px] text-[#F5F5F3]/20 pt-2">
          Déjà inscrit ?{' '}
          <Link href="/" className="text-[#F5F5F3]/40 hover:text-[#F5F5F3]/70 underline transition-colors">
            Accéder à mon dashboard
          </Link>
        </p>

      </form>
    </div>
  )
}
