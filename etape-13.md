# Étape 13 — Cache EAN Supabase + gestion erreurs Open Food Facts

## Contexte
Le scanner fonctionne correctement, mais chaque scan fait un appel à l'API Open Food Facts (OFF), même pour des produits déjà scannés. De plus, quand OFF rate-limit (HTTP 429), le frontend reçoit une erreur 502 technique non gérée.

## Objectif
1. Créer une table `products` dans Supabase pour cacher les résultats OFF
2. Modifier le backend pour chercher d'abord dans le cache, puis OFF en fallback
3. Gérer proprement les erreurs OFF (429, timeout, etc.)
4. Afficher un message utilisateur clair côté frontend en cas d'erreur

---

## 1. Nouvelle table Supabase : `products`

Crée un fichier `supabase/migration_003_products_cache.sql` :

```sql
-- Table cache des produits scannés via Open Food Facts
CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ean_code text UNIQUE NOT NULL,
    name text NOT NULL,
    brand text,
    abv float,
    category text DEFAULT 'other',
    image_url text,
    source text DEFAULT 'openfoodfacts',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index sur le code EAN pour lookup rapide
CREATE INDEX IF NOT EXISTS idx_products_ean ON products(ean_code);

-- RLS : lecture publique (tous les users peuvent lire les produits), pas de write direct
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tous les utilisateurs peuvent lire les produits"
    ON products FOR SELECT
    USING (true);

CREATE POLICY "Seul le service role peut insérer/modifier"
    ON products FOR ALL
    USING (true)
    WITH CHECK (true);
```

**Exécute ce SQL dans le Supabase Dashboard** (SQL Editor) ou donne les instructions à l'utilisateur.

IMPORTANT : Ne tente PAS d'exécuter ce SQL via une connexion réseau — tu n'as pas accès à Supabase depuis ce terminal. Génère le fichier SQL et indique dans ton récap que l'utilisateur doit l'exécuter manuellement dans le Supabase SQL Editor.

---

## 2. Modifier `bmv-backend/app/services/openfoodfacts.py`

Ajouter la gestion d'erreurs propre. Remplacer le raise RuntimeError par des retours structurés :

```python
# En cas de rate-limit (429) ou erreur serveur (5xx)
# → retourner None au lieu de crasher
# Le router gèrera le message utilisateur

# Ajouter un retry simple : si 429, attendre 2 secondes et réessayer UNE fois
# Si toujours 429 après retry → retourner None
```

Modifications concrètes dans `openfoodfacts.py` :
- Remplacer le `raise RuntimeError(...)` pour les status != 200 et != 404
- Pour 429 : log un warning, attendre 2s, retry une fois, puis retourner None
- Pour 5xx : log un warning, retourner None
- Ajouter un timeout de 10 secondes sur le httpx.get (si pas déjà présent)
- Entourer tout le bloc httpx d'un try/except pour gérer les timeouts et erreurs réseau

---

## 3. Modifier `bmv-backend/app/routers/drinks.py`

### Nouveau flux pour GET `/drinks/search?ean=XXX` :

```
1. Chercher dans la table `products` WHERE ean_code = ean
2. Si trouvé en cache → retourner directement (pas d'appel OFF)
3. Si pas en cache → appeler openfoodfacts.search_by_ean(ean)
4. Si OFF retourne un résultat → l'insérer dans `products` (cache) puis retourner
5. Si OFF retourne None → retourner { found: false } (pas de cache pour les miss)
```

Points importants :
- L'insertion dans `products` se fait via le client Supabase backend (service role)
- Ne pas cacher les résultats négatifs (pour permettre un re-scan si OFF met à jour sa base)
- Utiliser `upsert` (ON CONFLICT ean_code DO UPDATE) pour éviter les doublons si deux users scannent le même produit en même temps

### Nouveau endpoint optionnel : GET `/drinks/search?ean=XXX&force_refresh=true`
- Si `force_refresh=true` → ignorer le cache et appeler OFF directement, puis mettre à jour le cache
- Utile pour corriger un produit mal indexé

---

## 4. Modifier `bmv-frontend/src/pages/Scanner.tsx`

### Gestion d'erreur améliorée :

Dans le flux `fetchProduct()`, quand le backend retourne une erreur (status 500, 502, etc.) :
- Ne PAS afficher le message technique brut
- Afficher un message utilisateur friendly : "😵 Open Food Facts ne répond pas. Essaie la saisie manuelle !"
- Proposer un bouton "Saisie manuelle" directement dans le message d'erreur
- Passer à l'état `not_found` avec le message d'erreur pré-rempli

### Dans le cas `found: false` (produit non trouvé) :
- Le comportement actuel est OK (formulaire manuel)
- Ajouter un petit texte : "Produit non trouvé dans la base. Tu peux le saisir manuellement."

---

## 5. Tests

Après les modifications :

1. Teste `curl -s "https://bmv-backend.onrender.com/drinks/search?ean=3119780259625"` → doit retourner la Heineken avec `found: true`
2. Re-teste le même curl → doit retourner le même résultat (cette fois depuis le cache, plus rapide)
3. Teste un EAN inventé → `found: false`, pas de crash
4. Vérifie dans Supabase (table `products`) que la Heineken a bien été insérée

---

## Récap attendu

Donne-moi :
- Liste des fichiers créés/modifiés avec résumé du changement
- Le SQL à exécuter manuellement dans Supabase (rappel pour l'utilisateur)
- Résultats des tests curl
- Commandes git pour commit + push
