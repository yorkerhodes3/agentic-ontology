// Two-sides negotiation screen: the tenant agent and the landlord agent, each with its own private
// simulation (brief, concession curve, opponent model), at one table. Swap or view both.
// Computed live by the vendored Neocloud engine on Wayfinder's lease fixtures. Deterministic.
import { mountShell, toast } from '../shell.js';
import { esc } from '../lib/esc.js';
import { Negotiation, STYLE_ORDER, targetUtility, analyse, indexOfDigits, mandateCheck } from '../vendor/neocloud-nego/nego/engine.js';
import { LEASE_SCENARIOS, LEASE_ORDER, PERSONA } from '../wayfinder/lease.js';
import { buildRun } from '../wayfinder/flows.js';
import { verify } from '../wayfinder/ledger.js';

mountShell('negotiate');
const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`);
const other = (s) => (s === 'us' ? 'them' : 'us');
const STYLE_LABEL = { boulware: 'Boulware · holds firm', linear: 'Linear · steady', conceder: 'Conceder · gives early', tft: 'Tit-for-tat · mirrors' };
const SEAT = {
  us: { name: 'Tenant agent', sub: `acts for ${PERSONA.name}`, av: 'T', color: '--s1', short: 'Tenant', owner: PERSONA.name },
  them: { name: 'Landlord agent', sub: 'acts for Harbor Lettings · synthetic', av: 'L', color: '--s3', short: 'Landlord', owner: 'Harbor Lettings' },
};

const q = new URLSearchParams(location.search);
const S = {
  fixture: LEASE_ORDER.includes(q.get('fixture')) ? q.get('fixture') : 'lease-f-l1',
  style: STYLE_ORDER.includes(q.get('style')) ? q.get('style') : 'boulware',
  ours: STYLE_ORDER.includes(q.get('ours')) ? q.get('ours') : 'linear',
  seed: q.get('seed') !== null && Number.isFinite(+q.get('seed')) ? Math.max(0, Math.min(99999, Math.floor(+q.get('seed')))) : 42,
  view: ['us', 'both', 'them'].includes(q.get('view')) ? q.get('view') : q.get('view') === 'landlord' ? 'them' : q.get('view') === 'tenant' ? 'us' : 'us',
  left: 'us', esc: {}, snaps: [], idx: 0, playing: false, speed: 1, timer: null, inst: null, agents: null, analysis: null, agreed: false,
};
if (S.view === 'them') S.left = 'them';

// ---------------------------------------------------------------- build snapshots
function build() {
  const scn = LEASE_SCENARIOS[S.fixture];
  const nego = new Negotiation(scn, { seed: S.seed, style: S.style, ours: S.ours, policy: 'interactive' });
  const inst = nego.inst;
  const sideOf = (actor) => (actor === nego.us.id ? 'us' : 'them');
  const assess = { us: [], them: [] };
  const snaps = [];
  let seen = 0;
  const capture = () => {
    const recs = nego.records.slice(seen);
    seen = nego.records.length;
    let move = null, escal = null, human = null;
    for (const r of recs) {
      if (r.kind === 'assessment') assess[sideOf(r.actor)].push({ ...r.payload });
      else if (r.kind === 'move') {
        const p = r.payload, side = sideOf(r.actor);
        if (p.offer) {
          const d = inst.issues.map((is) => is.levels.indexOf(p.offer[is.id]));
          const i = indexOfDigits(inst, d);
          move = { side, kind: p.kind, round: p.roundNumber, moveId: p.id, d, i, x: inst.uUs[i], y: inst.uThem[i], ok: inst.ok[i] === 1, human: p.authoredBy === 'human' };
        } else if (p.kind === 'walk') move = { side, kind: 'walk', round: p.roundNumber, moveId: p.id };
        else if (!move && p.roundNumber === 0) move = { side, kind: 'open', round: 0, moveId: p.id };
        else if (!move && p.tacticsApplied?.includes('escalation')) move = { side, kind: 'hold', round: p.roundNumber, moveId: p.id };
      } else if (r.kind === 'escalate' && r.payload.hitl === 'HITL-04') escal = { id: r.payload.id, reasons: r.payload.reasons, hard: r.payload.reasons.some((x) => /M5/.test(x)) };
      else if (r.kind === 'human_decision') human = r.payload.decision;
    }
    snaps.push({
      move, escal, human, round: nego.round, done: nego.done, result: nego.result, pending: nego.pending ? nego.pending.escId : null,
      assess: { us: assess.us.slice(), them: assess.them.slice() },
      model: { us: nego.agents.us.model.w.slice(), them: nego.agents.them.model.w.slice() },
    });
  };
  let guard = 0;
  while (!nego.done && guard++ < 200) {
    if (nego.pending) {
      const id = nego.pending.escId;
      if (!(id in S.esc)) break;
      nego.decide(S.esc[id]);
      capture();
      continue;
    }
    if (nego.step() === 0 && !nego.pending) break;
    capture();
  }
  S.snaps = snaps;
  S.inst = inst;
  S.nego = nego;
  S.agents = { us: pick(nego.agents.us), them: pick(nego.agents.them) };
  S.analysis = analyse(inst);
}
const pick = (a) => ({ style: a.style, e: a.e, uMax: a.uMax, uRes: a.uRes });

const visible = (side) => S.view === 'both' || S.view === side;
const snap = () => S.snaps[Math.max(0, S.idx - 1)] || null;
const movesUpTo = () => S.snaps.slice(0, S.idx).map((s, k) => ({ ...s.move, k, snap: s })).filter((m) => m.kind);
const pkgChips = (d, prev) => {
  const failed = visible('us') ? new Set(mandateCheck(S.inst, d).failed.map((c) => S.inst.scn.mandate.rules.find((r) => r.id === c.id)?.issue)) : new Set();
  return S.inst.issues.map((is, q) => {
  const chg = prev && prev[q] !== d[q];
  const bad = failed.has(is.id);
  return `<span class="${chg ? 'chg' : ''} ${bad ? 'bad' : ''}" title="${esc(is.label)}">${esc(is.short)} ${esc(is.fmt(is.levels[d[q]]))}</span>`;
  }).join('');
};

// ---------------------------------------------------------------- seat consoles
function seatHTML(side) {
  const info = SEAT[side], inst = S.inst, ag = S.agents[side];
  const you = S.view === side ? '<span class="you">You are here</span>' : S.view === 'both' ? '<span class="you" style="background:var(--muted)">Operator</span>' : '';
  const head = `<div class="seat-head"><div class="av">${info.av}</div><div><b>${info.name}</b><small>${esc(info.sub)}${visible(side) ? ` · ${esc(STYLE_LABEL[ag.style] || ag.style)}` : ' · strategy private'}</small></div>${you}</div>`;
  if (!visible(side)) {
    const theirs = movesUpTo().filter((m) => m.side === side && m.d).length;
    return `${head}<div class="masked"><div class="lock" aria-hidden="true">🔒</div><b>Private to the ${info.short.toLowerCase()} agent</b><span>From this side you see only its offers (${theirs} so far). Its weights, walk-away point and concession curve are hidden. Your agent has to guess them: see “What I think they want”.</span><button class="btn sm" data-swap>⇄ Swap to its side</button></div>`;
  }
  const s = snap();
  const A = s ? s.assess[side] : [];
  const last = A[A.length - 1];
  const w = inst.w[side];
  const brief = `<div class="seat-sec"><h5>Private brief <span class="marker">only this agent</span></h5>
    <div class="wbars">${inst.issues.map((is, q) => `<div class="wbar"><span>${esc(is.label)}</span><span class="tr"><i style="--w:${(w[q] / Math.max(...w)) * 100}%"></i></span><span class="v">${pct(w[q])}</span></div>`).join('')}</div>
    <div class="kbd-hint">Walk-away value <b style="color:var(--fg)">${pct(ag.uRes)}</b> · ${esc(inst.scn.batna[side].description)}</div>
    ${side === 'us' ? `<div class="kbd-hint">Mandate ${esc(inst.scn.mandate.id)} ${esc(inst.scn.mandate.version)}: ${inst.scn.mandate.rules.map((r) => esc(r.label)).join(' · ')}</div>` : '<div class="kbd-hint">Its owner’s limits are its own business: they never cross the table.</div>'}</div>`;
  const chart = `<div class="seat-sec"><h5>My simulation <span class="marker">concession curve</span></h5>${chartSVG(side, A)}
    <div class="legend" style="border:0;padding:0"><span><i style="--c:var(${info.color})"></i>my offers</span><span><i style="--c:var(--fg)"></i>offers received</span><span><i style="--c:var(--risk)"></i>walk-away</span></div></div>`;
  const mw = s ? s.model[side] : new Array(inst.k).fill(1 / inst.k);
  const tw = inst.w[other(side)];
  const err = mw.reduce((a, x, q) => a + Math.abs(x - tw[q]), 0) / 2;
  const model = `<div class="seat-sec"><h5>What I think they want <span class="marker">opponent model</span></h5>
    <div class="wbars">${inst.issues.map((is, q) => `<div class="wbar"><span>${esc(is.label)}</span><span class="tr"><i style="--w:${Math.min(100, mw[q] * 250)}%;opacity:.7"></i>${S.view === 'both' ? `<u style="--t:${Math.min(100, tw[q] * 250)}%" title="true weight ${pct(tw[q])}"></u>` : ''}</span><span class="v">${pct(mw[q])}</span></div>`).join('')}</div>
    <div class="kbd-hint">${S.view === 'both' ? `White ticks are the true weights (operator only). Guess error ${pct(err)}.` : 'Learned only from their offers: what they keep fixed matters to them.'}</div></div>`;
  const dec = last ? last.decision : '—';
  const thought = `<div class="seat-sec"><h5>Latest thought <span class="marker">AC_next</span></h5>${last ? `<div class="thought">
      <div><span>Round</span><b>${last.roundNumber} of ${inst.rounds}</b></div><div><span>Decision</span><b><span class="decision-tag">${esc(dec)}</span></b></div>
      <div><span>My target now</span><b>${pct(last.target)}</b></div><div><span>Their offer, to me</span><b>${pct(last.uIncoming)}</b></div>
      <div><span>…to them (my guess)</span><b>${pct(last.estOppIncoming)}</b></div><div><span>My next offer, to me</span><b>${pct(last.uNext)}</b></div>
      <div class="wide"><span>Rule</span><b style="font-weight:400;font-size:.68rem">Accept when their offer is worth at least my next one and clears my walk-away${side === 'us' ? ', and passes the mandate' : ''}.</b></div></div>` : '<p class="small muted" style="margin:0">Not started. Press play.</p>'}</div>`;
  return head + brief + chart + model + thought;
}

function chartSVG(side, A) {
  const W = 320, H = 170, l = 30, r = 10, t = 10, b = 22;
  const ag = S.agents[side];
  const X = (x) => l + x * (W - l - r), Y = (u) => t + (1 - u) * (H - t - b);
  let curve = '';
  if (ag.style !== 'tft') {
    const pts = []; for (let k = 0; k <= 40; k++) { const x = k / 40; pts.push(`${X(x).toFixed(1)},${Y(targetUtility(x, { e: ag.e, uMax: ag.uMax, uRes: ag.uRes })).toFixed(1)}`); }
    curve = `<polyline class="tgt" points="${pts.join(' ')}"/>`;
  } else if (A.length) curve = `<polyline class="tgt" points="${A.map((a) => `${X(a.t)},${Y(a.target)}`).join(' ')}"/>`;
  const sent = A.filter((a) => a.decision === 'counter');
  const recv = A.filter((a) => a.uIncoming != null);
  const now = A.length ? A[A.length - 1].t : null;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((u) => `<line class="ax" x1="${l}" x2="${W - r}" y1="${Y(u)}" y2="${Y(u)}" opacity=".5"/><text class="tick" x="${l - 4}" y="${Y(u) + 3}" text-anchor="end">${u * 100}</text>`).join('');
  return `<svg class="n2chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${SEAT[side].name}: target utility over time, offers sent and received">
    ${grid}<text class="tick" x="${l}" y="${H - 6}">start</text><text class="tick" x="${W - r}" y="${H - 6}" text-anchor="end">deadline</text>
    <line class="res" x1="${l}" x2="${W - r}" y1="${Y(ag.uRes)}" y2="${Y(ag.uRes)}"/><text class="lbl" x="${l + 4}" y="${Y(ag.uRes) + 12}">walk-away ${pct(ag.uRes)}</text>
    ${curve}
    ${sent.length ? `<polyline class="sent" points="${sent.map((a) => `${X(a.t)},${Y(a.uNext)}`).join(' ')}"/>` : ''}
    ${sent.map((a) => `<circle class="dot-s" cx="${X(a.t)}" cy="${Y(a.uNext)}" r="3.4"/>`).join('')}
    ${recv.map((a) => `<circle class="dot-r" cx="${X(a.t)}" cy="${Y(a.uIncoming)}" r="3.4"/>`).join('')}
    ${now != null ? `<line class="now" x1="${X(now)}" x2="${X(now)}" y1="${t}" y2="${H - b}"/>` : ''}
  </svg>`;
}

// ---------------------------------------------------------------- the table
function estFor(viewer, m, s) {
  // viewer's guess of the other side's value for move m, from viewer's own assessments
  const A = s.assess[viewer];
  if (m.side === viewer) { const a = [...A].reverse().find((x) => x.decision === 'counter' && x.nextOffer && S.inst.issues.every((is, q) => x.nextOffer[is.id] === is.levels[m.d[q]])); return a ? a.estOppNext : null; }
  const a = A.find((x) => x.incomingMoveId === m.moveId);
  return a ? a.estOppIncoming : null;
}
function msgHTML(m, prevSame, isNew) {
  const side = m.side, info = SEAT[side], s = snap();
  const align = side === S.left ? 'left' : 'right';
  const kindLabel = { proposal: 'opening offer', counter: 'counter-offer', accept: 'accepts', walk: 'walks away', open: 'opens', hold: 'pauses for its principal' }[m.kind] || m.kind;
  let body = '';
  if (m.kind === 'open') body = `<span class="small">“I am an AI agent acting for ${esc(PERSONA.name)} under mandate ${esc(S.inst.scn.mandate.id)}. A human can join on request.”</span>`;
  else if (m.kind === 'walk') body = `<span class="small">Deadline reached without an acceptable package${visible('us') ? ' inside the mandate' : ''}. No deal.</span>`;
  else if (m.kind === 'hold') body = `<span class="small">“Your package is close, but I must check with my principal before anything is agreed.”</span>`;
  else {
    body = `<div class="pkg">${pkgChips(m.d, prevSame?.d)}</div>`;
    const u = [];
    if (S.view === 'both') u.push(`<span>Tenant <b>${pct(m.x)}</b></span><span>Landlord <b>${pct(m.y)}</b></span>`);
    else {
      const me = S.view, mine = me === 'us' ? m.x : m.y;
      const g = estFor(me, m, s);
      u.push(`<span>To ${me === 'us' ? 'Alex' : 'Harbor'} <b>${pct(mine)}</b></span><span class="est">their value, my guess: ${g == null ? 'next turn' : pct(g)}</span>`);
    }
    if (visible('us')) u.push(m.ok ? '<span class="badge ok" style="font-size:.55rem">inside mandate</span>' : '<span class="badge risk" style="font-size:.55rem">outside mandate</span>');
    if (m.human) u.push('<span class="badge warn" style="font-size:.55rem">Alex, not the agent</span>');
    body += `<div class="u-row">${u.join('')}</div>`;
  }
  return `<div class="msg ${align} ${isNew ? 'new' : ''}" style="--c:var(${info.color})" data-k="${m.k}"><div class="mh"><span class="agent-chip" style="--c:var(${info.color})">${info.name}</span><span class="spacer"></span><span class="muted">R${m.round} · ${esc(kindLabel)}</span></div>${body}</div>`;
}

function tableHTML(newK) {
  const inst = S.inst, s = snap();
  const ms = movesUpTo();
  const round = s ? s.round : 0;
  const rounds = Array.from({ length: inst.rounds }, (_, k) => `<i class="${k + 1 < round || (s?.done && k + 1 <= round) ? 'done' : k + 1 === round ? 'now' : ''}"></i>`).join('');
  const prevBy = {};
  const msgs = ms.map((m) => { const h = msgHTML(m, prevBy[m.side], m.k === newK); if (m.d) prevBy[m.side] = m; return h; }).join('');
  let foot = '';
  if (s && s.pending && !(s.pending in S.esc)) {
    const e = s.escal || {};
    foot = `<div class="esc-card"><b>${visible('us') ? 'Acceptable, but outside Alex’s mandate' : 'The tenant agent has paused to ask its principal'}</b>
      ${visible('us') ? `<span class="small">${(e.reasons || []).map(esc).join('; ')}. Nothing is sent until Alex decides.</span>` : '<span class="small">From the landlord’s side, you only know the tenant agent needs a human. Its mandate stays private.</span>'}
      <div class="row wrap-row" style="gap:6px"><button class="btn sm primary" data-esc="deny">Keep the mandate</button><button class="btn sm" data-esc="approve" ${e.hard ? `disabled${visible('us') ? ' title="Hard bans can’t be lifted, even by a replacement mandate"' : ''}` : ''}>Sign a replacement mandate</button></div>
      ${e.hard && visible('us') ? '<span class="kbd-hint">This package needs bank statements: a hard ban. It can’t be approved.</span>' : ''}
      ${!visible('us') ? '<span class="kbd-hint">Alex decides; the choices are Alex’s, not the landlord’s.</span>' : ''}</div>`;
  } else if (s && s.done) {
    const R = s.result;
    const cls = R.status === 'walked' ? 'walked' : R.status === 'approved' ? 'approved' : '';
    const title = R.status === 'walked' ? 'No deal: walked away at the deadline'
      : !visible('us') ? (R.status === 'approved' ? 'Agreed, by Alex in person' : 'Agreed')
        : R.status === 'settled' ? 'Settlement proposal, inside the mandate' : 'Agreed above the first mandate, by Alex';
    const vals = R.agreement ? (S.view === 'both' ? `Tenant ${pct(R.agreement.x)} · Landlord ${pct(R.agreement.y)}` : S.view === 'us' ? `Worth ${pct(R.agreement.x)} to Alex (walk-away ${pct(S.agents.us.uRes)})` : `Worth ${pct(R.agreement.y)} to Harbor (walk-away ${pct(S.agents.them.uRes)})`) : S.view === 'both' ? S.analysis.settle.label : 'Neither side’s offer was acceptable to the other by the deadline';
    foot = `<div class="outcome-banner ${cls}"><b>${title}</b><span class="small">${esc(vals)} · ${R.roundsUsed} rounds${R.escalations ? ` · ${R.escalations} escalation` : ''}</span><a class="link-u small" href="#readout">See the readout ↓</a></div>`;
  }
  return `<div class="table-head"><h4>The table · round ${round} of ${inst.rounds}</h4><div class="rounds" aria-hidden="true">${rounds}</div><span class="kbd-hint">Only offers cross the table. Each side’s brief, curve and guesses stay on its own side.</span></div>
    <div class="lane-hdr"><span>← ${SEAT[S.left].name}</span><span>${SEAT[other(S.left)].name} →</span></div>
    <div class="stream" id="stream" aria-live="polite">${msgs || '<p class="small muted" style="margin:0">Press play. The tenant agent opens by saying it is an AI agent and naming its mandate.</p>'}</div>${foot}`;
}

function fly(m) {
  if (reduced || !m || !m.kind) return;
  const from = m.side === S.left ? $('#seatL .seat-head') : $('#seatR .seat-head');
  const to = m.side === S.left ? $('#seatR .seat-head') : $('#seatL .seat-head');
  if (!from || !to) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (!a.width || !b.width || Math.abs(a.top - b.top) > 400) return;
  const el = document.createElement('div');
  el.className = 'flying';
  el.style.setProperty('--c', `var(${SEAT[m.side].color})`);
  el.textContent = m.kind === 'accept' ? '✓' : m.kind === 'walk' ? '×' : '✉';
  document.body.appendChild(el);
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const anim = el.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 40}px) scale(1.2)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${x1}px, ${y1}px) scale(.7)`, opacity: 0 },
  ], { duration: 900 / S.speed, easing: 'cubic-bezier(.16,1,.3,1)' });
  el.style.left = '-13px'; el.style.top = '-9px';
  anim.onfinish = () => el.remove();
}

