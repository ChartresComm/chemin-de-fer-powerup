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
  archivedListName: 'Archivées',
  locked: false
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

function cdfGetZoom(t) {
  return t.get('member', 'private', 'cdfZoom', 100);
}
function cdfSaveZoom(t, zoom) {
  return t.set('member', 'private', 'cdfZoom', zoom);
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
// Trello limite à 8192 caractères TOUTES les données partagées d'un tableau pour ce
// Power-Up réunies (config + disposition + rubriques + historique...). Les instantanés
// sont donc compressés (lz-string, si disponible) pour en faire tenir plus.
function cdfGetIssueSnapshot(t, issueId) {
  return t.get('board', 'shared', 'cdfIssue_' + issueId, null).then(function (raw) {
    if (raw && raw.z && typeof LZString !== 'undefined') {
      try { return JSON.parse(LZString.decompressFromBase64(raw.z)); } catch (e) { return null; }
    }
    return raw;
  });
}
function cdfSaveIssueSnapshot(t, issueId, snapshot) {
  var value = snapshot;
  if (typeof LZString !== 'undefined') value = { z: LZString.compressToBase64(JSON.stringify(snapshot)) };
  return t.set('board', 'shared', 'cdfIssue_' + issueId, value);
}
function cdfRemoveIssueSnapshot(t, issueId) {
  return t.remove('board', 'shared', 'cdfIssue_' + issueId).catch(function () {
    // pas grave si la clé n'existait déjà plus
  });
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

// Couleur stable (non liée à Trello, qui n'a pas de couleur native pour les listes)
// générée à partir d'une chaîne — renvoie un code hexadécimal (#rrggbb), utilisable
// aussi bien à l'écran que dans le PDF.
function cdfHashColor(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var h = Math.abs(hash) % 360, s = 0.55, l = 0.45;
  var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  var rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + rgb.map(function (v) {
    return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2);
  }).join('');
}

// Couleur de texte lisible (sombre ou blanche) sur un fond hexadécimal.
function cdfTextOn(hex) {
  var n = parseInt(String(hex).slice(1), 16);
  if (isNaN(n)) return '#ffffff';
  var l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 150 ? '#172b4d' : '#ffffff';
}

// Normalise un nom (minuscules, sans accents) pour des comparaisons fiables
// quelle que soit la casse ou les accents utilisés.
function cdfNormalizeName(s) {
  s = (s || '').trim().toLowerCase();
  try {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (e) {
    return s; // repli si normalize() indisponible dans ce contexte
  }
}

// Palette de couleurs fixes pour les listes connues du tableau (Trello ne donne
// pas de couleur native aux listes). Toute liste absente de cette palette reçoit
// automatiquement une couleur générée (cdfHashColor), stable mais non choisie à la main.
var CDF_LIST_COLORS = {
  'a lancer': '#f2d600',          // jaune
  'a trier': '#f2d600',           // jaune (ancien nom de la liste)
  'en redaction': '#5bc0eb',      // bleu clair
  'a mettre en page': '#8cc63f',  // vert pomme
  'mise en page': '#8cc63f',      // vert pomme (ancien nom)
  'finalise': '#b78fe0',          // violet lila
  'finalisee': '#b78fe0',         // violet lila
  'marbre': '#8c8c8c'             // gris neutre
};

function cdfListColor(listName) {
  var key = cdfNormalizeName(listName);
  return CDF_LIST_COLORS[key] || cdfHashColor(listName || key);
}
