// chemin-de-fer.js

/* global TrelloPowerUp, Sortable, html2canvas, jspdf */

var t = TrelloPowerUp.iframe();

var gridEl = document.getElementById('cdf-grid');
var unassignedListEl = document.getElementById('unassigned-list');
var statusEl = document.getElementById('cdf-status');
var refreshBtn = document.getElementById('cdf-refresh');
var exportBtn = document.getElementById('cdf-export');

var titleInput = document.getElementById('cdf-title');
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
  li.innerHTML =
    '<div class="cdf-card-labels">' + cardLabelDots(card) + '</div>' +
    '<div class="cdf-card-name">' + escapeHtml(card.name) + '</div>';

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
  }

  return li;
}

function duplicateCard(card) {
  unassignedListEl.appendChild(renderCardEl(card, true));
  saveLayoutFromDom();
  setStatus('Copie créée — glisse-la sur la planche voulue');
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

    var saved = rubriques[String(i)] || {};

    var rubriqueBar = document.createElement('div');
    rubriqueBar.className = 'cdf-rubrique';
    rubriqueBar.style.background = saved.color || '#eef0f3';

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
  currentCells = buildGridInto(gridEl, currentConfig, currentRubriques, true);
}

function renderCards() {
  renderCardsInto(gridEl, currentCells, currentLayout, currentCards, unassignedListEl, true);
}

function initSortable() {
  document.querySelectorAll('#cdf-grid .cdf-card-list, #unassigned-list').forEach(function (ul) {
    Sortable.create(ul, {
      group: 'cdf-cards',
      animation: 150,
      ghostClass: 'cdf-card-ghost',
      onEnd: saveLayoutFromDom
    });
  });
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
    var normalize = function (s) {
      s = (s || '').trim().toLowerCase();
      try {
        return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      } catch (e) {
        return s; // repli si normalize()/Unicode property escapes indisponibles dans ce contexte
      }
    };
    var targetName = normalize(currentConfig.archivedListName || 'Archivées');
    var archivedIds = lists.filter(function (l) {
      return normalize(l.name) === targetName;
    }).map(function (l) { return l.id; });

    return t.cards('id', 'name', 'labels', 'closed', 'idList').then(function (cards) {
      currentCards = cards.filter(function (c) {
        return !c.closed && archivedIds.indexOf(c.idList) === -1;
      });
    });
  }).catch(function (err) {
    // Filet de secours : même en cas de souci imprévu, on affiche au moins
    // toutes les cartes non archivées plutôt que de bloquer toute la vue.
    console.error('loadCards error, repli sur t.cards() simple :', err);
    return t.cards('id', 'name', 'labels', 'closed').then(function (cards) {
      currentCards = cards.filter(function (c) { return !c.closed; });
    });
  });
}

function fullRender() {
  buildGrid();
  renderCards();
  initSortable();
}

function init() {
  Promise.all([
    cdfGetConfig(t), cdfGetLayout(t), cdfGetRubriques(t), cdfGetMeta(t), cdfGetHistory(t)
  ]).then(function (res) {
    currentConfig = res[0];
    currentLayout = res[1];
    currentRubriques = res[2] || {};
    currentMeta = res[3] || {};
    currentHistory = res[4] || [];
    populateMetaInputs();
    return loadCards();
  }).then(function () {
    fullRender();
  }).catch(function (err) {
    console.error('Erreur au chargement du chemin de fer :', err);
    setStatus('Erreur au chargement — voir la console');
  });
}

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

function buildExportContainer() {
  var wrap = document.createElement('div');
  wrap.style.position = 'fixed';
  wrap.style.top = '-99999px';
  wrap.style.left = '0';
  wrap.style.background = '#ffffff';
  wrap.style.padding = '20px';
  wrap.style.width = gridEl.scrollWidth + 'px';
  wrap.style.fontFamily = getComputedStyle(document.body).fontFamily;

  var h1 = document.createElement('div');
  h1.style.fontSize = '20px';
  h1.style.fontWeight = '700';
  h1.style.marginBottom = '4px';
  h1.textContent = currentMeta.title || 'Chemin de fer';
  wrap.appendChild(h1);

  var dateParts = [];
  if (currentMeta.closingDate) dateParts.push('Bouclage : ' + formatDate(currentMeta.closingDate));
  if (currentMeta.distributionDate) dateParts.push('Distribution : ' + formatDate(currentMeta.distributionDate));
  if (dateParts.length) {
    var datesLine = document.createElement('div');
    datesLine.style.fontSize = '13px';
    datesLine.style.color = '#5e6c84';
    datesLine.style.marginBottom = '16px';
    datesLine.textContent = dateParts.join('   •   ');
    wrap.appendChild(datesLine);
  }

  wrap.appendChild(gridEl.cloneNode(true));
  document.body.appendChild(wrap);
  return wrap;
}

function generateGridCanvas() {
  var wrap = buildExportContainer();
  return html2canvas(wrap, { backgroundColor: '#ffffff', scale: 2 }).then(function (canvas) {
    document.body.removeChild(wrap);
    return canvas;
  }).catch(function (err) {
    if (wrap.parentNode) document.body.removeChild(wrap);
    throw err;
  });
}

function buildPdfFromCanvas(canvas) {
  var pdf = new jspdf.jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
  return pdf;
}

exportBtn.addEventListener('click', function () {
  setStatus('Génération du PDF…');
  generateGridCanvas().then(function (canvas) {
    var pdf = buildPdfFromCanvas(canvas);
    var filename = (currentMeta.title ? currentMeta.title.replace(/[^a-z0-9\-_]+/gi, '_') : 'chemin-de-fer') + '.pdf';
    pdf.save(filename);
    setStatus('PDF exporté');
  }).catch(function (err) {
    console.error(err);
    setStatus('Erreur export PDF');
  });
});

// --- Nouveau chemin de fer (archivage figé dans l'historique + reset) ---

function archiveCurrentAndReset(newTitle, base) {
  setStatus('Archivage…');

  var issueId = 'issue-' + Date.now();
  var compactCards = currentCards.map(function (c) {
    return { i: c.id, n: c.name, c: (c.labels || []).map(function (l) { return l.color; }) };
  });
  var snapshot = {
    config: currentConfig,
    layout: currentLayout,
    rubriques: currentRubriques,
    cardsSnapshot: compactCards
  };

  return cdfSaveIssueSnapshot(t, issueId, snapshot).then(function () {
    currentHistory = currentHistory.concat([{
      id: issueId,
      title: currentMeta.title || 'Sans titre',
      closingDate: currentMeta.closingDate || '',
      distributionDate: currentMeta.distributionDate || '',
      savedAt: new Date().toISOString()
    }]);
    return cdfSaveHistory(t, currentHistory);
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
    setStatus('Nouveau chemin de fer créé');
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
