import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as any,
})

// ── Price IDs ────────────────────────────────────────────────
export const PRICE_IDS = {
  rp:    'price_1TZvyN6e9euPeTHc4OnOBs4d',
  venue: 'price_1TZvzR6e9euPeTHc7hFCdybG',
  group: 'price_1TZw0B6e9euPeTHc1FsPpdQp',
} as const

export type PlanType = keyof typeof PRICE_IDS

// ── Plan display info ────────────────────────────────────────
export const PLAN_LABELS: Record<PlanType, string> = {
  rp:    'Itinera RP',
  venue: 'Itinera Venue',
  group: 'Itinera Group',
}

export const PLAN_PRICES: Record<PlanType, string> = {
  rp:    '19,90 €',
  venue: '49,90 €',
  group: '149,90 €',
}

export const PLAN_FEATURES: Record<PlanType, string[]> = {
  rp: [
    'Réservations illimitées',
    'Page concierge personnalisée',
    'Gestion clients & notes VIP',
    'Connexion aux établissements partenaires',
    'Accès prioritaire aux nouvelles fonctionnalités',
  ],
  venue: [
    'Réservations illimitées',
    'Dashboard établissement complet',
    'Connexion concierges partenaires',
    'Statistiques & historique',
    'Accès prioritaire aux nouvelles fonctionnalités',
  ],
  group: [
    'Gestion multi-établissements illimitée',
    'Concierges partenaires à l\'échelle du groupe',
    'Statistiques par RP & par établissement',
    'Dashboard groupe centralisé',
    'Accès prioritaire aux nouvelles fonctionnalités',
  ],
}

// ── Supabase table lookup ────────────────────────────────────
export const PLAN_TABLE: Record<PlanType, string> = {
  rp:    'rp_profiles',
  venue: 'venues_profiles',
  group: 'hospitality_groups',
}
