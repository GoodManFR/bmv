# Étape 3 — Auth Google + Profil utilisateur

Lis MASTER.md pour le contexte global.

## Ta mission
Implémenter l'authentification Google via Supabase Auth et l'écran de profil utilisateur. À la fin de cette étape, un utilisateur peut se connecter avec Google, remplir son profil, et naviguer dans l'app.

## Concrètement

### 1. Page Login (`src/pages/Login.tsx`)
- Un écran simple avec le logo/titre "BMV" et un bouton "Se connecter avec Google"
- Le bouton appelle `signInWithGoogle()` déjà implémenté dans `src/services/supabase.ts`
- Après connexion réussie, redirection vers `/profile` si le profil est incomplet, sinon vers `/`
- Style minimal : centré, fond sombre, le bouton doit être visible et clair

### 2. Contexte d'authentification (`src/hooks/useAuth.tsx`)
Crée un AuthContext / AuthProvider qui :
- Écoute les changements de session Supabase (`onAuthStateChange`)
- Expose : `user` (objet user Supabase ou null), `profile` (UserProfile ou null), `loading` (boolean), `signIn()`, `signOut()`
- Charge le profil depuis Supabase quand le user est connecté
- Wrap toute l'app dans `<AuthProvider>` via `App.tsx`

### 3. Protection des routes (`src/App.tsx`)
- Si non connecté → toutes les routes redirigent vers `/login`
- Si connecté mais profil incomplet (weight_kg est null) → redirige vers `/profile`
- Si connecté et profil complet → accès normal à toutes les pages
- Remplace le système placeholder `isAuthenticated` actuel par le vrai AuthContext

### 4. Page Profil (`src/pages/Profile.tsx`)
- Formulaire avec les champs : Poids (kg), Taille (cm), Âge, Sexe (boutons radio Homme/Femme)
- Affiche le nom et email Google de l'utilisateur (non modifiables)
- Bouton "Enregistrer" qui sauvegarde dans Supabase (table `profiles`)
- Si le profil existe déjà, pré-remplir les champs
- Bouton "Se déconnecter" en bas de la page
- Validation basique : tous les champs obligatoires, poids entre 30-300kg, taille entre 100-250cm, âge entre 16-120

### 5. Backend — Endpoint profil (`app/routers/profile.py`)
- `GET /profile/{user_id}` → retourne le profil
- `PUT /profile/{user_id}` → met à jour le profil
- Utilise le client Supabase backend pour lire/écrire dans la table `profiles`
- Validation Pydantic des données entrantes

### 6. Service API frontend (`src/services/api.ts`)
- Configure la base URL du backend (`VITE_API_URL` ou `http://localhost:8000` par défaut)
- Implémente `getProfile(userId)` et `updateProfile(userId, data)`
- Ajoute le token Supabase dans le header Authorization pour chaque requête

## Contraintes
- Le profil est sauvegardé DANS Supabase (pas en localStorage)
- Le trigger `handle_new_user` de l'étape 2 crée automatiquement une ligne dans `profiles` à l'inscription
- Tout le texte en français
- CSS minimal mais fonctionnel (formulaire lisible, boutons clairs)
