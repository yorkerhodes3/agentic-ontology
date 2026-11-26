// Simulation dashboard: a live workload board, the "one template" table, and the run view.
// Everything renders from flows.js (one event model for every scenario). Deterministic per
// scenario, seed and decisions; the board's pacing is the only random part.
import { mountShell, toast } from '../shell.js';
import { esc } from '../lib/esc.js';
import { SCENARIOS, SCENARIO_ORDER, LANE_INFO, KIND_INFO, BOARD, buildRun, stateAt } from '../wayfinder/flows.js';
import { verify, tamper } from '../wayfinder/ledger.js';
import { STYLE_ORDER } from '../vendor/neocloud-nego/nego/engine.js';
import { LEASE_SCENARIOS, LEASE_ORDER } from '../wayfinder/lease.js';

mountShell('simulate');
const $ = (s, r = document) => r.querySelector(s);
const SVGNS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const short = (h) => (h ? `${h.slice(0, 10)}…` : '—');
const pct = (x) => `${Math.round(x * 100)}%`;
const OUTCOMES = ['allowed', 'filtered', 'denied', 'escalated', 'ignored'];
const STYLE_LABEL = { boulware: 'Boulware (holds firm)', linear: 'Linear', conceder: 'Conceder (gives early)', tft: 'Tit-for-tat' };

const TOPO_SUB = { trustgraph: 'facts · claims', models: 'LLM · decision models', tools: 'fixtures · stubs', counterparty: 'external agent', person: 'owner · approves', gate: 'writes first' };
// Rewrite only on change, so live regions announce new content and not every repaint.
const setHTML = (el, html) => { if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; } };
const agentOf = (run, lane) => run.agents.find((a) => `agent:${a.id}` === lane);
const laneName = (run, lane) => (lane.startsWith('agent:') ? agentOf(run, lane)?.name : LANE_INFO[lane]?.label) || lane;
const laneColor = (run, lane) => {
  if (lane.startsWith('agent:')) return `var(${agentOf(run, lane)?.color || '--s1'})`;
  return { gate: 'var(--accent)', ledger: 'var(--s5)', person: 'var(--fg)', trustgraph: 'var(--s3)', models: 'var(--s6)', tools: 'var(--s2)', counterparty: 'var(--s4)' }[lane] || 'var(--muted)';
};
const agentChip = (run, id) => {
  if (id === 'both') return run.agents.map((a) => `<span class="agent-chip" style="--c:var(${a.color})">${esc(a.name)}</span>`).join(' ');
  const a = run.agents.find((x) => x.id === id);
  return a ? `<span class="agent-chip" style="--c:var(${a.color})">${esc(a.name)}</span>` : '';
};
const runOpts = (o) => ({ seed: o.seed, decisions: o.decisions || {}, ...(o.scenario === 's3' ? { fixture: o.fixture || 'lease-f-l1', style: o.style || 'boulware', ours: o.ours || 'linear' } : {}) });

// Cumulative counts per event index (for the board's summary without folding each tick).
function prefixCounts(run) {
  const out = []; let pol = 0, led = 0;
  for (const e of run.events) { if (e.kind === 'policy') pol++; if (e.kind === 'ledger') led++; out.push([pol, led]); }
  return out;
}

// =====================================================================================
// 01 · Workload board
// =====================================================================================
const board = { cards: [], filter: 'all', scn: 'all', live: true, timer: null };

function makeCard(spec, k, gen = 0) {
  const seed = spec.seed + gen * 101;
  const run = buildRun(spec.scenario, runOpts({ ...spec, seed }));
  const n = run.events.length;
  const decIdx = run.events.map((e, i) => (e.kind === 'decision' ? i : -1)).filter((i) => i >= 0);
  let idx = gen ? 0 : Math.min(n, Math.floor(spec.start * n));
  if (!gen && spec.waitForYou) idx = decIdx.find((i) => i >= idx) ?? decIdx[decIdx.length - 1] ?? idx;
  return { spec, k, gen, seed, run, n, idx, startIdx: gen ? 0 : idx, decisions: {}, pref: prefixCounts(run), doneAt: idx >= n ? 0 : null, loop: spec.start < 1 };
}

function cardState(c) {
  if (c.idx >= c.n) return 'done';
  const e = c.run.events[c.idx];
  if (e.kind === 'decision' && c.idx >= c.startIdx && !(e.decision.id in c.decisions)) return 'needs';
  return 'running';
}

function initBoard() {
  board.cards = BOARD.map((b, k) => makeCard(b, k));
  const grid = $('#boardGrid');
  grid.innerHTML = board.cards.map((c) => `<article class="run-card" data-card="${c.k}">
      <div class="rc-top"><span class="rc-code"></span><div style="min-width:0"><h3></h3><div class="rc-id"></div></div><span class="state-badge"></span></div>
      <div class="rc-agents"></div>
      <div class="rc-bar"><i></i></div>
      <div class="rc-now"></div>
      <div class="rc-lanes"></div>
      <div class="rc-act row wrap-row" style="gap:6px"></div>
      <div class="rc-foot"><span class="rc-led"></span><span class="spacer"></span><span class="rc-pos"></span></div>
    </article>`).join('');
  board.cards.forEach(paintCard);
  renderSummary();
}

