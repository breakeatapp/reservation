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
  time: z.string().min(1, 'Heure requise'),
  guests: z.string().min(1, 'Nombre requis'),
  occasion: z.string().optional(),
  seating: z.string().optional(),
  vipLevel: z.string().optional(),
  budgetLevel: z.string().optional(),
  specialRequests: z.string().optional(),
})

type FormData = z.infer<typeof schema>
type Status = 'idle' | 'loading' | 'success' | 'error'

type Props = {
  estOptions: { value: string; label: string }[]
  defaultLieu?: string
}

const inputClass = `w-full bg-[#1A1A1A] border border-white/10 text-[#F5F5F3] placeholder-[#F5F5F3]/20 px-4 py-3.5 text-sm focus:border-violet-light outline-none transition-colors duration-200`
const labelClass = `block text-[10px] tracking-[0.25em] text-[#F5F5F3]/40 uppercase mb-2`
const errorClass = `text-red-400/70 text-[11px] mt-1`

const SERVICES = [
  { label: '─── Restaurant / Table ───', value: '', disabled: true },
  { label: 'Premier service — Déjeuner (12h30)', value: 'Premier service — Déjeuner (12h30)' },
  { label: 'Deuxième service — Déjeuner (14h30)', value: 'Deuxième service — Déjeuner (14h30)' },
  { label: 'Premier service — Dîner (19h30)', value: 'Premier service — Dîner (19h30)' },
  { label: 'Deuxième service — Dîner (21h30)', value: 'Deuxième service — Dîner (21h30)' },
  { label: '─── Beach Club ───', value: '', disabled: true },
  { label: 'Journée — Ouverture (11h00)', value: 'Beach Club — Ouverture (11h00)' },
  { label: 'Sunset — Ambiance (17h00)', value: 'Beach Club — Sunset (17h00)' },
  { label: '─── Club / Soirée ───', value: '', disabled: true },
  { label: 'Entrée early (22h00)', value: 'Club — Entrée early (22h00)' },
  { label: 'Entrée late night (00h00)', value: 'Club — Entrée late night (00h00)' },
  { label: '─── Autre ───', value: '', disabled: true },
  { label: 'Brunch (11h00)', value: 'Brunch (11h00)' },
  { label: 'Cocktails (18h00)', value: 'Cocktails (18h00)' },
]

const OCCASIONS = ['Anniversaire', 'Dîner d\'affaires', 'Romantique', 'Célébration', 'Fête', 'Soirée VIP', 'Autre']
const SEATINGS = ['Terrasse', 'Table coucher de soleil', 'Premier rang', 'Table DJ', 'Vue mer', 'Privé / Semi-privé', 'Sans préférence']
const VIP_LEVELS = ['Standard', 'VIP', 'VVIP — Grand dépensier', 'Célébrité / Personnalité publique']
const BUDGETS = ['Standard', 'Élevé (500€+/pers.)', 'Premium (1000€+/pers.)', 'Ultra (Sans limite)']

