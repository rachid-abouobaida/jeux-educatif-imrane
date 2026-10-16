# 🦁 Petit Lion d'Imrane (عمران) — Application Éducative Préscolaire

Application web éducative complète, moderne et bienveillante conçue spécialement pour **IMRANE (عمران)**, un enfant de 4 ans, pour apprendre et répéter des mots en :
- 🇫🇷 **Français**
- 🌟 **Arabe standard**
- 🇲🇦 **Darija marocaine authentique**

Accompagné par son ami le **Petit Lion**, Imrane découvre les mots en s'amusant à travers des illustrations colorées, une synthèse vocale chaleureuse, des effets sonores interactifs et une reconnaissance vocale intelligente avec tolérance aux variantes enfantines.

---

## 🌟 Fonctionnalités Clés

1. **Personnalisation Complète pour Imrane (عمران) :**
   - Accueil, encouragements et félicitations personnalisés avec son prénom en français et en arabe.
   - Jamais de punition ni de message culpabilisant : valorisation des essais et bienveillance constante.

2. **Compagnon Mascotte Animé (Petit Lion) :**
   - 6 états d'expressions réactifs : `idle` (respiration douce), `speaking` (parole animée), `listening` (oreille tendue), `happy` (joie et bonds), `encouraging` (sourire rassurant), `thinking` (réflexion).
   - Illustrations transparentes haute fidélité (`public/assets/lion/`) avec repli SVG automatique.

3. **Jeu Principal « Écouter et Répéter » :**
   - Machine à états finis (`idle` ➔ `speaking` ➔ `listening` ➔ `success` / `retry`).
   - **Prononciation claire et ralentie (0.75x)** : spécialement calibrée pour permettre à un enfant de 4 ans d'entendre chaque syllabe, consonne et phonème distinctement sans précipitation.
   - Présentation du mot avec voix audio et illustration grand format.
   - Écoute active avec onde sonore visuelle et limiteur de durée (6–8 s).
   - Reconnaissance vocale Web Speech API (`fr-FR`, `ar-SA`, `ar-MA`) avec tolérance réglable.
   - Bouton d'accès manuel « J'ai bien répété ! ⭐ » garantissant que l'enfant ne reste jamais bloqué si le micro est désactivé.

4. **Mini-jeu Défi Visuel « Trouve le bon dessin » :**
   - Le lion demande : « Imrane, peux-tu trouver la banane ? »
   - 3 grandes cartes illustrées tactiles.
   - Fonctionne 100% sans micro dans les trois langues.

5. **Bibliothèque de Vocabulaire Riche (36 mots) :**
   - 6 catégories préscolaires : Animaux, Fruits & Aliments, Objets du quotidien, Corps humain, Moyens de transport, Actions simples.
   - Traductions authentiques vérifiées (ex: مشّ, ساروت, بيكالا, طوموبيل, طوبيس, نيف, ينعس).
   - Guide phonétique pour les parents.
   - Illustrations vectorielles SVG & PNG transparentes dédiées à chaque mot (`public/assets/words/`).

6. **Espace Parents Protégé (Verrou Mathématique) :**
   - Question de sécurité pour éviter l'ouverture accidentelle par l'enfant.
   - Choix de la langue par défaut.
   - 3 niveaux de difficulté pour la tolérance vocale : Facile (recommandé 4 ans), Moyen, Difficile.
   - Activation/désactivation de la reconnaissance vocale et du passage automatique.
   - Réglage du volume sonore et réinitialisation de la progression.

7. **Sécurité et Confidentialité :**
   - Aucun compte nécessaire, aucune publicité, aucun tracker.
   - Aucun enregistrement audio transmis ou stocké sur serveur (traitement local navigateur).
   - Sauvegarde locale automatique (`localStorage`).

---

## 🚀 Installation et Lancement

### Prérequis
- **Node.js** (v18 ou supérieur recommandé)
- **npm** ou **pnpm**

### Commandes

```bash
# 1. Cloner ou extraire le projet
cd jeux-educatif-imrane

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement local
npm run dev

# 4. Lancer la suite de tests automatisés (Vitest)
npm test

# 5. Compiler pour la production (build statique)
npm run build
```

L'application sera accessible par défaut sur `http://localhost:5173/`.

---

## 🧪 Tests Automatisés