function paintCard(c) {
  const el = $(`[data-card="${c.k}"]`);
  if (!el) return;
  const { run } = c;
  const st = cardState(c);
  const scn = run.scenario;
  el.className = `run-card ${st}`;
  el.dataset.state = st;
  el.dataset.scn = scn.id;
  $('.rc-code', el).textContent = scn.code;
  $('h3', el).textContent = scn.title;
  const tag = scn.id === 's3' ? ` · ${LEASE_SCENARIOS[c.spec.fixture].code} · ${c.spec.style}` : '';
  $('.rc-id', el).textContent = `${run.id}${tag}${c.gen ? ` · job ${c.gen + 1}` : ''}`;
  const badge = $('.state-badge', el);
  badge.className = `state-badge ${st}`;
  badge.textContent = st === 'needs' ? 'Needs you' : st === 'done' ? (run.result?.status === 'walked' ? 'Done · walked' : 'Done') : 'Running';
  const agentsHTML = run.agents.map((a) => `<span class="agent-chip" style="--c:var(${a.color})">${esc(a.name)}</span>`).join('') + (scn.scope.startsWith('beyond') ? '<span class="sim-scope beyond">beyond v0.4</span>' : '');
  const ag = $('.rc-agents', el);
  if (ag.dataset.k !== `${c.gen}`) { ag.innerHTML = agentsHTML; ag.dataset.k = `${c.gen}`; }
  $('.rc-bar i', el).style.setProperty('--p', `${Math.round((c.idx / c.n) * 100)}%`);
  const e = c.run.events[Math.min(c.idx, c.n) - 1];
  const nowEl = $('.rc-now', el);
  if (st === 'needs') {
    const ap = c.run.events.slice(0, c.idx).reverse().find((x) => x.kind === 'approval');
    nowEl.innerHTML = `<span class="k">Waiting for you</span>${esc(ap?.approval.title || 'A decision')}`;
  } else if (st === 'done') nowEl.innerHTML = `<span class="k">Sealed</span>${esc(c.run.entries.length)} ledger entries; head ${esc(short(c.run.head.finalHash))}`;
  else nowEl.innerHTML = e ? `<span class="k">${esc(KIND_INFO[e.kind])}</span>${esc(laneName(run, e.from))} → ${esc(laneName(run, e.to))}: ${esc(e.label)}` : '<span class="k">Queued</span>Starting…';
  const lanes = $('.rc-lanes', el);
  lanes.innerHTML = run.lanes.map((l) => {
    const hot = e && st === 'running' && (e.from === l || e.to === l);
    const g = l.startsWith('agent:') ? (agentOf(run, l)?.name[0] || 'A') : LANE_INFO[l].glyph;
    return `<i class="${hot ? 'hot' : ''} ${l === 'ledger' ? 'l' : ''}" title="${esc(laneName(run, l))}" ${l.startsWith('agent:') ? `style="border-color:${laneColor(run, l)}"` : ''}>${esc(g)}</i>`;
  }).join('');
  const act = $('.rc-act', el);
  const actKey = `${st}|${c.idx}|${c.gen}`;
  if (act.dataset.k !== actKey) {
    act.dataset.k = actKey;
    let html = '';
    if (st === 'needs') {
      const dec = c.run.events[c.idx].decision;
      const ap = c.run.events.slice(0, c.idx).reverse().find((x) => x.kind === 'approval' && x.approval.id === dec.id);
      html += (ap?.approval.options || []).map((o) => `<button class="btn sm ${o === ap.approval.dflt ? '' : 'ghost'}" data-quick="${c.k}" data-id="${esc(dec.id)}" data-choice="${esc(o)}">${esc(o)}</button>`).join('');
    }
    html += `<button class="btn sm ${st === 'needs' ? 'ghost' : ''}" data-open="${c.k}">Open run →</button>`;
    act.innerHTML = html;
  }
  const [, led] = c.idx ? c.pref[Math.min(c.idx, c.n) - 1] : [0, 0];
  $('.rc-led', el).textContent = `■ ${led} ledger entries`;
  $('.rc-pos', el).textContent = `${Math.min(c.idx, c.n)}/${c.n} events`;
  const show = (board.filter === 'all' || board.filter === st) && (board.scn === 'all' || board.scn === scn.id);
  el.hidden = !show;
}

function renderSummary() {
  let running = 0, needs = 0, done = 0, agents = 0, pol = 0, led = 0;
  for (const c of board.cards) {
    const st = cardState(c);
    if (st === 'running') { running++; agents += c.run.agents.length; }
    if (st === 'needs') needs++;
    if (st === 'done') done++;
    const p = c.idx ? c.pref[Math.min(c.idx, c.n) - 1] : [0, 0];
    pol += p[0]; led += p[1];
  }
  const tiles = [
    ['In progress', running, 'runs moving now'], ['Waiting for you', needs, 'stopped for a decision', needs ? 'warn' : ''],
    ['Done', done, 'sealed runs'], ['Agents at work', agents, 'across running runs'],
    ['Gate decisions', pol, 'allowed · filtered · denied · asked'], ['Ledger entries', led, 'written before each action'],
  ];
  $('#boardSummary').innerHTML = tiles.map(([k, v, s, cls]) => `<div class="tile ${cls || ''}"><span>${k}</span><b>${v}</b><span>${s}</span></div>`).join('');
  // Announce only when a run newly stops for the person, not on every tick.
  if (needs > (board.lastNeeds ?? needs)) $('#boardAnnounce').textContent = `${needs} run${needs === 1 ? '' : 's'} waiting for you`;
  board.lastNeeds = needs;
}

function renderFilters() {
  const f = [['all', 'All'], ['running', 'In progress'], ['needs', 'Needs you'], ['done', 'Done']];
  const s = [['all', 'All scenarios'], ...SCENARIO_ORDER.map((id) => [id, SCENARIOS[id].code])];
  $('#boardFilters').innerHTML = f.map(([v, l]) => `<button class="chip" data-f="${v}" aria-pressed="${board.filter === v}">${l}</button>`).join('')
    + '<span style="width:10px"></span>' + s.map(([v, l]) => `<button class="chip" data-s="${v}" aria-pressed="${board.scn === v}">${l}</button>`).join('');
}

function boardTick() {
  if (!board.live || document.hidden) return;
  const now = performance.now();
  for (const c of board.cards) {
    const st = cardState(c);
    if (st === 'done') {
      if (c.loop && c.doneAt != null && now - c.doneAt > 9000) {
        const nc = makeCard(c.spec, c.k, c.gen + 1);
        Object.assign(c, nc);
        const el = $(`[data-card="${c.k}"]`);
        if (el) $('.rc-agents', el).dataset.k = '';
      }
    } else if (st === 'running' && Math.random() < 0.7) {
      c.idx += 1 + (Math.random() < 0.25 ? 1 : 0);
      // never skip past a pending decision
      const nextDec = c.run.events.findIndex((e, i) => i >= c.startIdx && i < c.idx && e.kind === 'decision' && !(e.decision.id in c.decisions));
      if (nextDec >= 0) c.idx = nextDec;
      c.idx = Math.min(c.idx, c.n);
      if (c.idx >= c.n) c.doneAt = now;
    }
    paintCard(c);
  }
  renderSummary();
}

function boardDecide(k, id, choice) {
  const c = board.cards[k];
  c.decisions[id] = choice;
  const keep = c.idx;
  c.run = buildRun(c.spec.scenario, runOpts({ ...c.spec, seed: c.seed, decisions: c.decisions }));
  c.n = c.run.events.length; c.pref = prefixCounts(c.run);
  c.idx = Math.min(keep + 1, c.n);
  paintCard(c); renderSummary();
  toast(`${c.run.scenario.code}: “${choice}” recorded in the ledger`);
}

