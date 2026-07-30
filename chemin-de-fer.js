// chemin-de-fer.js

/* global TrelloPowerUp, Sortable, html2canvas, jspdf */

var t = TrelloPowerUp.iframe();

var gridEl = document.getElementById('cdf-grid');
var unassignedListEl = document.getElementById('unassigned-list');
var statusEl = document.getElementById('cdf-status');
var refreshBtn = document.getElementById('cdf-refresh');
var exportBtn = document.getElementById('cdf-export');
var authorizeBtn = document.getElementById('cdf-authorize');

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
var customFieldDefs = [];

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

function findStatus(card) {
  if (!customFieldDefs.length || !card.customFieldItems || !card.customFieldItems.length) return null;
  var targetName = (currentConfig.statusFieldName || 'Statut').trim().toLowerCase();
  var fieldDef = customFieldDefs.filter(function (f) {
    return f.name && f.name.trim().toLowerCase() === targetName;
  })[0];
  if (!fieldDef) return null;

  var item = card.customFieldItems.filter(function (it) {
    return it.idCustomField === fieldDef.id;
  })[0];
  if (!item) return null;

  if (fieldDef.type === 'list' && item.idValue && fieldDef.options) {
    var opt = fieldDef.options.filter(function (o) { return o.id === item.idValue; })[0];
    if (!opt) return null;
    return { text: (opt.value && opt.value.text) || '', color: cdfColorToHex(opt.color) };
  }
  if (item.value) {
    var text = item.value.text;
    if (text === undefined) text = item.value.number;
    if (text === undefined && item.value.checked !== undefined) text = item.value.checked ? 'Oui' : 'Non';
    if (text === undefined) text = item.value.date;
    return { text: text, color: '#dfe1e6' };
  }
  return null;
}

function memberChipsHtml(card) {
  var members = card.members || [];
  if (!members.length) return '';
  return '<div class="cdf-card-members">' + members.map(function (m) {
    var initials = m.initials;
    if (!initials && m.fullName) {
      initials = m.fullName.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
    }
    initials = initials || '?';
    return '<span class="cdf-member-chip" style="background:' + cdfHashColor(m.id || initials) +
      '" title="' + escapeHtml(m.fullName || '') + '">' + escapeHtml(initials) + '</span>';
  }).join('') + '</div>';
}

function renderCardEl(card) {
  var li = document.createElement('li');
  li.className = 'cdf-card';
  li.setAttribute('data-id', card.id);

  var status = findStatus(card);
  var statusHtml = (status && status.text)
    ? '<span class="cdf-status-pill" style="background:' + status.color + '">' + escapeHtml(status.text) + '</span>'
    : '';

  li.innerHTML =
    '<div class="cdf-card-top-row">' +
      '<div class="cdf-card-labels">' + cardLabelDots(card) + '</div>' +
      statusHtml +
    '</div>' +
    '<div class="cdf-card-name">' + escapeHtml(card.name) + '</div>' +
    memberChipsHtml(card);
  return li;
}

// --- Construction générique d'une grille (utilisée pour la vue live ET l'historique figé) ---

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

    var titleSpan = document.createElement('span');
    titleSpan.className = 'cdf-rubrique-title';
    titleSpan.textContent = saved.title || '';
    if (interactive) {
      titleSpan.contentEditable = 'true';
      titleSpan.setAttribute('data-placeholder', 'Rubrique…');
      titleSpan.addEventListener('blur', function () {
        saveRubrique(i, 'title', titleSpan.textContent.trim());
      });
    }
    rubriqueBar.appendChild(titleSpan);

    if (interactive) {
      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'cdf-rubrique-color';
      colorInput.value = saved.color || '#eef0f3';
      colorInput.addEventListener('change', function () {
        rubriqueBar.style.background = colorInput.value;
        saveRubrique(i, 'color', colorInput.value);
      });
      rubriqueBar.appendChild(colorInput);
    }

    var pagesRow = document.createElement('div');
    pagesRow.className = 'cdf-pages-row ' + (cell.pages.length === 2 ? 'cdf-pages-pair' : 'cdf-pages-single');
    cell.pages.forEach(function (pageNum) {
      var pageBox = document.createElement('div');
      pageBox.className = 'cdf-page-box';
      pageBox.textContent = 'P.' + pageNum;
      pagesRow.appendChild(pageBox);
    });

    var ul = document.createElement('ul');
    ul.className = 'cdf-card-list';
    ul.setAttribute('data-spread', String(i));

    cellDiv.appendChild(rubriqueBar);
    cellDiv.appendChild(pagesRow);
    cellDiv.appendChild(ul);
    container.appendChild(cellDiv);
  });

  return cells;
}

