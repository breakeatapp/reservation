-- ── EXÉCUTER dans Supabase SQL Editor ─────────────────────────────────
-- Règle définitivement les permissions pour toutes les tables du projet

-- 1. Désactiver RLS sur toutes les tables
ALTER TABLE reservations      DISABLE ROW LEVEL SECURITY;
ALTER TABLE rp_profiles       DISABLE ROW LEVEL SECURITY;

-- (Ces tables peuvent ne pas exister encore, les erreurs sont normales)
ALTER TABLE itineraries       DISABLE ROW LEVEL SECURITY;
ALTER TABLE rp_partner_links  DISABLE ROW LEVEL SECURITY;

-- 2. Accorder tous les droits au rôle anon (clé publique Next.js)
GRANT ALL PRIVILEGES ON TABLE reservations     TO anon;
GRANT ALL PRIVILEGES ON TABLE rp_profiles      TO anon;
GRANT ALL PRIVILEGES ON TABLE itineraries      TO anon;
GRANT ALL PRIVILEGES ON TABLE rp_partner_links TO anon;

-- 3. Accorder tous les droits au rôle authenticated aussi
GRANT ALL PRIVILEGES ON TABLE reservations     TO authenticated;
GRANT ALL PRIVILEGES ON TABLE rp_profiles      TO authenticated;
GRANT ALL PRIVILEGES ON TABLE itineraries      TO authenticated;
GRANT ALL PRIVILEGES ON TABLE rp_partner_links TO authenticated;

-- 4. Accorder l'usage des séquences (pour les UUID auto-générés)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ── VÉRIFICATION ──────────────────────────────────────────────────────

-- Vérifier que rp_profiles est accessible
SELECT slug, display_name, active FROM rp_profiles;

-- Vérifier les réservations
SELECT COUNT(*) as total FROM reservations;
SELECT id, first_name, last_name, rp_slug, status FROM reservations ORDER BY created_at DESC LIMIT 5;
