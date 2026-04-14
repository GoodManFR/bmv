# Étape 1 — Initialisation du projet

Lis d'abord le fichier MASTER.md à la racine du projet. C'est le document de référence complet.

## Ta mission
Réalise uniquement l'étape 1 du plan d'exécution : scaffold le frontend et le backend avec toute la structure de dossiers.

## Concrètement
1. **Frontend** : Scaffold React/TypeScript avec Vite. Installe toutes les dépendances listées dans le MASTER (react-router-dom, recharts, html5-qrcode, @supabase/supabase-js, firebase, vite-plugin-pwa). Configure la PWA (manifest + service worker). Crée toute l'arborescence de dossiers et fichiers placeholder. Configure le router avec les 4 routes + une barre de navigation mobile en bas.

2. **Backend** : Crée le dossier bmv-backend avec la structure FastAPI complète. Tous les routers placeholder avec un endpoint GET chacun. Le requirements.txt complet. Le fichier .env.example.

3. **Types** : Crée les types TypeScript ET les schemas Pydantic tels que définis dans le MASTER.

4. **README.md** à la racine avec instructions pour lancer le front et le back.

## Contraintes
- CSS minimal (fond sombre #1a1a2e, texte blanc) — le vrai style viendra à l'étape 11
- Tout le texte visible en français
- Le frontend doit se lancer avec `npm run dev` et afficher les 4 pages avec navigation
- Le backend doit se lancer avec `uvicorn app.main:app --reload` et répondre sur `GET /health`
- Ne configure PAS Supabase ni Firebase (juste les fichiers placeholder avec des TODO)
