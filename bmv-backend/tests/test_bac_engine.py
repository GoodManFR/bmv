# Tests unitaires du moteur BAC (formule de Widmark)
# Aucun accès base de données — moteur pur.

import pytest
from datetime import datetime, timezone, timedelta
from app.services.bac_engine import BACCalculator, BETA, LEGAL_LIMIT

calc = BACCalculator()

# ── Profil de référence ──────────────────────────────────────────────────────
PROFILE_HOMME_80KG = {"weight_kg": 80.0, "sex": "male"}

# Timestamp de référence (soirée fictive)
T0 = datetime(2024, 1, 1, 20, 0, 0, tzinfo=timezone.utc)


def biere_33cl_5pct(timestamp: datetime) -> dict:
    """Bière standard 33cl à 5% d'alcool."""
    return {"name": "Bière test", "volume_ml": 330, "abv": 5.0, "timestamp": timestamp}


# ── Test 1 : BAC initial d'une bière 33cl 5% pour un homme de 80kg ───────────

def test_bac_une_biere_instant_t0():
    """
    Homme 80kg, une bière 33cl à 5%, calculé au moment de la consommation.
    grams = 330 × 0.05 × 0.789 = 13.0185
    contribution = 13.0185 / (0.68 × 80) = 0.2394...
    À t=0 : bac = 0.24 g/L (arrondi à 2 décimales).
    """
    drinks = [biere_33cl_5pct(T0)]
    bac = calc.calculate_bac(PROFILE_HOMME_80KG, drinks, at_time=T0)
    # Valeur exacte ≈ 0.2394 → 0.24 après arrondi
    assert bac == pytest.approx(0.24, abs=0.01)


# ── Test 2 : BAC après 1h (diminution de β = 0.15 g/L/h) ────────────────────

def test_bac_apres_1h():
    """
    Après 1 heure, le BAC doit avoir diminué d'environ 0.15 g/L.
    BAC(1h) ≈ 0.24 - 0.15 = 0.09 g/L.
    """
    drinks = [biere_33cl_5pct(T0)]
    bac_t0 = calc.calculate_bac(PROFILE_HOMME_80KG, drinks, at_time=T0)
    bac_t1h = calc.calculate_bac(PROFILE_HOMME_80KG, drinks, at_time=T0 + timedelta(hours=1))
    difference = round(bac_t0 - bac_t1h, 2)
    assert difference == pytest.approx(BETA, abs=0.01)
    assert bac_t1h == pytest.approx(0.09, abs=0.01)


# ── Test 3 : BAC retombe à 0 après suffisamment de temps ────────────────────

def test_bac_zero_apres_temps_suffisant():
    """
    Contribution initiale ≈ 0.24 g/L.
    Après 3h : 0.24 - (0.15 × 3) = 0.24 - 0.45 = -0.21 → clamped à 0.
    """
    drinks = [biere_33cl_5pct(T0)]
    bac = calc.calculate_bac(PROFILE_HOMME_80KG, drinks, at_time=T0 + timedelta(hours=3))
    assert bac == 0.0


# ── Test 4 : Deux bières espacées de 30min — cumul correct ──────────────────

def test_bac_cumul_deux_bieres():
    """
    Deux bières à 30min d'intervalle : le BAC total doit être
    supérieur au BAC d'une seule bière à l'instant de la 2ème consommation.
    """
    t_biere2 = T0 + timedelta(minutes=30)
    drinks_deux = [biere_33cl_5pct(T0), biere_33cl_5pct(t_biere2)]
    drinks_une = [biere_33cl_5pct(T0)]

    bac_deux = calc.calculate_bac(PROFILE_HOMME_80KG, drinks_deux, at_time=t_biere2)
    bac_une = calc.calculate_bac(PROFILE_HOMME_80KG, drinks_une, at_time=t_biere2)

    assert bac_deux > bac_une
    # La 2ème bière s'ajoute → le total doit dépasser 0.3 g/L
    assert bac_deux > 0.3


# ── Test 5 : get_time_to_sober ───────────────────────────────────────────────

def test_time_to_sober_deja_legal():
    """BAC ≤ 0.5 g/L → 0 minute d'attente."""
    assert calc.get_time_to_sober(0.0) == 0.0
    assert calc.get_time_to_sober(0.3) == 0.0
    assert calc.get_time_to_sober(0.5) == 0.0


def test_time_to_sober_non_legal():
    """
    BAC = 0.8 g/L → (0.8 - 0.5) / 0.15 × 60 = 120 minutes.
    """
    minutes = calc.get_time_to_sober(0.8)
    # Résultat théorique : (0.8 - 0.5) / 0.15 × 60 = 120 min.
    # Tolérance ±1 min pour absorber les imprécisions float (ceil peut donner 120 ou 121).
    assert minutes == pytest.approx(120.0, abs=1.0)
    # BAC > 0.5 → toujours > 0 minute
    assert calc.get_time_to_sober(0.6) > 0


# ── Test 6 : generate_curve — liste de points décroissante ──────────────────

def test_generate_curve_decroissante():
    """
    La courbe doit :
    - Avoir au moins un point
    - Le BAC au pic (vers t=0) être supérieur au BAC en fin de courbe
    - Ne pas contenir de valeurs négatives
    """
    drinks = [biere_33cl_5pct(T0)]
    curve = calc.generate_curve(PROFILE_HOMME_80KG, drinks)

    assert len(curve) > 0

    bac_values = [p["bac"] for p in curve]

    # Tous les points BAC sont non négatifs
    assert all(b >= 0 for b in bac_values)

    # Le dernier point doit être inférieur ou égal au premier (tendance décroissante)
    assert bac_values[-1] <= bac_values[0]

    # La courbe se termine à 0 (s'arrête après 30 min à 0)
    assert bac_values[-1] == 0.0
