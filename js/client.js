// client.js
// Déclaration des capacités du Power-Up "Chemin de fer" auprès de Trello.

/* global TrelloPowerUp */

var ICON = {
  dark: './icons/icon-white.svg',
  light: './icons/icon-color.svg'
};

TrelloPowerUp.initialize({

  // Bouton dans la barre du tableau -> ouvre la vue chemin de fer en plein écran
  // (icône seule : même un texte très court ("CDF") se faisait tronquer, l'espace
  // disponible dans la barre est trop réduit pour afficher du texte de toute façon)
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
