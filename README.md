# BMV — Boire Manger Vomir

PWA de suivi d'alcoolémie en temps réel avec scan de code-barres.

> ⚠️ BMV fournit une estimation. Ne remplace jamais un éthylotest certifié.

---

## Lancer le frontend

```bash
cd bmv-frontend

# Installer les dépendances (déjà fait si clonage récent)
npm install

# Copier et renseigner les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec tes clés Supabase et Firebase

# Lancer en développement
npm run dev
# → http://localhost:5173
```

## Lancer le backend

```bash
cd bmv-backend

# Créer un environnement virtuel Python
python -m venv venv
source venv/bin/activate   # macOS/Linux
# ou : venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Copier et renseigner les variables d'environnement
cp .env.example .env
# Éditer .env avec tes clés Supabase

# Lancer en développement
uvicorn app.main:app --reload
# → http://localhost:8000
# → Documentation API : http://localhost:8000/docs
```

---

## Structure du projet

```
bmv/
├── bmv-frontend/          # PWA React/TypeScript/Vite
│   ├── src/
│   │   ├── components/    # NavBar
│   │   ├── pages/         # Home, Scanner, History, Profile, Login
│   │   ├── services/      # api.ts, supabase.ts, firebase.ts
│   │   ├── types/         # Types TypeScript partagés
│   │   ├── hooks/         # useBAC, useSession
│   │   ├── App.tsx        # Router React
│   │   └── main.tsx
│   └── .env.example
├── bmv-backend/           # API FastAPI
│   ├── app/
│   │   ├── main.py        # App + CORS + /health
│   │   ├── config.py      # Variables d'environnement
│   │   ├── routers/       # profile, drinks, sessions, bac
│   │   ├── services/      # openfoodfacts, bac_engine
│   │   └── models/        # Schémas Pydantic
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

## Endpoints backend disponibles

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/health` | Santé de l'API |
| GET | `/profile/` | Profil utilisateur |
| GET | `/drinks/` | Boissons de la session |
| GET | `/sessions/` | Historique soirées |
| GET | `/sessions/current` | Soirée en cours |
| GET | `/bac/` | BAC actuel |

Documentation interactive complète : `http://localhost:8000/docs`

## Plan d'exécution

1. ✅ **Init projet** — scaffold frontend + backend + structure
2. ⬜ Supabase (tables + RLS + client)
3. ⬜ Auth Google (Supabase Auth + pages login/profil)
4. ⬜ Scanner code-barres + API Open Food Facts
5. ⬜ Logging de boisson
6. ⬜ Moteur BAC Widmark
7. ⬜ Dashboard BAC + graphique Recharts
8. ⬜ Gestion des soirées
9. ⬜ Historique des soirées
10. ⬜ Notifications push Firebase
11. ⬜ Style visuel BMV
12. ⬜ Déploiement (Vercel + Render)
