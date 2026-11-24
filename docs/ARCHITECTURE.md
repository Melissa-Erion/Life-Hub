# Architecture

## Pages

| Hash | Function | What it holds |
|---|---|---|
| `#today` | `vToday` | Stat tiles, calendar + day agenda, daily habits grid, drafts to confirm, next steps, mentor review |
| `#plan` | `vPlan` | Planner: year / month / week / day, linked (month outcomes, weekly three priorities, day tasks) |
| `#areas` | `vAreas` | Explore: all life areas, sub-categories, goal ideas, levels, capability briefs |
| `#goals` | `vGoals` | Goals with milestones, steps, result number, "plan with Claude" |
| `#fit` | `vFit` | Training (schedule, saved workouts), Check-ins (fields, photos, table), Nutrition (targets, meals, macros), Goals |
| `#biz` | `vBiz` | Clients (profile, documents, links, images, projects), Projects (overview, tasks, files, links, images), Invoices, Activity, Numbers, Goals |
| `#social` | `vSocial` | Account tabs, shared documents per account, platforms, and per platform: Feed preview, Analytics |
| `#money` | `vMoney` | Budget, Savings, Net worth, Goals |
| `#log` | `vLog` | Journal and wins/check-ins/lessons log |
| `#claude` | `vClaude` | Skills (have / building / needed), improvement list |
| `#study` | `vStudy` / `vCourse` | Learning: courses (lessons, notes, files, links, study plan) and a study planner |
| `#learn` | `vLearn` | Library of resources and turning them into skills |
| `#find` | `vFind` | Search |
| `#data` | `vData` | Backup export and recently deleted |

## Data model

Collections (`COLLS`): courses, goals, skills, improve, log, resources, paths, habits, journal, tasks, plans, workouts, trackers, clients, projects, acts, routines, checkins, meals, money, subs, trash, invoices, pmoney, savings, accounts, briefs, socials. Plus two single docs: `meta/taxonomy` (areas and sub-categories) and `meta/levels`.

`plans` holds keyed docs rather than a list:

| Key | Holds |
|---|---|
| `m-YYYY-MM` | Month plan |
| `w-<weekstart>` | Week plan (three priorities) |
| `d-<date>` | Day plan |
| `n-targets`, `n-<weekstart>`, `n-saved` | Nutrition targets, week, saved meals |
| `ci-fields` | Check-in fields template |
| `budget`, `networth` | Money |
| `jp-<date>` | `{ai:{questions,track,at}}` — the last Ask Claude journal suggestions for that day |
| `social` | `{profiles:[{id,name}]}` — the Social account tabs (default one is `personal`) |
| `sd-<profileId>` | `{docs:[{id,name,kind,date}]}` — documents uploaded for a Social account, shared by its platforms |

Selected record shapes:

- `courses`: `{name,provider,url,status:active|paused|done,target,next,why,lessons:[{t,done}],notes:[{date,text}],docs:[{id,name,date}],links,imgs,chats:[{q,a,date,saved}],created}`. `chats` keeps the last 20 Ask Claude answers (`coAsk` sends the course details, lessons and newest notes as context).
- Study sessions are `tasks` with `course` (course id), `topic`, `dur` (minutes) and `series` when repeated, so they show on the Today calendar, agenda and Planner like any task.

- `clients` / `projects`: fields plus `docs:[{id,name,kind,date}]`, `links:[{t,u,date}]`, `imgs:[{id,name,date}]`. Projects carry `client` (id or empty).
- `tasks`: `{date,text,time,done,goal?,project?}`.
- `workouts` (scheduled sessions) vs `routines` (saved workouts); editing a routine syncs upcoming sessions (`syncRoutine`).
- `socials` (one doc per platform): `{profile,name,created,posts:[{img:{id,name},caption,status,date}],stats:[{date,followers,reach,engagement,visits,clicks}]}`. Pillars, personas, research and strategy were removed in favour of account documents (`plans/sd-<profileId>`).

For a relational database, the nested arrays (posts, stats, docs, links, images, milestones, steps) are the natural candidates to become their own tables.

## Helpers worth knowing

`write`, `writeSeq`, `remove`, `savePlan(k,fn)`, `pdoc(k)`, `list(coll)`, `vh`, `tog`, `edit`/`pick` (generic field save via `data-doc` + `data-f`), `socSave(pid,fn)` and `data-soc` + `data-sp` (dot-path save for Social), `attachHtml` (links and images block), `fitRows` (planner rows for workouts, check-ins, client actions, due dates, renewals), `spark`, `cash`, `num`, `r1`, `review()` (mentor review, expects JSON back), `plan(id)` (goal plan), `briefHtml`/`makeBrief`, `draftSkill`.

## Claude features in the app

Buttons call `sample(prompt,{cache:false})` and parse the text (JSON for the mentor review and goal plans). In a standalone app these become calls to your own server endpoint, which calls the Claude API.

There is also a scheduled weekly mentor review that runs in claude.ai (Fridays, America/Edmonton), reads the artifact database and writes a `log/weekly-<date>` entry. It is tied to the artifact, so it will not see a new database until it is rebuilt against one.

## Moving the data

1. In the live hub, open Backup and download the backup file. It is one JSON file with every collection, the taxonomy and the levels.
2. Uploaded files and photos are not inside the export. The export lists them by id and name; the files themselves stay in the artifact and need downloading by hand and re-uploading.
3. An importer does not exist yet. For a standalone app, write a one-off script that loads the JSON into the new database.

## Testing

- `npm test` runs `tests/smoke.js`: loads the page in jsdom with a stubbed `window.claude`, visits every page, and exercises the main forms. The stub records writes in `writes` and replays `data` through `resnaps`; it does not apply writes to `data` by itself.
- Not covered by tests, and never verified outside the real artifact: real uploads, the backup download, and the Claude buttons.
- For visual checks, serve the page with a stub and screenshot it with a headless browser at 1280 and 390 wide, light and dark.

## Not built yet

Import from backup, cleanup of uploaded files when a record is deleted, social posts appearing in the Planner by date, Google Calendar sync (Melissa said no to this one for now).
