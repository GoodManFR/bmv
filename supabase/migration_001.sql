-- ============================================================
-- BMV — Migration 001 : ajout de la colonne max_bac
-- À coller dans le SQL Editor de votre projet Supabase
-- ============================================================

-- Ajoute la colonne max_bac (BAC maximum atteint pendant la soirée)
-- calculé au moment de la clôture de la soirée via la formule de Widmark
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS max_bac FLOAT;
