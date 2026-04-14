// Page Profil — formulaire de saisie/modification des infos utilisateur
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { requestNotificationPermission, getFCMToken } from '../services/firebase';
import { api } from '../services/api';

// ── Types locaux ──────────────────────────────────────────────────────────────
interface ProfileForm {
  weight_kg: string;
  height_cm: string;
  age: string;
  sex: 'male' | 'female' | '';
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateForm(form: ProfileForm): string | null {
  const weight = parseFloat(form.weight_kg);
  const height = parseFloat(form.height_cm);
  const age = parseInt(form.age, 10);

  if (!form.sex) return 'Merci de sélectionner ton sexe.';
  if (isNaN(weight) || weight < 30 || weight > 300) return 'Le poids doit être entre 30 et 300 kg.';
  if (isNaN(height) || height < 100 || height > 250) return 'La taille doit être entre 100 et 250 cm.';
  if (isNaN(age) || age < 16 || age > 120) return "L'âge doit être entre 16 et 120 ans.";
  return null;
}

// ── Composant ─────────────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<ProfileForm>({
    weight_kg: '',
    height_cm: '',
    age: '',
    sex: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── État notifications push ────────────────────────────────────────────────
  type NotifStatus = 'unknown' | 'loading' | 'granted' | 'denied';
  const [notifStatus, setNotifStatus] = useState<NotifStatus>('unknown');
  const [notifError, setNotifError] = useState<string | null>(null);

  // Pré-remplir le formulaire si le profil existe déjà
  useEffect(() => {
    if (profile) {
      setForm({
        weight_kg: profile.weight_kg ? String(profile.weight_kg) : '',
        height_cm: profile.height_cm ? String(profile.height_cm) : '',
        age: profile.age ? String(profile.age) : '',
        sex: profile.sex ?? '',
      });
    }
  }, [profile]);

  // Vérifie l'état des notifications au chargement de la page
  // Si déjà accordé, met à jour le token FCM silencieusement (il peut changer)
  useEffect(() => {
    if (!user || !('Notification' in window)) return;

    const permission = Notification.permission;
    if (permission === 'granted') {
      setNotifStatus('granted');
      // Rafraîchit le token FCM en arrière-plan à chaque visite
      getFCMToken().then((token) => {
        if (token) {
          api.updateFCMToken(user.id, token).catch(() => {
            // Silencieux — ne bloque pas le rendu
          });
        }
      });
    } else if (permission === 'denied') {
      setNotifStatus('denied');
    } else {
      setNotifStatus('unknown');
    }
  }, [user]);

  const handleEnableNotifications = async () => {
    if (!user) return;
    setNotifStatus('loading');
    setNotifError(null);

    const token = await requestNotificationPermission();

    if (!token) {
      // Permission refusée ou navigateur incompatible
      const denied = 'Notification' in window && Notification.permission === 'denied';
      setNotifStatus(denied ? 'denied' : 'unknown');
      setNotifError(
        denied
          ? 'Permission refusée. Active les notifications dans les réglages de ton navigateur.'
          : 'Impossible d\'activer les notifications sur cet appareil.',
      );
      return;
    }

    try {
      await api.updateFCMToken(user.id, token);
      setNotifStatus('granted');
    } catch {
      setNotifStatus('unknown');
      setNotifError('Erreur lors de l\'enregistrement des notifications. Réessaie.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: supabaseError } = await supabase
        .from('profiles')
        .update({
          weight_kg: parseFloat(form.weight_kg),
          height_cm: parseFloat(form.height_cm),
          age: parseInt(form.age, 10),
          sex: form.sex,
        })
        .eq('id', user.id);

      if (supabaseError) throw supabaseError;

      await refreshProfile();
      setSuccess(true);

      // Si le profil était incomplet, redirige vers l'accueil après sauvegarde
      if (!profile?.weight_kg) {
        setTimeout(() => navigate('/'), 800);
      }
    } catch {
      setError('Erreur lors de la sauvegarde. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Infos Google non modifiables
  const displayName = profile?.display_name ?? user?.user_metadata?.full_name ?? '—';
  const email = user?.email ?? '—';

  return (
    <div className="page">
      <h1>👤 Profil</h1>
      <p className="subtitle">Tes informations personnelles</p>

      {/* Infos Google — lecture seule */}
      <div className="card">
        <h2>Compte Google</h2>
        <p><strong>Nom :</strong> {displayName}</p>
        <p><strong>Email :</strong> {email}</p>
      </div>

      {/* Formulaire profil */}
      <div className="card">
        <h2>Informations physiques</h2>
        <p className="form-hint">
          Ces données sont utilisées pour calculer ton taux d'alcoolémie avec la formule de Widmark.
        </p>

        <form onSubmit={handleSave} noValidate>
          {/* Sexe */}
          <div className="form-group">
            <label className="form-label">Sexe</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="sex"
                  value="male"
                  checked={form.sex === 'male'}
                  onChange={handleChange}
                />
                Homme
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="sex"
                  value="female"
                  checked={form.sex === 'female'}
                  onChange={handleChange}
                />
                Femme
              </label>
            </div>
          </div>

          {/* Poids */}
          <div className="form-group">
            <label className="form-label" htmlFor="weight_kg">Poids (kg)</label>
            <input
              id="weight_kg"
              name="weight_kg"
              type="number"
              min="30"
              max="300"
              step="0.1"
              placeholder="Ex : 70"
              value={form.weight_kg}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* Taille */}
          <div className="form-group">
            <label className="form-label" htmlFor="height_cm">Taille (cm)</label>
            <input
              id="height_cm"
              name="height_cm"
              type="number"
              min="100"
              max="250"
              placeholder="Ex : 175"
              value={form.height_cm}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* Âge */}
          <div className="form-group">
            <label className="form-label" htmlFor="age">Âge</label>
            <input
              id="age"
              name="age"
              type="number"
              min="16"
              max="120"
              placeholder="Ex : 25"
              value={form.age}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">Profil enregistré ✓</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* Notifications push */}
      <div className="card">
        <h2>Notifications push</h2>
        <p className="form-hint">
          Reçois une notification quand ton taux repasse sous 0,5 g/L et que tu peux reconduire.
        </p>

        {notifStatus === 'granted' && (
          <p className="success-message">Notifications activées ✅</p>
        )}

        {notifStatus === 'denied' && (
          <p className="error-message">
            Notifications bloquées. Active-les dans les réglages de ton navigateur puis recharge la page.
          </p>
        )}

        {notifError && notifStatus !== 'denied' && (
          <p className="error-message">{notifError}</p>
        )}

        {notifStatus !== 'granted' && (
          <button
            className="btn-primary"
            onClick={handleEnableNotifications}
            disabled={notifStatus === 'loading' || notifStatus === 'denied'}
          >
            {notifStatus === 'loading' ? 'Activation...' : 'Activer les notifications 🔔'}
          </button>
        )}
      </div>

      {/* Déconnexion */}
      <div className="card">
        <button className="btn-secondary" onClick={handleSignOut}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Profile;
