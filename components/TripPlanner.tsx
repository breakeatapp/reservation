'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

type DestOption = { slug: string; name: string; emoji: string }
type EstOption = { name: string; destination: string; type: string }

type BookingSlot = {
  id: string
  establishment: string
  time: string
  guests: string
  occasion: string
  specialRequests: string
}

type DayPlan = {
  date: string        // YYYY-MM-DD
  label: string       // "Jour 1 — Lundi 14 juin"
  bookings: BookingSlot[]
}

type TripInfo = {
  destination: string
  destinationName: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

const SERVICES = [
  { label: 'Premier service — Déjeuner (12h30)', value: 'Premier service — Déjeuner (12h30)' },
  { label: 'Deuxième service — Déjeuner (14h30)', value: 'Deuxième service — Déjeuner (14h30)' },
  { label: 'Premier service — Dîner (19h30)', value: 'Premier service — Dîner (19h30)' },
  { label: 'Deuxième service — Dîner (21h30)', value: 'Deuxième service — Dîner (21h30)' },
  { label: 'Beach Club — Ouverture (11h00)', value: 'Beach Club — Ouverture (11h00)' },
  { label: 'Beach Club — Sunset (17h00)', value: 'Beach Club — Sunset (17h00)' },
  { label: 'Club — Entrée early (22h00)', value: 'Club — Entrée early (22h00)' },
  { label: 'Club — Entrée late night (00h00)', value: 'Club — Entrée late night (00h00)' },
  { label: 'Brunch (11h00)', value: 'Brunch (11h00)' },
  { label: 'Cocktails (18h00)', value: 'Cocktails (18h00)' },
]

const OCCASIONS = ['Anniversaire', 'Romantique', 'Dîner d\'affaires', 'Célébration', 'Fête', 'Soirée VIP']

const inputClass = `w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] placeholder-[#F5F5F3]/20 px-3 py-2.5 text-sm focus:border-violet-500 outline-none transition-colors`
const labelClass = `block text-[9px] tracking-[0.25em] text-[#F5F5F3]/40 uppercase mb-1.5`

function generateDays(start: string, end: string): DayPlan[] {
  if (!start || !end) return []
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (endDate < startDate) return []

  const days: DayPlan[] = []
  const current = new Date(startDate)
  let index = 1

  while (current <= endDate && index <= 21) { // max 21 jours
    const iso = current.toISOString().split('T')[0]
    const label = `Jour ${index} — ${current.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`
    days.push({ date: iso, label, bookings: [] })
    current.setDate(current.getDate() + 1)
    index++
  }

  return days
}

function newBooking(): BookingSlot {
  return {
    id: Math.random().toString(36).slice(2),
    establishment: '',
    time: '',
    guests: '2',
    occasion: '',
    specialRequests: '',
  }
}

type Step = 'access' | 'info' | 'dates' | 'planner' | 'review' | 'success'

export default function TripPlanner({
  destinations,
  establishments,
  rpSlug,
}: {
  destinations: DestOption[]
  establishments: EstOption[]
  rpSlug?: string
}) {
  const [step, setStep] = useState<Step>('access')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // ── Accès ─────────────────────────────────────────────────────
  const [accessEmailInput, setAccessEmailInput] = useState('')
  const [accessEmail, setAccessEmail] = useState('')
  const [checkLoading, setCheckLoading] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  // Auto-login + pré-remplissage depuis localStorage
  useEffect(() => {
    if (!rpSlug) { setStep('info'); return }
    const saved = localStorage.getItem('itinera_guest_email')
    const savedRp = localStorage.getItem('itinera_guest_rp')
    if (saved && savedRp === rpSlug) {
      setAccessEmail(saved)
      // Pré-remplir les infos du profil
      const firstName = localStorage.getItem('itinera_guest_name') || ''
      const lastName = localStorage.getItem('itinera_guest_lastname') || ''
      const phone = localStorage.getItem('itinera_guest_phone') || ''
      setTrip(t => ({
        ...t,
        email: saved,
        firstName,
        lastName,
        phone,
      }))
      setStep('info')
    }
  }, [rpSlug])

  const handleCheckAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = accessEmailInput.trim()
    if (!trimmed || !rpSlug) { setAccessEmail(trimmed); setStep('info'); return }
    setCheckLoading(true)
    setAccessDenied(false)
    try {
      const res = await fetch(`/api/client/check?email=${encodeURIComponent(trimmed)}&rp=${rpSlug}`)
      const data = await res.json()
      if (data.registered) {
        setAccessEmail(trimmed)
        setStep('info')
      } else {
        setAccessDenied(true)
      }
    } catch {
      setAccessDenied(true)
    } finally {
      setCheckLoading(false)
    }
  }

  const [trip, setTrip] = useState<TripInfo>({
    destination: '',
    destinationName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [days, setDays] = useState<DayPlan[]>([])
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [validatedIds, setValidatedIds] = useState<Set<string>>(new Set())

  const filteredEst = useMemo(() =>
    establishments.filter(e => e.destination === trip.destination),
    [establishments, trip.destination]
  )

  const totalBookings = useMemo(() =>
    days.reduce((sum, d) => sum + d.bookings.length, 0),
    [days]
  )

  const validBookings = useMemo(() =>
    days.flatMap(d => d.bookings.filter(b => b.establishment && b.time && b.guests).map(b => ({ ...b, date: d.date, dateLabel: d.label }))),
    [days]
  )

  // ── Step 1: info ─────────────────────────────────────────────────
  const handleInfoNext = () => {
    if (!trip.destination || !trip.firstName || !trip.lastName || !trip.email || !trip.phone) {
      setError('Veuillez remplir tous les champs requis.')
      return
    }
    setError('')
    setStep('dates')
  }

  // ── Step 2: dates ────────────────────────────────────────────────
  const handleDatesNext = () => {
    if (!startDate || !endDate) {
      setError('Veuillez sélectionner vos dates de séjour.')
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('La date de départ doit être après la date d\'arrivée.')
      return
    }
    const generated = generateDays(startDate, endDate)
    setDays(generated)
    setExpandedDay(generated[0]?.date || null)
    setError('')
    setStep('planner')
  }

  // ── Booking manipulation ─────────────────────────────────────────
  const addBooking = (dayDate: string) => {
    setDays(prev => prev.map(d =>
      d.date === dayDate ? { ...d, bookings: [...d.bookings, newBooking()] } : d
    ))
  }

  const removeBooking = (dayDate: string, bookingId: string) => {
    setDays(prev => prev.map(d =>
      d.date === dayDate ? { ...d, bookings: d.bookings.filter(b => b.id !== bookingId) } : d
    ))
  }

  const updateBooking = (dayDate: string, bookingId: string, field: keyof BookingSlot, value: string) => {
    setDays(prev => prev.map(d =>
      d.date === dayDate
        ? { ...d, bookings: d.bookings.map(b => b.id === bookingId ? { ...b, [field]: value } : b) }
        : d
    ))
  }

  // ── Step 3 → review ─────────────────────────────────────────────
  const handlePlannerNext = () => {
    if (validBookings.length === 0) {
      setError('Ajoutez au moins une réservation à votre itinéraire.')
      return
    }
    setError('')
    setStep('review')
  }

  // ── Submit all bookings — UN SEUL appel API, UN SEUL email ────────
  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: trip.firstName,
          lastName: trip.lastName,
          email: trip.email,
          phone: trip.phone,
          bookings: validBookings.map(b => ({
            establishment: b.establishment,
            date: b.date,
            time: b.time,
            guests: b.guests,
            occasion: b.occasion,
            specialRequests: b.specialRequests,
          })),
          rpSlug: rpSlug || '',
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi')
      // Sauvegarder les infos pour pré-remplir la prochaine fois
      localStorage.setItem('itinera_guest_name', trip.firstName)
      localStorage.setItem('itinera_guest_lastname', trip.lastName)
      localStorage.setItem('itinera_guest_phone', trip.phone)
      setStep('success')
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  // ── Écran accès ───────────────────────────────────────────────
  if (step === 'access') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-[#141414] border border-white/5 p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border border-white/8 bg-[#5B3DF5]/10">
              <svg className="w-5 h-5 text-[#F5F5F3]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F5F3]/20 mb-2">Accès requis</p>
            <h2 className="font-playfair text-2xl text-[#F5F5F3] mb-2">Identifiez-vous</h2>
            <p className="text-[#F5F5F3]/25 text-sm leading-relaxed">
              Ce service est réservé aux clients inscrits.
            </p>
          </div>

          {!accessDenied ? (
            <form onSubmit={handleCheckAccess} className="space-y-4">
              <div>
                <label className="block text-[9px] tracking-[0.3em] text-[#F5F5F3]/30 uppercase mb-2">Votre email</label>
                <input
                  type="email"
                  value={accessEmailInput}
                  onChange={e => setAccessEmailInput(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm focus:border-white/30 outline-none placeholder-[#F5F5F3]/15"
                  placeholder="votre@email.com"
                  autoFocus required
                />
              </div>
              <button
                type="submit" disabled={checkLoading}
                className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {checkLoading ? 'Vérification...' : 'Accéder au planificateur →'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="border border-white/8 p-5 text-center">
                <p className="text-[9px] tracking-[0.4em] uppercase text-[#F5F5F3]/20 mb-3">Accès réservé</p>
                <p className="text-[#F5F5F3]/40 text-sm leading-relaxed mb-1">
                  <span className="text-[#F5F5F3]/60">{accessEmailInput}</span>
                </p>
                <p className="text-[#F5F5F3]/25 text-sm">n'est pas encore client de ce service.</p>
              </div>
              {rpSlug && (
                <Link
                  href={`/${rpSlug}/mon-espace`}
                  className="block w-full text-center border border-[#5B3DF5]/30 text-[#8B5CF6]/70 text-[11px] tracking-[0.2em] uppercase py-3 hover:bg-[#5B3DF5]/8 transition-colors"
                >
                  Contacter mon concierge →
                </Link>
              )}
              <button
                onClick={() => { setAccessDenied(false); setAccessEmailInput('') }}
                className="w-full text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors py-2"
              >
                ← Essayer un autre email
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] flex items-center justify-center mx-auto mb-8">
          <span className="text-white text-3xl">✦</span>
        </div>
        <h2 className="font-playfair text-3xl text-[#F5F5F3] mb-4">Itinéraire envoyé</h2>
        <p className="text-[#F5F5F3]/50 leading-relaxed mb-2">
          Vos <strong className="text-[#F5F5F3]/80">{validBookings.length} réservation{validBookings.length > 1 ? 's' : ''}</strong> ont bien été transmises à notre équipe.
        </p>
        <p className="text-[#F5F5F3]/40 text-sm mb-10">
          Confirmation sous 24h — Vérifiez votre boîte mail.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#5B3DF5]/40 to-transparent mb-8" />
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => { setStep('info'); setDays([]); setStartDate(''); setEndDate('') }}
            className="border border-[#5B3DF5]/40 text-[#8B5CF6] text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:bg-[#5B3DF5]/10 transition-colors"
          >
            Nouveau voyage
          </button>
          <Link href={rpSlug ? `/${rpSlug}` : '/'} className="bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:opacity-90 transition-opacity">
            Accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Progress bar */}
      <div className="flex items-center gap-0 mb-10">
        {(['info', 'dates', 'planner', 'review'] as const).map((s, i) => {
          const labels = ['Profil', 'Dates', 'Itinéraire', 'Récapitulatif']
          const isActive = step === s
          const isDone = (['info', 'dates', 'planner', 'review'] as const).indexOf(step) > i
          return (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-all ${
                  isActive ? 'bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] border-transparent text-white' :
                  isDone ? 'bg-[#5B3DF5]/20 border-[#5B3DF5]/40 text-[#8B5CF6]' :
                  'bg-[#1A1A1A] border-white/10 text-[#F5F5F3]/20'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[8px] tracking-widest uppercase mt-1.5 ${isActive ? 'text-[#8B5CF6]' : isDone ? 'text-[#5B3DF5]/60' : 'text-[#F5F5F3]/20'}`}>
                  {labels[i]}
                </span>
              </div>
              {i < 3 && (
                <div className={`flex-1 h-px max-w-[40px] -mt-4 ${isDone ? 'bg-[#5B3DF5]/40' : 'bg-white/5'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-[#1A1A1A] border border-white/5">

        {/* ─── STEP 1: PROFIL ─── */}
        {step === 'info' && (
          <div className="p-8 md:p-12 space-y-8">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/70 uppercase mb-5 flex items-center gap-3">
                <span className="w-px h-3 bg-[#5B3DF5]/40" />
                01 — Destination & profil
              </p>

              <div className="mb-6">
                <label className={labelClass}>Destination *</label>
                <select
                  value={trip.destination}
                  onChange={e => {
                    const d = destinations.find(d => d.slug === e.target.value)
                    setTrip(t => ({ ...t, destination: e.target.value, destinationName: d?.name || '' }))
                  }}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="" disabled className="bg-[#0B0B0B]">Choisir une destination...</option>
                  {destinations.map(d => (
                    <option key={d.slug} value={d.slug} className="bg-[#0B0B0B]">
                      {d.emoji} {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Prénom *</label>
                  <input type="text" placeholder="Jean" value={trip.firstName}
                    onChange={e => setTrip(t => ({ ...t, firstName: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nom *</label>
                  <input type="text" placeholder="Dupont" value={trip.lastName}
                    onChange={e => setTrip(t => ({ ...t, lastName: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" placeholder="jean@email.com" value={trip.email}
                    onChange={e => setTrip(t => ({ ...t, email: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Téléphone *</label>
                  <input type="tel" placeholder="+33 6 00 00 00 00" value={trip.phone}
                    onChange={e => setTrip(t => ({ ...t, phone: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

            </div>

            {error && <p className="text-red-400/70 text-sm">{error}</p>}

            <button onClick={handleInfoNext}
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity">
              Continuer →
            </button>
          </div>
        )}

        {/* ─── STEP 2: DATES ─── */}
        {step === 'dates' && (
          <div className="p-8 md:p-12 space-y-8">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/70 uppercase mb-5 flex items-center gap-3">
                <span className="w-px h-3 bg-[#5B3DF5]/40" />
                02 — Dates du séjour à {trip.destinationName}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={labelClass}>Date d'arrivée *</label>
                  <input type="date" value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setStartDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`} />
                </div>
                <div>
                  <label className={labelClass}>Date de départ *</label>
                  <input type="date" value={endDate}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setEndDate(e.target.value)}
                    className={`${inputClass} [color-scheme:dark]`} />
                </div>
              </div>

              {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
                <div className="bg-[#0B0B0B] border border-white/5 px-5 py-4 flex items-center gap-4">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-[#F5F5F3]/80 text-sm">
                      Séjour de <strong>{generateDays(startDate, endDate).length} jour{generateDays(startDate, endDate).length > 1 ? 's' : ''}</strong>
                    </p>
                    <p className="text-[#F5F5F3]/30 text-xs">
                      Vous pourrez ajouter des réservations pour chaque journée
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-red-400/70 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('info') }}
                className="flex-1 border border-white/10 text-[#F5F5F3]/50 text-[11px] tracking-[0.2em] uppercase py-4 hover:border-white/20 hover:text-[#F5F5F3] transition-all">
                ← Retour
              </button>
              <button onClick={handleDatesNext}
                className="flex-[2] bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity">
                Composer l'itinéraire →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: PLANNER ─── */}
        {step === 'planner' && (
          <div className="p-6 md:p-10">
            <div className="mb-8">
              <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/70 uppercase mb-2 flex items-center gap-3">
                <span className="w-px h-3 bg-[#5B3DF5]/40" />
                03 — Itinéraire · {trip.destinationName}
              </p>
              <p className="text-[#F5F5F3]/30 text-xs">
                Cliquez sur un jour pour ajouter vos réservations
              </p>
            </div>

            {filteredEst.length === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 mb-6 text-amber-400/80 text-sm">
                Aucun établissement disponible pour cette destination pour le moment.
              </div>
            )}

            <div className="space-y-3 mb-8">
              {days.map(day => (
                <div key={day.date} className="border border-white/5">

                  {/* Day header */}
                  <button
                    onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#0B0B0B] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[#5B3DF5]/60 text-xs font-mono">{day.date.slice(5).replace('-', '/')}</span>
                      <span className="text-[#F5F5F3]/80 text-sm capitalize">{day.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {day.bookings.length > 0 && (
                        <span className="bg-[#5B3DF5]/20 text-[#8B5CF6] text-[10px] px-2 py-0.5 rounded">
                          {day.bookings.length} résa
                        </span>
                      )}
                      <span className="text-[#F5F5F3]/20 text-sm">
                        {expandedDay === day.date ? '−' : '+'}
                      </span>
                    </div>
                  </button>

                  {/* Day body */}
                  {expandedDay === day.date && (
                    <div className="border-t border-white/5 p-5 space-y-4 bg-[#0B0B0B]/40">
                      {day.bookings.map((booking, idx) => (
                        <div key={booking.id} className={`border p-4 relative transition-all ${validatedIds.has(booking.id) ? 'bg-[#0f1a0f] border-green-500/20' : 'bg-[#1A1A1A] border-white/5'}`}>

                          {/* Mode validé — vue résumé */}
                          {validatedIds.has(booking.id) ? (
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span className="text-green-400 text-base mt-0.5">✓</span>
                                <div>
                                  <p className="text-[#F5F5F3]/80 text-sm font-medium">{booking.establishment || '—'}</p>
                                  <p className="text-[#F5F5F3]/35 text-xs mt-0.5">
                                    {booking.time} · {booking.guests} pers.{booking.occasion ? ` · ${booking.occasion}` : ''}
                                  </p>
                                  {booking.specialRequests && (
                                    <p className="text-[#F5F5F3]/25 text-[10px] italic mt-0.5">"{booking.specialRequests}"</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <button
                                  onClick={() => setValidatedIds(prev => { const s = new Set(prev); s.delete(booking.id); return s })}
                                  className="text-[#F5F5F3]/25 hover:text-[#F5F5F3]/60 text-[10px] tracking-[0.15em] uppercase transition-colors"
                                >
                                  Modifier
                                </button>
                                <button
                                  onClick={() => { removeBooking(day.date, booking.id); setValidatedIds(prev => { const s = new Set(prev); s.delete(booking.id); return s }) }}
                                  className="text-[#F5F5F3]/15 hover:text-red-400/60 transition-colors text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Mode formulaire */
                            <>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/60 uppercase">
                                  Réservation {idx + 1}
                                </span>
                                <button
                                  onClick={() => removeBooking(day.date, booking.id)}
                                  className="text-[#F5F5F3]/20 hover:text-red-400/70 transition-colors text-xs"
                                >
                                  Supprimer
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="col-span-2">
                                  <label className={labelClass}>Établissement *</label>
                                  <select
                                    value={booking.establishment}
                                    onChange={e => updateBooking(day.date, booking.id, 'establishment', e.target.value)}
                                    className={`${inputClass} cursor-pointer`}
                                  >
                                    <option value="" disabled className="bg-[#0B0B0B]">Choisir...</option>
                                    {filteredEst.map(e => (
                                      <option key={e.name} value={e.name} className="bg-[#0B0B0B]">
                                        {e.name} — {e.type}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className={labelClass}>Service *</label>
                                  <select
                                    value={booking.time}
                                    onChange={e => updateBooking(day.date, booking.id, 'time', e.target.value)}
                                    className={`${inputClass} cursor-pointer`}
                                  >
                                    <option value="" disabled className="bg-[#0B0B0B]">Choisir...</option>
                                    {SERVICES.map(s => (
                                      <option key={s.value} value={s.value} className="bg-[#0B0B0B]">{s.label}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className={labelClass}>Personnes *</label>
                                  <select
                                    value={booking.guests}
                                    onChange={e => updateBooking(day.date, booking.id, 'guests', e.target.value)}
                                    className={`${inputClass} cursor-pointer`}
                                  >
                                    {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                                      <option key={n} value={n} className="bg-[#0B0B0B]">{n} pers.</option>
                                    ))}
                                    <option value="20+" className="bg-[#0B0B0B]">20+</option>
                                  </select>
                                </div>

                                <div>
                                  <label className={labelClass}>Occasion</label>
                                  <select
                                    value={booking.occasion}
                                    onChange={e => updateBooking(day.date, booking.id, 'occasion', e.target.value)}
                                    className={`${inputClass} cursor-pointer`}
                                  >
                                    <option value="" className="bg-[#0B0B0B]">Aucune</option>
                                    {OCCASIONS.map(o => <option key={o} value={o} className="bg-[#0B0B0B]">{o}</option>)}
                                  </select>
                                </div>

                                <div className="col-span-2">
                                  <label className={labelClass}>Notes spéciales</label>
                                  <input type="text"
                                    placeholder="Placement, demandes particulières..."
                                    value={booking.specialRequests}
                                    onChange={e => updateBooking(day.date, booking.id, 'specialRequests', e.target.value)}
                                    className={inputClass}
                                  />
                                </div>
                              </div>

                              {/* Bouton Valider */}
                              {booking.establishment && booking.time && (
                                <button
                                  onClick={() => setValidatedIds(prev => new Set(prev).add(booking.id))}
                                  className="w-full py-2.5 bg-[#5B3DF5] text-white text-[10px] tracking-[0.3em] uppercase hover:bg-[#4930cc] transition-colors mt-1"
                                >
                                  ✓ Valider cette réservation
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ))}

                      {/* Confirmer la résa en cours */}
                      {day.bookings.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 bg-green-500/8 border border-green-500/20 px-4 py-3">
                          <span className="text-green-400 text-base">✓</span>
                          <p className="text-green-400 text-xs flex-1">
                            {day.bookings.filter(b => b.establishment && b.time).length}/{day.bookings.length} réservation{day.bookings.length > 1 ? 's' : ''} complète{day.bookings.filter(b => b.establishment && b.time).length > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => addBooking(day.date)}
                        className="w-full border border-dashed border-[#5B3DF5]/30 text-[#5B3DF5]/70 text-[10px] tracking-[0.3em] uppercase py-3 hover:border-[#5B3DF5]/60 hover:text-[#8B5CF6] transition-all"
                      >
                        + Ajouter une nouvelle réservation ce jour-ci
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary bar */}
            {totalBookings > 0 && (
              <div className="bg-[#5B3DF5]/10 border border-[#5B3DF5]/20 px-5 py-3 mb-6 flex items-center justify-between">
                <p className="text-[#8B5CF6] text-sm">
                  <strong>{validBookings.length}</strong> réservation{validBookings.length > 1 ? 's' : ''} complète{validBookings.length > 1 ? 's' : ''}
                  {totalBookings !== validBookings.length && (
                    <span className="text-[#F5F5F3]/30 ml-2">({totalBookings - validBookings.length} incomplète{totalBookings - validBookings.length > 1 ? 's' : ''})</span>
                  )}
                </p>
                <span className="text-[#5B3DF5]/40 text-[10px]">{trip.destinationName}</span>
              </div>
            )}

            {error && <p className="text-red-400/70 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('dates') }}
                className="flex-1 border border-white/10 text-[#F5F5F3]/50 text-[11px] tracking-[0.2em] uppercase py-4 hover:border-white/20 hover:text-[#F5F5F3] transition-all">
                ← Retour
              </button>
              <button onClick={handlePlannerNext}
                className="flex-[2] bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity">
                Voir le récapitulatif →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: REVIEW ─── */}
        {step === 'review' && (
          <div className="p-8 md:p-12">
            <div className="mb-8">
              <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/70 uppercase mb-2 flex items-center gap-3">
                <span className="w-px h-3 bg-[#5B3DF5]/40" />
                04 — Récapitulatif · {validBookings.length} réservation{validBookings.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Profil guest */}
            <div className="bg-[#0B0B0B] border border-white/5 p-5 mb-6">
              <p className="text-[9px] tracking-[0.3em] text-[#F5F5F3]/30 uppercase mb-3">Guest</p>
              <div className="flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <span className="text-[#F5F5F3]/80 text-sm font-medium">{trip.firstName} {trip.lastName}</span>
                </div>
                <div className="text-[#F5F5F3]/40 text-sm">{trip.email}</div>
                <div className="text-[#F5F5F3]/40 text-sm">{trip.phone}</div>
              </div>
            </div>

            {/* Itinéraire */}
            <div className="space-y-3 mb-8">
              {validBookings.map((booking, i) => (
                <div key={booking.id} className="bg-[#0B0B0B] border border-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[9px] tracking-[0.2em] text-[#5B3DF5]/60 uppercase">#{i + 1}</span>
                        <span className="text-[#F5F5F3]/30 text-[10px] capitalize">{booking.dateLabel.replace(/Jour \d+ — /, '')}</span>
                      </div>
                      <p className="text-[#F5F5F3] text-sm font-medium">{booking.establishment}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-[#F5F5F3]/40 text-xs">
                        <span>{booking.time}</span>
                        <span>·</span>
                        <span>{booking.guests} pers.</span>
                        {booking.occasion && <><span>·</span><span>{booking.occasion}</span></>}
                      </div>
                      {booking.specialRequests && (
                        <p className="text-[#F5F5F3]/30 text-xs italic mt-1">"{booking.specialRequests}"</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-[#5B3DF5]/10 to-[#8B5CF6]/10 border border-[#5B3DF5]/20 px-5 py-4 mb-6">
              <p className="text-[#F5F5F3]/60 text-sm leading-relaxed">
                En soumettant, vous confirmez toutes les réservations ci-dessus.
                Notre équipe vous contactera sous <strong className="text-[#F5F5F3]/80">24h</strong> pour valider chaque slot.
              </p>
            </div>

            {error && <p className="text-red-400/70 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('planner') }}
                className="flex-1 border border-white/10 text-[#F5F5F3]/50 text-[11px] tracking-[0.2em] uppercase py-4 hover:border-white/20 hover:text-[#F5F5F3] transition-all">
                ← Modifier
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Envoi en cours...
                  </span>
                ) : `Confirmer l'itinéraire (${validBookings.length} rés.)`}
              </button>
            </div>
          </div>
        )}

      </div>

      <p className="text-[#F5F5F3]/20 text-[11px] text-center mt-5 leading-relaxed">
        Traitement confidentiel · Confirmation sous 24h · {trip.destinationName}
      </p>
    </div>
  )
}
