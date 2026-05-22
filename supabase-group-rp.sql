-- ============================================================
-- ITINERA — Group ↔ RP Partnership System
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

-- ── 1. Invite code pour les groupes ─────────────────────────
ALTER TABLE hospitality_groups
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- ── 2. Table group_rp_connections ────────────────────────────
-- Trace les RPs connectés au niveau groupe (tous les venues)
CREATE TABLE IF NOT EXISTS group_rp_connections (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id        UUID NOT NULL REFERENCES hospitality_groups(id) ON DELETE CASCADE,
  group_slug      TEXT NOT NULL,
  rp_slug         TEXT NOT NULL,
  rp_display_name TEXT,
  connected_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, rp_slug)
);

CREATE INDEX IF NOT EXISTS idx_group_rp_connections_group
  ON group_rp_connections (group_id);

CREATE INDEX IF NOT EXISTS idx_group_rp_connections_rp
  ON group_rp_connections (rp_slug);

ALTER TABLE group_rp_connections DISABLE ROW LEVEL SECURITY;