$('#boardFilters').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.f) board.filter = b.dataset.f;
  if (b.dataset.s) board.scn = b.dataset.s;
  renderFilters(); board.cards.forEach(paintCard);
});
$('#boardGrid').addEventListener('click', (e) => {
  const q = e.target.closest('[data-quick]');
  if (q) { boardDecide(+q.dataset.quick, q.dataset.id, q.dataset.choice); return; }
  const o = e.target.closest('[data-open]');
  if (o) {
    const c = board.cards[+o.dataset.open];
    const decided = {};
    for (const ev of c.run.events.slice(0, c.idx)) if (ev.kind === 'decision') decided[ev.decision.id] = ev.decision.choice;
    loadRun({ scenario: c.spec.scenario, seed: c.seed, fixture: c.spec.fixture, style: c.spec.style, ours: c.spec.ours || 'linear', decisions: { ...decided, ...c.decisions } }, { idx: c.idx });
    $('#run').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
});
$('#boardLive').addEventListener('change', (e) => { board.live = e.target.checked; });
$('#boardReset').addEventListener('click', () => { initBoard(); toast('Workload restarted'); });

// =====================================================================================
// 02 · One template
// =====================================================================================
function renderTemplate() {
  const s5 = buildRun('s5', { seed: 42 });
  $('#tplLanes').innerHTML = s5.lanes.map((l) => `<span class="${l.startsWith('agent:') ? 'a' : ''}" style="--c:${laneColor(s5, l)}">${esc(laneName(s5, l))}</span>`).join('');
  const rows = SCENARIO_ORDER.map((id) => {
    const run = buildRun(id, { seed: 42 });
    const st = stateAt(run, run.events.length);
    const scn = run.scenario;
    const outs = OUTCOMES.map((o) => `<span class="o-${o}" style="color:var(--o)" title="${o}">${st.counts[o]}</span>`).join(' · ');
    return `<tr>
      <td><b>${scn.code} · ${esc(scn.title)}</b><br><span class="sim-scope ${scn.scope.startsWith('beyond') ? 'beyond' : ''}">${esc(scn.scope)}</span></td>
      <td>${run.agents.map((a) => `<span class="agent-chip" style="--c:var(${a.color})">${esc(a.name)}</span>`).join(' ')}</td>
      <td class="mono small">${run.lanes.length} · ${esc(laneName(run, scn.external))}</td>
      <td class="mono">${run.events.length}</td>
      <td class="mono">${run.entries.length}</td>
      <td class="mono small">${outs}</td>
      <td class="mono">${run.events.filter((e) => e.kind === 'approval').length}</td>
      <td class="mono small">${esc(scn.panel)}</td>
      <td><a class="btn sm" href="?scenario=${id}&seed=42#run">Run →</a></td></tr>`;
  }).join('');
  $('#tplTable').insertAdjacentHTML('beforeend', `<thead><tr><th>Scenario</th><th>Agents</th><th>Lanes · external</th><th>Events</th><th>Ledger entries</th><th>Gate: <span class="o-allowed" style="color:var(--o)">allowed</span> · <span class="o-filtered" style="color:var(--o)">filtered</span> · <span class="o-denied" style="color:var(--o)">denied</span> · <span class="o-escalated" style="color:var(--o)">asked</span> · <span class="o-ignored" style="color:var(--o)">ignored</span></th><th>Approvals</th><th>Panel</th><th></th></tr></thead><tbody>${rows}</tbody>`);
}

// =====================================================================================
// 03 · Run view
// =====================================================================================
const R = { scenario: 's1', seed: 42, fixture: 'lease-f-l1', style: 'boulware', ours: 'linear', decisions: {}, decided: new Set(), run: null, idx: 0, playing: false, speed: 1, auto: false, sel: null, tampered: null, timer: null, layout: null, edges: null, lastPolicy: null, chainShown: 0 };

function loadRun(o, { idx = 0, autoplay = false } = {}) {
  stop();
  Object.assign(R, { scenario: o.scenario, seed: Math.max(0, Math.min(99999, Math.floor(+o.seed) || 0)), decisions: { ...(o.decisions || {}) }, sel: null, tampered: null, lastPolicy: null, chainShown: 0 });
  if (o.fixture) R.fixture = o.fixture;
  if (o.style) R.style = o.style;
  if (o.ours) R.ours = o.ours;
  R.run = buildRun(R.scenario, runOpts(R));
  // Decisions handed in (a replay link, or a board card) count as already made.
  R.decided = new Set(Object.keys(R.decisions));
  R.idx = 0;
  setIdx(Math.min(idx, R.run.events.length));
  syncControls();
  buildTopo();
  renderAll(null);
  const u = new URL(location.href);
  u.searchParams.set('scenario', R.scenario); u.searchParams.set('seed', R.seed);
  if (R.scenario === 's3') { u.searchParams.set('fixture', R.fixture); u.searchParams.set('style', R.style); u.searchParams.set('ours', R.ours); } else { for (const k of ['fixture', 'style', 'ours']) u.searchParams.delete(k); }
  for (const k of [...u.searchParams.keys()]) if (k.startsWith('d.')) u.searchParams.delete(k);
  for (const [k, v] of Object.entries(R.decisions)) u.searchParams.set(`d.${k}`, v);
  history.replaceState(null, '', u.pathname + u.search + location.hash);
  if (autoplay) play();
}

function setIdx(i) {
  R.idx = Math.max(0, Math.min(i, R.run.events.length));
  for (const e of R.run.events.slice(0, R.idx)) if (e.kind === 'decision') R.decided.add(e.decision.id);
  R.tampered = null;
  R.lastPolicy = [...R.run.events.slice(0, R.idx)].reverse().find((e) => e.kind === 'policy') || null;
}

function rebuildWithDecision(id, choice) {
  R.decisions[id] = choice;
  R.decided.add(id);
  R.run = buildRun(R.scenario, runOpts(R));
  buildTopo();
}

function pendingDecision() {
  const e = R.run.events[R.idx];
  if (!e || e.kind !== 'decision') return null;
  if (R.decided.has(e.decision.id) || R.auto) return null;
  return e;
}

const DELAY = { ledger: 330, policy: 760, approval: 900, decision: 700, inbound: 760, seal: 1000, signal: 520, score: 460 };
function play() {
  if (R.idx >= R.run.events.length) setIdx(0), renderAll(null);
  R.playing = true; $('#playBtn').textContent = '❚❚ Pause'; $('#playBtn').setAttribute('aria-label', 'Pause');
  schedule(0);
}
function stop() {
  R.playing = false; clearTimeout(R.timer);
  const b = $('#playBtn'); if (b) { b.textContent = '▶ Play'; b.setAttribute('aria-label', 'Play'); }
}
function schedule(ms) {
  clearTimeout(R.timer);
  R.timer = setTimeout(() => {
    if (!R.playing) return;
    if (!advance()) { stop(); return; }
    const e = R.run.events[R.idx - 1];
    schedule((DELAY[e.kind] || 600) / R.speed);
  }, ms);
}
function advance() {
  if (R.idx >= R.run.events.length) { renderAll(null); return false; }
  if (pendingDecision()) { renderAll(null); return false; }
  const e = R.run.events[R.idx];
  if (e.kind === 'decision') R.decided.add(e.decision.id);
  R.idx++;
  R.tampered = null;
  if (e.kind === 'policy') R.lastPolicy = e;
  renderAll(e);
  return true;
}

function decide(id, choice) {
  rebuildWithDecision(id, choice);
  toast(`You chose “${choice}”. It is written to the ledger before anything happens.`);
  advance();
  if (!R.playing) play();
}

// ---------- topology map ----------
function layoutFor(run) {
  const P = { person: [380, 44], gate: [380, 206], trustgraph: [650, 100], models: [650, 206], ledger: [380, 382] };
  P[run.scenario.external] = [650, 312];
  if (run.agents.length === 1) P[`agent:${run.agents[0].id}`] = [110, 206];
  else run.agents.forEach((a, k) => { P[`agent:${a.id}`] = [110, 140 + k * 140]; });
  return P;
}
function edgePath(P, a, b) {
  const [x1, y1] = P[a], [x2, y2] = P[b];
  const [gx, gy] = P.gate;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const t = Math.max(0, Math.min(1, ((gx - x1) * dx + (gy - y1) * dy) / (L * L)));
  const dist = Math.hypot(x1 + t * dx - gx, y1 + t * dy - gy);
  let bend = 0;
  if (a !== 'gate' && b !== 'gate' && dist < 60) bend = 190;
  const mx = (x1 + x2) / 2 - (dy / L) * bend, my = (y1 + y2) / 2 + (dx / L) * bend;
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
}
function buildTopo() {
  const run = R.run, P = (R.layout = layoutFor(run));
  const pairs = new Map();
  for (const e of run.events) {
    if (e.from === e.to) continue;
    const [a, b] = [e.from, e.to].sort();
    pairs.set(`${a}|${b}`, [a, b]);
  }
  const svg = $('#topo');
  const edges = [...pairs.values()].map(([a, b]) => `<path class="te" data-edge="${a}|${b}" d="${edgePath(P, a, b)}"/>`).join('');
  const nodes = run.lanes.map((l) => {
    const [x, y] = P[l];
    const isA = l.startsWith('agent:');
    const sub = isA ? 'acts for Alex' : TOPO_SUB[l] || LANE_INFO[l].sub;
    const glyph = isA ? agentOf(run, l).name[0] : LANE_INFO[l].glyph;
    return `<g class="tn ${isA ? 'agent' : ''} ${l === 'gate' ? 'gate' : ''} ${l === 'ledger' ? 'ledger' : ''}" data-node="${l}" ${isA ? `style="--c:${laneColor(run, l)}"` : ''}>
      <rect x="${x - 86}" y="${y - 27}" width="172" height="54" rx="12"/>
      <circle class="glyph" cx="${x - 64}" cy="${y}" r="11" opacity=".22"/><text x="${x - 64}" y="${y + 4}" text-anchor="middle" style="font-size:${glyph.length > 1 ? 9 : 11}px">${esc(glyph)}</text>
      <text x="${x - 46}" y="${y - 4}">${esc(laneName(run, l))}</text>
      <text class="sub" x="${x - 46}" y="${y + 11}" data-sub="${l}">${esc(sub)}</text></g>`;
  }).join('');
  const [gx, gy] = P.gate;
  svg.innerHTML = `<g id="edges">${edges}</g>${nodes}<rect class="gate-ring" id="gateRing" x="${gx - 92}" y="${gy - 33}" width="184" height="66" rx="15" style="transform-origin:${gx}px ${gy}px"/><g id="pkts"></g>`;
  $('#mapHint').textContent = `${run.lanes.length} elements · ${pairs.size} routes`;
  const kinds = [['call', 'Agent request'], ['read', 'Read · data'], ['signal', 'Model signal'], ['policy', 'Gate decision'], ['ledger', 'Ledger write'], ['dispatch', 'Dispatch'], ['inbound', 'Inbound'], ['approval', 'Approval'], ['handoff', 'Hand-off']];
  $('#legend').innerHTML = kinds.map(([k, l]) => `<span><i style="--c:var(--k-${k})"></i>${l}</span>`).join('');
}

function flyPacket(e) {
  if (reduced || e.from === e.to) return;
  const [a, b] = [e.from, e.to].sort();
  const path = $(`[data-edge="${a}|${b}"]`);
  if (!path) return;
  const rev = e.from !== a;
  const len = path.getTotalLength();
  const g = document.createElementNS(SVGNS, 'g');
  const color = e.kind === 'policy' ? `var(--o-${e.outcome})` : `var(--k-${e.kind})`;
  g.innerHTML = `<circle class="pkt" r="6" style="fill:${color}"/><text class="pkt-label" dx="10" dy="-8">${esc(e.label.length > 30 ? `${e.label.slice(0, 29)}…` : e.label)}</text>`;
  $('#pkts').appendChild(g);
  const dur = Math.max(260, Math.min(900, (DELAY[e.kind] || 600) * 0.8 / R.speed));
  const t0 = performance.now();
  const c = g.firstChild, tx = g.lastChild;
  const ease = (p) => 1 - Math.pow(1 - p, 3);
  const frame = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    const pt = path.getPointAtLength(len * (rev ? 1 - ease(p) : ease(p)));
    c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y);
    tx.setAttribute('x', pt.x); tx.setAttribute('y', pt.y);
    if (p < 1) requestAnimationFrame(frame);
    else { g.style.transition = 'opacity .3s'; g.style.opacity = '0'; setTimeout(() => g.remove(), 320); }
  };
  requestAnimationFrame(frame);
}

