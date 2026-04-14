// Hook useBAC — suivi du taux d'alcoolémie en temps réel
// Rafraîchissement automatique toutes les 10 minutes (setInterval)
// Se désactive si aucune soirée n'est en cours

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type { BACData } from '../types';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Récupère et rafraîchit le BAC toutes les 10 minutes.
 *
 * @param hasActiveSession - true si une soirée est en cours (sinon le hook ne fait aucun appel)
 */
export const useBAC = (hasActiveSession: boolean) => {
  const [bacData, setBacData] = useState<BACData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Référence pour éviter les mises à jour sur un composant démonté
  const mountedRef = useRef(true);

  const fetchBAC = useCallback(async () => {
    if (!hasActiveSession) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getCurrentBAC();
      if (!mountedRef.current) return;
      setBacData(data);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Erreur lors du calcul du BAC');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [hasActiveSession]);

  useEffect(() => {
    mountedRef.current = true;

    if (!hasActiveSession) {
      // Pas de soirée → réinitialiser les données
      setBacData(null);
      setLastUpdated(null);
      setError(null);
      return;
    }

    // Appel immédiat au montage
    fetchBAC();

    // Rafraîchissement toutes les 10 minutes
    const intervalId = setInterval(fetchBAC, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [hasActiveSession, fetchBAC]);

  return {
    bacData,
    loading,
    error,
    lastUpdated,
    /** Force un rafraîchissement immédiat du BAC */
    refresh: fetchBAC,
  };
};
