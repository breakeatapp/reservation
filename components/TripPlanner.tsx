'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────────

type DestOption = { slug: string; name: string; emoji: string }
type EstOption  = { name: string; destination: string; type: string }

type BookingSlot = {
  id: string
  establishment: string
  time: string
  guests: string
  occasion: string
  specialRequests: string
}

type DayPlan = {
  date: string      // YYYY-MM-DD
  label: string     // "Jour 1 — Lundi 14 juin"
  bookings: BookingSlot[]
}

type TripSegment = {
  id: string
  destination: string      // slug
  destinationName: string  // display name
  destinationEmoji: string
  startDate: string
  endDate: string
  days: DayPlan[]
}

type PersonalInfo = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

type ValidBooking = BookingSlot & {
  date: string
  dateLabel: string
  destination: string
  destinationName: string
  destinationEmoji: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

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

const OCCASIONS = ['Anniversaire', 'Romantique', "Dîner d'affaires", 'Célébration', 'Fête', 'Soirée VIP']

const inputClass  = `w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] placeholder-[#F5F5F3]/20 px-3 py-2.5 text-sm focus:border-violet-500 outline-none transition-colors`
const labelClass  = `block text-[9px] tracking-[0.25em] text-[#F5F5F3]/40 uppercase mb-1.5`

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateDays(start: string, end: string): DayPlan[] {
  if (!start || !end) return []
  const startDate = new Date(start)
  const endDate   = new Date(end)
  if (endDate < startDate) return []

  const days: DayPlan[] = []
  const current = new Date(startDate)
  let index = 1

  while (current <= endDate && index <= 21) {
    const iso   = current.toISOString().split('T')[0]
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

function emptySegment(): TripSegment {
  return {
    id: Math.random().toString(36).slice(2),
    destination: '',
    destinationName: '',
    destinationEmoji: '',
    startDate: '',
    endDate: '',
    days: [],
  }
}

// ─── Step type ─────────────────────────────────────────────────────────────────

type Step = 'access' | 'info' | 'destinations' | 'planner' | 'review' | 'success'

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TripPlanner({
  destinations,
  establishments,
  rpSlug,
}: {
  destinations: DestOption[]
  establishments: EstOption[]
  rpSlug?: string
}) {
  const [step, setStep]         = useState<Step>('access')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  // ── Accès ─────────────────────────────────────────────────────────────────
  const [accessEmailInput, setAccessEmailInput] = useState('')
  const [accessEmail, setAccessEmail]           = useState('')
  const [checkLoading, setCheckLoading]         = useState(false)
  const [accessDenied, setAccessDenied]         = useState(false)

  // Auto-login depuis localStorage
  useEffect(() => {
    if (!rpSlug) { setStep('info'); return }
    const saved    = localStorage.getItem('itinera_guest_email')
    const savedRp  = localStorage.getItem('itinera_guest_rp')
    if (saved && savedRp === rpSlug) {
      setAccessEmail(saved)
      const firstName = localStorage.getItem('itinera_guest_name')     || ''
      const lastName  = localStorage.getItem('itinera_guest_lastname')  || ''
      const phone     = localStorage.getItem('itinera_guest_phone')     || ''
      setInfo(t => ({ ...t, email: saved, firstName, lastName, phone }))
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
      const res  = await fetch(`/api/client/check?email=${encodeURIComponent(trimmed)}&rp=${rpSlug}`)
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

  // ── Profil personnel ────────────────────────────────────────────────────────
  const [info, setInfo] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  // ── Segments (destinations) ─────────────────────────────────────────────────
  const [segments, setSegments]     = useState<TripSegment[]>([emptySegment()])
  const [expandedDay, setExpandedDay] = useState<string | null>(null)  // composite: "segId::dayDate"
  const [validatedIds, setValidatedIds] = useState<Set<string>>(new Set())

  // Établissements indexés par destination
  const estByDest = useMemo(() => {
    const map: Record<string, EstOption[]> = {}
    for (const e of establishments) {
      if (!map[e.destination]) map[e.destination] = []
      map[e.destination].push(e)
    }
    return map
  }, [establishments])

  // Totaux
  const totalBookings = useMemo(() =>
    segments.reduce((sum, seg) => sum + seg.days.reduce((s, d) => s + d.bookings.length, 0), 0),
    [segments]
  )

  const validBookings = useMemo<ValidBooking[]>(() =>
    segments.flatMap(seg =>
      seg.days.flatMap(d =>
        d.bookings
          .filter(b => b.establishment && b.time && b.guests)
          .map(b => ({
            ...b,
            date:           d.date,
            dateLabel:      d.label,
            destination:    seg.destination,
            destinationName: seg.destinationName,
            destinationEmoji: seg.destinationEmoji,
          }))
      )
    ),
    [segments]
  )

  // ── Gestion segments ────────────────────────────────────────────────────────
  const addSegment = () => setSegments(prev => [...prev, emptySegment()])
  const removeSegment = (id: string) => setSegments(prev => prev.filter(s => s.id !== id))

  const updateSegmentDest = (id: string, destSlug: string) => {
    const dest = destinations.find(d => d.slug === destSlug)
    setSegments(prev => prev.map(s => s.id !== id ? s : {
      ...s,
      destination:     destSlug,
      destinationName: dest?.name || '',
      destinationEmoji: dest?.emoji || '',
    }))
  }

  const updateSegmentDate = (id: string, field: 'startDate' | 'endDate', value: string) =>
    setSegments(prev => prev.map(s => s.id !== id ? s : { ...s, [field]: value }))

  // ── Gestion réservations dans un segment ────────────────────────────────────
  const addBooking = (segId: string, dayDate: string) =>
    setSegments(prev => prev.map(seg =>
      seg.id !== segId ? seg : {
        ...seg,
        days: seg.days.map(d =>
          d.date === dayDate ? { ...d, bookings: [...d.bookings, newBooking()] } : d
        ),
      }
    ))

  const removeBooking = (segId: string, dayDate: string, bookingId: string) =>
    setSegments(prev => prev.map(seg =>
      seg.id !== segId ? seg : {
        ...seg,
        days: seg.days.map(d =>
          d.date === dayDate ? { ...d, bookings: d.bookings.filter(b => b.id !== bookingId) } : d
        ),
      }
    ))

  const updateBooking = (segId: string, dayDate: string, bookingId: string, field: keyof BookingSlot, value: string) =>
    setSegments(prev => prev.map(seg =>
      seg.id !== segId ? seg : {
        ...seg,
        days: seg.days.map(d =>
          d.date === dayDate
            ? { ...d, bookings: d.bookings.map(b => b.id === bookingId ? { ...b, [field]: value } : b) }
            : d
        ),
      }
    ))

  // ── Handlers de navigation ──────────────────────────────────────────────────
  const handleInfoNext = () => {
    if (!info.firstName || !info.lastName || !info.email || !info.phone) {
      setError('Veuillez remplir tous les champs requis.')
      return
    }
    setError('')
    setStep('destinations')
  }

  const handleDestinationsNext = () => {
    for (const seg of segments) {
      if (!seg.destination) {
        setError('Veuillez choisir une destination pour chaque étape.')
        return
      }
      if (!seg.startDate || !seg.endDate) {
        setError('Veuillez sélectionner les dates d\'arrivée et de départ pour chaque destination.')
        return
      }
      if (new Date(seg.endDate) < new Date(seg.startDate)) {
        setError('La date de départ doit être après la date d\'arrivée.')
        return
      }
    }
    // Générer les jours pour chaque segment
    const updated = segments.map(seg => ({
      ...seg,
      days: generateDays(seg.startDate, seg.endDate),
    }))
    setSegments(updated)
    // Auto-ouvrir le premier jour du premier segment
    const firstDay = updated[0]?.days[0]
    if (firstDay) setExpandedDay(`${updated[0].id}::${firstDay.date}`)
    setError('')
    setStep('planner')
  }

  const handlePlannerNext = () => {
    if (validBookings.length === 0) {
      setError('Ajoutez au moins une réservation à votre itinéraire.')
      return
    }
    setError('')
    setStep('review')
  }

  // ── Soumission ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: info.firstName,
          lastName:  info.lastName,
          email:     info.email,
          phone:     info.phone,
          bookings:  validBookings.map(b => ({
            establishment:   b.establishment,
            date:            b.date,
            time:            b.time,
            guests:          b.guests,
            occasion:        b.occasion,
            specialRequests: b.specialRequests,
            destination:     b.destinationName,
          })),
          rpSlug: rpSlug || '',
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi')
      localStorage.setItem('itinera_guest_name',     info.firstName)
      localStorage.setItem('itinera_guest_lastname',  info.lastName)
      localStorage.setItem('itinera_guest_phone',     info.phone)
      setStep('success')
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // ── Écran accès ─────────────────────────────────────────────────────────────
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

  // ── Écran succès ────────────────────────────────────────────────────────────
  if (step === 'success') {
    const seen: Record<string, boolean> = {}
    const destNames = validBookings.map(b => b.destinationName).filter(n => { if (seen[n]) return false; seen[n] = true; return true }).join(', ')
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] flex items-center justify-center mx-auto mb-8">
          <span className="text-white text-3xl">✦</span>
        </div>
        <h2 className="font-playfair text-3xl text-[#F5F5F3] mb-4">Itinéraire envoyé</h2>
        <p className="text-[#F5F5F3]/50 leading-relaxed mb-2">
          Vos <strong className="text-[#F5F5F3]/80">{validBookings.length} réservation{validBookings.length > 1 ? 's' : ''}</strong> ont bien été transmises à notre équipe.
        </p>
        {destNames && (
          <p className="text-[#5B3DF5]/60 text-sm mb-1">{destNames}</p>
        )}
        <p className="text-[#F5F5F3]/40 text-sm mb-10">
          Confirmation sous 24h — Vérifiez votre boîte mail.
        </p>
        <div className="h-px bg-gradient-to-r from-transparent via-[#5B3DF5]/40 to-transparent mb-8" />
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => { setStep('info'); setSegments([emptySegment()]); setValidatedIds(new Set()) }}
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

  // ── Formulaire principal ────────────────────────────────────────────────────
  const STEP_ORDER = ['info', 'destinations', 'planner', 'review'] as const
  const stepLabels  = ['Profil', 'Destinations', 'Itinéraire', 'Récapitulatif']

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Barre de progression ── */}
      <div className="flex items-center gap-0 mb-10">
        {STEP_ORDER.map((s, i) => {
          const isActive = step === s
          const isDone   = STEP_ORDER.indexOf(step) > i
          return (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-all ${
                  isActive ? 'bg-gradient-to-br from-[#5B3DF5] to-[#8B5CF6] border-transparent text-white' :
                  isDone   ? 'bg-[#5B3DF5]/20 border-[#5B3DF5]/40 text-[#8B5CF6]' :
                             'bg-[#1A1A1A] border-white/10 text-[#F5F5F3]/20'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[8px] tracking-widest uppercase mt-1.5 ${isActive ? 'text-[#8B5CF6]' : isDone ? 'text-[#5B3DF5]/60' : 'text-[#F5F5F3]/20'}`}>
                  {stepLabels[i]}
                </span>
              </div>
              {i < STEP_ORDER.length - 1 && (
                <div className={`flex-1 h-px max-w-[40px] -mt-4 ${isDone ? 'bg-[#5B3DF5]/40' : 'bg-white/5'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-[#1A1A1A] border border-white/5">

        {/* ─── ÉTAPE 1 : PROFIL ─── */}
        {step === 'info' && (
          <div className="p-8 md:p-12 space-y-8">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/70 uppercase mb-5 flex items-center gap-3">
                <span className="w-px h-3 bg-[#5B3DF5]/40" />
                01 — Vos coordonnées
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Prénom *</label>
                  <input type="text" placeholder="Jean" value={info.firstName}
                    onChange={e => setInfo(t => ({ ...t, firstName: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nom *</label>
                  <input type="text" placeholder="Dupont" value={info.lastName}
                    onChange={e => setInfo(t => ({ ...t, lastName: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Email *</label>
                  <input type="email" placeholder="jean@email.com" value={info.email}
                    onChange={e => setInfo(t => ({ ...t, email: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Téléphone *</label>
                  <input type="tel" placeholder="+33 6 00 00 00 00" value={info.phone}
                    onChange={e => setInfo(t => ({ ...t, phone: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400/70 text-sm">{error}</p>}

            <button onClick={handleInfoNext}
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity">
              Choisir mes destinations →
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 2 : DESTINATIONS ─── */}
        {step === 'destinations' && (
          <div className="p-8 md:p-12 space-y-6">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/70 uppercase mb-2 flex items-center gap-3">
                <span className="w-px h-3 bg-[#5B3DF5]/40" />
                02 — Destinations & dates
              </p>
              <p className="text-[#F5F5F3]/30 text-xs mb-6">
                Ajoutez toutes les étapes de votre voyage, dans l'ordre.
              </p>

              <div className="space-y-4">
                {segments.map((seg, idx) => (
                  <div key={seg.id} className="border border-white/8 bg-[#0B0B0B]/40 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] tracking-[0.3em] text-[#5B3DF5]/60 uppercase">
                        Étape {idx + 1}
                      </span>
                      {segments.length > 1 && (
                        <button
                          onClick={() => removeSegment(seg.id)}
                          className="text-[#F5F5F3]/20 hover:text-red-400/70 transition-colors text-xs"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className={labelClass}>Destination *</label>
                      <select
                        value={seg.destination}
                        onChange={e => updateSegmentDest(seg.id, e.target.value)}
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Arrivée *</label>
                        <input
                          type="date"
                          value={seg.startDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={e => updateSegmentDate(seg.id, 'startDate', e.target.value)}
                          className={`${inputClass} [color-scheme:dark]`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Départ *</label>
                        <input
                          type="date"
                          value={seg.endDate}
                          min={seg.startDate || new Date().toISOString().split('T')[0]}
                          onChange={e => updateSegmentDate(seg.id, 'endDate', e.target.value)}
                          className={`${inputClass} [color-scheme:dark]`}
                        />
                      </div>
                    </div>

                    {seg.startDate && seg.endDate && new Date(seg.endDate) >= new Date(seg.startDate) && (
                      <p className="text-[#5B3DF5]/50 text-[10px] mt-2">
                        {generateDays(seg.startDate, seg.endDate).length} jour{generateDays(seg.startDate, seg.endDate).length > 1 ? 's' : ''} à {seg.destinationName || '…'}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Ajouter une étape */}
              <button
                onClick={addSegment}
                className="w-full mt-4 border border-dashed border-[#5B3DF5]/30 text-[#5B3DF5]/70 text-[10px] tracking-[0.3em] uppercase py-3.5 hover:border-[#5B3DF5]/60 hover:text-[#8B5CF6] transition-all"
              >
                + Ajouter une destination
              </button>
            </div>

            {error && <p className="text-red-400/70 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('info') }}
                className="flex-1 border border-white/10 text-[#F5F5F3]/50 text-[11px] tracking-[0.2em] uppercase py-4 hover:border-white/20 hover:text-[#F5F5F3] transition-all">
                ← Retour
              </button>
              <button onClick={handleDestinationsNext}
                className="flex-[2] bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.3em] uppercase py-4 hover:opacity-90 transition-opacity">
                Composer l'itinéraire →
              </button>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 3 : PLANIFICATEUR ─── */}
        {step === 'planner' && (
          <div className="p-6 md:p-10">
            <div className="mb-8">
              <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5]/70 uppercase mb-2 flex items-center gap-3">
                <span className="w-px h-3 bg-[#5B3DF5]/40" />
                03 — Itinéraire · {segments.length} destination{segments.length > 1 ? 's' : ''}
              </p>
              <p className="text-[#F5F5F3]/30 text-xs">
                Cliquez sur un jour pour ajouter vos réservations
              </p>
            </div>

            {/* Segments */}
            <div className="space-y-8 mb-8">
              {segments.map((seg, segIdx) => {
                const segEst = estByDest[seg.destination] ?? []
                return (
                  <div key={seg.id}>
                    {/* En-tête de segment */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg">{seg.destinationEmoji}</span>
                      <div>
                        <p className="text-[#F5F5F3]/80 text-sm font-medium">{seg.destinationName}</p>
                        <p className="text-[#F5F5F3]/30 text-[10px]">
                          {seg.startDate} → {seg.endDate} · {seg.days.length} jour{seg.days.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      {segments.length > 1 && segIdx < segments.length - 1 && (
                        <div className="flex-1 h-px bg-white/5 ml-2" />
                      )}
                    </div>

                    {segEst.length === 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-3 mb-4 text-amber-400/80 text-sm">
                        Aucun établissement disponible pour {seg.destinationName} pour le moment.
                      </div>
                    )}

                    {/* Jours */}
                    <div className="space-y-2">
                      {seg.days.map(day => {
                        const compositeKey = `${seg.id}::${day.date}`
                        const isExpanded   = expandedDay === compositeKey
                        return (
                          <div key={day.date} className="border border-white/5">
                            {/* En-tête du jour */}
                            <button
                              onClick={() => setExpandedDay(isExpanded ? null : compositeKey)}
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
                                <span className="text-[#F5F5F3]/20 text-sm">{isExpanded ? '−' : '+'}</span>
                              </div>
                            </button>

                            {/* Corps du jour */}
                            {isExpanded && (
                              <div className="border-t border-white/5 p-5 space-y-4 bg-[#0B0B0B]/40">
                                {day.bookings.map((booking, idx) => (
                                  <div key={booking.id} className={`border p-4 relative transition-all ${validatedIds.has(booking.id) ? 'bg-[#0f1a0f] border-green-500/20' : 'bg-[#1A1A1A] border-white/5'}`}>

                                    {validatedIds.has(booking.id) ? (
                                      /* Mode résumé validé */
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
                                            onClick={() => {
                                              removeBooking(seg.id, day.date, booking.id)
                                              setValidatedIds(prev => { const s = new Set(prev); s.delete(booking.id); return s })
                                            }}
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
                                            onClick={() => removeBooking(seg.id, day.date, booking.id)}
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
                                              onChange={e => updateBooking(seg.id, day.date, booking.id, 'establishment', e.target.value)}
                                              className={`${inputClass} cursor-pointer`}
                                            >
                                              <option value="" disabled className="bg-[#0B0B0B]">Choisir...</option>
                                              {segEst.map(e => (
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
                                              onChange={e => updateBooking(seg.id, day.date, booking.id, 'time', e.target.value)}
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
                                              onChange={e => updateBooking(seg.id, day.date, booking.id, 'guests', e.target.value)}
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
                                              onChange={e => updateBooking(seg.id, day.date, booking.id, 'occasion', e.target.value)}
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
                                              onChange={e => updateBooking(seg.id, day.date, booking.id, 'specialRequests', e.target.value)}
                                              className={inputClass}
                                            />
                                          </div>
                                        </div>

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

                                {day.bookings.length > 0 && (
                                  <div className="flex items-center gap-2 mb-2 bg-green-500/8 border border-green-500/20 px-4 py-3">
                                    <span className="text-green-400 text-base">✓</span>
                                    <p className="text-green-400 text-xs flex-1">
                                      {day.bookings.filter(b => b.establishment && b.time).length}/{day.bookings.length} réservation{day.bookings.length > 1 ? 's' : ''} complète{day.bookings.filter(b => b.establishment && b.time).length > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                )}

                                <button
                                  onClick={() => addBooking(seg.id, day.date)}
                                  className="w-full border border-dashed border-[#5B3DF5]/30 text-[#5B3DF5]/70 text-[10px] tracking-[0.3em] uppercase py-3 hover:border-[#5B3DF5]/60 hover:text-[#8B5CF6] transition-all"
                                >
                                  + Ajouter une réservation ce jour-ci
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Barre de synthèse */}
            {totalBookings > 0 && (
              <div className="bg-[#5B3DF5]/10 border border-[#5B3DF5]/20 px-5 py-3 mb-6 flex items-center justify-between">
                <p className="text-[#8B5CF6] text-sm">
                  <strong>{validBookings.length}</strong> réservation{validBookings.length > 1 ? 's' : ''} complète{validBookings.length > 1 ? 's' : ''}
                  {totalBookings !== validBookings.length && (
                    <span className="text-[#F5F5F3]/30 ml-2">({totalBookings - validBookings.length} incomplète{totalBookings - validBookings.length > 1 ? 's' : ''})</span>
                  )}
                </p>
                <span className="text-[#5B3DF5]/40 text-[10px]">
                  {segments.length} destination{segments.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {error && <p className="text-red-400/70 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('destinations') }}
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

        {/* ─── ÉTAPE 4 : RÉCAPITULATIF ─── */}
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
                <span className="text-[#F5F5F3]/80 text-sm font-medium">{info.firstName} {info.lastName}</span>
                <span className="text-[#F5F5F3]/40 text-sm">{info.email}</span>
                <span className="text-[#F5F5F3]/40 text-sm">{info.phone}</span>
              </div>
            </div>

            {/* Réservations groupées par destination */}
            {segments.map(seg => {
              const segBookings = validBookings.filter(b => b.destination === seg.destination)
              if (segBookings.length === 0) return null
              return (
                <div key={seg.id} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{seg.destinationEmoji}</span>
                    <p className="text-[9px] tracking-[0.25em] text-[#5B3DF5]/60 uppercase">{seg.destinationName}</p>
                  </div>
                  <div className="space-y-2">
                    {segBookings.map((booking, i) => (
                      <div key={booking.id} className="bg-[#0B0B0B] border border-white/5 p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-[9px] tracking-[0.2em] text-[#5B3DF5]/60 uppercase mt-0.5">#{i + 1}</span>
                          <div className="flex-1">
                            <p className="text-[#F5F5F3]/30 text-[10px] capitalize mb-1">
                              {booking.dateLabel.replace(/Jour \d+ — /, '')}
                            </p>
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
                </div>
              )
            })}

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
        Traitement confidentiel · Confirmation sous 24h · {segments.filter(s => s.destinationName).map(s => s.destinationName).join(' · ') || 'Itinera'}
      </p>
    </div>
  )
}
