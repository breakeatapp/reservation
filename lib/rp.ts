import { RPProfile } from './supabase'
import { supabaseAdmin as supabase } from './supabase-admin'
import { establishments, destinations, type Establishment, type Destination } from './data'

// ── Profils RP codés en dur (fallback si Supabase pas encore configuré)
// Ajouter un RP ici suffit pour le faire fonctionner sans base de données
const FALLBACK_PROFILES: Record<string, RPProfile> = {
  remi: {
    id: 'local-remi',
    slug: 'remi',
    display_name: 'ITINERA',
    tagline: 'Hospitality, Organized.',
    email: 'notta.remi@hotmail.fr',
    whatsapp: '33646695675',
    dashboard_password: 'elite2024',
    active: true,
    activated_destinations: ['saint-tropez', 'dubai', 'miami', 'cannes', 'monaco', 'courchevel', 'saint-barth'],
    activated_venues: [],   // vide = toutes les venues de ses destinations
    cover_image: undefined,
    logo_text: '',
    accent_color: '#5B3DF5',
    created_at: new Date().toISOString(),
  },
}

// ── Fetch un profil RP par slug ────────────────────────────
// Priorité : Supabase → fallback local
export async function getRPProfile(slug: string): Promise<RPProfile | null> {
  // 1. Essayer Supabase en premier
  try {
    const { data, error } = await supabase
      .from('rp_profiles')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (!error && data) {
      const profile = data as RPProfile
      // Migration silencieuse : corriger les anciens libellés en base
      const updates: Record<string, string> = {}
      if (profile.tagline === 'Votre accès privé aux meilleures tables') {
        profile.tagline = 'Hospitality, Organized.'
        updates.tagline = profile.tagline
      }
      if (profile.display_name === 'Élite Reservations' || profile.display_name === 'Elite Reservations') {
        profile.display_name = 'ITINERA'
        updates.display_name = profile.display_name
      }
      if (profile.logo_text === 'ÉLITE' || profile.logo_text === 'ELITE' || profile.logo_text === 'Élite') {
        profile.logo_text = ''
        updates.logo_text = ''
      }
      if (Object.keys(updates).length > 0) {
        supabase.from('rp_profiles').update(updates).eq('slug', slug).then(() => {})
      }
      return profile
    }
  } catch {
    // Supabase pas encore configuré ou table inexistante → fallback
  }

  // 2. Fallback : profil codé en dur
  return FALLBACK_PROFILES[slug] ?? null
}

// ── Destinations accessibles pour un RP ───────────────────
export function getRPDestinations(rp: RPProfile): Destination[] {
  if (!rp.activated_destinations || rp.activated_destinations.length === 0) {
    return destinations
  }
  return destinations.filter(d => rp.activated_destinations.includes(d.slug))
}

// ── Établissements accessibles pour un RP ─────────────────
// Si activated_venues est vide → tous les venues de ses destinations
// Si activated_venues est renseigné → ceux-là + venues personnalisées (non dans data.ts)
export function getRPEstablishments(rp: RPProfile): Establishment[] {
  const rpDests = rp.activated_destinations ?? []
  const rpVenues = rp.activated_venues ?? []

  // Filtrer d'abord par destinations activées
  const byDest = rpDests.length > 0
    ? establishments.filter(e => rpDests.includes(e.destination))
    : establishments

  if (rpVenues.length > 0) {
    // Venues qui existent dans les données globales
    const globalMatches = byDest.filter(e => rpVenues.includes(e.name))
    // Venues personnalisées : noms dans activated_venues mais absents de data.ts
    const globalNames = new Set(establishments.map(e => e.name))
    const customNames = rpVenues.filter(name => !globalNames.has(name))
    const primaryDest = rpDests[0] || 'custom'
    const customEsts: Establishment[] = customNames.map(name => ({
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      destination: primaryDest,
      name,
      type: 'Restaurant' as const,
      description: '',
      shortDesc: name,
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      priceRange: '€€€€' as const,
      phone: '', email: '', address: '', openTime: '', closeTime: '',
      tags: [],
    }))
    return [...globalMatches, ...customEsts]
  }

  return byDest
}

// ── Options pour le formulaire de réservation ─────────────
export function getRPEstablishmentOptions(rp: RPProfile) {
  const ests = getRPEstablishments(rp)
  const rpDests = getRPDestinations(rp)

  return ests.map(e => ({
    value: e.name,
    label: rpDests.find(d => d.slug === e.destination)
      ? `${e.name} — ${rpDests.find(d => d.slug === e.destination)!.name}`
      : e.name,
  }))
}

// ── Vérifier le mot de passe dashboard RP ─────────────────
export async function verifyRPPassword(slug: string, password: string): Promise<boolean> {
  // 1. Essayer Supabase
  try {
    const { data, error } = await supabase
      .from('rp_profiles')
      .select('dashboard_password')
      .eq('slug', slug)
      .single()

    if (!error && data) return data.dashboard_password === password
  } catch {
    // Table inexistante → fallback
  }

  // 2. Fallback : vérifier contre le profil local
  return FALLBACK_PROFILES[slug]?.dashboard_password === password
}

// ── Réservations d'un RP ───────────────────────────────────
export async function getRPReservations(slug: string) {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('rp_slug', slug)
      .order('created_at', { ascending: false })

    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

// ── Mettre à jour le statut d'une réservation ─────────────
export async function updateReservationStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'declined',
  rpSlug: string
) {
  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .eq('rp_slug', rpSlug) // sécurité : un RP ne peut modifier que ses réservations

  return !error
}
