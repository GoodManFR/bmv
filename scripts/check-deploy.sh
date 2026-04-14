#!/usr/bin/env bash
# check-deploy.sh — Vérification pre-déploiement BMV
# Usage : bash scripts/check-deploy.sh (depuis la racine du projet)

set -euo pipefail

ERRORS=0
WARNINGS=0

# Couleurs terminal
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}[OK]${RESET}    $1"; }
warn() { echo -e "${YELLOW}[WARN]${RESET}  $1"; WARNINGS=$((WARNINGS + 1)); }
err()  { echo -e "${RED}[ERREUR]${RESET} $1"; ERRORS=$((ERRORS + 1)); }

echo ""
echo "=== Vérification pre-déploiement BMV ==="
echo ""

# ── 1. Fichiers .env.example présents ────────────────────────────────────────
echo "-- Fichiers .env.example --"
if [ -f "bmv-frontend/.env.example" ]; then
  ok "bmv-frontend/.env.example présent"
else
  err "bmv-frontend/.env.example MANQUANT"
fi

if [ -f "bmv-backend/.env.example" ]; then
  ok "bmv-backend/.env.example présent"
else
  err "bmv-backend/.env.example MANQUANT"
fi
echo ""

# ── 2. Fichiers de déploiement présents ──────────────────────────────────────
echo "-- Fichiers de déploiement --"
[ -f "bmv-frontend/vercel.json" ] && ok "bmv-frontend/vercel.json présent" || err "bmv-frontend/vercel.json MANQUANT"
[ -f "bmv-backend/render.yaml" ]  && ok "bmv-backend/render.yaml présent"  || err "bmv-backend/render.yaml MANQUANT"
[ -f "bmv-backend/Procfile" ]     && ok "bmv-backend/Procfile présent"     || err "bmv-backend/Procfile MANQUANT"
echo ""

# ── 3. Secrets hardcodés dans le code source ────────────────────────────────
echo "-- Recherche de secrets hardcodés --"

# Vérifier localhost hardcodé dans les sources TypeScript (hors .env.example)
if grep -r "localhost:8000" bmv-frontend/src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -q .; then
  err "URL localhost:8000 hardcodée dans bmv-frontend/src/ — utiliser VITE_API_URL"
else
  ok "Aucun localhost:8000 hardcodé dans bmv-frontend/src/"
fi

# Vérifier clés service_role Supabase dans les sources
if grep -r "service_role" bmv-frontend/src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -q .; then
  err "Clé service_role Supabase détectée dans bmv-frontend/src/ — ne jamais exposer côté client"
else
  ok "Aucune clé service_role dans bmv-frontend/src/"
fi

# Vérifier private_key Firebase dans les sources Python (hors .env.example)
if grep -r "BEGIN PRIVATE KEY" bmv-backend/app/ --include="*.py" -l 2>/dev/null | grep -q .; then
  err "Clé privée Firebase détectée dans bmv-backend/app/ — utiliser FIREBASE_SERVICE_ACCOUNT_JSON"
else
  ok "Aucune clé privée Firebase dans bmv-backend/app/"
fi
echo ""

# ── 4. Fichiers secrets non commités ────────────────────────────────────────
echo "-- Fichiers secrets locaux --"

[ -f "bmv-frontend/.env.local" ] && warn "bmv-frontend/.env.local présent (normal en local, ne pas committer)" || ok "Pas de .env.local dans bmv-frontend"
[ -f "bmv-backend/.env" ]        && warn "bmv-backend/.env présent (normal en local, ne pas committer)"        || ok "Pas de .env dans bmv-backend"
[ -f "bmv-backend/firebase-service-account.json" ] && warn "bmv-backend/firebase-service-account.json présent (ne pas committer)" || ok "Pas de firebase-service-account.json exposé"
echo ""

# ── 5. .gitignore cohérents ──────────────────────────────────────────────────
echo "-- Vérification .gitignore --"
if grep -q "\.env" bmv-backend/.gitignore 2>/dev/null; then
  ok ".env ignoré dans bmv-backend/.gitignore"
else
  err ".env NON ignoré dans bmv-backend/.gitignore"
fi

if grep -q "\.local" bmv-frontend/.gitignore 2>/dev/null; then
  ok "*.local ignoré dans bmv-frontend/.gitignore"
else
  err "*.local NON ignoré dans bmv-frontend/.gitignore"
fi
echo ""

# ── 6. Résumé ────────────────────────────────────────────────────────────────
echo "========================================="
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}$ERRORS erreur(s) — corriger avant de déployer.${RESET}"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}0 erreur, $WARNINGS avertissement(s) — déploiement possible.${RESET}"
else
  echo -e "${GREEN}Tout est OK — prêt pour le déploiement !${RESET}"
fi
echo ""
