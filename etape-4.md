# Étape 4 — Scanner de code-barres + Open Food Facts

Lis MASTER.md pour le contexte global.

## Ta mission
Implémenter le scan de code-barres EAN via la caméra du téléphone et la recherche de boissons via l'API Open Food Facts. Si la boisson n'est pas trouvée, proposer un formulaire de saisie manuelle.

## Concrètement

### 1. Page Scanner (`src/pages/Scanner.tsx`)
- Un bouton "Scanner un code-barres" qui ouvre la caméra via `html5-qrcode`
- La caméra utilise la caméra arrière du téléphone par défaut
- Quand un code EAN est détecté :
  - Fermer le scanner
  - Afficher un état de chargement
  - Appeler le backend pour chercher la boisson

### 2. Backend — Service Open Food Facts (`app/services/openfoodfacts.py`)
- Fonction `search_by_ean(ean_code: str)` qui appelle `https://world.openfoodfacts.org/api/v2/product/{ean}.json`
- Extraire et retourner : nom du produit, marque/brasserie, ABV (chercher dans `nutriments` ou `alcohol` ou le champ pertinent), image URL, catégorie
- Si le produit n'est pas trouvé ou n'a pas d'ABV → retourner None
- Gérer les erreurs réseau proprement (timeout, API down)

### 3. Backend — Endpoint recherche (`app/routers/drinks.py`)
- `GET /drinks/search?ean={code}` → appelle le service Open Food Facts et retourne les infos de la boisson
- Format de réponse : `{ found: boolean, product: { name, brand, abv, image_url, category } | null }`

### 4. Résultat du scan dans le frontend
Après le scan, afficher un écran de résultat avec 2 cas :

**Cas A — Boisson trouvée :**
- Afficher : image (si dispo), nom, marque, ABV
- Boutons de volume rapide adaptés au type (détecté via la catégorie) :
  - Si bière : 25cl, 33cl, 50cl, Pinte
  - Si vin : 12cl, 15cl
  - Si spiritueux : 3cl, 6cl
  - Par défaut (catégorie inconnue) : 25cl, 33cl, 50cl + champ personnalisé
- Bouton "Ajouter" qui logge la boisson (on implémentera le vrai logging à l'étape 5, pour l'instant juste un console.log + message de succès)
- Bouton "Ce n'est pas ça" → bascule vers le formulaire manuel

**Cas B — Boisson non trouvée :**
- Message "Boisson non trouvée dans la base"
- Afficher directement le formulaire de saisie manuelle

### 5. Formulaire de saisie manuelle
- Champs : Nom de la boisson, Degré d'alcool (ABV en %), Volume (ml)
- Boutons rapides de volume (les mêmes que ci-dessus)
- Bouton "Ajouter" (même comportement que cas A)

### 6. Input texte pour recherche manuelle
- En plus du scan, ajouter un champ de recherche textuelle en haut de la page Scanner
- Permet de taper un nom de boisson ou un code EAN manuellement
- Si c'est un nombre (EAN) → appeler le même endpoint de recherche
- Si c'est du texte → pour le MVP, ouvrir directement le formulaire manuel pré-rempli avec le nom

## Contraintes
- Le scanner doit bien fonctionner sur mobile (caméra arrière)
- Gérer le cas où l'utilisateur refuse l'accès à la caméra (message d'erreur clair)
- Gérer le cas où html5-qrcode ne supporte pas le navigateur
- L'API Open Food Facts est gratuite et sans clé, mais ajouter un User-Agent header : "BMV App/1.0"
- Le vrai enregistrement en base se fera à l'étape 5, ici on prépare juste l'interface
- Tout le texte en français
