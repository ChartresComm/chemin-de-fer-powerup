// common.js
// Fonctions partagées : configuration, disposition, rubriques, et accès
// REST (autorisé) pour lire les champs personnalisés / membres.

var CDF_CONFIG_KEY = 'cdfConfig';
var CDF_LAYOUT_KEY = 'cdfLayout';
var CDF_RUBRIQUES_KEY = 'cdfRubriques';
var CDF_META_KEY = 'cdfMeta';
var CDF_HISTORY_KEY = 'cdfHistory';

// ⚠️ À renseigner : clé API Trello (créée sur https://trello.com/power-ups/admin,
// onglet "Clé API" de ton Power-Up, ou https://trello.com/app-key).
// Nécessaire uniquement pour afficher le Statut (champ personnalisé) et les membres.
var TRELLO_API_KEY = '12c05190eef3c7f7179ca3cfc2efacfa';

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
  statusFieldName: 'Statut',
  archivedListName: 'Archivées',
  editionsListName: 'Éditions'
};

var CDF_DEFAULT_META = { title: '', closingDate: '', distributionDate: '' };

function cdfGetConfig(t) {
  return t.get('board', 'shared', CDF_CONFIG_KEY, CDF_DEFAULT_CONFIG);
}
function cdfSaveConfig(t, config) {
  return t.set('board', 'shared', CDF_CONFIG_KEY, config);
}

function cdfGetLayout(t) {
  return t.get('board', 'shared', CDF_LAYOUT_KEY, { assignments: {} });
}
function cdfSaveLayout(t, layout) {
  return t.set('board', 'shared', CDF_LAYOUT_KEY, layout);
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
  // Index léger : [{ id, title, closingDate, distributionDate, savedAt, trelloCardId, trelloCardUrl }]
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
// puis pages accolées par paires ("p.2-3", "p.4-5"...).
function cdfComputeCells(config) {
  var startPage = config.startPage || 1;
  var totalPages = config.totalPages || 20;
  var lastPage = startPage + totalPages - 1;
  var cells = [];

  cells.push({ pages: [startPage], label: 'p.' + startPage });

  var page = startPage + 1;
  while (page <= lastPage) {
    var remaining = lastPage - page + 1;
    if (remaining >= 2) {
      cells.push({ pages: [page, page + 1], label: 'p.' + page + '-' + (page + 1) });
      page += 2;
    } else {
      cells.push({ pages: [page], label: 'p.' + page });
      page += 1;
    }
  }
  return cells;
}

// --- Accès REST (autorisation nécessaire) pour Statut / Membres ---

function cdfIsAuthorized(t) {
  try {
    return t.getRestApi().isAuthorized();
  } catch (e) {
    return Promise.resolve(false);
  }
}

function cdfAuthorize(t) {
  return t.getRestApi().authorize({
    scope: 'read,write',
    title: 'Chemin de fer'
  });
}

function cdfRestGet(t, path) {
  return t.getRestApi().getToken().then(function (token) {
    var sep = path.indexOf('?') === -1 ? '?' : '&';
    var url = 'https://api.trello.com/1' + path + sep + 'key=' + TRELLO_API_KEY + '&token=' + token;
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Erreur REST Trello (' + res.status + ')');
      return res.json();
    });
  });
}

function cdfRestPost(t, path) {
  return t.getRestApi().getToken().then(function (token) {
    var sep = path.indexOf('?') === -1 ? '?' : '&';
    var url = 'https://api.trello.com/1' + path + sep + 'key=' + TRELLO_API_KEY + '&token=' + token;
    return fetch(url, { method: 'POST' }).then(function (res) {
      if (!res.ok) throw new Error('Erreur REST Trello (' + res.status + ')');
      return res.json();
    });
  });
}

function cdfRestPostAttachment(t, cardId, blob, filename) {
  return t.getRestApi().getToken().then(function (token) {
    var url = 'https://api.trello.com/1/cards/' + cardId + '/attachments?key=' + TRELLO_API_KEY + '&token=' + token;
    var form = new FormData();
    form.append('file', blob, filename);
    return fetch(url, { method: 'POST', body: form }).then(function (res) {
      if (!res.ok) throw new Error('Erreur pièce jointe (' + res.status + ')');
      return res.json();
    });
  });
}

// Trouve la liste par nom (insensible à la casse) ou la crée si absente.
function cdfFindOrCreateList(t, boardId, name) {
  return t.lists('id', 'name').catch(function () { return []; }).then(function (lists) {
    var target = name.trim().toLowerCase();
    var found = lists.filter(function (l) {
      return l.name && l.name.trim().toLowerCase() === target;
    })[0];
    if (found) return found.id;
    return cdfRestPost(t, '/lists?name=' + encodeURIComponent(name) + '&idBoard=' + boardId).then(function (created) {
      return created.id;
    });
  });
}

// Couleurs Trello (labels / options de champs personnalisés)
var TRELLO_COLORS = {
  green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
  purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
  pink: '#ff78cb', black: '#4d4d4d'
};
function cdfColorToHex(name) {
  return TRELLO_COLORS[name] || '#dfe1e6';
}

// Couleur stable (non liée à Trello) générée à partir d'une chaîne, pour les avatars membres
function cdfHashColor(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var hue = Math.abs(hash) % 360;
  return 'hsl(' + hue + ', 55%, 55%)';
}
