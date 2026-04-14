# BMV (BOIRE MANGER VOMIR) — Document de référence projet

## Vision
BMV est une PWA de suivi d'alcoolémie en temps réel avec scan de code-barres. L'utilisateur scanne ses boissons (bières, vins, spiritueux), l'app calcule son taux d'alcoolémie via la formule de Widmark, affiche une courbe en temps réel, et envoie une notification push quand il peut reconduire (seuil légal français : 0.5 g/L).

## Stack technique
- **Frontend** : React + TypeScript + Vite, déployé sur Vercel
- **Backend** : Python + FastAPI, déployé sur Render (gratuit)
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth avec Google OAuth uniquement
- **Scan code-barres** : html5-qrcode (caméra du téléphone)
- **API bières** : Open Food Facts (gratuit, API REST, recherche par code EAN)
- **Graphiques** : Recharts
- **Notifications push** : Firebase Cloud Messaging
- **PWA** : vite-plugin-pwa (manifest + service worker)

## Architecture

```
bmv/
├── bmv-frontend/          # PWA React/TypeScript
│   ├── src/
│   │   ├── components/    # Composants réutilisables (NavBar, DrinkCard, BACChart, etc.)
│   │   ├── pages/         # Pages (Home, Scanner, History, Profile, Login)
│   │   ├── services/      # Logique métier (api.ts, supabase.ts, firebase.ts)
│   │   ├── types/         # Types TypeScript partagés
│   │   ├── hooks/         # Custom hooks React
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── public/
├── bmv-backend/           # API FastAPI
│   ├── app/
│   │   ├── main.py        # App FastAPI + CORS
│   │   ├── routers/       # Endpoints (drinks, sessions, bac, profile)
│   │   ├── services/      # Logique métier (openfoodfacts, bac_engine)
│   │   ├── models/        # Pydantic schemas
│   │   └── config.py      # Variables d'environnement
│   └── requirements.txt
└── README.md
```

## Modèle de données

### Table `profiles`
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | = auth.users.id de Supabase |
| display_name | text | Nom affiché |
| weight_kg | float | Poids en kg |
| height_cm | float | Taille en cm |
| age | int | Âge |
| sex | text | 'male' ou 'female' |
| created_at | timestamp | Date de création |

### Table `sessions` (= une soirée)
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles.id) | |
| started_at | timestamp | Auto au premier drink |
| ended_at | timestamp | Null tant que la soirée est ouverte |
| rating | int (1-5) | Note de la soirée (optionnel) |
| comment | text | Commentaire libre (optionnel) |

### Table `drinks`
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles.id) | |
| session_id | uuid (FK → sessions.id) | |
| name | text | Nom de la boisson |
| abv | float | Degré d'alcool en % |
| volume_ml | int | Volume en ml |
| source | text | 'scan' ou 'manual' |
| ean_code | text | Code EAN si scanné (optionnel) |
| timestamp | timestamp | Moment de la consommation |

## Types TypeScript

```typescript
export interface UserProfile {
  id: string;
  google_id: string;
  display_name: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: 'male' | 'female';
  created_at: string;
}

export interface Drink {
  id: string;
  user_id: string;
  session_id: string;
  name: string;
  abv: number;
  volume_ml: number;
  source: 'scan' | 'manual';
  ean_code?: string;
  timestamp: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  rating?: number;
  comment?: string;
  drinks: Drink[];
}

export interface BACData {
  current_bac: number;
  time_to_sober: number;
  is_legal: boolean;
  curve: { time: string; bac: number }[];
}
```

## Fonctionnalités MVP (par ordre de priorité)

### 1. Auth Google
- Login via Google OAuth (Supabase Auth)
- Pas de création de compte manuelle
- Redirection vers page profil si profil incomplet

### 2. Profil utilisateur
- Saisie : poids, taille, âge, sexe
- Stocké dans Supabase lié au user_id
- Modifiable à tout moment

