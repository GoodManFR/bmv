# Service Supabase — client backend avec la service key
# La service key bypass le Row Level Security : à utiliser uniquement côté serveur

from supabase import create_client, Client
from app.config import settings

def get_supabase_client() -> Client:
    """Retourne un client Supabase authentifié avec la service key."""
    if not settings.supabase_url or not settings.supabase_service_key:
        raise ValueError(
            "Variables d'environnement Supabase manquantes : "
            "SUPABASE_URL et SUPABASE_SERVICE_KEY sont requises."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)

# Instance unique partagée dans toute l'app
supabase: Client = get_supabase_client()
