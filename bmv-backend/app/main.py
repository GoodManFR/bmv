# main.py — Application FastAPI BMV
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import bac, drinks, profile, sessions

# Création de l'application FastAPI
app = FastAPI(
    title="BMV API",
    description="API de suivi d'alcoolémie — Boire Manger Vomir",
    version="0.1.0",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# En dev : autorise tous les ports localhost (Vite peut utiliser 5173, 5174, etc.)
# En prod : restreint à l'URL frontend configurée dans FRONTEND_URL
if settings.environment == "development":
    cors_config = {"allow_origin_regex": r"http://(localhost|192\.168\.\d+\.\d+):\d+"}
else:
    cors_config = {"allow_origins": [settings.frontend_url]}

app.add_middleware(
    CORSMiddleware,
    **cors_config,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(profile.router)
app.include_router(drinks.router)
app.include_router(sessions.router)
app.include_router(bac.router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["système"], summary="Vérifier que l'API est en ligne")
async def health():
    """Endpoint de santé — utilisé par Render pour les health checks."""
    return {"status": "ok", "version": "0.1.0"}
