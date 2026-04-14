# Service de notifications push — API HTTP v1 de Firebase Cloud Messaging
# N'utilise PAS le SDK Firebase Admin (trop lourd).
# Utilise python-jose (déjà installé) pour signer le JWT + httpx pour les appels HTTP.

import json
import time

import httpx
from jose import jwt

from app.config import settings

# ── Constantes FCM ────────────────────────────────────────────────────────────
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_FCM_SEND_URL = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
_FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"


# ── Helpers internes ──────────────────────────────────────────────────────────

def _get_service_account() -> dict:
    """
    Charge les credentials Firebase depuis la variable d'env FIREBASE_SERVICE_ACCOUNT_JSON.
    La variable doit contenir le JSON complet du service account Firebase.
    """
    raw = settings.firebase_service_account_json
    if not raw:
        raise ValueError(
            "FIREBASE_SERVICE_ACCOUNT_JSON non configuré dans les variables d'environnement"
        )
    return json.loads(raw)


async def _get_access_token(service_account: dict) -> str:
    """
    Échange un JWT signé avec la clé privée du service account
    contre un access token OAuth2 Google.

    Flux : JWT Bearer Grant (RFC 7523)
    """
    now = int(time.time())
    client_email = service_account["client_email"]
    private_key = service_account["private_key"]

    # Payload JWT à signer avec la clé privée RSA
    assertion_payload = {
        "iss": client_email,
        "sub": client_email,
        "aud": _GOOGLE_TOKEN_URL,
        "scope": _FCM_SCOPE,
        "iat": now,
        "exp": now + 3600,
    }

    # Signature RS256 avec python-jose
    signed_jwt = jwt.encode(assertion_payload, private_key, algorithm="RS256")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": signed_jwt,
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


# ── Fonction publique ─────────────────────────────────────────────────────────

async def send_push_notification(fcm_token: str, title: str, body: str) -> bool:
    """
    Envoie une notification push via l'API FCM HTTP v1.

    Args:
        fcm_token: Token FCM de l'appareil cible (stocké dans profiles.fcm_token)
        title:     Titre de la notification
        body:      Corps de la notification

    Returns:
        True si la notification a été envoyée, False en cas d'erreur
        (token expiré, invalide, FCM non configuré, etc.)
    """
    try:
        service_account = _get_service_account()
        access_token = await _get_access_token(service_account)
        project_id = service_account["project_id"]

        url = _FCM_SEND_URL.format(project_id=project_id)
        payload = {
            "message": {
                "token": fcm_token,
                "notification": {
                    "title": title,
                    "body": body,
                },
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )

            # 404 = token FCM invalide ou révoqué → pas une erreur critique
            if resp.status_code == 404:
                return False

            resp.raise_for_status()
            return True

    except ValueError:
        # Firebase non configuré (pas de service account) — silencieux en dev
        return False
    except Exception as e:
        # Erreur réseau, token invalide, etc.
        print(f"[notifications] Erreur envoi notification FCM : {e}")
        return False
