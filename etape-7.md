# Étape 7 — Dashboard BAC + Graphique temps réel

Lis MASTER.md pour le contexte global.

## Ta mission
Transformer la page Home en dashboard principal avec un graphique de la courbe BAC en temps réel, les indicateurs clés, et un rafraîchissement automatique toutes les 10 minutes.

## Concrètement

### 1. Service API (`src/services/api.ts`)
- Ajouter `getCurrentBAC()` → appelle `GET /bac/current` et retourne un objet `BACData`

### 2. Hook useBAC (`src/hooks/useBAC.ts`)
- Appelle `getCurrentBAC()` au montage et toutes les 10 minutes (setInterval)
- Expose : `bacData` (BACData | null), `loading`, `refresh()` (pour forcer un rafraîchissement)
- Se désactive si pas de soirée en cours
- Quand on ajoute un drink (depuis Scanner), le Home doit se rafraîchir automatiquement → appeler `refresh()` après un `addDrink()`

### 3. Composant BACChart (`src/components/BACChart.tsx`)
- Graphique en courbe (LineChart de Recharts) affichant :
  - Axe X : le temps (heures)
  - Axe Y : le BAC en g/L
  - La courbe BAC (couleur vive, ex: #ff6b6b)
  - Une ligne horizontale de référence à 0.5 g/L (seuil légal, couleur jaune/orange, en pointillés)
  - Zone colorée sous la courbe (AreaChart) : rouge au-dessus de 0.5, vert en-dessous
- Le graphique doit avoir un label "Seuil légal (0.5 g/L)" sur la ligne de référence
- Responsive (s'adapte à la largeur mobile)
- Si la courbe est vide, afficher un message placeholder

### 4. Page Home (`src/pages/Home.tsx`) — Refonte complète
La page devient le dashboard principal avec, dans l'ordre :

**Bloc 1 — Indicateur BAC actuel :**
- Grand chiffre du BAC actuel (ex: "0.72 g/L") bien visible
- Couleur dynamique : vert si < 0.5, orange si entre 0.5 et 0.8, rouge si > 0.8
- Icône ou emoji selon le statut (ex: 🚗✅ si légal, 🚫🚗 si illégal)

**Bloc 2 — Temps restant :**
- "Tu peux conduire dans : Xh Xmin" ou "Tu peux conduire ! 🚗" si légal
- Format lisible (pas "127 minutes" mais "2h 07min")

**Bloc 3 — Graphique BAC :**
- Le composant BACChart avec la courbe de la soirée en cours

**Bloc 4 — Dernières boissons :**
- Liste des 3 dernières boissons de la soirée (nom, volume, heure)
- Lien "Voir tout" → scrolle ou va vers la liste complète

**Bloc 5 — Actions :**
- Bouton "Scanner une boisson" → `/scan`
- Bouton "Fin de soirée" (si soirée en cours)

**État "pas de soirée" :**
- Si aucune soirée en cours : message d'accueil sympa + bouton "Commencer la soirée" qui mène au scanner

### 5. Auto-refresh
- Le dashboard se rafraîchit toutes les 10 minutes automatiquement
- Afficher discrètement l'heure du dernier rafraîchissement ("Mis à jour à 23h42")
- Bouton pour forcer un rafraîchissement manuel

## Contraintes
- Le graphique doit être lisible sur un écran mobile (pas trop petit)
- Les données viennent uniquement du backend (pas de calcul BAC côté client)
- CSS minimal mais le dashboard doit être clair et lisible (fond sombre, couleurs contrastées)
- Tout le texte en français
- Penser à nettoyer le setInterval au unmount du composant
