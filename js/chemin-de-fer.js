// chemin-de-fer.js

/* global TrelloPowerUp, Sortable, jspdf, CdfPdf */

var t = TrelloPowerUp.iframe();

var gridEl = document.getElementById('cdf-grid');
var unassignedListEl = document.getElementById('unassigned-list');
var labelFilterSelect = document.getElementById('cdf-label-filter');
var statusEl = document.getElementById('cdf-status');
var refreshBtn = document.getElementById('cdf-refresh');
var settingsBtn = document.getElementById('cdf-settings');
var lockBtn = document.getElementById('cdf-lock');
var zoomOutBtn = document.getElementById('cdf-zoom-out');
var zoomInBtn = document.getElementById('cdf-zoom-in');
var zoomValueEl = document.getElementById('cdf-zoom-value');
var currentZoom = 100;
var exportBtn = document.getElementById('cdf-export');

var titleInput = document.getElementById('cdf-title');
var fillStatEl = document.getElementById('cdf-fill-stat');
var closingDateInput = document.getElementById('cdf-closing-date');
var distributionDateInput = document.getElementById('cdf-distribution-date');

var newBtn = document.getElementById('cdf-new');
var newOverlay = document.getElementById('cdf-new-overlay');
var newCurrentTitleSpan = document.getElementById('cdf-new-current-title');
var newTitleInput = document.getElementById('cdf-new-title');
var newBaseSelect = document.getElementById('cdf-new-base');
var newCancelBtn = document.getElementById('cdf-new-cancel');
var newConfirmBtn = document.getElementById('cdf-new-confirm');

var historyBtn = document.getElementById('cdf-history');
var historyOverlay = document.getElementById('cdf-history-overlay');
var historyListView = document.getElementById('cdf-history-list-view');
var historyDetailView = document.getElementById('cdf-history-detail-view');
var historyListEl = document.getElementById('cdf-history-list');
var historyCloseBtn = document.getElementById('cdf-history-close');
var historyClearBtn = document.getElementById('cdf-history-clear');
var historyBackBtn = document.getElementById('cdf-history-back');
var historyDetailTitle = document.getElementById('cdf-history-detail-title');
var historyDetailDates = document.getElementById('cdf-history-detail-dates');
var historyDetailGrid = document.getElementById('cdf-history-detail-grid');

var currentConfig = null;
var currentLayout = null;
var currentRubriques = {};
var currentMeta = {};
var currentHistory = [];
var currentCells = [];
var currentCards = [];

function setStatus(msg) {
  statusEl.textContent = msg;
  if (msg) {
    setTimeout(function () {
      if (statusEl.textContent === msg) statusEl.textContent = '';
    }, 2500);
  }
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str === undefined || str === null ? '' : String(str);
  return div.innerHTML;
}

function cardLabelDots(card) {
  if (!card.labels || !card.labels.length) return '';
  return card.labels.map(function (l) {
    var color = cdfColorToHex(l.color);
    return '<span class="cdf-label-dot" style="background:' + color + '" title="' + escapeHtml(l.name || '') + '"></span>';
  }).join('');
}

function renderCardEl(card, interactive) {
  var li = document.createElement('li');
  li.className = 'cdf-card';
  li.setAttribute('data-id', card.id);
  var labelNames = (card.labels || []).map(function (l) { return (l.name || '').toLowerCase(); }).filter(Boolean);
  li.setAttribute('data-labels', labelNames.join('|'));
  li.innerHTML = '<div class="cdf-card-labels">' + cardLabelDots(card) + '</div>';

  var nameEl = document.createElement('div');
  nameEl.className = 'cdf-card-name';
  nameEl.textContent = card.name;
  if (card.url) {
    nameEl.classList.add('cdf-card-name-link');
    nameEl.title = 'Ouvrir la carte dans Trello';
    nameEl.addEventListener('mousedown', function (e) { e.stopPropagation(); });
    nameEl.addEventListener('click', function (e) {
      e.stopPropagation();
      window.open(card.url, '_blank', 'noopener');
    });
  }
  li.appendChild(nameEl);

  if (card.listName) {
    var listChip = document.createElement('div');
    listChip.className = 'cdf-card-list-chip';
    var chipColor = cdfListColor(card.listName);
    listChip.style.background = chipColor;
    listChip.style.color = cdfTextOn(chipColor);
    listChip.textContent = card.listName;
    li.appendChild(listChip);
  }

  if (interactive) {
    var dupBtn = document.createElement('button');
    dupBtn.type = 'button';
    dupBtn.className = 'cdf-card-duplicate-btn';
    dupBtn.title = 'Dupliquer cette carte : pour l’étaler sur une autre planche, ou créer un miroir identique (même contenu partout)';
    dupBtn.textContent = '⧉';
    dupBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      duplicateCard(card);
    });
    li.appendChild(dupBtn);

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'cdf-card-remove-btn';
    delBtn.title = 'Retirer cet exemplaire de la planche (renvoie en "non placées" si c’est le dernier)';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      removeCardInstance(li);
    });
    li.appendChild(delBtn);
  }

  return li;
}

function duplicateCard(card) {
  unassignedListEl.appendChild(renderCardEl(card, true));
  sortUnassignedByLabel();
  applyLabelFilter();
  saveLayoutFromDom();
  setStatus('Copie créée — glisse-la sur la planche voulue');
}

