# Étape 2 — Configuration Supabase (BDD + Row Level Security)

Lis MASTER.md pour le contexte global.

## Ta mission
Configurer Supabase comme base de données du projet : créer les tables, les politiques de sécurité, et connecter le client frontend et backend.

## Concrètement

### 1. Script SQL de création des tables
Crée un fichier `supabase/schema.sql` à la racine du projet contenant :
- Table `profiles` selon le schéma du MASTER (id = uuid référençant auth.users.id)
- Table `sessions` selon le schéma du MASTER
- Table `drinks` selon le schéma du MASTER
- Les foreign keys appropriées
- Un trigger qui crée automatiquement une entrée dans `profiles` quand un user s'inscrit via auth (fonction `handle_new_user`)
- Row Level Security (RLS) activé sur les 3 tables : chaque utilisateur ne peut voir/modifier QUE ses propres données (`auth.uid() = user_id`)

### 2. Frontend — Client Supabase
Met à jour `src/services/supabase.ts` :
- Initialise le client Supabase avec les variables d'env `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
- Exporte le client pour réutilisation
- Met à jour `.env.example` du frontend avec ces variables

### 3. Backend — Client Supabase
Crée un fichier `app/services/supabase.py` dans le backend :
- Initialise le client Supabase avec `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` (service key pour bypass RLS côté serveur)
- Met à jour `config.py` pour inclure ces variables
- Met à jour `.env.example` du backend

### 4. Instructions
Ajoute un fichier `supabase/README.md` qui explique en français :
- Comment créer un projet Supabase (gratuit)
- Où trouver l'URL et les clés (anon key + service key)
- Comment exécuter le script `schema.sql` dans le SQL Editor de Supabase
- Comment activer le provider Google dans Authentication > Providers

## Contraintes
- Ne touche PAS aux pages, composants ou routers existants
- Le script SQL doit être prêt à copier-coller dans le SQL Editor de Supabase
- Utilise les UUID v4 générés par Supabase (gen_random_uuid())
