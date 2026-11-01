# AGENTS.md

## What this repo is

- Single-file Express service: all app code lives in `index.js`. No `src/`, no build step, no framework beyond Express.
- ESM (`"type": "module"` in `package.json`) — use `import`, not `require`.
- Express **5** (not 4) and `mongodb` driver v7. Route/path syntax follows Express 5 (path-to-regexp v8) rules if you add routes.
- Server listens on port **5000**, hard-coded in `index.js` (no `PORT` env var).

## Running

- `node index.js` (or `node .`) — `index.js` self-loads `.env` via `process.loadEnvFile()` at startup, so no `--env-file` flag is needed and any runner works (node, nodemon, npm scripts).
- `.env` must contain `MONGO_URI` or the app throws a clear error at boot (`MONGO_URI is not set: .env is missing the MONGO_URI key.`).
- nodemon 3.x is installed globally (not a local devDependency); `nodemon` / `nodemon index.js` is the dev loop. There is no `start` script.
- `npm test` is the untouched npm stub and always exits 1 — do not treat it as a real test suite.
- Startup is fire-and-forget: `connectToMongoDB()` is called without `await`, so the HTTP server starts even if MongoDB is unreachable; connection failures are only `console.dir`'d.

## Environment

- `.env` holds a single key, `MONGO_URI` (a working Atlas connection string). It is **untracked** and must stay untracked.

## Git gotchas

- There is **no `.gitignore`**, and `node_modules/` is partially committed: the older Express dependency tree is tracked, while the newer `mongodb`/`bson`/etc. packages are untracked. `git status` is permanently noisy.
- Never `git add -A` / `git commit -a` — you will stage `.env` (secrets) plus hundreds of `node_modules` files. Stage explicit paths only.
- No CI, no lint, no formatter, no typecheck. The only verification is running the server and hitting `GET /` (returns `Hello World!`).