### 3. Scan de code-barres
- Ouvre la caméra du téléphone
- Scanne le code EAN
- Appel à Open Food Facts : `https://world.openfoodfacts.org/api/v2/product/{ean}.json`
- Affiche : nom, brasserie, ABV, image si disponible
- Si non trouvé : formulaire manuel (nom, degré, volume)

### 4. Logging de boisson
- Boutons rapides de volume selon le type :
  - Bière : 25cl, 33cl, 50cl, Pinte (50cl)
  - Vin : 12cl, 15cl
  - Spiritueux/Shot : 3cl, 6cl
  - Cocktail : 15cl, 25cl
- Input manuel pour tout type de boisson (nom + degré + volume)
- Chaque boisson est liée à la soirée en cours (ou en crée une nouvelle)

### 5. Moteur BAC (Widmark)
Formule : BAC(t) = (A / (r × W)) - (β × t)
- A = grammes d'alcool pur (volume_ml × abv/100 × 0.789)
- r = constante métabolique (0.68 homme, 0.55 femme)
- W = poids en kg
- β = taux d'élimination (0.15 g/L/h en moyenne)
- t = temps écoulé en heures
- Le BAC total = somme des BAC de chaque boisson, avec un minimum de 0
- Recalculé dynamiquement pour l'instant présent

### 6. Dashboard BAC
- Courbe de la soirée en cours (Recharts)
- Rafraîchissement toutes les 10 minutes
- Ligne horizontale à 0.5 g/L (seuil légal)
- Affichage : BAC actuel, temps restant avant de pouvoir conduire, statut (légal ou non)

### 7. Gestion des soirées
- Début automatique au premier drink loggé
- Bouton "Fin de soirée" → formulaire note (1-5) + commentaire
- Une soirée terminée ne peut plus recevoir de drinks

### 8. Historique des soirées
- Liste des soirées passées (date, nb drinks, BAC max, note, commentaire)
- Vue détail : liste des boissons + courbe BAC de la soirée

### 9. Notification push
- Firebase Cloud Messaging
- Notification quand BAC repasse sous 0.5 g/L : "Tu peux reconduire ! 🚗"
- Fonctionne même app fermée (service worker)

### 10. Style visuel
- Fond sombre `#1a1a2e`
- Pattern d'emojis alcool (🍺🍷🥴🍻🥂🍾🤮) en transparence sur le fond
- Style enfantin, fun et décalé
- Texte blanc, accents colorés
- Tout le texte en français
- Disclaimer légal obligatoire : "BMV fournit une estimation. Ne remplace jamais un éthylotest certifié."

### 11. PWA
- Manifest avec nom "BMV", icône 🍺
- Service worker pour le cache et les notifs
- Prompt d'installation au premier lancement
- Fonctionne hors-ligne (au moins le dashboard)

## Plan d'exécution en 12 étapes
1. Init projet (scaffold frontend + backend + structure)
2. Supabase (tables + Row Level Security + client)
3. Auth Google (Supabase Auth + pages login/profil)
4. Scanner code-barres + API Open Food Facts
5. Logging de boisson (boutons volumes + input manuel + création soirée auto)
6. Moteur BAC Widmark (calcul Python côté backend)
7. Dashboard BAC + graphique Recharts
8. Gestion des soirées (fin de soirée + note + commentaire)
9. Historique des soirées
10. Notifications push Firebase
11. Style visuel BMV (emojis, fond, ton décalé)
12. Déploiement (Vercel + Render + variables d'env + tests mobile)

## Contraintes générales
- Pas de CSS framework (pas de Tailwind, Material UI). CSS custom uniquement.
- CSS minimal et propre jusqu'à l'étape 11 (fond sombre, texte blanc, navigation fonctionnelle)
- Tout le texte visible dans l'app en français
- Code commenté en français
- Chaque endpoint backend doit avoir sa doc OpenAPI (automatique avec FastAPI)
- Gestion d'erreurs propre (try/catch frontend, HTTPException backend)
- Le code doit être prêt pour la production (pas de console.log oubliés, pas de secrets en dur)
