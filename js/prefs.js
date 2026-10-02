/* Theme toggle and text-size selector, shared by both pages.
   The tiny script in <head> restores saved choices before first paint; this file wires the buttons. */
(function () {
  var root = document.documentElement;
  var SIZES = { sm: 'Small', md: 'Normal', lg: 'Large', xl: 'Largest' };

  function store(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  function syncTheme() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('aria-label', dark ? 'Dark theme on. Switch to light theme' : 'Light theme on. Switch to dark theme');
      var label = b.querySelector('[data-theme-label]');
      if (label) label.textContent = dark ? 'Light' : 'Dark';
    }
  }

  function syncSize() {
    var current = root.getAttribute('data-font-size') || 'md';
    var buttons = document.querySelectorAll('[data-size]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var on = b.getAttribute('data-size') === current;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', 'Text size ' + SIZES[b.getAttribute('data-size')] + (on ? ' (selected)' : ''));
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
    if (t) {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store('pref-theme', next);
      syncTheme();
      return;
    }
    var s = e.target.closest ? e.target.closest('[data-size]') : null;
    if (s) {
      var size = s.getAttribute('data-size');
      if (!SIZES[size]) return;
      root.setAttribute('data-font-size', size);
      store('pref-font-size', size);
      syncSize();
    }
  });

  syncTheme();
  syncSize();
})();
