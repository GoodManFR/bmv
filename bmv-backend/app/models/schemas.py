# Schémas Pydantic — miroir des types TypeScript définis dans le MASTER.md
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ── Profil utilisateur ──────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id: str
    google_id: str
    display_name: str
    weight_kg: float = Field(..., gt=0, description="Poids en kg")
    height_cm: float = Field(..., gt=0, description="Taille en cm")
    age: int = Field(..., gt=0, lt=130, description="Âge en années")
    sex: Literal["male", "female"]
    created_at: datetime


class UserProfileCreate(BaseModel):
    """Payload pour créer ou mettre à jour un profil."""
    display_name: str
    weight_kg: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    age: int = Field(..., gt=0, lt=130)
    sex: Literal["male", "female"]


class UserProfileUpdate(BaseModel):
    """Payload pour la mise à jour partielle du profil (tous les champs sont optionnels)."""
    display_name: Optional[str] = None
    weight_kg: Optional[float] = Field(None, gt=30, le=300, description="Poids en kg (30–300)")
    height_cm: Optional[float] = Field(None, gt=100, le=250, description="Taille en cm (100–250)")
    age: Optional[int] = Field(None, ge=16, le=120, description="Âge (16–120)")
    sex: Optional[Literal["male", "female"]] = None


# ── Boisson ─────────────────────────────────────────────────────────────────

class Drink(BaseModel):
    id: str
    user_id: str
    session_id: str
    name: str
    abv: float = Field(..., ge=0, le=100, description="Degré d'alcool en %")
    volume_ml: int = Field(..., gt=0, description="Volume en ml")
    source: Literal["scan", "manual"]
    ean_code: Optional[str] = None
    timestamp: datetime


class DrinkCreate(BaseModel):
    """Payload pour logger une boisson."""
    name: str
    abv: float = Field(..., ge=0, le=100)
    volume_ml: int = Field(..., gt=0)
    source: Literal["scan", "manual"]
    ean_code: Optional[str] = None


# ── Soirée ───────────────────────────────────────────────────────────────────

class Session(BaseModel):
    id: str
    user_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    max_bac: Optional[float] = None  # BAC max atteint, calculé à la clôture
    drinks: list[Drink] = []


class SessionEnd(BaseModel):
    """Payload pour terminer une soirée."""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


# ── Recherche Open Food Facts ─────────────────────────────────────────────────

class ProductInfo(BaseModel):
    """Informations d'un produit renvoyées par Open Food Facts."""
    name: str
    brand: Optional[str] = None
    abv: float = Field(..., ge=0, le=100, description="Degré d'alcool en %")
    image_url: Optional[str] = None
    category: Literal["beer", "wine", "spirit", "other"] = "other"


class SearchResult(BaseModel):
    """Réponse de l'endpoint GET /drinks/search."""
    found: bool
    product: Optional[ProductInfo] = None


# ── Données BAC ──────────────────────────────────────────────────────────────

class BACPoint(BaseModel):
    """Un point de la courbe BAC."""
    time: datetime
    bac: float = Field(..., ge=0)


class BACData(BaseModel):
    current_bac: float = Field(..., ge=0, description="Taux d'alcoolémie actuel en g/L")
    time_to_sober: float = Field(..., ge=0, description="Minutes avant de passer sous 0.5 g/L")
    is_legal: bool = Field(..., description="True si BAC < 0.5 g/L (seuil légal français)")
    curve: list[BACPoint] = Field(..., description="Points de la courbe pour Recharts")