// ---------------------------------------------------------------- operator plot
function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888'; }
function drawPlot() {
  const panel = $('#opPanel');
  if (S.view !== 'both') {
    panel.innerHTML = `<div class="panel-head"><h4>Outcome space · operator only</h4></div><div class="masked" style="min-height:300px"><div class="lock">🔒</div><b>Nobody at the table sees this</b><span>Each agent knows only its own values and guesses the other side’s. Switch to Both to see every possible package and both walk-away points.</span><button class="btn sm" data-view-btn="both">View both</button></div>`;
    return;
  }
  if (!$('#opCanvas')) panel.innerHTML = `<div class="panel-head"><h4>Outcome space · ${S.analysis.N.toLocaleString()} packages</h4><span class="spacer"></span><span class="kbd-hint">${esc(S.analysis.settle.label)}</span></div><canvas id="opCanvas" class="op-canvas" width="1120" height="840" aria-label="Scatter of all packages by value to tenant and landlord, with both walk-away lines, the in-mandate frontier, both sides' offer paths and the agreement."></canvas><div class="op-legend" id="opLegend"></div>`;
  const cv = $('#opCanvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const m = { l: 70, r: 24, t: 24, b: 60 };
  const X = (x) => m.l + x * (W - m.l - m.r), Y = (y) => m.t + (1 - y) * (H - m.t - m.b);
  const A = S.analysis, C = { fg: cssv('--fg'), muted: cssv('--muted'), border: cssv('--border'), s1: cssv('--s1'), s3: cssv('--s3'), risk: cssv('--risk'), ok: cssv('--ok'), warn: cssv('--warn'), accent: cssv('--accent'), card: cssv('--card') };
  g.clearRect(0, 0, W, H);
  g.fillStyle = C.card; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.08; g.fillStyle = C.ok; g.fillRect(X(A.res.us), m.t, X(1) - X(A.res.us), Y(A.res.them) - m.t); g.globalAlpha = 1;
  g.strokeStyle = C.border; g.lineWidth = 1; g.font = '20px ui-monospace, monospace'; g.fillStyle = C.muted;
  for (let k = 0; k <= 4; k++) { const v = k / 4; g.beginPath(); g.moveTo(X(v), m.t); g.lineTo(X(v), Y(0)); g.moveTo(m.l, Y(v)); g.lineTo(X(1), Y(v)); g.stroke(); g.fillText(String(v * 100), X(v) - 12, H - 30); g.fillText(String(v * 100), 22, Y(v) + 6); }
  g.fillText('value to Alex (tenant) →', X(0.5) - 120, H - 6);
  g.save(); g.translate(16, Y(0.35)); g.rotate(-Math.PI / 2); g.fillText('value to Harbor (landlord) →', 0, 0); g.restore();
  for (const p of A.cloud) { g.globalAlpha = p.ok ? 0.55 : 0.2; g.fillStyle = p.ok ? C.s1 : C.muted; g.fillRect(X(p.x) - 2, Y(p.y) - 2, 4, 4); }
  g.globalAlpha = 1;
  g.setLineDash([8, 6]); g.strokeStyle = C.risk; g.lineWidth = 2;
  g.beginPath(); g.moveTo(X(A.res.us), m.t); g.lineTo(X(A.res.us), Y(0)); g.stroke();
  g.beginPath(); g.moveTo(m.l, Y(A.res.them)); g.lineTo(X(1), Y(A.res.them)); g.stroke(); g.setLineDash([]);
  g.fillStyle = C.risk; g.fillText('tenant walk-away', X(A.res.us) + 6, m.t + 20); g.fillText('landlord walk-away', m.l + 8, Y(A.res.them) - 8);
  if (A.frontierOk.length) { g.strokeStyle = C.fg; g.globalAlpha = 0.6; g.lineWidth = 2; g.beginPath(); A.frontierOk.forEach((p, k) => (k ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)))); g.stroke(); g.globalAlpha = 1; }
  if (A.nashOk) { g.fillStyle = C.warn; g.beginPath(); const x = X(A.nashOk.x), y = Y(A.nashOk.y); g.moveTo(x, y - 10); g.lineTo(x + 10, y); g.lineTo(x, y + 10); g.lineTo(x - 10, y); g.fill(); }
  const ms = movesUpTo().filter((x) => x.d);
  for (const side of ['us', 'them']) {
    const pts = ms.filter((x) => x.side === side && x.kind !== 'accept');
    g.strokeStyle = side === 'us' ? C.s1 : C.s3; g.fillStyle = g.strokeStyle; g.lineWidth = 3;
    g.beginPath(); pts.forEach((p, k) => (k ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y)))); g.stroke();
    pts.forEach((p) => { g.beginPath(); g.arc(X(p.x), Y(p.y), 6, 0, Math.PI * 2); g.fill(); });
  }
  const s = snap();
  if (s && s.done && s.result.agreement) {
    const x = X(s.result.agreement.x), y = Y(s.result.agreement.y);
    g.fillStyle = C.accent; g.strokeStyle = C.fg; g.lineWidth = 2; g.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 ? 7 : 16, a = -Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    g.closePath(); g.fill(); g.stroke();
  }
  $('#opLegend').innerHTML = `<span><i style="--c:var(--s1)"></i>inside Alex’s mandate</span><span><i style="--c:var(--muted)"></i>outside it</span><span><i style="--c:var(--ok);opacity:.4"></i>both better than walking away</span><span><i style="--c:var(--fg)"></i>best in-mandate deals (frontier)</span><span><i style="--c:var(--warn)"></i>Nash point</span><span><i style="--c:var(--s1)"></i>tenant offers</span><span><i style="--c:var(--s3)"></i>landlord offers</span><span><i style="--c:var(--accent)"></i>★ agreement</span>`;
}

