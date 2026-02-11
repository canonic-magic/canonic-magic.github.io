// ── magic.js — CANONIC client runtime ──
// Utilities, fetch, view switching, formatting. Reads DESIGN from server.

var $ = function(id) { return document.getElementById(id); };
var $$ = function(sel) { return document.querySelectorAll(sel); };
var API = DESIGN.api;

// ── Fetch helper ──
var api = async function(url, opts) {
  opts = opts || {};
  try {
    var res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      method: opts.method || 'GET',
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error('' + res.status);
    return await res.json();
  } catch (e) {
    console.warn('[api] ' + url + ':', e.message);
    return null;
  }
};

// ── View switching ──
var activeView = 'magic';

var switchView = function(name) {
  $$('.view').forEach(function(v) { v.classList.remove('active'); });
  $$('.cn-tab').forEach(function(t) { t.classList.remove('active'); });
  var el = $(('view-' + name));
  if (el) el.classList.add('active');
  var tab = document.querySelector('.cn-tab[data-view="' + name + '"]');
  if (tab) tab.classList.add('active');
  if (name === 'time') {
    var t = $('cn-time');
    if (t) t.classList.add('active');
  } else {
    var t = $('cn-time');
    if (t) t.classList.remove('active');
  }
  activeView = name;
  loadView(name);
};

// ── Nav click handlers ──
document.addEventListener('DOMContentLoaded', function() {
  $$('.cn-tab').forEach(function(tab) {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      var v = tab.dataset.view;
      if (v) switchView(v);
    });
  });
  var timeLink = $('cn-time');
  if (timeLink) {
    timeLink.addEventListener('click', function(e) {
      e.preventDefault();
      switchView('time');
    });
  }
});

// ── Time formatting ──
var fmtTime = function(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var h = d.getHours();
  var m = String(d.getMinutes()).padStart(2, '0');
  var ampm = h >= 12 ? 'PM' : 'AM';
  return (h % 12 || 12) + ':' + m + ' ' + ampm;
};

var fmtDate = function(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

var fmtRelTime = function(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var now = new Date();
  var diff = now - d;
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
};

// ── Stage helpers ──
var stageColor = function(stage) {
  var s = DESIGN.stages[(stage || '').toLowerCase()];
  return s ? s.color : 'var(--dim)';
};

// ── Tier name lookup ──
var tierName = function(bits) {
  var t = DESIGN.tiers[bits];
  return t ? t.name : 'CUSTOM';
};

// ── Simple markdown → HTML ──
var md = function(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
};

// ── State store ──
var STATE = {
  contacts: [],
  outreach: [],
  pipeline: [],
  timeData: null,
  selectedContact: null,
  selectedDeal: null,
  workflowMode: 'deal',
};
