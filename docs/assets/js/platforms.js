// Platform profiles (SPEC §9.1, PLAN D-17). One entry per profile; the site's platform
// switcher and the "How it runs" section render from this list, and test/platforms.test.mjs
// checks it stays in step with SPECIFICATION.md.
//
// `status` is the profile's validation state: 'planned' until the M5 platform matrix
// (T-028, T-029, T-038, T-039) records a validated run.

export const PLATFORMS = {
  macos: {
    name: 'macOS', short: 'macOS', kind: 'workstation', status: 'planned',
    hardware: 'Apple silicon Mac; 32 GB memory or more recommended',
    runtime: 'Docker Desktop',
    llm: 'Ollama native app on the host, using the Apple GPU through Metal',
    decision: 'TrustGraph decision models in containers (CPU; Rosetta if an image has no arm64 build)',
    gpu: 'Apple GPU, host only',
    layers: [1, 2],
    doctorRequired: true,
    tier: 'm or l (from memory)',
    commands: ['wf doctor', 'wf up --platform macos', 'wf run s3 --seed 42'],
    notes: 'Containers on macOS cannot use the Apple GPU, so the LLM runs on the host. Only the gate is configured to reach it; wf doctor proves the agent cannot, and runs fail closed if it can.',
    tasks: ['T-028'],
  },
  'mac-studio-m5-ultra': {
    name: 'Mac Studio M5 Ultra', short: 'M5 Ultra', kind: 'workstation', status: 'planned',
    hardware: 'Mac Studio, M5 Ultra: 36-core CPU, 80-core GPU, 512 GB unified memory, 16 TB SSD (Apple’s top configuration)',
    runtime: 'Docker Desktop',
    llm: 'Ollama native app on the host (Metal); extraction and drafting models stay loaded together',
    decision: 'As macOS',
    gpu: 'Apple GPU, host only; 1.2 TB/s memory bandwidth',
    layers: [1, 2],
    doctorRequired: true,
    tier: 'xl',
    commands: ['wf doctor', 'wf up --platform mac-studio-m5-ultra', 'wf run s1'],
    notes: 'The largest local models in the A-01 comparison run here. The limit on how much unified memory the GPU may use can be raised; the setting is recorded in each run record.',
    sources: [
      'https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/',
      'https://www.techrepublic.com/article/news-apple-mac-studio-512gb-ram-price-specs/',
    ],
    tasks: ['T-039'],
  },
  windows: {
    name: 'Windows', short: 'Windows', kind: 'workstation', status: 'planned',
    hardware: 'Windows 11 PC; NVIDIA GPU optional',
    runtime: 'Docker Engine inside WSL 2 (Ubuntu 24.04), recommended; Docker Desktop with the WSL 2 backend also supported',
    llm: 'Ollama in a container',
    decision: 'TrustGraph decision models in containers',
    gpu: 'NVIDIA through WSL 2 (CUDA), or CPU',
    layers: [1, 2, 3],
    doctorRequired: false,
    tier: 's to l (from GPU memory)',
    commands: ['wsl', 'wf doctor', 'wf up --platform windows'],
    notes: 'With Docker Engine in WSL 2 all three sandbox layers apply. With Docker Desktop, layer 3 is unavailable and wf doctor’s checks become mandatory.',
    sources: ['https://github.com/yorkerhodes3/bare-metal-jacket/blob/8ac98575b8fa7ff17a926b361ff9ead678fabbe3/docs/operations/deployment-testing.md'],
    tasks: ['T-029'],
  },
  b3iq: {
    name: 'B3IQ server', short: 'B3IQ', kind: 'server', status: 'planned',
    hardware: 'B3IQ bare-metal node: Ubuntu 24.04 with Docker Engine; NVIDIA GPU node classes',
    runtime: 'Docker Engine',
    llm: 'Ollama in a container on the backend network (not the node’s shared host Ollama)',
    decision: 'TrustGraph decision models in containers',
    gpu: 'NVIDIA Container Toolkit when the node has a GPU, or CPU',
    layers: [1, 2, 3],
    doctorRequired: false,
    tier: 'from the node class',
    commands: ['ssh <b3iq-node>', 'wf doctor', 'wf up --platform b3iq', 'ssh -L <local-port>:127.0.0.1:<readout-port> <b3iq-node>'],
    notes: 'Reached over SSH; readouts are viewed through an SSH tunnel. Every published port is bound to loopback, as bare-metal-jacket requires for B3IQ. Synthetic data only; B3IQ policy is confirmed before anything is installed on the host.',
    sources: [
      'https://github.com/yorkerhodes3/bare-metal-jacket/blob/8ac98575b8fa7ff17a926b361ff9ead678fabbe3/docs/operations/deployment-testing.md',
      'https://b3iq.org/',
    ],
    tasks: ['T-038'],
  },
  linux: {
    name: 'Linux', short: 'Linux', kind: 'server', status: 'planned',
    hardware: 'Any Linux host, amd64 or arm64',
    runtime: 'Docker Engine',
    llm: 'Ollama in a container',
    decision: 'TrustGraph decision models in containers',
    gpu: 'NVIDIA optional',
    layers: [1, 2, 3],
    doctorRequired: false,
    tier: 'from GPU memory',
    commands: ['wf doctor', 'wf up --platform linux'],
    notes: 'CI runs the test-mode harness here, without models. Every other profile must produce byte-identical test-mode ledgers.',
    tasks: ['T-009'],
  },
};

export const PLATFORM_ORDER = ['macos', 'mac-studio-m5-ultra', 'windows', 'b3iq', 'linux'];

export const LAYERS = {
  1: 'Internal sandbox network shared only with the gate',
  2: 'No backend port published during runs',
  3: 'Firewall rule (DOCKER-USER): the sandbox may reach only the gate',
};

const KEY = 'wf.platform';

/** Default when nothing is chosen: guess from the visitor's OS, else macOS. */
export function guessPlatform(ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macos';
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return 'linux';
  return 'macos';
}

export function resolvePlatformId() {
  const q = new URLSearchParams(location.search).get('platform');
  if (q && PLATFORMS[q]) return q;
  try { const s = localStorage.getItem(KEY); if (s && PLATFORMS[s]) return s; } catch { /* storage blocked */ }
  return guessPlatform();
}

let current = null;
export const currentPlatform = () => current;

export function applyPlatform(id, { persist = true } = {}) {
  const pid = PLATFORMS[id] ? id : 'macos';
  current = { id: pid, ...PLATFORMS[pid] };
  if (persist) { try { localStorage.setItem(KEY, pid); } catch { /* storage blocked */ } }
  document.querySelectorAll('[data-platform-short]').forEach(n => { n.textContent = current.short; });
  window.dispatchEvent(new CustomEvent('platformchange', { detail: current }));
  return current;
}

export function initPlatform() { return applyPlatform(resolvePlatformId(), { persist: false }); }
