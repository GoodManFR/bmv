// Service Firebase — notifications push FCM (étape 10)
// Gère l'initialisation Firebase, la demande de permission et la récupération du token FCM.

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ── Configuration Firebase (variables d'env Vite) ─────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

// Clé VAPID publique (Web Push certificate) — à renseigner dans .env.local
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '';

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ── Fonctions publiques ───────────────────────────────────────────────────────

/**
 * Demande la permission de notifications à l'utilisateur,
 * puis récupère le token FCM si la permission est accordée.
 *
 * @returns Le token FCM (string) ou null si la permission est refusée / erreur
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  // Les notifications ne sont pas disponibles dans tous les contextes (ex : iOS)
  if (!('Notification' in window)) {
    console.warn('Les notifications push ne sont pas supportées sur cet appareil.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }
    return getFCMToken();
  } catch (error) {
    console.error('[firebase] Erreur lors de la demande de permission :', error);
    return null;
  }
};

/**
 * Récupère le token FCM actuel sans redemander la permission.
 * Enregistre explicitement le service worker firebase-messaging-sw.js
 * pour éviter tout conflit avec le service worker Workbox (PWA).
 *
 * @returns Le token FCM (string) ou null en cas d'erreur
 */
export const getFCMToken = async (): Promise<string | null> => {
  try {
    // Enregistrement explicite du SW Firebase (distinct du SW Workbox/PWA)
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    return token || null;
  } catch (error) {
    console.error('[firebase] Erreur récupération token FCM :', error);
    return null;
  }
};

// Export pour les notifs foreground (app ouverte)
export { messaging, onMessage, firebaseConfig };
