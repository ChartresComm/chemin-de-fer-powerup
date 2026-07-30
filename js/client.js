// client.js
// Déclaration des capacités du Power-Up "Chemin de fer" auprès de Trello.

/* global TrelloPowerUp */

var ICON = {
  dark: './icons/icon-white.svg',
  light: './icons/icon-color.svg'
};

TrelloPowerUp.initialize({

  // Bouton dans la barre du tableau -> ouvre la vue chemin de fer en plein écran
  'board-buttons': function (t, options) {
    return [{
      icon: ICON,
      text: 'Chemin de fer',
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
  },

  // Badge affiché sur la face de chaque carte : numéro(s) de page si elle est placée
  // (plusieurs emplacements possibles si la carte est dupliquée / étalée sur plusieurs planches)
  'card-badges': function (t, options) {
    return t.card('id').then(function (card) {
      return Promise.all([cdfGetLayout(t), cdfGetConfig(t)]).then(function (res) {
        var layout = res[0];
        var config = res[1];
        var cells = cdfComputeCells(config);

        var texts = (layout.placements || [])
          .filter(function (p) { return p.id === card.id && p.loc !== 'unassigned'; })
          .map(function (p) {
            var parts = p.loc.split('|');
            var cellIdx = parseInt(parts[0], 10);
            var zone = parts[1];
            var cell = cells[cellIdx];
            if (!cell) return null;
            if (zone === 'left') return 'P.' + cell.pages[0];
            if (zone === 'right') return 'P.' + cell.pages[1];
            if (zone === 'both') return 'P.' + cell.pages[0] + '-' + cell.pages[1];
            return 'P.' + cell.pages[0];
          })
          .filter(Boolean);

        if (!texts.length) return [];
        return [{ text: texts.join(' + '), color: 'blue' }];
      });
    });
  }

});
