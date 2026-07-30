// settings.js

/* global TrelloPowerUp */

var t = TrelloPowerUp.iframe();

var templateSelect = document.getElementById('template');
var totalPagesInput = document.getElementById('totalPages');
var columnsInput = document.getElementById('columns');
var startPageInput = document.getElementById('startPage');
var archivedListNameInput = document.getElementById('archivedListName');
var form = document.getElementById('settings-form');

Object.keys(CDF_TEMPLATES).forEach(function (key) {
  var opt = document.createElement('option');
  opt.value = key;
  opt.textContent = CDF_TEMPLATES[key].label;
  templateSelect.appendChild(opt);
});

// Choisir un modèle préremplit juste les champs ci-dessous, qui restent
// modifiables librement ensuite quel que soit le modèle sélectionné.
templateSelect.addEventListener('change', function () {
  var tpl = CDF_TEMPLATES[templateSelect.value];
  totalPagesInput.value = tpl.totalPages;
  columnsInput.value = tpl.columns;
});

cdfGetConfig(t).then(function (config) {
  templateSelect.value = config.template || 'chartres-metropole-60p';
  totalPagesInput.value = config.totalPages;
  columnsInput.value = config.columns;
  startPageInput.value = config.startPage || 1;
  archivedListNameInput.value = config.archivedListName || 'Archivées';
  t.sizeTo('#settings-form');
});

form.addEventListener('submit', function (e) {
  e.preventDefault();

  var newConfig = {
    template: templateSelect.value,
    totalPages: parseInt(totalPagesInput.value, 10) || CDF_DEFAULT_CONFIG.totalPages,
    columns: parseInt(columnsInput.value, 10) || CDF_DEFAULT_CONFIG.columns,
    startPage: parseInt(startPageInput.value, 10) || 1,
    archivedListName: (archivedListNameInput.value || 'Archivées').trim()
  };

  cdfSaveConfig(t, newConfig).then(function () {
    t.closePopup();
  });
});
