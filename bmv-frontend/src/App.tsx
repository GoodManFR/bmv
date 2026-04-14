// App.tsx — Routeur React avec protection des routes via AuthContext
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import NavBar from './components/NavBar';
import InstallPrompt from './components/InstallPrompt';
import Home from './pages/Home';
import Scanner from './pages/Scanner';
import History from './pages/History';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import SessionDetail from './pages/SessionDetail';

// ── Composant de route protégée ───────────────────────────────────────────────
// requiresProfile=true  → redirige vers /profile si le profil est incomplet
// requiresProfile=false → accessible dès qu'on est connecté (ex. /profile lui-même)
interface PrivateRouteProps {
  element: React.ReactElement;
  requiresProfile?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element, requiresProfile = true }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="page page-centered">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiresProfile && !profile?.weight_kg) return <Navigate to="/profile" replace />;

  return element;
};

// ── Routes (séparé pour pouvoir utiliser useAuth dans BrowserRouter) ──────────
const AppRoutes: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const isAuthenticated = !!user;
  const isProfileComplete = !!profile?.weight_kg;

  return (
    <div className="app-container">
      <InstallPrompt />
      <Routes>
        {/* Route publique — redirige vers / si déjà connecté et profil complet */}
        <Route
          path="/login"
          element={
            !loading && isAuthenticated && isProfileComplete
              ? <Navigate to="/" replace />
              : <Login />
          }
        />

        {/* Callback OAuth Supabase */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Route profil — accessible si connecté même avec profil incomplet */}
        <Route
          path="/profile"
          element={<PrivateRoute element={<Profile />} requiresProfile={false} />}
        />

        {/* Routes protégées — nécessitent auth + profil complet */}
        <Route path="/" element={<PrivateRoute element={<Home />} />} />
        <Route path="/scanner" element={<PrivateRoute element={<Scanner />} />} />
        <Route path="/history" element={<PrivateRoute element={<History />} />} />
        <Route path="/history/:sessionId" element={<PrivateRoute element={<SessionDetail />} />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* NavBar uniquement si connecté et profil complet */}
      {isAuthenticated && isProfileComplete && <NavBar />}
    </div>
  );
};

// ── App — wrappée dans AuthProvider et BrowserRouter ─────────────────────────
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
