// Utilitaires purs pour la gestion des venues personnalisées RP
// Importable côté client ET serveur (aucune dépendance Supabase)

export type VenueConfig = {
  name: string
  destination?: string   // slug de la destination (ex: 'saint-tropez')
  services?: string[]    // créneaux dispo (undefined = tous par défaut)
}

// Tous les créneaux disponibles (même valeurs que dans RPReservationForm)
export const ALL_SERVICES = [
  'Premier service — Déjeuner (12h30)',
  'Deuxième service — Déjeuner (14h30)',
  'Premier service — Dîner (19h30)',
  'Deuxième service — Dîner (21h30)',
  'Beach Club — Ouverture (11h00)',
  'Beach Club — Sunset (17h00)',
  'Club — Entrée early (22h00)',
  'Club — Entrée late night (00h00)',
  'Brunch (11h00)',
  'Cocktails (18h00)',
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
  const hasExtra = v.destination || (v.services && v.services.length > 0)
  if (!hasExtra) return v.name
  return JSON.stringify(v)
}