Le projet intègre une suite de tests unitaires avec **Vitest** :
```bash
npm test
```
Tests couverts :
- Normalisation du français et de l'arabe (suppression du Tashkeel / harakat, harmonisation des Alefs et Taa Marbuta).
- Distance de Levenshtein et ratios de similarité phonétique.
- Niveaux de tolérance (`easy`, `medium`, `hard`).
- Variantes dialectales en darija marocaine.
- Intégrité de la base de 36 mots et présence des traductions obligatoires.
- Gestion du stockage local (`localStorage`) des préférences et étoiles.

---

## 📁 Architecture du Projet

```text
jeux-educatif-imrane/
├── public/
│   ├── assets/
│   │   ├── lion/             # 6 états d'illustration de la mascotte lion
│   │   │   ├── lion-idle.png
│   │   │   ├── lion-speaking.png
│   │   │   ├── lion-listening.png
│   │   │   ├── lion-happy.png
│   │   │   ├── lion-encouraging.png
│   │   │   └── lion-thinking.png
│   │   ├── words/            # 36 illustrations SVG + PNG des mots
│   │   └── audio/            # Dossiers audio par langue (fr, ar, ary)
├── src/
│   ├── components/           # Composants UI tactiles et accessibles
│   │   ├── LionCharacter.tsx # Mascotte animée réactive
│   │   ├── WordCard.tsx      # Carte du mot illustrée
│   │   ├── ListeningIndicator.tsx # Indicateur visuel d'écoute & micro
│   │   ├── RewardAnimation.tsx    # Confetti & étoiles
│   │   ├── LanguageSelector.tsx   # Sélecteur de langue
│   │   └── BigActionButton.tsx    # Grands boutons enfants
│   ├── features/
│   │   ├── game/             # Écran de jeu et machine à états
│   │   │   ├── GameScreen.tsx
│   │   │   ├── useGameController.ts
│   │   │   └── gameTypes.ts
│   │   ├── speech/           # Services vocaux découplés
│   │   │   ├── speechRecognitionService.ts
│   │   │   └── pronunciationEvaluator.ts
│   │   ├── challenges/       # Mini-jeu « Trouve le bon dessin »
│   │   │   └── PictureChoiceGame.tsx
│   │   └── settings/         # Espace parents avec sas de sécurité
│   │       └── ParentSettings.tsx
│   ├── data/
│   │   └── words.json        # Base des 36 mots (traductions, phonétique, variantes)
│   ├── services/
│   │   ├── audioService.ts   # Web Audio API + Web Speech synthése vocale
│   │   └── storageService.ts # Sauvegarde locale (progression & réglages)
│   ├── hooks/
│   │   └── useAudio.ts
│   ├── i18n/
│   │   └── translations.ts   # Textes personnalisés pour Imrane
│   ├── types/
│   │   └── index.ts
│   ├── styles/
│   │   └── global.css
│   ├── App.tsx
│   └── main.tsx
├── tests/                    # Tests unitaires Vitest
└── dist/                     # Bundle statique de production
```

---

## 🌐 Déploiement Statique

Le projet génère une application purement statique dans le dossier `dist/`, déployable gratuitement sur n'importe quel hébergeur web moderne :

### Déploiement sur Vercel
1. Installez la CLI Vercel (`npm i -g vercel`) ou connectez votre dépôt GitHub sur [vercel.com](https://vercel.com).
2. Configurez le projet :
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
3. Déployez en exécutant :
   ```bash
   vercel --prod
   ```

### Déploiement sur Cloudflare Pages
1. Sur le tableau de bord Cloudflare Pages, créez un nouveau projet lié à votre dépôt Git.
2. Définissez les réglages :
   - **Framework Preset** : Vite
   - **Build Command** : `npm run build`
   - **Build Output Directory** : `dist`
3. Enregistrez et déployez. Votre application sera disponible instantanément sur un CDN mondial rapide et sécurisé.

---

## 🦁 Note d'Attention Pédagogique

Cette application a été spécialement calibrée pour respecter le rythme d'un enfant de 4 ans :
- Sessions courtes suggérées (5 à 10 minutes).
- Ergonomie adaptée aux petits doigts (grandes zones tactiles).
- Renforcement positif systématique : chaque effort est récompensé par la joie du Petit Lion et des étoiles bien méritées pour Imrane !
