# Étape 6 — Moteur BAC (formule de Widmark)

Lis MASTER.md pour le contexte global.

## Ta mission
Implémenter le moteur de calcul du taux d'alcoolémie (BAC) en Python côté backend, avec un endpoint API qui retourne le BAC actuel, la courbe projetée, et le temps restant avant de pouvoir conduire.

## Concrètement

### 1. Moteur BAC (`app/services/bac_engine.py`)
Implémente une classe `BACCalculator` avec :

**Constantes :**
- Densité de l'alcool : 0.789 g/ml
- Taux d'élimination moyen (β) : 0.15 g/L par heure
- Constante de Widmark (r) : 0.68 pour homme, 0.55 pour femme
- Seuil légal France : 0.5 g/L

**Méthode `calculate_bac(profile, drinks, at_time=None)` :**
- `profile` : poids, sexe
- `drinks` : liste des boissons (abv, volume_ml, timestamp)
- `at_time` : datetime pour le calcul (défaut = maintenant)
- Pour chaque boisson :
  - Grammes d'alcool pur = volume_ml × (abv/100) × 0.789
  - Contribution BAC = grammes / (r × poids_kg)
  - Temps écoulé depuis consommation en heures
  - BAC restant de cette boisson = max(0, contribution - β × temps_écoulé)
- BAC total = somme de tous les BAC restants de chaque boisson
- Retourne le BAC total (minimum 0)

**Méthode `get_time_to_sober(current_bac)` :**
- Si BAC ≤ 0.5 → retourne 0
- Sinon : (current_bac - 0.5) / β × 60 = minutes restantes
- Retourne le nombre de minutes (arrondi au supérieur)

**Méthode `generate_curve(profile, drinks, duration_hours=12)` :**
- Génère des points de la courbe BAC du début de la soirée jusqu'à duration_hours après
- Un point toutes les 10 minutes
- Chaque point : { time: ISO string, bac: float }
- S'arrête quand BAC = 0 depuis au moins 30 minutes (inutile de continuer)
- Retourne la liste des points

### 2. Endpoint BAC (`app/routers/bac.py`)
- `GET /bac/current?user_id={id}` :
  - Récupère le profil de l'utilisateur
  - Récupère la soirée en cours et ses boissons
  - Appelle BACCalculator pour obtenir : BAC actuel, temps restant, courbe, statut légal
  - Retourne un objet `BACData` (défini dans schemas.py)
  - Si pas de soirée en cours, retourne BAC = 0, is_legal = true, courbe vide
- Le user_id est extrait du JWT (utiliser `get_authenticated_user_id`)

### 3. Tests unitaires (`bmv-backend/tests/test_bac_engine.py`)
Crée des tests pour valider le moteur :
- Test 1 : Un homme de 80kg boit une bière 33cl à 5% → vérifier que le BAC initial est d'environ 0.19 g/L
- Test 2 : Après 1h, le BAC a diminué de 0.15 g/L
- Test 3 : Après suffisamment de temps, le BAC retombe à 0
- Test 4 : Deux bières consommées à 30min d'intervalle → le BAC se cumule correctement
- Test 5 : get_time_to_sober retourne 0 si BAC ≤ 0.5
- Test 6 : generate_curve retourne une liste de points décroissante
- Utiliser pytest

## Contraintes
- Le calcul est fait côté serveur uniquement (pas de calcul côté client)
- Tous les timestamps sont en UTC
- Le moteur doit être pur (pas d'accès BDD) : il reçoit des données et retourne un résultat. Seul le router accède à Supabase.
- Arrondir le BAC à 2 décimales
- Ajouter `pytest` au requirements.txt
