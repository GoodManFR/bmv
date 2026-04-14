// Page Détail d'une soirée — courbe BAC + liste des boissons
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Session } from '../types';
import BACChart from '../components/BACChart';

// Formate une date complète en français : "Samedi 12 avril 2025"
const formatDateFr = (isoString: string): string => {
  const date = new Date(isoString);
  const formatted = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Formate une heure : "21h30"
const formatHeure = (isoString: string): string => {
  const date = new Date(isoString);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
};

// Calcule la durée entre deux dates en "Xh Ym"
const formatDuree = (debut: string, fin: string): string => {
  const diffMs = new Date(fin).getTime() - new Date(debut).getTime();
  const totalMin = Math.round(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

// Affiche des étoiles selon la note
const EtoilesNote: React.FC<{ note: number }> = ({ note }) => (
  <span className="session-rating">
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} style={{ color: i <= note ? '#ffd700' : '#555', fontSize: '1.2rem' }}>★</span>
    ))}
  </span>
);

const SessionDetail: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [curve, setCurve] = useState<{ time: string; bac: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const charger = async () => {
      try {
        // Charge le détail et la courbe en parallèle
        const [sessionData, curveData] = await Promise.all([
          api.getSessionDetail(sessionId),
          api.getSessionCurve(sessionId),
        ]);
        setSession(sessionData);
        setCurve(curveData.curve);
      } catch {
        setErreur('Impossible de charger la soirée.');
      } finally {
        setLoading(false);
      }
    };

    charger();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="page page-centered">
        <p>Chargement de la soirée...</p>
      </div>
    );
  }

  if (erreur || !session) {
    return (
      <div className="page page-centered">
        <p className="error-text">{erreur ?? 'Soirée introuvable.'}</p>
        <button className="btn-secondary" onClick={() => navigate('/history')}>
          ← Retour
        </button>
      </div>
    );
  }

  const drinks = session.drinks ?? [];

  return (
    <div className="page">
      {/* Bouton retour */}
      <button className="btn-back" onClick={() => navigate('/history')}>
        ← Retour
      </button>

      {/* En-tête */}
      <div className="card session-detail-header">
        <div className="session-date" style={{ fontSize: '1.1rem' }}>
          {formatDateFr(session.started_at)}
        </div>
        <div className="session-hours">
          {formatHeure(session.started_at)}
          {' → '}
          {session.ended_at
            ? formatHeure(session.ended_at)
            : <span className="badge-en-cours">En cours</span>}
          {session.ended_at && (
            <span className="duree-label">
              &nbsp;({formatDuree(session.started_at, session.ended_at)})
            </span>
          )}
        </div>
        {session.rating != null && <EtoilesNote note={session.rating} />}
        {session.comment && (
          <p className="session-comment" style={{ marginTop: '0.5rem' }}>
            {session.comment}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-box">
          <span className="stat-value">{drinks.length}</span>
          <span className="stat-label">boisson{drinks.length > 1 ? 's' : ''}</span>
        </div>
        {session.max_bac != null && (
          <div className="stat-box">
            <span className="stat-value">{session.max_bac.toFixed(2)}</span>
            <span className="stat-label">g/L max</span>
          </div>
        )}
        {session.ended_at && (
          <div className="stat-box">
            <span className="stat-value">{formatDuree(session.started_at, session.ended_at)}</span>
            <span className="stat-label">durée</span>
          </div>
        )}
      </div>

      {/* Courbe BAC */}
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem' }}>Courbe d'alcoolémie</h2>
        <BACChart curve={curve} />
      </div>

      {/* Liste des boissons */}
      <div className="card">
        <h2 style={{ marginBottom: '0.75rem' }}>Boissons consommées</h2>
        {drinks.length === 0 ? (
          <p>Aucune boisson enregistrée pour cette soirée.</p>
        ) : (
          <ul className="drinks-list">
            {drinks.map((drink) => (
              <li key={drink.id} className="drink-item">
                <div className="drink-info">
                  <span className="drink-name">{drink.name}</span>
                  <span className="drink-details">
                    {drink.abv}% · {drink.volume_ml} ml
                  </span>
                </div>
                <span className="drink-time">{formatHeure(drink.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SessionDetail;
