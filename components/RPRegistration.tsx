'use client'

import { useState } from 'react'
import Link from 'next/link'

const ALL_DESTINATIONS = [
  { slug: 'saint-tropez', name: 'Saint-Tropez', emoji: '⛵' },
  { slug: 'dubai', name: 'Dubai', emoji: '🏙️' },
  { slug: 'miami', name: 'Miami', emoji: '🌴' },
  { slug: 'cannes', name: 'Cannes', emoji: '🎬' },
  { slug: 'monaco', name: 'Monaco', emoji: '🎰' },
  { slug: 'courchevel', name: 'Courchevel', emoji: '⛷️' },
  { slug: 'saint-barth', name: 'Saint-Barth', emoji: '🏝️' },
]

// Tous les établissements groupés par destination
const VENUES_BY_DEST: Record<string, { name: string; type: string }[]> = {
  'saint-tropez': [
    { name: 'Club 55', type: 'Beach Club' },
    { name: 'Nikki Beach', type: 'Beach Club' },
    { name: 'VIP Room', type: 'Nightclub' },
  ],
  'dubai': [
    { name: 'Nobu Dubai', type: 'Restaurant' },
    { name: 'Cé La Vi', type: 'Rooftop' },
    { name: 'Zuma Dubai', type: 'Restaurant' },
  ],
  'miami': [
    { name: 'Swan Miami', type: 'Restaurant' },
    { name: 'Mynt Lounge', type: 'Nightclub' },
  ],
  'cannes': [
    { name: 'La Palme d\'Or', type: 'Restaurant' },
    { name: 'Baoli', type: 'Lounge' },
  ],
  'monaco': [
    { name: 'Joël Robuchon Monte-Carlo', type: 'Restaurant' },
    { name: 'Sass Café', type: 'Lounge' },
  ],
  'courchevel': [
    { name: 'Le 1947', type: 'Restaurant' },
    { name: 'Le Cap Horn', type: 'Restaurant' },
  ],
  'saint-barth': [
    { name: 'Le Barthélemy', type: 'Restaurant' },
    { name: 'Wall House', type: 'Restaurant' },
  ],
}

const ACCENT_COLORS = [
  { value: '#5B3DF5', label: 'Violet' },
  { value: '#C9A84C', label: 'Or' },
  { value: '#0EA5E9', label: 'Bleu' },
  { value: '#10B981', label: 'Émeraude' },
  { value: '#F43F5E', label: 'Rouge' },
  { value: '#F97316', label: 'Orange' },
]

type Step = 'identity' | 'branding' | 'destinations' | 'success'

