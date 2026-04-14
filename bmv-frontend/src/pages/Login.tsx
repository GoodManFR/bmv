// Page Login — connexion Google via Supabase Auth
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      // Supabase redirige vers /auth/callback — pas besoin de navigation manuelle ici
    } catch {
      setError('Échec de la connexion. Réessaie.');
      setLoading(false);
    }
  };

  return (
    <div className="page page-centered">
      {/* Logo et titre */}
      <div className="login-hero">
        <span className="login-emoji">🍺</span>
        <h1 className="login-title">BMV</h1>
        <p className="login-subtitle">BOIRE · MANGER · VOMIR</p>
      </div>

      <div className="card">
        <h2>Connexion</h2>
        <p className="text-muted">Connecte-toi pour suivre ton alcoolémie en temps réel.</p>

        {error && <p className="error-message">{error}</p>}

        <button
          className="btn-primary"
          onClick={handleSignIn}
          disabled={loading}
        >
          {loading ? 'Connexion...' : '🔑 Continuer avec Google'}
        </button>
      </div>

      <p className="disclaimer">
        ⚠️ BMV fournit une estimation. Ne remplace jamais un éthylotest certifié. Ne prenez pas le volant en cas de doute.
      </p>
    </div>
  );
};

export default Login;
