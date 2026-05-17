-- ITINERA NETWORK: connection requests between RP concierges
-- Run in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS rp_connections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_slug   text NOT NULL,           -- RP who sent the request
  to_slug     text NOT NULL,           -- RP who received it
  status      text NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'declined'
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_slug, to_slug)
);

-- Index for fast lookup of all connections involving a given RP
CREATE INDEX IF NOT EXISTS rp_connections_from_idx ON rp_connections (from_slug);
CREATE INDEX IF NOT EXISTS rp_connections_to_idx   ON rp_connections (to_slug);

-- Disable RLS — accessed only via supabaseAdmin (service_role key)
-- ALTER TABLE rp_connections ENABLE ROW LEVEL SECURITY;
