-- ── À EXÉCUTER dans Supabase SQL Editor ──────────────────────────────
-- Ce script ajoute la colonne rp_slug à la table reservations existante.
-- Toutes les réservations passées sont rattachées à 'remi' par défaut.

-- 1. Ajouter la colonne rp_slug si elle n'existe pas encore
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS rp_slug TEXT DEFAULT 'remi';

-- 2. Mettre à jour les anciennes réservations sans rp_slug
UPDATE reservations
SET rp_slug = 'remi'
WHERE rp_slug IS NULL OR rp_slug = '';

-- 3. Ajouter un index pour accélérer les requêtes par RP
CREATE INDEX IF NOT EXISTS idx_reservations_rp_slug
ON reservations(rp_slug);

-- 4. Ajouter la colonne itinerary_id pour lier les réservations d'un même voyage
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS itinerary_id TEXT;

-- ── Vérification : afficher les réservations de 'remi' ────────────────
SELECT id, first_name, last_name, establishment, date, status, rp_slug
FROM reservations
WHERE rp_slug = 'remi'
ORDER BY created_at DESC
LIMIT 20;
