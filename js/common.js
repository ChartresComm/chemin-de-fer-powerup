// common.js
// Fonctions partagées : configuration, disposition, rubriques, historique.
// Tout repose uniquement sur t.get/t.set (stockage Trello natif) — aucune
// autorisation ni appel REST externe n'est nécessaire.

var CDF_CONFIG_KEY = 'cdfConfig';
var CDF_LAYOUT_KEY = 'cdfLayout';
var CDF_RUBRIQUES_KEY = 'cdfRubriques';
var CDF_META_KEY = 'cdfMeta';
var CDF_HISTORY_KEY = 'cdfHistory';

var CDF_TEMPLATES = {
  'chartres-metropole-60p': {
    label: 'Chartres métropole, le magazine des 66 communes (60 pages)',
    totalPages: 60,
    columns: 5
  },
  'culturel-52p': {
    label: 'Magazine culturel et événementiel (52 pages)',
    totalPages: 52,
    columns: 5
  },
  'custom': {
    label: 'Personnalisé',
    totalPages: 20,
    columns: 5
  }
};

var CDF_DEFAULT_CONFIG = {
  template: 'chartres-metropole-60p',
  totalPages: CDF_TEMPLATES['chartres-metropole-60p'].totalPages,
  startPage: 1,
  columns: CDF_TEMPLATES['chartres-metropole-60p'].columns,
  archivedListName: 'Archivées'
};

var CDF_DEFAULT_META = { title: '', closingDate: '', distributionDate: '' };

function cdfGetConfig(t) {
  return t.get('board', 'shared', CDF_CONFIG_KEY, CDF_DEFAULT_CONFIG);
}
function cdfSaveConfig(t, config) {
  return t.set('board', 'shared', CDF_CONFIG_KEY, config);
}

function cdfGetLayout(t) {
  return t.get('board', 'shared', CDF_LAYOUT_KEY, { placements: [] }).then(cdfNormalizeLayout);
}
function cdfSaveLayout(t, layout) {
  return t.set('board', 'shared', CDF_LAYOUT_KEY, layout);
}

// Convertit l'ancien format ({ assignments: { cardId: "cell|zone" } }, un seul
// emplacement par carte) vers le nouveau format ({ placements: [{ id, loc }] },
// plusieurs emplacements possibles par carte — pour dupliquer une carte sur
// plusieurs planches, ou l'étaler sur plusieurs doubles-pages).
function cdfNormalizeLayout(layout) {
  if (layout && Array.isArray(layout.placements)) return layout;
  var placements = [];
  if (layout && layout.assignments) {
    Object.keys(layout.assignments).forEach(function (cardId) {
      placements.push({ id: cardId, loc: String(layout.assignments[cardId]) });
    });
  }
  return { placements: placements };
}

function cdfGetRubriques(t) {
  // { "<indexCellule>": { title: "Actualités", color: "#eee" } }
  return t.get('board', 'shared', CDF_RUBRIQUES_KEY, {});
}
function cdfSaveRubriques(t, rubriques) {
  return t.set('board', 'shared', CDF_RUBRIQUES_KEY, rubriques);
}

function cdfGetMeta(t) {
  return t.get('board', 'shared', CDF_META_KEY, CDF_DEFAULT_META);
}
function cdfSaveMeta(t, meta) {
  return t.set('board', 'shared', CDF_META_KEY, meta);
}

function cdfGetHistory(t) {
  // Index léger : [{ id, title, closingDate, distributionDate, savedAt }]
  return t.get('board', 'shared', CDF_HISTORY_KEY, []);
}
function cdfSaveHistory(t, history) {
  return t.set('board', 'shared', CDF_HISTORY_KEY, history);
}

// Instantané complet d'une édition (disposition, rubriques, cartes), stocké
// sous sa propre clé pour ne jamais faire grossir une seule valeur au-delà
// de la limite Trello de 4096 caractères par clé.
function cdfGetIssueSnapshot(t, issueId) {
  return t.get('board', 'shared', 'cdfIssue_' + issueId, null);
}
function cdfSaveIssueSnapshot(t, issueId, snapshot) {
  return t.set('board', 'shared', 'cdfIssue_' + issueId, snapshot);
}

// Calcule la liste des cellules de la grille : page 1 seule (couverture),
// puis pages accolées par paires ("p.2-3", "p.4-5"...), et la dernière page
// (4e de couverture) toujours seule elle aussi.
function cdfComputeCells(config) {
  var startPage = config.startPage || 1;
  var totalPages = Math.max(config.totalPages || 20, 1);
  var lastPage = startPage + totalPages - 1;
  var cells = [];

  // 1ère de couverture : toujours seule
  cells.push({ pages: [startPage], label: 'p.' + startPage });
  if (totalPages === 1) return cells;

  // 4e de couverture (dernière page) : toujours seule aussi, sauf s'il n'y a
  // que 2 pages au total (alors il n'y a pas de "milieu").
  var middleStart = startPage + 1;
  var middleEnd = lastPage - 1;

  var page = middleStart;
  while (page <= middleEnd) {
    var remaining = middleEnd - page + 1;
    if (remaining >= 2) {
      cells.push({ pages: [page, page + 1], label: 'p.' + page + '-' + (page + 1) });
      page += 2;
    } else {
      cells.push({ pages: [page], label: 'p.' + page });
      page += 1;
    }
  }

  if (lastPage > startPage) {
    cells.push({ pages: [lastPage], label: 'p.' + lastPage });
  }

  return cells;
}

// Couleurs Trello (étiquettes)
var TRELLO_COLORS = {
  green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
  purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
  pink: '#ff78cb', black: '#4d4d4d'
};
function cdfColorToHex(name) {
  return TRELLO_COLORS[name] || '#dfe1e6';
}
