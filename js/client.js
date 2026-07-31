// client.js
// Déclaration des capacités du Power-Up "Chemin de fer" auprès de Trello.

/* global TrelloPowerUp */

var ICON = {
  dark: './icons/icon-white-16.png',
  light: './icons/icon-color-16.png'
};

TrelloPowerUp.initialize({

  // Bouton dans la barre du tableau -> ouvre la vue chemin de fer en plein écran
  // Le texte est nécessaire (sans lui, Trello n'affiche pas le bouton du tout,
  // confirmé en conditions réelles). Sa taille/police est fixée par Trello lui-même,
  // aucun moyen de la modifier depuis le Power-Up.
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
