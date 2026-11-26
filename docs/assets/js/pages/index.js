import { mountShell, choosePlatform } from '../shell.js';
import { PLATFORMS, PLATFORM_ORDER, LAYERS, currentPlatform } from '../platforms.js';
import { esc } from '../lib/esc.js';

mountShell('index');
const $ = (s) => document.querySelector(s);

const statusBadge = (s) => s === 'validated' ? '<span class="badge ok">validated</span>' : '<span class="badge warn">planned</span>';

function renderSwitch(cur) {
  $('#platSwitch').innerHTML = PLATFORM_ORDER.map(id =>
    `<button type="button" data-platform="${id}" aria-pressed="${id === cur}">${esc(PLATFORMS[id].short)}</button>`).join('');
}

function renderDetail(p) {
  const layers = [1, 2, 3].map(n => `<span class="layer ${p.layers.includes(n) ? 'on' : 'off'}" title="${esc(LAYERS[n])}">${p.layers.includes(n) ? '✓' : '✗'} layer ${n}</span>`).join('');
  $('#platDl').innerHTML = `
    <dt>Hardware</dt><dd>${esc(p.hardware)}</dd>
    <dt>Runtime</dt><dd>${esc(p.runtime)}</dd>
    <dt>LLM</dt><dd>${esc(p.llm)}</dd>
    <dt>Decision models</dt><dd>${esc(p.decision)}</dd>
    <dt>GPU</dt><dd>${esc(p.gpu)}</dd>
    <dt>Sandbox</dt><dd><div class="layers">${layers}</div>${p.doctorRequired ? '<p class="small muted" style="margin:6px 0 0">Layer 3 is unavailable here, so <code>wf doctor</code>’s checks are mandatory and runs fail closed.</p>' : ''}</dd>
    <dt>Model tier</dt><dd>${esc(p.tier)}</dd>
    <dt>Commands</dt><dd><ul class="cmds" aria-label="Planned commands">${p.commands.map(c => `<li>${esc(c)}</li>`).join('')}</ul></dd>
    <dt>Notes</dt><dd>${esc(p.notes)}</dd>
    ${p.sources?.length ? `<dt>Sources</dt><dd>${p.sources.map(s => `<a class="inline" href="${esc(s)}" rel="noopener">${esc(s.replace(/^https:\/\/(www\.)?/, '').split('/').slice(0, 2).join('/'))}</a>`).join('<br>')}</dd>` : ''}`;
  $('#platStatus').outerHTML = statusBadge(p.status).replace('<span', '<span id="platStatus"');
  const host = /host/i.test(p.llm);
  $('[data-llm-where]').textContent = host ? 'Ollama on the host (Metal)' : 'Ollama in a container';
  $('#llmNode').classList.toggle('host', host);
  $('[data-diagram-note]').textContent = host
    ? 'On this profile the LLM runs on the host so it can use the Apple GPU; wf doctor proves the agent cannot reach it.'
    : 'On this profile every service, including the LLM, runs in a container.';
}

function renderMatrix(cur) {
  $('#platMatrix tbody').innerHTML = PLATFORM_ORDER.map(id => {
    const p = PLATFORMS[id];
    return `<tr ${id === cur ? 'aria-current="true"' : ''}><td>${esc(p.name)}</td><td>${esc(p.runtime.split(/[;(]/)[0].trim())}</td><td>${esc(/host/i.test(p.llm) ? 'Ollama, host (Metal)' : 'Ollama, container')}</td><td>${esc(p.gpu.split(/[;,]/)[0])}</td><td class="mono">${p.layers.join(' + ')}${p.doctorRequired ? ' + doctor' : ''}</td><td>${statusBadge(p.status)}</td></tr>`;
  }).join('');
}

function render() {
  const p = currentPlatform();
  renderSwitch(p.id);
  renderDetail(p);
  renderMatrix(p.id);
}

$('#platSwitch').addEventListener('click', e => {
  const b = e.target.closest('[data-platform]');
  if (b) choosePlatform(b.dataset.platform);
});
window.addEventListener('platformchange', render);
render();