function paintTopo(st, e) {
  const svg = $('#topo');
  svg.querySelectorAll('.tn').forEach((n) => n.classList.toggle('hot', !!e && (n.dataset.node === e.from || n.dataset.node === e.to)));
  svg.querySelectorAll('.te').forEach((p) => {
    const [a, b] = p.dataset.edge.split('|');
    p.classList.toggle('hot', !!e && ((e.from === a && e.to === b) || (e.from === b && e.to === a)));
  });
  const decisions = OUTCOMES.reduce((s, o) => s + st.counts[o], 0);
  const sub = (l, t) => { const el = svg.querySelector(`[data-sub="${l}"]`); if (el) el.textContent = t; };
  sub('gate', `${decisions} decision${decisions === 1 ? '' : 's'}`);
  sub('ledger', `${st.writes} entries${st.sealed ? ' · sealed' : ''}`);
  sub('models', `${st.signals} signals · local`);
  const ring = $('#gateRing');
  const lp = R.lastPolicy;
  setHTML($('#gateSay'), lp ? `<span class="badge o o-${lp.outcome}">${lp.outcome}</span> <span class="kbd-hint">${esc(lp.label)}</span>` : '');
  if (e && e.kind === 'policy' && !reduced) {
    ring.setAttribute('class', `gate-ring o-${e.outcome}`);
    void ring.getBBox();
    ring.setAttribute('class', `gate-ring go o-${e.outcome}`);
  }
}

