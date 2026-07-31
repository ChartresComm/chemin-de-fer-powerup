// client.js
// Déclaration des capacités du Power-Up "Chemin de fer" auprès de Trello.

/* global TrelloPowerUp */

var ICON = {
  dark: './icons/icon-white-32.png',
  light: './icons/icon-black-32.png'
};

TrelloPowerUp.initialize({

  // Bouton dans la barre du tableau -> ouvre la vue chemin de fer en plein écran
  // On reste définitivement sur un texte court : Trello met en cache la réponse
  // de cette capacité de façon persistante et imprévisible (confirmé : le code
  // sans texte était bien déployé mais Trello continuait d'afficher l'ancien
  // texte). Le bouton fonctionne dans tous les cas, seul l'affichage varie.
  'board-buttons': function (t, options) {
    return [{
      icon: ICON,
      text: 'CDF',
      callback: function (t) {
        return t.modal({
          url: './chemin-de-fer.html',
          fullscreen: true,
          title: 'Chemin de fer',
          icon: ICON
        });
      }
    }];
  },

  // Icône de réglages (roue crantée du Power-Up dans le menu du tableau)
  'show-settings': function (t, options) {
    return t.popup({
      title: 'Réglages du chemin de fer',
      url: './settings.html',
      height: 300
    });
  }

});
