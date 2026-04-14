# Étape 8 — Gestion des soirées (fin de soirée + note + commentaire)

Lis MASTER.md pour le contexte global.

## Ta mission
Finaliser la gestion des soirées : popup de fin de soirée avec note et commentaire, et s'assurer que tout le flux soirée est cohérent.

## Concrètement

### 1. Composant EndSessionModal (`src/components/EndSessionModal.tsx`)
Crée une modale/popup qui s'affiche quand l'utilisateur clique "Fin de soirée" :
- Titre : "Fin de la soirée 🎉"
- Un résumé rapide : nombre de boissons, durée de la soirée, BAC max atteint
- Notation : 5 étoiles cliquables (1 à 5)
- Champ texte multiligne pour un commentaire libre (placeholder : "Comment s'est passée ta soirée ?")
- Bouton "Terminer la soirée" qui envoie la note + commentaire au backend
- Bouton "Annuler" pour fermer la modale sans terminer
- La modale doit avoir un fond semi-transparent (overlay)

### 2. Intégration dans Home (`src/pages/Home.tsx`)
- Le bouton "Fin de soirée" ouvre la modale EndSessionModal
- Quand la soirée est terminée avec succès : fermer la modale, rafraîchir l'état (plus de soirée active), afficher un message de confirmation
- Passer les données nécessaires à la modale (session_id, nombre de drinks, heure de début)

### 3. Backend — Calcul du BAC max (`app/routers/sessions.py`)
- Quand on termine une soirée (`PUT /sessions/{id}/end`), calculer et stocker le BAC max atteint pendant la soirée
- Ajouter une colonne `max_bac` à la table sessions (ajoute le SQL dans un nouveau fichier `supabase/migration_001.sql`)
- Le BAC max est calculé en itérant sur la courbe BAC (utiliser BACCalculator.generate_curve)

### 4. Empêcher les actions sur une soirée terminée
- Frontend : si la soirée est terminée (ended_at != null), ne plus afficher le bouton "Fin de soirée" ni permettre d'ajouter des boissons
- Backend : le endpoint POST /drinks/ doit refuser d'ajouter une boisson à une soirée terminée (retourner 400)

### 5. Feedback visuel après fin de soirée
- Après avoir terminé la soirée, la page Home affiche : "Pas de soirée en cours. Scanne une boisson pour en commencer une nouvelle !"
- Le dernier résumé de la soirée terminée s'affiche brièvement (note, commentaire, stats) avant de disparaître ou d'être accessible dans l'historique

## Contraintes
- La modale doit être jolie même avec le CSS minimal actuel (fond sombre, bordure, bien centrée)
- Tout le texte en français
- La note est optionnelle (on peut terminer sans noter)
- Le commentaire est optionnel
