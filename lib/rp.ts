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
    tagline: 'Hospitality Planning Between RPs & Guests',
    email: 'notta.remi@hotmail.fr',
    whatsapp: '33646695675',
    dashboard_password: 'elite2024',
    active: true,
    activated_destinations: ['saint-tropez', 'dubai', 'miami', 'cannes', 'monaco', 'courchevel', 'saint-barth'],
    activated_venues: [],   // vide = toutes les venues de ses destinations
    cover_image: undefined,
    logo_text: 'ÉLITE',
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

    if (!error && data) return data as RPProfile
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
// Si activated_venues est renseigné → seulement ceux-là
export function getRPEstablishments(rp: RPProfile): Establishment[] {
  const rpDests = rp.activated_destinations ?? []
  const rpVenues = rp.activated_venues ?? []

  // Filtrer d'abord par destinations activées
  const byDest = rpDests.length > 0
    ? establishments.filter(e => rpDests.includes(e.destination))
    : establishments

  // Si le RP a spécifié des venues précises, on filtre encore
  if (rpVenues.length > 0) {
    return byDest.filter(e => rpVenues.includes(e.name))
  }

  return byDest
}

// ── Options pour le formulaire de réservation ─────────────
export function getRPEstablishmentOptions(rp: RPProfile) {
  const ests = getRPEstablishments(rp)
  const rpDests = getRPDestinations(rp)

  return ests.map(e => ({
    value: e.name,
    label: `${e.name} — ${rpDests.find(d => d.slug === e.destination)?.name ?? e.destination}`,
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
