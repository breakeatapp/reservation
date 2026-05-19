import { RPProfile } from './supabase'
import { supabaseAdmin as supabase } from './supabase-admin'
import { establishments, destinations, type Establishment, type Destination } from './data'
import { parseVenueEntry } from './venue-utils'

// Tous les profils RP sont désormais gérés exclusivement dans Supabase
const FALLBACK_PROFILES: Record<string, RPProfile> = {}

// ── Fetch un profil RP par slug ────────────────────────────
// Priorité : Supabase → fallback local
export async function getRPProfile(slug: string): Promise<RPProfile | null> {
  // Normaliser le slug en minuscules (l'URL peut avoir des majuscules)
  const normalizedSlug = slug.toLowerCase().trim()

  // 1. Essayer Supabase en premier
  try {
    const { data, error } = await supabase
      .from('rp_profiles')
      .select('*')
      .eq('slug', normalizedSlug)
      .eq('active', true)
      .single()

    console.log('[getRPProfile]', { slug: normalizedSlug, found: !!data, errorCode: error?.code, errorMsg: error?.message })

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
  return FALLBACK_PROFILES[normalizedSlug] ?? null
}

// ── Destinations accessibles pour un RP ───────────────────
// Supporte les slugs prédéfinis ET les destinations personnalisées (JSON)
// Filtre les destinations custom marquées active: false
export function getRPDestinations(rp: RPProfile): Destination[] {
  if (!rp.activated_destinations || rp.activated_destinations.length === 0) {
    return destinations
  }
  const result: Destination[] = []
  for (const raw of rp.activated_destinations) {
    // Tenter de parser en tant que destination personnalisée JSON
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.slug && parsed?.name) {
        // Skip si désactivée (active: false explicitement)
        if (parsed.active === false) continue
        result.push({
          slug: parsed.slug,
          name: parsed.name,
          country: parsed.country || '',
          description: parsed.description || '',
          image: parsed.image || 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&q=80',
          emoji: parsed.emoji || '📍',
        })
        continue
      }
    } catch { /* pas du JSON → slug prédéfini */ }
    // Destination prédéfinie
    const found = destinations.find(d => d.slug === raw)
    if (found) result.push(found)
  }
  return result
}

// Helper : extrait tous les slugs (plain + JSON) d'un array activated_destinations
// — utilisé pour matcher correctement les establishments.destination contre le storage mixte
function extractDestSlugs(activated: string[]): Set<string> {
  const set = new Set<string>()
  for (const raw of activated) {
    try {
      const p = JSON.parse(raw)
      if (p?.slug && p.active !== false) set.add(p.slug)
    } catch {
      set.add(raw) // slug prédéfini en clair
    }
  }
  return set
}

// ── Établissements accessibles pour un RP ─────────────────
// Si activated_venues est vide → tous les venues de ses destinations
// Si activated_venues est renseigné → ceux-là + venues personnalisées (non dans data.ts)
export function getRPEstablishments(rp: RPProfile): Establishment[] {
  const rpDests = rp.activated_destinations ?? []
  const rpVenues = rp.activated_venues ?? []

  // Construire le Set des slugs activés (plain + JSON parsé, sans les inactifs)
  const activeDestSlugs = extractDestSlugs(rpDests)

  // Filtrer les establishments par destinations activées (Set match correct pour custom + prédéfinis)
  const byDest = rpDests.length > 0
    ? establishments.filter(e => activeDestSlugs.has(e.destination))
    : establishments

  if (rpVenues.length > 0) {
    // Parser toutes les entrées (JSON ou plain string) — exclure les venues désactivées
    const venueConfigs = rpVenues.map(parseVenueEntry).filter(v => v.active !== false)
    const venueNames = venueConfigs.map(v => v.name)

    // Venues qui existent dans les données globales (on enrichit avec services si configurés)
    const globalNames = new Set(establishments.map(e => e.name))
    const globalMatches = byDest
      .filter(e => venueNames.includes(e.name))
      .map(e => {
        const cfg = venueConfigs.find(v => v.name === e.name)
        return cfg?.services && cfg.services.length > 0
          ? { ...e, services: cfg.services }
          : e
      })

    // Venues personnalisées : noms non présents dans data.ts
    const customConfigs = venueConfigs.filter(v => !globalNames.has(v.name))
    // primaryDest : premier slug activé (priorité aux customs si présents, puis prédéfinis)
    const primaryDest = Array.from(activeDestSlugs)[0] || 'custom'
    const customEsts: Establishment[] = customConfigs.map(v => ({
      slug: v.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      destination: v.destination || primaryDest,
      name: v.name,
      type: 'Restaurant' as const,
      description: '',
      shortDesc: v.name,
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      priceRange: '€€€€' as const,
      phone: '', email: '', address: '', openTime: '', closeTime: '',
      tags: [],
      services: v.services && v.services.length > 0 ? v.services : undefined,
    }))

    return [...globalMatches, ...customEsts]
  }

  return byDest
}

// ── Map venue → créneaux personnalisés ────────────────────
// Retourne un objet { [venueName]: string[] } pour les venues avec créneaux configurés
export function getRPVenueServices(rp: RPProfile): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  for (const raw of rp.activated_venues ?? []) {
    const vc = parseVenueEntry(raw)
    if (vc.active === false) continue  // ignorer les venues désactivées
    if (vc.services && vc.services.length > 0) {
      map[vc.name] = vc.services
    }
  }
  return map
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
