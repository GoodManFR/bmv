// Page d'accueil — Dashboard BAC en temps réel
// Affiche : BAC actuel, temps avant de conduire, graphique, dernières boissons, actions
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useBAC } from '../hooks/useBAC';
import BACChart from '../components/BACChart';
import EndSessionModal from '../components/EndSessionModal';
import type { Session } from '../types';

// ── Utilitaires ────────────────────────────────────────────────────────────────

// Formate un timestamp ISO en heure locale (ex : "21h34")
const formatHeure = (iso: string): string => {
  const date = new Date(iso);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}h${m}`;
};

// Formate un nombre de minutes en "Xh Xmin" ou "Xmin"
const formatDuree = (minutes: number): string => {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m.toString().padStart(2, '0')}min`;
};

// Retourne la couleur selon le BAC
const couleurBAC = (bac: number): string => {
  if (bac < 0.5) return '#4caf50';
  if (bac < 0.8) return '#ff9800';
  return '#f44336';
};

// Retourne un emoji selon le niveau de BAC
const emojiBAC = (bac: number): string => {
  if (bac < 0.5) return '🚗✅';
  if (bac < 0.8) return '⚠️🚫';
  return '🚨🤮';
};

// Formate la note en étoiles (ex. 3 → "★★★☆☆")
const formatEtoiles = (rating?: number): string => {
  if (!rating) return '';
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
};

// ── Types locaux ───────────────────────────────────────────────────────────────

interface SessionResume {
  session: Session;
  nbDrinks: number;
}

