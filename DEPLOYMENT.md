# Guide de déploiement — BMV

Ce guide décrit comment déployer BMV en production : frontend sur **Vercel** (gratuit), backend sur **Render** (gratuit).

---

## 1. Prérequis

- Compte GitHub avec le repo BMV
- Compte Vercel (gratuit) : https://vercel.com
- Compte Render (gratuit) : https://render.com
- Projet Supabase configuré (étapes 2-3)
- Projet Firebase configuré (étape 10)
- Client OAuth Google configuré (étape 3)

---

## 2. Déploiement du backend sur Render

### 2.1 Créer le service

1. Aller sur [render.com](https://render.com) > **New** > **Web Service**
2. Connecter le repo GitHub BMV
3. Configurer :
   - **Root Directory** : `bmv-backend`
   - **Runtime** : Python 3
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan** : Free

> Alternatively, Render peut détecter le fichier `render.yaml` à la racine et configurer le service automatiquement.

### 2.2 Variables d'environnement à configurer dans Render Dashboard

| Variable | Description |
|---|---|
| `ENVIRONMENT` | `production` |
| `SUPABASE_URL` | URL de ton projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service role Supabase (Settings > API) |
| `FRONTEND_URL` | URL Vercel du frontend (ex: `https://bmv.vercel.app`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON complet du service account Firebase (sur une seule ligne) |

### 2.3 Comportement du tier gratuit Render

> **Important** : le tier gratuit Render met le service en veille après **15 minutes d'inactivité**.
> La première requête après une période d'inactivité peut prendre **30 à 60 secondes** le temps que le service redémarre.
> C'est un comportement normal et attendu. Pour éviter ça, il faudrait passer sur un plan payant.

### 2.4 Vérifier que le backend est en ligne

Une fois déployé, tester l'endpoint de santé :

```
GET https://<ton-service>.onrender.com/health
```

Réponse attendue : `{"status": "ok", "version": "0.1.0"}`

---

## 3. Déploiement du frontend sur Vercel

### 3.1 Créer le projet

1. Aller sur [vercel.com](https://vercel.com) > **Add New Project**
2. Importer le repo GitHub BMV
3. Configurer :
   - **Root Directory** : `bmv-frontend`
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`

### 3.2 Variables d'environnement à configurer dans Vercel Dashboard

Aller dans **Project Settings > Environment Variables** et ajouter :

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du backend Render (ex: `https://bmv-backend.onrender.com`) |
| `VITE_SUPABASE_URL` | URL de ton projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé anon/public Supabase (Settings > API) |
| `VITE_FIREBASE_API_KEY` | Clé API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ID du projet Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | `<project>.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID Firebase |
| `VITE_FIREBASE_APP_ID` | App ID Firebase |
| `VITE_FIREBASE_VAPID_KEY` | Clé VAPID publique (Firebase > Project Settings > Cloud Messaging > Web Push certificates) |

### 3.3 Redéploiement automatique

Vercel redéploie automatiquement à chaque push sur la branche principale.

---

## 4. Configuration Supabase (post-déploiement)

Une fois l'URL Vercel connue (ex: `https://bmv.vercel.app`) :

1. Aller dans **Supabase Dashboard > Authentication > URL Configuration**
2. Mettre à jour **Site URL** : `https://bmv.vercel.app`
3. Ajouter dans **Redirect URLs** : `https://bmv.vercel.app/**`

---

## 5. Configuration Google Cloud (post-déploiement)

Une fois l'URL Vercel connue :

1. Aller dans [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
2. Éditer le client OAuth 2.0
3. Ajouter dans **Authorized redirect URIs** :
   - `https://<projet>.supabase.co/auth/v1/callback`
   - `https://bmv.vercel.app` (si redirection côté frontend)

---

## 6. Vérification finale

- [ ] `GET https://<render-url>/health` retourne `{"status":"ok"}`
- [ ] L'app Vercel charge sans erreur 404
- [ ] Le login Google fonctionne
- [ ] Un drink peut être ajouté et le BAC se calcule
- [ ] Les notifications push s'affichent (si permission accordée)
- [ ] L'app s'installe comme PWA sur mobile

---

## 7. Script de vérification pre-deploy

Avant chaque déploiement, lancer :

```bash
bash scripts/check-deploy.sh
```

Ce script vérifie l'absence de secrets hardcodés, la présence des fichiers `.env.example`, et les `.gitignore`.
