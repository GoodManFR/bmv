# Étape 11 — Style visuel BMV

Lis MASTER.md pour le contexte global.

## Ta mission
Donner à l'app son identité visuelle fun et décalée. Transformer le CSS minimal en un vrai design "BMV".

## Direction artistique

### Ambiance générale
- Style enfantin, fun, décalé mais lisible
- Fond sombre (#1a1a2e) avec un pattern d'emojis alcool en transparence (🍺🍷🥴🍻🥂🍾🤮🫗🥃🧉) qui se répète sur toute la page
- Le pattern d'emojis doit être en très faible opacité (0.05-0.08) pour ne pas gêner la lecture
- Couleurs d'accent vives : orange (#ff6b35), jaune (#ffd166), rouge (#ef476f), vert (#06d6a0)
- Texte principal en blanc, texte secondaire en gris clair
- Coins arrondis généreux sur les cartes et boutons (12-16px)

### Typographie
- Police sans-serif moderne et arrondie
- Importer "Nunito" depuis Google Fonts (gratuit) — police enfantine et lisible
- Titres en gras, taille généreuse

### Composants à styler

**NavBar (bas de l'écran) :**
- Fond légèrement plus clair que la page (#2a2a4e)
- Icônes avec emojis : 🏠 📷 📜 👤
- L'onglet actif est mis en valeur (couleur accent + indicateur)
- Hauteur confortable pour le pouce (60px min)

**Boutons :**
- Bouton principal : fond gradient orange → jaune, texte noir, gros et rond
- Bouton secondaire : bordure blanche, fond transparent
- Bouton danger (fin de soirée) : fond rouge
- Animation hover/press subtile (scale 0.95 au press)

**Cartes :**
- Fond semi-transparent (#2a2a4e avec 80% opacité)
- Bordure subtile légèrement brillante
- Ombre douce
- Espacement généreux à l'intérieur

**Dashboard BAC :**
- Le chiffre BAC en très grand (48px+)
- Couleur dynamique déjà en place (vert/orange/rouge)
- Ajouter une animation de pulsation douce quand BAC > 0.8

**Scanner :**
- Le cadre de la caméra avec des coins stylisés
- Les boutons de volume en grille, bien espacés

**Page Login :**
- Logo/titre "BMV" en grand avec un emoji 🍺
- Sous-titre "BOIRE MANGER VOMIR" en plus petit
- Le bouton Google bien centré et visible

**Modale fin de soirée :**
- Les étoiles en jaune doré (#ffd166) quand sélectionnées
- Animation d'apparition douce (fadeIn + slideUp)

**Historique :**
- Les cartes de soirée avec un petit indicateur coloré sur le côté (vert si BAC max < 0.5, orange si < 1.0, rouge si > 1.0)

### Animations
- Transitions douces sur tous les éléments interactifs (0.2s ease)
- FadeIn au chargement des pages
- Les étoiles de notation : scale up au hover

### Responsive
- L'app est pensée mobile-first (max-width: 480px comme cible principale)
- Sur desktop, le contenu est centré dans un conteneur de 420px max

### PWA Install Prompt
- Ajouter un composant `InstallPrompt.tsx` qui s'affiche une seule fois :
  - "Installe BMV sur ton téléphone ! 📱"
  - Bouton "Installer" qui déclenche le prompt natif beforeinstallprompt
  - Bouton "Plus tard" qui ferme et ne réapparaît pas (localStorage)
  - Style : bandeau en haut de la page, fond accent

### Disclaimer légal
- Ajouter un petit texte en bas de la page Home (footer discret) :
  - "⚠️ BMV fournit une estimation. Ne remplace jamais un éthylotest certifié. Ne prenez pas le volant en cas de doute."
  - Style : petit texte, faible opacité, centré

## Contraintes
- Tout en CSS custom (PAS de Tailwind ni de framework CSS)
- Le CSS doit être dans `src/index.css` (fichier unique pour simplifier)
- Utiliser des CSS custom properties (variables) pour les couleurs
- Le pattern d'emojis doit être fait en CSS pur (pseudo-element ::before avec content et repeat)
- Tester que tout est lisible et que le contraste est suffisant
- Tout le texte en français
- Ne casse pas les fonctionnalités existantes, style uniquement
