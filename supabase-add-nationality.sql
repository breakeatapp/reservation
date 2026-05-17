-- ── À EXÉCUTER dans Supabase SQL Editor ──────────────────────────────
-- Ajoute la colonne nationality à la table reservations
-- (cette colonne est envoyée par le formulaire mais n'était pas dans le schéma initial)

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT '';

-- Vérification : afficher les colonnes de la table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'reservations'
ORDER BY ordinal_position;