function renderKnows() {
  const rows = [
    ['Offers on the table', '✓', '✓', '✓'],
    ['Alex’s mandate (rent ≤ $1,950 …)', '✓', '✗', '✓'],
    ['Tenant’s weights and walk-away', '✓', 'guessed', '✓'],
    ['Landlord’s weights and walk-away', 'guessed', '✓', '✓'],
    ['Bank statements', 'never shared', 'asks, gets ✗', 'hard ban'],
    ['Every possible package', '✗', '✗', '✓'],
  ];
  $('#knows').innerHTML = `<thead><tr><th>What</th><th>Tenant agent</th><th>Landlord agent</th><th>Operator</th></tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, k) => `<td class="${k ? 'mono small' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const v = S.view;
  $('#persp').innerHTML = `<p><b>${v === 'both' ? 'You are the operator.' : `You are on the ${SEAT[v].short.toLowerCase()}’s side.`}</b> ${v === 'us' ? 'You see Alex’s brief and mandate, your agent’s curve and its guesses about the landlord. The landlord’s console is locked.' : v === 'them' ? 'You see Harbor Lettings’ brief and its agent’s guesses about the tenant. Alex’s mandate is invisible from here: the landlord only sees offers, and a pause when the tenant agent needs Alex.' : 'You see both private simulations and the true weights, so you can check how good each agent’s guesses were.'}</p>
    <p class="small muted">Swap sides at any point: the negotiation is the same; only what you are allowed to see changes.</p>`;
}

