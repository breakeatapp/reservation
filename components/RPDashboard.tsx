'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { RPProfile, Reservation, ReservationStatus, RPClientNote } from '@/lib/supabase'
import { parseVenueEntry, serializeVenueEntry, SERVICES_BY_TYPE, type VenueType } from '@/lib/venue-utils'
import GlobalAccessModal from './GlobalAccessModal'

type Props = { profile: RPProfile }

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  declined: 'Refusé',
  cancelled: 'Annulé',
}
const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/25',
  declined: 'bg-red-500/10 text-red-400 border-red-500/25',
  cancelled: 'bg-white/5 text-[#F5F5F3]/20 border-white/8',
}
const STATUS_DOT: Record<ReservationStatus, string> = {
  pending: 'bg-amber-400 animate-pulse',
  confirmed: 'bg-green-400',
  declined: 'bg-red-400',
  cancelled: 'bg-[#F5F5F3]/15',
}

const VIP_TAGS = ['', 'Ultra VIP', 'VVIP', 'VIP', 'Premium', 'Gold', 'Régulier', 'Corporate', 'Blacklist']
const VIP_COLORS: Record<string, string> = {
  '': 'text-[#F5F5F3]/20',
  'Ultra VIP': 'text-rose-300',
  VVIP: 'text-fuchsia-400',
  VIP: 'text-purple-400',
  Premium: 'text-emerald-400',
  Gold: 'text-amber-400',
  Régulier: 'text-blue-400',
  Corporate: 'text-cyan-400',
  Blacklist: 'text-red-400',
}

function buildWhatsAppMessage(
  r: Reservation,
  profile: RPProfile,
  internalNote?: string,
  vipTag?: string,
  privateMode?: boolean
): string {
  const parsedNote = internalNote ? parseClientProfile(internalNote) : null
  const effectiveVip = vipTag || r.vip_level || ''
  const confirmUrl = r.id ? `https://itinera.click/host/confirm/${r.id}` : null
  const contactPhone = privateMode ? (profile.whatsapp || '—') : r.phone
  const contactEmail = privateMode ? (profile.email || '—') : r.email

  // ── Section 1 : Lieu & réservation ───────────────────────────
  const section1 = [
    `🏠 *${r.establishment}*`,
    r.destination ? `📍 ${r.destination}` : null,
    `📅 ${r.date}`,
    `🕐 ${r.time}`,
    `👥 ${r.guests} personne${r.guests > 1 ? 's' : ''}`,
    r.occasion ? `🎉 ${r.occasion}` : null,
    r.seating ? `🪑 ${r.seating}` : null,
    r.budget_level ? `💰 ${r.budget_level}` : null,
  ].filter(Boolean).join('\n')

  // ── Section 2 : Client ───────────────────────────────────────
  const clientLines = [
    `👤 *${privateMode ? 'CONTACT' : 'CLIENT'}*`,
    `${r.first_name} ${r.last_name}`,
    `📞 ${contactPhone}`,
    `✉️ ${contactEmail}`,
    effectiveVip ? `⭐ ${effectiveVip}` : null,
    r.special_requests ? `📝 ${r.special_requests}` : null,
    parsedNote?.note ? `💡 ${parsedNote.note}` : null,
    parsedNote?.nationality ? `🌍 ${parsedNote.nationality}` : null,
    parsedNote?.products?.length ? `🍾 ${parsedNote.products.join(', ')}` : null,
  ].filter(Boolean).join('\n')

  // ── Section 3 : Lien de confirmation ─────────────────────────
  const section3 = confirmUrl
    ? `✅ Confirmer / ❌ Décliner :\n${confirmUrl}`
    : null

  return [section1, clientLines, section3]
    .filter(Boolean)
    .join('\n\n')
}

type MainView = 'list' | 'clients' | 'config' | 'book-for-client'

type BookingSlot = {
  id: string
  establishment: string
  time: string
  guests: string
  occasion: string
  seating: string
  specialRequests: string
}

type DayPlan = {
  date: string
  label: string
  bookings: BookingSlot[]
}

const NATIONALITIES = [
  { flag: '🇫🇷', label: 'France' },
  { flag: '🇺🇸', label: 'États-Unis' },
  { flag: '🇦🇪', label: 'Émirats' },
  { flag: '🇸🇦', label: 'Arabie Saoudite' },
  { flag: '🇨🇭', label: 'Suisse' },
  { flag: '🇬🇧', label: 'Royaume-Uni' },
  { flag: '🇷🇺', label: 'Russie' },
  { flag: '🇮🇳', label: 'Inde' },
  { flag: '🇧🇷', label: 'Brésil' },
  { flag: '🇲🇽', label: 'Mexique' },
  { flag: '🇮🇹', label: 'Italie' },
  { flag: '🇩🇪', label: 'Allemagne' },
]

const PRODUCT_TAGS = ['Dom Pérignon', 'Cristal', 'Krug', 'Beluga', 'Caviar', 'Homard', 'Vin Prestige']

/** Parse internal_note: either plain text or JSON {note, nationality, products} */
function parseClientProfile(raw: string): { note: string; nationality: string; products: string[] } {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        note: parsed.note ?? '',
        nationality: parsed.nationality ?? '',
        products: Array.isArray(parsed.products) ? parsed.products : [],
      }
    }
  } catch { /* plain text */ }
  return { note: raw ?? '', nationality: '', products: [] }
}

/** Serialize to JSON only if there's extra data, otherwise plain text */
function serializeClientProfile(note: string, nationality: string, products: string[]): string {
  const hasExtra = nationality || products.length > 0
  if (!hasExtra) return note
  return JSON.stringify({ note, nationality, products })
}

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