// ---------- swimlanes ----------
const LW = 34, LH = 30, LX = 20;
function paintLanes() {
  const run = R.run, lanes = run.lanes;
  $('#laneLabels').innerHTML = lanes.map((l) => `<div style="--c:${laneColor(run, l)}"><i></i>${esc(laneName(run, l))}</div>`).join('');
  const n = run.events.length, W = LX * 2 + n * LW, H = lanes.length * LH;
  const row = (l) => lanes.indexOf(l) * LH + LH / 2;
  let s = lanes.map((l, k) => `<line class="row" x1="0" x2="${W}" y1="${k * LH + LH / 2}" y2="${k * LH + LH / 2}"/>`).join('');
  for (let i = 0; i < R.idx; i++) {
    const e = run.events[i], x = LX + i * LW + LW / 2;
    const sel = R.sel && R.sel.type === 'event' && R.sel.i === i;
    const col = e.kind === 'policy' ? `var(--o-${e.outcome})` : `var(--k-${e.kind})`;
    let body;
    if (e.from === e.to) {
      const y = row(e.from);
      body = `<path d="M${x} ${y - 7} L${x + 7} ${y} L${x} ${y + 7} L${x - 7} ${y}Z" style="fill:${col}"/>`;
    } else {
      const y1 = row(e.from), y2 = row(e.to);
      const head = e.kind === 'ledger' || e.kind === 'seal'
        ? `<rect class="head" x="${x - 5}" y="${y2 - 5}" width="10" height="10" style="fill:${col}"/>`
        : `<circle class="head" cx="${x}" cy="${y2}" r="5" style="fill:${col}"/>`;
      body = `<line x1="${x}" x2="${x}" y1="${y1}" y2="${y2}" style="stroke:${col}"/><circle cx="${x}" cy="${y1}" r="2.6" style="fill:${col}"/>${head}`;
    }
    s += `<g class="ev ${sel ? 'sel' : ''} ${i === R.idx - 1 ? 'now' : ''}" data-ev="${i}"><rect class="hit" x="${x - LW / 2 + 1}" y="0" width="${LW - 2}" height="${H}" rx="4"/>${body}<title>${i + 1}. ${esc(KIND_INFO[e.kind])}: ${esc(e.label)}${e.outcome ? ` (${e.outcome})` : ''}</title></g>`;
  }
  if (R.idx < n) s += `<line x1="${LX + R.idx * LW + 2}" x2="${LX + R.idx * LW + 2}" y1="0" y2="${H}" style="stroke:var(--accent);stroke-dasharray:2 3;opacity:.6"/>`;
  const svg = $('#lanesSvg');
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
  const sc = $('#lanesScroll');
  const cx = LX + R.idx * LW;
  if (cx > sc.scrollLeft + sc.clientWidth - 60 || cx < sc.scrollLeft) sc.scrollLeft = Math.max(0, cx - sc.clientWidth * 0.7);
}

// ---------- ledger ----------
function visibleEntries(st) { return R.run.entries.slice(0, st.writes); }
function paintChain(st) {
  const run = R.run;
  const list = R.tampered ? R.tampered.entries : visibleEntries(st);
  const bad = R.tampered && !R.tampered.result.ok ? R.tampered.result.failure.at : -1;
  const html = list.map((en, k) => {
    const sel = R.sel && R.sel.type === 'entry' && R.sel.seq === en.seq && !R.tampered;
    const ev = run.events.find((x) => x.entrySeq === en.seq);
    const isNew = !R.tampered && k >= R.chainShown && k === list.length - 1;
    return `<div class="blk ${sel ? 'sel' : ''} ${k === bad ? 'bad' : ''} ${bad >= 0 && k > bad ? 'after-bad' : ''} ${isNew ? 'new' : ''}" data-seq="${en.seq}" tabindex="0" role="button" aria-label="Ledger entry ${en.seq}: ${esc(en.type)}">
      <span class="seq">#${en.seq}</span><span class="ty">${esc(en.type)}</span>${ev?.outcome ? `<span class="badge o o-${ev.outcome}">${ev.outcome}</span>` : '<span></span>'}
      <div class="meta"><span>${esc(en.actor)}</span>${ev?.agent ? agentChip(run, ev.agent) : ''}<span class="h">prev ${short(en.prevHash)}</span><span class="h">hash ${short(en.entryHash)}</span></div></div>`;
  }).join('');
  const box = $('#chain');
  box.innerHTML = html || '<p class="small muted" style="margin:0">No entries yet. The first gate decision writes entry #1.</p>';
  if (!R.tampered) { R.chainShown = list.length; box.scrollTop = box.scrollHeight; }
  $('#chainCount').textContent = `${list.length} of ${run.entries.length} entries${R.tampered ? ' · TAMPERED COPY' : ''}`;
  const hb = $('#headBox');
  hb.hidden = !st.sealed;
  if (st.sealed) hb.innerHTML = `<b>Head commitment</b> · held by ${esc(run.head.heldBy)}, apart from the ledger<br>run ${esc(run.head.runId)} · count <b>${run.head.count}</b> · final hash <b>${esc(run.head.finalHash.slice(0, 16))}…</b>`;
  $('#restoreBtn').hidden = !R.tampered;
}
function runVerify(show = true) {
  const st = stateAt(R.run, R.idx);
  const list = R.tampered ? R.tampered.entries : visibleEntries(st);
  const res = verify(list, st.sealed ? R.run.head : null);
  if (!show) return res;
  const out = $('#verifyOut');
  out.hidden = false;
  if (res.ok) {
    const truncNote = R.tampered && R.tampered.how === 'truncate' && !st.sealed ? ' The chain alone cannot show a missing tail; that is what the head commitment, made when the run is sealed, is for.' : '';
    out.className = 'verify-out ok';
    out.textContent = `✓ ${res.checked} entries verified: each hash matches its content and links to the entry before.${st.sealed ? ' The head commitment matches.' : ''}${truncNote}`;
  } else {
    out.className = 'verify-out bad';
    out.textContent = res.failure.kind === 'head mismatch'
      ? `✗ head mismatch: ${res.failure.detail}. Entries were cut from the end, so this file is not the whole record.`
      : `✗ ${res.failure.kind} at entry #${res.failure.seq}: ${res.failure.detail}. Every entry after it is untrusted.`;
  }
  return res;
}

