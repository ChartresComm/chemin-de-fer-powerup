# Power-Up « Chemin de fer » pour Trello

## Ce que fait ce Power-Up

- Ajoute un bouton **« Chemin de fer »** dans la barre du tableau, qui ouvre une grille plein écran représentant les pages de votre publication.
- **Pagination automatique** : la page 1 (couverture) est seule, puis les pages suivantes sont accolées par paires (« p.2-3 », « p.4-5 »…), avec un numéro de première page réglable dans les paramètres.
- Chaque carte du tableau peut être glissée-déposée sur une planche, ou remise dans la colonne « Cartes non placées ».
- **Rubriques personnalisées** : chaque planche a un bandeau éditable (titre + couleur de fond) pour indiquer la rubrique (« Actualités », « Portrait »…). Cliquez directement sur le texte pour le modifier, sur la pastille pour changer la couleur.
- **Statut de carte** : si un champ personnalisé nommé « Statut » (nom modifiable dans les réglages) existe sur vos cartes, sa valeur et sa couleur s'affichent directement dans la grille.
- **Membres** : les membres assignés à chaque carte apparaissent en petites pastilles avec leurs initiales.
- **Export PDF** : un bouton "Exporter en PDF" capture l'état actuel de la grille (planches, rubriques, cartes) dans un PDF téléchargeable, utile pour vos réunions de bouclage.
- La disposition, les rubriques et la configuration sont enregistrées dans le stockage Trello du tableau (**visibilité partagée**) : tous les membres du tableau voient et peuvent modifier la même grille.
- Chaque carte affiche un badge (« Planche X ») indiquant sa position, visible directement sur le tableau Trello classique.
- Les réglages permettent de choisir un modèle pré-rempli (60 pages pour *Chartres métropole, le magazine des 66 communes*, 52 pages pour le magazine culturel) ou une pagination personnalisée.
- **Titre + dates** : un champ titre en haut de la vue (ex : « Numéro de septembre 2026 »), une date de bouclage et une date de distribution, enregistrés avec le reste.
- **Cartes archivées invisibles** : les cartes déplacées dans une liste nommée « Archivées » (nom modifiable dans les réglages) disparaissent automatiquement du chemin de fer, aussi bien de la grille que des « non placées ».
- **Nouveau chemin de fer** : le bouton « Nouveau chemin de fer » archive le numéro en cours sous forme d'une **vraie carte Trello** dans la liste « Éditions » (créée automatiquement si elle n'existe pas), avec le **PDF du chemin de fer joint à la carte** — visible et consultable par toute l'équipe directement dans Trello, sans ouvrir le Power-Up. Le détail interactif (disposition précise) reste aussi accessible depuis le Power-Up. Puis le chemin de fer repart soit du même modèle de pagination (planches vidées), soit de zéro.
- **Historique figé** : le bouton « Historique » liste tous les anciens chemins de fer archivés, avec un lien direct vers leur carte Trello ; « Consulter » affiche leur disposition telle qu'elle était au moment de l'archivage (lecture seule — instantané, pas les cartes actuelles du tableau).

## ⚠️ Étape supplémentaire pour le Statut, les Membres et l'archivage en carte

Ces fonctionnalités nécessitent une **clé API Trello** et une **autorisation de lecture et d'écriture** (les Power-Ups n'ont pas accès aux champs personnalisés ni au droit de créer des cartes par défaut) :

1. Va sur https://trello.com/power-ups/admin, ouvre ta fiche « Chemin de fer », onglet **Clé API** (génère-en une si besoin — ou récupère-en une sur https://trello.com/app-key).
2. Ouvre le fichier `js/common.js` et remplace `COLLE_TA_CLE_API_ICI` par cette clé, puis republie ce fichier sur GitHub (édite-le directement dans l'interface GitHub, ou re-upload).
3. Dans la vue chemin de fer, un bouton **« Autoriser Statut / Membres »** apparaît tant que ce n'est pas encore fait. Un clic dessus ouvre une fenêtre d'autorisation Trello (à valider une fois par utilisateur).
4. Si tu avais déjà autorisé une version précédente (lecture seule), il faudra probablement ré-autoriser une fois pour obtenir le droit d'écriture nécessaire à la création de cartes d'édition — Trello proposera automatiquement la fenêtre d'autorisation la première fois que tu utilises « Nouveau chemin de fer ».
5. Sans cette étape, le Power-Up fonctionne normalement (grille, glisser-déposer, rubriques, export PDF manuel) — seuls le statut, les membres et l'archivage automatique en carte Trello restent indisponibles.

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

## Limites connues de cette version (à améliorer si besoin)

- Pas de miniature de couverture sur les cartes dans la grille (seulement nom + pastilles d'étiquettes) — ajoutable facilement si utile.
- Le rafraîchissement des cartes ajoutées au tableau après ouverture de la vue nécessite de cliquer sur « Actualiser les cartes ».
- Si le nombre total de pages est modifié après avoir déjà saisi des rubriques, les rubriques peuvent se décaler (elles sont liées à la position de la planche, pas à son numéro de page) — à corriger en V3 si ça devient gênant en pratique.
- Le Statut ne s'affiche correctement que pour un champ personnalisé de type « liste déroulante » (le type le plus courant) ; les autres types s'affichent sans couleur.
- L'export PDF capture une image de la grille telle qu'affichée à l'écran (pas de mise en page « impression » optimisée page par page) — suffisant pour un usage de travail/relecture.
- L'historique est figé volontairement (aucune restauration/modification d'un ancien chemin de fer) : pour repartir d'un ancien numéro comme base de travail, il faudrait ajouter une fonction de restauration en V4.
- Chaque instantané d'édition est stocké dans sa propre clé (limite Trello : 4096 caractères par clé) — pour une publication avec un très grand nombre de cartes, cette limite pourrait être atteinte ; dans ce cas, seule la carte Trello + son PDF joint restent garantis, le détail interactif dans l'historique pourrait échouer à se charger (message "instantané introuvable").
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
