-- ============================================================
-- ÉLITE RESERVATIONS — Schéma multi-RP (Phase 2)
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ── 1. Profils RP ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rp_profiles (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                  TEXT UNIQUE NOT NULL,          -- ex: "remi", "antoine"
  display_name          TEXT NOT NULL,                  -- ex: "Élite Reservations"
  tagline               TEXT DEFAULT 'Votre accès privé aux meilleures tables',
  email                 TEXT NOT NULL,
  whatsapp              TEXT,                           -- ex: "33646695675"
  dashboard_password    TEXT NOT NULL,                  -- mot de passe dashboard RP
  active                BOOLEAN DEFAULT true,
  -- Destinations activées (slugs depuis lib/data.ts)
  activated_destinations TEXT[] DEFAULT '{}',
  -- Venues activées (noms depuis lib/data.ts)
  activated_venues      TEXT[] DEFAULT '{}',
  -- Branding
  cover_image           TEXT,
  logo_text             TEXT,                           -- si pas d'image
  accent_color          TEXT DEFAULT '#5B3DF5',
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 2. Mise à jour table reservations ──────────────────────
-- Ajouter la colonne rp_slug pour savoir quel RP gère la réservation
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS rp_slug TEXT DEFAULT 'remi';

-- Ajouter itinerary_id pour regrouper les réservations d'un même voyage
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS itinerary_id TEXT;

-- ── 3. Itinéraires (voyage multi-jours) ────────────────────
CREATE TABLE IF NOT EXISTS itineraries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rp_slug     TEXT NOT NULL REFERENCES rp_profiles(slug),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  destination TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT DEFAULT 'pending',   -- pending / confirmed / declined
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 4. Partenariats RP (Phase 2+) ──────────────────────────
-- Antoine peut accéder à certains venues d'Ibiza via Sarah
CREATE TABLE IF NOT EXISTS rp_partner_links (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rp_slug         TEXT NOT NULL,        -- RP demandeur (ex: "antoine")
  partner_slug    TEXT NOT NULL,        -- RP partenaire (ex: "sarah-ibiza")
  allowed_venues  TEXT[] DEFAULT '{}',  -- seulement ces venues sont partagées
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 5. Désactiver RLS pour MVP (accès admin direct) ────────
ALTER TABLE rp_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries DISABLE ROW LEVEL SECURITY;
ALTER TABLE rp_partner_links DISABLE ROW LEVEL SECURITY;

-- ── 6. Seed — Profil de Rémi (premier RP) ──────────────────
INSERT INTO rp_profiles (
  slug,
  display_name,
  tagline,
  email,
  whatsapp,
  dashboard_password,
  active,
  activated_destinations,
  activated_venues,
  logo_text
) VALUES (
  'remi',
  'Élite Reservations',
  'Votre accès privé aux meilleures tables',
  'notta.remi@hotmail.fr',
  '33646695675',
  'elite2024',
  true,
  ARRAY['saint-tropez', 'dubai', 'miami', 'cannes', 'monaco', 'courchevel', 'saint-barth'],
  ARRAY[]::TEXT[],   -- [] = toutes les venues de ses destinations sont accessibles
  'ÉLITE'
) ON CONFLICT (slug) DO NOTHING;

-- ── 7. Index ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rp_profiles_slug ON rp_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_reservations_rp_slug ON reservations(rp_slug);
CREATE INDEX IF NOT EXISTS idx_itineraries_rp_slug ON itineraries(rp_slug);
