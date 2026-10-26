// pdf.js - préparation des données + génération du PDF (sans dépendance au DOM)
(function (root) {
  'use strict';

  var TRELLO = {
    green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
    purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
    pink: '#ff78cb', black: '#4d4d4d'
  };
  var COLOR_FR = {
    green: 'Vert', yellow: 'Jaune', orange: 'Orange', red: 'Rouge', purple: 'Violet',
    blue: 'Bleu', sky: 'Ciel', lime: 'Lime', pink: 'Rose', black: 'Noir'
  };
  var LIST_COLORS = ['#c9a227', '#5aa9e6', '#7bc043', '#8e6bbf', '#8c8c8c', '#e07a5f', '#3d8f8f', '#d56a9b'];
  var DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  var WIN_EXTRA = '‘’‚“”„–—…•€ŒœŠšŸŽž†‡‰‹›™ƒˆ˜';

  function clean(s) {
    s = String(s == null ? '' : s);
    if (s.normalize) s = s.normalize('NFC');
    s = s.replace(/[ -   ​]/g, ' ');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), ch = s.charAt(i);
      if ((c >= 32 && c <= 126) || (c >= 161 && c <= 255) || WIN_EXTRA.indexOf(ch) >= 0) out += ch;
      else if (c === 9 || c === 10 || c === 13) out += ' ';
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function mix(hex, amt) { // amt>0 éclaircit, <0 assombrit
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)); }
    return '#' + [f(r), f(g), f(b)].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  function trelloColor(name) {
    if (!name) return '#dfe1e6';
    var m = /^([a-z]+)(?:_(dark|light|subtle))?$/.exec(name);
    if (!m || !TRELLO[m[1]]) return '#dfe1e6';
    var c = TRELLO[m[1]];
    if (m[2] === 'dark') return mix(c, -0.3);
    if (m[2] === 'light') return mix(c, 0.35);
    if (m[2] === 'subtle') return mix(c, 0.6);
    return c;
  }

  function isLight(hex) {
    var n = parseInt(hex.slice(1), 16);
    var l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return l > 160;
  }
  function textOn(hex) { return isLight(hex) ? '#172b4d' : '#ffffff'; }

  function dateKey(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  function fmtDate(key) {
    if (!key) return '';
    var p = key.split('-');
    var dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
    return DAYS[dow] + ' ' + p[2] + '/' + p[1] + '/' + p[0];
  }
  function labelKey(l) { return (l.name || '') + '|' + (l.color || ''); }

  function compareCards(a, b) {
    var ka = a.dueKey || '', kb = b.dueKey || '';
    if (ka && !kb) return -1;
    if (!ka && kb) return 1;
    if (ka !== kb) return ka < kb ? -1 : 1;
    if (a.due !== b.due && a.due && b.due) return a.due < b.due ? -1 : 1;
    return String(a.name).localeCompare(String(b.name), 'fr');
  }

  function pad(n) { return ('0' + n).slice(-2); }

  function prepare(lists, cards, o) {
    o = o || {};
    var now = o.now ? new Date(o.now) : new Date();
    var today = dateKey(now.toISOString());
    var sel = {}; (o.listIds || []).forEach(function (id) { sel[id] = true; });
    var labSel = {}, nLab = 0;
    (o.labelKeys || []).forEach(function (k) { labSel[k] = true; nLab++; });
    var listName = {}, listIndex = {};
    lists.forEach(function (l, i) { listName[l.id] = l.name; listIndex[l.id] = i; });

    var kept = [];
    cards.forEach(function (c) {
      if (c.closed || !sel[c.idList] || !(c.idList in listName)) return;
      var labels = (c.labels || []);
      if (nLab && !labels.some(function (l) { return labSel[labelKey(l)]; })) return;
      var key = dateKey(c.due);
      if (!key && !o.includeNoDate) return;
      if (key) {
        if (c.dueComplete && !o.includeDone) return;
        if (o.from && key < o.from) return;
        if (o.to && key > o.to) return;
      }
      kept.push({
        id: c.id, name: clean(c.name) || '(sans titre)', url: c.url || '',
        due: c.due || '', dueKey: key, done: !!c.dueComplete,
        overdue: !!key && key < today && !c.dueComplete,
        labels: labels.map(function (l) {
          var col = trelloColor(l.color);
          var txt = clean(l.name) || (l.color ? COLOR_FR[String(l.color).split('_')[0]] || '' : '');
          return { text: txt, color: col, textColor: textOn(col) };
        }),
        idList: c.idList, listName: clean(listName[c.idList])
      });
    });

    var single = o.grouping === 'single';
    var sections = [];
    if (single) {
      kept.sort(compareCards);
      sections.push({ name: 'Toutes les cartes', color: '#44546f', cards: kept });
    } else {
      lists.forEach(function (l, i) {
        if (!sel[l.id]) return;
        var cs = kept.filter(function (c) { return c.idList === l.id; }).sort(compareCards);
        sections.push({ name: clean(l.name) || 'Sans nom', color: LIST_COLORS[i % LIST_COLORS.length], cards: cs });
      });
    }
    var nbCols = Object.keys(sel).filter(function (id) { return id in listName; }).length;
    var f = [];
    if (nLab) f.push('Étiquettes : ' + (o.labelKeys || []).map(function (k) { return clean(k.split('|')[0]) || COLOR_FR[k.split('|')[1]] || '?'; }).join(', '));
    if (o.from || o.to) f.push('Période : ' + (o.from ? 'du ' + fmtDate(o.from).replace(/^\S+ /, '') : '') + (o.to ? ' au ' + fmtDate(o.to).replace(/^\S+ /, '') : ''));
    if (!o.includeNoDate) f.push('Cartes sans date exclues');
    if (!o.includeDone) f.push('Échéances terminées exclues');
    return {
      title: clean(o.title) || 'Export du tableau',
      subtitle: 'Exporté le ' + today.split('-').reverse().join('/') + ' à ' +
        new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(now) +
        ' · ' + kept.length + ' carte' + (kept.length > 1 ? 's' : '') + ' · ' + nbCols + ' colonne' + (nbCols > 1 ? 's' : ''),
      filtersText: f.join('  |  '),
      singleTable: single, sections: sections, total: kept.length
    };
  }

  function fileName(title) {
    var s = clean(title).toLowerCase().normalize ? clean(title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : clean(title).toLowerCase();
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export';
    var d = new Date();
    return s + '-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.pdf';
  }

  function build(jsPDF, data, opts) {
    opts = opts || {};
    var landscape = opts.orientation === 'landscape';
    var doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    var M = 12;
    var single = data.singleTable;
    var wDate = 30, wSup = landscape ? 70 : 52, wList = landscape ? 40 : 34;
    var CHIP_H = 4.6, GAP = 1.5, LGAP = 1.2, PADC = 2;
    var ncols = single ? 4 : 3;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor('#172b4d');
    var y = M + 6;
    doc.text(doc.splitTextToSize(data.title, W - 2 * M)[0], M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor('#6b778c');
    y += 6; doc.text(data.subtitle, M, y);
    if (data.filtersText) {
      var fl = doc.splitTextToSize(data.filtersText, W - 2 * M);
      y += 4.5; doc.text(fl, M, y); y += (fl.length - 1) * 4;
    }
    y += 3; doc.setDrawColor('#c1c7d0'); doc.setLineWidth(0.3); doc.line(M, y, W - M, y);
    var startY = y + 6;

    function layoutChips(labels, width) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
      var avail = width - 2 * PADC, x = 0, row = 0, chips = [];
      labels.forEach(function (l) {
        var txt = l.text, w = doc.getTextWidth(txt) + 3;
        if (w > avail) {
          while (txt.length > 1 && doc.getTextWidth(txt + '...') + 3 > avail) txt = txt.slice(0, -1);
          txt += '...'; w = Math.min(avail, doc.getTextWidth(txt) + 3);
        }
        if (x > 0 && x + w > avail) { x = 0; row++; }
        chips.push({ x: x, row: row, w: w, text: txt, color: l.color, textColor: l.textColor });
        x += w + GAP;
      });
      var rows = chips.length ? row + 1 : 0;
      return { chips: chips, height: rows ? rows * CHIP_H + (rows - 1) * LGAP : 0 };
    }

    data.sections.forEach(function (sec) {
      if (!single && !sec.cards.length) { // section vide : une ligne seulement
      }
      if (startY > H - 45) { doc.addPage(); startY = M; }
      var head = [];
      if (!single) head.push([{ content: sec.name + ' (' + sec.cards.length + ')', colSpan: ncols, styles: { fillColor: sec.color, textColor: textOn(sec.color), halign: 'left', fontSize: 10.5, fontStyle: 'bold', cellPadding: 2.5 } }]);
      var hdr = ['Date', 'Titre', 'Support']; if (single) hdr.push('Liste');
      head.push(hdr);
      var body = sec.cards.map(function (c) {
        var r = [c.dueKey ? fmtDate(c.dueKey) : '—', c.name, ''];
        if (single) r.push(c.listName);
        return r;
      });
      if (!body.length) body.push([{ content: 'Aucune carte', colSpan: ncols, styles: { textColor: '#8993a4', fontStyle: 'italic' } }]);
      var hasCards = sec.cards.length > 0;
      var colStyles = { 0: { cellWidth: wDate }, 1: { cellWidth: 'auto' }, 2: { cellWidth: wSup } };
      if (single) colStyles[3] = { cellWidth: wList };

      doc.autoTable({
        startY: startY, head: head, body: body, theme: 'grid',
        margin: { left: M, right: M, top: M, bottom: 14 },
        styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.2, lineColor: '#dfe1e6', lineWidth: 0.2, valign: 'middle', textColor: '#172b4d', overflow: 'linebreak' },
        headStyles: { fillColor: '#f4f5f7', textColor: '#44546f', fontSize: 8, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: '#fafbfc' },
        columnStyles: colStyles,
        didParseCell: function (d) {
          if (d.section === 'head' && !single && d.row.index === 0) return;
          if (d.section !== 'body' || !hasCards) return;
          var c = sec.cards[d.row.index]; if (!c) return;
          if (d.column.index === 0) {
            d.cell.styles.fontStyle = 'bold';
            d.cell.styles.textColor = !c.dueKey ? '#8993a4' : (c.overdue ? '#c9372c' : '#0c66e4');
          } else if (d.column.index === 1) {
            d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 10;
          } else if (d.column.index === 2) {
            d.cell.text = [];
            if (!c.labels.length) { d.cell.text = ['—']; d.cell.styles.textColor = '#8993a4'; }
            else {
              var lay = layoutChips(c.labels, wSup);
              d.cell.chips = lay.chips;
              d.cell.styles.minCellHeight = lay.height + 2 * 2.2;
            }
          } else if (d.column.index === 3) {
            d.cell.styles.textColor = '#44546f'; d.cell.styles.fontSize = 8.5;
          }
        },
        didDrawCell: function (d) {
          if (d.section !== 'body' || !hasCards) return;
          var c = sec.cards[d.row.index]; if (!c) return;
          if (d.column.index === 1 && c.url) doc.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { url: c.url });
          if (d.column.index === 2 && d.cell.chips) {
            var rows = d.cell.chips.length ? d.cell.chips[d.cell.chips.length - 1].row + 1 : 0;
            var total = rows * CHIP_H + (rows - 1) * LGAP;
            var oy = d.cell.y + (d.cell.height - total) / 2;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
            d.cell.chips.forEach(function (ch) {
              var cx = d.cell.x + PADC + ch.x, cy = oy + ch.row * (CHIP_H + LGAP);
              doc.setFillColor(ch.color); doc.roundedRect(cx, cy, ch.w, CHIP_H, 1.2, 1.2, 'F');
              doc.setTextColor(ch.textColor);
              doc.text(ch.text, cx + 1.5, cy + CHIP_H / 2, { baseline: 'middle' });
            });
            doc.setTextColor('#172b4d');
          }
        }
      });
      startY = doc.lastAutoTable.finalY + 8;
    });

    var n = doc.internal.getNumberOfPages();
    for (var i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor('#8993a4');
      doc.text(doc.splitTextToSize(data.title, W - 2 * M - 30)[0], M, H - 7);
      doc.text('Page ' + i + ' / ' + n, W - M, H - 7, { align: 'right' });
    }
    return doc;
  }

  var api = { clean: clean, trelloColor: trelloColor, dateKey: dateKey, fmtDate: fmtDate, labelKey: labelKey,
    compareCards: compareCards, prepare: prepare, fileName: fileName, build: build, LIST_COLORS: LIST_COLORS };
  root.CdfPdf = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
