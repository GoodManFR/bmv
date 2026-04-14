# Router soirées — gestion des sessions de consommation
# Sécurisé par JWT : chaque utilisateur ne voit et ne modifie que ses propres soirées

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_authenticated_user_id
from app.models.schemas import SessionEnd
from app.services.supabase import supabase
from app.services.bac_engine import BACCalculator

router = APIRouter(prefix="/sessions", tags=["soirées"])


@router.get("/current", summary="Récupérer la soirée en cours")
async def get_current_session(
    user_id: str = Query(..., description="ID de l'utilisateur"),
    authenticated_id: str = Depends(get_authenticated_user_id),
):
    """
    Retourne la soirée active (ended_at IS NULL) de l'utilisateur, ou null si aucune.
    """
    if authenticated_id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    response = (
        supabase.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .is_("ended_at", "null")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        return {"session": None}

    return {"session": response.data[0]}


@router.post("/", summary="Créer une nouvelle soirée")
async def create_session(
    authenticated_id: str = Depends(get_authenticated_user_id),
):
    """
    Crée une nouvelle soirée pour l'utilisateur connecté.
    Le user_id est extrait du JWT — jamais du body.
    """
    response = (
        supabase.table("sessions")
        .insert({"user_id": authenticated_id})
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Impossible de créer la soirée")

    return response.data[0]


@router.put("/{session_id}/end", summary="Terminer une soirée")
async def end_session(
    session_id: str,
    payload: SessionEnd,
    authenticated_id: str = Depends(get_authenticated_user_id),
):
    """
    Clôture une soirée en renseignant ended_at = maintenant.
    Accepte une note (1-5) et un commentaire optionnels.
    """
    # Vérifier que la soirée appartient bien à l'utilisateur connecté
    check = (
        supabase.table("sessions")
        .select("id, user_id, ended_at")
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not check.data:
        raise HTTPException(status_code=404, detail="Soirée introuvable")
    if check.data["user_id"] != authenticated_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    if check.data["ended_at"] is not None:
        raise HTTPException(status_code=400, detail="Cette soirée est déjà terminée")

    update_data: dict = {"ended_at": datetime.now(timezone.utc).isoformat()}
    if payload.rating is not None:
        update_data["rating"] = payload.rating
    if payload.comment is not None:
        update_data["comment"] = payload.comment

    # Calcul du BAC max atteint pendant la soirée
    drinks_resp = (
        supabase.table("drinks")
        .select("*")
        .eq("session_id", session_id)
        .execute()
    )
    profile_resp = (
        supabase.table("profiles")
        .select("weight_kg, sex")
        .eq("id", authenticated_id)
        .single()
        .execute()
    )

    max_bac = 0.0
    if (
        drinks_resp.data
        and profile_resp.data
        and profile_resp.data.get("weight_kg")
        and profile_resp.data.get("sex")
    ):
        calc = BACCalculator()
        curve = calc.generate_curve(profile_resp.data, drinks_resp.data)
        if curve:
            max_bac = max(p["bac"] for p in curve)

    update_data["max_bac"] = round(max_bac, 2)

    response = (
        supabase.table("sessions")
        .update(update_data)
        .eq("id", session_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=500, detail="Impossible de terminer la soirée")

    return response.data[0]


@router.get("/{session_id}", summary="Récupérer une soirée avec ses boissons")
async def get_session_detail(
    session_id: str,
    authenticated_id: str = Depends(get_authenticated_user_id),
):
    """
    Retourne une soirée et la liste complète de ses boissons, triées par heure croissante.
    Utilisé à l'étape 9 pour la page de détail d'une soirée.
    """
    session_resp = (
        supabase.table("sessions")
        .select("*")
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not session_resp.data:
        raise HTTPException(status_code=404, detail="Soirée introuvable")
    if session_resp.data["user_id"] != authenticated_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    drinks_resp = (
        supabase.table("drinks")
        .select("*")
        .eq("session_id", session_id)
        .order("timestamp")
        .execute()
    )

    session = session_resp.data
    session["drinks"] = drinks_resp.data or []
    return session


@router.get("/", summary="Lister les soirées passées")
async def get_sessions(
    user_id: str = Query(..., description="ID de l'utilisateur"),
    authenticated_id: str = Depends(get_authenticated_user_id),
):
    """
    Retourne l'historique complet des soirées de l'utilisateur, triées par date décroissante.
    Utilisé à l'étape 9 pour la page Historique.
    """
    if authenticated_id != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    response = (
        supabase.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .execute()
    )

    return {"sessions": response.data or []}
