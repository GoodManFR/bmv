// Service Worker Firebase — notifications push en arrière-plan (étape 10)
// Ce fichier est servi statiquement depuis /firebase-messaging-sw.js
//
// IMPORTANT : remplacez les valeurs ci-dessous par vos vraies valeurs Firebase.
// Copiez-les depuis votre fichier bmv-frontend/.env.local
// (Les clés Firebase sont publiques — elles sont déjà dans le bundle JS du frontend)

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// ── Configuration Firebase ────────────────────────────────────────────────────
// Remplacer chaque valeur par la valeur correspondante de votre .env.local
firebase.initializeApp({
  apiKey: 'AIzaSyClPS6VHhaOCmjutAyFsiKIBCPtuS2PxYA',
  authDomain: 'bmv-project-2dde4.firebaseapp.com',
  projectId: 'bmv-project-2dde4',
  storageBucket: 'bmv-project-2dde4.firebasestorage.app',
  messagingSenderId: '720214269340',
  appId: '1:720214269340:web:68bae250ce0c4a21a3bc59',
});

const messaging = firebase.messaging();

// ── Notification en arrière-plan ──────────────────────────────────────────────
// Déclenché quand l'app est fermée ou en arrière-plan
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'BMV 🚗';
  const body =
    payload.notification?.body ??
    'Tu peux reconduire ! Ton taux est repassé sous 0.5 g/L';

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    // tag évite les doublons si plusieurs notifs arrivent en même temps
    tag: 'bmv-sober-alert',
    renotify: false,
  });
});
