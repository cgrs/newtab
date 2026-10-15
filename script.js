import { html, render } from './lit-html.js';

// ── Store: Bookmarks ──────────────────────────────────────────────────
const STORAGE_KEY = 'newtab_bm_v1';

const DEFAULT_BM = [
  {id: 'dev',   name: 'dev',   links: [
    {name: 'github',  url: 'https://github.com'},
    {name: 'mdn',     url: 'https://developer.mozilla.org'},
    {name: 'npm',     url: 'https://npmjs.com'},
  ]},
  {id: 'news',  name: 'news',  links: [
    {name: 'hn',       url: 'https://news.ycombinator.com'},
    {name: 'lobsters', url: 'https://lobste.rs'},
  ]},
  {id: 'tools', name: 'tools', links: [
    {name: 'excalidraw', url: 'https://excalidraw.com'},
    {name: 'regex101',   url: 'https://regex101.com'},
    {name: 'tldraw',     url: 'https://tldraw.com'},
  ]},
];

function loadBm() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_BM; }
  catch { return DEFAULT_BM; }
}

function saveBm(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function bmAddCategory(bm) {
  bm.push({id: Date.now().toString(), name: 'new', links: []});
}

function bmDeleteCategory(bm, ci) {
  bm.splice(ci, 1);
}

function bmUpdateCategoryName(bm, ci, name) {
  bm[ci].name = name;
}

function bmAddLink(bm, ci) {
  bm[ci].links.push({name: 'new link', url: 'https://'});
}

function bmDeleteLink(bm, ci, li) {
  bm[ci].links.splice(li, 1);
}

function bmUpdateLinkName(bm, ci, li, name) {
  bm[ci].links[li].name = name;
}

function bmUpdateLinkUrl(bm, ci, li, url) {
  bm[ci].links[li].url = url;
}

function bmMoveCat(bm, fromCi, toCi) {
  const [moved] = bm.splice(fromCi, 1);
  bm.splice(toCi, 0, moved);
}

function bmMoveLink(bm, fromCi, fromLi, toCi, toLi) {
  const [moved] = bm[fromCi].links.splice(fromLi, 1);
  const targetLi = (fromCi === toCi && fromLi < toLi) ? toLi - 1 : toLi;
  bm[toCi].links.splice(targetLi, 0, moved);
}

function bmMoveLinkToEnd(bm, fromCi, fromLi, toCi) {
  const [moved] = bm[fromCi].links.splice(fromLi, 1);
  bm[toCi].links.push(moved);
}

// ── Store: Settings ───────────────────────────────────────────────────
const SETTINGS_KEY = 'newtab_settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ── Store: Greeting ───────────────────────────────────────────────────
const NAME_KEY = 'newtab_name';

function getGreetingName() {
  return localStorage.getItem(NAME_KEY) || 'there';
}

function setGreetingName(name) {
  localStorage.setItem(NAME_KEY, name.trim());
}

function salutation() {
  const h = new Date().getHours();
  if (h < 12) return 'good morning';
  if (h < 18) return 'good afternoon';
  return 'good evening';
}

// ── Store: Accent ─────────────────────────────────────────────────────
const ACCENT_KEY = 'newtab_accent';

const PRESETS = [
  '#1a56db', // blue (light default)
  '#6ea8fe', // sky (dark default)
  '#7145d6', // violet
  '#db2777', // pink
  '#e11d48', // rose
  '#ea580c', // orange
  '#d97706', // amber
  '#059669', // emerald
  '#0891b2', // cyan
];

function loadAccent() {
  return localStorage.getItem(ACCENT_KEY);
}

function saveAccent(color) {
  localStorage.setItem(ACCENT_KEY, color);
}

function clearAccent() {
  localStorage.removeItem(ACCENT_KEY);
}

// ── Helpers ───────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g,   (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function parseNetscapeBookmarks(html) {
  const doc = (new DOMParser()).parseFromString(html, 'text/html');
  const cats = [];
  for (const h3 of doc.querySelectorAll('h3')) {
    const dt = h3.parentElement;
    if (!dt || dt.tagName !== 'DT') continue;
    // HTML5 parser nests the DL inside DT rather than making it a sibling
    let dl = dt.querySelector('dl');
    if (!dl) {
      dl = dt.nextElementSibling;
      while (dl && dl.tagName !== 'DL') dl = dl.nextElementSibling;
    }
    if (!dl) continue;
    const links = [];
    for (const a of dl.querySelectorAll('dt > a')) {
      if (a.closest('dl') !== dl) continue;
      const url = a.getAttribute('href') || '';
      const name = a.textContent.trim();
      if (url && name) links.push({name, url});
    }
    cats.push({id: Date.now().toString() + Math.random().toString(36).slice(2), name: h3.textContent.trim(), links});
  }
  if (!cats.length) {
    const links = [];
    for (const a of doc.querySelectorAll('a[href]')) {
      const url = a.getAttribute('href');
      const name = a.textContent.trim();
      if (url && name && /^https?:\/\//.test(url)) links.push({name, url});
    }
    if (links.length) cats.push({id: Date.now().toString(), name: 'imported', links});
  }
  return cats;
}

function exportBookmarks(bm) {
  const ts = Math.floor(Date.now() / 1000);
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>', '<H1>Bookmarks</H1>', '<DL><p>',
  ];
  for (const cat of bm) {
    lines.push(`    <DT><H3 ADD_DATE="${ts}">${escapeHtml(cat.name)}</H3>`);
    lines.push('    <DL><p>');
    for (const link of cat.links)
      lines.push(`        <DT><A HREF="${escapeHtml(link.url)}" ADD_DATE="${ts}">${escapeHtml(link.name)}</A>`);
    lines.push('    </DL><p>');
  }
  lines.push('</DL><p>');
  const blob = new Blob([lines.join('\n')], {type: 'text/html; charset=utf-8'});
  const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: 'bookmarks.html'});
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Drag state ────────────────────────────────────────────────────────
let drag = null; // { type: 'cat'|'link', ci, li? }
let dragFromHandle = false;