function generateDays(start: string, end: string): DayPlan[] {
  const days: DayPlan[] = []
  const cur = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (cur <= endDate && days.length < 21) {
    const d = cur.toISOString().split('T')[0]
    days.push({ date: d, label: `${DAYS_FR[cur.getDay()]} ${cur.getDate()} ${MONTHS_FR[cur.getMonth()]}`, bookings: [] })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

// Toutes les destinations disponibles dans la plateforme
const ALL_DESTINATIONS = [
  { slug: 'abu-dhabi', name: 'Abu Dhabi', emoji: '🕌' },
  { slug: 'aspen', name: 'Aspen', emoji: '🏔️' },
  { slug: 'cannes', name: 'Cannes', emoji: '🎬' },
  { slug: 'cavalaire', name: 'Cavalaire-sur-Mer', emoji: '⚓' },
  { slug: 'courchevel', name: 'Courchevel', emoji: '⛷️' },
  { slug: 'dubai', name: 'Dubai', emoji: '🏙️' },
  { slug: 'ibiza', name: 'Ibiza', emoji: '🎶' },
  { slug: 'jeddah', name: 'Jeddah', emoji: '🌙' },
  { slug: 'maldives', name: 'Maldives', emoji: '🌺' },
  { slug: 'miami', name: 'Miami', emoji: '🌴' },
  { slug: 'milan', name: 'Milan', emoji: '👗' },
  { slug: 'monaco', name: 'Monaco', emoji: '🎰' },
  { slug: 'mykonos', name: 'Mykonos', emoji: '🏛️' },
  { slug: 'rome', name: 'Rome', emoji: '🏟️' },
  { slug: 'saint-barth', name: 'Saint-Barthélemy', emoji: '🌊' },
  { slug: 'saint-tropez', name: 'Saint-Tropez', emoji: '⛵' },
  { slug: 'tulum', name: 'Tulum', emoji: '🌿' },
]

const RP_STORAGE_KEY = (slug: string) => `itinera_rp_pw_${slug}`

export default function RPDashboard({ profile }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [showNetwork, setShowNetwork] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | ReservationStatus>('all')
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  // Edit réservation en attente
  const [editingResa, setEditingResa] = useState(false)
  const [resaEdit, setResaEdit] = useState({ venue: '', date: '', time: '', guests: '2' })
  const [resaEditSaving, setResaEditSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [mainView, setMainView] = useState<MainView>('list')

  // Fiche client
  const [clientNote, setClientNote] = useState<RPClientNote | null>(null)
  const [editVipTag, setEditVipTag] = useState('')
  const [editInternalNote, setEditInternalNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  // Notes clients indexées par email (pour affichage dans la liste)
  const [clientNotes, setClientNotes] = useState<Record<string, RPClientNote>>({})

  // Clients list
  const [clients, setClients] = useState<RPClientNote[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  // Client profile editing (inline in clients view)
  const [editingClientEmail, setEditingClientEmail] = useState<string | null>(null)
  const [editClientVip, setEditClientVip] = useState('')
  const [editClientNat, setEditClientNat] = useState('')
  const [editClientProducts, setEditClientProducts] = useState<string[]>([])
  const [editClientNote, setEditClientNote] = useState('')
  const [savingClientProfile, setSavingClientProfile] = useState(false)
  const [resendingWelcome, setResendingWelcome] = useState<string | null>(null)
  const [deletingClient, setDeletingClient] = useState(false)
  const [deleteClientConfirm, setDeleteClientConfirm] = useState(false)

  // Ajout client
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addClientEmail, setAddClientEmail] = useState('')
  const [addClientName, setAddClientName] = useState('')
  const [addClientLoading, setAddClientLoading] = useState(false)
  const [addClientSuccess, setAddClientSuccess] = useState('')
  const [addClientError, setAddClientError] = useState('')
  const [lastAddedClient, setLastAddedClient] = useState<{ email: string; name: string } | null>(null)
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false)

  // Configuration
  const [configDests, setConfigDests] = useState<string[]>(profile.activated_destinations ?? [])
  const [configVenues, setConfigVenues] = useState<string[]>(profile.activated_venues ?? [])
  const configAccent = '#5B3DF5'
  const [configLogoText, setConfigLogoText] = useState(profile.logo_text || '')
  const [configWhatsapp, setConfigWhatsapp] = useState(profile.whatsapp || '')
  const [configNotifPref, setConfigNotifPref] = useState<'email' | 'whatsapp' | 'both'>(profile.notification_pref || 'email')
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  const [configError, setConfigError] = useState('')
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueDest, setNewVenueDest] = useState('')
  const [newVenueServices, setNewVenueServices] = useState<string[]>([])
  const [showServicePicker, setShowServicePicker] = useState(false)
  const [newVenueType, setNewVenueType] = useState<VenueType>('restaurant')
  // Villes personnalisées
  const [newCityName, setNewCityName] = useState('')
  const [newCityCountry, setNewCityCountry] = useState('')
  const [addVenueError, setAddVenueError] = useState('')
  // Zone dangereuse
  const [dangerConfirm, setDangerConfirm] = useState<'reservations' | 'account' | null>(null)
  const [dangerLoading, setDangerLoading] = useState(false)
  const [dangerDone, setDangerDone] = useState('')

  // ── Connexions venue ────────────────────────────────────────────
  const [venueInviteInput, setVenueInviteInput] = useState('')
  const [venueConnecting, setVenueConnecting] = useState(false)
  const [venueConnectMsg, setVenueConnectMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [connectedVenues, setConnectedVenues] = useState<{ venue_slug: string; venue_name: string; created_at: string }[]>([])
  const [connectedVenuesLoaded, setConnectedVenuesLoaded] = useState(false)

  // ── Réserver pour un client ────────────────────────────────────
  const [bookForType, setBookForType] = useState<'single' | 'trip' | null>(null)
  const [bfcSelectedClient, setBfcSelectedClient] = useState<RPClientNote | null>(null)
  const [bfcClientSearch, setBfcClientSearch] = useState('')
  const [bfcUseManual, setBfcUseManual] = useState(false)
  const [bfcManual, setBfcManual] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  // Réservation unique
  const [bfcDest, setBfcDest] = useState('')
  const [bfcVenue, setBfcVenue] = useState('')
  const [bfcDate, setBfcDate] = useState('')
  const [bfcTime, setBfcTime] = useState('')
  const [bfcGuests, setBfcGuests] = useState('2')
  const [bfcOccasion, setBfcOccasion] = useState('')
  const [bfcSeating, setBfcSeating] = useState('')
  const [bfcNotes, setBfcNotes] = useState('')
  const [bfcInternalNote, setBfcInternalNote] = useState('')
  const [bfcSubmitting, setBfcSubmitting] = useState(false)
  const [bfcDone, setBfcDone] = useState<'success' | 'error' | null>(null)
  // Planification séjour — steps
  const [bfcTripStep, setBfcTripStep] = useState<'dest' | 'dates' | 'planner' | 'review'>('dest')
  const [bfcTripDest, setBfcTripDest] = useState('')
  const [bfcTripArrival, setBfcTripArrival] = useState('')
  const [bfcTripDeparture, setBfcTripDeparture] = useState('')
  const [bfcTripDays, setBfcTripDays] = useState<DayPlan[]>([])
  const [bfcTripExpandedDay, setBfcTripExpandedDay] = useState<string | null>(null)
  const [bfcAddingToDay, setBfcAddingToDay] = useState<string | null>(null)
  const [bfcNewBooking, setBfcNewBooking] = useState({ venue: '', time: '', guests: '2', occasion: '', seating: '', specialRequests: '' })
  const [bfcTripSubmitting, setBfcTripSubmitting] = useState(false)
  const [bfcTripDone, setBfcTripDone] = useState<'success' | 'error' | null>(null)

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    try {
      const [resaRes, clientRes] = await Promise.all([
        fetch(`/api/rp/${profile.slug}/reservations`, {
          headers: { 'x-rp-password': password },
        }),
        fetch(`/api/rp/${profile.slug}/clients`, {
          headers: { 'x-rp-password': password },
        }),
      ])
      if (resaRes.ok) {
        const data = await resaRes.json()
        setReservations(Array.isArray(data) ? data : [])
      }
      if (clientRes.ok) {
        const clientData: RPClientNote[] = await clientRes.json()
        // Indexer par email pour lookup O(1)
        const map: Record<string, RPClientNote> = {}
        clientData.forEach(c => { map[c.client_email.toLowerCase()] = c })
        setClientNotes(map)
      }
    } finally {
      setLoading(false)
    }
  }, [password, profile.slug])

  const fetchClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        headers: { 'x-rp-password': password },
      })
      if (res.ok) {
        const data = await res.json()
        setClients(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoadingClients(false)
    }
  }, [password, profile.slug])

  const loadClientNote = useCallback(async (email: string) => {
    setClientNote(null)
    try {
      const res = await fetch(
        `/api/rp/${profile.slug}/clients?email=${encodeURIComponent(email)}`,
        { headers: { 'x-rp-password': password } }
      )
      if (res.ok) {
        const data = await res.json()
        setClientNote(data)
        setEditVipTag(data?.vip_tag ?? '')
        setEditInternalNote(data?.internal_note ?? '')
      }
    } catch {
      // ignore
    }
  }, [password, profile.slug])

  // ── Auto-login depuis localStorage ───────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(RP_STORAGE_KEY(profile.slug))
    if (saved && saved === profile.dashboard_password) {
      setPassword(saved)
      setAuthenticated(true)
    }
  }, [profile.slug, profile.dashboard_password])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === profile.dashboard_password) {
      localStorage.setItem(RP_STORAGE_KEY(profile.slug), password)
      setAuthenticated(true)
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem(RP_STORAGE_KEY(profile.slug))
    localStorage.removeItem('itinera_rp_slug')
    setAuthenticated(false)
    setPassword('')
    router.replace('/register')
  }

  useEffect(() => {
    if (authenticated) fetchReservations()
  }, [authenticated, fetchReservations])

  // Charger la fiche client quand une réservation est sélectionnée
  useEffect(() => {
    if (selected) {
      loadClientNote(selected.email)
      setNoteSaved(false)
      setEditingResa(false)
      setDeleteClientConfirm(false)
      setResaEdit({ venue: selected.establishment, date: '', time: selected.time, guests: String(selected.guests) })
    }
  }, [selected, loadClientNote])

  // Charger les clients quand on change de vue
  useEffect(() => {
    if (authenticated && (mainView === 'clients' || mainView === 'book-for-client')) fetchClients()
  }, [authenticated, mainView, fetchClients])

  // ── LOAD CONNECTED VENUES ─────────────────────────────────────
  // ⚠ CRITIQUE : ce useCallback + useEffect DOIVENT rester ici, AVANT tous
  // les early returns (lignes ~529, 564, 1078, 2129). Sinon, React appelle
  // un nombre différent de hooks selon le render → Rules of Hooks violée
  // → crash production "Application error: a client-side exception".
  const loadConnectedVenues = useCallback(async () => {
    try {
      const res = await fetch(`/api/rp/connect-venue?rpSlug=${profile.slug}`)
      if (res.ok) {
        const data = await res.json()
        setConnectedVenues(Array.isArray(data) ? data : [])
      }
    } catch { /* silently fail */ }
    finally { setConnectedVenuesLoaded(true) }
  }, [profile.slug])

  useEffect(() => {
    if (authenticated && mainView === 'config') loadConnectedVenues()
  }, [authenticated, mainView, loadConnectedVenues])

  const handleResaUpdate = async () => {
    if (!selected || !resaEdit.venue || !resaEdit.date || !resaEdit.time) return
    setResaEditSaving(true)
    try {
      const res = await fetch(`/api/rp/${profile.slug}/reservations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          id: selected.id,
          establishment: resaEdit.venue,
          date: resaEdit.date,
          time: resaEdit.time,
          guests: resaEdit.guests,
        }),
      })
      if (res.ok) {
        const updated = { ...selected, establishment: resaEdit.venue, date: resaEdit.date, time: resaEdit.time, guests: parseInt(resaEdit.guests) }
        setSelected(updated)
        setReservations(prev => prev.map(r => r.id === selected.id ? updated : r))
        setEditingResa(false)
      }
    } catch { /* ignore */ }
    finally { setResaEditSaving(false) }
  }

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setUpdating(id)
    await fetch(`/api/rp/${profile.slug}/reservations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
      body: JSON.stringify({ id, status }),
    })
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev)
    setUpdating(null)
  }

  const saveClientNote = async () => {
    if (!selected) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          clientEmail: selected.email,
          clientName: `${selected.first_name} ${selected.last_name}`,
          vipTag: editVipTag,
          internalNote: editInternalNote,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setClientNote(data)
        // Mettre à jour l'index en temps réel → visible immédiatement dans la liste
        setClientNotes(prev => ({ ...prev, [data.client_email.toLowerCase()]: data }))
        setNoteSaved(true)
        setTimeout(() => setNoteSaved(false), 3000)
      }
    } finally {
      setSavingNote(false)
    }
  }

  const copyMessage = async (r: Reservation) => {
    await navigator.clipboard.writeText(buildWhatsAppMessage(r, profile))
    setCopied(r.id)
    setTimeout(() => setCopied(null), 2500)
  }

  const whatsappToEstablishment = (r: Reservation) => {
    const phone = r.establishment_phone?.replace(/[^0-9]/g, '')
    const msg = buildWhatsAppMessage(r, profile)
    return phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  const whatsappShare = (r: Reservation) =>
    `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(r, profile))}`

  const buildRestaurantWhatsAppMessage = (r: Reservation): string => {
    const confirmUrl = `https://itinera.click/host/confirm/${r.id}`
    const lines = [
      `Bonjour,`,
      ``,
      `Vous avez une demande de réservation ITINERA :`,
      ``,
      `👤 ${r.first_name} ${r.last_name}`,
      `📅 ${r.date} à ${r.time}`,
      `👥 ${r.guests} personne${r.guests > 1 ? 's' : ''}`,
      r.occasion ? `🎉 ${r.occasion}` : '',
      r.special_requests ? `📝 ${r.special_requests}` : '',
      ``,
      `✅ Confirmez ou déclinez ici :`,
      confirmUrl,
      ``,
      `Merci,`,
      `ITINERA`,
    ].filter(l => l !== undefined)
    return lines.join('\n')
  }

  const whatsappToRestaurant = (r: Reservation) => {
    const phone = r.establishment_phone?.replace(/[^0-9]/g, '')
    const msg = buildRestaurantWhatsAppMessage(r)
    return phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
  }

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)
  const counts = {
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    declined: reservations.filter(r => r.status === 'declined').length,
  }

  // ── LOGIN ─────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <p className="text-[10px] tracking-[0.5em] text-[#5B3DF5]/50 uppercase mb-3">Espace RP</p>
            <h1 className="font-playfair text-3xl text-[#F5F5F3]">{profile.display_name}</h1>
            <p className="text-[#F5F5F3]/20 text-xs mt-2 tracking-wider">Dashboard de gestion</p>
          </div>
          <form onSubmit={handleLogin} className="bg-[#141414] border border-white/5 p-8">
            <label className="block text-[9px] tracking-[0.3em] text-[#F5F5F3]/30 uppercase mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm focus:border-white/30 outline-none transition-colors mb-4"
              placeholder="••••••••"
              autoFocus
            />
            {authError && <p className="text-red-400/60 text-xs mb-4">Mot de passe incorrect.</p>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#5B3DF5] to-[#8B5CF6] text-white text-[11px] tracking-[0.25em] uppercase py-3.5 hover:opacity-90 transition-opacity"
            >
              Accéder
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── VUE DÉTAIL ────────────────────────────────────────────────
  if (selected) {
    const msg = buildWhatsAppMessage(selected, profile, clientNote?.internal_note || undefined, clientNote?.vip_tag || undefined)
    const msgPrivate = buildWhatsAppMessage(selected, profile, clientNote?.internal_note || undefined, clientNote?.vip_tag || undefined, true)
    const vipColor = VIP_COLORS[editVipTag] || 'text-[#F5F5F3]/20'

    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-[#F5F5F3]/40 hover:text-[#F5F5F3] p-1 text-lg">←</button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#F5F5F3] truncate">{selected.first_name} {selected.last_name}</p>
            <p className="text-[10px] text-[#F5F5F3]/30 truncate">{selected.establishment}{selected.destination ? ` · ${selected.destination}` : ''} · {selected.date}</p>
            {selected.created_at && (
              <p className="text-[9px] text-[#F5F5F3]/15">
                Reçue le {new Date(selected.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          <span className={`text-[9px] tracking-wider uppercase border px-2 py-1 flex-shrink-0 ${STATUS_STYLES[selected.status]}`}>
            {STATUS_LABELS[selected.status]}
          </span>
        </div>

        <div className="px-4 py-5 space-y-3 pb-24 max-w-2xl mx-auto">

          {/* Réservation */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase">Réservation</p>
              {selected.status !== 'cancelled' && !editingResa && (
                <button
                  onClick={() => {
                    setResaEdit({ venue: selected.establishment, date: '', time: selected.time, guests: String(selected.guests) })
                    setEditingResa(true)
                  }}
                  className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/25 hover:text-[#5B3DF5]/70 transition-colors"
                >
                  ✎ Modifier
                </button>
              )}
            </div>

            {editingResa ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[8px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1.5">Établissement</p>
                  <select
                    className="w-full bg-[#0B0B0B] border border-white/8 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-[#5B3DF5]/40 transition-colors cursor-pointer"
                    value={resaEdit.venue}
                    onChange={e => setResaEdit(p => ({ ...p, venue: e.target.value, time: '' }))}
                  >
                    <option value="" className="bg-[#0B0B0B]">Sélectionner...</option>
                    {configVenues.map(raw => {
                      const vc = parseVenueEntry(raw)
                      return <option key={vc.name} value={vc.name} className="bg-[#0B0B0B]">{vc.name}</option>
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[8px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1.5">Date</p>
                    <input type="date" className="w-full bg-[#0B0B0B] border border-white/8 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-[#5B3DF5]/40 [color-scheme:dark]"
                      value={resaEdit.date} onChange={e => setResaEdit(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-[8px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1.5">Créneau</p>
                    <select className="w-full bg-[#0B0B0B] border border-white/8 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-[#5B3DF5]/40 cursor-pointer"
                      value={resaEdit.time} onChange={e => setResaEdit(p => ({ ...p, time: e.target.value }))}>
                      <option value="" className="bg-[#0B0B0B]">Choisir...</option>
                      {(() => {
                        const vc = configVenues.map(parseVenueEntry).find(v => v.name === resaEdit.venue)
                        const slots = vc?.services?.length ? vc.services : SERVICES_BY_TYPE[vc?.type || 'restaurant']
                        return slots.map(s => <option key={s} value={s} className="bg-[#0B0B0B]">{s}</option>)
                      })()}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-[8px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1.5">Personnes</p>
                  <select className="w-full bg-[#0B0B0B] border border-white/8 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-[#5B3DF5]/40 cursor-pointer"
                    value={resaEdit.guests} onChange={e => setResaEdit(p => ({ ...p, guests: e.target.value }))}>
                    {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => <option key={n} value={n} className="bg-[#0B0B0B]">{n} pers.</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleResaUpdate}
                    disabled={resaEditSaving || !resaEdit.venue || !resaEdit.date || !resaEdit.time}
                    className="flex-1 py-2.5 text-white text-[10px] tracking-[0.2em] uppercase disabled:opacity-30 transition-colors"
                    style={{ background: '#5B3DF5' }}
                  >
                    {resaEditSaving ? 'Enregistrement...' : '✓ Sauvegarder'}
                  </button>
                  <button onClick={() => setEditingResa(false)}
                    className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 border border-white/8 hover:border-white/20 transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-playfair text-xl text-[#F5F5F3] mb-0.5">
                  {selected.establishment}
                  {selected.destination && <span className="text-[#F5F5F3]/30 text-base font-normal"> · {selected.destination}</span>}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Date', value: selected.date },
                    { label: 'Service', value: selected.time },
                    { label: 'Personnes', value: `${selected.guests}` },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-[8px] tracking-wider text-[#F5F5F3]/20 uppercase mb-1">{item.label}</p>
                      <p className="text-[#F5F5F3]/80 text-sm leading-tight">{item.value}</p>
                    </div>
                  ))}
                </div>
                {(selected.occasion || selected.seating) && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-[#F5F5F3]/40">
                    {selected.occasion && <span>🎉 {selected.occasion}</span>}
                    {selected.seating && <span>🪑 {selected.seating}</span>}
                  </div>
                )}
                {selected.special_requests && (
                  <div className="mt-3 pt-3 border-t border-white/5 border-l-2 border-l-[#5B3DF5]/30 pl-3">
                    <p className="text-[#F5F5F3]/40 text-xs italic">{selected.special_requests}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Client */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase">Client</p>
              {editVipTag && (
                <span className={`text-[9px] tracking-[0.15em] uppercase font-medium ${vipColor}`}>
                  ✦ {editVipTag}
                </span>
              )}
            </div>
            <p className="text-[#F5F5F3] font-medium mb-3">{selected.first_name} {selected.last_name}</p>
            <div className="space-y-2">
              <a href={`tel:${selected.phone}`} className="flex items-center gap-3 text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
                <span>📞</span><span className="text-sm">{selected.phone}</span>
              </a>
              <a href={`mailto:${selected.email}`} className="flex items-center gap-3 text-[#F5F5F3]/50 hover:text-[#F5F5F3] transition-colors">
                <span>✉️</span><span className="text-sm">{selected.email}</span>
              </a>
            </div>
            {clientNote?.internal_note && (() => {
              const cp = parseClientProfile(clientNote.internal_note)
              return (
                <div className="mt-3 pt-3 border-t border-white/5 border-l-2 border-l-amber-500/30 pl-3">
                  <p className="text-[8px] tracking-wider text-amber-400/40 uppercase mb-1">Note privée</p>
                  {cp.note && <p className="text-[#F5F5F3]/40 text-xs italic mb-1">{cp.note}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {cp.nationality && <span className="text-[10px] text-[#F5F5F3]/30">🌍 {cp.nationality}</span>}
                    {cp.products.map(p => (
                      <span key={p} className="text-[10px] text-amber-400/70">🍾 {p}</span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* WhatsApp */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-3">Envoyer sur WhatsApp</p>
            <div className="bg-[#0B0B0B] p-3 rounded mb-3 font-mono text-[10px] text-[#F5F5F3]/30 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
              {msg}
            </div>
            <div className="space-y-2">
              {/* Mode Public — coordonnées client visibles */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white text-[11px] tracking-[0.2em] uppercase py-3.5 hover:opacity-90 transition-opacity"
              >
                <WhatsAppIcon /> Transférer — mode public
              </a>
              {/* Mode Privé — coordonnées RP à la place du client */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(msgPrivate)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-[#25D366]/30 text-[#25D366]/70 text-[11px] tracking-[0.2em] uppercase py-3 hover:bg-[#25D366]/5 hover:border-[#25D366]/50 hover:text-[#25D366] transition-all"
              >
                <WhatsAppIcon /> Transférer — mode privé
              </a>
              <button
                onClick={() => copyMessage(selected)}
                className="flex items-center justify-center gap-2 w-full border border-white/8 text-[#F5F5F3]/30 text-[11px] tracking-[0.2em] uppercase py-3 hover:border-white/15 transition-colors"
              >
                {copied === selected.id ? '✓ Copié !' : '📋 Copier le message'}
              </button>
            </div>
          </div>

          {/* Actions statut — masqué seulement si annulé par le client */}
          {selected.status !== 'cancelled' && (
            <div className="bg-[#141414] border border-white/5 p-5">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-4">Modifier le statut</p>
              <div className="grid grid-cols-2 gap-2">

                {/* ✓ Confirmer — disponible si pas déjà confirmé */}
                {selected.status !== 'confirmed' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'confirmed')}
                    disabled={!!updating}
                    className="col-span-1 py-3.5 text-[10px] tracking-[0.2em] uppercase bg-green-500/8 border border-green-500/20 text-green-400 hover:bg-green-500/15 transition-colors disabled:opacity-40"
                  >
                    ✓ Confirmer
                  </button>
                )}

                {/* ✕ Refuser — disponible si pas déjà refusé */}
                {selected.status !== 'declined' && (
                  <button
                    onClick={() => updateStatus(selected.id, 'declined')}
                    disabled={!!updating}
                    className="col-span-1 py-3.5 text-[10px] tracking-[0.2em] uppercase bg-red-500/8 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                  >
                    ✕ Refuser
                  </button>
                )}

                {/* ↩ Remettre en attente — disponible si confirmé ou refusé */}
                {(selected.status === 'confirmed' || selected.status === 'declined') && (
                  <button
                    onClick={() => updateStatus(selected.id, 'pending')}
                    disabled={!!updating}
                    className="col-span-2 py-3 text-[10px] tracking-[0.2em] uppercase border border-white/10 text-[#F5F5F3]/30 hover:border-white/20 hover:text-[#F5F5F3]/50 transition-colors disabled:opacity-40"
                  >
                    ↩ Remettre en attente
                  </button>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Renvoyer l'email de bienvenue ────────────────────────────
  const resendWelcomeEmail = async (c: RPClientNote) => {
    setResendingWelcome(c.client_email)
    try {
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          clientEmail: c.client_email,
          clientName: c.client_name,
          vipTag: c.vip_tag,
          internalNote: c.internal_note,
          sendWelcome: true,
          forceWelcome: true,
        }),
      })
      const d = await res.json()
      if (d.emailError) {
        alert(`Erreur email : ${d.emailError}`)
      } else if (d.welcomeEmailSent) {
        // succès — l'état resendingWelcome affiche "✓ Envoyé"
      } else {
        alert('Email non envoyé — vérifiez la configuration Resend (RESEND_API_KEY)')
      }
    } catch (err) {
      alert(`Erreur réseau : ${err}`)
    } finally {
      setTimeout(() => setResendingWelcome(null), 3000)
    }
  }

  // ── Sauvegarder le profil d'un client ────────────────────────
  const saveClientProfile = async (c: RPClientNote) => {
    setSavingClientProfile(true)
    try {
      const serializedNote = serializeClientProfile(editClientNote, editClientNat, editClientProducts)
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          clientEmail: c.client_email,
          clientName: c.client_name,
          vipTag: editClientVip,
          internalNote: serializedNote,
          sendWelcome: false,
        }),
      })
      if (res.ok) {
        await res.json()
        setClients(prev => prev.map(cl => cl.client_email === c.client_email ? { ...cl, vip_tag: editClientVip, internal_note: serializedNote } : cl))
        setEditingClientEmail(null)
      }
    } catch { /* ignore */ }
    finally { setSavingClientProfile(false) }
  }

  // ── Ajouter un client ─────────────────────────────────────────
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addClientEmail.trim()) return
    setAddClientLoading(true)
    setAddClientError('')
    setAddClientSuccess('')
    try {
      const res = await fetch(`/api/rp/${profile.slug}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          clientEmail: addClientEmail.trim().toLowerCase(),
          clientName: addClientName.trim(),
          vipTag: '',
          internalNote: '',
          sendWelcome: true,
        }),
      })
      if (res.ok) {
        const d = await res.json()
        const clientName = addClientName.trim()
        const clientEmail = addClientEmail.trim().toLowerCase()
        setLastAddedClient({ email: clientEmail, name: clientName })
        if (d.emailError) {
          setAddClientSuccess(`✓ ${clientName || clientEmail} ajouté`)
          setAddClientError(`Email non envoyé : ${d.emailError}`)
        } else {
          const emailSent = d.welcomeEmailSent ? ' · Email envoyé ✓' : ''
          setAddClientSuccess(`✓ ${clientName || clientEmail} ajouté${emailSent}`)
        }
        setAddClientEmail('')
        setAddClientName('')
        setAddClientOpen(false)
        setInviteLinkCopied(false)
        fetchClients()
      } else {
        const d = await res.json()
        setAddClientError(d.error || 'Erreur lors de l\'ajout.')
      }
    } catch {
      setAddClientError('Erreur réseau.')
    } finally {
      setAddClientLoading(false)
    }
  }

  // ── CONNECT TO VENUE ──────────────────────────────────────────
  const connectToVenue = async () => {
    const code = venueInviteInput.trim().toUpperCase()
    if (!code) return
    setVenueConnecting(true)
    setVenueConnectMsg(null)
    try {
      const res = await fetch('/api/rp/connect-venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rpSlug: profile.slug, inviteCode: code }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.alreadyConnected) {
          setVenueConnectMsg({ type: 'success', text: `Vous êtes déjà connecté à ${data.venueName}.` })
        } else {
          setVenueConnectMsg({ type: 'success', text: `✓ Connecté à ${data.venueName} ! Vos réservations y apparaîtront désormais.` })
          // Refresh the list
          setConnectedVenuesLoaded(false)
          setConnectedVenues([])
          setTimeout(async () => {
            const r = await fetch(`/api/rp/connect-venue?rpSlug=${profile.slug}`)
            if (r.ok) setConnectedVenues(await r.json())
            setConnectedVenuesLoaded(true)
          }, 500)
        }
        setVenueInviteInput('')
      } else {
        setVenueConnectMsg({ type: 'error', text: data.error || 'Erreur inconnue.' })
      }
    } catch {
      setVenueConnectMsg({ type: 'error', text: 'Erreur réseau. Réessayez.' })
    } finally {
      setVenueConnecting(false)
    }
  }

  // ── SAVE CONFIG ───────────────────────────────────────────────
  const saveConfig = async () => {
    setConfigSaving(true)
    setConfigError('')
    try {
      const res = await fetch(`/api/rp/${profile.slug}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-rp-password': password },
        body: JSON.stringify({
          activated_destinations: configDests,
          activated_venues: configVenues,
          logo_text: configLogoText,
          whatsapp: configWhatsapp.trim() || null,
          notification_pref: configNotifPref,
        }),
      })
      if (res.ok) {
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
      } else {
        const d = await res.json()
        setConfigError(d.error || 'Erreur lors de la sauvegarde.')
      }
    } catch {
      setConfigError('Erreur réseau.')
    } finally {
      setConfigSaving(false)
    }
  }

  const toggleDest = (slug: string) => {
    setConfigDests(prev =>
      prev.includes(slug) ? prev.filter(d => d !== slug) : [...prev, slug]
    )
  }

  const addCustomCity = () => {
    const name = newCityName.trim()
    if (!name) return
    const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    // Vérifier que ce slug n'existe pas déjà
    if (configDests.includes(slug)) return
    const isExisting = configDests.some(raw => { try { return JSON.parse(raw).slug === slug } catch { return false } })
    if (isExisting) return
    const entry = JSON.stringify({ slug, name, country: newCityCountry.trim() || '', emoji: '📍', active: true })
    setConfigDests(prev => [...prev, entry])
    setNewCityName('')
    setNewCityCountry('')
  }

  const toggleCustomCity = (slug: string) => {
    setConfigDests(prev => prev.map(d => {
      try {
        const p = JSON.parse(d)
        if (p?.slug !== slug) return d
        return JSON.stringify({ ...p, active: p.active === false })
      } catch { return d }
    }))
  }

  const removeCustomCity = (raw: string) => {
    setConfigDests(prev => prev.filter(d => d !== raw))
  }

  const addCustomVenue = () => {
    const name = newVenueName.trim()
    setAddVenueError('')

    // ── Validation : nom obligatoire ─────────────────────────────
    if (!name) {
      setAddVenueError('Le nom du restaurant est obligatoire.')
      return
    }
    // ── Validation : ville obligatoire ───────────────────────────
    if (!newVenueDest) {
      setAddVenueError('Veuillez sélectionner une ville.')
      return
    }
    // ── Validation : au moins un créneau obligatoire ─────────────
    if (newVenueServices.length === 0) {
      setAddVenueError('Veuillez sélectionner au moins un créneau de service.')
      setShowServicePicker(true)
      return
    }
    // ── Doublon ──────────────────────────────────────────────────
    const existing = configVenues.map(parseVenueEntry)
    if (existing.some(v => v.name.toLowerCase() === name.toLowerCase())) {
      setAddVenueError(`"${name}" est déjà dans votre liste.`)
      return
    }
    const serialized = serializeVenueEntry({
      name,
      destination: newVenueDest,
      services: newVenueServices,
      type: newVenueType,
    })
    setConfigVenues(prev => [...prev, serialized])
    setNewVenueName('')
    setNewVenueDest('')
    setNewVenueServices([])
    setNewVenueType('restaurant')
    setShowServicePicker(false)
    setAddVenueError('')
  }

  const removeVenue = (raw: string) => {
    setConfigVenues(prev => prev.filter(v => v !== raw))
  }

  const toggleVenueActive = (raw: string) => {
    setConfigVenues(prev => prev.map(v => {
      if (v !== raw) return v
      const vc = parseVenueEntry(v)
      const updated = { ...vc, active: vc.active === false ? undefined : false }
      return serializeVenueEntry(updated)
    }))
  }

  const toggleNewVenueService = (s: string) => {
    setNewVenueServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  // ── VUE CONFIGURATION ─────────────────────────────────────────
  if (mainView === 'config') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase">Configuration</p>
            <h1 className="font-playfair text-lg text-[#F5F5F3]">{profile.display_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveConfig}
              disabled={configSaving}
              className="text-[10px] tracking-[0.2em] uppercase px-4 py-2 transition-colors disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${configAccent}, ${configAccent}bb)`, color: 'white' }}
            >
              {configSaving ? '...' : configSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => setMainView('list')}
              className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 transition-colors border border-white/5 hover:border-white/15 px-3 py-2"
            >
              ← Retour
            </button>
          </div>
        </div>

        {configError && (
          <div className="mx-4 mt-4 border border-red-500/20 bg-red-500/5 text-red-400 text-sm px-4 py-3">
            {configError}
          </div>
        )}

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">

          {/* ── Lien d'invitation ── */}
          <div className="bg-[#141414] border border-[#5B3DF5]/20 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-3">Votre lien d'invitation</p>
            <p className="text-[#F5F5F3]/30 text-xs mb-4 leading-relaxed">
              Partagez ce lien à vos guests pour accéder à votre espace.
            </p>
            <div className="bg-[#0B0B0B] border border-white/8 px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-[#5B3DF5] text-sm font-mono truncate">
                itinera.click/{profile.slug}/mon-espace
              </span>
              <button
                onClick={() => {
                  const url = `https://itinera.click/${profile.slug}/mon-espace`
                  navigator.clipboard.writeText(url)
                  setCopied('invite')
                  setTimeout(() => setCopied(null), 2000)
                }}
                className="text-[9px] tracking-[0.2em] uppercase text-[#5B3DF5]/60 hover:text-[#5B3DF5] transition-colors flex-shrink-0 border border-[#5B3DF5]/20 hover:border-[#5B3DF5]/50 px-3 py-1.5"
              >
                {copied === 'invite' ? '✓ Copié !' : 'Copier le lien'}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div className="text-[#F5F5F3]/20">
                Lien guest : <span className="text-[#F5F5F3]/35 font-mono">/{profile.slug}/mon-espace</span>
              </div>
              <div className="text-[#F5F5F3]/20">
                Dashboard : <span className="text-[#F5F5F3]/35 font-mono">/{profile.slug}/dashboard</span>
              </div>
            </div>
          </div>

          {/* ── Message d'invitation WhatsApp ── */}
          {(() => {
            const inviteUrl = `https://itinera.click/${profile.slug}/mon-espace`
            const waMessage = `Welcome to ITINERA

Your private access to find your reservations, confirmations and hospitality planning in one place.

👉 Access your space:
${inviteUrl}

Quick login by email.
No application needed.

${profile.display_name}`

            return (
              <div className="bg-[#141414] border border-[#5B3DF5]/15 p-5">
                <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-1">Message d'invitation</p>
                <p className="text-[#F5F5F3]/25 text-xs mb-4 leading-relaxed">
                  Copiez ce message prêt à envoyer à vos clients — le lien est déjà inclus.
                </p>

                {/* Aperçu du message */}
                <div className="bg-[#0B0B0B] border border-white/6 p-4 mb-3 rounded-sm">
                  <p className="text-[#F5F5F3]/50 text-[12px] leading-relaxed whitespace-pre-wrap font-mono">
                    {waMessage}
                  </p>
                </div>

                {/* Boutons — empilés icône au-dessus + texte centré, supporte le wrap */}
                <div className="flex gap-2">
                  {/* Copier */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(waMessage)
                      setCopied('wa-message')
                      setTimeout(() => setCopied(null), 2500)
                    }}
                    className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-3 text-[10px] tracking-[0.2em] uppercase border transition-all text-center ${
                      copied === 'wa-message'
                        ? 'border-[#5B3DF5]/50 text-[#5B3DF5] bg-[#5B3DF5]/8'
                        : 'border-white/10 text-[#F5F5F3]/40 hover:border-[#5B3DF5]/30 hover:text-[#5B3DF5]/70'
                    }`}
                  >
                    {copied === 'wa-message' ? (
                      <span className="text-center">✓ Copié !</span>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                        <span className="text-center leading-tight">Copier le message</span>
                      </>
                    )}
                  </button>

                  {/* Envoyer via WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 text-[10px] tracking-[0.2em] uppercase border border-[#25D366]/20 text-[#25D366]/60 hover:bg-[#25D366]/8 hover:text-[#25D366]/90 hover:border-[#25D366]/40 transition-all text-center"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.054 23.486a.75.75 0 00.921.921l5.624-1.478A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.741 9.741 0 01-5.002-1.378l-.36-.214-3.733.981.998-3.648-.235-.374A9.712 9.712 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                    </svg>
                    <span className="text-center leading-tight">Envoyer via WhatsApp</span>
                  </a>
                </div>
              </div>
            )
          })()}

          {/* ── Profil ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-4">Profil public</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[8px] tracking-wider text-[#F5F5F3]/30 uppercase mb-1.5">Texte logo</label>
                <input
                  type="text"
                  value={configLogoText}
                  onChange={e => setConfigLogoText(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 transition-colors"
                  placeholder="ÉLITE"
                />
              </div>
            </div>
          </div>

          {/* ── Notifications WhatsApp ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-1">Notifications</p>
            <p className="text-[#F5F5F3]/25 text-xs mb-4 leading-relaxed">
              Recevez chaque nouvelle réservation par email et/ou WhatsApp.
            </p>

            {/* Numéro WhatsApp */}
            <div className="mb-4">
              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/30 uppercase mb-1.5">
                Votre numéro WhatsApp
              </label>
              <input
                type="tel"
                value={configWhatsapp}
                onChange={e => setConfigWhatsapp(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-[#25D366]/40 transition-colors placeholder-[#F5F5F3]/20"
              />
              <p className="text-[#F5F5F3]/20 text-[10px] mt-1">Format international : +33 6 XX XX XX XX</p>
            </div>

            {/* Préférence de notification */}
            <div>
              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/30 uppercase mb-2">
                Je veux recevoir mes réservations
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'email', label: '✉️ Email', desc: 'Email seulement' },
                  { value: 'whatsapp', label: '📲 WhatsApp', desc: 'WhatsApp seulement' },
                  { value: 'both', label: '✉️ + 📲 Les deux', desc: 'Email et WhatsApp' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfigNotifPref(opt.value)}
                    className={`px-3 py-3 text-[9px] tracking-wide border transition-all text-center ${
                      configNotifPref === opt.value
                        ? 'border-[#25D366]/50 bg-[#25D366]/10 text-[#F5F5F3]'
                        : 'border-white/8 text-[#F5F5F3]/40 hover:border-white/15 hover:text-[#F5F5F3]/60'
                    }`}
                  >
                    <div className="text-sm mb-1">{opt.label.split(' ')[0]}</div>
                    <div className="uppercase tracking-wider">{opt.desc}</div>
                  </button>
                ))}
              </div>
              {configNotifPref !== 'email' && !configWhatsapp.trim() && (
                <p className="text-amber-400/60 text-[10px] mt-2">
                  ⚠️ Entrez votre numéro WhatsApp pour activer cette option.
                </p>
              )}
              {configNotifPref !== 'email' && configWhatsapp.trim() && (
                <p className="text-[#25D366]/60 text-[10px] mt-2">
                  📲 Chaque réservation apparaîtra dans votre email avec un bouton "Voir sur WhatsApp" pour l'ouvrir directement.
                </p>
              )}
            </div>
          </div>

          {/* ── Destinations ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase">Destinations actives</p>
              <span className="text-[10px] text-[#F5F5F3]/40">{configDests.length} active{configDests.length > 1 ? 's' : ''}</span>
            </div>

            {/* Grille unifiée — prédéfinies + personnalisées toutes triées A→Z ensemble */}
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                // 1. Construire la liste unifiée
                type UnifiedDest = {
                  slug: string
                  name: string
                  emoji?: string
                  country?: string
                  isCustom: boolean
                  isActive: boolean
                  rawCustom?: string  // entrée brute JSON pour les customs (toggle)
                }
                const all: UnifiedDest[] = []
                // — Prédéfinies
                for (const d of ALL_DESTINATIONS) {
                  all.push({
                    slug: d.slug,
                    name: d.name,
                    emoji: d.emoji,
                    isCustom: false,
                    isActive: configDests.includes(d.slug),
                  })
                }
                // — Custom (parse JSON)
                for (const raw of configDests) {
                  try {
                    const p = JSON.parse(raw)
                    if (p?.slug && p?.name) {
                      all.push({
                        slug: p.slug,
                        name: p.name,
                        emoji: p.emoji || '📍',
                        country: p.country,
                        isCustom: true,
                        isActive: p.active !== false,
                        rawCustom: raw,
                      })
                    }
                  } catch { /* ignore */ }
                }
                // 2. Trier tout par nom A→Z (locale FR)
                all.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

                // 3. Render
                return all.map(d => (
                  <button
                    key={d.isCustom ? `custom-${d.slug}` : d.slug}
                    type="button"
                    onClick={() => d.isCustom ? toggleCustomCity(d.slug) : toggleDest(d.slug)}
                    className={`flex items-center gap-3 p-3 border text-left transition-all ${
                      d.isActive
                        ? 'border-[#5B3DF5]/50 bg-[#5B3DF5]/8 text-[#F5F5F3]'
                        : 'border-white/5 text-[#F5F5F3]/30 hover:border-white/15'
                    }`}
                  >
                    <span className="text-lg">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{d.name}</p>
                      {d.country && <p className="text-[9px] text-[#F5F5F3]/30 truncate">{d.country}</p>}
                    </div>
                    <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center ${
                      d.isActive ? 'border-[#5B3DF5] bg-[#5B3DF5]' : 'border-white/15'
                    }`}>
                      {d.isActive && <span className="text-white text-[10px]">✓</span>}
                    </div>
                  </button>
                ))
              })()}
            </div>

            <p className="text-[#F5F5F3]/20 text-[10px] mt-3">
              Si aucune destination n'est sélectionnée, toutes sont accessibles.
            </p>

            {/* Supprimer une ville custom — section séparée, hors de la grille */}
            {configDests.some(raw => { try { const p = JSON.parse(raw); return !!(p?.slug && p?.name) } catch { return false } }) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {configDests.map(raw => {
                  let city: { slug: string; name: string } | null = null
                  try { const p = JSON.parse(raw); if (p?.slug && p?.name) city = p } catch {}
                  if (!city) return null
                  return (
                    <button
                      key={city.slug}
                      type="button"
                      onClick={() => removeCustomCity(raw)}
                      className="flex items-center gap-1.5 text-[9px] text-[#F5F5F3]/25 hover:text-red-400/60 border border-white/8 hover:border-red-400/20 px-2 py-1 transition-colors"
                    >
                      <span>{city.name}</span>
                      <span>✕</span>
                    </button>
                  )
                })}
                <p className="w-full text-[9px] text-[#F5F5F3]/15 mt-0.5">Cliquez sur une ville pour la supprimer définitivement</p>
              </div>
            )}

            {/* ── Ajouter une ville ── */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 mb-3">+ Ajouter une ville non listée</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCity() } }}
                  placeholder="Nom de la ville…"
                  className="flex-1 bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2 text-sm outline-none focus:border-white/25 placeholder-[#F5F5F3]/20 transition-colors"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCityCountry}
                    onChange={e => setNewCityCountry(e.target.value)}
                    placeholder="Pays"
                    className="flex-1 sm:w-28 bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2 text-sm outline-none focus:border-white/25 placeholder-[#F5F5F3]/20 transition-colors"
                  />
                  <button
                    onClick={addCustomCity}
                    disabled={!newCityName.trim()}
                    className="px-4 py-2 border border-[#5B3DF5]/40 text-[#5B3DF5]/70 text-[11px] tracking-[0.2em] uppercase hover:bg-[#5B3DF5]/8 transition-colors disabled:opacity-30 flex-shrink-0"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Connexions venue partenaires ── */}
          <div className="bg-[#141414] border border-[#5B3DF5]/20 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-1">Venues partenaires</p>
            <p className="text-[#F5F5F3]/25 text-xs mb-4 leading-relaxed">
              Connectez-vous à un restaurant ou venue partenaire grâce au code d'invitation qu'ils vous ont fourni. Vos réservations apparaîtront directement dans leur dashboard.
            </p>

            {/* Input code */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={venueInviteInput}
                onChange={e => setVenueInviteInput(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); connectToVenue() } }}
                placeholder="Code d'invitation (ex: AB3X7K2M)"
                maxLength={12}
                className="flex-1 bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-[#5B3DF5]/40 transition-colors placeholder-[#F5F5F3]/20 font-mono tracking-wider uppercase"
              />
              <button
                onClick={connectToVenue}
                disabled={venueConnecting || !venueInviteInput.trim()}
                className="px-4 py-2 border border-[#5B3DF5]/40 text-[#5B3DF5]/70 text-[10px] tracking-[0.2em] uppercase hover:bg-[#5B3DF5]/8 transition-colors disabled:opacity-30 flex-shrink-0"
              >
                {venueConnecting ? '...' : 'Connecter'}
              </button>
            </div>

            {venueConnectMsg && (
              <div className={`text-[11px] px-3 py-2 mb-3 border ${
                venueConnectMsg.type === 'success'
                  ? 'text-emerald-400/80 border-emerald-400/20 bg-emerald-400/5'
                  : 'text-red-400/80 border-red-400/20 bg-red-400/5'
              }`}>
                {venueConnectMsg.text}
              </div>
            )}

            {/* List of connected venues */}
            {connectedVenues.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F5F3]/20 mb-2">Venues connectés ({connectedVenues.length})</p>
                {connectedVenues.map(v => (
                  <div key={v.venue_slug} className="flex items-center justify-between bg-[#0B0B0B] border border-white/5 px-3 py-2.5">
                    <div>
                      <p className="text-[#F5F5F3]/70 text-sm">{v.venue_name}</p>
                      {v.created_at && (
                        <p className="text-[#F5F5F3]/20 text-[9px] mt-0.5">
                          depuis {new Date(v.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] tracking-[0.15em] uppercase text-emerald-400/60 border border-emerald-400/20 px-2 py-0.5">✓</span>
                  </div>
                ))}
              </div>
            )}

            {connectedVenuesLoaded && connectedVenues.length === 0 && (
              <p className="text-[#F5F5F3]/15 text-[10px] text-center py-2">Aucun venue connecté pour l'instant.</p>
            )}
          </div>

          {/* ── Restaurants & Venues ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-1">Restaurants & venues</p>
            <div className="flex items-center gap-2 bg-green-500/5 border border-green-500/15 px-3 py-2 mb-5">
              <span className="text-green-400 text-sm">✓</span>
              <p className="text-green-400/70 text-[11px]">
                Chaque restaurant ajouté ici apparaît automatiquement dans le formulaire de réservation du client.
              </p>
            </div>

            {/* ── Formulaire ajout venue ── */}
            <div className="bg-[#0B0B0B] border border-white/8 p-4 mb-4 space-y-3">
              {/* Ligne 1 : ville + nom */}
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newVenueDest}
                  onChange={e => setNewVenueDest(e.target.value)}
                  required
                  className={`bg-[#141414] border text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 transition-colors sm:w-44 flex-shrink-0 ${
                    !newVenueDest && addVenueError ? 'border-amber-400/40' : 'border-white/10'
                  }`}
                >
                  <option value="" className="bg-[#141414]">Ville *</option>
                  {/* Liste combinée prédéfinies + custom, triée A→Z */}
                  {[
                    ...ALL_DESTINATIONS.map(d => ({ slug: d.slug, name: d.name, custom: false })),
                    ...configDests
                      .map(raw => {
                        try {
                          const p = JSON.parse(raw)
                          if (p?.slug && p?.name) return { slug: p.slug, name: p.name, custom: true }
                        } catch {}
                        return null
                      })
                      .filter((d): d is { slug: string; name: string; custom: boolean } => d !== null),
                  ]
                    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                    .map(d => (
                      <option key={d.slug} value={d.slug} className="bg-[#141414]">
                        {d.name}{d.custom ? ' (custom)' : ''}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  value={newVenueName}
                  onChange={e => { setNewVenueName(e.target.value); setAddVenueError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomVenue() } }}
                  placeholder="Nom du restaurant ou venue…"
                  className="flex-1 bg-[#141414] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 placeholder-[#F5F5F3]/20 transition-colors"
                />
              </div>

              {/* Type de venue */}
              <div>
                <p className="text-[8px] tracking-[0.2em] uppercase text-[#F5F5F3]/25 mb-2">Catégorie</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { key: 'restaurant', label: '🍽️ Restaurant' },
                    { key: 'beach_club', label: '🏖️ Beach Club' },
                    { key: 'night_club', label: '🎉 Night Club' },
                  ] as { key: VenueType; label: string }[]).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setNewVenueType(key); setNewVenueServices([]); setShowServicePicker(false) }}
                      className={`px-2 py-2 text-[10px] tracking-[0.1em] border transition-all ${
                        newVenueType === key
                          ? 'border-[#5B3DF5]/50 bg-[#5B3DF5]/10 text-[#F5F5F3]/80'
                          : 'border-white/10 text-[#F5F5F3]/30 hover:border-white/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ligne 2 : créneaux (obligatoire) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowServicePicker(p => !p)}
                  className="text-[10px] tracking-[0.2em] uppercase text-[#5B3DF5]/60 hover:text-[#5B3DF5] transition-colors flex items-center gap-2"
                >
                  <span>{showServicePicker ? '▾' : '▸'}</span>
                  Créneaux de service *
                  {newVenueServices.length > 0 ? (
                    <span className="bg-[#5B3DF5]/20 text-[#5B3DF5]/80 text-[9px] px-2 py-0.5 rounded-full">
                      {newVenueServices.length} sélectionné{newVenueServices.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="bg-amber-400/15 text-amber-400/80 text-[9px] px-2 py-0.5 rounded-full">
                      requis
                    </span>
                  )}
                </button>

                {showServicePicker && (
                  <div className="mt-3 grid grid-cols-1 gap-1.5">
                    <p className="text-[9px] tracking-[0.2em] uppercase text-amber-400/60 mb-1">
                      Sélectionnez au moins un créneau (obligatoire)
                    </p>
                    {SERVICES_BY_TYPE[newVenueType].map(s => (
                      <label key={s} className="flex items-center gap-3 cursor-pointer group">
                        <div
                          onClick={() => toggleNewVenueService(s)}
                          className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                            newVenueServices.includes(s)
                              ? 'border-[#5B3DF5] bg-[#5B3DF5]/20'
                              : 'border-white/15 hover:border-white/30'
                          }`}
                        >
                          {newVenueServices.includes(s) && (
                            <svg className="w-2.5 h-2.5 text-[#5B3DF5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          onClick={() => toggleNewVenueService(s)}
                          className={`text-xs transition-colors ${newVenueServices.includes(s) ? 'text-[#F5F5F3]/80' : 'text-[#F5F5F3]/35 group-hover:text-[#F5F5F3]/55'}`}
                        >
                          {s}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton ajouter — nom + ville + au moins 1 créneau requis */}
              <button
                type="button"
                onClick={addCustomVenue}
                disabled={!newVenueName.trim() || !newVenueDest || newVenueServices.length === 0}
                className="w-full py-2.5 border border-[#5B3DF5]/40 text-[#5B3DF5]/70 text-[11px] tracking-[0.2em] uppercase hover:bg-[#5B3DF5]/8 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  !newVenueName.trim() ? 'Nom du restaurant requis'
                  : !newVenueDest ? 'Ville requise'
                  : newVenueServices.length === 0 ? 'Au moins un créneau requis'
                  : 'Ajouter'
                }
              >
                + Ajouter à ma liste
              </button>
              {addVenueError && (
                <p className="text-amber-400/70 text-[11px] text-center border border-amber-400/15 bg-amber-400/5 px-3 py-2">
                  {addVenueError}
                </p>
              )}
            </div>

            {/* ── Liste venues actifs ── */}
            {configVenues.length > 0 ? (
              <div className="space-y-4">
                {([
                  { key: 'restaurant', label: '🍽️ Restaurants' },
                  { key: 'beach_club', label: '🏖️ Beach Clubs' },
                  { key: 'night_club', label: '🎉 Night Clubs' },
                ] as { key: string; label: string }[]).map(({ key, label }) => {
                  const group = configVenues.filter(raw => {
                    const vc = parseVenueEntry(raw)
                    const t = vc.type || 'restaurant'
                    return t === key
                  })
                  if (group.length === 0) return null
                  return (
                    <div key={key}>
                      <p className="text-[8px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 mb-1.5">{label}</p>
                      <div className="space-y-1.5">
                        {group.map((raw, idx) => {
                          const vc = parseVenueEntry(raw)
                          const isActive = vc.active !== false
                          return (
                            <div key={idx} className={`flex items-center gap-3 border px-3 py-2.5 transition-all ${isActive ? 'bg-[#0B0B0B] border-white/5' : 'bg-[#0B0B0B]/40 border-white/3 opacity-50'}`}>
                              {vc.destination && (
                                <span className="text-[9px] tracking-[0.15em] uppercase text-[#5B3DF5]/50 flex-shrink-0 hidden sm:block">
                                  {vc.destination.replace(/-/g, ' ')}
                                </span>
                              )}
                              <span className={`text-sm flex-1 truncate ${isActive ? 'text-[#F5F5F3]/70' : 'text-[#F5F5F3]/25 line-through'}`}>{vc.name}</span>
                              {vc.services && vc.services.length > 0 ? (
                                <span className="text-[9px] text-[#F5F5F3]/25 flex-shrink-0">
                                  {vc.services.length} créneau{vc.services.length > 1 ? 'x' : ''}
                                </span>
                              ) : (
                                <span className="text-[9px] text-[#F5F5F3]/15 flex-shrink-0">tous</span>
                              )}
                              {/* Toggle actif/inactif */}
                              <button
                                onClick={() => toggleVenueActive(raw)}
                                title={isActive ? 'Désactiver' : 'Activer'}
                                className={`flex-shrink-0 w-8 h-4 rounded-full transition-all relative ${isActive ? 'bg-[#5B3DF5]' : 'bg-white/10'}`}
                              >
                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isActive ? 'right-0.5' : 'left-0.5'}`} />
                              </button>
                              {/* Supprimer définitivement */}
                              <button
                                onClick={() => removeVenue(raw)}
                                title="Supprimer définitivement"
                                className="text-[#F5F5F3]/15 hover:text-red-400/60 transition-colors text-base flex-shrink-0"
                              >
                                🗑
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[#F5F5F3]/20 text-xs italic text-center py-4">
                Aucun établissement configuré.
              </p>
            )}
          </div>

          {/* ── Zone dangereuse ── */}
          <div className="mt-10 border border-red-500/15 bg-red-500/5 p-5">
            <p className="text-[9px] tracking-[0.4em] uppercase text-red-400/50 mb-1">Zone dangereuse</p>
            <p className="text-[#F5F5F3]/25 text-xs mb-5 leading-relaxed">
              Ces actions sont irréversibles. Utilisez uniquement pour repartir de zéro lors de tests.
            </p>

            {dangerDone ? (
              <div className="text-center py-4 text-green-400/70 text-xs tracking-wide">
                ✓ {dangerDone}
              </div>
            ) : dangerConfirm === null ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setDangerConfirm('reservations')}
                  className="flex-1 py-2.5 border border-red-500/20 text-red-400/50 text-[10px] tracking-[0.2em] uppercase hover:bg-red-500/8 hover:border-red-500/40 hover:text-red-400/80 transition-all"
                >
                  Effacer toutes mes réservations
                </button>
                <button
                  onClick={() => setDangerConfirm('account')}
                  className="flex-1 py-2.5 border border-red-500/30 text-red-400/60 text-[10px] tracking-[0.2em] uppercase hover:bg-red-500/12 hover:border-red-500/60 hover:text-red-400 transition-all"
                >
                  Supprimer mon compte complet
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-red-300/80 text-sm text-center">
                  {dangerConfirm === 'reservations'
                    ? 'Toutes vos réservations seront supprimées définitivement.'
                    : 'Votre compte et toutes vos données seront supprimés. Vous retournerez en mode démo.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDangerConfirm(null)}
                    disabled={dangerLoading}
                    className="flex-1 py-2.5 border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase hover:border-white/20 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    disabled={dangerLoading}
                    onClick={async () => {
                      setDangerLoading(true)
                      try {
                        const res = await fetch(`/api/rp/${profile.slug}/config`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-rp-password': password,
                          },
                          body: JSON.stringify({ deleteProfile: dangerConfirm === 'account' }),
                        })
                        if (res.ok) {
                          if (dangerConfirm === 'account') {
                            setDangerDone('Compte supprimé. Rechargez la page.')
                            setTimeout(() => { window.location.href = '/' }, 2500)
                          } else {
                            setDangerDone('Réservations effacées avec succès.')
                            setDangerConfirm(null)
                            setTimeout(() => { setDangerDone('') }, 4000)
                          }
                        } else {
                          const d = await res.json().catch(() => ({}))
                          setDangerDone(`Erreur : ${d.error || res.status}`)
                        }
                      } finally {
                        setDangerLoading(false)
                      }
                    }}
                    className="flex-1 py-2.5 bg-red-600/20 border border-red-500/50 text-red-300 text-[10px] tracking-[0.2em] uppercase hover:bg-red-600/30 transition-colors disabled:opacity-40"
                  >
                    {dangerLoading ? 'Suppression...' : '⚠ Confirmer la suppression'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ── VUE CLIENTS ───────────────────────────────────────────────
  if (mainView === 'clients') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5">
          {/* Ligne titre + actions */}
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] tracking-[0.4em] text-amber-400/30 uppercase">Fiches clients</p>
              <h1 className="font-playfair text-lg text-[#F5F5F3]">{profile.display_name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAddClientOpen(v => !v); setAddClientError(''); setAddClientSuccess('') }}
                className="text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-amber-500/20 text-amber-400/60 hover:bg-amber-500/8 transition-colors"
              >
                + Ajouter
              </button>
              <button
                onClick={() => setMainView('list')}
                className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#5B3DF5]/60 transition-colors border border-white/5 hover:border-[#5B3DF5]/20 px-3 py-2"
              >
                ← Retour
              </button>
            </div>
          </div>
          {/* Barre de recherche */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-white/4 border border-white/8 px-3 py-2 focus-within:border-amber-500/30 transition-colors">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/20 flex-shrink-0">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                placeholder="Rechercher par prénom ou nom…"
                className="flex-1 bg-transparent text-[#F5F5F3]/80 text-sm outline-none placeholder-white/20"
              />
              {clientSearch && (
                <button onClick={() => setClientSearch('')} className="text-white/25 hover:text-white/60 text-base leading-none transition-colors">×</button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">

          {/* Formulaire ajout client */}
          {addClientOpen && (
            <form onSubmit={handleAddClient} className="m-4 bg-[#141414] border border-amber-500/15 p-5">
              <p className="text-[9px] tracking-[0.3em] text-amber-400/50 uppercase mb-4">Ajouter un client</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Prénom & Nom</label>
                  <input
                    type="text"
                    value={addClientName}
                    onChange={e => setAddClientName(e.target.value)}
                    className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-amber-500/30"
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={addClientEmail}
                    onChange={e => setAddClientEmail(e.target.value)}
                    className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-amber-500/30"
                    placeholder="jean@email.com"
                    required
                  />
                </div>
              </div>
              {addClientError && <p className="text-red-400/60 text-xs mb-3">{addClientError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddClientOpen(false)}
                  className="flex-1 border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase py-2.5 hover:border-white/20 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addClientLoading}
                  className="flex-1 border border-amber-500/30 text-amber-400/70 text-[10px] tracking-[0.2em] uppercase py-2.5 hover:bg-amber-500/8 transition-colors disabled:opacity-40"
                >
                  {addClientLoading ? 'Ajout...' : 'Confirmer'}
                </button>
              </div>
            </form>
          )}

          {addClientSuccess && lastAddedClient && (
            <div className="mx-4 my-3 border border-green-500/20 bg-[#141414] p-4">
              {/* Ligne succès */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-green-400/80 text-xs tracking-wide">{addClientSuccess}</p>
              </div>

              {/* Lien d'invitation */}
              <p className="text-[8px] tracking-[0.25em] uppercase text-[#F5F5F3]/25 mb-2">Inviter par</p>
              <div className="flex gap-2">

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Bonjour${lastAddedClient.name ? ` ${lastAddedClient.name.split(' ')[0]}` : ''} 👋\n\nJe vous invite à accéder à votre espace de conciergerie privée.\n\nAccédez directement ici :\n👉 https://itinera.click/${profile.slug}/mon-espace\n\nEntrez votre email (${lastAddedClient.email}) pour vous connecter.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366]/80 text-[10px] tracking-[0.2em] uppercase hover:bg-[#25D366]/15 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.054 23.486a.75.75 0 00.921.921l5.624-1.478A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.741 9.741 0 01-5.002-1.378l-.36-.214-3.733.981.998-3.648-.235-.374A9.712 9.712 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                  </svg>
                  WhatsApp
                </a>

                {/* Copier le lien */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://itinera.click/${profile.slug}/mon-espace`)
                    setInviteLinkCopied(true)
                    setTimeout(() => setInviteLinkCopied(false), 2500)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-white/10 text-[#F5F5F3]/40 text-[10px] tracking-[0.2em] uppercase hover:border-white/20 hover:text-[#F5F5F3]/60 transition-colors"
                >
                  {inviteLinkCopied ? (
                    <><span className="text-green-400">✓</span> Copié !</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copier le lien</>
                  )}
                </button>
              </div>

              {/* Fermer */}
              <button
                onClick={() => { setAddClientSuccess(''); setLastAddedClient(null) }}
                className="mt-3 text-[9px] text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors w-full text-center"
              >
                Fermer
              </button>
            </div>
          )}

          {loadingClients ? (
            <div className="flex items-center justify-center h-40 text-[#F5F5F3]/20 text-sm">Chargement...</div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-3 text-center px-8">
              <span className="text-4xl opacity-20">👤</span>
              <p className="text-[#F5F5F3]/20 text-sm">Aucun client inscrit.</p>
              <p className="text-[#F5F5F3]/10 text-xs">Ajoutez des clients avec le bouton "+ Ajouter" ci-dessus.</p>
            </div>
          ) : (() => {
            const q = clientSearch.trim().toLowerCase()
            const filtered = q
              ? clients.filter(c =>
                  (c.client_name || '').toLowerCase().includes(q) ||
                  (c.client_email || '').toLowerCase().includes(q)
                )
              : clients
            return (
            <div className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-[#F5F5F3]/20 text-sm">Aucun résultat pour « {clientSearch} »</p>
                </div>
              )}
              {filtered.map(c => {
                const vipColor = VIP_COLORS[c.vip_tag] || 'text-[#F5F5F3]/20'
                const isEditing = editingClientEmail === c.client_email
                const profile_ = parseClientProfile(c.internal_note || '')
                const displayNote = profile_.note

                return (
                  <div key={c.id} className="border-b border-white/5 last:border-0">
                    {/* ── Row ── */}
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setEditingClientEmail(null)
                        } else {
                          const p = parseClientProfile(c.internal_note || '')
                          setEditingClientEmail(c.client_email)
                          setEditClientVip(c.vip_tag || '')
                          setEditClientNat(p.nationality || '')
                          setEditClientProducts(p.products || [])
                          setEditClientNote(p.note || '')
                        }
                      }}
                      className="w-full text-left px-4 py-4 hover:bg-white/3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className="text-[#F5F5F3] text-sm font-medium">{c.client_name || c.client_email}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {c.vip_tag && (
                            <span className={`text-[9px] tracking-[0.2em] uppercase font-medium ${vipColor}`}>
                              ✦ {c.vip_tag}
                            </span>
                          )}
                          <span className="text-[#F5F5F3]/20 text-xs">{isEditing ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      <p className="text-[#F5F5F3]/30 text-xs mb-1">{c.client_email}</p>
                      <div className="flex items-center gap-3 text-[#F5F5F3]/20 text-[10px]">
                        <span>{c.total_resas ?? 0} résa{(c.total_resas ?? 0) > 1 ? 's' : ''}</span>
                        {profile_.nationality && (
                          <>
                            <span>·</span>
                            <span>{profile_.nationality.split(' ')[0]}</span>
                          </>
                        )}
                        {profile_.products.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[140px] text-amber-300/80">{profile_.products.join(', ')}</span>
                          </>
                        )}
                        {displayNote && !profile_.nationality && profile_.products.length === 0 && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[180px] italic">"{displayNote}"</span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* ── Edit panel (accordion) ── */}
                    {isEditing && (
                      <div className="bg-[#0D0D0D] border-t border-white/5 px-4 py-5 space-y-5">

                        {/* VIP Level */}
                        <div>
                          <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F5F3]/25 mb-3">Niveau client</p>
                          <div className="flex flex-wrap gap-1.5">
                            {VIP_TAGS.map(tag => (
                              <button
                                key={tag || 'none'}
                                onClick={() => setEditClientVip(editClientVip === tag ? '' : tag)}
                                className={`px-2.5 py-1 text-[9px] tracking-[0.15em] uppercase border transition-all ${
                                  editClientVip === tag
                                    ? `border-current ${VIP_COLORS[tag] || 'text-[#F5F5F3]/40'} bg-white/8`
                                    : 'border-white/8 text-[#F5F5F3]/25 hover:border-white/20'
                                }`}
                              >
                                {tag || '— Aucun'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Nationality */}
                        <div>
                          <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F5F3]/25 mb-3">Nationalité</p>
                          <div className="flex flex-wrap gap-1.5">
                            {NATIONALITIES.map(n => {
                              const val = `${n.flag} ${n.label}`
                              const active = editClientNat === val
                              return (
                                <button
                                  key={n.label}
                                  onClick={() => setEditClientNat(active ? '' : val)}
                                  className={`px-3 py-1.5 text-sm border transition-all ${
                                    active
                                      ? 'border-[#5B3DF5]/60 bg-[#5B3DF5]/15 text-[#F5F5F3]'
                                      : 'border-white/8 text-[#F5F5F3]/50 hover:border-white/20'
                                  }`}
                                  title={n.label}
                                >
                                  {n.flag} <span className="text-[10px] ml-1">{n.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Product Tags */}
                        <div>
                          <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F5F3]/25 mb-3">Préférences produits</p>
                          <div className="flex flex-wrap gap-1.5">
                            {PRODUCT_TAGS.map(tag => {
                              const active = editClientProducts.includes(tag)
                              return (
                                <button
                                  key={tag}
                                  onClick={() => setEditClientProducts(prev =>
                                    active ? prev.filter(t => t !== tag) : [...prev, tag]
                                  )}
                                  className={`px-2.5 py-1 text-[9px] tracking-[0.1em] border transition-all ${
                                    active
                                      ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                                      : 'border-white/8 text-[#F5F5F3]/30 hover:border-white/20'
                                  }`}
                                >
                                  {active ? '✦ ' : ''}{tag}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Internal note */}
                        <div>
                          <p className="text-[8px] tracking-[0.3em] uppercase text-[#F5F5F3]/25 mb-2">Note interne</p>
                          <textarea
                            value={editClientNote}
                            onChange={e => setEditClientNote(e.target.value)}
                            rows={2}
                            placeholder="Informations privées sur ce client..."
                            className="w-full bg-[#0B0B0B] border border-white/8 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/20 transition-colors resize-none placeholder-[#F5F5F3]/15"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => setEditingClientEmail(null)}
                            className="flex-1 py-2.5 border border-white/8 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase hover:border-white/15 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => saveClientProfile(c)}
                            disabled={savingClientProfile}
                            className="flex-1 py-2.5 bg-[#5B3DF5]/20 border border-[#5B3DF5]/40 text-[#A78BFA] text-[10px] tracking-[0.2em] uppercase hover:bg-[#5B3DF5]/30 transition-colors disabled:opacity-40"
                          >
                            {savingClientProfile ? '...' : 'Sauvegarder'}
                          </button>
                        </div>
                        <button
                          onClick={() => resendWelcomeEmail(c)}
                          disabled={resendingWelcome === c.client_email}
                          className="w-full py-2 text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/20 hover:text-green-400/60 transition-colors border border-white/5 hover:border-green-500/20 disabled:opacity-40"
                        >
                          {resendingWelcome === c.client_email ? '✓ Email envoyé' : '↩ Renvoyer l\'email de bienvenue'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            )
          })()}
        </div>
      </div>
    )
  }

  // ── RÉSERVER POUR UN CLIENT ───────────────────────────────────
  if (mainView === 'book-for-client') {
    // Destinations actives
    const activeDests = (configDests.map(raw => {
      try { const p = JSON.parse(raw); if (p?.slug && p.active !== false) return { slug: p.slug, name: p.name, emoji: p.emoji || '📍' } } catch {}
      return ALL_DESTINATIONS.find(d => d.slug === raw) || null
    }).filter(Boolean) as { slug: string; name: string; emoji: string }[])
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

    // Venues actives — triées A→Z
    const activeVenues = configVenues.map(parseVenueEntry)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    const venuesForDest = (dest: string) => dest
      ? activeVenues.filter(v => !v.destination || v.destination === dest)
      : activeVenues

    // Créneaux pour un venue
    const servicesForVenue = (venueName: string) => {
      const vc = activeVenues.find(v => v.name === venueName)
      if (vc?.services?.length) return vc.services
      return SERVICES_BY_TYPE[vc?.type || 'restaurant']
    }

    // Info client pour soumission
    const getClient = () => {
      if (bfcUseManual) return bfcManual
      if (bfcSelectedClient) {
        const parts = (bfcSelectedClient.client_name || '').trim().split(' ')
        return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || parts[0] || '', email: bfcSelectedClient.client_email, phone: '—' }
      }
      return null
    }

    const handleSingleSubmit = async () => {
      const client = getClient()
      if (!client?.email || !bfcVenue || !bfcDate || !bfcTime) return
      setBfcSubmitting(true); setBfcDone(null)
      try {
        const res = await fetch('/api/reservation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: client.firstName, lastName: client.lastName,
            email: client.email, phone: client.phone || '—',
            establishment: bfcVenue, date: bfcDate, time: bfcTime,
            guests: bfcGuests, occasion: bfcOccasion, seating: bfcSeating,
            specialRequests: bfcNotes, rpSlug: profile.slug,
            vipLevel: bfcSelectedClient?.vip_tag || '',
          }),
        })
        setBfcDone(res.ok ? 'success' : 'error')
        if (res.ok) { fetchReservations() }
      } catch { setBfcDone('error') }
      finally { setBfcSubmitting(false) }
    }

    const handleTripSubmit = async () => {
      const client = getClient()
      const allBookings = bfcTripDays.flatMap(day =>
        day.bookings.map(b => ({
          establishment: b.establishment, date: day.date, time: b.time,
          guests: b.guests, occasion: b.occasion, seating: b.seating, specialRequests: b.specialRequests,
        }))
      )
      if (!client?.email || allBookings.length === 0) return
      setBfcTripSubmitting(true); setBfcTripDone(null)
      try {
        const res = await fetch('/api/trip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: client.firstName, lastName: client.lastName,
            email: client.email, phone: client.phone || '—',
            rpSlug: profile.slug,
            bookings: allBookings,
          }),
        })
        setBfcTripDone(res.ok ? 'success' : 'error')
        if (res.ok) { fetchReservations() }
      } catch { setBfcTripDone('error') }
      finally { setBfcTripSubmitting(false) }
    }

    const addBookingToDay = (date: string) => {
      if (!bfcNewBooking.venue || !bfcNewBooking.time) return
      const newSlot: BookingSlot = {
        id: crypto.randomUUID(),
        establishment: bfcNewBooking.venue,
        time: bfcNewBooking.time,
        guests: bfcNewBooking.guests,
        occasion: bfcNewBooking.occasion,
        seating: bfcNewBooking.seating,
        specialRequests: bfcNewBooking.specialRequests,
      }
      setBfcTripDays(prev => prev.map(day =>
        day.date === date
          ? { ...day, bookings: [...day.bookings, newSlot] }
          : day
      ))
      setBfcAddingToDay(null)
      setBfcNewBooking({ venue: '', time: '', guests: '2', occasion: '', seating: '', specialRequests: '' })
    }

    const removeBookingFromDay = (date: string, bookingId: string) => {
      setBfcTripDays(prev => prev.map(day =>
        day.date === date ? { ...day, bookings: day.bookings.filter(b => b.id !== bookingId) } : day
      ))
    }

    const totalBookings = bfcTripDays.reduce((acc, d) => acc + d.bookings.length, 0)

    const labelCls = 'block text-[8px] tracking-[0.25em] uppercase text-[#F5F5F3]/25 mb-1.5'
    const inputCls = 'w-full bg-[#0B0B0B] border border-white/8 text-[#F5F5F3] px-3 py-2.5 text-sm outline-none focus:border-white/25 transition-colors placeholder-[#F5F5F3]/15'
    const selectCls = `${inputCls} cursor-pointer`
    const client = getClient()
    const hasClient = !!(client?.email)

    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase">Réserver pour un client</p>
            <h1 className="font-playfair text-lg text-[#F5F5F3]">{profile.display_name}</h1>
          </div>
          <button onClick={() => setMainView('list')}
            className="text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 border border-white/8 hover:border-white/20 px-3 py-2 transition-colors">
            ← Retour
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-24">

          {/* ── Sélection du client ── */}
          <div className="bg-[#141414] border border-white/5 p-5">
            <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-4">Pour quel client ?</p>

            {!bfcUseManual ? (
              <>
                <label className={labelCls}>Rechercher un client</label>
                <input
                  type="text"
                  className={`${inputCls} mb-2`}
                  placeholder="Nom, prénom ou email…"
                  value={bfcClientSearch}
                  onChange={e => setBfcClientSearch(e.target.value)}
                />
                {/* Client sélectionné */}
                {bfcSelectedClient && (
                  <div className="bg-[#5B3DF5]/8 border border-[#5B3DF5]/30 px-3 py-3 mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm text-[#F5F5F3]">{bfcSelectedClient.client_name || bfcSelectedClient.client_email}</p>
                        <p className="text-[10px] text-[#F5F5F3]/40">{bfcSelectedClient.client_email}</p>
                      </div>
                      <button type="button" onClick={() => setBfcSelectedClient(null)} className="text-[#F5F5F3]/25 hover:text-[#F5F5F3]/60 text-sm transition-colors ml-3">✕</button>
                    </div>
                    {/* Notes internes du client */}
                    {(bfcSelectedClient.vip_tag || bfcSelectedClient.internal_note) && (
                      <div className="mt-2 pt-2 border-t border-[#5B3DF5]/15 space-y-1">
                        {bfcSelectedClient.vip_tag && (
                          <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: VIP_COLORS[bfcSelectedClient.vip_tag] || '#F5F5F3' }}>
                            ✦ {bfcSelectedClient.vip_tag}
                          </p>
                        )}
                        {bfcSelectedClient.internal_note && (() => {
                          const cp = parseClientProfile(bfcSelectedClient.internal_note)
                          return (
                            <>
                              {cp.note && <p className="text-[10px] text-amber-400/60 italic">{cp.note}</p>}
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                {cp.nationality && <span className="text-[9px] text-[#F5F5F3]/30">🌍 {cp.nationality}</span>}
                                {cp.products.map(p => (
                                  <span key={p} className="text-[9px] text-amber-400/70">🍾 {p}</span>
                                ))}
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
                {/* Liste filtrée — triée A→Z par nom (ou email à défaut) */}
                {!bfcSelectedClient && bfcClientSearch.length >= 1 && (() => {
                  const q = bfcClientSearch.toLowerCase()
                  const filtered = clients
                    .filter(c =>
                      (c.client_name || '').toLowerCase().includes(q) ||
                      c.client_email.toLowerCase().includes(q)
                    )
                    .sort((a, b) =>
                      (a.client_name || a.client_email).localeCompare(b.client_name || b.client_email, 'fr')
                    )
                    .slice(0, 8)
                  return filtered.length > 0 ? (
                    <div className="border border-white/10 divide-y divide-white/5 mb-2 max-h-52 overflow-y-auto">
                      {filtered.map(c => (
                        <button key={c.client_email} type="button"
                          onClick={() => { setBfcSelectedClient(c); setBfcClientSearch('') }}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors">
                          <div>
                            <p className="text-sm text-[#F5F5F3]">{c.client_name || c.client_email}</p>
                            <p className="text-[10px] text-[#F5F5F3]/35">{c.client_email}</p>
                          </div>
                          {c.vip_tag && <span className="text-[9px] text-amber-300/70 ml-2 flex-shrink-0">{c.vip_tag}</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#F5F5F3]/25 py-2">Aucun client trouvé pour &quot;{bfcClientSearch}&quot;</p>
                  )
                })()}
                {!bfcSelectedClient && !bfcClientSearch && (
                  <select
                    className={selectCls}
                    value=""
                    onChange={e => {
                      const c = clients.find(c => c.client_email === e.target.value) || null
                      setBfcSelectedClient(c)
                    }}
                  >
                    <option value="" className="bg-[#141414]">— ou choisir dans la liste complète</option>
                    {[...clients]
                      .sort((a, b) =>
                        (a.client_name || a.client_email).localeCompare(b.client_name || b.client_email, 'fr')
                      )
                      .map(c => (
                        <option key={c.client_email} value={c.client_email} className="bg-[#141414]">
                          {c.client_name || c.client_email} {c.vip_tag ? `· ${c.vip_tag}` : ''}
                        </option>
                      ))}
                  </select>
                )}
                <button type="button" onClick={() => setBfcUseManual(true)}
                  className="mt-3 text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors">
                  ou saisir manuellement →
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Prénom *</label>
                    <input className={inputCls} placeholder="Jean" value={bfcManual.firstName} onChange={e => setBfcManual(p => ({ ...p, firstName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Nom *</label>
                    <input className={inputCls} placeholder="Dupont" value={bfcManual.lastName} onChange={e => setBfcManual(p => ({ ...p, lastName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Email *</label>
                    <input className={inputCls} type="email" placeholder="jean@email.com" value={bfcManual.email} onChange={e => setBfcManual(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Téléphone</label>
                    <input className={inputCls} placeholder="+33 6..." value={bfcManual.phone} onChange={e => setBfcManual(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <button onClick={() => { setBfcUseManual(false); setBfcManual({ firstName: '', lastName: '', email: '', phone: '' }) }}
                  className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors">
                  ← Choisir dans ma liste
                </button>
              </>
            )}
          </div>

          {/* ── Type de réservation ── */}
          {hasClient && (
            <div className="bg-[#141414] border border-white/5 p-5">
              <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-4">Type de réservation</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBookForType('single')}
                  className={`p-4 border text-left transition-all ${bookForType === 'single' ? 'border-[#5B3DF5]/50 bg-[#5B3DF5]/8' : 'border-white/8 hover:border-white/20'}`}
                >
                  <p className="text-sm text-[#F5F5F3]/80 mb-1">✦ Réservation unique</p>
                  <p className="text-[10px] text-[#F5F5F3]/30">Un seul établissement, une date</p>
                </button>
                <button
                  onClick={() => setBookForType('trip')}
                  className={`p-4 border text-left transition-all ${bookForType === 'trip' ? 'border-[#5B3DF5]/50 bg-[#5B3DF5]/8' : 'border-white/8 hover:border-white/20'}`}
                >
                  <p className="text-sm text-[#F5F5F3]/80 mb-1">✦ Planification séjour</p>
                  <p className="text-[10px] text-[#F5F5F3]/30">Plusieurs réservations d&apos;un coup</p>
                </button>
              </div>
            </div>
          )}

          {/* ── RÉSERVATION UNIQUE ── */}
          {bookForType === 'single' && hasClient && (
            <>
              {/* Destination */}
              <div className="bg-[#141414] border border-white/5 p-5">
                <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-4">01 — Destination</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeDests.map(d => (
                    <button key={d.slug} type="button"
                      onClick={() => { setBfcDest(d.slug); setBfcVenue(''); setBfcTime('') }}
                      className={`flex items-center gap-2 px-3 py-2.5 border text-left text-sm transition-all ${bfcDest === d.slug ? 'border-[#5B3DF5]/60 bg-[#5B3DF5]/10 text-[#F5F5F3]' : 'border-white/8 text-[#F5F5F3]/40 hover:border-white/20'}`}
                    >
                      <span>{d.emoji}</span>
                      <span className="text-[12px] truncate">{d.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Établissement + Date + Service */}
              {bfcDest && (
                <div className="bg-[#141414] border border-white/5 p-5 space-y-4">
                  <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase">02 — Établissement & Date</p>

                  <div>
                    <label className={labelCls}>Établissement *</label>
                    <select className={selectCls} value={bfcVenue} onChange={e => { setBfcVenue(e.target.value); setBfcTime('') }}>
                      <option value="" className="bg-[#141414]">Sélectionner...</option>
                      {(['restaurant', 'beach_club', 'night_club'] as const).map(cat => {
                        const group = venuesForDest(bfcDest).filter(v => (v.type || 'restaurant') === cat)
                        if (!group.length) return null
                        const catLabel = cat === 'restaurant' ? '🍽️ Restaurants' : cat === 'beach_club' ? '🏖️ Beach Clubs' : '🎉 Night Clubs'
                        return (
                          <optgroup key={cat} label={catLabel}>
                            {group.map(v => <option key={v.name} value={v.name} className="bg-[#141414]">{v.name}</option>)}
                          </optgroup>
                        )
                      })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Date *</label>
                      <input type="date" className={`${inputCls} [color-scheme:dark]`} min={new Date().toISOString().split('T')[0]}
                        value={bfcDate} onChange={e => setBfcDate(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Créneau *</label>
                      <select className={selectCls} value={bfcTime} onChange={e => setBfcTime(e.target.value)}>
                        <option value="" className="bg-[#141414]">Choisir...</option>
                        {servicesForVenue(bfcVenue).map(s => (
                          <option key={s} value={s} className="bg-[#141414]">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Nombre de personnes *</label>
                    <select className={selectCls} value={bfcGuests} onChange={e => setBfcGuests(e.target.value)}>
                      {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                        <option key={n} value={n} className="bg-[#141414]">{n} personne{n > 1 ? 's' : ''}</option>
                      ))}
                      <option value="20+" className="bg-[#141414]">Plus de 20</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Détails */}
              {bfcDest && bfcVenue && (
                <div className="bg-[#141414] border border-white/5 p-5 space-y-4">
                  <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase">03 — Détails</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Occasion</label>
                      <select className={selectCls} value={bfcOccasion} onChange={e => setBfcOccasion(e.target.value)}>
                        <option value="" className="bg-[#141414]">—</option>
                        {['Anniversaire', 'Romantique', 'Dîner d\'affaires', 'Célébration', 'Soirée VIP', 'Fête', 'Autre'].map(o => (
                          <option key={o} value={o} className="bg-[#141414]">{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Placement</label>
                      <select className={selectCls} value={bfcSeating} onChange={e => setBfcSeating(e.target.value)}>
                        <option value="" className="bg-[#141414]">—</option>
                        {['Terrasse', 'Table coucher de soleil', 'Premier rang', 'Table DJ', 'Vue mer', 'Privé / Semi-privé', 'Sans préférence'].map(s => (
                          <option key={s} value={s} className="bg-[#141414]">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Demandes spéciales du client</label>
                    <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Allergie, préférences..."
                      value={bfcNotes} onChange={e => setBfcNotes(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>📝 Note interne RP <span className="text-[#F5F5F3]/15 normal-case tracking-normal">— non envoyée au client</span></label>
                    <textarea className={`${inputCls} resize-none border-[#5B3DF5]/15 focus:border-[#5B3DF5]/30`} rows={2}
                      placeholder="Rappel : client VIP, préfère table isolée..."
                      value={bfcInternalNote} onChange={e => setBfcInternalNote(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Submit */}
              {bfcDest && bfcVenue && (
                <div className="space-y-3">
                  {bfcDone === 'success' && (
                    <div className="bg-green-500/8 border border-green-500/20 p-4 text-center">
                      <p className="text-green-400 text-sm">✓ Réservation créée — email envoyé à {getClient()?.email}</p>
                      <button onClick={() => {
                        setBfcDone(null); setBfcDest(''); setBfcVenue(''); setBfcDate(''); setBfcTime('')
                        setBfcGuests('2'); setBfcOccasion(''); setBfcSeating(''); setBfcNotes(''); setBfcInternalNote('')
                      }} className="mt-2 text-[9px] tracking-[0.2em] uppercase text-green-400/60 hover:text-green-400 transition-colors">
                        Nouvelle réservation →
                      </button>
                    </div>
                  )}
                  {bfcDone === 'error' && (
                    <p className="text-red-400/70 text-xs text-center border border-red-500/15 bg-red-500/5 px-4 py-3">
                      Une erreur est survenue. Vérifiez les champs et réessayez.
                    </p>
                  )}
                  <button
                    onClick={handleSingleSubmit}
                    disabled={bfcSubmitting || !bfcDate || !bfcTime}
                    className="w-full py-4 text-white text-[11px] tracking-[0.3em] uppercase hover:opacity-90 transition-opacity disabled:opacity-30"
                    style={{ background: `linear-gradient(135deg, ${configAccent}, ${configAccent}bb)` }}
                  >
                    {bfcSubmitting ? 'Création en cours...' : '✦ Créer la réservation'}
                  </button>
                  <p className="text-center text-[9px] text-[#F5F5F3]/20">Un email de confirmation sera automatiquement envoyé à {getClient()?.email}</p>
                </div>
              )}
            </>
          )}

          {/* ── PLANIFICATION SÉJOUR ── */}
          {bookForType === 'trip' && hasClient && (
            <>
              {/* ── Step 1 : Destination ── */}
              {bfcTripStep === 'dest' && (
                <div className="bg-[#141414] border border-white/5 p-5">
                  <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-4">01 — Destination du séjour</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {activeDests.map(d => (
                      <button key={d.slug} type="button"
                        onClick={() => { setBfcTripDest(d.slug); setBfcTripStep('dates') }}
                        className={`flex items-center gap-2 px-3 py-2.5 border text-left transition-all ${bfcTripDest === d.slug ? 'border-[#5B3DF5]/60 bg-[#5B3DF5]/10 text-[#F5F5F3]' : 'border-white/8 text-[#F5F5F3]/40 hover:border-white/20'}`}
                      >
                        <span>{d.emoji}</span>
                        <span className="text-[12px] truncate">{d.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2 : Dates ── */}
              {bfcTripStep === 'dates' && (
                <div className="bg-[#141414] border border-white/5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase">02 — Dates du séjour</p>
                    <button onClick={() => setBfcTripStep('dest')}
                      className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors">
                      ← {activeDests.find(d => d.slug === bfcTripDest)?.name}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Arrivée *</label>
                      <input type="date" className={`${inputCls} [color-scheme:dark]`}
                        min={new Date().toISOString().split('T')[0]}
                        value={bfcTripArrival}
                        onChange={e => { setBfcTripArrival(e.target.value); setBfcTripDeparture('') }} />
                    </div>
                    <div>
                      <label className={labelCls}>Départ *</label>
                      <input type="date" className={`${inputCls} [color-scheme:dark]`}
                        min={bfcTripArrival || new Date().toISOString().split('T')[0]}
                        value={bfcTripDeparture}
                        onChange={e => setBfcTripDeparture(e.target.value)} />
                    </div>
                  </div>
                  {bfcTripArrival && bfcTripDeparture && (
                    <button
                      onClick={() => {
                        const days = generateDays(bfcTripArrival, bfcTripDeparture)
                        setBfcTripDays(days)
                        setBfcTripExpandedDay(days[0]?.date || null)
                        setBfcAddingToDay(null)
                        setBfcTripStep('planner')
                      }}
                      className="w-full py-3.5 text-white text-[11px] tracking-[0.2em] uppercase transition-colors hover:opacity-90"
                      style={{ background: '#5B3DF5' }}
                    >
                      Générer le planning →
                    </button>
                  )}
                </div>
              )}

              {/* ── Step 3 : Planner jour par jour ── */}
              {bfcTripStep === 'planner' && (
                <>
                  {/* Header séjour */}
                  <div className="bg-[#141414] border border-white/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase mb-1">Séjour</p>
                      <p className="text-sm text-[#F5F5F3]/70">
                        {activeDests.find(d => d.slug === bfcTripDest)?.emoji}{' '}
                        {activeDests.find(d => d.slug === bfcTripDest)?.name}
                        {' · '}{bfcTripDays.length} jour{bfcTripDays.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button onClick={() => setBfcTripStep('dates')}
                      className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors">
                      ← Modifier
                    </button>
                  </div>

                  {/* Accordion par jour */}
                  {bfcTripDays.map(day => (
                    <div key={day.date} className="bg-[#141414] border border-white/5">
                      <button
                        onClick={() => setBfcTripExpandedDay(bfcTripExpandedDay === day.date ? null : day.date)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left"
                      >
                        <div>
                          <p className="text-sm text-[#F5F5F3]/80">{day.label}</p>
                          {day.bookings.length > 0 && (
                            <p className="text-[10px] text-[#5B3DF5]/60 mt-0.5">
                              {day.bookings.length} réservation{day.bookings.length > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <span className="text-[#F5F5F3]/25 text-xs">{bfcTripExpandedDay === day.date ? '▲' : '▼'}</span>
                      </button>

                      {bfcTripExpandedDay === day.date && (
                        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                          {/* Réservations existantes */}
                          {day.bookings.map(b => (
                            <div key={b.id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-0">
                              <div>
                                <p className="text-sm text-[#F5F5F3]/80">{b.establishment}</p>
                                <p className="text-[10px] text-[#F5F5F3]/30 mt-0.5">
                                  {b.time} · {b.guests} pers.{b.occasion ? ` · ${b.occasion}` : ''}
                                </p>
                              </div>
                              <button onClick={() => removeBookingFromDay(day.date, b.id)}
                                className="text-[#F5F5F3]/20 hover:text-red-400/60 transition-colors ml-3 text-lg leading-none">×</button>
                            </div>
                          ))}

                          {/* Formulaire ajout réservation */}
                          {bfcAddingToDay === day.date ? (
                            <div className="space-y-3 pt-1">
                              <div>
                                <label className={labelCls}>Établissement *</label>
                                <select className={selectCls}
                                  value={bfcNewBooking.venue}
                                  onChange={e => setBfcNewBooking(p => ({ ...p, venue: e.target.value, time: '' }))}>
                                  <option value="" className="bg-[#141414]">Sélectionner...</option>
                                  {(['restaurant', 'beach_club', 'night_club'] as const).map(cat => {
                                    const group = venuesForDest(bfcTripDest).filter(v => (v.type || 'restaurant') === cat)
                                    if (!group.length) return null
                                    const catLabel = cat === 'restaurant' ? '🍽️ Restaurants' : cat === 'beach_club' ? '🏖️ Beach Clubs' : '🎉 Night Clubs'
                                    return (
                                      <optgroup key={cat} label={catLabel}>
                                        {group.map(v => <option key={v.name} value={v.name} className="bg-[#141414]">{v.name}</option>)}
                                      </optgroup>
                                    )
                                  })}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={labelCls}>Créneau *</label>
                                  <select className={selectCls} value={bfcNewBooking.time}
                                    onChange={e => setBfcNewBooking(p => ({ ...p, time: e.target.value }))}>
                                    <option value="" className="bg-[#141414]">Choisir...</option>
                                    {servicesForVenue(bfcNewBooking.venue).map(s => (
                                      <option key={s} value={s} className="bg-[#141414]">{s}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className={labelCls}>Personnes</label>
                                  <select className={selectCls} value={bfcNewBooking.guests}
                                    onChange={e => setBfcNewBooking(p => ({ ...p, guests: e.target.value }))}>
                                    {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                                      <option key={n} value={n} className="bg-[#141414]">{n}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className={labelCls}>Occasion</label>
                                  <select className={selectCls} value={bfcNewBooking.occasion}
                                    onChange={e => setBfcNewBooking(p => ({ ...p, occasion: e.target.value }))}>
                                    <option value="" className="bg-[#141414]">—</option>
                                    {['Anniversaire', 'Romantique', "Dîner d'affaires", 'Célébration', 'Soirée VIP', 'Fête', 'Autre'].map(o => (
                                      <option key={o} value={o} className="bg-[#141414]">{o}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className={labelCls}>Placement</label>
                                  <select className={selectCls} value={bfcNewBooking.seating}
                                    onChange={e => setBfcNewBooking(p => ({ ...p, seating: e.target.value }))}>
                                    <option value="" className="bg-[#141414]">—</option>
                                    {['Terrasse', 'Table coucher de soleil', 'Premier rang', 'Table DJ', 'Vue mer', 'Privé / Semi-privé', 'Sans préférence'].map(s => (
                                      <option key={s} value={s} className="bg-[#141414]">{s}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className={labelCls}>Demande spéciale</label>
                                <input className={inputCls} placeholder="Allergie, préférence..."
                                  value={bfcNewBooking.specialRequests}
                                  onChange={e => setBfcNewBooking(p => ({ ...p, specialRequests: e.target.value }))} />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => addBookingToDay(day.date)}
                                  disabled={!bfcNewBooking.venue || !bfcNewBooking.time}
                                  className="flex-1 py-2.5 text-white text-[10px] tracking-[0.2em] uppercase transition-colors disabled:opacity-30"
                                  style={{ background: '#5B3DF5' }}
                                >
                                  ✓ Ajouter
                                </button>
                                <button
                                  onClick={() => { setBfcAddingToDay(null); setBfcNewBooking({ venue: '', time: '', guests: '2', occasion: '', seating: '', specialRequests: '' }) }}
                                  className="px-4 py-2.5 text-[10px] tracking-[0.2em] uppercase text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 border border-white/8 hover:border-white/20 transition-colors"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setBfcAddingToDay(day.date); setBfcNewBooking({ venue: '', time: '', guests: '2', occasion: '', seating: '', specialRequests: '' }) }}
                              className="w-full py-2.5 border border-dashed border-white/12 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase hover:border-white/25 hover:text-[#F5F5F3]/50 transition-all"
                            >
                              + Ajouter une réservation
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* CTA vers récapitulatif */}
                  <button
                    onClick={() => setBfcTripStep('review')}
                    disabled={totalBookings === 0}
                    className="w-full py-3.5 text-white text-[11px] tracking-[0.2em] uppercase transition-colors disabled:opacity-30 hover:opacity-90"
                    style={{ background: '#5B3DF5' }}
                  >
                    {totalBookings === 0 ? 'Ajoutez au moins une réservation' : `Récapitulatif (${totalBookings} résa) →`}
                  </button>
                </>
              )}

              {/* ── Step 4 : Review & Submit ── */}
              {bfcTripStep === 'review' && (
                <>
                  <div className="bg-[#141414] border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[9px] tracking-[0.3em] text-[#5B3DF5] uppercase">Récapitulatif du séjour</p>
                      <button onClick={() => setBfcTripStep('planner')}
                        className="text-[9px] tracking-[0.2em] uppercase text-[#F5F5F3]/25 hover:text-[#F5F5F3]/50 transition-colors">
                        ← Modifier
                      </button>
                    </div>
                    <p className="text-sm text-[#F5F5F3]/50 mb-5">
                      {activeDests.find(d => d.slug === bfcTripDest)?.emoji}{' '}
                      {activeDests.find(d => d.slug === bfcTripDest)?.name}
                      {bfcTripDays.length > 0 && ` · ${bfcTripDays[0].label} → ${bfcTripDays[bfcTripDays.length - 1].label}`}
                    </p>
                    <div className="space-y-4">
                      {bfcTripDays.filter(d => d.bookings.length > 0).map(day => (
                        <div key={day.date} className="border-l-2 border-[#5B3DF5]/30 pl-3">
                          <p className="text-[9px] text-[#F5F5F3]/35 uppercase tracking-wider mb-1.5">{day.label}</p>
                          {day.bookings.map(b => (
                            <div key={b.id} className="mb-2 last:mb-0">
                              <p className="text-sm text-[#F5F5F3]/80">{b.establishment}</p>
                              <p className="text-[10px] text-[#F5F5F3]/30 mt-0.5">
                                {b.time} · {b.guests} pers.{b.occasion ? ` · ${b.occasion}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {bfcTripDone === 'success' && (
                      <div className="bg-green-500/8 border border-green-500/20 p-4 text-center">
                        <p className="text-green-400 text-sm">✓ Planning envoyé à {getClient()?.email}</p>
                        <button onClick={() => {
                          setBfcTripStep('dest'); setBfcTripDest(''); setBfcTripArrival(''); setBfcTripDeparture('')
                          setBfcTripDays([]); setBfcTripExpandedDay(null); setBfcAddingToDay(null); setBfcTripDone(null)
                        }} className="mt-2 text-[9px] tracking-[0.2em] uppercase text-green-400/60 hover:text-green-400 transition-colors">
                          Nouveau planning →
                        </button>
                      </div>
                    )}
                    {bfcTripDone === 'error' && (
                      <p className="text-red-400/70 text-xs text-center border border-red-500/15 bg-red-500/5 px-4 py-3">
                        Une erreur est survenue. Réessayez.
                      </p>
                    )}
                    <button
                      onClick={handleTripSubmit}
                      disabled={bfcTripSubmitting || totalBookings === 0}
                      className="w-full py-4 text-white text-[11px] tracking-[0.3em] uppercase hover:opacity-90 transition-opacity disabled:opacity-30"
                      style={{ background: `linear-gradient(135deg, ${configAccent}, ${configAccent}bb)` }}
                    >
                      {bfcTripSubmitting ? 'Envoi en cours...' : `✦ Envoyer le planning (${totalBookings} résa)`}
                    </button>
                    <p className="text-center text-[9px] text-[#F5F5F3]/20">Le récapitulatif complet sera envoyé à {getClient()?.email}</p>
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    )
  }

  // ── LISTE RÉSERVATIONS ────────────────────────────────────────
  return (
    <>
    {showNetwork && (
      <GlobalAccessModal
        rpSlug={profile.slug}
        rpPassword={password}
        onClose={() => setShowNetwork(false)}
      />
    )}
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">

      {/* Header — desktop : 1 ligne / mobile : 2 lignes */}
      <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5">

        {/* Ligne 1 : titre + déconnexion */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] tracking-[0.4em] text-[#5B3DF5] uppercase">Dashboard RP</p>
            <h1 className="font-playfair text-lg text-[#F5F5F3]">{profile.display_name}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-white/30 hover:text-red-400/70 transition-colors border border-white/8 hover:border-red-400/30 px-3 py-2"
            title="Se déconnecter"
          >
            <span>⏻</span>
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>

        {/* Ligne 2 : actions (pleine largeur sur mobile, inline sur desktop) */}
        <div className="px-4 pb-3 grid grid-cols-4 gap-2 md:hidden">
          <button
            onClick={() => {
              setBookForType(null); setBfcSelectedClient(null); setBfcUseManual(false)
              setBfcManual({ firstName: '', lastName: '', email: '', phone: '' })
              setBfcDest(''); setBfcVenue(''); setBfcDate(''); setBfcTime('')
              setBfcGuests('2'); setBfcOccasion(''); setBfcSeating(''); setBfcNotes('')
              setBfcInternalNote(''); setBfcDone(null)
              setBfcTripStep('dest'); setBfcTripDest(''); setBfcTripArrival(''); setBfcTripDeparture('')
              setBfcTripDays([]); setBfcTripExpandedDay(null); setBfcAddingToDay(null)
              setBfcNewBooking({ venue: '', time: '', guests: '2', occasion: '', seating: '', specialRequests: '' })
              setBfcTripDone(null)
              setMainView('book-for-client')
            }}
            className="flex flex-col items-center justify-center gap-1 text-white/80 hover:text-white transition-colors border border-white/15 hover:border-white/40 py-2.5 px-1 text-center"
          >
            <span className="text-base">📋</span>
            <span className="text-[8px] tracking-wider uppercase leading-tight">Réserver</span>
          </button>
          <button
            onClick={() => setMainView('config')}
            className="flex flex-col items-center justify-center gap-1 text-white/80 hover:text-white transition-colors border border-white/15 hover:border-white/40 py-2.5 px-1 text-center"
          >
            <span className="text-base">⚙</span>
            <span className="text-[8px] tracking-wider uppercase leading-tight">Config</span>
          </button>
          <button
            onClick={() => setMainView('clients')}
            className="flex flex-col items-center justify-center gap-1 text-white/80 hover:text-white transition-colors border border-white/15 hover:border-white/40 py-2.5 px-1 text-center"
          >
            <span className="text-base">👤</span>
            <span className="text-[8px] tracking-wider uppercase leading-tight">Clients</span>
          </button>
          <button
            onClick={() => setShowNetwork(true)}
            className="flex flex-col items-center justify-center gap-1 text-white/70 hover:text-[#5B3DF5] transition-colors border border-white/15 hover:border-[#5B3DF5]/40 py-2.5 px-1 text-center"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <span className="text-[8px] tracking-wider uppercase leading-tight">Global Access</span>
          </button>
        </div>

        {/* Ligne 2 desktop : boutons horizontaux (cachés sur mobile) */}
        <div className="hidden md:flex items-center gap-2 px-4 pb-3">
          <button
            onClick={() => {
              setBookForType(null); setBfcSelectedClient(null); setBfcUseManual(false)
              setBfcManual({ firstName: '', lastName: '', email: '', phone: '' })
              setBfcDest(''); setBfcVenue(''); setBfcDate(''); setBfcTime('')
              setBfcGuests('2'); setBfcOccasion(''); setBfcSeating(''); setBfcNotes('')
              setBfcInternalNote(''); setBfcDone(null)
              setBfcTripStep('dest'); setBfcTripDest(''); setBfcTripArrival(''); setBfcTripDeparture('')
              setBfcTripDays([]); setBfcTripExpandedDay(null); setBfcAddingToDay(null)
              setBfcNewBooking({ venue: '', time: '', guests: '2', occasion: '', seating: '', specialRequests: '' })
              setBfcTripDone(null)
              setMainView('book-for-client')
            }}
            className="text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white transition-colors border border-white/20 hover:border-white/50 px-3 py-2"
          >
            Réserver pour un guest
          </button>
          <button
            onClick={() => setMainView('config')}
            className="text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white transition-colors border border-white/20 hover:border-white/50 px-3 py-2"
          >
            ⚙ Config
          </button>
          <button
            onClick={() => setMainView('clients')}
            className="text-[10px] tracking-[0.2em] uppercase text-white/80 hover:text-white transition-colors border border-white/20 hover:border-white/50 px-3 py-2"
          >
            👤 Clients
          </button>
          <button
            onClick={() => setShowNetwork(true)}
            className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/70 hover:text-[#5B3DF5] transition-colors border border-white/20 hover:border-[#5B3DF5]/40 px-3 py-2"
          >
            🌐 Global Access
          </button>
        </div>

      </div>

      {/* Compteurs / filtres */}
      <div className="grid grid-cols-4 border-b border-white/5">
        {(['all', 'pending', 'confirmed', 'declined'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`py-4 text-center transition-all border-b-2 ${filter === s ? 'border-[#5B3DF5] bg-[#5B3DF5]/5' : 'border-transparent hover:bg-white/3'}`}
          >
            <div className={`text-2xl font-light ${
              filter === s ? 'text-white' :
              s === 'pending' ? 'text-amber-300/80' :
              s === 'confirmed' ? 'text-green-300/80' :
              s === 'declined' ? 'text-red-300/60' :
              'text-white/70'
            }`}>
              {counts[s]}
            </div>
            <div className={`text-[8px] tracking-wider uppercase mt-0.5 ${
              filter === s ? 'text-white/70' :
              s === 'pending' ? 'text-amber-300/50' :
              s === 'confirmed' ? 'text-green-300/50' :
              s === 'declined' ? 'text-red-300/40' :
              'text-white/40'
            }`}>
              {s === 'all' ? 'Total' : STATUS_LABELS[s as ReservationStatus]}
            </div>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="divide-y divide-white/5 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#F5F5F3]/20 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-center px-8">
            <span className="text-4xl opacity-20">✦</span>
            <p className="text-[#F5F5F3]/20 text-sm">
              {reservations.length === 0 ? 'Aucune réservation reçue pour le moment.' : 'Aucune réservation dans ce filtre.'}
            </p>
          </div>
        ) : (
          filtered.map(r => {
            const note = clientNotes[r.email?.toLowerCase() ?? '']
            const vipTag = note?.vip_tag
            const vipColor = vipTag ? (VIP_COLORS[vipTag] || 'text-[#F5F5F3]/30') : ''
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className="w-full text-left px-4 py-4 hover:bg-[#141414] transition-colors active:bg-[#141414]"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_DOT[r.status]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-[#F5F5F3] text-sm truncate">
                          {r.first_name} {r.last_name}
                        </span>
                        {vipTag && (
                          <span className={`text-[8px] tracking-[0.2em] uppercase font-medium flex-shrink-0 ${vipColor}`}>
                            · {vipTag}
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] tracking-wider uppercase border px-2 py-0.5 flex-shrink-0 ${STATUS_STYLES[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                    <p className="text-[#F5F5F3]/40 text-xs truncate mb-1">{r.establishment}{r.destination ? ` · ${r.destination}` : ''}</p>
                    <div className="flex items-center gap-2 text-[#F5F5F3]/20 text-[10px]">
                      <span>{r.date}</span>
                      <span>·</span>
                      <span>{r.guests} pers.</span>
                      {r.occasion && <><span>·</span><span>{r.occasion}</span></>}
                    </div>
                    {r.created_at && (
                      <p className="text-[#F5F5F3]/15 text-[9px] mt-0.5">
                        Reçue le {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <span className="text-[#F5F5F3]/10 flex-shrink-0 mt-1">›</span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
    </>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
