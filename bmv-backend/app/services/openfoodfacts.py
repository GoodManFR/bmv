# Service Open Food Facts — recherche de produits par code EAN
import asyncio
import logging
import httpx

logger = logging.getLogger(__name__)

OFF_API_URL = "https://world.openfoodfacts.org/api/v2/product"
HEADERS = {"User-Agent": "BMV App/1.0"}
TIMEOUT = 10.0  # secondes

# Mots-clés dans categories_tags pour identifier le type de boisson
_BEER_KEYS = {"beers", "bières", "ales", "lagers", "stouts", "craft-beers"}
_WINE_KEYS = {"wines", "vins", "red-wines", "white-wines", "rose-wines"}
_SPIRIT_KEYS = {"spirits", "spiritueux", "whiskies", "vodkas", "rums", "gins",
                "brandies", "liqueurs", "tequilas"}


def _detect_category(categories_tags: list[str]) -> str:
    """Déduit la catégorie de boisson à partir des tags Open Food Facts."""
    lowered = {tag.split(":")[-1].lower() for tag in categories_tags}
    if lowered & _BEER_KEYS:
        return "beer"
    if lowered & _WINE_KEYS:
        return "wine"
    if lowered & _SPIRIT_KEYS:
        return "spirit"
    return "other"


async def _fetch_off(client: httpx.AsyncClient, url: str) -> httpx.Response | None:
    """
    Effectue un appel GET vers OFF.
    Gère le rate-limit 429 avec un retry unique après 2 secondes.
    Retourne None si l'erreur persiste ou si une erreur serveur survient.
    """
    response = await client.get(url)

    if response.status_code == 429:
        logger.warning("Open Food Facts : rate-limit (429), retry dans 2s…")
        await asyncio.sleep(2)
        response = await client.get(url)
        if response.status_code == 429:
            logger.warning("Open Food Facts : rate-limit persistant après retry → abandon")
            return None

    if response.status_code >= 500:
        logger.warning("Open Food Facts : erreur serveur %s", response.status_code)
        return None

    return response


async def search_by_ean(ean_code: str) -> dict | None:
    """
    Interroge l'API Open Food Facts pour récupérer les infos d'un produit.

    Retourne un dict { name, brand, abv, image_url, category }
    ou None si le produit est introuvable, sans degré d'alcool, ou en cas d'erreur OFF.
    """
    url = f"{OFF_API_URL}/{ean_code}.json"

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT) as client:
            response = await _fetch_off(client, url)
    except httpx.TimeoutException:
        logger.warning("Open Food Facts : timeout pour EAN %s", ean_code)
        return None
    except httpx.RequestError as exc:
        logger.warning("Open Food Facts : erreur réseau pour EAN %s : %s", ean_code, exc)
        return None

    # _fetch_off retourne None en cas de 429 persistant ou 5xx
    if response is None:
        return None

    if response.status_code == 404:
        return None

    if response.status_code != 200:
        logger.warning("Open Food Facts : statut inattendu %s pour EAN %s", response.status_code, ean_code)
        return None

    data = response.json()

    # L'API retourne status=0 quand le produit n'est pas trouvé
    if data.get("status") == 0:
        return None

    product = data.get("product", {})

    # Récupération du degré d'alcool (exprimé en % dans OFFs)
    nutriments = product.get("nutriments", {})
    abv_raw = nutriments.get("alcohol_100g") or nutriments.get("alcohol")
    if abv_raw is None:
        return None  # pas d'info ABV → inutilisable pour le calcul BAC

    try:
        abv = float(abv_raw)
    except (ValueError, TypeError):
        return None

    if abv <= 0:
        return None

    # Nom du produit (français en priorité)
    name = (
        product.get("product_name_fr")
        or product.get("product_name")
        or "Boisson inconnue"
    )

    brand = product.get("brands", "").split(",")[0].strip() or None
    image_url = product.get("image_front_small_url") or product.get("image_url") or None

    categories_tags: list[str] = product.get("categories_tags", [])
    category = _detect_category(categories_tags)

    return {
        "name": name,
        "brand": brand,
        "abv": abv,
        "image_url": image_url,
        "category": category,
    }
