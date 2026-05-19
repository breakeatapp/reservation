'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type Booking = {
  _id: string
  establishment: string
  date: string
  time: string
  guests: string
  occasion: string
  seating: string
  specialRequests: string
}

type PersonalInfo = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

type Step = 'info' | 'itinerary' | 'review'
type Status = 'idle' | 'loading' | 'success' | 'error'

type Props = {
  estOptions: { value: string; label: string }[]
  defaultLieu?: string
  rpSlug?: string
}

// ─── Style constants ──────────────────────────────────────────────────────────

const inputClass = `w-full bg-[#111111] border border-white/10 text-[#F5F5F3] placeholder-[#F5F5F3]/20 px-4 py-3.5 text-sm focus:border-[#6E5BFF] outline-none transition-colors duration-200`
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

const OCCASIONS = ['Anniversaire', "Dîner d'affaires", 'Romantique', 'Célébration', 'Fête', 'Soirée VIP', 'Autre']
const SEATINGS = ['Terrasse', 'Table coucher de soleil', 'Premier rang', 'Table DJ', 'Vue mer', 'Privé / Semi-privé', 'Sans préférence']

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _counter = 0
function uid(): string {
  return `bk-${++_counter}`
}

function emptyBooking(establishment = ''): Booking {
  return {
    _id: uid(),
    establishment,
    date: '',
    time: '',
    guests: '',
    occasion: '',
    seating: '',
    specialRequests: '',
  }
}

function infoErrors(info: PersonalInfo) {
  const errs: Partial<Record<keyof PersonalInfo, string>> = {}
  if (!info.firstName || info.firstName.trim().length < 2) errs.firstName = 'Prénom requis'
  if (!info.lastName || info.lastName.trim().length < 2) errs.lastName = 'Nom requis'
  if (!info.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email)) errs.email = 'Email invalide'
  if (!info.phone || info.phone.trim().length < 8) errs.phone = 'Numéro requis'
  return errs
}

