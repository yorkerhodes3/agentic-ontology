// Shared page shell: nav with style-guide (theme) and platform switchers, footer,
// reveal-on-scroll, card glow, tooltips and toasts. Every page calls mountShell().
// Structure ported from Neocloud Supply OS (Apache-2.0).
import { initTheme, applyBrand, allBrands, currentBrand } from './theme.js';
import { initPlatform, applyPlatform, currentPlatform, PLATFORMS, PLATFORM_ORDER } from './platforms.js';
import { DEFAULT_BRAND } from './themes.js';

export const REPO = 'https://github.com/yorkerhodes3/agentic-ontology';
export const TITLE = 'Wayfinder - Agentic Ontology';

const NAV = [
  { href: 'index.html#problem', label: 'Problem', page: 'index' },
  { href: 'index.html#idea', label: 'Idea', page: 'index' },
  { href: 'index.html#ledger', label: 'Ledger', page: 'index' },
  { href: 'index.html#platforms', label: 'Platforms', page: 'index' },
  { href: 'index.html#scenarios', label: 'Scenarios', page: 'index' },
  { href: 'index.html#negotiate', label: 'Negotiation', page: 'index' },
  { href: 'index.html#roadmap', label: 'Roadmap', page: 'index' },
  { href: 'index.html#documents', label: 'Documents', page: 'index' },
  { href: 'style-guide.html', label: 'Style guide', page: 'style-guide' },
];

// Waypoint mark: a compass needle inside a ring of three ontology nodes.
export const mark = (uid = 'nav') => `<svg viewBox="0 0 32 32" aria-hidden="true">
  <defs><linearGradient id="wf-g-${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--glow)"/></linearGradient></defs>
  <circle cx="16" cy="16" r="12.6" fill="none" stroke="url(#wf-g-${uid})" stroke-width="1.8"/>
  <g transform="rotate(38 16 16)"><path d="M16 5.6 19 16H13Z" fill="var(--accent)"/><path d="M13 16H19L16 26.4Z" fill="var(--fg)" opacity=".72"/></g>
  <circle cx="16" cy="16" r="1.6" fill="var(--bg)"/>
  <circle cx="5.1" cy="9.7" r="2.3" fill="var(--glow)"/><circle cx="26.9" cy="9.7" r="2.3" fill="var(--glow)"/><circle cx="16" cy="28.6" r="2.3" fill="var(--glow)"/>
</svg>`;

const withParams = (href) => {
  // Keep ?brand= and ?platform= on internal links so a shared URL keeps its dressing.
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  const u = new URL(href, location.href);
  const b = currentBrand()?.id, p = currentPlatform()?.id;
  if (b && b !== DEFAULT_BRAND && b !== 'custom' && !u.searchParams.has('brand')) u.searchParams.set('brand', b);
  if (p && new URLSearchParams(location.search).has('platform') && !u.searchParams.has('platform')) u.searchParams.set('platform', p);
  return u.pathname.split('/').pop() + u.search + u.hash;
};

function navHTML(page) {
  return `<div class="wrap-wide nav-inner">
    <a class="brandmark" href="index.html" aria-label="${TITLE}: home">${mark('nav')}
      <span class="bm-text"><span class="bm-name">Wayfinder</span>
      <span class="bm-sub">Agentic Ontology · building M1</span></span></a>
    <nav class="nav-links" aria-label="Primary">
      ${NAV.map(n => `<a href="${n.href}" ${n.page === page && !n.href.includes('#') ? 'aria-current="page"' : ''}>${n.label}</a>`).join('')}
    </nav>
    <div class="pop" id="brandPop">
      <button class="btn sm" id="brandBtn" aria-haspopup="true" aria-expanded="false" title="Swap the style guide (theme)">
        <span class="sw-mini" aria-hidden="true" style="display:inline-flex;gap:2px"><i style="width:8px;height:12px;border-radius:2px;background:var(--accent)"></i><i style="width:8px;height:12px;border-radius:2px;background:var(--glow)"></i></span>
        <span class="bb-label"><span class="sr-only">Style guide: </span><span data-brand-short></span></span> <span aria-hidden="true">▾</span></button>
      <div class="pop-panel" role="menu" aria-label="Style guides"><div id="brandList"></div>
        <div class="pop-foot">Style guides other than the CoLab ones are approximate demo dressings built from public visual identity: no logos, no affiliation. <a class="inline" href="style-guide.html">Open the style guide →</a></div></div>
    </div>
    <div class="pop" id="platPop">
      <button class="btn sm" id="platBtn" aria-haspopup="true" aria-expanded="false" title="Choose the platform profile">
        <svg class="rk-ico" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.6" y="2.4" width="12.8" height="8.4" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.2 13.6h5.6M8 10.8v2.8" stroke="currentColor" stroke-width="1.4"/><path d="M4.6 6.6l1.8 1.6 3.8-3.6" fill="none" stroke="var(--accent)" stroke-width="1.6"/></svg>
        <span class="bb-label"><span class="sr-only">Platform: </span><span data-platform-short></span></span> <span aria-hidden="true">▾</span></button>
      <div class="pop-panel" role="menu" aria-label="Platform profiles"><div id="platList"></div>
        <div class="pop-foot">The same commands run on every profile; only configuration differs. All profiles are planned until the M5 platform matrix validates them. <a class="inline" href="index.html#platforms">How it runs →</a></div></div>
    </div>
    <button class="btn icon nav-toggle" aria-label="Menu" aria-expanded="false" id="navToggle">☰</button>
  </div>`;
}

