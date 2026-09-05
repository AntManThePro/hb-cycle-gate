import {
  DOMAINS, DOMAIN_LABELS, EMPTY_SCORES, GATE_WEIGHTS
} from './app-core.js';

const STORAGE_KEY = 'hb-nexus-cycle-gate-v1';

function loadTechs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTechs(techs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(techs));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function daysSince(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

function gateDueDay(gate) {
  return gate === 'W1' ? 7 : gate === 'W2' ? 14 : gate === 'W4' ? 28 : 58;
}

function gateStatus(tech) {
  const due = gateDueDay(tech.gate);
  const d = daysSince(tech.hireDate);
  if (d > due) return 'overdue';
  if (d >= due - 7) return 'due';
  return 'ok';
}

function weightedScore(tech) {
  const w = GATE_WEIGHTS[tech.gate] || {};
  let num = 0;
  let den = 0;
  for (const d of DOMAINS) {
    const weight = w[d] ?? 1;
    num += (tech.scores[d] || 0) * weight;
    den += weight;
  }
  return den ? Math.round(num / den) : 0;
}

function autoFlags(scores) {
  const f = [];
  if (scores.photo < 60) f.push('No fan photos / weak photo set');
  if (scores.clean < 60) f.push('Grease left visible');
  if (scores.safety < 70) f.push('Safety slop — roof / containment risk');
  if (scores.deficiency < 60) f.push('Missed deficiencies');
  if (scores.access < 60) f.push('No before/after fan shot');
  if (scores.notes < 60) f.push('Notes say "job complete" — useless');
  return f;
}

function verdict(tech) {
  const s = weightedScore(tech);
  const flags = autoFlags(tech.scores);
  if (s >= 80 && flags.length === 0) return 'ADVANCE';
  if (s >= 65) return 'ADVANCE WITH COACHING';
  return 'HOLD AT GATE';
}

function runSimulator(tech, jobs = 12) {
  let callbacks = 0;
  const risk = 100 - weightedScore(tech) + autoFlags(tech.scores).length * 4;
  for (let i = 0; i < jobs; i++) {
    if (Math.random() * 100 < risk) callbacks++;
  }
  let v = 'ADVANCE';
  if (callbacks >= 5) v = 'HOLD AT GATE';
  else if (callbacks >= 2) v = 'ADVANCE WITH COACHING';
  return { jobs, callbacks, rate: callbacks / jobs, verdict: v };
}

function demoFleet() {
  const today = new Date().toISOString().slice(0, 10);
  const mk = (name, gate, scores, flags, notes, daysAgo) => {
    const d = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    return { id: uid(), name, hireDate: d, gate, scores, flags, notes, updatedAt: today };
  };
  return [
    mk('Marcus', 'W1', { photo: 55, clean: 60, safety: 45, access: 50, deficiency: 65, notes: 40, ops: 70, customer: 75 }, ['Safety slop — roof / containment risk'], 'Dark photo set, no fan shot.', 6),
    mk('Devon', 'W2', { photo: 80, clean: 75, safety: 85, access: 70, deficiency: 60, notes: 78, ops: 72, customer: 80 }, ['Missed deficiencies'], 'Good photos, weak deficiency capture.', 13),
    mk('Riley', 'W4', { photo: 88, clean: 90, safety: 92, access: 85, deficiency: 86, notes: 84, ops: 80, customer: 88 }, [], 'Consistent. Documents complete jobs.', 27),
    mk('Jamal', 'M', { photo: 70, clean: 68, safety: 75, access: 72, deficiency: 55, notes: 65, ops: 78, customer: 70 }, ['Missed deficiencies'], 'Plateaued after week 4.', 60)
  ];
}

const state = {
  techs: loadTechs(),
  view: 'roster',
  active: null,
  lastSim: null
};

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

function setView(name) {
  state.view = name;
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.view === name);
  });
  ['roster', 'review', 'sim', 'packet'].forEach((v) => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('hidden', v !== name);
  });
  render();
}

function activeTech() {
  return state.techs.find((t) => t.id === state.active) || state.techs[0] || null;
}

function renderRoster() {
  const box = document.getElementById('view-roster');
  if (!box) return;
  if (!state.techs.length) {
    box.innerHTML = '<div class="card"><h2>Roster</h2><p class="small">No techs yet. Load Demo Fleet or add one.</p></div>';
    return;
  }
  box.innerHTML = '<div class="card"><h2>Roster</h2>' + state.techs.map((t) => {
    const st = gateStatus(t);
    const score = weightedScore(t);
    return `<div class="row" data-id="${t.id}">
      <div><div class="name">${t.name}</div><div class="meta">${t.gate} · day ${daysSince(t.hireDate)} · ${score}</div></div>
      <span class="badge ${st}">${st.toUpperCase()}</span>
    </div>`;
  }).join('') + '</div>';
  box.querySelectorAll('.row').forEach((row) => {
    row.addEventListener('click', () => {
      state.active = row.dataset.id;
      setView('review');
    });
  });
}

function sliderRow(tech, key) {
  const val = tech.scores[key] ?? 70;
  return `<div class="field">
    <label>${DOMAIN_LABELS[key]}</label>
    <div class="slider-row">
      <input type="range" min="0" max="100" value="${val}" data-score="${key}" />
      <span class="val">${val}</span>
    </div>
  </div>`;
}

