/* Renders the guide sections from data/gub.json — the same file the Clean Agent reasons over.
   All text is inserted with textContent. */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function detailsTable(details, caption) {
    var keys = Object.keys(details || {});
    if (!keys.length) return null;
    var wrap = el('div', 'details');
    var table = el('table');
    var cap = el('caption', 'sr-only', caption);
    table.appendChild(cap);
    var tbody = el('tbody');
    keys.forEach(function (k) {
      var tr = el('tr');
      var th = el('th', null, k); th.setAttribute('scope', 'row');
      var td = el('td', null, details[k]);
      td.setAttribute('data-label', k);
      tr.appendChild(th); tr.appendChild(td); tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function card(entry) {
    var a = el('article', 'entry');
    a.id = entry.id;
    a.appendChild(el('h3', null, entry.title));
    a.appendChild(el('p', 'summary', entry.summary));
    a.appendChild(el('p', 'body', entry.body));
    var t = detailsTable(entry.details, entry.title + ' details');
    if (t) a.appendChild(t);
    return a;
  }

  function fill(data) {
    var byId = {};
    data.entries.forEach(function (e) { byId[e.id] = e; });
    var boxes = document.querySelectorAll('.entries');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      box.textContent = '';
      var list = [];
      if (box.getAttribute('data-group')) {
        var kind = box.getAttribute('data-group');
        list = data.entries.filter(function (e) { return e.kind === kind; });
      } else {
        list = (box.getAttribute('data-ids') || '').split(',').map(function (id) { return byId[id.trim()]; }).filter(Boolean);
      }
      list.forEach(function (e) { box.appendChild(card(e)); });
    }
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  function fail() {
    var boxes = document.querySelectorAll('.entries');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].textContent = '';
      boxes[i].appendChild(el('p', 'load-error', "This part of the guide didn't load. Refresh the page, or call or text 480-246-7507 with any question."));
    }
  }

  fetch('data/gub.json')
    .then(function (r) { if (!r.ok) throw new Error('load'); return r.json(); })
    .then(function (data) { if (!data || !Array.isArray(data.entries)) throw new Error('shape'); fill(data); })
    .catch(fail);
})();