// ── Render: Confirm dialog ────────────────────────────────────────────
const confirmDlg = document.getElementById('confirm-dlg');
const dlgMsg = document.getElementById('dlg-msg');

function showConfirm(message) {
  return new Promise(resolve => {
    dlgMsg.textContent = message;
    confirmDlg.showModal();
    const cleanup = result => { confirmDlg.close(); resolve(result); };
    document.getElementById('dlg-confirm').onclick = () => cleanup(true);
    document.getElementById('dlg-cancel').onclick  = () => cleanup(false);
    confirmDlg.oncancel = () => cleanup(false);
  });
}

// ── Render: Greeting ──────────────────────────────────────────────────
function renderGreeting() {
  const name = getGreetingName();
  document.getElementById('greeting-salutation').textContent = salutation();
  document.getElementById('greeting-name').textContent = name;
  document.getElementById('greeting-name-input').value = name;
}

// ── Render: Settings ──────────────────────────────────────────────────
function applySettings(settings) {
  const showSearch = settings.showSearch !== false;
  document.getElementById('search-wrapper').style.display = showSearch ? '' : 'none';
  document.getElementById('setting-search').checked = showSearch;

  const showFavicons = settings.showFavicons !== false;
  document.getElementById('setting-favicons').checked = showFavicons;
  const tsg = document.querySelector('top-sites-grid');
  if (tsg) tsg.showFavicons = showFavicons;

  const cols = settings.cols || 3;
  document.documentElement.style.setProperty('--bm-cols', cols);
  document.getElementById('setting-cols').value = cols;
  document.getElementById('setting-cols-val').value = cols;

  const width = settings.width || 720;
  document.documentElement.style.setProperty('--page-width', width + 'px');
  document.getElementById('setting-width').value = width;
}

// ── Render: Accent color ──────────────────────────────────────────────
function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
}

function buildColorPanel() {
  const panel = document.getElementById('color-panel');
  const current = loadAccent();
  panel.innerHTML = '';

  PRESETS.forEach(color => {
    const sw = document.createElement('span');
    sw.className = 'swatch' + (color === current ? ' active' : '');
    sw.style.background = color;
    sw.title = color;
    sw.addEventListener('click', () => { applyAccent(color); saveAccent(color); buildColorPanel(); });
    panel.appendChild(sw);
  });

  const custom = document.createElement('input');
  custom.type = 'color';
  custom.id = 'swatch-custom';
  custom.title = 'custom color';
  custom.value = current && !PRESETS.includes(current) ? current : '#ffffff';
  custom.addEventListener('input', () => {
    applyAccent(custom.value);
    saveAccent(custom.value);
    panel.querySelectorAll('.swatch').forEach(s => { s.classList.remove('active'); });
  });
  panel.appendChild(custom);

  const reset = document.createElement('button');
  reset.id = 'swatch-reset';
  reset.textContent = 'reset to default';
  reset.addEventListener('click', () => { clearAccent(); document.documentElement.style.removeProperty('--accent'); buildColorPanel(); });
  panel.appendChild(reset);
}

