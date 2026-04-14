// Modale de fin de soirée — note (1-5 étoiles) + commentaire libre
import React, { useState } from 'react';
import type { Session, Drink, BACData } from '../types';

// ── Utilitaires ────────────────────────────────────────────────────────────────

// Formate une durée en minutes → "Xh Xmin" ou "Xmin"
const formatDuree = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface EndSessionModalProps {
  session: Session;
  drinks: Drink[];
  bacData: BACData | null;
  onConfirm: (rating?: number, comment?: string) => Promise<void>;
  onCancel: () => void;
}

// ── Composant ──────────────────────────────────────────────────────────────────

const EndSessionModal: React.FC<EndSessionModalProps> = ({
  session,
  drinks,
  bacData,
  onConfirm,
  onCancel,
}) => {
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [hoveredStar, setHoveredStar] = useState<number | undefined>(undefined);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Durée de la soirée en minutes
  const dureeMinutes = Math.round(
    (Date.now() - new Date(session.started_at).getTime()) / 60_000,
  );

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(rating, comment.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la fin de soirée');
      setLoading(false);
    }
  };

  // Étoile affichée comme active si <= étoile survolée (ou sélectionnée si pas de survol)
  const starIsActive = (star: number): boolean => {
    const threshold = hoveredStar ?? rating ?? 0;
    return star <= threshold;
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      {/* Stopper la propagation pour ne pas fermer en cliquant à l'intérieur */}
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: 4 }}>Fin de la soirée 🎉</h2>

        {/* ── Résumé rapide ── */}
        <div className="modal-summary">
          <div className="modal-summary-item">
            <span className="modal-summary-value">{drinks.length}</span>
            <span className="modal-summary-label">boisson{drinks.length > 1 ? 's' : ''}</span>
          </div>
          <div className="modal-summary-item">
            <span className="modal-summary-value">{formatDuree(dureeMinutes)}</span>
            <span className="modal-summary-label">durée</span>
          </div>
          <div className="modal-summary-item">
            <span className="modal-summary-value">
              {bacData ? `${bacData.current_bac.toFixed(2)} g/L` : '—'}
            </span>
            <span className="modal-summary-label">BAC actuel</span>
          </div>
        </div>

        {/* ── Notation étoiles ── */}
        <p className="modal-field-label">Note ta soirée (optionnel)</p>
        <div
          className="star-rating"
          onMouseLeave={() => setHoveredStar(undefined)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star${starIsActive(star) ? ' active' : ''}`}
              onMouseEnter={() => setHoveredStar(star)}
              onClick={() => setRating(rating === star ? undefined : star)}
              aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        {/* ── Commentaire ── */}
        <p className="modal-field-label">Commentaire (optionnel)</p>
        <textarea
          className="modal-textarea"
          placeholder="Comment s'est passée ta soirée ?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
        />

        {/* ── Message d'erreur ── */}
        {error && (
          <p className="scanner-error-inline" style={{ marginTop: 8 }}>
            ⚠️ {error}
          </p>
        )}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <button
            className="btn-primary"
            style={{ marginTop: 0 }}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Clôture en cours…' : '🏁 Terminer la soirée'}
          </button>
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndSessionModal;
