# Service Open Food Facts — recherche de produits par code EAN
import httpx

OFF_API_URL = "https://world.openfoodfacts.org/api/v2/product"
HEADERS = {"User-Agent": "BMV App/1.0"}
TIMEOUT = 8.0  # secondes

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


async def search_by_ean(ean_code: str) -> dict | None:
    """
    Interroge l'API Open Food Facts pour récupérer les infos d'un produit.

    Retourne un dict { name, brand, abv, image_url, category }
    ou None si le produit est introuvable ou ne possède pas de degré d'alcool.
    """
    url = f"{OFF_API_URL}/{ean_code}.json"

    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT) as client:
            response = await client.get(url)
    except httpx.TimeoutException:
        raise RuntimeError("L'API Open Food Facts ne répond pas (timeout)")
    except httpx.RequestError as exc:
        raise RuntimeError(f"Erreur réseau Open Food Facts : {exc}")

    if response.status_code == 404:
        return None

    if response.status_code != 200:
        raise RuntimeError(
            f"Open Food Facts a retourné un statut inattendu : {response.status_code}"
        )

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