function renderReview() {
  const box = document.getElementById('view-review');
  const tech = activeTech();
  if (!box) return;
  if (!tech) {
    box.innerHTML = '<div class="card"><h2>Review</h2><p class="small">Pick a tech from roster.</p></div>';
    return;
  }
  const v = verdict(tech);
  const klass = v === 'ADVANCE' ? 'advance' : v.startsWith('ADVANCE') ? 'coach' : 'hold';
  box.innerHTML = `<div class="card">
    <h2>${tech.name} · ${tech.gate}</h2>
    <p class="small">Hired ${tech.hireDate} · day ${daysSince(tech.hireDate)} · weighted ${weightedScore(tech)}</p>
    <p class="verdict ${klass}">${v}</p>
    <div class="field"><label>Gate</label>
      <select id="gateSel">${['W1','W2','W4','M'].map((g) => `<option ${g===tech.gate?'selected':''}>${g}</option>`).join('')}</select>
    </div>
    ${DOMAINS.map((d) => sliderRow(tech, d)).join('')}
    <div class="field"><label>Notes</label><textarea id="noteBox">${tech.notes || ''}</textarea></div>
    <p class="small">${autoFlags(tech.scores).join(' · ') || 'No auto flags.'}</p>
    <button class="btn primary" id="saveReview">Save review</button>
  </div>`;
  box.querySelectorAll('input[type=range]').forEach((el) => {
    el.addEventListener('input', () => {
      tech.scores[el.dataset.score] = Number(el.value);
      el.parentElement.querySelector('.val').textContent = el.value;
    });
  });
  box.querySelector('#saveReview').addEventListener('click', () => {
    tech.gate = box.querySelector('#gateSel').value;
    tech.notes = box.querySelector('#noteBox').value;
    tech.flags = autoFlags(tech.scores);
    tech.updatedAt = new Date().toISOString().slice(0, 10);
    saveTechs(state.techs);
    toast('Review saved');
    render();
  });
}

function renderSim() {
  const box = document.getElementById('view-sim');
  const tech = activeTech();
  if (!box) return;
  if (!tech) {
    box.innerHTML = '<div class="card"><h2>Simulator</h2><p class="small">Pick a tech first.</p></div>';
    return;
  }
  const sim = state.lastSim && state.lastSim.id === tech.id ? state.lastSim.result : null;
  box.innerHTML = `<div class="card">
    <h2>Callback risk · ${tech.name}</h2>
    <p class="small">Weighted ${weightedScore(tech)} · flags ${autoFlags(tech.scores).length}</p>
    ${sim ? `<p class="verdict ${sim.verdict==='ADVANCE'?'advance':sim.verdict.includes('COACH')?'coach':'hold'}">${sim.verdict}</p>
      <p>${sim.callbacks} callbacks / ${sim.jobs} jobs (${Math.round(sim.rate*100)}%)</p>
      <div class="sim-bar"><i style="width:${Math.min(100, sim.rate*100)}%"></i></div>` : '<p class="small">Run a 12-job week against this score set.</p>'}
    <button class="btn primary" id="runSim">Run 12-job sim</button>
  </div>`;
  box.querySelector('#runSim').addEventListener('click', () => {
    state.lastSim = { id: tech.id, result: runSimulator(tech, 12) };
    renderSim();
  });
}

function renderPacket() {
  const box = document.getElementById('view-packet');
  const tech = activeTech();
  if (!box) return;
  if (!tech) {
    box.innerHTML = '<div class="card"><h2>Packet</h2><p class="small">Pick a tech first.</p></div>';
    return;
  }
  const lines = [
    'HOOD BOSS NEXUS — CYCLE GATE PACKET',
    tech.name + ' · ' + tech.gate,
    'Hired ' + tech.hireDate + ' · day ' + daysSince(tech.hireDate),
    'Weighted ' + weightedScore(tech) + ' · ' + verdict(tech),
    '',
    ...DOMAINS.map((d) => DOMAIN_LABELS[d] + ': ' + tech.scores[d]),
    '',
    'Flags: ' + (autoFlags(tech.scores).join('; ') || 'none'),
    'Notes: ' + (tech.notes || 'none')
  ].join('\n');
  box.innerHTML = `<div class="card">
    <h2>Coaching packet</h2>
    <pre class="small" style="white-space:pre-wrap">${lines}</pre>
    <button class="btn primary" id="copyPkt">Copy packet</button>
  </div>`;
  box.querySelector('#copyPkt').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(lines); toast('Packet copied'); }
    catch { toast('Copy failed'); }
  });
}

function render() {
  renderRoster();
  renderReview();
  renderSim();
  renderPacket();
}

function boot() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => setView(tab.dataset.view));
  });
  const demo = document.getElementById('btn-demo');
  if (demo) demo.addEventListener('click', () => {
    state.techs = demoFleet();
    state.active = state.techs[0].id;
    saveTechs(state.techs);
    toast('Demo fleet loaded');
    setView('roster');
  });
  const add = document.getElementById('btn-add');
  if (add) add.addEventListener('click', () => {
    const name = prompt('Tech name?');
    if (!name) return;
    const tech = {
      id: uid(),
      name: name.trim(),
      hireDate: new Date().toISOString().slice(0, 10),
      gate: 'W1',
      scores: EMPTY_SCORES(),
      flags: [],
      notes: '',
      updatedAt: new Date().toISOString().slice(0, 10)
    };
    state.techs.push(tech);
    state.active = tech.id;
    saveTechs(state.techs);
    setView('review');
  });
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
