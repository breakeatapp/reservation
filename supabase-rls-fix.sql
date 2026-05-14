-- ── EXÉCUTER EN PREMIER dans Supabase SQL Editor ─────────────────────
-- Désactiver Row Level Security sur toutes les tables du projet
-- (nécessaire avec la clé anon en dehors d'une auth Supabase complète)

ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE rp_profiles DISABLE ROW LEVEL SECURITY;

-- Vérifier que les réservations sont bien là
SELECT COUNT(*) as total, rp_slug FROM reservations GROUP BY rp_slug;

-- Vérifier que le profil remi est bien là
SELECT slug, display_name, dashboard_password FROM rp_profiles;