function renderCardsInto(container, cells, layout, cards, unassignedContainer) {
  if (unassignedContainer) unassignedContainer.innerHTML = '';
  container.querySelectorAll('.cdf-card-list').forEach(function (ul) { ul.innerHTML = ''; });

  var assignments = (layout && layout.assignments) || {};
  cards.forEach(function (card) {
    var idx = assignments[card.id];
    var targetList;
    if (idx === undefined || idx === null || idx >= cells.length) {
      targetList = unassignedContainer;
    } else {
      targetList = container.querySelector('.cdf-card-list[data-spread="' + idx + '"]');
    }
    if (targetList) targetList.appendChild(renderCardEl(card));
  });
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
  renderCardsInto(gridEl, currentCells, currentLayout, currentCards, unassignedListEl);
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
  var assignments = {};
  gridEl.querySelectorAll('.cdf-card-list').forEach(function (ul) {
    var idx = parseInt(ul.getAttribute('data-spread'), 10);
    ul.querySelectorAll('.cdf-card').forEach(function (li) {
      assignments[li.getAttribute('data-id')] = idx;
    });
  });
  currentLayout = { assignments: assignments };
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

function loadCardsBasic() {
  return t.cards('id', 'name', 'labels', 'closed', 'idList').then(function (cards) {
    currentCards = cards.filter(function (c) { return !c.closed; });
    customFieldDefs = [];
  });
}

function loadCardsViaRest() {
  return t.board('id').then(function (board) {
    return Promise.all([
      cdfRestGet(t, '/boards/' + board.id + '/customFields'),
      cdfRestGet(t, '/boards/' + board.id + '/cards?customFieldItems=true&members=true&member_fields=initials,fullName&fields=id,name,labels,closed,idList')
    ]);
  }).then(function (res) {
    customFieldDefs = res[0];
    currentCards = res[1].filter(function (c) { return !c.closed; });
  }).catch(function () {
    setStatus('Erreur champs personnalisés — mode simplifié');
    return loadCardsBasic();
  });
}

function loadCards() {
  return Promise.all([
    t.lists('id', 'name').catch(function () { return []; }),
    cdfIsAuthorized(t)
  ]).then(function (res) {
    var lists = res[0] || [];
    var authorized = res[1];
    authorizeBtn.style.display = authorized ? 'none' : 'inline-block';

    var targetName = (currentConfig.archivedListName || 'Archivées').trim().toLowerCase();
    var archivedIds = lists.filter(function (l) {
      return l.name && l.name.trim().toLowerCase() === targetName;
    }).map(function (l) { return l.id; });

    var cardsPromise = authorized ? loadCardsViaRest() : loadCardsBasic();
    return cardsPromise.then(function () {
      if (archivedIds.length) {
        currentCards = currentCards.filter(function (c) {
          return archivedIds.indexOf(c.idList) === -1;
        });
      }
    });
  });
}

function fullRender() {
  buildGrid();
  renderCards();
  initSortable();
  t.sizeTo('body');
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
  });
}

refreshBtn.addEventListener('click', function () {
  loadCards().then(function () {
    renderCards();
    initSortable();
    setStatus('Cartes actualisées');
  });
});

authorizeBtn.addEventListener('click', function () {
  cdfAuthorize(t).then(function () {
    return loadCards();
  }).then(function () {
    renderCards();
    initSortable();
    setStatus('Autorisé');
  }).catch(function () {
    setStatus('Autorisation annulée');
  });
});

function generateGridCanvas() {
  return html2canvas(gridEl, { backgroundColor: '#ffffff', scale: 2 });
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
  }).catch(function () {
    setStatus('Erreur export PDF');
  });
});

