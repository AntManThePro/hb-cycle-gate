export type Gate = 'W1' | 'W2' | 'W4' | 'M';

export type Domain =
  | 'photo'
  | 'clean'
  | 'safety'
  | 'access'
  | 'deficiency'
  | 'notes'
  | 'ops'
  | 'customer';

export interface Scores {
  photo: number;
  clean: number;
  safety: number;
  access: number;
  deficiency: number;
  notes: number;
  ops: number;
  customer: number;
}

export interface Tech {
  id: string;
  name: string;
  hireDate: string; // ISO date
  gate: Gate;
  scores: Scores;
  flags: string[];
  notes: string;
  updatedAt: string;
}

export interface SimResult {
  jobs: number;
  callbacks: number;
  rate: number;
  verdict: 'ADVANCE' | 'ADVANCE WITH COACHING' | 'HOLD AT GATE';
}

export const DOMAINS: Domain[] = [
  'photo', 'clean', 'safety', 'access', 'deficiency', 'notes', 'ops', 'customer'
];

export const DOMAIN_LABELS: Record<Domain, string> = {
  photo: 'Photo Discipline',
  clean: 'Cleanliness',
  safety: 'Safety / NFPA 96',
  access: 'Access & Fan',
  deficiency: 'Deficiency Capture',
  notes: 'Notes Quality',
  ops: 'Ops Time',
  customer: 'Customer Walk'
};

export const GATE_WEIGHTS: Record<Gate, Partial<Record<Domain, number>>> = {
  W1: { safety: 2, photo: 1.5, access: 1.5, clean: 1, deficiency: 1, notes: 1, ops: 0.5, customer: 0.5 },
  W2: { photo: 2, deficiency: 1.5, notes: 1.5, clean: 1, safety: 1, access: 1, ops: 0.5, customer: 1 },
  W4: { deficiency: 2, clean: 2, photo: 1.5, safety: 1.5, access: 1.5, notes: 1, ops: 1, customer: 1 },
  M:  { deficiency: 2, clean: 1.5, photo: 1.5, safety: 1.5, access: 1, notes: 1, ops: 1, customer: 1 }
};

export const EMPTY_SCORES = (): Scores => ({
  photo: 70, clean: 70, safety: 70, access: 70, deficiency: 70, notes: 70, ops: 70, customer: 70
});