function footHTML() {
  return `<div class="wrap"><div class="cols">
    <div><div class="brandmark" style="margin-bottom:14px">${mark('foot')}<span class="bm-text"><span class="bm-name">Wayfinder</span><span class="bm-sub">Agentic Ontology</span></span></div>
      <p>A personal AI agent that acts from facts you own and rules you set, and records every step in a ledger you keep.</p>
      <p class="tiny">Built with the <a class="inline" href="https://github.com/Ethical-Tech-CoLab/project-startup-guide">Ethical Tech CoLab</a> method: think in documents, review with a human, then build.</p></div>
    <div><h5>Explore</h5><a href="index.html#idea">Four jobs</a><a href="index.html#ledger">Personal ledger</a><a href="index.html#platforms">Platforms</a><a href="index.html#negotiate">Negotiation readout</a><a href="style-guide.html">Style guide</a></div>
    <div><h5>Documents</h5><a href="${REPO}/blob/main/CONCEPT-IDEA.md">CONCEPT-IDEA.md</a><a href="${REPO}/blob/main/SPECIFICATION.md">SPECIFICATION.md</a><a href="${REPO}/blob/main/PLAN.md">PLAN.md</a><a href="${REPO}/blob/main/BACKLOG.md">BACKLOG.md</a><a href="${REPO}">Repository</a></div>
    <div><h5>Lineage</h5><a href="https://github.com/trustgraph-ai/trustgraph">TrustGraph</a><a href="https://github.com/yorkerhodes3/neocloud-supply-os">Neocloud Supply OS</a><a href="https://github.com/Ethical-Tech-CoLab/diplomacy-table-live">Diplomacy Table</a><a href="https://github.com/yorkerhodes3/sovereign-agent-trust-mesh">Sovereign Agent Trust Mesh</a><a href="https://github.com/Ethical-Tech-CoLab/agentic-language-development">Agentic Language Development</a></div>
  </div>
  <p class="tiny" style="margin-top:34px;opacity:.85">Apache License 2.0. All personas, counterparties and data are synthetic. No cookies, trackers or third-party requests; fonts are self-hosted. Brand names in the style guide belong to their owners.</p></div>`;
}

function kindLabel(b) {
  if (b.kind === 'lab') return 'lab theme';
  if (b.kind === 'custom') return 'your custom theme';
  return `${b.ground} · ${b.confidence || 'approx.'} confidence`;
}

function renderBrandList() {
  const list = document.getElementById('brandList');
  if (!list) return;
  const cur = currentBrand()?.id;
  list.innerHTML = Object.entries(allBrands()).map(([id, b]) => `
    <button class="brand-opt" role="menuitemradio" aria-checked="${id === cur}" data-brand="${id}">
      <span class="sw"><i style="background:${b.bg}"></i><i style="background:${b.primary || b.accent}"></i><i style="background:${b.glow || b.accent}"></i></span>
      <span><b>${b.name}</b><small>${kindLabel(b)}</small></span>
      <span class="tiny muted">${id === cur ? '●' : ''}</span>
    </button>`).join('');
}

