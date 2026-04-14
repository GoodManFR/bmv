# Configuration — variables d'environnement chargées via pydantic-settings
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase (étape 2)
    supabase_url: str = ""
    supabase_service_key: str = ""

    # CORS — URL du frontend
    frontend_url: str = "http://localhost:5173"

    # Environnement
    environment: str = "development"

    # Port d'écoute (injecté par Render via $PORT, inutile en local)
    port: int = 8000

    # Firebase FCM (étape 10) — JSON complet du service account Firebase
    # Exemple : FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...",...}'
    firebase_service_account_json: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Instance unique partagée dans toute l'app
settings = Settings()
