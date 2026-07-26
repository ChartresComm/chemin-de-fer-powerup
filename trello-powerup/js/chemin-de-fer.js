// chemin-de-fer.js

/* global TrelloPowerUp, Sortable, CDF_TEMPLATES */

var t = TrelloPowerUp.iframe();

var gridEl = document.getElementById('cdf-grid');
var unassignedListEl = document.getElementById('unassigned-list');
var statusEl = document.getElementById('cdf-status');
var refreshBtn = document.getElementById('cdf-refresh');

var currentConfig = null;
var currentLayout = null;
var currentCards = []; // toutes les cartes non archivées du tableau

function setStatus(msg) {
  statusEl.textContent = msg;
  if (msg) {
    setTimeout(function () {
      if (statusEl.textContent === msg) statusEl.textContent = '';
    }, 2000);
  }
}

function cardLabelDots(card) {
  if (!card.labels || !card.labels.length) return '';
  return card.labels.map(function (l) {
    var color = l.color || '#ccc';
    return '<span class="cdf-label-dot" style="background:' + colorToHex(color) + '" title="' + escapeHtml(l.name || '') + '"></span>';
  }).join('');
}

// Trello renvoie des noms de couleurs (green, yellow, orange, red, purple, blue, sky, lime, pink, black...)
var TRELLO_COLORS = {
  green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
  purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
  pink: '#ff78cb', black: '#4d4d4d'
};
function colorToHex(name) {
  return TRELLO_COLORS[name] || '#ddd';
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderCardEl(card) {
  var li = document.createElement('li');
  li.className = 'cdf-card';
  li.setAttribute('data-id', card.id);
  li.innerHTML =
    '<div class="cdf-card-labels">' + cardLabelDots(card) + '</div>' +
    '<div class="cdf-card-name">' + escapeHtml(card.name) + '</div>';
  return li;
}

function buildGrid() {
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = 'repeat(' + currentConfig.columns + ', 1fr)';

  for (var i = 0; i < currentConfig.spreads; i++) {
    var cell = document.createElement('div');
    cell.className = 'cdf-cell';

    var h = document.createElement('div');
    h.className = 'cdf-cell-header';
    h.textContent = 'Planche ' + (i + 1);
    cell.appendChild(h);

    var ul = document.createElement('ul');
    ul.className = 'cdf-card-list';
    ul.setAttribute('data-spread', String(i));
    cell.appendChild(ul);

    gridEl.appendChild(cell);
  }
}

function renderCards() {
  // Nettoie toutes les listes
  unassignedListEl.innerHTML = '';
  document.querySelectorAll('.cdf-grid .cdf-card-list').forEach(function (ul) {
    ul.innerHTML = '';
  });

  var assignments = currentLayout.assignments || {};

  currentCards.forEach(function (card) {
    var spreadIndex = assignments[card.id];
    var targetList;
    if (spreadIndex === undefined || spreadIndex === null || spreadIndex >= currentConfig.spreads) {
      targetList = unassignedListEl;
    } else {
      targetList = document.querySelector('.cdf-grid .cdf-card-list[data-spread="' + spreadIndex + '"]');
    }
    if (targetList) {
      targetList.appendChild(renderCardEl(card));
    }
  });
}

function initSortable() {
  var allLists = document.querySelectorAll('.cdf-card-list');
  allLists.forEach(function (ul) {
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
  document.querySelectorAll('.cdf-grid .cdf-card-list').forEach(function (ul) {
    var spreadIndex = parseInt(ul.getAttribute('data-spread'), 10);
    ul.querySelectorAll('.cdf-card').forEach(function (li) {
      assignments[li.getAttribute('data-id')] = spreadIndex;
    });
  });
  // Les cartes restées dans la colonne "non placées" ne sont pas ajoutées :
  // leur absence de assignments les fait retomber côté non placé au prochain rendu.

  currentLayout = { assignments: assignments };
  cdfSaveLayout(t, currentLayout).then(function () {
    setStatus('Enregistré');
  }).catch(function () {
    setStatus('Erreur de sauvegarde');
  });
}

function loadCards() {
  return t.cards('id', 'name', 'labels', 'closed').then(function (cards) {
    currentCards = cards.filter(function (c) { return !c.closed; });
  });
}

function fullRender() {
  buildGrid();
  renderCards();
  initSortable();
  t.sizeTo('body');
}

function init() {
  Promise.all([cdfGetConfig(t), cdfGetLayout(t), loadCards()]).then(function (res) {
    currentConfig = res[0];
    currentLayout = res[1];
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

init();
