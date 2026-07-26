# Power-Up « Chemin de fer » pour Trello

## Ce que fait ce Power-Up

- Ajoute un bouton **« Chemin de fer »** dans la barre du tableau, qui ouvre une grille plein écran représentant les planches (doubles pages) de votre publication.
- Chaque carte du tableau peut être glissée-déposée sur une planche, ou remise dans la colonne « Cartes non placées ».
- La disposition est enregistrée dans le stockage Trello du tableau (**visibilité partagée**) : tous les membres du tableau voient et peuvent modifier la même grille, en temps réel dès qu'ils rouvrent la vue.
- Chaque carte affiche un badge (« Planche X ») indiquant sa position, visible directement sur le tableau Trello classique.
- Les réglages permettent de choisir un modèle pré-rempli (60 pages / 30 planches pour *Chartres métropole, le magazine des 66 communes*, 52 pages / 26 planches pour le magazine culturel) ou un nombre de planches personnalisé.

## Étape 1 — Héberger le code sur GitHub Pages

1. Crée un nouveau dépôt GitHub (public), par exemple `chemin-de-fer-powerup`.
2. Dépose tout le contenu de ce dossier à la racine du dépôt.
3. Dans les réglages du dépôt (**Settings > Pages**), active GitHub Pages sur la branche `main`, dossier racine `/`.
4. Après quelques minutes, ton Power-Up sera accessible à une adresse du type :
   `https://<ton-compte-ou-organisation>.github.io/chemin-de-fer-powerup/`

## Étape 2 — Déclarer le Power-Up dans Trello

1. Va sur https://trello.com/power-ups/admin
2. Clique sur **Créer un nouveau Power-Up**.
3. Renseigne :
   - Nom : `Chemin de fer`
   - Espace de travail : celui de Chartres métropole
   - URL de l'iframe (connector) : `https://<ton-url-github-pages>/index.html`
4. Une fois créé, dans l'onglet **Capacités**, tu n'as rien à faire de plus : les capacités (`board-buttons`, `show-settings`, `card-badges`) sont déjà déclarées automatiquement par le code (`js/client.js`) au chargement.
5. Ajoute une icône si tu veux personnaliser (remplace les fichiers dans `/icons`).

## Étape 3 — Activer le Power-Up sur un tableau

1. Ouvre le tableau Trello concerné.
2. Menu du tableau > **Power-Ups** > onglet **Personnalisé** (ou recherche par nom si le Power-Up est publié dans l'espace de travail).
3. Ajoute « Chemin de fer ».
4. Le bouton apparaît dans la barre du tableau, en haut.
5. Clique sur la roue crantée du Power-Up pour choisir ton modèle de publication avant de commencer.

## Limites connues de cette première version (à améliorer si besoin)

- Pas de miniature de couverture sur les cartes dans la grille (seulement nom + pastilles d'étiquettes) — ajoutable facilement si utile.
- Le rafraîchissement des cartes ajoutées au tableau après ouverture de la vue nécessite de cliquer sur « Actualiser les cartes ».
- Pas encore de vue « export PDF/impression » du chemin de fer — peut être ajoutée en V2 si besoin pour les réunions de bouclage.
- Aucune authentification particulière au-delà des permissions Trello standard du tableau : tout membre ayant accès au tableau peut modifier la disposition.

## Fichiers du projet

```
index.html          Connector principal, déclare les capacités
chemin-de-fer.html   Vue plein écran (la grille)
settings.html        Réglages (modèle / nombre de planches)
js/client.js         Déclaration des capacités Trello
js/common.js         Lecture/écriture du stockage partagé + modèles
js/chemin-de-fer.js  Rendu de la grille + glisser-déposer
js/settings.js       Logique des réglages
css/style.css        Styles
icons/               Icônes (à personnaliser)
```