function bookingErrors(b: Booking) {
  const errs: Record<string, string> = {}
  if (!b.establishment) errs.establishment = 'Veuillez choisir un établissement'
  if (!b.date) errs.date = 'Date requise'
  if (!b.time) errs.time = 'Service requis'
  if (!b.guests) errs.guests = 'Nombre de personnes requis'
  return errs
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'info', label: 'Coordonnées' },
    { id: 'itinerary', label: 'Séjour' },
    { id: 'review', label: 'Confirmation' },
  ]
  const idx = steps.findIndex(s => s.id === step)
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium transition-colors ${
                i < idx
                  ? 'bg-[#6E5BFF] text-white'
                  : i === idx
                  ? 'bg-[#6E5BFF] text-white ring-2 ring-[#6E5BFF]/30'
                  : 'bg-white/5 text-white/20'
              }`}
            >
              {i < idx ? '✓' : i + 1}
            </div>
            <span
              className={`text-[9px] tracking-[0.2em] uppercase transition-colors ${
                i === idx ? 'text-[#F5F5F3]/70' : 'text-[#F5F5F3]/20'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px mx-3 ${i < idx ? 'bg-[#6E5BFF]/50' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  index,
  total,
  estOptions,
  errors,
  onChange,
  onRemove,
}: {
  booking: Booking
  index: number
  total: number
  estOptions: { value: string; label: string }[]
  errors: Record<string, string>
  onChange: (field: keyof Booking, value: string) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(true)

  const label = booking.establishment
    ? estOptions.find(o => o.value === booking.establishment)?.label || booking.establishment
    : `Étape ${index + 1}`

  return (
    <div className="border border-white/10 bg-[#0E0E0E]">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-full bg-[#6E5BFF]/20 border border-[#6E5BFF]/40 text-[#6E5BFF] text-[9px] flex items-center justify-center font-medium">
            {index + 1}
          </span>
          <div>
            <p className="text-[#F5F5F3]/80 text-sm font-medium truncate max-w-[200px] sm:max-w-xs">{label}</p>
            {booking.date && booking.guests && (
              <p className="text-[#F5F5F3]/30 text-[10px] mt-0.5">
                {new Date(booking.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                {' · '}{booking.guests} pers.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {total > 1 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onRemove() }}
              className="text-[#F5F5F3]/20 hover:text-red-400/60 transition-colors text-xs"
              title="Supprimer cette étape"
            >
              ✕
            </button>
          )}
          <span className="text-[#F5F5F3]/20 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Card body */}
      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-white/5 pt-5">
          {/* Établissement */}
          <div>
            <label className={labelClass}>Établissement *</label>
            <select
              value={booking.establishment}
              onChange={e => onChange('establishment', e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="" disabled className="bg-[#111111]">Sélectionner un établissement...</option>
              {estOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#111111]">{opt.label}</option>
              ))}
            </select>
            {errors.establishment && <p className={errorClass}>{errors.establishment}</p>}
          </div>

          {/* Date & Service */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date *</label>
              <input
                type="date"
                value={booking.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => onChange('date', e.target.value)}
                className={`${inputClass} [color-scheme:dark]`}
              />
              {errors.date && <p className={errorClass}>{errors.date}</p>}
            </div>
            <div>
              <label className={labelClass}>Service *</label>
              <select
                value={booking.time}
                onChange={e => onChange('time', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="" disabled className="bg-[#111111]">Choisir...</option>
                {SERVICES.map((s, i) =>
                  s.disabled ? (
                    <option key={i} disabled className="bg-[#0B0B0B] text-[#F5F5F3]/30 text-[10px]">{s.label}</option>
                  ) : (
                    <option key={i} value={s.value} className="bg-[#111111]">{s.label}</option>
                  )
                )}
              </select>
              {errors.time && <p className={errorClass}>{errors.time}</p>}
            </div>
          </div>

          {/* Personnes */}
          <div>
            <label className={labelClass}>Personnes *</label>
            <select
              value={booking.guests}
              onChange={e => onChange('guests', e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="" disabled className="bg-[#111111]">Sélectionner...</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => (
                <option key={n} value={n} className="bg-[#111111]">{n} personne{n > 1 ? 's' : ''}</option>
              ))}
              <option value="20+" className="bg-[#111111]">Plus de 20</option>
            </select>
            {errors.guests && <p className={errorClass}>{errors.guests}</p>}
          </div>

          {/* Occasion & Placement */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Occasion</label>
              <select
                value={booking.occasion}
                onChange={e => onChange('occasion', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="" className="bg-[#111111]">Aucune</option>
                {OCCASIONS.map(o => <option key={o} value={o} className="bg-[#111111]">{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Placement</label>
              <select
                value={booking.seating}
                onChange={e => onChange('seating', e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="" className="bg-[#111111]">Sans préférence</option>
                {SEATINGS.map(s => <option key={s} value={s} className="bg-[#111111]">{s}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes spécifiques</label>
            <textarea
              rows={2}
              value={booking.specialRequests}
              onChange={e => onChange('specialRequests', e.target.value)}
              placeholder="Demandes particulières pour cet établissement..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReservationForm({ estOptions, defaultLieu, rpSlug }: Props) {
  const [step, setStep] = useState<Step>('info')
  const [status, setStatus] = useState<Status>('idle')

  // Personal info state
  const [info, setInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [infoTouched, setInfoTouched] = useState(false)

  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([emptyBooking(defaultLieu || '')])
  const [bookingErrors, setBookingErrors] = useState<Record<string, Record<string, string>>>({})

  // Load saved info from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = {
      firstName: localStorage.getItem('itinera_guest_name') || '',
      lastName: localStorage.getItem('itinera_guest_lastname') || '',
      email: localStorage.getItem('itinera_guest_email') || '',
      phone: localStorage.getItem('itinera_guest_phone') || '',
    }
    if (saved.firstName || saved.email) {
      setInfo(prev => ({ ...prev, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v)) }))
    }
  }, [])

  // ── Info step handlers ──────────────────────────────────────────────────────
  const iErrors = infoTouched ? infoErrors(info) : {}
  const infoValid = Object.keys(infoErrors(info)).length === 0

  function handleInfoNext() {
    setInfoTouched(true)
    if (!infoValid) return
    setStep('itinerary')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Booking handlers ────────────────────────────────────────────────────────
  function updateBooking(id: string, field: keyof Booking, value: string) {
    setBookings(prev => prev.map(b => b._id === id ? { ...b, [field]: value } : b))
    // clear that field's error
    if (bookingErrors[id]?.[field]) {
      setBookingErrors(prev => {
        const copy = { ...prev }
        if (copy[id]) {
          copy[id] = { ...copy[id] }
          delete copy[id][field]
        }
        return copy
      })
    }
  }

  function addBooking() {
    setBookings(prev => [...prev, emptyBooking()])
  }

  function removeBooking(id: string) {
    setBookings(prev => prev.filter(b => b._id !== id))
  }

  function validateBookings(): boolean {
    const allErrors: Record<string, Record<string, string>> = {}
    let valid = true
    for (const b of bookings) {
      const errs = bookingErrors_fn(b)
      if (Object.keys(errs).length > 0) {
        allErrors[b._id] = errs
        valid = false
      }
    }
    setBookingErrors(allErrors)
    return valid
  }

  function bookingErrors_fn(b: Booking) {
    const errs: Record<string, string> = {}
    if (!b.establishment) errs.establishment = 'Veuillez choisir un établissement'
    if (!b.date) errs.date = 'Date requise'
    if (!b.time) errs.time = 'Service requis'
    if (!b.guests) errs.guests = 'Nombre de personnes requis'
    return errs
  }

  function handleItineraryNext() {
    if (!validateBookings()) return
    setStep('review')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setStatus('loading')
    try {
      const payload = {
        firstName: info.firstName.trim(),
        lastName: info.lastName.trim(),
        email: info.email.trim(),
        phone: info.phone.trim(),
        rpSlug: rpSlug || undefined,
        bookings: bookings.map(b => ({
          establishment: b.establishment,
          date: b.date,
          time: b.time,
          guests: b.guests,
          occasion: b.occasion || undefined,
          seating: b.seating || undefined,
          specialRequests: b.specialRequests || undefined,
        })),
      }

      const res = await fetch('/api/trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-2xl">✦</span>
        </div>
        <h2 className="font-playfair text-3xl text-[#F5F5F3] mb-4">
          {bookings.length > 1 ? 'Séjour envoyé' : 'Demande envoyée'}
        </h2>
        <p className="text-[#F5F5F3]/50 leading-relaxed mb-2">
          {bookings.length > 1
            ? `Vos ${bookings.length} réservations ont été transmises à votre conciergerie.`
            : 'Votre demande a été transmise à votre conciergerie.'}
        </p>
        <p className="text-[#F5F5F3]/30 text-sm leading-relaxed mb-8">
          Confirmation sous 24h · Un récapitulatif vous a été envoyé par email.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#5B3DF5]/40 to-transparent mb-8" />
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setStatus('idle')
              setStep('info')
              setBookings([emptyBooking(defaultLieu || '')])
              setInfoTouched(false)
              setBookingErrors({})
            }}
            className="border border-[#5B3DF5]/40 text-[#8B5CF6] text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:bg-[#5B3DF5]/10 transition-colors"
          >
            Nouvelle demande
          </button>
          <Link
            href="/"
            className="bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:opacity-90 transition-opacity"
          >
            Accueil
          </Link>
        </div>
      </div>
    )
  }

  // ─── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator step={step} />

      <div className="bg-[#1A1A1A] border border-white/5 p-8 md:p-12">

        {/* ── STEP 1 : Personal info ───────────────────────────────────────── */}
        {step === 'info' && (
          <div className="space-y-8">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-[#6E5BFF] uppercase mb-5 flex items-center gap-3">
                <span className="w-px h-3 bg-[#6E5BFF]/90" />
                01 — Vos coordonnées
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Prénom *</label>
                  <input
                    type="text"
                    placeholder="Jean"
                    value={info.firstName}
                    onChange={e => setInfo(p => ({ ...p, firstName: e.target.value }))}
                    className={inputClass}
                  />
                  {iErrors.firstName && <p className={errorClass}>{iErrors.firstName}</p>}
                </div>
                <div>
                  <label className={labelClass}>Nom *</label>
                  <input
                    type="text"
                    placeholder="Dupont"
                    value={info.lastName}
                    onChange={e => setInfo(p => ({ ...p, lastName: e.target.value }))}
                    className={inputClass}
                  />
                  {iErrors.lastName && <p className={errorClass}>{iErrors.lastName}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    placeholder="jean@email.com"
                    value={info.email}
                    onChange={e => setInfo(p => ({ ...p, email: e.target.value }))}
                    className={inputClass}
                  />
                  {iErrors.email && <p className={errorClass}>{iErrors.email}</p>}
                </div>
                <div>
                  <label className={labelClass}>Téléphone *</label>
                  <input
                    type="tel"
                    placeholder="+33 6 00 00 00 00"
                    value={info.phone}
                    onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))}
                    className={inputClass}
                  />
                  {iErrors.phone && <p className={errorClass}>{iErrors.phone}</p>}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInfoNext}
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity"
            >
              Continuer — Mon séjour →
            </button>

            <p className="text-[#F5F5F3]/20 text-[11px] text-center">
              Traitement confidentiel · Confirmation sous 24h
            </p>
          </div>
        )}

        {/* ── STEP 2 : Itinerary ───────────────────────────────────────────── */}
        {step === 'itinerary' && (
          <div className="space-y-6">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-[#6E5BFF] uppercase mb-1 flex items-center gap-3">
                <span className="w-px h-3 bg-[#6E5BFF]/90" />
                02 — Votre séjour
              </p>
              <p className="text-[#F5F5F3]/30 text-[11px] ml-4 mt-1">
                Ajoutez chaque étape de votre séjour. Chaque établissement fera l&apos;objet d&apos;une réservation distincte.
              </p>
            </div>

            {/* Booking cards */}
            <div className="space-y-3">
              {bookings.map((b, i) => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  index={i}
                  total={bookings.length}
                  estOptions={estOptions}
                  errors={bookingErrors[b._id] || {}}
                  onChange={(field, value) => updateBooking(b._id, field, value)}
                  onRemove={() => removeBooking(b._id)}
                />
              ))}
            </div>

            {/* Add destination button */}
            <button
              type="button"
              onClick={addBooking}
              className="w-full border border-dashed border-[#6E5BFF]/30 text-[#6E5BFF]/60 hover:border-[#6E5BFF]/60 hover:text-[#6E5BFF]/90 text-[11px] tracking-[0.2em] uppercase py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-base leading-none">+</span>
              Ajouter une destination
            </button>

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep('info'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="flex-1 border border-white/10 text-[#F5F5F3]/40 text-[11px] tracking-[0.2em] uppercase py-4 hover:border-white/20 hover:text-[#F5F5F3]/60 transition-colors"
              >
                ← Retour
              </button>
              <button
                type="button"
                onClick={handleItineraryNext}
                className="flex-[2] bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity"
              >
                Vérifier mon séjour →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 : Review ─────────────────────────────────────────────── */}
        {step === 'review' && (
          <div className="space-y-8">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-[#6E5BFF] uppercase mb-5 flex items-center gap-3">
                <span className="w-px h-3 bg-[#6E5BFF]/90" />
                03 — Récapitulatif
              </p>

              {/* Guest info recap */}
              <div className="border border-white/5 p-4 mb-6">
                <p className="text-[9px] tracking-[0.2em] text-[#F5F5F3]/30 uppercase mb-3">Vos coordonnées</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div>
                    <span className="text-[#F5F5F3]/40 text-[10px]">Nom</span>
                    <p className="text-[#F5F5F3]/80 text-sm">{info.firstName} {info.lastName}</p>
                  </div>
                  <div>
                    <span className="text-[#F5F5F3]/40 text-[10px]">Email</span>
                    <p className="text-[#F5F5F3]/80 text-sm">{info.email}</p>
                  </div>
                  <div className="mt-2">
                    <span className="text-[#F5F5F3]/40 text-[10px]">Téléphone</span>
                    <p className="text-[#F5F5F3]/80 text-sm">{info.phone}</p>
                  </div>
                </div>
              </div>

              {/* Bookings recap */}
              <div className="space-y-3">
                {bookings.map((b, i) => {
                  const estLabel = estOptions.find(o => o.value === b.establishment)?.label || b.establishment
                  const dateLabel = b.date
                    ? new Date(b.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'
                  return (
                    <div key={b._id} className="border border-white/5 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#6E5BFF]/20 border border-[#6E5BFF]/40 text-[#6E5BFF] text-[9px] flex items-center justify-center font-medium flex-shrink-0">
                            {i + 1}
                          </span>
                          <p className="text-[#F5F5F3]/80 text-sm font-medium">{estLabel}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setStep('itinerary'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          className="text-[#6E5BFF]/50 hover:text-[#6E5BFF] text-[10px] tracking-[0.1em] uppercase transition-colors"
                        >
                          Modifier
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-[11px]">
                        <div>
                          <span className="text-[#F5F5F3]/30 block mb-0.5">Date</span>
                          <span className="text-[#F5F5F3]/60 capitalize">{dateLabel}</span>
                        </div>
                        <div>
                          <span className="text-[#F5F5F3]/30 block mb-0.5">Service</span>
                          <span className="text-[#F5F5F3]/60">{b.time || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[#F5F5F3]/30 block mb-0.5">Personnes</span>
                          <span className="text-[#F5F5F3]/60">{b.guests || '—'}</span>
                        </div>
                        {b.occasion && (
                          <div>
                            <span className="text-[#F5F5F3]/30 block mb-0.5">Occasion</span>
                            <span className="text-[#F5F5F3]/60">{b.occasion}</span>
                          </div>
                        )}
                        {b.seating && (
                          <div>
                            <span className="text-[#F5F5F3]/30 block mb-0.5">Placement</span>
                            <span className="text-[#F5F5F3]/60">{b.seating}</span>
                          </div>
                        )}
                        {b.specialRequests && (
                          <div className="col-span-3">
                            <span className="text-[#F5F5F3]/30 block mb-0.5">Notes</span>
                            <span className="text-[#F5F5F3]/60">{b.specialRequests}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {bookings.length > 1 && (
                <p className="text-[#F5F5F3]/25 text-[11px] text-center pt-2">
                  {bookings.length} établissements · {bookings.length} demandes de réservation distinctes
                </p>
              )}
            </div>

            {status === 'error' && (
              <div className="border border-red-400/20 text-red-400/70 text-sm px-4 py-3">
                Une erreur est survenue. Veuillez réessayer.
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep('itinerary'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className="flex-1 border border-white/10 text-[#F5F5F3]/40 text-[11px] tracking-[0.2em] uppercase py-4 hover:border-white/20 hover:text-[#F5F5F3]/60 transition-colors"
                disabled={status === 'loading'}
              >
                ← Modifier
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === 'loading'}
                className="flex-[2] bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi en cours...
                  </span>
                ) : bookings.length > 1 ? `Envoyer ${bookings.length} demandes` : 'Envoyer ma demande'}
              </button>
            </div>

            <p className="text-[#F5F5F3]/20 text-[11px] text-center leading-relaxed">
              Traitement confidentiel · Confirmation sous 24h · Récapitulatif par email
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
