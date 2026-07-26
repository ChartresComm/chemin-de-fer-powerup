// settings.js

/* global TrelloPowerUp */

var t = TrelloPowerUp.iframe();

var templateSelect = document.getElementById('template');
var customFields = document.getElementById('custom-fields');
var spreadsInput = document.getElementById('spreads');
var columnsInput = document.getElementById('columns');
var form = document.getElementById('settings-form');

// Remplit la liste déroulante des modèles
Object.keys(CDF_TEMPLATES).forEach(function (key) {
  var opt = document.createElement('option');
  opt.value = key;
  opt.textContent = CDF_TEMPLATES[key].label;
  templateSelect.appendChild(opt);
});

function updateCustomVisibility() {
  customFields.style.display = templateSelect.value === 'custom' ? 'block' : 'none';
}

templateSelect.addEventListener('change', function () {
  var tpl = CDF_TEMPLATES[templateSelect.value];
  if (templateSelect.value !== 'custom') {
    spreadsInput.value = tpl.spreads;
    columnsInput.value = tpl.columns;
  }
  updateCustomVisibility();
});

cdfGetConfig(t).then(function (config) {
  templateSelect.value = config.template || 'chartres-metropole-60p';
  spreadsInput.value = config.spreads;
  columnsInput.value = config.columns;
  updateCustomVisibility();
  t.sizeTo('#settings-form');
});

form.addEventListener('submit', function (e) {
  e.preventDefault();

  var newConfig = {
    template: templateSelect.value,
    spreads: parseInt(spreadsInput.value, 10) || CDF_DEFAULT_CONFIG.spreads,
    columns: parseInt(columnsInput.value, 10) || CDF_DEFAULT_CONFIG.columns
  };

  cdfSaveConfig(t, newConfig).then(function () {
    t.closePopup();
  });
});