function renderPlatList() {
  const list = document.getElementById('platList');
  if (!list) return;
  const cur = currentPlatform()?.id;
  list.innerHTML = PLATFORM_ORDER.map(id => {
    const p = PLATFORMS[id];
    return `<button class="brand-opt plat-opt" role="menuitemradio" aria-checked="${id === cur}" data-platform="${id}">
      <span class="rk-badge" aria-hidden="true">${p.short.replace(/[^A-Za-z0-9]/g, '').slice(0, 3)}</span>
      <span><b>${p.name}</b><small>${p.runtime.split(/[;(,]/)[0].trim()} · sandbox layers ${p.layers.join('+')}</small></span>
      <span class="tiny muted">${id === cur ? '●' : ''}</span>
    </button>`;
  }).join('');
}

export function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

function initTips() {
  const tip = document.createElement('div');
  tip.className = 'tip';
  document.body.appendChild(tip);
  document.addEventListener('pointerover', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    tip.textContent = el.getAttribute('data-tip');
    tip.classList.add('show');
  });
  document.addEventListener('pointermove', e => {
    if (!tip.classList.contains('show')) return;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 10);
    const y = Math.min(e.clientY + 16, innerHeight - tip.offsetHeight - 10);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  });
  document.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]')) tip.classList.remove('show'); });
}

export function observeReveals(root = document) {
  const els = root.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  els.forEach(e => io.observe(e));
}

function setParam(name, value, dflt) {
  const u = new URL(location.href);
  if (value === dflt) u.searchParams.delete(name); else u.searchParams.set(name, value);
  history.replaceState(null, '', u);
}

/** Switch platform from anywhere on the page (nav popover or in-page selector). */
export function choosePlatform(id) {
  applyPlatform(id);
  setParam('platform', id, null);
  renderPlatList();
  toast(`Showing the ${currentPlatform().name} profile`);
}

export function mountShell(page) {
  initTheme();
  initPlatform();
  const nav = document.querySelector('[data-shell="nav"]');
  if (nav) { nav.className = 'nav glass'; nav.innerHTML = navHTML(page); }
  const foot = document.querySelector('[data-shell="footer"]');
  if (foot) { foot.className = 'foot'; foot.innerHTML = footHTML(); }
  applyBrand(currentBrand().id, { persist: false }); // fill the brand-name slots just rendered
  applyPlatform(currentPlatform().id, { persist: false });

  const pops = [['brandPop', 'brandBtn', renderBrandList], ['platPop', 'platBtn', renderPlatList]];
  for (const [popId, btnId, render] of pops) {
    const pop = document.getElementById(popId), btn = document.getElementById(btnId);
    btn?.addEventListener('click', e => {
      e.stopPropagation();
      render();
      for (const [other, otherBtn] of pops) if (other !== popId) { document.getElementById(other)?.classList.remove('open'); document.getElementById(otherBtn)?.setAttribute('aria-expanded', 'false'); }
      pop.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(pop.classList.contains('open')));
    });
  }
  const closeAll = () => pops.forEach(([id, b]) => { document.getElementById(id)?.classList.remove('open'); document.getElementById(b)?.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('click', e => { if (!e.target.closest('.pop')) closeAll(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  document.getElementById('platList')?.addEventListener('click', e => {
    const b = e.target.closest('[data-platform]');
    if (!b) return;
    choosePlatform(b.dataset.platform);
  });
  document.getElementById('brandList')?.addEventListener('click', e => {
    const b = e.target.closest('[data-brand]');
    if (!b) return;
    applyBrand(b.dataset.brand);
    setParam('brand', b.dataset.brand, DEFAULT_BRAND);
    renderBrandList();
    toast(`Dressed as ${currentBrand().name}`);
  });
  const toggle = document.getElementById('navToggle');
  toggle?.addEventListener('click', () => { nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(nav.classList.contains('open'))); });
  nav?.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false'); }));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (a && !a.closest('.bc-src') && a.getAttribute('href') && !/^(https?:|mailto:|#)/.test(a.getAttribute('href'))) a.setAttribute('href', withParams(a.getAttribute('href')));
  }, true);

  document.addEventListener('pointermove', e => {
    const c = e.target.closest?.('.card-glow');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    c.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
  initTips();
  observeReveals();
}