export default function RPRegistration({ inviteCode }: { inviteCode: string }) {
  const [step, setStep] = useState<Step>('identity')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Le code vient directement de l'URL — pas besoin de le ressaisir
  const [code] = useState(inviteCode)
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [tagline, setTagline] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [logoText, setLogoText] = useState('')
  const [accentColor, setAccentColor] = useState('#5B3DF5')
  const [selectedDests, setSelectedDests] = useState<string[]>([])
  // venues sélectionnées par destination : {} = toutes cochées par défaut
  const [selectedVenues, setSelectedVenues] = useState<Record<string, string[]>>({})

  const handleSlugChange = (val: string) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-'))
  }

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val)
    if (!logoText) {
      setLogoText(val.substring(0, 8).toUpperCase())
    }
  }

  const toggleDest = (destSlug: string) => {
    setSelectedDests(prev => {
      if (prev.includes(destSlug)) {
        // Décocher → retirer aussi les venues de cette destination
        setSelectedVenues(v => { const next = { ...v }; delete next[destSlug]; return next })
        return prev.filter(x => x !== destSlug)
      } else {
        // Cocher → toutes les venues cochées par défaut (tableau vide = toutes)
        return [...prev, destSlug]
      }
    })
  }

  const toggleVenue = (destSlug: string, venueName: string) => {
    const allVenues = VENUES_BY_DEST[destSlug]?.map(v => v.name) ?? []
    setSelectedVenues(prev => {
      // Si pas encore de sélection spécifique → elles étaient toutes sélectionnées
      const current = prev[destSlug] ?? allVenues
      const next = current.includes(venueName)
        ? current.filter(v => v !== venueName)
        : [...current, venueName]
      return { ...prev, [destSlug]: next }
    })
  }

  const isVenueSelected = (destSlug: string, venueName: string): boolean => {
    // Si pas de sélection spécifique → toutes sont sélectionnées
    if (!(destSlug in selectedVenues)) return true
    return selectedVenues[destSlug].includes(venueName)
  }

  const selectAllVenues = (destSlug: string) => {
    setSelectedVenues(prev => { const next = { ...prev }; delete next[destSlug]; return next })
  }

  // Calcule la liste finale des venues activées pour l'API
  // Si toutes les venues d'une dest sont sélectionnées → on n'en liste aucune (= toutes par défaut)
  const computeActivatedVenues = (): string[] => {
    const result: string[] = []
    for (const destSlug of selectedDests) {
      const allVenues = VENUES_BY_DEST[destSlug]?.map(v => v.name) ?? []
      const chosen = selectedVenues[destSlug] ?? allVenues
      // Si c'est une sélection partielle, on ajoute les venues choisies
      if (chosen.length < allVenues.length) {
        result.push(...chosen)
      }
      // Si toutes sont choisies → on n'ajoute rien (activated_venues vide = toutes)
    }
    return result
  }

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || !displayName || !email || !password) {
      setError('Tous les champs marqués * sont obligatoires.')
      return
    }
    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    setError('')
    setStep('branding')
  }

  const handleBrandingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('destinations')
  }

  const handleFinalSubmit = async () => {
    if (selectedDests.length === 0) {
      setError('Sélectionnez au moins une destination.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/rp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: code || inviteCode,
          slug,
          displayName,
          tagline: tagline || 'Votre accès privé aux meilleures tables',
          email,
          whatsapp,
          password,
          activatedDestinations: selectedDests,
          activatedVenues: computeActivatedVenues(),
          logoText: logoText || displayName.substring(0, 6).toUpperCase(),
          accentColor,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création du compte.')
        return
      }

      setStep('success')
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm focus:border-white/30 outline-none transition-colors placeholder-[#F5F5F3]/15'
  const labelClass = 'block text-[9px] tracking-[0.3em] text-[#F5F5F3]/30 uppercase mb-2'

  const STEPS = ['identity', 'branding', 'destinations']
  const stepIndex = STEPS.indexOf(step)

  // ── SUCCÈS ───────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] flex items-center justify-center mx-auto mb-8">
            <span className="text-white text-3xl">✦</span>
          </div>
          <p className="text-[10px] tracking-[0.5em] text-[#5B3DF5]/50 uppercase mb-4">Compte créé</p>
          <h1 className="font-playfair text-4xl text-[#F5F5F3] mb-4">Bienvenue, {displayName}</h1>
          <p className="text-[#F5F5F3]/30 leading-relaxed mb-10">
            Votre espace privé est prêt. Partagez votre lien à vos clients.
          </p>

          <div className="bg-[#141414] border border-[#5B3DF5]/20 p-6 mb-8 text-left">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/50 uppercase mb-4">Vos accès</p>
            <div className="space-y-3">
              <div>
                <p className="text-[9px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1">Lien client</p>
                <p className="text-[#F5F5F3]/70 font-mono text-sm">/{slug}</p>
              </div>
              <div>
                <p className="text-[9px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1">Dashboard RP</p>
                <p className="text-[#F5F5F3]/70 font-mono text-sm">/{slug}/dashboard</p>
              </div>
              <div>
                <p className="text-[9px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1">Mot de passe</p>
                <p className="text-[#F5F5F3]/70 font-mono text-sm">{password}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href={`/${slug}/dashboard`}
              className="block w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 text-center hover:opacity-90 transition-opacity"
            >
              Accéder à mon dashboard →
            </Link>
            <Link
              href={`/${slug}`}
              className="block w-full border border-white/10 text-[#F5F5F3]/30 text-[11px] tracking-[0.2em] uppercase py-4 text-center hover:border-white/20 hover:text-[#F5F5F3]/50 transition-colors"
            >
              Voir ma page client
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.5em] text-[#5B3DF5]/50 uppercase mb-3">Accès sur invitation</p>
          <h1 className="font-playfair text-3xl text-[#F5F5F3] mb-2">Créer mon espace RP</h1>
          <p className="text-[#F5F5F3]/25 text-sm">
            Plateforme privée · Accès réservé aux partenaires
          </p>
        </div>

        {/* Progress */}
        {(
          <div className="flex items-center gap-0 mb-8">
            {['Identité', 'Branding', 'Destinations'].map((label, i) => {
              const idx = i
              const isDone = stepIndex > idx
              const isActive = stepIndex === idx
              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border transition-all ${
                      isActive ? 'bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] border-transparent text-white' :
                      isDone ? 'bg-[#5B3DF5]/20 border-[#5B3DF5]/40 text-[#8B5CF6]' :
                      'bg-[#1A1A1A] border-white/10 text-[#F5F5F3]/20'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className={`text-[8px] tracking-widest uppercase mt-1 ${isActive ? 'text-[#8B5CF6]' : 'text-[#F5F5F3]/20'}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px mb-4 ${stepIndex > idx ? 'bg-[#5B3DF5]/30' : 'bg-white/5'}`} />}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div className="border border-red-400/20 bg-red-400/5 text-red-400/70 text-sm px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* ── ÉTAPE 1 : IDENTITÉ ── */}
        {step === 'identity' && (
          <form onSubmit={handleIdentitySubmit} className="bg-[#141414] border border-white/5 p-8 space-y-5">

            <div>
              <label className={labelClass}>Nom commercial * <span className="text-[#F5F5F3]/15 normal-case tracking-normal">(visible par vos clients)</span></label>
              <input
                type="text"
                value={displayName}
                onChange={e => handleDisplayNameChange(e.target.value)}
                className={inputClass}
                placeholder="Élite Reservations, Monaco Conciergerie..."
                autoFocus
              />
            </div>

            <div>
              <label className={labelClass}>
                Identifiant URL * <span className="text-[#F5F5F3]/15 normal-case tracking-normal">(votre lien : plateforme.com/<strong className="text-[#5B3DF5]/60">{slug || 'votre-id'}</strong>)</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                className={`${inputClass} font-mono`}
                placeholder="antoine, monaco-vip, sarah-ibiza..."
              />
              <p className="text-[9px] text-[#F5F5F3]/15 mt-1">Lettres minuscules, chiffres et tirets uniquement. Non modifiable après.</p>
            </div>

            <div>
              <label className={labelClass}>Accroche <span className="text-[#F5F5F3]/15 normal-case tracking-normal">(optionnel)</span></label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className={inputClass}
                placeholder="Votre accès privé aux meilleures tables"
              />
            </div>

            <div className="h-px bg-white/5" />

            <div>
              <label className={labelClass}>Votre email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder="vous@email.com"
              />
            </div>

            <div>
              <label className={labelClass}>WhatsApp <span className="text-[#F5F5F3]/15 normal-case tracking-normal">(format international : 33612345678)</span></label>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className={inputClass}
                placeholder="33612345678"
              />
            </div>

            <div className="h-px bg-white/5" />

            <div>
              <label className={labelClass}>Mot de passe dashboard *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Min. 6 caractères"
              />
            </div>

            <div>
              <label className={labelClass}>Confirmer le mot de passe *</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-3.5 hover:opacity-90 transition-opacity mt-2"
            >
              Continuer →
            </button>
          </form>
        )}

        {/* ── ÉTAPE 2 : BRANDING ── */}
        {step === 'branding' && (
          <form onSubmit={handleBrandingSubmit} className="bg-[#141414] border border-white/5 p-8 space-y-6">

            <div>
              <label className={labelClass}>Texte logo <span className="text-[#F5F5F3]/15 normal-case tracking-normal">(affiché dans la navbar)</span></label>
              <input
                type="text"
                value={logoText}
                onChange={e => setLogoText(e.target.value.toUpperCase())}
                className={`${inputClass} tracking-[0.3em] font-mono`}
                placeholder="ÉLITE"
                maxLength={12}
              />
            </div>

            <div>
              <label className={labelClass}>Couleur d'accentuation</label>
              <div className="grid grid-cols-6 gap-2 mt-1">
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setAccentColor(c.value)}
                    className={`h-10 rounded-sm transition-all border-2 ${
                      accentColor === c.value ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
              <p className="text-[9px] text-[#F5F5F3]/20 mt-2">
                Couleur sélectionnée : <span style={{ color: accentColor }}>{accentColor}</span>
              </p>
            </div>

            {/* Preview */}
            <div className="border border-white/5 p-4">
              <p className="text-[9px] tracking-wider text-[#F5F5F3]/20 uppercase mb-3">Aperçu navbar</p>
              <div className="bg-[#0B0B0B] px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[8px] tracking-[0.4em] text-[#F5F5F3]/20 uppercase">Accès Privé</p>
                  <p className="text-[#F5F5F3] font-medium" style={{ fontFamily: 'Georgia, serif' }}>
                    {logoText || displayName}
                  </p>
                </div>
                <div
                  className="text-white text-[10px] tracking-[0.2em] uppercase px-4 py-2 border"
                  style={{ borderColor: `${accentColor}40`, color: accentColor }}
                >
                  Réserver
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-3.5 hover:opacity-90 transition-opacity"
            >
              Continuer →
            </button>
            <button
              type="button"
              onClick={() => setStep('identity')}
              className="w-full text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 py-2 hover:text-[#F5F5F3]/40 transition-colors"
            >
              ← Retour
            </button>
          </form>
        )}

        {/* ── ÉTAPE 3 : DESTINATIONS + RESTAURANTS ── */}
        {step === 'destinations' && (
          <div className="space-y-4">

            <div className="bg-[#141414] border border-white/5 p-6">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/50 uppercase mb-1">Étape 3</p>
              <p className="text-[#F5F5F3]/60 text-sm leading-relaxed">
                Sélectionnez vos destinations, puis choisissez les établissements que vous proposez dans chacune.
              </p>
            </div>

            {/* Destinations */}
            <div className="grid grid-cols-2 gap-2">
              {ALL_DESTINATIONS.map(d => {
                const active = selectedDests.includes(d.slug)
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => toggleDest(d.slug)}
                    className={`flex items-center gap-2.5 p-3.5 border text-left transition-all ${
                      active
                        ? 'border-[#5B3DF5]/50 bg-[#5B3DF5]/10 text-[#F5F5F3]'
                        : 'border-white/5 bg-[#141414] text-[#F5F5F3]/40 hover:border-white/10 hover:text-[#F5F5F3]/60'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{d.emoji}</span>
                    <span className="text-sm">{d.name}</span>
                    {active && <span className="ml-auto text-[#8B5CF6] text-xs flex-shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>

            {/* Venues par destination sélectionnée */}
            {selectedDests.length > 0 && (
              <div className="space-y-3">
                <p className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/20 uppercase px-1">
                  Établissements disponibles par destination
                </p>

                {selectedDests.map(destSlug => {
                  const dest = ALL_DESTINATIONS.find(d => d.slug === destSlug)!
                  const venues = VENUES_BY_DEST[destSlug] ?? []
                  const allSelected = !(destSlug in selectedVenues)
                  const selectedCount = allSelected ? venues.length : (selectedVenues[destSlug]?.length ?? 0)

                  return (
                    <div key={destSlug} className="bg-[#141414] border border-white/5">
                      {/* Header destination */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span>{dest.emoji}</span>
                          <span className="text-[#F5F5F3]/70 text-sm font-medium">{dest.name}</span>
                          <span className="text-[9px] text-[#F5F5F3]/20 tracking-wider">
                            {selectedCount}/{venues.length} établissement{venues.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        {!allSelected && (
                          <button
                            type="button"
                            onClick={() => selectAllVenues(destSlug)}
                            className="text-[9px] tracking-wider text-[#5B3DF5]/50 hover:text-[#8B5CF6] transition-colors uppercase"
                          >
                            Tout sélectionner
                          </button>
                        )}
                      </div>

                      {/* Liste des venues */}
                      <div className="p-3 space-y-1.5">
                        {venues.map(v => {
                          const checked = isVenueSelected(destSlug, v.name)
                          return (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => toggleVenue(destSlug, v.name)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all border ${
                                checked
                                  ? 'border-[#5B3DF5]/20 bg-[#5B3DF5]/5 text-[#F5F5F3]/80'
                                  : 'border-white/0 bg-transparent text-[#F5F5F3]/25 hover:border-white/5 hover:text-[#F5F5F3]/40'
                              }`}
                            >
                              {/* Checkbox custom */}
                              <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center transition-all ${
                                checked
                                  ? 'border-[#5B3DF5] bg-[#5B3DF5]'
                                  : 'border-white/15'
                              }`}>
                                {checked && (
                                  <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white">
                                    <path d="M1 4l2.5 2.5L9 1"/>
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm block">{v.name}</span>
                              </div>
                              <span className={`text-[9px] tracking-wider uppercase flex-shrink-0 ${
                                checked ? 'text-[#5B3DF5]/50' : 'text-[#F5F5F3]/15'
                              }`}>
                                {v.type}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {error && (
              <div className="border border-red-400/20 bg-red-400/5 text-red-400/70 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleFinalSubmit}
              disabled={submitting || selectedDests.length === 0}
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Création en cours...' : `Créer mon espace RP →`}
            </button>
            <button
              type="button"
              onClick={() => setStep('branding')}
              className="w-full text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 py-2 hover:text-[#F5F5F3]/40 transition-colors"
            >
              ← Retour
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