// ---------------------------------------------------------------- readout
function renderReadout() {
  const s = S.snaps[S.snaps.length - 1];
  const finished = s && s.done && S.idx >= S.snaps.length;
  const side = S.view === 'them' ? 'them' : 'us';
  const inst = S.inst;
  $('#roEyebrow').textContent = side === 'us' ? 'The readout · for Alex' : 'The readout · for Harbor Lettings';
  $('#ro-title').innerHTML = side === 'us' ? 'What did my agent <span class="display-em">negotiate?</span>' : 'What did the landlord’s agent <span class="display-em">get?</span>';
  if (!finished) { $('#roLede').textContent = 'Play the negotiation to the end to see the clauses.'; $('#ro').innerHTML = ''; return; }
  const R = s.result;
  const ms = movesUpTo().filter((m) => m.d);
  const first = ms.find((m) => m.side === side);
  const batna = inst.batnaDigits[side];
  const flow = buildRun('s3', { seed: S.seed, fixture: S.fixture, style: S.style, ours: S.ours, decisions: Object.fromEntries(Object.entries(S.esc).map(([id, c]) => [`mandate-${+id.slice(4)}`, c === 'approve' ? 'sign a replacement mandate' : 'keep the mandate'])) });
  const vf = verify(flow.entries, flow.head);
  const replay = new URLSearchParams({ scenario: 's3', seed: S.seed, fixture: S.fixture, style: S.style, ours: S.ours });
  for (const [id, c] of Object.entries(flow.decisions)) replay.set(`d.${id}`, c);
  // Alex's ledger is private to Alex: the landlord's readout doesn't show it.
  const ledgerNote = S.view === 'them'
    ? '<div class="notice" style="margin-top:14px"><b>Records:</b> Harbor Lettings keeps its own records of the offers it sent and received. Alex’s ledger, mandate and limits are private to Alex. Swap to the tenant’s side to see them.</div>'
    : `<div class="notice" style="margin-top:14px"><b>In Alex’s ledger:</b> this negotiation is ${flow.entries.length} hash-chained entries (mandate, every offer sent and received, each gate check${R.agreement ? ', the clauses' : ''}), head ${esc(flow.head.finalHash.slice(0, 16))}… · ${vf.ok ? 'verifies ✓' : 'fails ✗'}. <a class="link-u" href="simulate.html?${esc(replay.toString())}#run">Replay it in the simulation dashboard →</a></div>`;
  if (!R.agreement) {
    $('#roLede').textContent = S.view === 'them'
      ? 'No deal. The tenant agent walked away at the deadline; nothing was agreed.'
      : `No deal.${S.view === 'both' ? ` ${S.analysis.settle.label}.` : ''} The tenant agent walked away at the deadline instead of going outside the mandate; nothing was agreed and nothing extra was shared.`;
    const lastOf = (sd) => [...ms].reverse().find((m) => m.side === sd);
    const rows = inst.issues.map((is, q) => `<tr><td>${esc(is.label)}</td><td class="mono">${lastOf('us') ? esc(is.fmt(is.levels[lastOf('us').d[q]])) : '—'}</td><td class="mono">${lastOf('them') ? esc(is.fmt(is.levels[lastOf('them').d[q]])) : '—'}</td></tr>`).join('');
    $('#ro').innerHTML = `<div class="table-wrap"><table class="t readout"><thead><tr><th>Issue</th><th>Tenant agent’s last offer</th><th>Landlord agent’s last offer</th></tr></thead><tbody>${rows}</tbody></table></div>${ledgerNote}`;
    return;
  }
  const d = inst.issues.map((is) => is.levels.indexOf(R.agreement.offer[is.id]));
  const gate = mandateCheck(inst, d);
  const w = inst.w[side];
  const rows = inst.issues.map((is, q) => {
    const rule = inst.scn.mandate.rules.find((r) => r.issue === is.id);
    const chk = rule ? gate.checks.find((c) => c.id === rule.id) : null;
    const val = is.val[side][d[q]];
    return `<tr><td><b>${esc(is.label)}</b></td><td class="mono"><b>${esc(is.fmt(is.levels[d[q]]))}</b></td><td class="mono">${first ? esc(is.fmt(is.levels[first.d[q]])) : '—'}</td><td class="mono">${esc(is.fmt(is.levels[batna[q]]))}</td>
      ${side === 'us' ? `<td class="${chk ? (chk.ok ? 'ok' : 'bad') : ''} small">${rule ? `${chk?.ok ? '✓' : '✗'} ${esc(rule.label)}` : '—'}</td>` : ''}
      <td class="mono">${pct(w[q])}</td><td><span class="ratio mono small" style="--w:${Math.round(val * 60)}px">${pct(val)}</span></td>
      ${side === 'us' ? `<td><span class="badge ${S.agreed ? 'ok' : ''}">${S.agreed ? 'agreed by Alex' : 'draft'}</span></td>` : ''}</tr>`;
  }).join('');
  const u = side === 'us' ? R.agreement.x : R.agreement.y, res = S.agents[side].uRes;
  const how = side === 'them' ? (R.status === 'approved' ? 'Agreed by Alex in person.' : 'Agreed with the tenant agent.')
    : R.status === 'approved' ? 'Agreed above the original mandate after Alex signed a replacement.' : 'A settlement proposal inside the mandate.';
  $('#roLede').innerHTML = `${how} Worth <b>${pct(u)}</b> to ${side === 'us' ? 'Alex' : 'Harbor Lettings'}, against a walk-away of ${pct(res)}: <b>${Math.round((u - res) * 100)} points</b> better than walking away, after ${R.roundsUsed} rounds.`;
  $('#ro').innerHTML = `<div class="table-wrap"><table class="t readout"><thead><tr><th>Issue</th><th>Agreed</th><th>Opening ask</th><th>Walk-away</th>${side === 'us' ? '<th>Mandate</th>' : ''}<th>Weight</th><th>Value</th>${side === 'us' ? '<th>Clause</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="row wrap-row" style="gap:10px;margin-top:14px">${side === 'us' ? `<button class="btn primary" id="agreeBtn" ${S.agreed ? 'disabled' : ''}>${S.agreed ? 'Agreed ✓' : 'Alex agrees all six clauses'}</button><span class="kbd-hint">Only the person can mark a clause agreed (FR-33). Simulated: no signature.</span>` : '<span class="kbd-hint">The landlord’s agent can accept, but on Alex’s side only Alex can agree clauses. Swap to the tenant’s side to see the clause states.</span>'}</div>${ledgerNote}`;
}