// ── Render: Autocomplete ──────────────────────────────────────────────
const searchInput  = document.getElementById('search-input');
const suggestionsEl = document.getElementById('suggestions');

let debounce = null, sugs = [], selIdx = -1;

async function fetchSuggestions(q) {
  try {
    const res = await fetch(`https://www.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`);
    const data = await res.json();
    sugs = (data[1] || []).slice(0, 7);
    selIdx = -1;
    drawSuggestions();
  } catch {}
}

function drawSuggestions() {
  suggestionsEl.innerHTML = '';
  sugs.forEach(text => {
    const decoded = decodeEntities(text);
    const div = document.createElement('div');
    div.className = 'sug';
    div.textContent = decoded;
    div.addEventListener('mousedown', e => { e.preventDefault(); doSearch(decoded); });
    suggestionsEl.appendChild(div);
  });
}

function clearSuggestions() {
  suggestionsEl.innerHTML = '';
  sugs = [];
  selIdx = -1;
}

function doSearch(q) {
  clearSuggestions();
  window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

// ── Components ────────────────────────────────────────────────────────
class BookmarkCategory extends HTMLElement {
  constructor() {
    super();
    this._cat = null;
    this._ci = 0;
    this._bm = [];
  }

  set cat(v) { this._cat = v; this._render(); }
  get cat() { return this._cat; }
  set ci(v) { this._ci = v; this._render(); }
  get ci() { return this._ci; }
  set bm(v) { this._bm = v; this._render(); }
  get bm() { return this._bm; }

  _save() {
    saveBm(this._bm);
    this._render();
  }

  _emit() {
    saveBm(this._bm);
    this._render();
    this.dispatchEvent(new CustomEvent('bm-changed', { bubbles: true }));
  }

  _render() {
    const cat = this._cat;
    const ci = this._ci;
    const bm = this._bm;
    if (!cat) return;
    render(html`
      <div class="cat-header">
        <span class="drag-handle" title="drag to reorder"
          @mousedown=${() => { dragFromHandle = true; }}>⠿</span>
        <span class="cat-name">${cat.name}</span>
        <input class="edit-cat" .value=${cat.name}
          @input=${e => { bmUpdateCategoryName(bm, ci, e.target.value); this._save(); }}
          @blur=${() => this._emit()}>
        <button class="del-btn" title="delete category" @click=${async () => {
          if (!await showConfirm(`delete category "${cat.name}"?`)) return;
          bmDeleteCategory(bm, ci);
          this._emit();
        }}>×</button>
      </div>
      ${cat.links.map((link, li) => html`
        <div class="link-row" draggable="true"
          @dragstart=${e => {
            if (!document.body.classList.contains('editing') || !dragFromHandle) { e.preventDefault(); return; }
            dragFromHandle = false;
            e.stopPropagation();
            drag = { type: 'link', ci, li };
            e.currentTarget.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
          }}
          @dragend=${e  => { e.currentTarget.classList.remove('dragging'); dragFromHandle = false; }}
          @dragover=${e => { if (drag?.type !== 'link') return; e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('drag-over'); }}
          @dragleave=${e => e.currentTarget.classList.remove('drag-over')}
          @drop=${e => {
            e.preventDefault(); e.stopPropagation();
            e.currentTarget.classList.remove('drag-over');
            if (drag?.type !== 'link' || (drag.ci === ci && drag.li === li)) return;
            bmMoveLink(bm, drag.ci, drag.li, ci, li);
            this._emit();
          }}
        >
          <span class="drag-handle" title="drag to reorder"
            @mousedown=${() => { dragFromHandle = true; }}>⠿</span>
          <a href=${link.url}>${link.name}</a>
          <input class="edit-name" .value=${link.name} title="name"
            @input=${e => { bmUpdateLinkName(bm, ci, li, e.target.value); this._save(); }}>
          <input class="edit-url" .value=${link.url} title="url"
            @input=${e => { bmUpdateLinkUrl(bm, ci, li, e.target.value); this._save(); }}>
          <button class="del-btn" title="delete link"
            @click=${() => { bmDeleteLink(bm, ci, li); this._emit(); }}>×</button>
        </div>
      `)}
      <button class="add-link-btn"
        @click=${() => { bmAddLink(bm, ci); this._emit(); }}>+ link</button>
    `, this);
  }
}

customElements.define('bookmark-category', BookmarkCategory);

class BookmarkGrid extends HTMLElement {
  constructor() {
    super();
    this._bm = [];
  }

  set bm(val) { this._bm = val; this._render(); }
  get bm() { return this._bm; }

  connectedCallback() {
    this.addEventListener('bm-changed', () => {
      this.bm = [...this._bm];
    });
  }

  _render() {
    render(html`
      ${this._bm.map((cat, ci) => html`
        <bookmark-category
          .cat=${cat} .ci=${ci} .bm=${this._bm}
          draggable="true"
          @dragstart=${e => {
            if (!document.body.classList.contains('editing') || !dragFromHandle) { e.preventDefault(); return; }
            dragFromHandle = false;
            drag = { type: 'cat', ci };
            e.currentTarget.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
          }}
          @dragend=${e => { e.currentTarget.classList.remove('dragging'); dragFromHandle = false; }}
          @dragover=${e => {
            if (drag?.type === 'cat' || drag?.type === 'link') { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
          }}
          @dragleave=${e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove('drag-over'); }}
          @drop=${e => {
            e.currentTarget.classList.remove('drag-over');
            if (drag?.type === 'cat') {
              e.preventDefault();
              if (drag.ci === ci) return;
              bmMoveCat(this._bm, drag.ci, ci);
              saveBm(this._bm); this.bm = [...this._bm];
            } else if (drag?.type === 'link') {
              e.preventDefault();
              bmMoveLinkToEnd(this._bm, drag.ci, drag.li, ci);
              saveBm(this._bm); this.bm = [...this._bm];
            }
          }}
        ></bookmark-category>
      `)}
      <button id="add-cat-btn" @click=${() => {
        bmAddCategory(this._bm);
        saveBm(this._bm);
        this.bm = [...this._bm];
      }}>+ category</button>
    `, this);
  }
}

customElements.define('bookmark-grid', BookmarkGrid);

// ── Component: Top Sites ──────────────────────────────────────────────
class TopSitesGrid extends HTMLElement {
  constructor() {
    super();
    this._sites = [];
    this._filter = '';
    this._historyResults = [];
    this._showFavicons = true;
  }

  set sites(v) { this._sites = v; this._render(); }
  get sites() { return this._sites; }

  set showFavicons(v) { this._showFavicons = v; this._render(); }
  get showFavicons() { return this._showFavicons; }

  set filter(v) {
    if (v === this._filter) return;
    this._filter = v;
    this._onFilterChanged();
  }
  get filter() { return this._filter; }

  connectedCallback() {
    if (typeof chrome !== 'undefined' && chrome.topSites) {
      chrome.topSites.get(sites => { this.sites = sites; });
    }
  }

  _onFilterChanged() {
    if (!this._filter || typeof chrome === 'undefined' || !chrome.history) {
      this._historyResults = [];
      this._render();
      return;
    }
    const topHostnames = new Set(
      this._sites.map(({ url }) => new URL(url).hostname.replace(/^www\./, ''))
    );
    chrome.history.search({ text: this._filter, maxResults: 50, startTime: 0 }, results => {
      const seen = new Map();
      for (const r of results) {
        try {
          const { hostname } = new URL(r.url);
          const label = hostname.replace(/^www\./, '');
          if (!seen.has(label))
            seen.set(label, { url: r.url, title: r.title, visitCount: r.visitCount || 0, isTop: topHostnames.has(label) });
        } catch {}
      }
      this._historyResults = [...seen.values()]
        .sort((a, b) => (b.isTop - a.isTop) || (b.visitCount - a.visitCount))
        .slice(0, 20);
      this._render();
    });
  }

  _render() {
    const items = this._filter ? this._historyResults : this._sites;
    render(html`${items.map(({ url, title }) => {
      const { origin, hostname } = new URL(url);
      const label = hostname.replace(/^www\./, '');
      const display = title || label;
      return html`
        <a class="top-site" href=${url} title=${display}>
          ${this._showFavicons ? html`<img src="${origin}/favicon.ico" alt=""
            @error=${e => { e.target.style.display = 'none'; }}>` : ''}
          <span>${display}</span>
        </a>
      `;
    })}`, this);
  }
}

customElements.define('top-sites-grid', TopSitesGrid);

// ── Init ──────────────────────────────────────────────────────────────
const grid = document.querySelector('bookmark-grid');
grid.bm = loadBm();

const topSitesGrid = document.querySelector('top-sites-grid');

let settings = loadSettings();

applySettings(settings);
renderGreeting();

const savedAccent = loadAccent();
if (savedAccent) applyAccent(savedAccent);
buildColorPanel();

// Settings events
document.getElementById('setting-search').addEventListener('change', function () {
  settings.showSearch = this.checked;
  saveSettings(settings);
  applySettings(settings);
});

document.getElementById('setting-favicons').addEventListener('change', function () {
  settings.showFavicons = this.checked;
  saveSettings(settings);
  applySettings(settings);
});

document.getElementById('setting-cols').addEventListener('input', function () {
  settings.cols = +this.value;
  document.getElementById('setting-cols-val').value = this.value;
  document.documentElement.style.setProperty('--bm-cols', this.value);
  saveSettings(settings);
});

document.getElementById('setting-width').addEventListener('input', function () {
  settings.width = +this.value;
  document.documentElement.style.setProperty('--page-width', this.value + 'px');
  saveSettings(settings);
});

// Greeting events
document.getElementById('greeting-name-input').addEventListener('input', function () {
  const val = this.value.trim() || 'there';
  document.getElementById('greeting-name').textContent = val;
  setGreetingName(this.value);
});

// Edit toggle
const editToggle = document.getElementById('edit-toggle');
editToggle.addEventListener('click', () => {
  const on = document.body.classList.toggle('editing');
  editToggle.textContent = on ? 'done' : 'edit';
});

// Import / Export
const importDlg = document.getElementById('import-dlg');
let pendingImport = null;

document.getElementById('export-btn').addEventListener('click', () => exportBookmarks(grid.bm));

document.getElementById('import-file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  this.value = '';
  const reader = new FileReader();
  reader.onload = e => {
    pendingImport = parseNetscapeBookmarks(e.target.result);
    if (!pendingImport.length) { alert('No bookmarks found in file.'); return; }
    importDlg.showModal();
  };
  reader.readAsText(file);
});