// --- Nouveau chemin de fer (archive figée + reset) ---

newBtn.addEventListener('click', function () {
  newCurrentTitleSpan.textContent = currentMeta.title || 'Sans titre';
  newTitleInput.value = '';
  newBaseSelect.value = 'template';
  newOverlay.classList.add('cdf-overlay-visible');
});

newCancelBtn.addEventListener('click', function () {
  newOverlay.classList.remove('cdf-overlay-visible');
});

function buildEditionCardDescription(meta) {
  var lines = ['Chemin de fer archivé automatiquement par le Power-Up.'];
  if (meta.closingDate) lines.push('Bouclage : ' + formatDate(meta.closingDate));
  if (meta.distributionDate) lines.push('Distribution : ' + formatDate(meta.distributionDate));
  lines.push('Le PDF joint reflète la disposition au moment de l’archivage. Pour le détail interactif, ouvrir le Power-Up « Chemin de fer » > Historique.');
  return lines.join('\n');
}

function archiveCurrentAsCardAndReset(newTitle, base) {
  setStatus('Autorisation…');
  return cdfAuthorize(t).then(function () {
    setStatus('Création de la carte d’édition…');
    return t.board('id');
  }).then(function (board) {
    return cdfFindOrCreateList(t, board.id, currentConfig.editionsListName || 'Éditions');
  }).then(function (listId) {
    var desc = buildEditionCardDescription(currentMeta);
    var name = currentMeta.title || 'Sans titre';
    return cdfRestPost(t, '/cards?idList=' + listId + '&name=' + encodeURIComponent(name) + '&desc=' + encodeURIComponent(desc));
  }).then(function (card) {
    setStatus('Export du PDF…');
    return generateGridCanvas().then(function (canvas) {
      var pdf = buildPdfFromCanvas(canvas);
      var blob = pdf.output('blob');
      var filename = (currentMeta.title ? currentMeta.title.replace(/[^a-z0-9\-_]+/gi, '_') : 'chemin-de-fer') + '.pdf';
      return cdfRestPostAttachment(t, card.id, blob, filename).then(function () { return card; });
    });
  }).then(function (card) {
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
        savedAt: new Date().toISOString(),
        trelloCardId: card.id,
        trelloCardUrl: card.shortUrl || card.url || null
      }]);
      return cdfSaveHistory(t, currentHistory);
    });
  }).then(function () {
    if (base === 'scratch') {
      currentConfig = JSON.parse(JSON.stringify(CDF_DEFAULT_CONFIG));
    }
    currentLayout = { assignments: {} };
    currentRubriques = {};
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

newConfirmBtn.addEventListener('click', function () {
  var newTitle = newTitleInput.value.trim();
  if (!newTitle) {
    setStatus('Titre requis');
    return;
  }
  archiveCurrentAsCardAndReset(newTitle, newBaseSelect.value);
});

// --- Historique figé (consultation seule) ---

function formatDate(d) {
  if (!d) return '';
  var parts = d.split('-');
  if (parts.length !== 3) return d;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

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
    var linkHtml = entry.trelloCardUrl
      ? ' · <a href="' + escapeHtml(entry.trelloCardUrl) + '" target="_blank" rel="noopener">Voir la carte Trello</a>'
      : '';
    li.innerHTML =
      '<div class="cdf-history-item-info">' +
        '<strong>' + escapeHtml(entry.title) + '</strong>' +
        '<span>' + escapeHtml(dates.join(' · ')) + linkHtml + '</span>' +
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

    // Le format compact ({i,n,c}) est reconverti en objets carte pour réutiliser renderCardEl
    var cardsForRender = (snapshot.cardsSnapshot || []).map(function (c) {
      return {
        id: c.i,
        name: c.n,
        labels: (c.c || []).map(function (color) { return { color: color, name: '' }; })
      };
    });

    var cells = buildGridInto(historyDetailGrid, snapshot.config, snapshot.rubriques || {}, false);
    renderCardsInto(historyDetailGrid, cells, snapshot.layout, cardsForRender, null);
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

historyBackBtn.addEventListener('click', function () {
  historyDetailView.style.display = 'none';
  historyListView.style.display = 'block';
});

init();