function removeCardInstance(li) {
  var cardId = li.getAttribute('data-id');
  var totalInstances = document.querySelectorAll(
    '#cdf-grid .cdf-card[data-id="' + cardId + '"], #unassigned-list .cdf-card[data-id="' + cardId + '"]'
  ).length;

  if (totalInstances > 1) {
    li.remove();
    setStatus('Exemplaire retiré');
  } else if (li.parentElement !== unassignedListEl) {
    unassignedListEl.appendChild(li);
    sortUnassignedByLabel();
    applyLabelFilter();
    setStatus('Carte renvoyée en "non placées"');
  } else {
    setStatus('Déjà en "non placées"');
    return; // rien n'a changé, pas besoin de sauvegarder
  }
  saveLayoutFromDom();
}

// --- Construction générique d'une grille (utilisée pour la vue live ET l'historique figé) ---
// Chaque planche double (2 pages) est scindée en 3 zones : gauche / entre-les-deux / droite,
// pour qu'une carte puisse être posée sur une seule page ou à cheval sur les deux.

function buildZoneColumn(cellIndex, zone, pageNum, extraClass) {
  var col = document.createElement('div');
  col.className = 'cdf-zone-col ' + extraClass;

  var ul = document.createElement('ul');
  ul.className = 'cdf-card-list';
  ul.setAttribute('data-cell', String(cellIndex));
  ul.setAttribute('data-zone', zone);
  col.appendChild(ul);

  var footer = document.createElement('div');
  footer.className = 'cdf-zone-footer';
  footer.textContent = pageNum ? 'P.' + pageNum : '';
  col.appendChild(footer);

  return col;
}

function buildGridInto(container, config, rubriques, interactive) {
  container.innerHTML = '';
  container.style.gridTemplateColumns = 'repeat(' + config.columns + ', 1fr)';
  var cells = cdfComputeCells(config);

  cells.forEach(function (cell, i) {
    var cellDiv = document.createElement('div');
    cellDiv.className = 'cdf-cell';
    cellDiv.setAttribute('data-index', String(i));
    var movable = interactive && cell.pages.length === 2;
    if (movable) cellDiv.classList.add('cdf-cell-movable');

    var saved = rubriques[String(i)] || {};

    var rubriqueBar = document.createElement('div');
    rubriqueBar.className = 'cdf-rubrique';
    rubriqueBar.style.background = saved.color || '#eef0f3';

    if (movable) {
      var handle = document.createElement('span');
      handle.className = 'cdf-cell-handle';
      handle.title = 'Glisser pour déplacer toute la double page (cartes et rubrique comprises) — la pagination se met à jour';
      handle.textContent = '⠿';
      rubriqueBar.appendChild(handle);
    }

    var pageLabel = document.createElement('span');
    pageLabel.className = 'cdf-cell-pagelabel';
    pageLabel.textContent = cell.label;
    rubriqueBar.appendChild(pageLabel);

    if (interactive) {
      var titleInputEl = document.createElement('input');
      titleInputEl.type = 'text';
      titleInputEl.className = 'cdf-rubrique-title-input';
      titleInputEl.placeholder = 'Rubrique…';
      titleInputEl.value = saved.title || '';
      titleInputEl.addEventListener('blur', function () {
        saveRubrique(i, 'title', titleInputEl.value.trim());
      });
      rubriqueBar.appendChild(titleInputEl);

      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'cdf-rubrique-color';
      colorInput.value = saved.color || '#eef0f3';
      colorInput.addEventListener('change', function () {
        rubriqueBar.style.background = colorInput.value;
        saveRubrique(i, 'color', colorInput.value);
      });
      rubriqueBar.appendChild(colorInput);
    } else if (saved.title) {
      var titleSpan = document.createElement('span');
      titleSpan.className = 'cdf-rubrique-title-static';
      titleSpan.textContent = saved.title;
      rubriqueBar.appendChild(titleSpan);
    }

    var zonesRow = document.createElement('div');
    zonesRow.className = 'cdf-zones-row';

    if (cell.pages.length === 1) {
      zonesRow.appendChild(buildZoneColumn(i, 'single', cell.pages[0], 'cdf-zone-single'));
    } else {
      zonesRow.appendChild(buildZoneColumn(i, 'left', cell.pages[0], 'cdf-zone-left'));
      zonesRow.appendChild(buildZoneColumn(i, 'both', null, 'cdf-zone-both'));
      zonesRow.appendChild(buildZoneColumn(i, 'right', cell.pages[1], 'cdf-zone-right'));
    }

    cellDiv.appendChild(rubriqueBar);
    cellDiv.appendChild(zonesRow);
    container.appendChild(cellDiv);
  });

  return cells;
}

function renderCardsInto(container, cells, layout, cards, unassignedContainer, interactive) {
  if (unassignedContainer) unassignedContainer.innerHTML = '';
  container.querySelectorAll('.cdf-card-list').forEach(function (ul) { ul.innerHTML = ''; });

  var cardsById = {};
  cards.forEach(function (c) { cardsById[c.id] = c; });

  var placements = (layout && layout.placements) || [];
  var placedIds = {};

  placements.forEach(function (p) {
    var card = cardsById[p.id];
    if (!card) return; // carte introuvable (supprimée/archivée entre-temps)
    placedIds[p.id] = true;

    var targetList = null;
    if (p.loc && p.loc !== 'unassigned') {
      var parts = String(p.loc).split('|');
      var cellIdx = parseInt(parts[0], 10);
      var zone = parts[1];
      if (cellIdx >= 0 && cellIdx < cells.length) {
        targetList = container.querySelector('.cdf-card-list[data-cell="' + cellIdx + '"][data-zone="' + zone + '"]');
      }
    }
    if (!targetList) targetList = unassignedContainer;
    if (targetList) targetList.appendChild(renderCardEl(card, interactive));
  });

  // Cartes sans le moindre emplacement enregistré : apparaissent par défaut en "non placées"
  if (unassignedContainer) {
    cards.forEach(function (card) {
      if (!placedIds[card.id]) {
        unassignedContainer.appendChild(renderCardEl(card, interactive));
      }
    });
  }
}

