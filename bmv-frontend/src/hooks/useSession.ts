// Hook useSession — gestion de la soirée en cours
// Récupère la session active au montage, expose addDrink et endSession

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import type { Session, Drink } from '../types';

/**
 * Hook de gestion de la soirée en cours.
 * - Charge automatiquement la session active au montage
 * - addDrink() enregistre une boisson et rafraîchit la liste
 * - endSession() termine la soirée et remet l'état à zéro
 */
export const useSession = () => {
  const { user } = useAuth();

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charge la session active et ses boissons depuis le backend
  const fetchCurrentSession = useCallback(async () => {
    if (!user) {
      setCurrentSession(null);
      setDrinks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { session } = await api.getCurrentSession(user.id);
      setCurrentSession(session);

      if (session) {
        const { drinks: sessionDrinks } = await api.getSessionDrinks(session.id);
        setDrinks(sessionDrinks);
      } else {
        setDrinks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la soirée');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Chargement initial dès que l'utilisateur est disponible
  useEffect(() => {
    fetchCurrentSession();
  }, [fetchCurrentSession]);

  /**
   * Enregistre une boisson en base.
   * Retourne la boisson créée, ou lance une erreur en cas d'échec.
   */
  const addDrink = useCallback(async (drinkData: {
    name: string;
    abv: number;
    volume_ml: number;
    source: 'scan' | 'manual';
    ean_code?: string;
  }): Promise<Drink> => {
    const result = await api.logDrink(drinkData);

    // Si une nouvelle session a été créée automatiquement, la récupérer
    if (!currentSession || currentSession.id !== result.session_id) {
      await fetchCurrentSession();
    } else {
      // Sinon, juste rafraîchir la liste des drinks
      setDrinks((prev) => [...prev, result.drink]);
    }

    return result.drink;
  }, [currentSession, fetchCurrentSession]);

  /**
   * Termine la soirée en cours.
   * rating (1-5) et comment sont optionnels (seront utilisés à l'étape 8).
   */
  const endSession = useCallback(async (rating?: number, comment?: string) => {
    if (!currentSession) return;

    try {
      await api.endSession(currentSession.id, rating, comment);
      setCurrentSession(null);
      setDrinks([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la fin de soirée');
      throw err;
    }
  }, [currentSession]);

  return {
    currentSession,
    drinks,
    loading,
    error,
    addDrink,
    endSession,
    refreshSession: fetchCurrentSession,
  };
};
