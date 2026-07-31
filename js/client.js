// client.js
// Déclaration des capacités du Power-Up "Chemin de fer" auprès de Trello.

/* global TrelloPowerUp */

// IMPORTANT : les icônes des board-buttons doivent être en URL ABSOLUE.
// Le bouton est rendu directement dans la page Trello (pas dans notre iframe),
// donc un chemin relatif ('./icons/...') se résout par rapport à trello.com
// et non par rapport à notre hébergement GitHub Pages -> icône introuvable,
// sans erreur console (juste le texte "CDF" reste visible, sans image).
var ICON = {
  dark: 'https://chartrescomm.github.io/chemin-de-fer-powerup/icons/icon-white-16.png',
  light: 'https://chartrescomm.github.io/chemin-de-fer-powerup/icons/icon-color-16.png'
};

TrelloPowerUp.initialize({

  // Bouton dans la barre du tableau -> ouvre la vue chemin de fer en plein écran
  // Le texte est nécessaire (sans lui, Trello n'affiche pas le bouton du tout,
  // confirmé en conditions réelles). Sa taille/police est fixée par Trello lui-même,
  // aucun moyen de la modifier depuis le Power-Up.
  'board-buttons': function (t, options) {
    return [{
      icon: ICON,
      text: 'Chemin de Fer',
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