// ---------------------------------------------------------------- render + playback
function render(newK = -1, flip = false) {
  const L = $('#seatL'), Rr = $('#seatR');
  L.style.setProperty('--c', `var(${SEAT[S.left].color})`);
  Rr.style.setProperty('--c', `var(${SEAT[other(S.left)].color})`);
  L.innerHTML = seatHTML(S.left);
  Rr.innerHTML = seatHTML(other(S.left));
  $('#tableC').innerHTML = tableHTML(newK);
  const st = $('#stream'); if (st) st.scrollTop = st.scrollHeight;
  if (flip && !reduced) [L, Rr].forEach((x) => { x.classList.remove('flip'); void x.offsetWidth; x.classList.add('flip'); });
  $('#viewSeg').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
  drawPlot(); renderKnows(); renderReadout();
}

function advance() {
  const s = S.snaps[S.idx - 1];
  if (s && s.pending && !(s.pending in S.esc)) { render(); return false; }
  if (S.idx >= S.snaps.length) { render(); return false; }
  S.idx++;
  const m = S.snaps[S.idx - 1].move;
  render(m ? S.idx - 1 : -1);
  if (m) fly({ ...m });
  return true;
}
function play() {
  if (S.idx >= S.snaps.length && S.snaps[S.snaps.length - 1]?.done) S.idx = 0;
  S.playing = true; $('#nPlay').textContent = '❚❚ Pause'; $('#nPlay').setAttribute('aria-label', 'Pause');
  tick(80);
}
function stop() { S.playing = false; clearTimeout(S.timer); $('#nPlay').textContent = '▶ Play'; $('#nPlay').setAttribute('aria-label', 'Play'); }
function tick(ms) { clearTimeout(S.timer); S.timer = setTimeout(() => { if (!S.playing) return; if (advance()) tick(1250 / S.speed); else stop(); }, ms); }

