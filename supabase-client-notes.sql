-- ── Fiche client par RP (notes privées, tag VIP, etc.) ───────────────
CREATE TABLE IF NOT EXISTS rp_client_notes (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rp_slug       TEXT NOT NULL,
  client_email  TEXT NOT NULL,
  client_name   TEXT,
  vip_tag       TEXT DEFAULT '',        -- ex: "VIP", "Gold", "Régulier", "Corporate"
  internal_note TEXT DEFAULT '',        -- note privée du RP sur ce client
  total_resas   INTEGER DEFAULT 0,      -- mis à jour automatiquement
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rp_slug, client_email)         -- une fiche par RP par client
);

-- Désactiver RLS + accorder droits
ALTER TABLE rp_client_notes DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE rp_client_notes TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Index
CREATE INDEX IF NOT EXISTS idx_client_notes_rp ON rp_client_notes(rp_slug);
CREATE INDEX IF NOT EXISTS idx_client_notes_email ON rp_client_notes(client_email);