// --- Vue live ---

function saveRubrique(index, field, value) {
  var key = String(index);
  if (!currentRubriques[key]) currentRubriques[key] = {};
  currentRubriques[key][field] = value;
  cdfSaveRubriques(t, currentRubriques).then(function () { setStatus('Enregistré'); });
}

function buildGrid() {
  currentCells = buildGridInto(gridEl, currentConfig, currentRubriques, !currentConfig.locked);
}

function renderCards() {
  renderCardsInto(gridEl, currentCells, currentLayout, currentCards, unassignedListEl, !currentConfig.locked);
  sortUnassignedByLabel();
  populateLabelFilter();
  applyLabelFilter();
  updateFillStat();
}

// Compte le nombre de pages (et non de planches) qui ont au moins une carte
// dessus, sur le total de pages configuré — ex. "46/60 pages".
function updateFillStat() {
  if (!fillStatEl) return;
  var cardsById = {};
  currentCards.forEach(function (c) { cardsById[c.id] = true; });

  var filledPages = {};
  (currentLayout.placements || []).forEach(function (p) {
    if (!cardsById[p.id] || !p.loc || p.loc === 'unassigned') return;
    var parts = String(p.loc).split('|');
    var cellIdx = parseInt(parts[0], 10);
    var zone = parts[1];
    var cell = currentCells[cellIdx];
    if (!cell) return;
    if (zone === 'left') filledPages[cell.pages[0]] = true;
    else if (zone === 'right') filledPages[cell.pages[1]] = true;
    else if (zone === 'both') { filledPages[cell.pages[0]] = true; filledPages[cell.pages[1]] = true; }
    else filledPages[cell.pages[0]] = true; // single (couverture / 4e de couv)
  });

  var filledCount = Object.keys(filledPages).length;
  var total = currentConfig.totalPages || 0;
  fillStatEl.textContent = filledCount + '/' + total + ' pages';
}

// Trie la liste "Cartes non placées" par nom de première étiquette (alphabétique,
// insensible à la casse) ; les cartes sans étiquette passent en dernier.
function sortUnassignedByLabel() {
  var items = Array.prototype.slice.call(unassignedListEl.querySelectorAll('.cdf-card'));
  items.sort(function (a, b) {
    var la = (a.getAttribute('data-labels') || '').split('|')[0] || '';
    var lb = (b.getAttribute('data-labels') || '').split('|')[0] || '';
    if (!la && lb) return 1;
    if (la && !lb) return -1;
    return la.localeCompare(lb);
  });
  items.forEach(function (li) { unassignedListEl.appendChild(li); });
}

// Reconstruit la liste déroulante des étiquettes disponibles, en conservant
// la sélection en cours si elle est toujours valide.
function populateLabelFilter() {
  var names = {};
  currentCards.forEach(function (c) {
    (c.labels || []).forEach(function (l) {
      if (l.name) names[l.name] = true;
    });
  });
  var previous = labelFilterSelect.value;
  labelFilterSelect.innerHTML = '<option value="">Toutes les étiquettes</option>';
  Object.keys(names).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (name) {
    var opt = document.createElement('option');
    opt.value = name.toLowerCase();
    opt.textContent = name;
    labelFilterSelect.appendChild(opt);
  });
  labelFilterSelect.value = previous;
}

// Masque dans "Cartes non placées" celles qui ne portent pas l'étiquette choisie.
function applyLabelFilter() {
  var val = labelFilterSelect.value;
  unassignedListEl.querySelectorAll('.cdf-card').forEach(function (li) {
    var labels = (li.getAttribute('data-labels') || '').split('|');
    li.style.display = (!val || labels.indexOf(val) !== -1) ? '' : 'none';
  });
}

labelFilterSelect.addEventListener('change', applyLabelFilter);

function initSortable() {
  if (currentConfig.locked) return; // pas de glisser-déposer possible en mode verrouillé
  document.querySelectorAll('#cdf-grid .cdf-card-list, #unassigned-list').forEach(function (ul) {
    if (Sortable.get(ul)) return; // évite les doublons d'écouteurs
    Sortable.create(ul, {
      group: 'cdf-cards',
      animation: 150,
      ghostClass: 'cdf-card-ghost',
      onEnd: saveLayoutFromDom
    });
  });

  // Déplacement de blocs double page entiers (via la poignée ⠿). Seules les doubles
  // pages sont déplaçables entre elles : couverture et 4e de couverture restent fixes.
  if (!Sortable.get(gridEl)) {
    Sortable.create(gridEl, {
      animation: 150,
      draggable: '.cdf-cell-movable',
      handle: '.cdf-cell-handle',
      ghostClass: 'cdf-cell-ghost',
      onMove: function (evt) {
        return evt.related.classList.contains('cdf-cell-movable');
      },
      onEnd: onCellsReordered
    });
  }
}

