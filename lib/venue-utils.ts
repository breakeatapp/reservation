// Utilitaires purs pour la gestion des venues personnalisées RP
// Importable côté client ET serveur (aucune dépendance Supabase)

export type VenueType = 'restaurant' | 'beach_club' | 'night_club'

export type VenueConfig = {
  name: string
  destination?: string   // slug de la destination (ex: 'saint-tropez')
  services?: string[]    // créneaux dispo (undefined = tous par défaut)
  type?: VenueType       // catégorie de la venue
}

// ── Créneaux par catégorie ────────────────────────────────────────────────────

export const RESTAURANT_SERVICES = [
  'Déjeuner — 1er service (12h30)',
  'Déjeuner — 1er service (13h30)',
  'Déjeuner — 2ème service (15h30)',
  'Dîner — 1er service (17h30)',
  'Dîner — 2ème service (20h00)',
  'Dîner — 3ème service (22h30)',
  'Brunch (11h00)',
]

export const BEACH_CLUB_SERVICES = [
  'Matelas journée',
  'Ouverture (11h00)',
  'Sunset (17h00)',
]

export const NIGHT_CLUB_SERVICES = [
  'Entrée early (22h00)',
  'Entrée late night (00h00)',
]

export const SERVICES_BY_TYPE: Record<VenueType, string[]> = {
  restaurant: RESTAURANT_SERVICES,
  beach_club: BEACH_CLUB_SERVICES,
  night_club: NIGHT_CLUB_SERVICES,
}

// Tous les créneaux (rétrocompatibilité)
export const ALL_SERVICES = [
  ...RESTAURANT_SERVICES,
  ...BEACH_CLUB_SERVICES,
  ...NIGHT_CLUB_SERVICES,
]

/** Désérialise une entrée de activated_venues (string JSON ou nom brut) */
export function parseVenueEntry(raw: string): VenueConfig {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.name) return parsed as VenueConfig
  } catch {
    // pas du JSON
  }
  return { name: raw }
}

/** Sérialise un VenueConfig en string pour stockage dans activated_venues */
export function serializeVenueEntry(v: VenueConfig): string {
  const hasExtra = v.destination || (v.services && v.services.length > 0) || v.type
  if (!hasExtra) return v.name
  return JSON.stringify(v)
}

/** Normalise un type Establishment (data.ts) vers VenueType */
export function normalizeEstType(type: string): VenueType {
  if (type === 'Beach Club') return 'beach_club'
  if (type === 'Nightclub') return 'night_club'
  return 'restaurant' // Restaurant, Rooftop, Lounge → restaurant
}