function restart({ keepIdx = false } = {}) {
  stop();
  const idx = S.idx;
  build();
  S.idx = keepIdx ? Math.min(idx, S.snaps.length) : 0;
  S.agreed = false;
  const u = new URL(location.href);
  for (const [k, v] of Object.entries({ fixture: S.fixture, seed: S.seed, style: S.style, ours: S.ours, view: S.view === 'us' ? 'tenant' : S.view === 'them' ? 'landlord' : 'both' })) u.searchParams.set(k, v);
  history.replaceState(null, '', u.pathname + u.search + location.hash);
  render();
}

function setView(v) {
  const flip = v !== 'both' && v !== S.left;
  S.view = v;
  if (v !== 'both') S.left = v;
  const u = new URL(location.href); u.searchParams.set('view', v === 'us' ? 'tenant' : v === 'them' ? 'landlord' : 'both'); history.replaceState(null, '', u.pathname + u.search + location.hash);
  render(-1, flip);
}
function swap() {
  if (S.view === 'both') { S.left = other(S.left); render(-1, true); }
  else setView(other(S.view));
  toast(S.view === 'both' ? 'Sides swapped' : `Now on the ${SEAT[S.view].short.toLowerCase()}’s side`);
}

// ---------------------------------------------------------------- controls
$('#nFix').innerHTML = LEASE_ORDER.map((f) => `<option value="${f}" ${f === S.fixture ? 'selected' : ''}>${esc(LEASE_SCENARIOS[f].code)} · ${f === 'lease-f-l1' ? 'can settle' : 'can’t settle'}</option>`).join('');
$('#nStyle').innerHTML = STYLE_ORDER.map((s) => `<option value="${s}" ${s === S.style ? 'selected' : ''}>${esc(STYLE_LABEL[s])}</option>`).join('');
$('#nOurs').innerHTML = STYLE_ORDER.map((s) => `<option value="${s}" ${s === S.ours ? 'selected' : ''}>${esc(STYLE_LABEL[s])}</option>`).join('');
$('#nSeed').value = S.seed;
$('#nFix').addEventListener('change', (e) => { S.fixture = e.target.value; S.esc = {}; restart(); });
$('#nStyle').addEventListener('change', (e) => { S.style = e.target.value; S.esc = {}; restart(); });
$('#nOurs').addEventListener('change', (e) => { S.ours = e.target.value; S.esc = {}; restart(); });
$('#nSeed').addEventListener('change', (e) => { S.seed = Math.max(0, Math.min(99999, Math.floor(+e.target.value) || 0)); e.target.value = S.seed; S.esc = {}; restart(); });
$('#nPlay').addEventListener('click', () => (S.playing ? stop() : play()));
$('#nStep').addEventListener('click', () => { stop(); advance(); });
$('#nRestart').addEventListener('click', () => { S.esc = {}; restart(); });
$('#nSpeed').addEventListener('click', (e) => { const b = e.target.closest('[data-speed]'); if (!b) return; S.speed = +b.dataset.speed; $('#nSpeed').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
$('#viewSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
$('#swapBtn').addEventListener('click', swap);
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-swap]')) swap();
  const vb = e.target.closest('[data-view-btn]'); if (vb) setView(vb.dataset.viewBtn);
  const eb = e.target.closest('[data-esc]');
  if (eb && !eb.disabled) {
    const id = snap()?.pending;
    if (!id) return;
    S.esc[id] = eb.dataset.esc;
    restart({ keepIdx: true });
    toast(eb.dataset.esc === 'approve' ? 'Alex signed a replacement mandate (recorded first)' : 'Alex kept the mandate');
    play();
  }
  if (e.target.closest('#agreeBtn')) { S.agreed = true; renderReadout(); toast('Six clause.changed entries: agreed by Alex (simulated)'); }
});
new MutationObserver(() => { if (S.view === 'both') drawPlot(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-ground'] });

build();
render();
