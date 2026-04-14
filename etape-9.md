# Étape 9 — Historique des soirées

Lis MASTER.md pour le contexte global.

## Ta mission
Créer la page d'historique des soirées passées avec une vue liste et une vue détail par soirée.

## Concrètement

### 1. Backend — Endpoints historique
- `GET /sessions/?user_id={id}` doit déjà exister (étape 5). Vérifie qu'il retourne les soirées triées par date décroissante (les plus récentes en premier) et qu'il inclut : id, started_at, ended_at, rating, comment, max_bac
- `GET /sessions/{session_id}` → retourne une soirée avec la liste complète de ses boissons
- `GET /bac/curve/{session_id}` → nouveau endpoint qui recalcule et retourne la courbe BAC d'une soirée passée (utilise BACCalculator.generate_curve avec les drinks de cette session)

### 2. Service API frontend (`src/services/api.ts`)
Ajouter :
- `getSessions()` → GET /sessions/ (liste)
- `getSessionDetail(sessionId)` → GET /sessions/{id} (détail avec drinks)
- `getSessionCurve(sessionId)` → GET /bac/curve/{id} (courbe BAC)

### 3. Page History — Vue liste (`src/pages/History.tsx`)
Refonte complète de la page placeholder. Afficher une liste de cartes, chaque carte représente une soirée :
- Date (format : "Samedi 12 avril 2025")
- Heure de début → heure de fin (ou "En cours" si pas terminée)
- Nombre de boissons consommées
- BAC max atteint
- Note en étoiles (si notée)
- Début du commentaire (tronqué à 50 caractères)
- Cliquer sur une carte → naviguer vers la vue détail

Si aucune soirée : message "Aucune soirée enregistrée. Scanne ta première boisson !"

### 4. Page détail soirée (`src/pages/SessionDetail.tsx`)
Nouvelle page accessible via la route `/history/:sessionId` :
- En-tête : date, durée, note en étoiles, commentaire complet
- Stats : nombre de boissons, BAC max, temps total de la soirée
- Graphique : la courbe BAC de cette soirée (réutiliser le composant BACChart)
- Liste complète des boissons dans l'ordre chronologique : nom, ABV, volume, heure
- Bouton retour vers l'historique

### 5. Router (`src/App.tsx`)
- Ajouter la route `/history/:sessionId` → SessionDetail

## Contraintes
- Les dates doivent être formatées en français (pas de "Monday" mais "Lundi")
- La courbe BAC d'une soirée passée est recalculée à la demande (pas stockée)
- Tout le texte en français
- CSS minimal mais les cartes doivent être lisibles et cliquables
