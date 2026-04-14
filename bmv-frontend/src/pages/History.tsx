// Page Historique — Liste des soirées passées
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { Session } from '../types';

// Formate une date en français : "Samedi 12 avril 2025"
const formatDateFr = (isoString: string): string => {
  const date = new Date(isoString);
  const formatted = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  // Capitalise la première lettre
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Formate une heure : "21h30"
const formatHeure = (isoString: string): string => {
  const date = new Date(isoString);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
};

// Retourne la classe CSS selon le BAC max de la soirée
const bacClass = (maxBac?: number | null): string => {
  if (maxBac == null) return '';
  if (maxBac < 0.5) return ' bac-safe';
  if (maxBac < 1.0) return ' bac-warn';
  return ' bac-danger';
};

// Affiche des étoiles pleines/vides selon la note
const EtoilesNote: React.FC<{ note: number }> = ({ note }) => (
  <span className="session-rating">
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} style={{ color: i <= note ? '#ffd700' : '#555' }}>★</span>
    ))}
  </span>
);

const History: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const charger = async () => {
      try {
        const data = await api.getSessions(user.id);
        setSessions(data.sessions);
      } catch {
        setErreur('Impossible de charger l\'historique.');
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, [user]);

  if (loading) {
    return (
      <div className="page page-centered">
        <p>Chargement de l'historique...</p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="page page-centered">
        <p className="error-text">{erreur}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Historique</h1>
      <p className="subtitle">Tes soirées passées</p>

      {sessions.length === 0 ? (
        <div className="card">
          <p>Aucune soirée enregistrée.</p>
          <p>Scanne ta première boisson !</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`card session-card${bacClass(session.max_bac)}`}
              onClick={() => navigate(`/history/${session.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/history/${session.id}`)}
            >
              {/* Date */}
              <div className="session-date">{formatDateFr(session.started_at)}</div>

              {/* Horaires */}
              <div className="session-hours">
                {formatHeure(session.started_at)}
                {' → '}
                {session.ended_at ? formatHeure(session.ended_at) : <span className="badge-en-cours">En cours</span>}
              </div>

              {/* Stats */}
              <div className="session-stats">
                {session.max_bac != null && (
                  <span className="stat-pill">
                    BAC max : <strong>{session.max_bac.toFixed(2)} g/L</strong>
                  </span>
                )}
              </div>

              {/* Note */}
              {session.rating != null && <EtoilesNote note={session.rating} />}

              {/* Commentaire tronqué */}
              {session.comment && (
                <p className="session-comment">
                  {session.comment.length > 50
                    ? session.comment.slice(0, 50) + '…'
                    : session.comment}
                </p>
              )}

              <span className="session-link">Voir le détail →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
