// Service Supabase — client Auth + base de données
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Variables d\'environnement Supabase manquantes : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont requises.'
  );
}

// Client unique partagé dans toute l'app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Connexion Google OAuth via Supabase Auth.
 * redirectTo utilise window.location.origin pour fonctionner depuis n'importe quelle
 * adresse (localhost en dev PC, IP réseau depuis un téléphone, domaine en production).
 * skipBrowserRedirect: false force Supabase à suivre le redirectTo fourni
 * plutôt que de tomber en fallback sur le Site URL configuré dans le dashboard.
 */
export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
};

/**
 * Déconnexion
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