// Après un déplacement de double page : les rubriques et les cartes suivent leur bloc,
// la numérotation des pages (calculée selon la position) change automatiquement.
function onCellsReordered() {
  var order = Array.prototype.map.call(gridEl.children, function (el) {
    return parseInt(el.getAttribute('data-index'), 10);
  });
  var changed = order.some(function (oldIdx, newIdx) { return oldIdx !== newIdx; });
  if (!changed) return;

  var map = {};
  order.forEach(function (oldIdx, newIdx) { map[oldIdx] = newIdx; });

  var newRubriques = {};
  Object.keys(currentRubriques).forEach(function (key) {
    var o = parseInt(key, 10);
    if (o in map) newRubriques[String(map[o])] = currentRubriques[key];
  });

  var newPlacements = ((currentLayout && currentLayout.placements) || []).map(function (p) {
    if (!p.loc || p.loc === 'unassigned') return p;
    var parts = String(p.loc).split('|');
    var o = parseInt(parts[0], 10);
    return { id: p.id, loc: (o in map ? map[o] : o) + '|' + parts[1] };
  });

  currentRubriques = newRubriques;
  currentLayout = { placements: newPlacements };
  Promise.all([
    cdfSaveRubriques(t, currentRubriques),
    cdfSaveLayout(t, currentLayout)
  ]).then(function () {
    setStatus('Double page déplacée — pagination mise à jour');
  }).catch(function () {
    setStatus('Erreur de sauvegarde');
  });
  fullRender();
}

function saveLayoutFromDom() {
  var placements = [];
  document.querySelectorAll('#cdf-grid .cdf-card-list, #unassigned-list').forEach(function (ul) {
    var loc = (ul.id === 'unassigned-list')
      ? 'unassigned'
      : (ul.getAttribute('data-cell') + '|' + ul.getAttribute('data-zone'));
    ul.querySelectorAll('.cdf-card').forEach(function (li) {
      placements.push({ id: li.getAttribute('data-id'), loc: loc });
    });
  });
  currentLayout = { placements: placements };
  sortUnassignedByLabel();
  applyLabelFilter();
  cdfSaveLayout(t, currentLayout).then(function () {
    setStatus('Enregistré');
  }).catch(function () {
    setStatus('Erreur de sauvegarde');
  });
}

function populateMetaInputs() {
  titleInput.value = currentMeta.title || '';
  closingDateInput.value = currentMeta.closingDate || '';
  distributionDateInput.value = currentMeta.distributionDate || '';
}

function saveMetaFromInputs() {
  currentMeta = {
    title: titleInput.value.trim(),
    closingDate: closingDateInput.value,
    distributionDate: distributionDateInput.value
  };
  cdfSaveMeta(t, currentMeta).then(function () { setStatus('Enregistré'); });
}

titleInput.addEventListener('blur', saveMetaFromInputs);
closingDateInput.addEventListener('change', saveMetaFromInputs);
distributionDateInput.addEventListener('change', saveMetaFromInputs);

// --- Chargement des cartes (avec filtrage de la liste "archivées") ---

function loadCards() {
  return t.lists('id', 'name').catch(function () { return []; }).then(function (lists) {
    var targetName = cdfNormalizeName(currentConfig.archivedListName || 'Archivées');
    var archivedIds = lists.filter(function (l) {
      return cdfNormalizeName(l.name) === targetName;
    }).map(function (l) { return l.id; });

    var listsById = {};
    lists.forEach(function (l) { listsById[l.id] = l.name; });

    return t.cards('id', 'name', 'labels', 'closed', 'idList', 'url').then(function (cards) {
      currentCards = cards.filter(function (c) {
        return !c.closed && archivedIds.indexOf(c.idList) === -1;
      }).map(function (c) {
        c.listName = listsById[c.idList] || '';
        return c;
      });
    });
  }).catch(function (err) {
    // Filet de secours : même en cas de souci imprévu, on affiche au moins
    // toutes les cartes non archivées plutôt que de bloquer toute la vue.
    console.error('loadCards error, repli sur t.cards() simple :', err);
    return t.cards('id', 'name', 'labels', 'closed', 'url').then(function (cards) {
      currentCards = cards.filter(function (c) { return !c.closed; });
    });
  });
}

function fullRender() {
  buildGrid();
  renderCards();
  initSortable();
  applyLockUI();
}

// Reflète l'état verrouillé/déverrouillé sur les boutons qui permettent de
// modifier le chemin de fer (le glisser-déposer et l'édition des rubriques
// sont déjà bloqués via le paramètre "interactive" passé à buildGrid/renderCards).
function applyLockUI() {
  var locked = !!currentConfig.locked;
  if (lockBtn) {
    lockBtn.textContent = locked ? '🔓 Déverrouiller' : '🔒 Verrouiller';
    lockBtn.title = locked
      ? 'Le chemin de fer est verrouillé : aucune modification possible. Cliquer pour déverrouiller.'
      : 'Verrouiller empêche toute modification (glisser-déposer, rubriques, réglages, nouveau chemin de fer).';
  }
  if (newBtn) newBtn.disabled = locked;
  if (settingsBtn) settingsBtn.disabled = locked;
}

if (lockBtn) {
  lockBtn.addEventListener('click', function () {
    currentConfig.locked = !currentConfig.locked;
    cdfSaveConfig(t, currentConfig).then(function () {
      fullRender();
      setStatus(currentConfig.locked ? 'Chemin de fer verrouillé' : 'Chemin de fer déverrouillé');
    });
  });
}

