# Étape 5 — Logging de boisson + Gestion automatique des soirées

Lis MASTER.md pour le contexte global.

## Ta mission
Brancher le vrai enregistrement des boissons en base de données Supabase, avec création automatique de soirée au premier drink.

## Concrètement

### 1. Backend — Logique des soirées (`app/routers/sessions.py`)
- `GET /sessions/current?user_id={id}` → retourne la soirée en cours (ended_at IS NULL) ou null
- `POST /sessions/` → crée une nouvelle soirée (body: user_id) et retourne l'objet créé
- `PUT /sessions/{session_id}/end` → met fin à la soirée (set ended_at = now), accepte optionnellement rating (1-5) et comment dans le body
- `GET /sessions/?user_id={id}` → liste toutes les soirées de l'utilisateur (pour l'historique, étape 9)

### 2. Backend — Logging des boissons (`app/routers/drinks.py`)
- `POST /drinks/` → enregistre une boisson en base
  - Body : user_id, name, abv, volume_ml, source ('scan' ou 'manual'), ean_code (optionnel)
  - Logique : 
    1. Chercher s'il existe une soirée en cours pour ce user (ended_at IS NULL)
    2. Si NON → créer automatiquement une nouvelle soirée, récupérer son id
    3. Enregistrer la boisson avec le session_id et timestamp = now
    4. Retourner la boisson créée + le session_id
- `GET /drinks/?session_id={id}` → liste les boissons d'une soirée

### 3. Frontend — Service API (`src/services/api.ts`)
Ajouter les fonctions :
- `logDrink(data)` → POST /drinks/
- `getCurrentSession(userId)` → GET /sessions/current
- `endSession(sessionId, rating?, comment?)` → PUT /sessions/{id}/end
- `getSessionDrinks(sessionId)` → GET /drinks/?session_id={id}

### 4. Frontend — Brancher le Scanner (`src/pages/Scanner.tsx`)
- Remplacer le `console.log` stub par un vrai appel à `logDrink()`
- Après ajout réussi : afficher un message de succès avec le nom de la boisson et rediriger vers `/` (Home) après 2 secondes
- En cas d'erreur : afficher un message d'erreur clair

### 5. Frontend — Hook useSession (`src/hooks/useSession.ts`)
- Expose : `currentSession`, `drinks` (de la soirée en cours), `loading`, `addDrink()`, `endSession()`
- `addDrink()` appelle l'API et rafraîchit la liste des drinks
- `endSession()` appelle l'API et reset l'état

### 6. Page Home — Affichage basique de la soirée en cours (`src/pages/Home.tsx`)
- Si une soirée est en cours : afficher la liste des boissons loggées (nom, ABV, volume, heure)
- Si pas de soirée : message "Aucune soirée en cours. Scanne une boisson pour commencer !"
- Bouton "Fin de soirée" visible uniquement si soirée en cours (la popup note/commentaire sera finalisée à l'étape 8, pour l'instant juste terminer la soirée)

## Contraintes
- La soirée se crée AUTOMATIQUEMENT au premier drink, pas de bouton "Démarrer"
- Une seule soirée peut être en cours à la fois par utilisateur
- Le timestamp de chaque drink est généré côté serveur (pas côté client)
- Utiliser le user_id du token JWT pour sécuriser les endpoints
- Tout le texte en français
