# Power-Up « Chemin de fer » pour Trello

## Ce que fait ce Power-Up

- Bouton **« Chemin de fer »** dans la barre du tableau → grille plein écran des pages de la publication.
- **Pagination automatique** : la page 1 (couverture) est seule, puis les pages suivantes sont accolées par paires (« p.2-3 », « p.4-5 »…), avec un numéro de première page réglable dans les paramètres.
- **Chaque planche double a 3 zones de dépôt** : colonne de gauche (une page), colonne de droite (l'autre page), et une bande centrale « sur les 2 pages » pour une carte qui s'étale sur les deux. Le numéro de page (« P.4 », « P.5 ») reste affiché sous chaque colonne.
- **Rubriques** : chaque planche a un champ de titre libre + une pastille de couleur de fond, tous deux modifiables directement.
- **Titre + dates** : un champ titre en haut de la vue, une date de bouclage et une date de distribution.
- **Cartes archivées invisibles** : les cartes déplacées dans une liste nommée « Archivées » (nom modifiable dans les réglages) disparaissent automatiquement du chemin de fer.
- **Export PDF** : inclut le titre et les dates de bouclage/distribution en en-tête, en plus de la grille complète.
- **Nouveau chemin de fer** : archive le numéro en cours (titre, dates, disposition, cartes) dans un historique interne au Power-Up, puis repart soit du même modèle de pagination (planches vidées), soit de zéro.
- **Historique** : liste tous les anciens chemins de fer archivés ; « Consulter » affiche leur disposition telle qu'elle était au moment de l'archivage (lecture seule).
- Chaque carte affiche un badge sur sa face Trello classique indiquant sa ou ses pages (« P.4 » ou « P.4-5 » si elle couvre les deux).
- Tout est enregistré dans le stockage Trello du tableau (**visibilité partagée**) : tous les membres du tableau voient et modifient la même chose. **Aucune clé API, aucune autorisation externe n'est nécessaire** — tout repose uniquement sur le stockage natif du Power-Up.

## Ce qui a changé dans cette version (corrections de bugs)

- **Autoriser Statut / Membres retiré** : cette fonctionnalité et son bouton ont été supprimés, comme demandé.
- **"Nouveau chemin de fer" et "Historique" simplifiés** : ils ne créent plus de carte Trello ni ne demandent d'autorisation — la tentative précédente de créer automatiquement une carte dans une liste "Éditions" reposait sur un mécanisme d'autorisation Trello qui s'est montré peu fiable en pratique. L'archivage se fait maintenant uniquement via le stockage interne du Power-Up, ce qui doit fonctionner de façon fiable à chaque clic sur « Enregistrer et repartir ».
- **Scroll corrigé** : la vue plein écran ne limitait plus l'affichage aux cartes visibles à l'écran (un appel technique erroné empêchait le défilement). C'est corrigé — tu dois maintenant pouvoir faire défiler toute la grille, y compris pour une pagination de 60 pages.
- **Zone "sur les 2 pages" élargie** : plus large et étiquetée, pour être plus facile à viser au glisser-déposer.

## Si tu veux quand même une trace visible dans Trello

Sans la création automatique de carte, voici une alternative simple et manuelle : après avoir archivé un numéro, clique sur "Exporter en PDF" (avant ou après avoir cliqué "Nouveau chemin de fer" selon ce qui t'arrange) puis attache toi-même ce PDF à une carte de ton choix — par exemple dans une liste "Éditions" que tu crées une fois pour toutes. Moins automatique, mais beaucoup plus simple et sans dépendance technique fragile.

## Étape 1 — Héberger le code sur GitHub Pages

1. Crée un nouveau dépôt GitHub (public), par exemple `chemin-de-fer-powerup`.
2. Dépose tout le contenu de ce dossier à la racine du dépôt (remplace bien tous les fichiers existants par ceux-ci).
3. Dans les réglages du dépôt (**Settings > Pages**), active GitHub Pages sur la branche `main`, dossier racine `/`.
4. Ton Power-Up est accessible à : `https://<ton-compte>.github.io/chemin-de-fer-powerup/`

## Étape 2 — Déclarer le Power-Up dans Trello

Si c'est déjà fait lors d'une version précédente, il n'y a rien à refaire ici — seule la mise à jour des fichiers sur GitHub (étape 1) est nécessaire, Trello charge toujours le code depuis la même URL.

1. Va sur https://trello.com/power-ups/admin
2. Renseigne l'URL de l'iframe (connector) : `https://<ton-url-github-pages>/index.html`
3. Les capacités (`board-buttons`, `show-settings`, `card-badges`) sont déclarées automatiquement par le code — rien à faire de plus dans l'admin.

## Étape 3 — Activer le Power-Up sur un tableau

1. Menu du tableau > **Power-Ups** > onglet **Personnalisé** > ajoute « Chemin de fer ».
2. Le bouton apparaît dans la barre du tableau.
3. Roue crantée du Power-Up → choisis ton modèle de publication.

## Limites connues

- Pas de miniature de couverture sur les cartes dans la grille (seulement nom + pastilles d'étiquettes).
- Le rafraîchissement des cartes ajoutées au tableau après ouverture de la vue nécessite « Actualiser les cartes ».
- Si le nombre total de pages est modifié après avoir saisi des rubriques, celles-ci peuvent se décaler (liées à la position de la planche, pas à son numéro de page).
- L'historique est figé volontairement (aucune restauration/modification d'un ancien chemin de fer).
- Chaque instantané d'édition est stocké dans sa propre clé (limite Trello : 4096 caractères par clé) — pour une publication avec un très grand nombre de cartes, cette limite pourrait être atteinte pour l'historique détaillé (le titre/dates dans la liste d'historique resteraient visibles dans tous les cas).
- Aucune authentification particulière au-delà des permissions Trello standard du tableau : tout membre ayant accès au tableau peut tout modifier.

## Fichiers du projet

```
index.html          Connector principal, déclare les capacités
chemin-de-fer.html   Vue plein écran (la grille)
settings.html        Réglages (modèle / pagination / liste archivée)
js/client.js         Déclaration des capacités Trello (badges, bouton, réglages)
js/common.js         Lecture/écriture du stockage partagé + modèles
js/chemin-de-fer.js  Rendu de la grille + glisser-déposer + export + historique
js/settings.js       Logique des réglages
css/style.css        Styles
icons/               Icônes (à personnaliser)
```
