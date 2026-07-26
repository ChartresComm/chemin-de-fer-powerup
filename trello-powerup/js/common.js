// common.js
// Fonctions partagées pour lire/écrire la configuration et la disposition
// du chemin de fer dans le stockage Trello (portée "board", visibilité "shared"
// => visible et modifiable par tous les membres du tableau).

var CDF_CONFIG_KEY = 'cdfConfig';
var CDF_LAYOUT_KEY = 'cdfLayout';

// Modèles pré-remplis correspondant aux publications de Chartres métropole.
// "spreads" = nombre de planches doubles (pages / 2, arrondi).
var CDF_TEMPLATES = {
  'chartres-metropole-60p': {
    label: 'Chartres métropole, le magazine des 66 communes (60 pages)',
    spreads: 30,
    columns: 5
  },
  'culturel-52p': {
    label: 'Magazine culturel et événementiel (52 pages)',
    spreads: 26,
    columns: 5
  },
  'custom': {
    label: 'Personnalisé',
    spreads: 20,
    columns: 5
  }
};

var CDF_DEFAULT_CONFIG = {
  template: 'chartres-metropole-60p',
  spreads: CDF_TEMPLATES['chartres-metropole-60p'].spreads,
  columns: CDF_TEMPLATES['chartres-metropole-60p'].columns
};

function cdfGetConfig(t) {
  return t.get('board', 'shared', CDF_CONFIG_KEY, CDF_DEFAULT_CONFIG);
}

function cdfSaveConfig(t, config) {
  return t.set('board', 'shared', CDF_CONFIG_KEY, config);
}

function cdfGetLayout(t) {
  // layout.assignments : { "<idCarte>": <indexPlanche (0-based)>, ... }
  return t.get('board', 'shared', CDF_LAYOUT_KEY, { assignments: {} });
}

function cdfSaveLayout(t, layout) {
  return t.set('board', 'shared', CDF_LAYOUT_KEY, layout);
}
