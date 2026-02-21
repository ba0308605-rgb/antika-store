# Copilot / AI Agent Instructions for Antika Store

Summary
- This repo is a small full-stack shop: a static front-end (HTML/CSS/JS) and an Express backend with optional MongoDB. Use the backend when available; the app gracefully falls back to `db.json` and localStorage for demo mode.

Architecture & data flows
- Frontend: plain HTML pages in the repo root (e.g., `index.html`, `products.html`) and JS under `js/` (notably `js/api.js`, `js/main.js`, `js/admin.js`). The frontend calls a REST API under `/api`.
- Backend: `server.js` exposes the API. It prefers MongoDB (via `MONGODB_URI`) but reads/writes `db.json` when Mongo is unavailable. See `DB_FILE` and `readJsonDB()`/`writeJsonDB()` in `server.js`.
- API base URL: `js/api.js` uses `http://localhost:3000/api` by default (match `server.js` PORT 3000).
- ID and schema conventions: products may have `_id` (Mongo ObjectId) or `id` (string/number). Handlers intentionally accept either; prefer using `_id` when present.

Developer workflows & commands
- Install dependencies and run server:
  - `npm install`
  - `npm run dev` (nodemon) for development
  - `npm start` to run `node server.js` in production mode
- Seed MongoDB from `db.json`: run `node seed.js` (ensure Mongo is running or set `MONGODB_URI` env). `seed.js` imports `db.json` into the `antika_store` DB.
- Quick health check: `GET /api/status` (e.g. `curl http://localhost:3000/api/status`) shows whether MongoDB is connected and counts for products/categories.

Project-specific patterns & important gotchas
- Dual-mode persistence: most endpoints use MongoDB when connected, else they operate on `db.json`. This affects testing and debugging—edit `db.json` to reproduce demo-mode behavior.
- Multiple product/category fields: older data uses `category` (single) while newer code uses `categories` (array). `js/api.js` and `server.js` handle both; when modifying queries prefer supporting both fields.
- Cart session: cart endpoints expect a session identifier header `x-session-id` (see `API.getSessionId()` and `API` calls in `js/api.js`). Frontend stores session id in `localStorage` as `sessionId`.
- Admin access: admin panel and some scripts use a hardcoded credential set (username `BDR-FIRST`, password `B1-a2d3e4r5`) stored in `js/auth.js` / `js/admin.js`. Treat admin flows as local/demo-only — do not commit production secrets here.
- Firebase is optional: `js/firebase-config.js` contains a configured Firebase project but the app checks for Firebase presence before using it. The app works without Firebase.
- Dangerous endpoints: `DELETE /api/products` will remove all products from both MongoDB and `db.json` (admin-only in UI, but unprotected at HTTP level). Avoid running this unless intended.

Files to inspect for context
- server: [server.js](server.js)
- seed data: [db.json](db.json) and [seed.js](seed.js)
- frontend API: [js/api.js](js/api.js)
- client data layer: [js/data.js](js/data.js)
- auth & admin UI: [js/auth.js](js/auth.js) and [js/admin.js](js/admin.js)
- firebase: [js/firebase-config.js](js/firebase-config.js)
- package scripts: [package.json](package.json)

How to behave as an AI coding agent here
- Prefer small, contextual changes. The repo favors simple, explicit JS (no frameworks). When adding or changing API behavior, update both `server.js` and `js/api.js`/admin UI as needed.
- When modifying product-related code, handle both `_id` and `id` variants and support `categories` and legacy `category` fields.
- For local testing, prefer running the server in demo mode (no Mongo) to iterate faster — edit `db.json` and test front-end behaviors without needing a DB.
- When making changes that affect persistence, run `node seed.js` (if Mongo used) or update `db.json` for demo mode to keep frontend/backends consistent.

If anything in these notes is unclear or you'd like more examples (route snippets, common refactors, or test commands), tell me which area to expand.
