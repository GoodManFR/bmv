# Dépendances partagées entre les routers
# Centralise la validation du JWT Supabase

from fastapi import HTTPException, Header
from app.services.supabase import supabase


def get_authenticated_user_id(authorization: str = Header(...)) -> str:
    """
    Extrait et valide le JWT Supabase depuis le header Authorization.
    Retourne le user_id si le token est valide, lève une 401 sinon.
    """
    token = authorization.removeprefix("Bearer ").strip()
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Token invalide ou expiré")
        return response.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
