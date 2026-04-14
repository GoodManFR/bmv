# Router BAC — calcul du taux d'alcoolémie via la formule de Widmark

from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_authenticated_user_id
from app.models.schemas import BACData, BACPoint
from app.services.supabase import supabase
from app.services.bac_engine import BACCalculator
from app.services.notifications import send_push_notification

router = APIRouter(prefix="/bac", tags=["BAC"])
calculator = BACCalculator()


@router.get("/curve/{session_id}", summary="Courbe BAC d'une soirée passée")
async def get_session_curve(
    session_id: str,
    user_id: str = Depends(get_authenticated_user_id),
):
    """
    Recalcule et retourne la courbe BAC d'une soirée (passée ou en cours).
    Utilisé à l'étape 9 pour la page de détail historique.
    """
    # Vérifie que la soirée appartient à l'utilisateur connecté
    session_resp = (
        supabase.table("sessions")
        .select("id, user_id")
        .eq("id", session_id)
        .single()
        .execute()
    )
    if not session_resp.data:
        raise HTTPException(status_code=404, detail="Soirée introuvable")
    if session_resp.data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    # Récupère le profil
    profile_resp = (
        supabase.table("profiles")
        .select("weight_kg, sex")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not profile_resp.data:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    # Récupère les boissons de la soirée
    drinks_resp = (
        supabase.table("drinks")
        .select("abv, volume_ml, timestamp")
        .eq("session_id", session_id)
        .order("timestamp")
        .execute()
    )
    drinks = drinks_resp.data or []

    if not drinks:
        return {"curve": []}

    curve = calculator.generate_curve(profile_resp.data, drinks)
    return {"curve": curve}


@router.get("/current", response_model=BACData, summary="Calculer le BAC actuel de l'utilisateur")
async def get_current_bac(user_id: str = Depends(get_authenticated_user_id)):
    """
    Retourne le taux d'alcoolémie actuel calculé via la formule de Widmark.

    - **current_bac** : BAC en g/L (arrondi à 2 décimales)
    - **time_to_sober** : minutes avant de repasser sous 0.5 g/L (0 si déjà légal)
    - **is_legal** : True si BAC < 0.5 g/L
    - **curve** : points de la courbe pour Recharts (un point toutes les 10 min)

    Si aucune soirée active n'est trouvée, retourne BAC = 0 et courbe vide.
    """
    # Récupère le profil (poids + sexe nécessaires pour Widmark)
    try:
        profile_resp = (
            supabase.table("profiles")
            .select("weight_kg, sex")
            .eq("id", user_id)
            .single()
            .execute()
        )
        if not profile_resp.data:
            raise HTTPException(status_code=404, detail="Profil introuvable")
        profile = profile_resp.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur profil : {e}")

    # Récupère la soirée active (ended_at IS NULL) avec l'état notified_sober
    try:
        session_resp = (
            supabase.table("sessions")
            .select("id, notified_sober")
            .eq("user_id", user_id)
            .is_("ended_at", "null")
            .limit(1)
            .execute()
        )
        sessions = session_resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur soirée : {e}")

    # Pas de soirée active → BAC = 0
    if not sessions:
        return BACData(current_bac=0.0, time_to_sober=0.0, is_legal=True, curve=[])

    session_id = sessions[0]["id"]
    notified_sober: bool = sessions[0].get("notified_sober") or False

    # Récupère les boissons de la soirée
    try:
        drinks_resp = (
            supabase.table("drinks")
            .select("abv, volume_ml, timestamp")
            .eq("session_id", session_id)
            .order("timestamp")
            .execute()
        )
        drinks = drinks_resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur boissons : {e}")

    # Soirée sans boissons → BAC = 0
    if not drinks:
        return BACData(current_bac=0.0, time_to_sober=0.0, is_legal=True, curve=[])

    # Calcul Widmark
    current_bac = calculator.calculate_bac(profile, drinks)
    time_to_sober = calculator.get_time_to_sober(current_bac)
    is_legal = current_bac < 0.5
    curve_points = calculator.generate_curve(profile, drinks)

    curve = [BACPoint(time=p["time"], bac=p["bac"]) for p in curve_points]

    # ── Logique de notification "tu peux reconduire" ───────────────────────────
    try:
        if not is_legal and notified_sober:
            # Le BAC est remonté au-dessus du seuil légal → réinitialise le flag
            # pour pouvoir notifier à nouveau quand il repassera sous 0.5
            supabase.table("sessions") \
                .update({"notified_sober": False}) \
                .eq("id", session_id) \
                .execute()

        elif is_legal and not notified_sober:
            # Le BAC vient de passer sous 0.5 g/L pour la première fois
            # → récupère le token FCM et envoie la notification
            token_resp = (
                supabase.table("profiles")
                .select("fcm_token")
                .eq("id", user_id)
                .single()
                .execute()
            )
            fcm_token = (token_resp.data or {}).get("fcm_token")

            if fcm_token:
                await send_push_notification(
                    fcm_token=fcm_token,
                    title="BMV 🚗",
                    body="Tu peux reconduire ! Ton taux est repassé sous 0.5 g/L",
                )

            # Marque comme notifié même si l'envoi a échoué (évite le spam)
            supabase.table("sessions") \
                .update({"notified_sober": True}) \
                .eq("id", session_id) \
                .execute()
    except Exception:
        # La logique de notification ne doit jamais bloquer la réponse BAC
        pass

    return BACData(
        current_bac=current_bac,
        time_to_sober=time_to_sober,
        is_legal=is_legal,
        curve=curve,
    )
