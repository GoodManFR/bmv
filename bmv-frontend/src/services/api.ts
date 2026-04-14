// Service API — appels vers le backend FastAPI
// Chaque requête injecte le JWT Supabase dans le header Authorization
import { supabase } from './supabase';
import type { Drink, Session, BACData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// Récupère les headers d'authentification depuis la session Supabase active
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
};

export const api = {
  /**
   * Récupère le profil d'un utilisateur via le backend
   */
  getProfile: async (userId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/profile/${userId}`, { headers });
    if (!res.ok) throw new Error('Erreur lors de la récupération du profil');
    return res.json();
  },

  /**
   * Met à jour le profil d'un utilisateur via le backend
   */
  updateProfile: async (userId: string, data: unknown) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/profile/${userId}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erreur lors de la mise à jour du profil');
    return res.json();
  },

  /**
   * Récupère les infos d'un produit via son code EAN (Open Food Facts via backend)
   */
  getProductByEan: async (ean: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/drinks/search?ean=${encodeURIComponent(ean)}`, { headers });
    if (!res.ok) throw new Error('Erreur lors de la recherche du produit');
    return res.json() as Promise<{ found: boolean; product: { name: string; brand: string | null; abv: number; image_url: string | null; category: 'beer' | 'wine' | 'spirit' | 'other' } | null }>;
  },

  /**
   * Enregistre une boisson dans la session en cours.
   * Crée automatiquement une soirée si aucune n'est active.
   */
  logDrink: async (drink: {
    name: string;
    abv: number;
    volume_ml: number;
    source: 'scan' | 'manual';
    ean_code?: string;
  }): Promise<{ drink: Drink; session_id: string }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/drinks/`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(drink),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Erreur lors de l\'enregistrement de la boisson');
    }
    return res.json();
  },

  /**
   * Récupère la soirée en cours de l'utilisateur (ended_at IS NULL), ou null si aucune.
   */
  getCurrentSession: async (userId: string): Promise<{ session: Session | null }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/current?user_id=${encodeURIComponent(userId)}`, { headers });
    if (!res.ok) throw new Error('Erreur lors de la récupération de la soirée');
    return res.json();
  },

  /**
   * Termine une soirée (met ended_at = now).
   * rating (1-5) et comment sont optionnels.
   */
  endSession: async (sessionId: string, rating?: number, comment?: string): Promise<Session> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: rating ?? null, comment: comment ?? null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Erreur lors de la fin de soirée');
    }
    return res.json();
  },

  /**
   * Récupère la liste des boissons d'une soirée, triées par heure croissante.
   */
  getSessionDrinks: async (sessionId: string): Promise<{ drinks: Drink[] }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/drinks/?session_id=${encodeURIComponent(sessionId)}`, { headers });
    if (!res.ok) throw new Error('Erreur lors de la récupération des boissons');
    return res.json();
  },

  /**
   * Récupère la liste de toutes les soirées d'un utilisateur, triées par date décroissante.
   */
  getSessions: async (userId: string): Promise<{ sessions: Session[] }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/?user_id=${encodeURIComponent(userId)}`, { headers });
    if (!res.ok) throw new Error('Erreur lors de la récupération de l\'historique');
    return res.json();
  },

  /**
   * Récupère le détail d'une soirée (métadonnées + liste complète des boissons).
   */
  getSessionDetail: async (sessionId: string): Promise<Session> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, { headers });
    if (!res.ok) throw new Error('Erreur lors de la récupération de la soirée');
    return res.json();
  },

  /**
   * Récupère la courbe BAC recalculée d'une soirée passée.
   */
  getSessionCurve: async (sessionId: string): Promise<{ curve: { time: string; bac: number }[] }> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/bac/curve/${encodeURIComponent(sessionId)}`, { headers });
    if (!res.ok) throw new Error('Erreur lors du calcul de la courbe BAC');
    return res.json();
  },

  /**
   * Calcule le BAC actuel pour l'utilisateur connecté via la formule de Widmark (backend)
   */
  getCurrentBAC: async (): Promise<BACData> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/bac/current`, { headers });
    if (!res.ok) throw new Error('Erreur lors du calcul du BAC');
    return res.json();
  },

  /**
   * Sauvegarde le token FCM de l'utilisateur sur le backend.
   * Appelé après que l'utilisateur accepte les notifications push.
   */
  updateFCMToken: async (userId: string, fcmToken: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/profile/${userId}/fcm-token`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fcm_token: fcmToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Erreur lors de la mise à jour du token FCM');
    }
  },
};

export default API_BASE_URL;