// ── Composant ──────────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { currentSession, drinks, loading: sessionLoading, error: sessionError, endSession } = useSession();

  // Le hook BAC ne s'active que si une soirée est en cours
  const { bacData, loading: bacLoading, error: bacError, lastUpdated, refresh } = useBAC(!!currentSession);

  // État de la modale de fin de soirée
  const [showEndModal, setShowEndModal] = useState(false);

  // Résumé de la dernière soirée terminée (affiché brièvement)
  const [sessionResume, setSessionResume] = useState<SessionResume | null>(null);

  // Efface le résumé après 6 secondes
  useEffect(() => {
    if (!sessionResume) return;
    const timer = setTimeout(() => setSessionResume(null), 6000);
    return () => clearTimeout(timer);
  }, [sessionResume]);

  const handleOpenEndModal = () => setShowEndModal(true);
  const handleCancelEndModal = () => setShowEndModal(false);

  // Appel depuis la modale : termine la soirée et affiche le résumé
  const handleConfirmEnd = async (rating?: number, comment?: string) => {
    if (!currentSession) return;

    // Snapshot avant la réinitialisation du hook
    const resumeData: SessionResume = {
      session: { ...currentSession, rating, comment },
      nbDrinks: drinks.length,
    };

    await endSession(rating, comment);
    setShowEndModal(false);
    setSessionResume(resumeData);
  };

  // ── État chargement initial ──────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="page page-centered">
        <p className="text-muted">Chargement…</p>
      </div>
    );
  }

  // ── Erreur session ───────────────────────────────────────────────────────────
  if (sessionError) {
    return (
      <div className="page">
        <h1>🍺 BMV</h1>
        <div className="card">
          <p className="scanner-error-inline">⚠️ {sessionError}</p>
        </div>
      </div>
    );
  }

  // ── Pas de soirée en cours ───────────────────────────────────────────────────
  if (!currentSession) {
    return (
      <div className="page">
        <h1>🍺 BMV</h1>
        <p className="subtitle">Boire · Manger · Vomir</p>

        {/* Résumé bref de la soirée qui vient de se terminer */}
        {sessionResume && (
          <div className="card session-ended-card">
            <p style={{ fontWeight: 600, marginBottom: 8 }}>🏁 Soirée terminée !</p>
            <p className="text-muted" style={{ marginBottom: 4 }}>
              {sessionResume.nbDrinks} boisson{sessionResume.nbDrinks > 1 ? 's' : ''} ·{' '}
              {formatDuree(
                Math.round(
                  (Date.now() - new Date(sessionResume.session.started_at).getTime()) / 60_000,
                ),
              )}
            </p>
            {sessionResume.session.rating && (
              <p style={{ color: '#f5a623', fontSize: '1.1rem' }}>
                {formatEtoiles(sessionResume.session.rating)}
              </p>
            )}
            {sessionResume.session.comment && (
              <p className="text-muted" style={{ fontStyle: 'italic', marginTop: 4 }}>
                "{sessionResume.session.comment}"
              </p>
            )}
          </div>
        )}

        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '3rem', marginBottom: 8 }}>🥂</p>
          <h2>Bonsoir !</h2>
          <p className="text-muted" style={{ marginBottom: 20 }}>
            Pas de soirée en cours. Scanne une boisson pour en commencer une nouvelle !
          </p>
          <button className="btn-primary" onClick={() => navigate('/scanner')}>
            📷 Scanner une boisson
          </button>
        </div>

        <p className="disclaimer">
          ⚠️ BMV fournit une estimation. Ne remplace jamais un éthylotest certifié.
        </p>
      </div>
    );
  }

  // ── Dashboard soirée active ──────────────────────────────────────────────────
  const bac = bacData?.current_bac ?? 0;
  const derniersDrinks = drinks.slice(-3).reverse();

  return (
    <div className="page">
      <h1>🍺 BMV</h1>

      {/* ── Bloc 1 : BAC actuel ── */}
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: 4, fontSize: '0.9rem', color: '#aaa', fontWeight: 'normal' }}>
          Taux d'alcoolémie actuel
        </h2>
        <p
          className={bac > 0.8 ? 'bac-value pulsing' : 'bac-value'}
          style={{ color: couleurBAC(bac) }}
        >
          {bacLoading && !bacData ? '—' : `${bac.toFixed(2)} g/L`}
        </p>
        <p style={{ fontSize: '1.4rem', margin: 0 }}>
          {emojiBAC(bac)}
          {' '}
          <span style={{ fontSize: '0.95rem', color: couleurBAC(bac) }}>
            {bac < 0.5 ? 'En dessous du seuil légal' : 'Au-dessus du seuil légal'}
          </span>
        </p>

        {/* ── Bloc 2 : Temps restant ── */}
        {bacData && (
          <p style={{ marginTop: 12, fontSize: '0.95rem', color: '#ccc' }}>
            {bacData.is_legal
              ? '🚗 Tu peux conduire !'
              : `Tu peux conduire dans : ${formatDuree(bacData.time_to_sober)}`}
          </p>
        )}

        {bacError && (
          <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#f44336' }}>
            ⚠️ {bacError}
          </p>
        )}

        {/* Heure du dernier rafraîchissement + bouton manuel */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Mis à jour à {formatHeure(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={bacLoading}
            style={{
              background: 'none',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#aaa',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '2px 8px',
            }}
          >
            {bacLoading ? '…' : '↻ Actualiser'}
          </button>
        </div>
      </div>

      {/* ── Bloc 3 : Graphique BAC ── */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Courbe de la soirée</h2>
        <BACChart curve={bacData?.curve ?? []} />
      </div>

      {/* ── Bloc 4 : Dernières boissons ── */}
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>
          Dernières boissons
          {drinks.length > 3 && (
            <span style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'normal', marginLeft: 8 }}>
              ({drinks.length} au total)
            </span>
          )}
        </h2>

        {drinks.length === 0 ? (
          <p className="text-muted">Aucune boisson enregistrée.</p>
        ) : (
          <ul className="drinks-list">
            {derniersDrinks.map((drink) => (
              <li key={drink.id} className="drink-item">
                <span className="drink-name">{drink.name}</span>
                <span className="drink-details">
                  {drink.abv.toFixed(1)}° · {drink.volume_ml} ml
                </span>
                <span className="drink-time">{formatHeure(drink.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Bloc 5 : Actions ── */}
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-primary" onClick={() => navigate('/scanner')}>
            📷 Scanner une boisson
          </button>
          <button className="btn-secondary" onClick={handleOpenEndModal}>
            🏁 Fin de soirée
          </button>
        </div>
      </div>

      <p className="disclaimer">
        ⚠️ BMV fournit une estimation. Ne remplace jamais un éthylotest certifié.
      </p>

      {/* ── Modale de fin de soirée ── */}
      {showEndModal && (
        <EndSessionModal
          session={currentSession}
          drinks={drinks}
          bacData={bacData}
          onConfirm={handleConfirmEnd}
          onCancel={handleCancelEndModal}
        />
      )}
    </div>
  );
};

export default Home;
