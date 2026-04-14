// Page de callback OAuth — gère le retour après connexion Google
// Supabase parse automatiquement le hash de l'URL et établit la session
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase a déjà traité le token dans l'URL — on vérifie juste que la session est active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirige vers l'accueil ; App.tsx gérera la redirection vers /profile si nécessaire
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="page page-centered">
      <p>Connexion en cours...</p>
    </div>
  );
};

export default AuthCallback;
