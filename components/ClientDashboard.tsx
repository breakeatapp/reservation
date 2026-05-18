'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RPProfile } from '@/lib/supabase'
import Link from 'next/link'

type Props = { profile: RPProfile }

type ClientReservation = {
  id: string
  created_at: string
  establishment: string
  destination: string
  date: string
  time: string
  guests: number
  occasion?: string
  seating?: string
  special_requests?: string
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled'
  rp_slug?: string
}

type RPSummary = {
  slug: string
  displayName: string
  accentColor: string
  logoText: string
  totalCount: number
  pendingCount: number
  confirmedCount: number
}

const SERVICES = [
  { group: 'Restaurant', options: [
    'Premier service — Déjeuner (12h30)',
    'Deuxième service — Déjeuner (14h30)',
    'Premier service — Dîner (19h30)',
    'Deuxième service — Dîner (21h30)',
  ]},
  { group: 'Beach Club', options: [
    'Beach Club — Ouverture (11h00)',
    'Beach Club — Sunset (17h00)',
  ]},
  { group: 'Club / Soirée', options: [
    'Club — Entrée early (22h00)',
    'Club — Entrée late night (00h00)',
  ]},
  { group: 'Autre', options: ['Brunch (11h00)', 'Cocktails (18h00)'] },
]

const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    sublabel: 'Notre équipe revient vers vous au plus vite',
    color: 'text-amber-400',
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400 animate-pulse',
    canModify: true,
    canCancel: true,
  },
  confirmed: {
    label: 'Confirmée ✦',
    sublabel: 'Votre table est réservée',
    color: 'text-green-400',
    bg: 'bg-green-500/8',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
    canModify: true,
    canCancel: true,
  },
  declined: {
    label: 'Non disponible',
    sublabel: 'Contactez-nous pour une alternative',
    color: 'text-red-400',
    bg: 'bg-red-500/8',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    canModify: false,
    canCancel: false,
  },
  cancelled: {
    label: 'Annulée',
    sublabel: 'Cette réservation a été annulée',
    color: 'text-[#F5F5F3]/25',
    bg: 'bg-white/3',
    border: 'border-white/8',
    dot: 'bg-[#F5F5F3]/20',
    canModify: false,
    canCancel: false,
  },
}

type Screen = 'home' | 'reservations' | 'profile'

