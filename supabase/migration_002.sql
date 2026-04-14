-- ============================================================
-- BMV — Migration 002 : notifications push Firebase (étape 10)
-- À coller dans le SQL Editor de votre projet Supabase
-- ============================================================

-- Stocke le token FCM de l'appareil de l'utilisateur
-- Mis à jour à chaque visite depuis le frontend
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Empêche l'envoi multiple de la même notification "tu peux conduire"
-- false = pas encore notifié pour cette soirée
-- true  = notification déjà envoyée (BAC est repassé sous 0.5 g/L)
ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS notified_sober BOOLEAN DEFAULT FALSE;