function init() {
  Promise.all([
    cdfGetConfig(t), cdfGetLayout(t), cdfGetRubriques(t), cdfGetMeta(t), cdfGetHistory(t), cdfGetZoom(t)
  ]).then(function (res) {
    currentConfig = res[0];
    currentLayout = res[1];
    currentRubriques = res[2] || {};
    currentMeta = res[3] || {};
    currentHistory = res[4] || [];
    currentZoom = res[5] || 100;
    applyZoom(false);
    populateMetaInputs();
    return loadCards();
  }).then(function () {
    fullRender();
  }).catch(function (err) {
    console.error('Erreur au chargement du chemin de fer :', err);
    setStatus('Erreur au chargement — voir la console');
  });
}

// Applique le niveau de zoom courant à toute la vue (préférence personnelle,
// pas partagée avec le reste de l'équipe). `persist` contrôle si on sauvegarde
// la nouvelle valeur (à éviter lors du tout premier chargement).
function applyZoom(persist) {
  currentZoom = Math.max(50, Math.min(150, currentZoom));
  gridEl.style.zoom = (currentZoom / 100);
  if (zoomValueEl) zoomValueEl.textContent = currentZoom + '%';
  if (persist) cdfSaveZoom(t, currentZoom);
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', function () {
    currentZoom -= 10;
    applyZoom(true);
  });
}

if (zoomInBtn) {
  zoomInBtn.addEventListener('click', function () {
    currentZoom += 10;
    applyZoom(true);
  });
}

// Réglages : dialogue intégré à la vue (plutôt qu'une popup Trello séparée), pour que
// « Enregistrer » mette à jour le chemin de fer immédiatement, sans attendre le stockage.
var sxOverlay = document.getElementById('cdf-settings-overlay');
var sxTemplate = document.getElementById('sx-template');
var sxTotal = document.getElementById('sx-total');
var sxColumns = document.getElementById('sx-columns');
var sxStart = document.getElementById('sx-start');
var sxArchived = document.getElementById('sx-archived');

Object.keys(CDF_TEMPLATES).forEach(function (key) {
  var opt = document.createElement('option');
  opt.value = key;
  opt.textContent = CDF_TEMPLATES[key].label;
  sxTemplate.appendChild(opt);
});
sxTemplate.addEventListener('change', function () {
  var tpl = CDF_TEMPLATES[sxTemplate.value];
  if (!tpl) return;
  sxTotal.value = tpl.totalPages;
  sxColumns.value = tpl.columns;
});

settingsBtn.addEventListener('click', function () {
  sxTemplate.value = currentConfig.template || 'chartres-metropole-60p';
  sxTotal.value = currentConfig.totalPages;
  sxColumns.value = currentConfig.columns;
  sxStart.value = currentConfig.startPage || 1;
  sxArchived.value = currentConfig.archivedListName || 'Archivées';
  sxOverlay.classList.add('cdf-overlay-visible');
});

document.getElementById('sx-cancel').addEventListener('click', function () {
  sxOverlay.classList.remove('cdf-overlay-visible');
});

document.getElementById('sx-save').addEventListener('click', function () {
  var total = parseInt(sxTotal.value, 10) || CDF_DEFAULT_CONFIG.totalPages;
  currentConfig = Object.assign({}, currentConfig, {
    template: sxTemplate.value,
    totalPages: Math.max(2, Math.min(200, total)),
    columns: Math.max(1, Math.min(12, parseInt(sxColumns.value, 10) || CDF_DEFAULT_CONFIG.columns)),
    startPage: Math.max(1, parseInt(sxStart.value, 10) || 1),
    archivedListName: (sxArchived.value || 'Archivées').trim()
  });
  sxOverlay.classList.remove('cdf-overlay-visible');
  setStatus('Application des réglages…');
  cdfSaveConfig(t, currentConfig).then(function () {
    return loadCards();
  }).then(function () {
    fullRender();
    setStatus('Réglages appliqués');
  }).catch(function (err) {
    console.error(err);
    setStatus('Erreur de sauvegarde des réglages');
  });
});

refreshBtn.addEventListener('click', function () {
  loadCards().then(function () {
    renderCards();
    initSortable();
    setStatus('Cartes actualisées');
  }).catch(function (err) {
    console.error(err);
    setStatus('Erreur au chargement des cartes');
  });
});

// --- Export PDF (avec titre, bouclage et distribution inclus dans l'image) ---

