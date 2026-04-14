# Router boissons — recherche et log des boissons
# Sécurisé par JWT : chaque utilisateur ne voit et n'enregistre que ses propres boissons

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_authenticated_user_id
from app.models.schemas import DrinkCreate, ProductInfo, SearchResult
from app.services.openfoodfacts import search_by_ean
from app.services.supabase import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/drinks", tags=["boissons"])


@router.get(
    "/search",
    response_model=SearchResult,
    summary="Rechercher une boisson par code EAN via cache Supabase + Open Food Facts",
)
async def search_drink(
    ean: str = Query(..., description="Code EAN du produit à rechercher"),
    force_refresh: bool = Query(False, description="Ignorer le cache et forcer un appel OFF"),
):
    """
    Recherche une boisson par code EAN.

    Flux :
    1. Cherche dans la table `products` (cache Supabase)
    2. Si trouvé en cache et `force_refresh=false` → retourne directement
    3. Sinon → appelle Open Food Facts
    4. Si OFF répond → insère/met à jour le cache puis retourne
    5. Si OFF retourne None → retourne { found: false }

    - **found: true** → `product` contient les infos (nom, marque, ABV, image, catégorie)
    - **found: false** → boisson introuvable ou sans degré d'alcool renseigné
    """
    # 1. Lookup dans le cache Supabase (sauf si force_refresh demandé)
    if not force_refresh:
        cache_response = (
            supabase.table("products")
            .select("*")
            .eq("ean_code", ean)
            .limit(1)
            .execute()
        )
        if cache_response.data:
            cached = cache_response.data[0]
            logger.info("Cache hit pour EAN %s", ean)
            return SearchResult(
                found=True,
                product=ProductInfo(
                    name=cached["name"],
                    brand=cached.get("brand"),
                    abv=cached["abv"],
                    image_url=cached.get("image_url"),
                    category=cached.get("category", "other"),
                ),
            )

    # 2. Appel Open Food Facts
    product_data = await search_by_ean(ean)

    # OFF indisponible (timeout, rate-limit, erreur réseau) → None sans données produit
    if product_data is None:
        return SearchResult(found=False, product=None)

    # 3. Insérer/mettre à jour le cache (upsert sur ean_code pour éviter les doublons)
    try:
        supabase.table("products").upsert(
            {
                "ean_code": ean,
                "name": product_data["name"],
                "brand": product_data.get("brand"),
                "abv": product_data["abv"],
                "image_url": product_data.get("image_url"),
                "category": product_data.get("category", "other"),
                "source": "openfoodfacts",
            },
            on_conflict="ean_code",
        ).execute()
        logger.info("Produit EAN %s mis en cache", ean)
    except Exception as exc:
        # Le cache est best-effort : une erreur d'insertion ne bloque pas la réponse
        logger.warning("Impossible de mettre en cache l'EAN %s : %s", ean, exc)

    return SearchResult(found=True, product=ProductInfo(**product_data))


@router.get("/", summary="Lister les boissons d'une soirée")
async def get_drinks(
    session_id: str = Query(..., description="ID de la soirée"),
    authenticated_id: str = Depends(get_authenticated_user_id),
):
    """
    Retourne la liste des boissons d'une soirée, triées par heure de consommation.
    Vérifie que la soirée appartient à l'utilisateur connecté.
    """
    # Vérifier ownership de la session
    session_check = (
        supabase.table("sessions")
        .select("user_id")
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not session_check.data:
        raise HTTPException(status_code=404, detail="Soirée introuvable")
    if session_check.data["user_id"] != authenticated_id:
        raise HTTPException(status_code=403, detail="Accès refusé")

    response = (
        supabase.table("drinks")
        .select("*")
        .eq("session_id", session_id)
        .order("timestamp", desc=False)
        .execute()
    )

    return {"drinks": response.data or []}


@router.post("/", summary="Logger une nouvelle boisson")
async def create_drink(
    payload: DrinkCreate,
    authenticated_id: str = Depends(get_authenticated_user_id),
):
    """
    Enregistre une boisson dans la session en cours.
    Crée automatiquement une nouvelle soirée si aucune n'est active.
    Le user_id est extrait du JWT — jamais du body.
    """
    # 1. Chercher une soirée active (ended_at IS NULL)
    session_response = (
        supabase.table("sessions")
        .select("id, ended_at")
        .eq("user_id", authenticated_id)
        .is_("ended_at", "null")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    )

    if session_response.data:
        # Vérification défensive : la session trouvée ne doit pas être terminée
        if session_response.data[0].get("ended_at") is not None:
            raise HTTPException(status_code=400, detail="Cette soirée est déjà terminée")
        session_id = session_response.data[0]["id"]
    else:
        # 2. Aucune soirée active → en créer une automatiquement
        new_session = (
            supabase.table("sessions")
            .insert({"user_id": authenticated_id})
            .execute()
        )
        if not new_session.data:
            raise HTTPException(status_code=500, detail="Impossible de créer la soirée")
        session_id = new_session.data[0]["id"]

    # 3. Insérer la boisson (timestamp généré côté serveur par Supabase)
    drink_data = {
        "user_id": authenticated_id,
        "session_id": session_id,
        "name": payload.name,
        "abv": payload.abv,
        "volume_ml": payload.volume_ml,
        "source": payload.source,
    }
    if payload.ean_code is not None:
        drink_data["ean_code"] = payload.ean_code

    drink_response = (
        supabase.table("drinks")
        .insert(drink_data)
        .execute()
    )

    if not drink_response.data:
        raise HTTPException(status_code=500, detail="Impossible d'enregistrer la boisson")

    return {"drink": drink_response.data[0], "session_id": session_id}