document.getElementById('import-cancel').addEventListener('click',  () => { importDlg.close(); pendingImport = null; });
document.getElementById('import-merge').addEventListener('click',   () => { grid.bm.push(...pendingImport); grid.bm = [...grid.bm]; saveBm(grid.bm); importDlg.close(); pendingImport = null; });
document.getElementById('import-replace').addEventListener('click', () => { grid.bm = pendingImport; saveBm(grid.bm); importDlg.close(); pendingImport = null; });
importDlg.addEventListener('cancel', () => { pendingImport = null; });

// Autocomplete events
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearTimeout(debounce);
  if (q.startsWith('!')) {
    clearSuggestions();
    topSitesGrid.filter = q.slice(1).trimStart().toLowerCase();
    return;
  }
  topSitesGrid.filter = '';
  if (!q) { clearSuggestions(); return; }
  debounce = setTimeout(() => fetchSuggestions(q), 220);
});

searchInput.addEventListener('keydown', e => {
  const items = suggestionsEl.querySelectorAll('.sug');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selIdx = Math.min(selIdx + 1, items.length - 1);
    items.forEach((el, i) => { el.classList.toggle('sel', i === selIdx); });
    if (selIdx >= 0) searchInput.value = decodeEntities(sugs[selIdx]);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selIdx = Math.max(selIdx - 1, -1);
    items.forEach((el, i) => { el.classList.toggle('sel', i === selIdx); });
    if (selIdx >= 0) searchInput.value = decodeEntities(sugs[selIdx]);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q.startsWith('!')) {
      const first = topSitesGrid.querySelector('a.top-site');
      if (first) window.location.href = first.href;
    } else if (q) {
      doSearch(q);
    }
  } else if (e.key === 'Escape') {
    clearSuggestions();
    topSitesGrid.filter = '';
    searchInput.blur();
  }
});

searchInput.addEventListener('blur', () => setTimeout(clearSuggestions, 150));

searchInput.focus();

document.addEventListener('keydown', e => {
  const active = document.activeElement;
  const isEditing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
  if (e.key === '/' && !isEditing) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
});
