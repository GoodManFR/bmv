# Router profil — GET et PUT /profile/{user_id}
# Sécurisé par JWT Supabase : chaque utilisateur ne peut accéder qu'à son propre profil

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.supabase import supabase
from app.models.schemas import UserProfileUpdate
from app.dependencies import get_authenticated_user_id

router = APIRouter(prefix="/profile", tags=["profil"])


class FCMTokenUpdate(BaseModel):
    """Payload pour mettre à jour le token FCM d'un utilisateur."""
    fcm_token: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/{user_id}", summary="Récupérer le profil d'un utilisateur")
async def get_profile(user_id: str, authorization: str = Header(...)):
    """
    Retourne le profil complet d'un utilisateur.
    Le token JWT doit appartenir au même utilisateur que user_id.
    """
    authenticated_id = get_authenticated_user_id(authorization)
    if authenticated_id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    return response.data


@router.put("/{user_id}", summary="Mettre à jour le profil")
async def update_profile(
    user_id: str,
    payload: UserProfileUpdate,
    authorization: str = Header(...),
):
    """
    Met à jour les champs fournis dans le profil (poids, taille, âge, sexe, display_name).
    Les champs absents du payload ne sont pas modifiés.
    """
    authenticated_id = get_authenticated_user_id(authorization)
    if authenticated_id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    # N'envoie à Supabase que les champs explicitement fournis
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    response = (
        supabase.table("profiles")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Profil introuvable ou mise à jour échouée")
    return response.data[0]


@router.put("/{user_id}/fcm-token", summary="Mettre à jour le token FCM de l'utilisateur")
async def update_fcm_token(
    user_id: str,
    payload: FCMTokenUpdate,
    authorization: str = Header(...),
):
    """
    Sauvegarde le token FCM de l'appareil de l'utilisateur.
    Appelé par le frontend après acceptation des notifications push.
    Le token peut changer — il est mis à jour à chaque visite.
    """
    authenticated_id = get_authenticated_user_id(authorization)
    if authenticated_id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    response = (
        supabase.table("profiles")
        .update({"fcm_token": payload.fcm_token})
        .eq("id", user_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    return {"message": "Token FCM mis à jour"}
