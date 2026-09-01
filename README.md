# HOOD BOSS NEXUS — CYCLE GATE

**New technician review engine.**  
Week 1 · Week 2 · Week 4 · Monthly.

Built for DoubleA @ AntManThePro / Hood Boss field operations.

This is the missing layer between **HB Academy** (teach the standard) and **HB QA Brain** (judge the job). Cycle Gate judges the *human on a clock*. Time passing is not a promotion. Clearing a gate is.

Live app: open `index.html` or enable GitHub Pages on `main`.

## Why this exists

Most shops do 30/60/90 as a Google Form. That is how you invent callbacks.

A new kitchen-exhaust tech does not fail in month three by surprise. They fail in week one with a dark photo set, a missing fan shot, a roof edge they treated like a sidewalk, and notes that say `job complete`. If you do not put a gate on that, you put a customer and a fire marshal on it later.

Cycle Gate forces the review you already knew you needed:

| Gate | Day | The only question that matters |
|---|---|---|
| W1 | 7 | Can they follow the process without creating a liability? |
| W2 | 14 | Can they document a complete job and spot the obvious miss? |
| W4 | 28 | Can they run a standard commercial hood solo? |
| M | 58+ | Are they consistent, or was week 4 a lucky day? |

## What it actually does

- Roster of new techs with hire-date math. Overdue gates glow pink. Due-in-7 glow yellow.
- Eight-domain scoring mapped to real Hood Boss / NFPA 96 field failure modes: photo, clean, safety, access/fan, deficiency capture, notes, ops time, customer walk.
- Gate-weighted scoring. Week 1 punishes safety slop harder. Week 4 punishes missed deficiencies and dirty blades.
- Auto flags that match QA Brain escalation rules (no fan photos, no before/after, grease left visible, containment, roof).
- Live verdict: ADVANCE / ADVANCE WITH COACHING / HOLD AT GATE.
- **Solo-ready simulator** — Monte Carlo of the next 12 jobs as particles moving through the hood pipeline. Two phase fails or a grease/roof miss = callback.
- Coaching packet compiler: what was good, what was wrong vs standard, 5-minute truck lesson, HB Academy module.
- Local persistence + JSON export. No backend required. Works as a PWA on a phone in the parking lot.
- Custom home-screen icon (hood + fan + four gate chevrons).

## Stack

Single-page vanilla JS. Canvas radar + trajectory + pipeline. No build step. Drop on Netlify / GitHub Pages.

## Deploy

1. Drag the folder onto Netlify (team `antmanthepro`).
2. Or: Settings → Pages → Deploy from `main`.
3. Open on phone → Add to Home Screen.

## How a lead uses it in the field

1. Add the new hire the morning they start. Hire date starts the clock.
2. Day 6–8: ride one job, pull photos, run **W1**. If safety < 70 or a roof flag is on, they do not go unsupervised. Period.
3. Day 14: **W2**. If photo discipline is still garbage, they do not get a van.
4. Day 28: **W4**. Run the solo simulator. If it paints 5 callbacks out of 12, you do not bless solo work because the calendar said so.
5. Every 30 days after: **Monthly**. Look at the trajectory line. Plateau + missed deficiencies = intervention, not "they're fine."

## Fits the rest of the NEXUS rack

- Teach: `HB_Academy`, `pauls_kec__training_guide`, `HB-cect-orientation-`
- Select leads: `team_lead_path`, `hood-boss-team-lead-os`
- Judge jobs: `HBQAbrain`
- Judge the *tech on a clock*: **this app**

## Data

Everything stays in `localStorage` key `hb-nexus-cycle-gate-v1`. Export JSON before wiping a browser. Demo fleet button restores Marcus / Devon / Riley / Jamal — four different failure shapes, on purpose.

## Author

AntManThePro — Operations & QA. Tools that make work clearer and measurable.