export default function ReservationForm({ estOptions, defaultLieu }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { establishment: defaultLieu || '' },
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const firstName = localStorage.getItem('itinera_guest_name') || ''
    const lastName = localStorage.getItem('itinera_guest_lastname') || ''
    const email = localStorage.getItem('itinera_guest_email') || ''
    const phone = localStorage.getItem('itinera_guest_phone') || ''
    if (firstName) setValue('firstName', firstName)
    if (lastName) setValue('lastName', lastName)
    if (email) setValue('email', email)
    if (phone) setValue('phone', phone)
  }, [setValue])

  const onSubmit = async (data: FormData) => {
    setStatus('loading')
    try {
      const res = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
        <p className="text-[#F5F5F3]/50 leading-relaxed mb-8">
          Notre équipe prend en charge votre demande et vous contacte sous 24h pour confirmer votre réservation.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#5B3DF5]/40 to-transparent mb-8" />
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setStatus('idle')}
            className="border border-[#5B3DF5]/40 text-[#8B5CF6] text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:bg-[#5B3DF5]/10 transition-colors"
          >
            Nouvelle demande
          </button>
          <Link href="/" className="bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:opacity-90 transition-opacity">
            Accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto">
      <div className="bg-[#1A1A1A] border border-white/5 p-8 md:p-12 space-y-8">

        {/* 01 — Établissement */}
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/70" />
            01 — Établissement
          </p>
          <label className={labelClass}>Choisissez votre établissement *</label>
          <select {...register('establishment')} className={`${inputClass} cursor-pointer`}>
            <option value="" disabled className="bg-[#1A1A1A]">Sélectionner...</option>
            {estOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#1A1A1A]">{opt.label}</option>
            ))}
          </select>
          {errors.establishment && <p className={errorClass}>{errors.establishment.message}</p>}
        </div>

        <div className="h-px bg-white/5" />

        {/* 02 — Date & Heure */}
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/70" />
            02 — Date & Heure
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input type="date" {...register('date')} min={new Date().toISOString().split('T')[0]} className={`${inputClass} [color-scheme:dark]`} />
              {errors.date && <p className={errorClass}>{errors.date.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Service *</label>
              <select {...register('time')} className={`${inputClass} cursor-pointer`}>
                <option value="" disabled className="bg-[#1A1A1A]">Choisir un service...</option>
                {SERVICES.map((s, i) =>
                  s.disabled ? (
                    <option key={i} disabled className="bg-[#0B0B0B] text-[#F5F5F3]/30 text-[10px]">{s.label}</option>
                  ) : (
                    <option key={i} value={s.value} className="bg-[#1A1A1A]">{s.label}</option>
                  )
                )}
              </select>
              {errors.time && <p className={errorClass}>{errors.time.message}</p>}
            </div>
          </div>
          <div>
            <label className={labelClass}>Personnes *</label>
            <select {...register('guests')} className={`${inputClass} cursor-pointer`}>
              <option value="" disabled className="bg-[#1A1A1A]">Sélectionner...</option>
              {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                <option key={n} value={n} className="bg-[#1A1A1A]">{n} personne{n > 1 ? 's' : ''}</option>
              ))}
              <option value="20+" className="bg-[#1A1A1A]">Plus de 20</option>
            </select>
            {errors.guests && <p className={errorClass}>{errors.guests.message}</p>}
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* 03 — Préférences */}
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/70" />
            03 — Préférences
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Occasion</label>
              <select {...register('occasion')} className={`${inputClass} cursor-pointer`}>
                <option value="" className="bg-[#1A1A1A]">Aucune</option>
                {OCCASIONS.map(o => <option key={o} value={o} className="bg-[#1A1A1A]">{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Placement</label>
              <select {...register('seating')} className={`${inputClass} cursor-pointer`}>
                <option value="" className="bg-[#1A1A1A]">Sans préférence</option>
                {SEATINGS.map(s => <option key={s} value={s} className="bg-[#1A1A1A]">{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Profil client</label>
              <select {...register('vipLevel')} className={`${inputClass} cursor-pointer`}>
                <option value="" className="bg-[#1A1A1A]">Standard</option>
                {VIP_LEVELS.map(v => <option key={v} value={v} className="bg-[#1A1A1A]">{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Niveau de dépense</label>
              <select {...register('budgetLevel')} className={`${inputClass} cursor-pointer`}>
                <option value="" className="bg-[#1A1A1A]">Non précisé</option>
                {BUDGETS.map(b => <option key={b} value={b} className="bg-[#1A1A1A]">{b}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* 04 — Coordonnées */}
        <div>
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/70" />
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
          <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase mb-5 flex items-center gap-3">
            <span className="w-px h-3 bg-[#5B3DF5]/70" />
            05 — Notes complémentaires
          </p>
          <textarea
            rows={2}
            placeholder="Toute information utile pour votre conciergerie..."
            {...register('specialRequests')}
            className={`${inputClass} resize-none`}
          />
        </div>

        {status === 'error' && (
          <div className="border border-red-400/20 text-red-400/70 text-sm px-4 py-3">
            Une erreur est survenue. Veuillez réessayer.
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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

        <p className="text-[#F5F5F3]/20 text-[11px] text-center leading-relaxed">
          Traitement confidentiel · Confirmation sous 24h
        </p>
      </div>
    </form>
  )
}
