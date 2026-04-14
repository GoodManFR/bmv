# Étape 12 — Déploiement (Vercel + Render)

Lis MASTER.md pour le contexte global.

## Ta mission
Préparer le projet pour le déploiement en production : frontend sur Vercel, backend sur Render.

## Concrètement

### 1. Frontend — Préparation pour Vercel
- Créer `bmv-frontend/vercel.json` :
  - Rewrites : toutes les routes vers `/index.html` (SPA)
  - Headers de sécurité basiques
- Vérifier que `npm run build` produit un dossier `dist/` propre
- Vérifier que toutes les variables d'env `VITE_*` sont documentées dans `.env.example`
- S'assurer que l'URL de l'API backend est configurable via `VITE_API_URL` (pas hardcodé localhost)

### 2. Backend — Préparation pour Render
- Créer `bmv-backend/render.yaml` (blueprint Render) :
  - Service type: web
  - Runtime: Python 3
  - Build command: `pip install -r requirements.txt`
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Créer `bmv-backend/Procfile` (alternative) :
  - `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Vérifier que `app/config.py` lit bien `PORT` depuis les variables d'env
- Vérifier que le CORS en mode production utilise bien `settings.frontend_url`

### 3. Variables d'environnement — Documentation
Créer un fichier `DEPLOYMENT.md` à la racine avec les instructions complètes :

**Vercel (frontend) :**
- Comment déployer depuis GitHub
- Variables d'env à configurer dans Vercel Dashboard :
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_API_URL (= URL du backend Render)
  - VITE_FIREBASE_API_KEY
  - VITE_FIREBASE_AUTH_DOMAIN
  - VITE_FIREBASE_PROJECT_ID
  - VITE_FIREBASE_STORAGE_BUCKET
  - VITE_FIREBASE_MESSAGING_SENDER_ID
  - VITE_FIREBASE_APP_ID
  - VITE_FIREBASE_VAPID_KEY

**Render (backend) :**
- Comment déployer depuis GitHub
- Variables d'env :
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
  - FRONTEND_URL (= URL Vercel de production)
  - FIREBASE_SERVICE_ACCOUNT_JSON
  - ENVIRONMENT=production

**Supabase :**
- Mettre à jour le Site URL avec l'URL Vercel de production
- Ajouter l'URL Vercel dans les Redirect URLs

**Google Cloud :**
- Ajouter l'URL Vercel dans les Authorized redirect URIs

### 4. Script de vérification pre-deploy
Créer `scripts/check-deploy.sh` (bash) qui vérifie :
- `npm run build` réussit dans bmv-frontend
- Tous les fichiers .env.example sont à jour
- Pas de secrets hardcodés dans le code source (grep basique)
- Les imports sont corrects

### 5. Nettoyage final
- Supprimer les console.log de debug restants dans le frontend
- Vérifier que tous les TODO sont résolus ou documentés
- S'assurer que les fichiers .gitignore sont complets

## Contraintes
- Le déploiement doit fonctionner avec les tiers gratuits (Vercel free, Render free)
- Le backend Render free s'endort après 15min d'inactivité (c'est normal, documenter ce comportement)
- Tout le texte de DEPLOYMENT.md en français