// ---------- side panels ----------
function paintTasks(st) {
  const run = R.run;
  const cols = run.agents.length;
  $('#tasks').style.setProperty('--cols', cols);
  $('#tasks').innerHTML = run.agents.map((a) => {
    const steps = st.steps[a.id] || [];
    const icon = { done: '✓', doing: '•', waiting: '!', skipped: '–', todo: '' };
    return `<div><h6>${agentChip(run, a.id)}</h6><div class="mand">${esc(a.mandate)}</div><ol class="steps">${steps.map((s) => `<li class="${s.status}"><i>${icon[s.status]}</i><span>${esc(s.label)}${s.status === 'waiting' ? ' <span class="badge warn" style="font-size:.56rem">waiting</span>' : ''}</span></li>`).join('')}</ol></div>`;
  }).join('');
}
function paintScore(st) {
  const lab = { allowed: 'allowed', filtered: 'filtered', denied: 'denied', escalated: 'asked you', ignored: 'ignored' };
  $('#score').innerHTML = OUTCOMES.map((o) => `<div class="o-${o}"><b>${st.counts[o]}</b><span>${lab[o]}</span></div>`).join('');
  $('#scoreFoot').innerHTML = `<span><b>${st.signals}</b> model signals</span><span><b>${st.writes}</b> ledger writes</span><span><b>${st.approvalsDone.length}</b> decisions by Alex</span>`;
}
function paintApprovals(st) {
  const run = R.run;
  const pend = pendingDecision();
  const open = st.approvalsOpen.map((a) => {
    const live = pend && pend.decision.id === a.id;
    return `<div class="appr-card"><div class="row" style="gap:8px;flex-wrap:wrap"><b>${esc(a.title)}</b>${a.agent ? agentChip(run, a.agent) : '<span class="agent-chip" style="--c:var(--fg)">Gate</span>'}</div><p>${esc(a.body)}</p>
      <div class="row">${live ? a.options.map((o) => `<button class="btn sm ${o === a.dflt ? 'primary' : ''}" data-decide="${esc(a.id)}" data-choice="${esc(o)}">${esc(o)}</button>`).join('') : `<span class="kbd-hint">${R.auto ? 'Autopilot: using the default' : 'Deciding…'}</span>`}</div>
      ${live ? `<span class="kbd-hint">Default: ${esc(a.dflt)}. Your choice changes what happens next and is written to the ledger first.</span>` : ''}</div>`;
  }).join('');
  const done = st.approvalsDone.map((a) => `<div class="appr-done"><span class="badge ok">decided</span><span>${esc(a.title)} → <b>${esc(a.choice)}</b></span></div>`).join('');
  setHTML($('#appr'), open + done || '<p class="empty">Nothing needs Alex yet. Commit-class actions, critical facts, out-of-mandate packages and anything a rule can’t settle will appear here.</p>');
}

function paintWhy() {
  const run = R.run, box = $('#why');
  let e = null, entry = null;
  if (R.sel?.type === 'event') e = run.events[R.sel.i];
  else if (R.sel?.type === 'entry') { entry = run.entries[R.sel.seq - 1]; e = run.events.find((x) => x.entrySeq === R.sel.seq); }
  else e = run.events[R.idx - 1];
  if (!e) { box.innerHTML = '<p class="small muted" style="margin:0">Press play, or click any arrow in the swimlanes or any ledger block.</p>'; return; }
  if (!entry && e.entrySeq) entry = run.entries[e.entrySeq - 1];
  const w = e.why;
  box.innerHTML = `<h5>Step ${e.i + 1} of ${run.events.length} · ${esc(KIND_INFO[e.kind])}${R.sel ? ' · selected' : ' · latest'}</h5>
    <div class="route"><b>${esc(laneName(run, e.from))}</b> → <b>${esc(laneName(run, e.to))}</b> · t+${(e.at / 1000).toFixed(2)} s ${e.agent ? agentChip(run, e.agent) : ''} ${e.outcome ? `<span class="badge o o-${e.outcome}">${e.outcome}</span>` : ''}</div>
    <div><b>${esc(e.label)}</b>${e.detail ? `<p class="small muted" style="margin:6px 0 0">${esc(e.detail)}</p>` : ''}</div>
    ${w ? `<div><h5 style="margin-bottom:6px">Options considered</h5><div class="opts">${(w.options || []).map((o) => `<span>${esc(o)}</span>`).join('')}</div></div>
      <ul class="small"><li><b>Rule:</b> ${esc(w.rule || '—')}</li>${w.signal ? `<li><b>Signal:</b> ${esc(w.signal)}</li>` : ''}<li><b>Sources:</b> ${(w.sources || []).map(esc).join(' · ') || '—'}</li></ul>` : ''}
    ${entry ? `<div><h5 style="margin-bottom:6px">Ledger entry #${entry.seq} · written before anything is sent</h5><pre>${esc(JSON.stringify(entry, null, 2))}</pre></div>` : ''}`;
}

