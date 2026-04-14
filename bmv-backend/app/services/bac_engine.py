# Moteur BAC — formule de Widmark
# Calcul pur, sans accès base de données.

import math
from datetime import datetime, timezone, timedelta

# Constantes Widmark
WIDMARK_R_MALE = 0.68    # constante métabolique homme
WIDMARK_R_FEMALE = 0.55  # constante métabolique femme
BETA = 0.15              # taux d'élimination en g/L/h
LEGAL_LIMIT = 0.5        # seuil légal français en g/L
ALCOHOL_DENSITY = 0.789  # densité de l'alcool en g/mL


class BACCalculator:
    """Calcule le taux d'alcoolémie (BAC) selon la formule de Widmark."""

    def _parse_timestamp(self, ts) -> datetime:
        """Convertit un timestamp (str ISO ou datetime) en datetime UTC aware."""
        if isinstance(ts, str):
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        else:
            dt = ts
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    def calculate_bac(
        self,
        profile: dict,
        drinks: list[dict],
        at_time: datetime | None = None,
    ) -> float:
        """
        Calcule le BAC total à un instant donné.

        Formule : BAC(t) = Σ max(0, (A / (r × W)) - β × t)
        - A = volume_ml × (abv/100) × 0.789  [alcool pur en grammes]
        - r = 0.68 (homme) ou 0.55 (femme)
        - W = poids en kg
        - β = 0.15 g/L/h
        - t = heures écoulées depuis la consommation

        profile : dict avec 'weight_kg' et 'sex'
        drinks  : liste de dicts avec 'abv', 'volume_ml', 'timestamp'
        at_time : datetime UTC (défaut = maintenant)
        """
        if at_time is None:
            at_time = datetime.now(timezone.utc)
        elif at_time.tzinfo is None:
            at_time = at_time.replace(tzinfo=timezone.utc)

        weight_kg: float = profile["weight_kg"]
        r = WIDMARK_R_MALE if profile["sex"] == "male" else WIDMARK_R_FEMALE

        total_bac = 0.0
        for drink in drinks:
            drink_time = self._parse_timestamp(drink["timestamp"])
            elapsed_hours = (at_time - drink_time).total_seconds() / 3600
            if elapsed_hours < 0:
                # Boisson dans le futur → ignorée
                continue
            grams_alcohol = drink["volume_ml"] * (drink["abv"] / 100) * ALCOHOL_DENSITY
            contribution = grams_alcohol / (r * weight_kg)
            bac_drink = max(0.0, contribution - BETA * elapsed_hours)
            total_bac += bac_drink

        return round(total_bac, 2)

    def get_time_to_sober(self, current_bac: float) -> float:
        """
        Retourne les minutes restantes avant de repasser sous le seuil légal (0.5 g/L).
        Retourne 0.0 si le BAC est déjà légal.
        """
        if current_bac <= LEGAL_LIMIT:
            return 0.0
        minutes = ((current_bac - LEGAL_LIMIT) / BETA) * 60
        return float(math.ceil(minutes))

    def generate_curve(
        self,
        profile: dict,
        drinks: list[dict],
        duration_hours: int = 12,
    ) -> list[dict]:
        """
        Génère les points de la courbe BAC de la soirée.

        Un point toutes les 10 minutes depuis le premier drink.
        Stoppe quand le BAC est à 0 depuis ≥ 30 minutes (3 points consécutifs à 0).
        Retourne une liste de { "time": str ISO, "bac": float }.
        """
        if not drinks:
            return []

        # Point de départ = timestamp du premier drink
        start_time = min(self._parse_timestamp(d["timestamp"]) for d in drinks)

        points = []
        zero_count = 0  # points consécutifs avec BAC = 0

        total_minutes = duration_hours * 60
        for offset in range(0, total_minutes + 1, 10):
            current_time = start_time + timedelta(minutes=offset)
            bac = self.calculate_bac(profile, drinks, at_time=current_time)
            points.append({"time": current_time.isoformat(), "bac": bac})

            if bac == 0.0:
                zero_count += 1
                if zero_count >= 3:  # 30 minutes à 0 → inutile de continuer
                    break
            else:
                zero_count = 0

        return points
