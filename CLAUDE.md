# Life Hub

Melissa's personal goal-setting and planning app. Built first as a Claude artifact (a single HTML page hosted on claude.ai); this folder is that app, exported so work can continue in Claude Code.

## Read this first: the app depends on the artifact runtime

`app/index.html` does not run on its own. It calls `window.claude.use(...)`, which only exists when the page is served as a claude.ai artifact:

| Capability | Used for | Outside claude.ai you need |
|---|---|---|
| `db` | All data (Firestore-like collections, live snapshots) | A database with realtime or refetch (Supabase is the likely choice) |
| `assets` | Uploaded files and images, served at `/_blob/<id>` | File storage (Supabase Storage or similar) |
| `sample` | "Ask Claude" buttons (mentor review, goal plans, briefs) | A server-side call to the Claude API (never put an API key in the browser) |
| `downloads` | Backup export | A normal browser download |
| `user` | Declared, barely used | Auth |

**Status: path 1 (standalone) is built.** `app/runtime.js` replaces `window.claude` with Supabase; see `docs/DEPLOY.md`. The notes below describe the original artifact. Before big changes, still ask:

1. **Standalone app** (own hosting, own database, login, usable on any device and later by other people). This is a rebuild of the data layer; the UI and logic carry over.
2. **Keep it as an artifact** and only use Claude Code to edit the file. Publishing back to claude.ai is done from a Claude chat, not from here.

Do not start a rewrite until she has chosen. `docs/ARCHITECTURE.md` has the detail either path needs.

## Layout

- `app/index.html` — the whole app: CSS, markup and vanilla JS in one file (~1,600 lines, long lines).
- `app/library.json` — goal ideas: 32 areas, 142 sub-categories, 568 ideas. Shape `{areaId:{subName:[[core...],[topPerformer...]]}}`.
- `app/pathways.json` — levels per area: `{areaId:{top, levels:[{name,goals}]}}`.
- `tests/smoke.js` — jsdom smoke test with a stubbed `window.claude`. Run `npm install` once, then `npm test`. It must end with `errs []`.
- `docs/ARCHITECTURE.md` — views, data model, helpers, conventions.
- `docs/DESIGN.md` — the look, with tokens and rules.

## How the code is organised

- Global `S` holds every collection; `ui` holds view state. `render()` redraws the current view from scratch; inputs with class `keep` keep their value and focus across redraws.
- Routing is by hash. `VIEWS` maps `#today #plan #areas #goals #fit #biz #social #money #log #claude #learn #find #data` to a `vXxx()` function that returns an HTML string.
- Events are delegated on `#view`: `submit` (forms carry `data-form`), `change`, `click` (buttons carry `data-act`), `input`.
- Writes go through `write(coll,id,data)`; deletes through `remove(coll,id)`, which copies the record to `trash` first. The UI updates when the database snapshot comes back, not optimistically.

## Rules Melissa has set

- Give complete files, never partial snippets to paste in.
- The look matters: clean, organised, minimalist, "faded" charcoals and off-whites. Follow `docs/DESIGN.md`. No monospace font anywhere. No dots in the nav.
- Every page needs visual hierarchy: a section heading with a line under it (`vh()`), toggle-button navigation, items as boxes rather than full-width rows, uniform card sizes.
- Check the real result before saying something works. Take screenshots in light, dark and phone width for visual changes.
- Plain language in the UI; no financial advice wording on the Money page (it records and totals only).
- She is credit-conscious: propose before large changes.
- Publishing: the live app is GitHub Pages, deployed from `main`. Melissa has said tested changes can go to `main` without asking (Nov 24, 2026). Still check the deploy goes live and tell her when it has.

## Gotchas

- An apostrophe inside a single-quoted JS string has broken the file twice. After every edit, extract the `<script>` and run `node --check`.
- `plan(id)` is the goal-planning function. The planner doc helper is `pdoc(k)`. Do not reuse the name `plan`.
- Buttons that need a second "Confirm" click must be listed in the confirm whitelist at the top of the click handler, or the confirm cancels itself.
- `input type="url"` blocks form submit when the scheme is missing; use `type="text" inputmode="url"`.
- The existing data lives in the claude.ai artifact database, not in this folder. See "Moving the data" in `docs/ARCHITECTURE.md`.
