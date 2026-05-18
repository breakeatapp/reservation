-- ============================================================
-- ITINERA — Venue ↔ RP Trust System
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ── 1. Ajouter invite_code à venues_profiles ───────────────
ALTER TABLE venues_profiles
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- ── 2. Ajouter email et category si manquants ──────────────
ALTER TABLE venues_profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE venues_profiles
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'restaurant';

-- ── 3. Ajouter venue_slug à reservations ───────────────────
-- Permet de lier directement une réservation à un venue partenaire
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS venue_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_venue_slug
  ON reservations (venue_slug);

-- ── 4. Table venue_rp_connections ──────────────────────────
-- Stocke les connexions de confiance entre un restaurant et un concierge RP
CREATE TABLE IF NOT EXISTS venue_rp_connections (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_slug      TEXT NOT NULL,          -- slug du restaurant (venues_profiles.slug)
  rp_slug         TEXT NOT NULL,          -- slug du concierge (rp_profiles.slug)
  venue_name      TEXT,                   -- nom affiché du restaurant
  rp_display_name TEXT,                   -- nom affiché du concierge
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (venue_slug, rp_slug)            -- une seule connexion par paire
);

CREATE INDEX IF NOT EXISTS idx_venue_rp_connections_venue
  ON venue_rp_connections (venue_slug);

CREATE INDEX IF NOT EXISTS idx_venue_rp_connections_rp
  ON venue_rp_connections (rp_slug);

-- Désactiver RLS — accès uniquement via supabaseAdmin (service_role)
ALTER TABLE venue_rp_connections DISABLE ROW LEVEL SECURITY;
