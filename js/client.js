// client.js
// Déclaration des capacités du Power-Up "Chemin de fer" auprès de Trello.

/* global TrelloPowerUp */

var ICON = {
  dark: './icons/icon-white-32.png',
  light: './icons/icon-color-32.png'
};

TrelloPowerUp.initialize({

  // Bouton dans la barre du tableau -> ouvre la vue chemin de fer en plein écran
  // (icône seule, sans texte : à tester en conditions réelles avec un rechargement
  // complet + réactivation du Power-Up, car un précédent essai avait semblé faire
  // disparaître le bouton, ce qui pourrait aussi avoir été un problème de cache)
  'board-buttons': function (t, options) {
    return [{
      icon: ICON,
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
