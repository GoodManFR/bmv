# Étape 10 — Notifications push (Firebase Cloud Messaging)

Lis MASTER.md pour le contexte global.

## Ta mission
Implémenter les notifications push pour prévenir l'utilisateur quand son BAC repasse sous 0.5 g/L (seuil légal). La notification doit arriver même si l'app est fermée.

## Concrètement

### 1. Firebase Config frontend (`src/services/firebase.ts`)
- Initialiser Firebase App avec les variables d'env : VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
- Initialiser Firebase Messaging
- Fonction `requestNotificationPermission()` : demande la permission à l'utilisateur et retourne le FCM token
- Fonction `getFCMToken()` : récupère le token actuel
- Mettre à jour `.env.example` du frontend avec les variables Firebase

### 2. Service Worker pour les notifications en arrière-plan
- Créer `public/firebase-messaging-sw.js` : service worker qui écoute les messages push en arrière-plan et affiche la notification
- Le service worker doit afficher : titre "BMV 🚗", body "Tu peux reconduire ! Ton taux est repassé sous 0.5 g/L", icône 🍺

### 3. Backend — Stockage du FCM token
- Ajouter une colonne `fcm_token` à la table profiles (créer `supabase/migration_002.sql`)
- Endpoint `PUT /profile/{user_id}/fcm-token` qui sauvegarde le token FCM
- Le frontend envoie le token après que l'utilisateur accepte les notifications

### 4. Backend — Service de notification (`app/services/notifications.py`)
- Fonction `send_push_notification(fcm_token, title, body)` qui envoie une notification via l'API HTTP v1 de Firebase (pas le SDK legacy)
- Utiliser httpx pour l'appel HTTP
- Gérer les erreurs (token expiré, invalide, etc.)
- Credentials Firebase : utiliser une service account key (variable d'env FIREBASE_SERVICE_ACCOUNT_JSON ou fichier)

### 5. Backend — Vérification BAC et envoi de notification
- Dans le endpoint `GET /bac/current`, après le calcul :
  - Si le BAC vient de passer sous 0.5 g/L (il faut tracker l'état précédent), envoyer la notification
  - Pour tracker l'état : ajouter un champ `notified_sober` (boolean) dans la table sessions
  - Quand BAC >= 0.5 → notified_sober = false
  - Quand BAC < 0.5 ET notified_sober = false → envoyer la notif + set notified_sober = true
  - Ajouter ce champ dans `supabase/migration_002.sql`

### 6. Frontend — Demande de permission
- Au premier login (ou dans la page Profil), afficher un bouton "Activer les notifications"
- Quand cliqué : appeler `requestNotificationPermission()`, récupérer le token, l'envoyer au backend
- Afficher l'état : "Notifications activées ✅" ou "Notifications désactivées"
- Si l'utilisateur refuse la permission du navigateur, afficher un message explicatif

## Contraintes
- Les notifications doivent fonctionner même app fermée (via le service worker)
- Ne PAS utiliser le SDK Firebase Admin Python (trop lourd). Utiliser l'API HTTP v1 de FCM avec un service account
- Le token FCM peut changer : le mettre à jour à chaque visite de l'app
- Tout le texte en français
- Le fichier `firebase-messaging-sw.js` doit être dans le dossier `public/` (pas dans `src/`)
