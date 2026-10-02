/* Clean Agent behavior: chat, MATCH-line parsing and the three live cards.
   Every piece of text from the model, the visitor or the guide is rendered with textContent. */
(function () {
  'use strict';

  var STORE_KEY = 'clean-agent-session';
  var MAX_SEND = 20;
  var CIRC = 2 * Math.PI * 40;
  var GREETING = "Hi, I'm the Clean Agent for A Lovely Touch of Clean. Tell me about the space you'd like cleaned (a home, an office, a laundry pile or a move) and I'll match you with the right service, what it costs and how to book.";

  var $ = function (id) { return document.getElementById(id); };
  var messagesEl = $('messages'), input = $('chatInput'), sendBtn = $('sendBtn');

  var gub = null;          // guide data, loaded from data/gub.json
  var state = { conversation: [], matches: [], selected: null };
  var busy = false;

  /* ── session state ── */
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function restore() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.conversation)) state.conversation = s.conversation.filter(validTurn);
      if (s && Array.isArray(s.matches)) state.matches = s.matches.map(normalizeMatch).filter(Boolean);
      if (s && typeof s.selected === 'string') state.selected = s.selected;
    } catch (e) {}
  }
  function validTurn(m) {
    return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
  }

  /* ── guide lookups ── */
  function entryById(id) {
    if (!gub) return null;
    for (var i = 0; i < gub.entries.length; i++) if (gub.entries[i].id === id) return gub.entries[i];
    return null;
  }

  /* ── messages ── */
  function setStatus(s) { $('countChip').className = 'count-chip' + (s ? ' ' + s : ''); }
  function setCount() {
    var n = state.conversation.length;
    $('countLabel').textContent = n + (n === 1 ? ' message' : ' messages') + ' this session';
  }
  function addMsg(role, text, extra) {
    var d = document.createElement('div');
    d.className = 'msg ' + role + (extra ? ' ' + extra : '');
    if (extra === 'thinking') {
      var sp = document.createElement('span'); sp.className = 'spin'; sp.setAttribute('aria-hidden', 'true');
      d.appendChild(sp);
      d.appendChild(document.createTextNode('Thinking…'));
    } else {
      d.textContent = text;
    }
    messagesEl.appendChild(d);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return d;
  }
  function renderConversation() {
    messagesEl.textContent = '';
    addMsg('assistant', GREETING);
    state.conversation.forEach(function (m) { addMsg(m.role, m.content); });
    setCount();
  }

  /* ── MATCH lines: strip every one from the visible reply, even malformed ones ── */
  function normalizeMatch(m) {
    if (!m || typeof m !== 'object' || typeof m.id !== 'string') return null;
    var id = m.id.trim().toLowerCase();
    if (!/^[a-z0-9-]{1,60}$/.test(id)) return null;
    var score = Math.round(Number(m.score));
    if (!isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, score));
    var details = {};
    if (m.details && typeof m.details === 'object' && !Array.isArray(m.details)) {
      Object.keys(m.details).slice(0, 3).forEach(function (k) {
        var v = m.details[k];
        if (typeof v === 'string' || typeof v === 'number') details[String(k).slice(0, 40)] = String(v).slice(0, 120);
      });
    }
    return {
      id: id,
      title: typeof m.title === 'string' ? m.title.slice(0, 80) : id,
      score: score,
      why: typeof m.why === 'string' ? m.why.slice(0, 280) : '',
      details: details
    };
  }
  function extractMatches(text) {
    var found = [];
    var kept = String(text).split(/\r?\n/).filter(function (line) {
      var m = line.match(/^\s*MATCH\s*:\s*(.*)$/i);
      if (!m) return true;
      try {
        var obj = normalizeMatch(JSON.parse(m[1]));
        if (obj && (!gub || entryById(obj.id)) && !found.some(function (f) { return f.id === obj.id; })) found.push(obj);
      } catch (e) { /* malformed MATCH line: dropped from the reply, ignored for the cards */ }
      return false;
    });
    found.sort(function (a, b) { return b.score - a.score; });
    return { clean: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(), matches: found };
  }

  /* ── cards ── */
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function row(list, label, value) {
    var li = document.createElement('li');
    var a = document.createElement('span'); a.textContent = label;
    var b = document.createElement('span'); b.textContent = value;
    li.appendChild(a); li.appendChild(b); list.appendChild(li);
  }
  function setDonut(score) {
    $('arc').setAttribute('stroke-dashoffset', String(CIRC * (1 - score / 100)));
    $('arc').style.opacity = score > 0 ? '1' : '0';
    $('pct').textContent = score > 0 ? String(score) : '0';
  }

  function renderCards() {
    var list = state.matches;
    var top = null;
    if (list.length) {
      top = list[0];
      for (var i = 0; i < list.length; i++) if (list[i].id === state.selected) top = list[i];
    }

    // Shortlist
    var picks = $('picks'); clear(picks);
    if (list.length) {
      var best = list[0].score;
      setDonut(best);
      $('donut').setAttribute('aria-label', 'Top score: ' + best + ' out of 100');
      $('shortValue').textContent = list.length + (list.length === 1 ? ' pick' : ' picks');
      $('shortText').textContent = list.length === 1
        ? 'One service fits what you described. Keep chatting to refine it.'
        : 'Ranked by how well each fits what you described. Tap one to compare.';
      list.forEach(function (m) {
        var e = entryById(m.id);
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'pick';
        b.setAttribute('aria-pressed', String(top && m.id === top.id));
        var t = document.createElement('span'); t.textContent = e ? e.title : m.title;
        var s = document.createElement('span'); s.textContent = m.score;
        b.appendChild(t); b.appendChild(s);
        b.setAttribute('aria-label', (e ? e.title : m.title) + ', fit ' + m.score + ' out of 100');
        b.addEventListener('click', function () { state.selected = m.id; save(); renderCards(); });
        picks.appendChild(b);
      });
    } else {
      setDonut(0);
      $('donut').setAttribute('aria-label', 'Top score: none yet');
      $('shortValue').textContent = '0 picks';
      $('shortText').textContent = 'Your shortlist fills in as you chat. Tap a pick to compare.';
    }

    // Top match
    var extra = $('matchExtra'); clear(extra); extra.hidden = true;
    var fit = $('fitValue');
    if (top) {
      var entry = entryById(top.id);
      $('matchTag').textContent = top === list[0] ? 'Top match' : 'Also a fit';
      $('matchName').textContent = entry ? entry.title : top.title;
      $('matchWhy').textContent = top.why || (entry ? entry.summary : '');
      fit.textContent = top.score + ' / 100';
      fit.className = 'block-title on';
      $('gaugeFill').style.width = top.score + '%';
      var keys = Object.keys(top.details);
      if (keys.length) {
        keys.forEach(function (k) { row(extra, k, top.details[k]); });
        extra.hidden = false;
      }
    } else {
      $('matchTag').textContent = 'Start here';
      $('matchName').textContent = '$80 first hour';
      $('matchWhy').textContent = 'Then $25 for each hour after. Every estimate is free and confirmed with you before any work starts.';
      fit.textContent = 'Not scored yet';
      fit.className = 'block-title';
      $('gaugeFill').style.width = '0%';
    }

    // Listing details: always from the guide itself, never from the model
    var terms = $('terms'); clear(terms);
    var e2 = top ? entryById(top.id) : null;
    if (e2) {
      Object.keys(e2.details || {}).forEach(function (k) { row(terms, k, e2.details[k]); });
      $('nextText').textContent = 'Call or text 480-246-7507 for a free estimate. Mention ' + e2.title.toLowerCase() + ', the size of your space and a date that works.';
    } else {
      row(terms, 'Business', 'A Lovely Touch of Clean, LLC');
      row(terms, 'Serves', 'Phoenix, Arizona');
      row(terms, 'Homes & offices', 'Both');
      row(terms, 'Estimate', 'Free, no obligation');
      $('nextText').textContent = 'Tell the agent what needs cleaning, or skip ahead and call or text for a free estimate.';
    }
  }

  /* ── sending ── */
  function autoGrow() {
    input.style.height = 'auto';
    var max = parseFloat(getComputedStyle(input).maxHeight) || 112;
    var h = Math.min(input.scrollHeight + 2, max);
    input.style.height = h + 'px';
    input.style.overflowY = input.scrollHeight + 2 > max ? 'auto' : 'hidden';
  }

  function send() {
    var text = input.value.trim();
    if (!text || busy) return;
    if (listening && recognizer) recognizer.abort();
    note('');
    busy = true; sendBtn.disabled = true;
    input.value = ''; autoGrow();

    state.conversation.push({ role: 'user', content: text });
    addMsg('user', text);
    setCount(); save();
    var thinking = addMsg('assistant', '', 'thinking');

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.conversation.slice(-MAX_SEND) })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) { return { ok: r.ok, data: data }; });
    }).then(function (res) {
      thinking.remove();
      if (!res.ok || typeof res.data.text !== 'string') {
        var msg = (res.data && typeof res.data.error === 'string') ? res.data.error : "The assistant couldn't answer just now. Try again in a moment, or call or text 480-246-7507.";
        addMsg('assistant', msg, 'error');
        state.conversation.pop();
        setCount(); save(); setStatus('error');
        return;
      }
      var parsed = extractMatches(res.data.text);
      var visible = parsed.clean || 'Here are the services that fit best.';
      state.conversation.push({ role: 'assistant', content: visible });
      addMsg('assistant', visible);
      if (parsed.matches.length) { state.matches = parsed.matches; state.selected = parsed.matches[0].id; }
      setCount(); save(); renderCards(); setStatus('live');
    }).catch(function () {
      thinking.remove();
      addMsg('assistant', "The connection dropped before an answer came back. Check your signal and try again, or call or text 480-246-7507.", 'error');
      state.conversation.pop();
      setCount(); save(); setStatus('error');
    }).then(function () {
      busy = false; sendBtn.disabled = false;
    });
  }

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  input.addEventListener('input', autoGrow);

  $('resetBtn').addEventListener('click', function () {
    state = { conversation: [], matches: [], selected: null };
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
    renderConversation(); renderCards(); setStatus('');
    input.focus();
  });

  var chat = $('chat'), expandBtn = $('expandBtn');
  function setExpanded(on) {
    chat.classList.toggle('expanded', on);
    document.body.classList.toggle('chat-open', on);
    expandBtn.setAttribute('aria-pressed', String(on));
    expandBtn.setAttribute('aria-label', on ? 'Shrink chat' : 'Expand chat');
    expandBtn.title = on ? 'Shrink chat' : 'Expand chat';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  expandBtn.addEventListener('click', function () { setExpanded(!chat.classList.contains('expanded')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && chat.classList.contains('expanded')) setExpanded(false); });

  /* ── voice input: speech becomes text in the box; the visitor still taps Send ── */
  var micBtn = $('micBtn'), voiceNote = $('voiceNote');
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognizer = null, listening = false, baseText = '';

  function note(text, warn) {
    voiceNote.textContent = text || '';
    voiceNote.className = 'voice-note' + (warn ? ' warn' : '');
    voiceNote.hidden = !text;
  }
  function setListening(on) {
    listening = on;
    micBtn.setAttribute('aria-pressed', String(on));
    micBtn.setAttribute('aria-label', on ? 'Stop listening' : 'Speak instead of typing');
    micBtn.title = on ? 'Stop listening' : 'Speak instead';
    if (on) note('Listening… speak now, then tap the microphone again or just pause.');
  }

  if (Recognition && micBtn) {
    micBtn.hidden = false;
    micBtn.addEventListener('click', function () {
      if (listening && recognizer) { recognizer.stop(); return; }
      try {
        recognizer = new Recognition();
        recognizer.lang = document.documentElement.lang === 'en' ? 'en-US' : (document.documentElement.lang || 'en-US');
        recognizer.interimResults = true;
        recognizer.continuous = false;
        recognizer.maxAlternatives = 1;
      } catch (e) {
        micBtn.hidden = true;
        return;
      }
      baseText = input.value.trim();
      recognizer.onresult = function (ev) {
        var said = '';
        for (var i = 0; i < ev.results.length; i++) said += ev.results[i][0].transcript;
        input.value = (baseText ? baseText + ' ' : '') + said.trim();
        autoGrow();
      };
      recognizer.onerror = function (ev) {
        var msg = {
          'not-allowed': 'The microphone is blocked. Allow it for this site in your browser settings, or type instead.',
          'service-not-allowed': 'Voice input is turned off in this browser. You can type instead.',
          'audio-capture': 'No microphone was found. Check that one is connected, or type instead.',
          'no-speech': "Didn't catch anything. Tap the microphone and try again.",
          'network': "Voice input needs an internet connection. Try again, or type instead."
        }[ev.error];
        if (ev.error !== 'aborted') note(msg || "Voice input stopped. Tap the microphone to try again, or type instead.", true);
      };
      recognizer.onend = function () {
        setListening(false);
        if (!voiceNote.classList.contains('warn')) {
          note(input.value.trim() ? 'Check the text, then tap Send.' : '');
        }
        input.focus();
      };
      try {
        note('');
        recognizer.start();
        setListening(true);
      } catch (e) {
        note('Voice input could not start. Tap the microphone again, or type instead.', true);
      }
    });
  }

  /* ── start ── */
  restore();
  renderConversation();
  fetch('data/gub.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
    if (data && Array.isArray(data.entries)) gub = data;
    state.matches = state.matches.filter(function (m) { return !gub || entryById(m.id); });
    renderCards();
  }).catch(function () { renderCards(); });
  renderCards();
})();
