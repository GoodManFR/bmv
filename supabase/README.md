# Configuration Supabase — Guide d'installation

## 1. Créer un projet Supabase (gratuit)

1. Rendez-vous sur [https://supabase.com](https://supabase.com) et connectez-vous avec GitHub.
2. Cliquez sur **New project**.
3. Choisissez un nom (ex : `bmv`), une région proche de vous (ex : `West EU (Ireland)`), et un mot de passe fort pour la base de données.
4. Attendez environ 1 minute que le projet soit prêt.

---

## 2. Trouver l'URL et les clés

Dans votre projet Supabase, allez dans **Project Settings → API** :

| Variable | Où la trouver | Utilisation |
|----------|--------------|-------------|
| `SUPABASE_URL` | Champ **Project URL** | Frontend + Backend |
| `SUPABASE_ANON_KEY` | Clé **anon / public** | Frontend uniquement |
| `SUPABASE_SERVICE_KEY` | Clé **service_role / secret** | Backend uniquement (ne jamais exposer côté client) |

### Frontend — `.env.local`
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend — `.env`
```
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Créer les tables (script SQL)

1. Dans votre projet Supabase, allez dans **SQL Editor** (icône dans la barre de gauche).
2. Cliquez sur **New query**.
3. Copiez-collez intégralement le contenu du fichier `supabase/schema.sql`.
4. Cliquez sur **Run** (ou `Ctrl+Entrée`).

Le script crée :
- La table `profiles` (liée à `auth.users`)
- La table `sessions` (soirées)
- La table `drinks` (boissons consommées)
- Le Row Level Security sur les 3 tables (chaque utilisateur ne voit que ses propres données)
- Le trigger `on_auth_user_created` qui crée automatiquement une entrée dans `profiles` lors de la première connexion

---

## 4. Activer le provider Google (OAuth)

1. Dans votre projet Supabase, allez dans **Authentication → Providers**.
2. Recherchez **Google** et activez-le.
3. Vous aurez besoin d'un **Client ID** et d'un **Client Secret** Google OAuth 2.0.

### Créer les identifiants Google OAuth :
1. Rendez-vous sur [https://console.cloud.google.com](https://console.cloud.google.com).
2. Créez un projet (ou sélectionnez-en un existant).
3. Allez dans **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
4. Type d'application : **Web application**.
5. Ajoutez dans **Authorized redirect URIs** :
   ```
   https://xxxxxxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback
   ```
   (remplacez par votre URL Supabase Project)
6. Copiez le **Client ID** et le **Client Secret** dans Supabase Authentication → Providers → Google.

---

## 5. Vérification

Après avoir exécuté le script SQL, vous pouvez vérifier que les tables ont bien été créées dans **Table Editor** de Supabase. Vous devriez voir : `profiles`, `sessions`, `drinks`.
