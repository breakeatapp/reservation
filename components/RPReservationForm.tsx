'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

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

type Props = {
  estOptions: { value: string; label: string }[]
  defaultVenue?: string
  rpSlug: string
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

export default function RPReservationForm({ estOptions, defaultVenue, rpSlug }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { establishment: defaultVenue || '', guests: '2' },
  })

  useEffect(() => {
    if (defaultVenue) setValue('establishment', defaultVenue)
  }, [defaultVenue, setValue])

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

  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl">✦</span>
        </div>
        <h2 className="font-playfair text-3xl text-[#F5F5F3] mb-4">Demande envoyée</h2>
        <p className="text-[#F5F5F3]/40 leading-relaxed mb-2">
          Votre demande a bien été transmise.
        </p>
        <p className="text-[#F5F5F3]/30 text-sm mb-10">
          Confirmation sous 24h — Vérifiez votre email.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#5B3DF5]/30 to-transparent mb-8" />
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setStatus('idle')}
            className="border border-white/10 text-[#F5F5F3]/40 text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:border-white/20 hover:text-[#F5F5F3]/60 transition-all"
          >
            Nouvelle demande
          </button>
          <Link href={`/${rpSlug}`} className="bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:opacity-90 transition-opacity">
            Accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
      <div className="bg-[#141414] border border-white/5 p-8 md:p-12 space-y-8">

        {/* 01 — Établissement */}
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/50 uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/30" />
            01 — Établissement
          </p>
          <label className={labelClass}>Choisissez votre établissement *</label>
          <select {...register('establishment')} className={`${inputClass} cursor-pointer`}>
            <option value="" disabled className="bg-[#141414]">Sélectionner...</option>
            {estOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#141414]">{opt.label}</option>
            ))}
          </select>
          {errors.establishment && <p className={errorClass}>{errors.establishment.message}</p>}
        </div>

        <div className="h-px bg-white/5" />

        {/* 02 — Date & Service */}
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/50 uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/30" />
            02 — Date & Service
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input
                type="date"
                {...register('date')}
                min={new Date().toISOString().split('T')[0]}
                className={`${inputClass} [color-scheme:dark]`}
              />
              {errors.date && <p className={errorClass}>{errors.date.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Service *</label>
              <select {...register('time')} className={`${inputClass} cursor-pointer`}>
                <option value="" disabled className="bg-[#141414]">Choisir...</option>
                {SERVICES.map(group => (
                  <optgroup key={group.group} label={`─ ${group.group}`}>
                    {group.options.map(s => (
                      <option key={s.value} value={s.value} className="bg-[#141414]">{s.label}</option>
                    ))}
                  </optgroup>
                ))}
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

        {/* 03 — Préférences (occasion + placement uniquement) */}
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/50 uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/30" />
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
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/50 uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/30" />
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
              <input type="email" placeholder="jean@email.com" {...register('email')} className={inputClass} />
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
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/50 uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/30" />
            05 — Notes
          </p>
          <textarea
            rows={2}
            placeholder="Informations complémentaires..."
            {...register('specialRequests')}
            className={`${inputClass} resize-none`}
          />
        </div>

        {status === 'error' && (
          <div className="border border-red-400/15 text-red-400/60 text-sm px-4 py-3">
            Une erreur est survenue. Veuillez réessayer.
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