function formatDate(d) {
  if (!d) return '';
  var parts = d.split('-');
  if (parts.length !== 3) return d;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

// Dessine la grille directement en PDF vectoriel (texte net et sélectionnable),
// au format A3 paysage, avec saut de page entre les lignes de planches si nécessaire.
function exportPdf() {
  var cells = cdfComputeCells(currentConfig);
  var cols = Math.max(1, currentConfig.columns || 5);
  var M = 10, GAP = 5, PAD = 1.5, ZGAP = 1, BOTH_W = 15, BAR_H = 6, FOOT_H = 3.5;
  var doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  var cw = (W - 2 * M - (cols - 1) * GAP) / cols;
  var clean = CdfPdf.clean;

  var cardsById = {};
  currentCards.forEach(function (c) { cardsById[c.id] = c; });
  var byLoc = {};
  ((currentLayout && currentLayout.placements) || []).forEach(function (p) {
    if (!cardsById[p.id] || !p.loc || p.loc === 'unassigned') return;
    (byLoc[p.loc] = byLoc[p.loc] || []).push(cardsById[p.id]);
  });

  function measure(card, w) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    var lines = doc.splitTextToSize(clean(card.name) || '(sans titre)', w - 2);
    var hasLabels = card.labels && card.labels.length;
    return { lines: lines, h: 1 + (hasLabels ? 2.2 : 0) + lines.length * 2.75 + (card.listName ? 3.6 : 0) + 0.6 };
  }

  function drawCard(card, m, x, y, w) {
    doc.setFillColor('#f4f5f7'); doc.setDrawColor('#dfe1e6'); doc.setLineWidth(0.15);
    doc.roundedRect(x, y, w, m.h, 0.8, 0.8, 'FD');
    var ty = y + 1;
    if (card.labels && card.labels.length) {
      card.labels.forEach(function (l, k) {
        doc.setFillColor(cdfColorToHex(l.color));
        doc.roundedRect(x + 1 + k * 5.2, ty, 4.6, 1.3, 0.6, 0.6, 'F');
      });
      ty += 2.2;
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor('#172b4d');
    doc.text(m.lines, x + 1, ty, { baseline: 'top', lineHeightFactor: 1.2 });
    ty += m.lines.length * 2.75 + 0.4;
    if (card.listName) {
      var col = cdfListColor(card.listName);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(4.5);
      var txt = clean(card.listName).toUpperCase();
      var maxW = w - 2 - 2.4;
      while (txt.length > 1 && doc.getTextWidth(txt) > maxW) txt = txt.slice(0, -1);
      var cwid = doc.getTextWidth(txt) + 2.4;
      doc.setFillColor(col); doc.roundedRect(x + 1, ty, cwid, 2.6, 1.3, 1.3, 'F');
      doc.setTextColor(cdfTextOn(col));
      doc.text(txt, x + 1 + 1.2, ty + 1.3, { baseline: 'middle' });
    }
  }

  // Mesure de toutes les planches
  var items = cells.map(function (cell, i) {
    var zones = cell.pages.length === 1
      ? [{ zone: 'single', w: cw - 2 * PAD, page: cell.pages[0] }]
      : (function () {
          var side = (cw - 2 * PAD - 2 * ZGAP - BOTH_W) / 2;
          return [
            { zone: 'left', w: side, page: cell.pages[0] },
            { zone: 'both', w: BOTH_W, page: null },
            { zone: 'right', w: side, page: cell.pages[1] }
          ];
        })();
    var maxZoneH = 14;
    zones.forEach(function (z) {
      z.cards = (byLoc[i + '|' + z.zone] || []).map(function (c) {
        return { card: c, m: measure(c, z.w - 2) };
      });
      z.h = 2 + z.cards.reduce(function (acc, e) { return acc + e.m.h + 1; }, 0);
      maxZoneH = Math.max(maxZoneH, z.h);
    });
    return { cell: cell, i: i, zones: zones, zoneH: maxZoneH, h: PAD + BAR_H + 1 + maxZoneH + FOOT_H + PAD };
  });

  // En-tête (titre, dates, remplissage)
  var y = M + 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor('#172b4d');
  doc.text(clean(currentMeta.title) || 'Chemin de fer', M, y);
  var parts = [];
  if (currentMeta.closingDate) parts.push('Bouclage : ' + formatDate(currentMeta.closingDate));
  if (currentMeta.distributionDate) parts.push('Distribution : ' + formatDate(currentMeta.distributionDate));
  if (fillStatEl && fillStatEl.textContent) parts.push('Remplissage : ' + fillStatEl.textContent);
  if (parts.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor('#5e6c84');
    y += 6; doc.text(parts.join('   |   '), M, y);
  }
  y += 6;

  // Lignes de planches
  for (var r = 0; r < items.length; r += cols) {
    var row = items.slice(r, r + cols);
    var rowH = Math.max.apply(null, row.map(function (it) { return it.h; }));
    if (y + rowH > H - M - 6 && y > M + 30) { doc.addPage(); y = M; }
    row.forEach(function (it, k) {
      var x = M + k * (cw + GAP);
      doc.setFillColor('#ffffff'); doc.setDrawColor('#dfe1e6'); doc.setLineWidth(0.2);
      doc.roundedRect(x, y, cw, rowH, 1.2, 1.2, 'FD');

      var rub = currentRubriques[String(it.i)] || {};
      var barColor = rub.color || '#eef0f3';
      doc.setFillColor(barColor); doc.roundedRect(x + PAD, y + PAD, cw - 2 * PAD, BAR_H, 1, 1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor('#5e6c84');
      doc.text(it.cell.label, x + PAD + 1.2, y + PAD + BAR_H / 2, { baseline: 'middle' });
      var lw = doc.getTextWidth(it.cell.label);
      if (rub.title) {
        doc.setFontSize(7.5); doc.setTextColor(cdfTextOn(barColor));
        var tt = clean(rub.title), maxT = cw - 2 * PAD - lw - 5;
        while (tt.length > 1 && doc.getTextWidth(tt) > maxT) tt = tt.slice(0, -1);
        doc.text(tt, x + PAD + 1.2 + lw + 2, y + PAD + BAR_H / 2, { baseline: 'middle' });
      }

      var zx = x + PAD, zy = y + PAD + BAR_H + 1;
      it.zones.forEach(function (z) {
        doc.setLineWidth(0.15);
        if (z.zone === 'both') {
          doc.setFillColor('#eef3fb'); doc.setDrawColor('#8fb3dc'); doc.setLineDashPattern([0.8, 0.8], 0);
        } else {
          doc.setFillColor('#fafbfc'); doc.setDrawColor('#dfe1e6'); doc.setLineDashPattern([], 0);
        }
        doc.roundedRect(zx, zy, z.w, it.zoneH, 0.8, 0.8, 'FD');
        doc.setLineDashPattern([], 0);
        var cy = zy + 1;
        z.cards.forEach(function (e) {
          drawCard(e.card, e.m, zx + 1, cy, z.w - 2);
          cy += e.m.h + 1;
        });
        if (z.page) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor('#97a0af');
          doc.text('P.' + z.page, zx + z.w / 2, zy + it.zoneH + FOOT_H / 2, { align: 'center', baseline: 'middle' });
        }
        zx += z.w + ZGAP;
      });
    });
    y += rowH + GAP;
  }

  var n = doc.internal.getNumberOfPages();
  for (var i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#8993a4');
    doc.text('Page ' + i + ' / ' + n, W - M, H - 5, { align: 'right' });
  }
  return doc;
}

exportBtn.addEventListener('click', function () {
  setStatus('Génération du PDF…');
  setTimeout(function () {
    try {
      var doc = exportPdf();
      var filename = (currentMeta.title ? currentMeta.title.replace(/[^a-z0-9\-_]+/gi, '_') : 'chemin-de-fer') + '.pdf';
      doc.save(filename);
      setStatus('PDF exporté');
    } catch (err) {
      console.error(err);
      setStatus('Erreur export PDF');
    }
  }, 30);
});

// --- Nouveau chemin de fer (archivage figé dans l'historique + reset) ---

function isQuotaError(err) {
  return /exceed|length|too (large|long)/i.test(String(err && err.message ? err.message : err));
}

// Enregistre l'instantané + l'index d'historique. Si Trello refuse (limite de 8192
// caractères pour tout le tableau), on supprime les plus anciens archives un à un
// jusqu'à ce que ça passe ; en dernier recours on garde juste titre + dates.
function storeArchive(entry, snapshot) {
  function attempt(withSnapshot) {
    var history = currentHistory.concat([entry]);
    var p = withSnapshot ? cdfSaveIssueSnapshot(t, entry.id, snapshot) : Promise.resolve();
    return p.then(function () {
      return cdfSaveHistory(t, history);
    }).then(function () {
      currentHistory = history;
      return { pruned: 0 };
    });
  }
  function dropOldestThen(retry, pruned) {
    var oldest = currentHistory[0];
    var rest = currentHistory.slice(1);
    return cdfRemoveIssueSnapshot(t, oldest.id).then(function () {
      return cdfSaveHistory(t, rest);
    }).then(function () {
      currentHistory = rest;
      return retry(pruned + 1);
    });
  }
  function run(pruned) {
    return attempt(true).then(function (r) { r.pruned = pruned; return r; }).catch(function (err) {
      if (!isQuotaError(err)) throw err;
      cdfRemoveIssueSnapshot(t, entry.id);
      if (currentHistory.length) return dropOldestThen(run, pruned);
      // Plus rien à supprimer : on garde seulement titre + dates (sans la grille)
      return attempt(false).then(function (r) { r.pruned = pruned; r.light = true; return r; });
    });
  }
  return run(0);
}

function archiveCurrentAndReset(newTitle, base) {
  setStatus('Archivage…');

  // Le PDF du numéro qui se termine est téléchargé automatiquement : c'est l'archive complète.
  try {
    var pdfDoc = exportPdf();
    pdfDoc.save((currentMeta.title ? currentMeta.title.replace(/[^a-z0-9\-_]+/gi, '_') : 'chemin-de-fer') + '.pdf');
  } catch (e) {
    console.error('PDF d\'archive non généré', e);
  }

  var issueId = 'issue-' + Date.now();
  // Instantané compact : seules les cartes placées sont conservées, noms raccourcis
  var placedIds = {};
  ((currentLayout && currentLayout.placements) || []).forEach(function (p) {
    if (p.loc && p.loc !== 'unassigned') placedIds[p.id] = true;
  });
  var compactCards = currentCards.filter(function (c) { return placedIds[c.id]; }).map(function (c) {
    return { i: c.id, n: String(c.name).slice(0, 60), c: (c.labels || []).map(function (l) { return l.color; }) };
  });
  var snapshot = {
    config: currentConfig,
    layout: {
      placements: ((currentLayout && currentLayout.placements) || []).filter(function (p) {
        return p.loc && p.loc !== 'unassigned';
      })
    },
    rubriques: currentRubriques,
    cardsSnapshot: compactCards
  };
  var entry = {
    id: issueId,
    title: currentMeta.title || 'Sans titre',
    closingDate: currentMeta.closingDate || '',
    distributionDate: currentMeta.distributionDate || '',
    savedAt: new Date().toISOString()
  };

  var archiveResult = null;
  return storeArchive(entry, snapshot).then(function (r) {
    archiveResult = r;
    return null;
  }).then(function () {
    if (base === 'scratch') {
      currentConfig = JSON.parse(JSON.stringify(CDF_DEFAULT_CONFIG));
      currentRubriques = {};
    }
    // si base === 'template' : la pagination (currentConfig) ET les rubriques
    // (titres + couleurs) sont conservées telles quelles, seule la disposition
    // des cartes (currentLayout) est remise à zéro pour le nouveau numéro.
    currentLayout = { assignments: {} };
    currentMeta = { title: newTitle, closingDate: '', distributionDate: '' };

    return Promise.all([
      cdfSaveConfig(t, currentConfig),
      cdfSaveLayout(t, currentLayout),
      cdfSaveRubriques(t, currentRubriques),
      cdfSaveMeta(t, currentMeta)
    ]);
  }).then(function () {
    populateMetaInputs();
    return loadCards();
  }).then(function () {
    fullRender();
    newOverlay.classList.remove('cdf-overlay-visible');
    var note = '';
    if (archiveResult && archiveResult.light) note = ' — grille trop volumineuse pour l’historique : seul le PDF fait foi';
    else if (archiveResult && archiveResult.pruned) note = ' — ' + archiveResult.pruned + ' ancienne(s) archive(s) supprimée(s) (limite Trello)';
    setStatus('Nouveau chemin de fer créé' + note);
  }).catch(function (err) {
    console.error(err);
    setStatus('Erreur : ' + (err && err.message ? err.message : 'échec'));
  });
}

newBtn.addEventListener('click', function () {
  newCurrentTitleSpan.textContent = currentMeta.title || 'Sans titre';
  newTitleInput.value = '';
  newBaseSelect.value = 'template';
  newOverlay.classList.add('cdf-overlay-visible');
});

newCancelBtn.addEventListener('click', function () {
  newOverlay.classList.remove('cdf-overlay-visible');
});

newConfirmBtn.addEventListener('click', function () {
  var newTitle = newTitleInput.value.trim();
  if (!newTitle) {
    setStatus('Titre requis');
    return;
  }
  archiveCurrentAndReset(newTitle, newBaseSelect.value);
});

// --- Historique figé (consultation seule) ---

function renderHistoryList() {
  historyListEl.innerHTML = '';
  if (!currentHistory.length) {
    historyListEl.innerHTML = '<li class="cdf-history-empty">Aucun chemin de fer archivé pour l’instant.</li>';
    return;
  }
  currentHistory.slice().reverse().forEach(function (entry) {
    var li = document.createElement('li');
    li.className = 'cdf-history-item';
    var dates = [];
    if (entry.closingDate) dates.push('Bouclage ' + formatDate(entry.closingDate));
    if (entry.distributionDate) dates.push('Distribution ' + formatDate(entry.distributionDate));
    li.innerHTML =
      '<div class="cdf-history-item-info">' +
        '<strong>' + escapeHtml(entry.title) + '</strong>' +
        '<span>' + escapeHtml(dates.join(' · ')) + '</span>' +
      '</div>' +
      '<button class="mod-secondary cdf-history-view-btn">Consulter</button>';
    li.querySelector('.cdf-history-view-btn').addEventListener('click', function () {
      showHistoryDetail(entry);
    });
    historyListEl.appendChild(li);
  });
}

function showHistoryDetail(entry) {
  historyDetailTitle.textContent = 'Chargement…';
  historyDetailDates.textContent = '';
  historyDetailGrid.innerHTML = '';
  historyListView.style.display = 'none';
  historyDetailView.style.display = 'block';

  cdfGetIssueSnapshot(t, entry.id).then(function (snapshot) {
    if (!snapshot) {
      historyDetailTitle.textContent = entry.title;
      historyDetailDates.textContent = 'Instantané introuvable (données manquantes ou expirées).';
      return;
    }
    historyDetailTitle.textContent = entry.title;
    var dates = [];
    if (entry.closingDate) dates.push('Bouclage : ' + formatDate(entry.closingDate));
    if (entry.distributionDate) dates.push('Distribution : ' + formatDate(entry.distributionDate));
    historyDetailDates.textContent = dates.join(' — ');

    var cardsForRender = (snapshot.cardsSnapshot || []).map(function (c) {
      return {
        id: c.i,
        name: c.n,
        labels: (c.c || []).map(function (color) { return { color: color, name: '' }; })
      };
    });

    var cells = buildGridInto(historyDetailGrid, snapshot.config, snapshot.rubriques || {}, false);
    renderCardsInto(historyDetailGrid, cells, cdfNormalizeLayout(snapshot.layout || {}), cardsForRender, null, false);
  });
}

historyBtn.addEventListener('click', function () {
  renderHistoryList();
  historyListView.style.display = 'block';
  historyDetailView.style.display = 'none';
  historyOverlay.classList.add('cdf-overlay-visible');
});

historyCloseBtn.addEventListener('click', function () {
  historyOverlay.classList.remove('cdf-overlay-visible');
});

historyClearBtn.addEventListener('click', function () {
  if (!currentHistory.length) return;
  var confirmed = window.confirm('Supprimer définitivement tout l’historique des ' + currentHistory.length + ' chemin(s) de fer archivé(s) ? Cette action est irréversible.');
  if (!confirmed) return;

  var toDelete = currentHistory.slice();
  Promise.all(toDelete.map(function (entry) {
    return cdfRemoveIssueSnapshot(t, entry.id);
  })).then(function () {
    currentHistory = [];
    return cdfSaveHistory(t, currentHistory);
  }).then(function () {
    renderHistoryList();
    setStatus('Historique supprimé');
  }).catch(function (err) {
    console.error(err);
    setStatus('Erreur lors de la suppression');
  });
});

historyBackBtn.addEventListener('click', function () {
  historyDetailView.style.display = 'none';
  historyListView.style.display = 'block';
});

init();