function paintPanel(st) {
  const run = R.run, scn = run.scenario, P = st.panel, box = $('#sp');
  const titles = { hotels: 'S1 · Hotels being narrowed', claims: 'S2 · Claims and facts', negotiation: 'S3 · The negotiation', attacks: 'S4 · Ten attacks', coordination: 'S5 · Two agents, one owner' };
  $('#spTitle').textContent = titles[scn.panel];
  $('#spExtra').innerHTML = '';
  const wait = (t) => `<p class="small muted" style="margin:0">${t}</p>`;
  if (scn.panel === 'hotels') {
    box.innerHTML = P.hotels ? `<div class="sp-list">${P.hotels.map((h) => `<div class="sp-row ${h.state}"><b>${esc(h.name)}</b><span class="badge ${h.state === 'rejected' ? 'risk' : h.state === 'drafted' ? 'ok' : h.state === 'shortlisted' ? 'info' : ''}">${h.state}</span><small>€${h.rate}/night · ${h.walk} min walk · ${h.veg ? 'vegetarian breakfast' : 'no vegetarian option'}${h.reject && h.state === 'rejected' ? ` · ${esc(h.reject)}` : ''}</small></div>`).join('')}</div>` : wait('Waiting for the hotel search. The agent first reads confirmed facts through the gate.');
  } else if (scn.panel === 'claims') {
    box.innerHTML = P.claims ? `<div class="sp-list">${P.claims.map((c) => `<div class="sp-row ${/blocks/.test(c.state) ? 'blocks' : c.state}"><b>${esc(c.what)}</b><span class="badge ${/blocks/.test(c.state) ? 'warn' : c.state === 'fact' ? 'ok' : ''}">${esc(c.state)}</span><small>${esc(c.source)} · ${esc(c.date)}</small></div>`).join('')}</div>` : wait('Waiting for the agent to read what is known about the venue.');
  } else if (scn.panel === 'negotiation') {
    const N = P.negotiation;
    const meta = run.meta || {};
    const link = `negotiate.html?${esc(new URLSearchParams({ fixture: meta.fixture || R.fixture, seed: R.seed, style: meta.style || R.style, ours: meta.ours || R.ours }).toString())}`;
    $('#spExtra').innerHTML = `<a class="btn sm" href="${link}">Both sides ⇄</a>`;
    if (!N) { box.innerHTML = wait(`Mandate MND-LEASE-001 first, then up to ${meta.rounds || 8} rounds against Harbor Lettings’ agent (${esc(STYLE_LABEL[meta.style] || meta.style)}). Engine: vendored Neocloud nego-engine, seed ${R.seed}.`); return; }
    const W = 320, H = 64, pts = (side) => N.offers.map((o, k) => [k, o]).filter(([, o]) => o.side === side).map(([k, o]) => `${(k / Math.max(1, N.offers.length - 1)) * (W - 8) + 4},${H - 6 - o.uTenant * (H - 12)}`).join(' ');
    const rows = N.offers.slice().reverse().map((o) => `<tr><td class="mono">${o.round}</td><td>${o.side === 'tenant' ? agentChip(run, 'tenant') : '<span class="agent-chip" style="--c:var(--s3)">Landlord agent</span>'}</td><td class="small">${esc(o.text)}</td><td class="mono">${pct(o.uTenant)}</td><td>${o.inMandate ? '<span class="badge ok">in</span>' : '<span class="badge risk">out</span>'}</td></tr>`).join('');
    const clauses = P.clauses ? `<h5 class="kbd-hint" style="margin:4px 0 0">What did my agent negotiate? Clauses for Alex</h5><div class="sp-list">${P.clauses.map((c) => `<div class="sp-row ${c.state}"><b>${esc(c.issue)}: ${esc(c.term)}</b><span class="badge ${c.state === 'agreed' ? 'ok' : c.state === 'contested' ? 'warn' : ''}">${c.state}</span></div>`).join('')}</div>` : '';
    box.innerHTML = `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Value to Alex of each offer"><polyline class="l1" fill="none" stroke-width="2" points="${pts('tenant')}"/><polyline class="l3" fill="none" stroke-width="2" points="${pts('landlord')}"/></svg>
      <div class="legend" style="border:0;padding:0"><span><i style="--c:var(--s1)"></i>Tenant agent's offers</span><span><i style="--c:var(--s3)"></i>Landlord agent's offers</span><span>height = value to Alex</span></div>
      <div class="offers-scroll"><table class="t compact"><thead><tr><th>R</th><th>Side</th><th>Package</th><th>Alex</th><th>Mandate</th></tr></thead><tbody>${rows}</tbody></table></div>${clauses}`;
  } else if (scn.panel === 'attacks') {
    box.innerHTML = P.attacks ? `<div class="atk-grid">${P.attacks.map((a) => `<div class="atk ${a.state === 'pending' ? 'pending' : `o o-${a.state}`}"><div class="top">${a.id}<span class="badge ${a.state === 'pending' ? '' : `o o-${a.state}`}">${a.state}</span><span class="muted">${esc(a.where)}</span></div><span>${esc(a.text)}</span>${a.state !== 'pending' ? `<small class="muted">${esc(a.why)}</small>` : ''}</div>`).join('')}</div>` : wait('Waiting for Swift Movers to reply.');
  } else if (scn.panel === 'coordination') {
    const direct = run.events.filter((e) => e.from.startsWith('agent:') && e.to.startsWith('agent:')).length;
    const cols = run.agents.map((a) => `<div class="col" style="--c:var(${a.color})">${agentChip(run, a.id)}<span class="mono">${esc(a.mandate)}</span><span><b>${st.agentWrites[a.id] || 0}</b> ledger entries for this agent</span><span>${(st.steps[a.id] || []).filter((s) => s.status === 'done').length}/${(st.steps[a.id] || []).length} steps done</span></div>`).join('');
    const hand = (P.handoffs || []).map((h) => `<div class="sp-row ${h.state === 'superseded' ? 'superseded' : ''}"><b>${esc(h.from)} → gate → ${esc(h.to)}</b><span class="badge ${h.state === 'delivered' ? 'ok' : ''}">${esc(h.state)}</span><small>${esc(h.what)}</small></div>`).join('');
    const conf = (P.conflicts || []).map((c) => `<div class="sp-row blocks"><b>${esc(c.what)}</b><span class="badge warn">conflict</span><small>${esc(c.resolution)}</small></div>`).join('');
    box.innerHTML = `<div class="coord">${cols}</div><div class="sp-list">${hand || wait('No hand-offs yet.')}${conf}</div>
      <div class="assert ${direct ? 'bad' : ''}">${direct ? `✗ ${direct} direct agent-to-agent messages` : '✓ 0 direct agent-to-agent messages in this run: every hand-off went through the gate.'} ✓ One ledger, ${run.entries.length} entries, each tagged with its agent.</div>`;
  }
}

function paintHead() {
  const run = R.run, scn = run.scenario;
  const extra = scn.id === 's3' && run.meta ? ` · ${LEASE_SCENARIOS[run.meta.fixture].title} · landlord ${STYLE_LABEL[run.meta.style] || run.meta.style} · tenant ${STYLE_LABEL[run.meta.ours] || run.meta.ours} · real engine` : '';
  $('#runHead').innerHTML = `<span class="rc-code" style="font-family:var(--font-display);font-size:2.3rem;color:var(--accent);line-height:.8">${scn.code}</span><h3>${esc(scn.title)}</h3><span class="sim-scope ${scn.scope.startsWith('beyond') ? 'beyond' : ''}">${esc(scn.scope)}</span>${run.agents.map((a) => agentChip(run, a.id)).join(' ')}<p>${esc(scn.blurb)} <span class="mono small">${esc(run.id)} · seed ${R.seed}${esc(extra)}</span></p>`;
}

function paintStatus(st) {
  const n = R.run.events.length;
  const pend = pendingDecision();
  const res = R.run.result;
  const tail = st.sealed ? (res ? ` · ${res.status}` : '') + ' · sealed' : pend ? ' · <b style="color:var(--warn)">waiting for Alex</b>' : R.playing ? ' · running' : ' · paused';
  $('#runStatus').innerHTML = `Event <b>${R.idx}</b>/${n} · <b>${st.writes}</b> entries${tail}`;
  const sc = $('#scrub');
  sc.max = n; sc.value = R.idx;
}

