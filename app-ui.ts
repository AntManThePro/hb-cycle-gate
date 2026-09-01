import {
  DOMAINS, DOMAIN_LABELS, EMPTY_SCORES, GATE_WEIGHTS, Tech, Scores, Gate, SimResult
} from './app-core.ts';

const STORAGE_KEY = 'hb-nexus-cycle-gate-v1';

export function loadTechs(): Tech[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Tech[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTechs(techs: Tech[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(techs));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function daysSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

export function gateDueDay(gate: Gate): number {
  return gate === 'W1' ? 7 : gate === 'W2' ? 14 : gate === 'W4' ? 28 : 58;
}

export function gateStatus(tech: Tech): 'overdue' | 'due' | 'ok' {
  const due = gateDueDay(tech.gate);
  const d = daysSince(tech.hireDate);
  if (d > due) return 'overdue';
  if (d >= due - 7) return 'due';
  return 'ok';
}

export function weightedScore(tech: Tech): number {
  const w = GATE_WEIGHTS[tech.gate];
  let num = 0;
  let den = 0;
  for (const d of DOMAINS) {
    const weight = w[d] ?? 1;
    num += tech.scores[d] * weight;
    den += weight;
  }
  return den ? Math.round(num / den) : 0;
}

export function autoFlags(scores: Scores): string[] {
  const f: string[] = [];
  if (scores.photo < 60) f.push('No fan photos / weak photo set');
  if (scores.clean < 60) f.push('Grease left visible');
  if (scores.safety < 70) f.push('Safety slop — roof / containment risk');
  if (scores.deficiency < 60) f.push('Missed deficiencies');
  if (scores.access < 60) f.push('No before/after fan shot');
  if (scores.notes < 60) f.push('Notes say "job complete" — useless');
  return f;
}

export function verdict(tech: Tech): SimResult['verdict'] {
  const s = weightedScore(tech);
  const flags = autoFlags(tech.scores);
  if (s >= 80 && flags.length === 0) return 'ADVANCE';
  if (s >= 65) return 'ADVANCE WITH COACHING';
  return 'HOLD AT GATE';
}

export function runSimulator(tech: Tech, jobs = 12): SimResult {
  let callbacks = 0;
  for (let i = 0; i < jobs; i++) {
    const roll = Math.random() * 100;
    const risk = 100 - weightedScore(tech) + autoFlags(tech.scores).length * 4;
    if (roll < risk) callbacks++;
  }
  const rate = callbacks / jobs;
  let v: SimResult['verdict'] = 'ADVANCE';
  if (callbacks >= 5) v = 'HOLD AT GATE';
  else if (callbacks >= 2) v = 'ADVANCE WITH COACHING';
  return { jobs, callbacks, rate, verdict: v };
}

export function demoFleet(): Tech[] {
  const today = new Date().toISOString().slice(0, 10);
  const mk = (name: string, gate: Gate, scores: Scores, flags: string[], notes: string, daysAgo: number): Tech => {
    const d = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
    return { id: uid(), name, hireDate: d, gate, scores, flags, notes, updatedAt: today };
  };
  return [
    mk('Marcus', 'W1', { photo: 55, clean: 60, safety: 45, access: 50, deficiency: 65, notes: 40, ops: 70, customer: 75 }, ['Safety slop — roof / containment risk', 'Notes say "job complete" — useless'], 'Dark photo set, no fan shot, roof edge treated like sidewalk.', 6),
    mk('Devon', 'W2', { photo: 80, clean: 75, safety: 85, access: 70, deficiency: 60, notes: 78, ops: 72, customer: 80 }, ['Missed deficiencies'], 'Good photos, weak deficiency capture on blades.', 13),
    mk('Riley', 'W4', { photo: 88, clean: 90, safety: 92, access: 85, deficiency: 86, notes: 84, ops: 80, customer: 88 }, [], 'Consistent, documents complete jobs, catches deficiencies.', 27),
    mk('Jamal', 'M', { photo: 70, clean: 68, safety: 75, access: 72, deficiency: 55, notes: 65, ops: 78, customer: 70 }, ['Missed deficiencies', 'Grease left visible'], 'Plateaued. Lucky week 4, now slipping on cleanliness.', 60)
  ];
}

export { DOMAINS, DOMAIN_LABELS, EMPTY_SCORES };
