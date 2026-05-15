'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import type { Destination, Establishment } from '@/lib/data'

const schema = z.object({
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(8, 'Numéro requis'),
  establishment: z.string().min(1, 'Veuillez choisir un établissement'),
  date: z.string().min(1, 'Date requise'),
  time: z.string().min(1, 'Service requis'),
  guests: z.string().min(1, 'Nombre requis'),
  occasion: z.string().optional(),
  seating: z.string().optional(),
  specialRequests: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type Status = 'idle' | 'loading' | 'success' | 'error'
type AccessStep = 'check' | 'form' | 'denied'

type Props = {
  estOptions: { value: string; label: string }[]
  defaultVenue?: string
  defaultDestination?: string
  rpSlug: string
  rpProfile?: {
    display_name: string
    whatsapp?: string
    email?: string
    accent_color?: string
  }
  venueServices?: Record<string, string[]>
  destinations?: Destination[]
  establishments?: Establishment[]
}

const inputClass = `w-full bg-[#141414] border border-white/8 text-[#F5F5F3] placeholder-[#F5F5F3]/15 px-4 py-3.5 text-sm focus:border-white/30 outline-none transition-colors duration-200`
const labelClass = `block text-[9px] tracking-[0.3em] text-[#F5F5F3]/30 uppercase mb-2`
const errorClass = `text-red-400/60 text-[11px] mt-1`

const SERVICES = [
  { group: 'Restaurant', options: [
    { label: 'Premier service — Déjeuner (12h30)', value: 'Premier service — Déjeuner (12h30)' },
    { label: 'Deuxième service — Déjeuner (14h30)', value: 'Deuxième service — Déjeuner (14h30)' },
    { label: 'Premier service — Dîner (19h30)', value: 'Premier service — Dîner (19h30)' },
    { label: 'Deuxième service — Dîner (21h30)', value: 'Deuxième service — Dîner (21h30)' },
  ]},
  { group: 'Beach Club', options: [
    { label: 'Ouverture (11h00)', value: 'Beach Club — Ouverture (11h00)' },
    { label: 'Sunset (17h00)', value: 'Beach Club — Sunset (17h00)' },
  ]},
  { group: 'Club / Soirée', options: [
    { label: 'Entrée early (22h00)', value: 'Club — Entrée early (22h00)' },
    { label: 'Entrée late night (00h00)', value: 'Club — Entrée late night (00h00)' },
  ]},
  { group: 'Autre', options: [
    { label: 'Brunch (11h00)', value: 'Brunch (11h00)' },
    { label: 'Cocktails (18h00)', value: 'Cocktails (18h00)' },
  ]},
]

const OCCASIONS = ['Anniversaire', 'Romantique', 'Dîner d\'affaires', 'Célébration', 'Soirée VIP', 'Fête', 'Autre']
const SEATINGS = ['Terrasse', 'Table coucher de soleil', 'Premier rang', 'Table DJ', 'Vue mer', 'Privé / Semi-privé', 'Sans préférence']

export default function RPReservationForm({ estOptions, defaultVenue, defaultDestination, rpSlug, rpProfile, venueServices, destinations, establishments }: Props) {
  const accent = rpProfile?.accent_color || '#5B3DF5'

  // ── Sélecteur de ville ────────────────────────────────────
  const [selectedDest, setSelectedDest] = useState<string>(defaultDestination || '')

  // Options d'établissements filtrées par ville sélectionnée
  const filteredEstOptions = selectedDest && establishments
    ? establishments
        .filter(e => e.destination === selectedDest)
        .map(e => ({ value: e.name, label: e.name }))
    : estOptions
  const [accessStep, setAccessStep] = useState<AccessStep>('check')
  const [accessEmail, setAccessEmail] = useState('')
  const [accessEmailInput, setAccessEmailInput] = useState('')
  const [checkLoading, setCheckLoading] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { establishment: defaultVenue || '', guests: '2' },
  })

  // Créneaux actifs : personnalisés si configurés pour ce venue, sinon tous par défaut
  const watchedEst = watch('establishment')
  const activeServices: string[] | null =
    venueServices && watchedEst && venueServices[watchedEst]
      ? venueServices[watchedEst]
      : null

  useEffect(() => {
    if (defaultVenue) setValue('establishment', defaultVenue)
  }, [defaultVenue, setValue])

  // Auto-login : si le client est déjà connecté pour ce RP, passer directement au formulaire
  useEffect(() => {
    const savedEmail = localStorage.getItem('itinera_guest_email')
    const savedRp = localStorage.getItem('itinera_guest_rp')
    const savedName = localStorage.getItem('itinera_guest_name')
    if (savedEmail && savedRp === rpSlug) {
      setAccessEmail(savedEmail)
      setValue('email', savedEmail)
      if (savedName) {
        const parts = savedName.split(' ')
        setValue('firstName', parts[0] || '')
        setValue('lastName', parts.slice(1).join(' ') || '')
      }
      setAccessStep('form')
    }
  }, [rpSlug, setValue])

  // Quand email vérifié → pré-remplir le champ email du formulaire
  useEffect(() => {
    if (accessEmail) setValue('email', accessEmail)
  }, [accessEmail, setValue])

  // Réinitialiser le créneau quand l'établissement change
  useEffect(() => {
    setValue('time', '')
  }, [watchedEst, setValue])

  // Réinitialiser l'établissement et le créneau quand la ville change
  useEffect(() => {
    setValue('establishment', '')
    setValue('time', '')
  }, [selectedDest, setValue])

  // ── Vérification de l'accès ────────────────────────────────
  const handleCheckAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = accessEmailInput.trim()
    if (!trimmed) return
    setCheckLoading(true)
    try {
      const res = await fetch(
        `/api/client/check?email=${encodeURIComponent(trimmed)}&rp=${rpSlug}`
      )
      const data = await res.json()
      if (data.registered) {
        setAccessEmail(trimmed)
        setAccessStep('form')
      } else {
        setAccessEmail(trimmed)
        setAccessStep('denied')
      }
    } catch {
      setAccessEmail(trimmed)
      setAccessStep('denied')
    } finally {
      setCheckLoading(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    setStatus('loading')
    try {
      const res = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, rpSlug }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  // ── Écran : vérification email ────────────────────────────
  if (accessStep === 'check') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#141414] border border-white/5 p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-white/8"
              style={{ background: accent + '12' }}>
              <svg className="w-5 h-5 text-[#F5F5F3]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F5F3]/20 mb-2">Accès requis</p>
            <h2 className="font-playfair text-2xl text-[#F5F5F3] mb-2">Identifiez-vous</h2>
            <p className="text-[#F5F5F3]/25 text-sm leading-relaxed">
              Ce service est réservé aux clients inscrits. Entrez votre email pour continuer.
            </p>
          </div>

          <form onSubmit={handleCheckAccess} className="space-y-4">
            <div>
              <label className={labelClass}>Votre email</label>
              <input
                type="email"
                value={accessEmailInput}
                onChange={e => setAccessEmailInput(e.target.value)}
                className={inputClass}
                placeholder="votre@email.com"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={checkLoading}
              className="w-full text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
            >
              {checkLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Vérification...
                </span>
              ) : 'Accéder au formulaire →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Écran : accès refusé ──────────────────────────────────
  if (accessStep === 'denied') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#141414] border border-white/8 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center border border-white/10">
              <svg className="w-6 h-6 text-[#F5F5F3]/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F5F3]/20 mb-3">Accès réservé</p>
            <h2 className="font-playfair text-xl text-[#F5F5F3] mb-3">Service sur invitation</h2>
            <p className="text-[#F5F5F3]/30 text-sm leading-relaxed">
              <span className="text-[#F5F5F3]/50">{accessEmail}</span> n'est pas encore inscrit
              à notre service de conciergerie.
            </p>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[#F5F5F3]/20 text-center mb-4">
              Contactez votre concierge
            </p>
            {rpProfile?.whatsapp && (
              <a
                href={`https://wa.me/${rpProfile.whatsapp}?text=${encodeURIComponent(`Bonjour, je souhaite accéder au service de conciergerie. Mon email : ${accessEmail}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 border border-white/8 hover:border-white/20 p-4 transition-all group"
              >
                <span className="text-xl">💬</span>
                <div className="flex-1">
                  <p className="text-[#F5F5F3]/70 text-sm group-hover:text-[#F5F5F3] transition-colors">WhatsApp</p>
                  <p className="text-[#F5F5F3]/20 text-xs">Demander un accès</p>
                </div>
                <span className="text-[#F5F5F3]/15 group-hover:text-[#F5F5F3]/40">›</span>
              </a>
            )}
            {rpProfile?.email && (
              <a
                href={`mailto:${rpProfile.email}?subject=Demande%20d%27acc%C3%A8s&body=Bonjour%2C%20je%20souhaite%20acc%C3%A9der%20au%20service.%20Mon%20email%20%3A%20${accessEmail}`}
                className="flex items-center gap-3 border border-white/8 hover:border-white/20 p-4 transition-all group"
              >
                <span className="text-xl">✉️</span>
                <div className="flex-1">
                  <p className="text-[#F5F5F3]/70 text-sm group-hover:text-[#F5F5F3] transition-colors">Email</p>
                  <p className="text-[#F5F5F3]/20 text-xs">Demander un accès</p>
                </div>
                <span className="text-[#F5F5F3]/15 group-hover:text-[#F5F5F3]/40">›</span>
              </a>
            )}
          </div>

          <button
            onClick={() => { setAccessStep('check'); setAccessEmailInput('') }}
            className="w-full text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors py-2 text-center"
          >
            ← Essayer un autre email
          </button>
        </div>
      </div>
    )
  }

  // ── Écran : succès ────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
          <span className="text-white text-2xl">✦</span>
        </div>
        <h2 className="font-playfair text-3xl text-[#F5F5F3] mb-4">Demande envoyée</h2>
        <p className="text-[#F5F5F3]/40 leading-relaxed mb-2">Votre demande a bien été transmise.</p>
        <p className="text-[#F5F5F3]/30 text-sm mb-10">Confirmation sous 24h — Vérifiez votre email.</p>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setStatus('idle')}
            className="border border-white/10 text-[#F5F5F3]/40 text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:border-white/20 hover:text-[#F5F5F3]/60 transition-all"
          >
            Nouvelle demande
          </button>
          <Link href={`/${rpSlug}`}
            className="text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:opacity-90 transition-opacity"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
            Accueil
          </Link>
        </div>
      </div>
    )
  }

  // ── Formulaire complet ────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
      {/* Email vérifié — badge */}
      <div className="mb-4 flex items-center gap-2 justify-center">
        <span className="text-green-400 text-xs">✓</span>
        <span className="text-[#F5F5F3]/30 text-xs">{accessEmail}</span>
        <button
          type="button"
          onClick={() => setAccessStep('check')}
          className="text-[9px] tracking-wider text-[#F5F5F3]/15 hover:text-[#F5F5F3]/35 uppercase transition-colors ml-1"
        >
          changer
        </button>
      </div>

      <div className="bg-[#141414] border border-white/5 p-8 md:p-12 space-y-8">

        {/* 01 — Destination + Établissement */}
        <div>
          <p className="text-[9px] tracking-[0.4em] uppercase mb-5 flex items-center gap-3" style={{ color: accent + '50' }}>
            <span className="w-px h-3" style={{ background: accent + '30' }} />
            01 — Établissement
          </p>

          {/* Sélecteur de ville (si destinations disponibles) */}
          {destinations && destinations.length > 1 && (
            <div className="mb-4">
              <label className={labelClass}>Ville / Destination *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {destinations.map(dest => (
                  <button
                    key={dest.slug}
                    type="button"
                    onClick={() => setSelectedDest(dest.slug)}
                    className={`flex items-center gap-2 px-3 py-2.5 border text-left text-sm transition-all ${
                      selectedDest === dest.slug
                        ? 'border-current text-white'
                        : 'border-white/8 text-[#F5F5F3]/40 hover:border-white/20 hover:text-[#F5F5F3]/70'
                    }`}
                    style={selectedDest === dest.slug ? { borderColor: accent + '80', background: accent + '12', color: '#F5F5F3' } : {}}
                  >
                    <span>{dest.emoji}</span>
                    <span className="truncate text-[12px]">{dest.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className={labelClass}>
            {selectedDest ? 'Restaurant / Venue *' : 'Choisissez votre établissement *'}
          </label>
          <select {...register('establishment')} className={`${inputClass} cursor-pointer`}>
            <option value="" disabled className="bg-[#141414]">
              {selectedDest ? `Restaurants disponibles...` : 'Sélectionner...'}
            </option>
            {filteredEstOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#141414]">{opt.label}</option>
            ))}
          </select>
          {errors.establishment && <p className={errorClass}>{errors.establishment.message}</p>}
        </div>

        <div className="h-px bg-white/5" />

        {/* 02 — Date & Service */}
        <div>
          <p className="text-[9px] tracking-[0.4em] uppercase mb-5 flex items-center gap-3" style={{ color: accent + '50' }}>
            <span className="w-px h-3" style={{ background: accent + '30' }} />
            02 — Date & Service
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input type="date" {...register('date')} min={new Date().toISOString().split('T')[0]}
                className={`${inputClass} [color-scheme:dark]`} />
              {errors.date && <p className={errorClass}>{errors.date.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Service *</label>
              <select {...register('time')} className={`${inputClass} cursor-pointer`}>
                <option value="" disabled className="bg-[#141414]">Choisir...</option>
                {activeServices ? (
                  // Créneaux personnalisés pour cet établissement
                  activeServices.map(s => (
                    <option key={s} value={s} className="bg-[#141414]">{s}</option>
                  ))
                ) : (
                  // Tous les créneaux par défaut (groupés)
                  SERVICES.map(group => (
                    <optgroup key={group.group} label={`─ ${group.group}`}>
                      {group.options.map(s => (
                        <option key={s.value} value={s.value} className="bg-[#141414]">{s.label}</option>
                      ))}
                    </optgroup>
                  ))
                )}
              </select>
              {errors.time && <p className={errorClass}>{errors.time.message}</p>}
            </div>
          </div>
          <div>
            <label className={labelClass}>Nombre de personnes *</label>
            <select {...register('guests')} className={`${inputClass} cursor-pointer`}>
              <option value="" disabled className="bg-[#141414]">Sélectionner...</option>
              {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                <option key={n} value={n} className="bg-[#141414]">{n} personne{n > 1 ? 's' : ''}</option>
              ))}
              <option value="20+" className="bg-[#141414]">Plus de 20</option>
            </select>
            {errors.guests && <p className={errorClass}>{errors.guests.message}</p>}
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* 03 — Préférences */}
        <div>
          <p className="text-[9px] tracking-[0.4em] uppercase mb-5 flex items-center gap-3" style={{ color: accent + '50' }}>
            <span className="w-px h-3" style={{ background: accent + '30' }} />
            03 — Préférences
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Occasion</label>
              <select {...register('occasion')} className={`${inputClass} cursor-pointer`}>
                <option value="" className="bg-[#141414]">Aucune</option>
                {OCCASIONS.map(o => <option key={o} value={o} className="bg-[#141414]">{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Placement souhaité</label>
              <select {...register('seating')} className={`${inputClass} cursor-pointer`}>
                <option value="" className="bg-[#141414]">Sans préférence</option>
                {SEATINGS.map(s => <option key={s} value={s} className="bg-[#141414]">{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* 04 — Coordonnées */}
        <div>
          <p className="text-[9px] tracking-[0.4em] uppercase mb-5 flex items-center gap-3" style={{ color: accent + '50' }}>
            <span className="w-px h-3" style={{ background: accent + '30' }} />
            04 — Vos coordonnées
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Prénom *</label>
              <input type="text" placeholder="Jean" {...register('firstName')} className={inputClass} />
              {errors.firstName && <p className={errorClass}>{errors.firstName.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Nom *</label>
              <input type="text" placeholder="Dupont" {...register('lastName')} className={inputClass} />
              {errors.lastName && <p className={errorClass}>{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                {...register('email')}
                readOnly
                className={`${inputClass} opacity-50 cursor-not-allowed`}
              />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Téléphone *</label>
              <input type="tel" placeholder="+33 6 00 00 00 00" {...register('phone')} className={inputClass} />
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* 05 — Notes */}
        <div>
          <p className="text-[9px] tracking-[0.4em] uppercase mb-5 flex items-center gap-3" style={{ color: accent + '50' }}>
            <span className="w-px h-3" style={{ background: accent + '30' }} />
            05 — Notes
          </p>
          <textarea rows={2} placeholder="Informations complémentaires..."
            {...register('specialRequests')} className={`${inputClass} resize-none`} />
        </div>

        {status === 'error' && (
          <div className="border border-red-400/15 text-red-400/60 text-sm px-4 py-3">
            Une erreur est survenue. Veuillez réessayer.
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Envoi en cours...
            </span>
          ) : 'Envoyer ma demande'}
        </button>

        <p className="text-[#F5F5F3]/15 text-[10px] text-center leading-relaxed">
          Traitement confidentiel · Confirmation sous 24h
        </p>
      </div>
    </form>
  )
}