function renderAll(e) {
  const st = stateAt(R.run, R.idx);
  paintHead(); paintStatus(st); paintTopo(st, e); paintLanes(); paintChain(st);
  paintTasks(st); paintScore(st); paintApprovals(st); paintWhy(); paintPanel(st);
  if (e) flyPacket(e);
  if (!$('#verifyOut').hidden && !R.tampered) runVerify();
}

// ---------- controls ----------
function syncControls() {
  $('#scnSeg').innerHTML = SCENARIO_ORDER.map((id) => `<button aria-pressed="${R.scenario === id}" data-scn="${id}" title="${esc(SCENARIOS[id].title)}">${SCENARIOS[id].code}</button>`).join('');
  $('#s3Opts').hidden = R.scenario !== 's3';
  $('#fixSel').innerHTML = LEASE_ORDER.map((f) => `<option value="${f}" ${f === R.fixture ? 'selected' : ''}>${esc(LEASE_SCENARIOS[f].code)} · ${f === 'lease-f-l1' ? 'feasible' : 'infeasible'}</option>`).join('');
  $('#styleSel').innerHTML = STYLE_ORDER.map((s) => `<option value="${s}" ${s === R.style ? 'selected' : ''}>${esc(STYLE_LABEL[s] || s)}</option>`).join('');
  $('#oursSel').innerHTML = STYLE_ORDER.map((s) => `<option value="${s}" ${s === R.ours ? 'selected' : ''}>${esc(STYLE_LABEL[s] || s)}</option>`).join('');
  $('#seedIn').value = R.seed;
}

$('#scnSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-scn]'); if (b) loadRun({ scenario: b.dataset.scn, seed: R.seed, fixture: R.fixture, style: R.style, ours: R.ours }); });
$('#fixSel').addEventListener('change', (e) => loadRun({ scenario: 's3', seed: R.seed, fixture: e.target.value, style: R.style, ours: R.ours }));
$('#styleSel').addEventListener('change', (e) => loadRun({ scenario: 's3', seed: R.seed, fixture: R.fixture, style: e.target.value, ours: R.ours }));
$('#oursSel').addEventListener('change', (e) => loadRun({ scenario: 's3', seed: R.seed, fixture: R.fixture, style: R.style, ours: e.target.value }));
$('#seedIn').addEventListener('change', (e) => loadRun({ scenario: R.scenario, seed: Math.max(0, Math.min(99999, +e.target.value || 0)), fixture: R.fixture, style: R.style, ours: R.ours }));
$('#playBtn').addEventListener('click', () => (R.playing ? stop() : play()));
$('#stepBtn').addEventListener('click', () => { stop(); advance(); });
$('#restartBtn').addEventListener('click', () => { stop(); loadRun({ scenario: R.scenario, seed: R.seed, fixture: R.fixture, style: R.style, ours: R.ours }); });
$('#speedSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-speed]'); if (!b) return; R.speed = +b.dataset.speed; $('#speedSeg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
$('#autoDecide').addEventListener('change', (e) => { R.auto = e.target.checked; renderAll(null); });
$('#scrub').addEventListener('input', (e) => { stop(); setIdx(+e.target.value); R.sel = null; renderAll(null); });
$('#appr').addEventListener('click', (e) => { const b = e.target.closest('[data-decide]'); if (b) decide(b.dataset.decide, b.dataset.choice); });
$('#lanesSvg').addEventListener('click', (e) => { const g = e.target.closest('[data-ev]'); if (!g) return; const i = +g.dataset.ev; R.sel = R.sel?.type === 'event' && R.sel.i === i ? null : { type: 'event', i }; paintLanes(); paintWhy(); });
const pickEntry = (t) => { const b = t.closest('[data-seq]'); if (!b || R.tampered) return; const seq = +b.dataset.seq; R.sel = R.sel?.type === 'entry' && R.sel.seq === seq ? null : { type: 'entry', seq }; paintChain(stateAt(R.run, R.idx)); paintWhy(); };
$('#chain').addEventListener('click', (e) => pickEntry(e.target));
$('#chain').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickEntry(e.target); } });
$('#verifyBtn').addEventListener('click', () => runVerify());
$('#tamperBtn').addEventListener('click', () => {
  stop();
  const st = stateAt(R.run, R.idx);
  const list = visibleEntries(st);
  if (list.length < 3) { toast('Play a little further first: the ledger needs a few entries'); return; }
  const how = $('#tamperSel').value;
  const at = R.sel?.type === 'entry' ? R.sel.seq - 1 : Math.floor(list.length / 2);
  const entries = tamper(list, how, at);
  R.tampered = { how, entries, result: { ok: true } };
  R.tampered.result = runVerify(false);
  R.sel = null;
  paintChain(st); runVerify();
});
$('#restoreBtn').addEventListener('click', () => { R.tampered = null; renderAll(null); runVerify(); });

// ---------- boot ----------
renderFilters();
initBoard();
board.timer = setInterval(boardTick, 480);
renderTemplate();
const q = new URLSearchParams(location.search);
const scn0 = SCENARIO_ORDER.includes(q.get('scenario')) ? q.get('scenario') : 's1';
const decisions0 = {};
for (const [k, v] of q) if (/^d\.[a-z0-9-]{1,40}$/.test(k) && v.length <= 60) decisions0[k.slice(2)] = v; // choices are checked against each approval's options
loadRun({
  scenario: scn0, seed: Number.isFinite(+q.get('seed')) && q.get('seed') !== null ? +q.get('seed') : 42, decisions: decisions0,
  fixture: LEASE_ORDER.includes(q.get('fixture')) ? q.get('fixture') : 'lease-f-l1',
  style: STYLE_ORDER.includes(q.get('style')) ? q.get('style') : 'boulware',
  ours: STYLE_ORDER.includes(q.get('ours')) ? q.get('ours') : 'linear',
});
// In-page scenario links (the shell may already have rewritten them to keep ?brand=).
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href*="scenario="]');
  if (!a) return;
  const u = new URL(a.href);
  if (u.pathname !== location.pathname || !SCENARIO_ORDER.includes(u.searchParams.get('scenario'))) return;
  e.preventDefault();
  const seed = u.searchParams.has('seed') ? +u.searchParams.get('seed') : R.seed;
  loadRun({ scenario: u.searchParams.get('scenario'), seed, fixture: R.fixture, style: R.style, ours: R.ours }, { autoplay: true });
  $('#run').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
});
