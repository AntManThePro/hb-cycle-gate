# HOOD BOSS NEXUS — Cycle Gate

New technician review engine. Week 1 / Week 2 / Week 4 / Monthly gates with live callback-risk simulation and coaching packets.

## Open on your phone (no install)

1. Deployed URL (Vercel): https://hb-cycle-gate.vercel.app  
   (or the preview URL from the latest deployment)
2. Open in Safari or Chrome.
3. Tap Share → **Add to Home Screen**.
4. It installs as a standalone app. Data lives in the phone's localStorage.

## Local dev

```bash
npm install
npm run typecheck   # strict TS, screams at your mistakes
npm run build        # emits app-core.js + app-ui.js
```

Then open `index.html` in a browser. The browser only ever sees the compiled JS — TypeScript never ships.

## Why TS

Pure HTML is a corpse. Raw JS is a nervous system with no spine. TypeScript is the spine — types catch the NaN landmines before a tech torches a kitchen and the callback invoice lands.