export default function ClientDashboard({ profile }: Props) {
  const accent = profile.accent_color || '#5B3DF5'
  const router = useRouter()

  // Identité client
  const [email, setEmail] = useState('')
  const [clientFirstName, setClientFirstName] = useState('')
  const [rpList, setRpList] = useState<RPSummary[]>([])
  const [identifyLoading, setIdentifyLoading] = useState(false)
  const [notRegistered, setNotRegistered] = useState(false)
  const [autoLoginDone, setAutoLoginDone] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showAddRP, setShowAddRP] = useState(false)
  const [addRPInput, setAddRPInput] = useState('')
  const [showRPPicker, setShowRPPicker] = useState(false)

  // Navigation
  const [screen, setScreen] = useState<Screen>('home')
  const [viewingRp, setViewingRp] = useState<RPSummary | null>(null)

  // Réservations
  const [reservations, setReservations] = useState<ClientReservation[]>([])
  const [resaLoading, setResaLoading] = useState(false)
  const [resaFilter, setResaFilter] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('all')

  // Édition
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editGuests, setEditGuests] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Formulaire email (pour les guests sans session)
  const [emailInput, setEmailInput] = useState('')
  const [emailInputLoading, setEmailInputLoading] = useState(false)
  const [emailInputError, setEmailInputError] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)

  // Auto-inscription (email inconnu → proposer de s'inscrire)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [registerFirstName, setRegisterFirstName] = useState('')
  const [registerLastName, setRegisterLastName] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')

  // Complétion / édition de profil
  const [showProfileCompletion, setShowProfileCompletion] = useState(false)
  const [profileFirstName, setProfileFirstName] = useState('')
  const [profileLastName, setProfileLastName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const handleEmailAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = emailInput.trim().toLowerCase()
    if (!trimmed) return
    setEmailInputLoading(true)
    setEmailInputError('')
    try {
      const res = await fetch(`/api/client/check?email=${encodeURIComponent(trimmed)}&rp=${profile.slug}`)
      const data = await res.json()
      if (data.registered) {
        localStorage.setItem('itinera_guest_email', trimmed)
        localStorage.setItem('itinera_guest_rp', profile.slug)
        if (data.clientName) localStorage.setItem('itinera_guest_name', data.clientName.split(' ')[0])
        window.location.reload()
      } else {
        setShowRegisterForm(true)
      }
    } catch {
      setEmailInputError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setEmailInputLoading(false)
    }
  }

  const handleProfileComplete = (e: React.FormEvent) => {
    e.preventDefault()
    if (profileFirstName.trim()) {
      localStorage.setItem('itinera_guest_name', profileFirstName.trim())
      setClientFirstName(profileFirstName.trim())
    }
    if (profileLastName.trim()) localStorage.setItem('itinera_guest_lastname', profileLastName.trim())
    if (profilePhone.trim()) localStorage.setItem('itinera_guest_phone', profilePhone.trim())
    setShowProfileCompletion(false)
  }

  const handleSelfRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim() || !registerFirstName.trim()) return
    setRegisterLoading(true)
    setRegisterError('')
    try {
      const res = await fetch('/api/client/self-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          firstName: `${registerFirstName.trim()} ${registerLastName.trim()}`.trim(),
          rpSlug: profile.slug,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setRegisterError(data.error || 'Erreur.'); return }
      localStorage.setItem('itinera_guest_email', emailInput.trim().toLowerCase())
      localStorage.setItem('itinera_guest_rp', profile.slug)
      localStorage.setItem('itinera_guest_name', registerFirstName.trim())
      if (registerLastName.trim()) localStorage.setItem('itinera_guest_lastname', registerLastName.trim())
      if (registerPhone.trim()) localStorage.setItem('itinera_guest_phone', registerPhone.trim())
      window.location.reload()
    } catch {
      setRegisterError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setRegisterLoading(false)
    }
  }

  // ── Auto-login depuis localStorage ───────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('itinera_guest_email')
    const savedName = localStorage.getItem('itinera_guest_name')
    const savedRp = localStorage.getItem('itinera_guest_rp')
    if (!saved || savedRp !== profile.slug) {
      // Pas de session → afficher le formulaire email directement
      setShowEmailForm(true)
      setAutoLoginDone(true)
      return
    }

    // Vérifier que l'email est toujours inscrit
    setIdentifyLoading(true)
    fetch(`/api/client/check?email=${encodeURIComponent(saved)}&rp=${profile.slug}`)
      .then(r => r.json())
      .then(async check => {
        if (!check.registered) {
          localStorage.removeItem('itinera_guest_email')
          localStorage.removeItem('itinera_guest_name')
          localStorage.removeItem('itinera_guest_rp')
          router.replace('/')
          return
        }
        // Charger les RPs
        const res = await fetch(`/api/client/rps?email=${encodeURIComponent(saved)}`)
        const data = await res.json()
        setEmail(saved)
        const firstName = data.firstName || savedName || check.clientName?.split(' ')[0] || ''
        setClientFirstName(firstName)
        if (firstName) localStorage.setItem('itinera_guest_name', firstName)
        const rps: RPSummary[] = data.rps ?? []
        if (!rps.some(r => r.slug === profile.slug)) {
          rps.unshift({
            slug: profile.slug,
            displayName: profile.display_name,
            accentColor: accent,
            logoText: profile.logo_text ?? profile.slug.toUpperCase().slice(0, 4),
            totalCount: 0, pendingCount: 0, confirmedCount: 0,
          })
        }
        setRpList(rps)

        // ── Redirection directe vers les réservations ──────────
        const rp = rps.find(r => r.slug === profile.slug) ?? {
          slug: profile.slug,
          displayName: profile.display_name,
          accentColor: accent,
          logoText: profile.logo_text ?? profile.slug.toUpperCase().slice(0, 4),
          totalCount: 0, pendingCount: 0, confirmedCount: 0,
        }
        setViewingRp(rp)
        setScreen('reservations')
        setResaLoading(true)
        fetch(`/api/client/reservations?email=${encodeURIComponent(saved)}&rpSlug=${profile.slug}`)
          .then(r => r.json())
          .then(d => setReservations(Array.isArray(d) ? d : []))
          .catch(() => {})
          .finally(() => setResaLoading(false))
      })
      .catch(() => {})
      .finally(() => { setIdentifyLoading(false); setAutoLoginDone(true) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetIdentity = () => {
    localStorage.removeItem('itinera_guest_email')
    localStorage.removeItem('itinera_guest_name')
    localStorage.removeItem('itinera_guest_rp')
    setEmail('')
    setClientFirstName('')
    setRpList([])
    setNotRegistered(false)
    setError('')
    setShowAccountMenu(false)
    setDeleteConfirm(false)
    router.replace('/')
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await fetch('/api/client/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, rpSlug: profile.slug }),
      })
    } catch { /* non-bloquant */ }
    finally { setDeleteLoading(false) }
    resetIdentity()
  }

  // (auto-redirect supprimé — le menu accueil gère la navigation)

  // ── Sélection d'un RP → charger ses réservations ─────────────
  const selectRP = async (rp: RPSummary) => {
    setViewingRp(rp)
    setResaLoading(true)
    setError('')
    setEditingId(null)
    setCancelConfirmId(null)
    setReservations([])
    setScreen('reservations') // naviguer immédiatement, sans attendre le fetch
    try {
      const res = await fetch(
        `/api/client/reservations?email=${encodeURIComponent(email)}&rpSlug=${rp.slug}`
      )
      const data = await res.json()
      setReservations(Array.isArray(data) ? data : [])
    } catch {
      setError('Erreur lors du chargement.')
    } finally {
      setResaLoading(false)
    }
  }

  // ── Édition ───────────────────────────────────────────────────
  const startEdit = (r: ClientReservation) => {
    setCancelConfirmId(null)
    setEditingId(r.id)
    setEditDate('')
    setEditTime(r.time)
    setEditGuests(String(r.guests))
    setEditNotes(r.special_requests ?? '')
    setError('')
  }

  const cancelEdit = () => { setEditingId(null); setError('') }

  const handleSaveEdit = async (r: ClientReservation) => {
    setSaveLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/modify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: r.id, email, action: 'modify',
          date: editDate || undefined,
          time: editTime !== r.time ? editTime : undefined,
          guests: editGuests !== String(r.guests) ? editGuests : undefined,
          specialRequests: editNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur.'); return }
      setReservations(prev => prev.map(item =>
        item.id === r.id ? {
          ...item, time: editTime, guests: parseInt(editGuests),
          special_requests: editNotes,
          ...(editDate ? {
            date: new Date(editDate).toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })
          } : {}),
        } : item
      ))
      setSuccessMsg('Modification enregistrée. Votre RP a été notifié.')
      setSaveSuccess(r.id)
      setEditingId(null)
      setTimeout(() => { setSaveSuccess(null); setSuccessMsg('') }, 4000)
    } catch { setError('Erreur réseau.') }
    finally { setSaveLoading(false) }
  }

  const handleCancel = async (r: ClientReservation) => {
    setSaveLoading(true)
    setError('')
    try {
      const res = await fetch('/api/client/modify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, email, action: 'cancel' }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erreur.'); return }
      setReservations(prev => prev.map(item =>
        item.id === r.id ? { ...item, status: 'cancelled' as const } : item
      ))
      setRpList(prev => prev.map(rp =>
        rp.slug === viewingRp?.slug
          ? { ...rp, totalCount: Math.max(0, rp.totalCount - 1) }
          : rp
      ))
      setCancelConfirmId(null)
      setSuccessMsg('Réservation annulée. Votre RP a été notifié.')
      setSaveSuccess(r.id)
      setTimeout(() => { setSaveSuccess(null); setSuccessMsg('') }, 4000)
    } catch { setError('Erreur réseau.') }
    finally { setSaveLoading(false) }
  }

  // ════════════════════════════════════════════════════════════════
  // ── ÉCRAN ACCUEIL ────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  if (screen === 'home') {
    // Spinner réutilisable
    const Spinner = ({ label }: { label?: string }) => (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-6 h-6 text-[#F5F5F3]/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {label && <p className="text-[#F5F5F3]/20 text-xs tracking-wider">{label}</p>}
        </div>
      </div>
    )

    // ── 1. Pas encore terminé le check localStorage ──────────────
    if (!autoLoginDone) {
      return <Spinner label="Chargement..." />
    }

    // Pas de session → formulaire email directement sur cette page
    if (showEmailForm) {
      return (
        <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-10">
              <p className="text-[9px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase mb-3">✦ Espace privé</p>
              <h1 className="font-playfair text-3xl text-[#F5F5F3] mb-2">{profile.display_name}</h1>
              <p className="text-[#F5F5F3]/30 text-xs">
                {showRegisterForm ? 'Créez votre accès en quelques secondes' : 'Entrez votre email pour accéder à votre espace'}
              </p>
            </div>

            {showRegisterForm ? (
              /* ── Formulaire d'inscription ── */
              <form onSubmit={handleSelfRegister} className="space-y-3">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="votre@email.com *"
                  required
                  className="w-full bg-[#141414] border border-[#5B3DF5]/30 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/60 transition-colors"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={registerFirstName}
                    onChange={e => setRegisterFirstName(e.target.value)}
                    placeholder="Prénom *"
                    autoFocus
                    required
                    className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
                  />
                  <input
                    type="text"
                    value={registerLastName}
                    onChange={e => setRegisterLastName(e.target.value)}
                    placeholder="Nom"
                    className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
                  />
                </div>
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={e => setRegisterPhone(e.target.value)}
                  placeholder="Téléphone (ex: +33 6 00 00 00 00)"
                  className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
                />
                {registerError && (
                  <p className="text-red-400/70 text-xs text-center border border-red-500/15 bg-red-500/5 px-4 py-3">
                    {registerError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={registerLoading || !registerFirstName.trim()}
                  className="w-full py-4 text-white text-[11px] tracking-[0.3em] uppercase transition-colors disabled:opacity-40"
                  style={{ background: accent }}
                >
                  {registerLoading ? 'Création...' : 'Rejoindre l\'espace →'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRegisterForm(false); setRegisterError('') }}
                  className="w-full text-center text-[10px] text-[#F5F5F3]/20 hover:text-[#F5F5F3]/40 transition-colors py-2"
                >
                  ← Utiliser un autre email
                </button>
              </form>
            ) : (
              /* ── Formulaire email ── */
              <form onSubmit={handleEmailAccess} className="space-y-4">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="votre@email.com"
                  autoFocus
                  required
                  className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
                />
                {emailInputError && (
                  <p className="text-red-400/70 text-xs text-center border border-red-500/15 bg-red-500/5 px-4 py-3">
                    {emailInputError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={emailInputLoading}
                  className="w-full py-4 bg-[#5B3DF5] text-white text-[11px] tracking-[0.3em] uppercase hover:bg-[#4930cc] transition-colors disabled:opacity-40"
                >
                  {emailInputLoading ? 'Vérification...' : 'Accéder à mon espace →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )
    }

    // ── 2. Pas de session → formulaire email (déjà géré plus bas) ──
    // showEmailForm est true → le bloc ci-dessus le capte

    // ── 3. Session présente mais profil incomplet ────────────────
    // On ne bloque que si le prénom est manquant — le téléphone est collecté à la réservation
    const needsProfile = !clientFirstName

    if (showProfileCompletion || needsProfile) {
      return (
        <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-10">
              <p className="text-[9px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase mb-3">✦ {profile.display_name}</p>
              <h1 className="font-playfair text-3xl text-[#F5F5F3] mb-2">Complétez votre profil</h1>
              <p className="text-[#F5F5F3]/30 text-xs">Ces informations seront pré-remplies dans vos réservations</p>
            </div>
            <form onSubmit={handleProfileComplete} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)}
                  placeholder="Prénom *" required autoFocus
                  className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
                />
                <input type="text" value={profileLastName} onChange={e => setProfileLastName(e.target.value)}
                  placeholder="Nom"
                  className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
                />
              </div>
              <input type="tel" value={profilePhone} onChange={e => setProfilePhone(e.target.value)}
                placeholder="Téléphone (ex: +33 6 00 00 00 00)" required
                className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-[#5B3DF5]/40 transition-colors"
              />
              <button type="submit" disabled={profileLoading || !profileFirstName.trim() || !profilePhone.trim()}
                className="w-full py-4 text-white text-[11px] tracking-[0.3em] uppercase transition-colors disabled:opacity-40"
                style={{ background: accent }}>
                Continuer vers mon espace →
              </button>
            </form>
          </div>
        </div>
      )
    }

    // ── 4. Identifié + profil complet → menu principal ──────────────
    const goToReservations = () => {
      const rpSummary: RPSummary = rpList.find(r => r.slug === profile.slug) ?? {
        slug: profile.slug,
        displayName: profile.display_name,
        accentColor: accent,
        logoText: profile.logo_text ?? profile.slug.toUpperCase().slice(0, 4),
        totalCount: 0, pendingCount: 0, confirmedCount: 0,
      }
      selectRP(rpSummary)
    }

    return (
      <div className="min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-[9px] tracking-[0.5em] text-[#F5F5F3]/20 uppercase mb-3">✦ Espace privé</p>
            <h1 className="font-playfair text-3xl text-[#F5F5F3] mb-2">{profile.display_name}</h1>
            <p className="font-playfair text-base text-[#F5F5F3]/30 italic">
              Bonjour, <span style={{ color: accent }}>{clientFirstName}</span>
            </p>
          </div>

          {/* Menu cards */}
          <div className="space-y-3">
            {/* Mes réservations */}
            <button
              onClick={goToReservations}
              className="w-full text-left bg-[#141414] border border-white/8 hover:border-white/20 px-6 py-5 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.35em] uppercase mb-1" style={{ color: accent + 'aa' }}>Espace</p>
                  <p className="text-[#F5F5F3] text-base font-medium">Mes réservations</p>
                </div>
                <span className="text-[#F5F5F3]/20 group-hover:text-[#F5F5F3]/50 transition-colors text-lg">→</span>
              </div>
            </button>

            {/* Mon compte */}
            <button
              onClick={() => {
                setProfileFirstName(clientFirstName)
                setProfileLastName(localStorage.getItem('itinera_guest_lastname') || '')
                setProfilePhone(localStorage.getItem('itinera_guest_phone') || '')
                setProfileEmail(email)
                setProfileSaved(false)
                setScreen('profile')
              }}
              className="w-full text-left bg-[#141414] border border-white/8 hover:border-white/20 px-6 py-5 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] tracking-[0.35em] uppercase mb-1" style={{ color: accent + 'aa' }}>Compte</p>
                  <p className="text-[#F5F5F3] text-base font-medium">Mon compte</p>
                </div>
                <span className="text-[#F5F5F3]/20 group-hover:text-[#F5F5F3]/50 transition-colors text-lg">→</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // ── ÉCRAN PROFIL ─────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  if (screen === 'profile') {
    return (
      <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">
        <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-5 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-playfair italic text-white/70 text-xl leading-none">{profile.display_name}</span>
            <span className="text-white/15 text-base">·</span>
            <p className="font-playfair italic text-lg text-white/35 truncate capitalize">{clientFirstName}</p>
          </div>
          <button
            onClick={() => setScreen('reservations')}
            className="flex-shrink-0 text-[#F5F5F3]/25 hover:text-[#F5F5F3]/60 transition-colors text-[10px] tracking-[0.2em] uppercase border border-white/8 hover:border-white/20 px-3 py-1.5"
          >
            ← Mes réservations
          </button>
        </div>

        <div className="max-w-md mx-auto px-5 py-10 space-y-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">Email</label>
            <input
              type="email"
              value={profileEmail}
              onChange={e => setProfileEmail(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">Prénom</label>
              <input
                type="text"
                value={profileFirstName}
                onChange={e => setProfileFirstName(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">Nom</label>
              <input
                type="text"
                value={profileLastName}
                onChange={e => setProfileLastName(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] tracking-[0.25em] uppercase text-[#F5F5F3]/30 mb-2">Téléphone</label>
            <input
              type="tel"
              value={profilePhone}
              onChange={e => setProfilePhone(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 text-[#F5F5F3] px-4 py-3.5 text-sm outline-none placeholder-[#F5F5F3]/15 focus:border-white/25 transition-colors"
            />
          </div>

          {profileSaved && (
            <p className="text-green-400/80 text-xs text-center border border-green-500/15 bg-green-500/5 px-4 py-3">
              ✓ Profil mis à jour
            </p>
          )}

          <button
            onClick={() => {
              if (profileEmail.trim()) {
                localStorage.setItem('itinera_guest_email', profileEmail.trim().toLowerCase())
                setEmail(profileEmail.trim().toLowerCase())
              }
              if (profileFirstName.trim()) {
                localStorage.setItem('itinera_guest_name', profileFirstName.trim())
                setClientFirstName(profileFirstName.trim())
              }
              if (profileLastName.trim()) localStorage.setItem('itinera_guest_lastname', profileLastName.trim())
              if (profilePhone.trim()) localStorage.setItem('itinera_guest_phone', profilePhone.trim())
              setProfileSaved(true)
              setTimeout(() => setProfileSaved(false), 3000)
            }}
            className="w-full py-4 text-white text-[11px] tracking-[0.3em] uppercase transition-colors"
            style={{ background: accent }}
          >
            Enregistrer
          </button>

          {/* Déconnexion + Suppression */}
          <div className="pt-6 border-t border-white/8 mt-6 space-y-2">
            <button
              onClick={resetIdentity}
              className="w-full py-3.5 text-[#F5F5F3]/30 hover:text-[#F5F5F3]/60 text-[11px] tracking-[0.3em] uppercase transition-colors border border-white/8 hover:border-white/20"
            >
              Se déconnecter
            </button>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full py-3 text-[10px] tracking-[0.2em] uppercase border border-white/5 text-[#F5F5F3]/15 hover:border-red-500/20 hover:text-red-400/40 transition-all"
              >
                🗑 Supprimer mon compte
              </button>
            ) : (
              <div className="border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <p className="text-red-400/70 text-sm text-center font-medium">Supprimer définitivement votre compte ?</p>
                <p className="text-[#F5F5F3]/25 text-xs text-center">Toutes vos données seront effacées. Action irréversible.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="py-2.5 text-[10px] tracking-[0.15em] uppercase border border-white/10 text-[#F5F5F3]/30 hover:border-white/20 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="py-2.5 text-[10px] tracking-[0.15em] uppercase bg-red-500/80 hover:bg-red-500 text-white transition-colors disabled:opacity-40"
                  >
                    {deleteLoading ? '...' : 'Confirmer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════
  // ── ÉCRAN RÉSERVATIONS ───────────────────────────────────────
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F5F5F3]">

      <div className="sticky top-0 z-10 bg-[#0B0B0B]/95 backdrop-blur-sm border-b border-white/5 px-5 py-3 flex items-center gap-2">
        <button
          onClick={() => setScreen('home')}
          className="flex-shrink-0 text-[#F5F5F3]/25 hover:text-[#F5F5F3]/60 transition-colors text-lg leading-none pr-1"
          aria-label="Retour"
        >
          ←
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-playfair italic text-white/70 text-xl leading-none flex-shrink-0">{profile.display_name}</span>
          <span className="text-white/15 text-base flex-shrink-0">·</span>
          <p className="font-playfair italic text-lg text-white/35 truncate capitalize">{clientFirstName}</p>
        </div>
        {resaLoading && (
          <svg className="animate-spin w-4 h-4 text-[#F5F5F3]/20 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
        <button
          onClick={() => {
            setProfileFirstName(clientFirstName)
            setProfileLastName(localStorage.getItem('itinera_guest_lastname') || '')
            setProfilePhone(localStorage.getItem('itinera_guest_phone') || '')
            setProfileEmail(email)
            setProfileSaved(false)
            setDeleteConfirm(false)
            setScreen('profile')
          }}
          className="flex-shrink-0 text-[#F5F5F3]/25 hover:text-[#F5F5F3]/60 transition-colors text-[10px] tracking-[0.2em] uppercase border border-white/8 hover:border-white/20 px-3 py-1.5"
        >
          Mon compte
        </button>
      </div>

      <div className="px-4 py-6 max-w-xl mx-auto pb-24">

        {saveSuccess && successMsg && (
          <div className="border border-green-500/20 bg-green-500/8 text-green-400 text-sm px-4 py-3 mb-4 flex items-center gap-2">
            <span>✓</span><span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="border border-red-400/20 bg-red-400/5 text-red-400/70 text-sm px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Onglets filtre par statut — comme le dashboard RP */}
        {!resaLoading && reservations.length > 0 && (() => {
          const counts = {
            all: reservations.length,
            pending: reservations.filter(r => r.status === 'pending').length,
            confirmed: reservations.filter(r => r.status === 'confirmed').length,
            declined: reservations.filter(r => r.status === 'declined').length,
          }
          return (
            <div className="grid grid-cols-4 border border-white/5 mb-5 -mx-4">
              {(['all', 'pending', 'confirmed', 'declined'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setResaFilter(s)}
                  className={`py-4 text-center transition-all border-b-2 ${resaFilter === s ? 'border-[#5B3DF5] bg-[#5B3DF5]/5' : 'border-transparent hover:bg-white/3'}`}
                >
                  <div className={`text-2xl font-light ${
                    resaFilter === s ? 'text-white' :
                    s === 'pending' ? 'text-amber-300/80' :
                    s === 'confirmed' ? 'text-green-300/80' :
                    s === 'declined' ? 'text-red-300/60' :
                    'text-white/70'
                  }`}>
                    {counts[s]}
                  </div>
                  <div className={`text-[8px] tracking-wider uppercase mt-0.5 ${
                    resaFilter === s ? 'text-white/70' :
                    s === 'pending' ? 'text-amber-300/50' :
                    s === 'confirmed' ? 'text-green-300/50' :
                    s === 'declined' ? 'text-red-300/40' :
                    'text-white/40'
                  }`}>
                    {s === 'all' ? 'Total' : s === 'pending' ? 'En attente' : s === 'confirmed' ? 'Confirmé' : 'Refusé'}
                  </div>
                </button>
              ))}
            </div>
          )
        })()}

        {resaLoading ? (
          <div className="flex items-center justify-center h-40 text-[#F5F5F3]/20 text-sm">Chargement…</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-8 opacity-10">✦</span>
            <p className="text-[9px] tracking-[0.5em] uppercase mb-4" style={{ color: (viewingRp?.accentColor ?? accent) + '60' }}>
              Mon espace
            </p>
            <h2 className="font-playfair text-3xl text-[#F5F5F3]/80 mb-1 italic">
              {clientFirstName ? (
                <>Bonjour, <span style={{ color: (viewingRp?.accentColor ?? accent) }}>{clientFirstName}</span></>
              ) : 'Aucune réservation'}
            </h2>
            <p className="font-playfair text-base text-[#F5F5F3]/25 italic mb-8">
              avec <span className="text-[#F5F5F3]/40">{viewingRp?.displayName ?? profile.display_name}</span>
            </p>
            <p className="text-[#F5F5F3]/20 text-xs mb-10 leading-relaxed max-w-xs mx-auto">
              Votre concierge est prêt à vous réserver la meilleure table.<br />Faites votre première demande.
            </p>
            <Link
              href={`/${profile.slug}/book`}
              className="inline-block text-white text-[11px] tracking-[0.25em] uppercase py-4 px-10 hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${viewingRp?.accentColor ?? accent}, ${(viewingRp?.accentColor ?? accent)}bb)` }}
            >
              Faire une réservation
            </Link>
          </div>
        ) : (
          <>
            {(() => {
              const filtered = resaFilter === 'all' ? reservations : reservations.filter(r => r.status === resaFilter)
              if (filtered.length === 0) return (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                  <span className="text-3xl opacity-10">✦</span>
                  <p className="text-[#F5F5F3]/20 text-sm">Aucune réservation dans ce filtre.</p>
                </div>
              )
              return (
            <div className="space-y-4">
              {filtered.map(r => {
                const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.declined
                const isEditing = editingId === r.id
                const isConfirmingCancel = cancelConfirmId === r.id

                return (
                  <div key={r.id} className={`border ${cfg.border} ${cfg.bg}`}>

                    {/* Status bar */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1">
                        <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-[#F5F5F3]/20 text-[10px]">{cfg.sublabel}</p>
                      </div>
                      {/* RP tag */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[8px] tracking-[0.2em] uppercase text-[#F5F5F3]/20">via</span>
                        <span className="font-playfair italic text-sm leading-none" style={{ color: accent + 'cc' }}>
                          {profile.display_name}
                        </span>
                      </div>
                    </div>

                    <div className="px-5 py-4">
                      <p className="font-playfair text-lg text-[#F5F5F3] mb-4">
                        {r.establishment}
                        {r.destination ? <span className="font-sans font-normal text-white/35 text-xs"> · {r.destination}</span> : ''}
                      </p>

                      {!isEditing && !isConfirmingCancel ? (
                        <>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            {[
                              { label: 'Date', value: r.date },
                              { label: 'Service', value: r.time },
                              { label: 'Personnes', value: `${r.guests}` },
                            ].map(item => (
                              <div key={item.label}>
                                <p className="text-[9px] tracking-wider text-white/50 uppercase mb-1">{item.label}</p>
                                <p className="text-white text-xs leading-tight">{item.value}</p>
                              </div>
                            ))}
                          </div>
                          {r.special_requests && (
                            <div className="border-l-2 border-white/10 pl-3 mb-3">
                              <p className="text-[#F5F5F3]/30 text-xs italic">"{r.special_requests}"</p>
                            </div>
                          )}

                          {(cfg.canModify || cfg.canCancel) && (
                            <div className="grid grid-cols-2 gap-2 mt-3">
                              {cfg.canModify && (
                                <button
                                  onClick={() => startEdit(r)}
                                  className="border text-[9px] tracking-[0.2em] uppercase py-2.5 hover:opacity-80 transition-all"
                                  style={{ borderColor: (viewingRp?.accentColor ?? accent) + '30', color: (viewingRp?.accentColor ?? accent) + '90' }}
                                >
                                  ✎ Modifier
                                </button>
                              )}
                              {cfg.canCancel && (
                                <button
                                  onClick={() => { setCancelConfirmId(r.id); setEditingId(null) }}
                                  className="border border-red-500/15 text-red-400/40 text-[9px] tracking-[0.2em] uppercase py-2.5 hover:bg-red-500/5 hover:border-red-500/30 hover:text-red-400/60 transition-all"
                                >
                                  ✕ Annuler
                                </button>
                              )}
                            </div>
                          )}

                          {/* WhatsApp direct RP */}
                          {r.status !== 'cancelled' && (() => {
                            const waPhone = profile.whatsapp?.replace(/[^0-9]/g, '') || ''
                            const waText = encodeURIComponent(`Bonjour ${profile.display_name}, je souhaitais vous contacter concernant ma réservation chez ${r.establishment} le ${r.date}.`)
                            const waHref = waPhone
                              ? `https://wa.me/${waPhone}?text=${waText}`
                              : `https://wa.me/?text=${waText}`
                            return (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full mt-3 py-3 border border-[#25D366]/20 text-[#25D366]/60 text-[10px] tracking-[0.2em] uppercase hover:bg-[#25D366]/5 hover:border-[#25D366]/35 hover:text-[#25D366]/80 transition-all"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.534 5.858L0 24l6.335-1.512A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.003-1.368l-.36-.214-3.722.888.923-3.63-.235-.374A9.818 9.818 0 0 1 2.182 12c0-5.42 4.398-9.818 9.818-9.818 5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>
                                Contacter {profile.display_name}
                              </a>
                            )
                          })()}
                        </>
                      ) : isConfirmingCancel ? (
                        <div className="space-y-4">
                          <div className="border border-red-500/20 bg-red-500/5 p-4 text-center">
                            <p className="text-red-400/80 text-sm font-medium mb-1">Confirmer l'annulation ?</p>
                            <p className="text-[#F5F5F3]/30 text-xs">Votre RP sera notifié. Action irréversible.</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setCancelConfirmId(null)} disabled={saveLoading}
                              className="border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase py-3 hover:border-white/20 transition-colors disabled:opacity-40">
                              Retour
                            </button>
                            <button onClick={() => handleCancel(r)} disabled={saveLoading}
                              className="bg-red-500/80 hover:bg-red-500 text-white text-[10px] tracking-[0.2em] uppercase py-3 transition-colors disabled:opacity-40">
                              {saveLoading ? 'En cours...' : 'Annuler la résa'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: (viewingRp?.accentColor ?? accent) + '70' }}>
                            Modifier la réservation
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Nouvelle date</label>
                              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none [color-scheme:dark]" />
                              <p className="text-[8px] text-[#F5F5F3]/15 mt-1">Actuelle : {r.date}</p>
                            </div>
                            <div>
                              <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Personnes</label>
                              <select value={editGuests} onChange={e => setEditGuests(e.target.value)}
                                className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none cursor-pointer">
                                {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                                  <option key={n} value={n} className="bg-[#0B0B0B]">{n} personne{n > 1 ? 's' : ''}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Service</label>
                            <select value={editTime} onChange={e => setEditTime(e.target.value)}
                              className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none cursor-pointer">
                              {SERVICES.map(g => (
                                <optgroup key={g.group} label={`─ ${g.group}`}>
                                  {g.options.map(o => (
                                    <option key={o} value={o} className="bg-[#0B0B0B]">{o}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[8px] tracking-wider text-[#F5F5F3]/25 uppercase mb-1.5">Notes</label>
                            <textarea rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)}
                              className="w-full bg-[#0B0B0B] border border-white/10 text-[#F5F5F3] px-3 py-2.5 text-xs outline-none resize-none placeholder-[#F5F5F3]/15"
                              placeholder="Informations complémentaires..." />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={cancelEdit} disabled={saveLoading}
                              className="border border-white/10 text-[#F5F5F3]/30 text-[10px] tracking-[0.2em] uppercase py-3 hover:border-white/20 transition-colors disabled:opacity-40">
                              Retour
                            </button>
                            <button onClick={() => handleSaveEdit(r)} disabled={saveLoading}
                              className="text-white text-[10px] tracking-[0.2em] uppercase py-3 hover:opacity-90 transition-opacity disabled:opacity-40"
                              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}>
                              {saveLoading ? 'Envoi...' : 'Confirmer'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
              )
            })()}

          </>
        )}
      </div>
    </div>
  )
}
