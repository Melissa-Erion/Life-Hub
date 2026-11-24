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
| `focus` | `{areas:[areaId]}` — up to 3 Explore focus areas (shown first; others fold away at 3) |
| `review` | `{at,data,text}` — the latest mentor review, shown again on Today and used by the weekly rhythm |
| `skrank` | `{order:[{id,why}],at}` — Claude's ranking of which skill to build first |
| `jpat` | `{reports:[{at,days,summary,patterns:[{title,detail,kind}],blindSpot,strengths,experiments:[{act,why,measure}],question,track}]}` — Journal pattern reviews (last 12). The mentor review reads the latest one. |
| `jp-<date>` | `{ai:{questions,track,at}}` — the last Ask Claude journal suggestions for that day |
| `social` | `{profiles:[{id,name}]}` — the Social account tabs (default one is `personal`) |
| `sd-<profileId>` | `{docs:[{id,name,kind,date}]}` — documents uploaded for a Social account, shared by its platforms |

Selected record shapes:

- `skills`: `{name,does,gap,area,status:needed|building|have,prep:[{t,done}],built,tests:[bool,bool],startedAt,haveAt}`. `prep` is made from `gap` when building starts (`skPrep`); `skPrompt` builds the prompt to paste into a Claude chat.
- `courses`: `{name,provider,url,status:active|paused|done,target,next,why,lessons:[{id,t,done}] (shown as Modules),notes:[{id,date,title,text,mod}] (mod = module id, empty for General),docs:[{id,name,date}],links,imgs,chats:[{q,a,date,saved}],created}`. `chats` keeps the last 20 Ask Claude answers (`coAsk` sends the course details, lessons and newest notes as context).
- Older lessons/notes without ids get `L<i>`/`N<i>` ids on first edit (`coFix`); `coEdit(cid,fn)` clones, fixes ids, applies `fn` and writes in one go. `ui.cnote` opens a note full screen (`vCNote`).
- Study sessions are `tasks` with `course` (course id), `topic`, `dur` (minutes) and `series` when repeated, so they show on the Today calendar, agenda and Planner like any task.

- `clients` / `projects`: fields plus `docs:[{id,name,kind,date}]`, `links:[{t,u,date}]`, `imgs:[{id,name,date}]`. Projects carry `client` (id or empty).
- `tasks`: `{date,text,time,done,goal?,project?}`.
- `workouts` (scheduled sessions) vs `routines` (saved workouts); editing a routine syncs upcoming sessions (`syncRoutine`).
- `socials` (one doc per platform): `{profile,name,created,posts:[{img:{id,name},caption,status,date}],stats:[{date,followers,reach,engagement,visits,clicks}]}`. Pillars, personas, research and strategy were removed in favour of account documents (`plans/sd-<profileId>`).

For a relational database, the nested arrays (posts, stats, docs, links, images, milestones, steps) are the natural candidates to become their own tables.

## Workflow guidance

- Navigation is grouped in workflow order: Daily (Today, Planner, Journal), Direction (Explore, Goals), Areas (Fitness, Learning, Business, Social, Money), Claude (Claude, Library), Hub (Search, Backup). Phone bottom bar: Today, Planner, Goals, Fitness, Social, More.
- `guideHtml(key,title,steps)` draws a step guide that ticks itself from data, with a Do this next button; collapse state is per browser (localStorage `lh-guide-<key>`). Used by `goalsGuide`, `exploreGuide`, `libraryGuide`, `claudeGuide`.
- `data-act="gf"` jumps to a page (`data-h`), opens a goal (`data-open`) and focuses a field (`data-focus`).
- Goals: `goalFlags(g)` (needs a target, needs a date, no steps, next step not scheduled, no result in 2 weeks); the goal's Next step box schedules a task linked by `goal`.
- Today: `rhythmHtml()` (plan week, daily check-in, patterns, mentor review).
- Library resources keep `skillId` when their suggested skill is added; skills keep `res`.

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

## Family space

Shared data lives in `shared_docs` (space_id, coll, id, data) and is reached through `window.claude.use("family")` (see `app/runtime.js`). In the app, any collection whose name starts with `f_` is routed to the family store by `storeFor()`; `write()` and `remove()` work the same for both, and deleted family records go to `f_trash`.

| Collection | Shape |
|---|---|
| `f_people` | `{name, kind:"person"|"pet", birthday, order, ...profile fields}` (sections and fields in `PSECT`); school tab fields in `SFIELDS` plus `teachers:[{name,role,email,phone}]`, `sched:[{t, d:[Mon..Fri]}]`, `schoolOn`; `docs:[{kind:"file"|"link", name, cat, note, date, by, byName, url | fid+blob}]` |
| `f_events` | `{title, date, time, end, where, notes, who:[personId], yearly, by}`; birthdays come from `f_people` |
| `f_habits` | `{name, per, owner:user_id, days:{date:1}}`; only the owner can tick |
| `f_chores` | `{name, who:personId, freq:"daily"|"weekly"|"biweekly"|"monthly", day, notes, log:{periodKey:{by,byName,date}}, last}`; `chKey()` gives the current period key, so ticks reset by themselves |
| `f_todos` | `{text, who, due, done, doneAt, doneBy, doneByName}`; dated ones show on the calendar |
| `f_maint` | `{name, area, every (months), month (best month, optional), last, who, notes, hist:[{date,by,byName}]}`; `mNext()` and `mState()` work out the next due date |
| `f_goals` | `{title, area, target, due, why, status:"active"|"paused"|"done", steps:[{t, done, who:personId, doneBy, doneByName, doneAt}], milestones:[{t, done}]}`; combined goals both members edit |
| `f_hcats` | `{name, planned}` household budget categories |
| `f_hbills` | `{name, amount, day, cat, auto, paid:{"YYYY-MM":{date,by,byName}}}`; ticking paid writes `f_hmoney/bill-<id>-<month>` |
| `f_hmoney` | `{kind:"in"|"out", date, amount, cat, what, by, byName, bill?}` |
| `f_hsave` | `{name, target, saved, due, log:[{date,amount,by,byName}]}` |
| `f_gifts` | `{forName, occasion, idea, price, where, status:"idea"|"bought"|"wrapped"|"given", year}`; private gifts use the same shape in the personal `gifts` collection |
| `f_lists` | `{name, kind:"groceries"|"shopping"|"todo"|"other", ord}` |
| `f_items` | `{list, t, done, qty, who, date, time, at, by}`; `list` is `list:<id>` or `trip:<id>:book|pack|plan`, one record per item so two people adding at once never clash |
| `f_trips` | `{name, kind:"trip"|"holiday", status, start, end, where, stay, who:[personId], notes}`; shown on the calendar for every day it spans |
| `f_checkins` | id is the week start (Sunday); `{answers:{user_id:{wins,hard,need,next}}, together, decisions, done:{date,by,byName}}` |
| `f_feedback` | `{kind:"bug"|"idea", page, text, by, byName, date, at, status, reply, device, width}`; the space owner sets status and reply |

Personal goals with `shared:true` are readable by family members (RLS policy on `docs`) and appear in `S.pgoals`.

Pages: `#family`, organised by `FGROUPS` into five sections (Overview; Plan: Calendar, Check-in, Trips; Home: Chores, Lists, Upkeep; Money: Budget, Investing, Gifts; People: Profiles, Goals, Habits). `famNav()` draws the section row (`data-act="famg"`) and the tab row (`tog` key `fam`); `ui.fam` is the tab and `ui.famLast` remembers the last tab per section and `#help` (Feedback, with the tour button). The tour is `TOUR` (hash, title, text); it starts by itself once for an empty new account and records `plans/tour.done`.

Family files are uploaded with `family.upload(file)` to Storage at `files/family/<space_id>/<id>`. Storage policies let any member of that space read, add and delete there (`private.member_of_text`). The service worker serves them at `_blob/fam/<space_id>/<id>`.

## Investing

Personal (Money page, Investing tab) and family (Family, Money, Investing) share one renderer, `invHtml(cfg)`, with `PCFG` (`invest`, `invlog`, `watch`) or `FCFG` (`f_invest`, `f_invlog`, `f_watch`).

- Investment: `{name, sym, qty, kind, acct, where, own (family only, person id or "" for joint), invested, value, updated, hist:[{d,v}], notes}`. "Update" sets the value and adds a history point for today; "Add money" raises both invested and value and logs it.
- Log: `{hold, name, amount, date, at, by, byName}`. Watchlist: `{name, sym, why, link, date, by, byName}`.
- The trend line is built from each investment's history (`invTrend`). Values are entered by hand; nothing is fetched. It records and totals only, with no advice wording.

## Notifications

- Feedback badge: `fbUnread()` counts reports from others newer than `plans/fbseen.at` (owner only). `fbBadges()` puts the count on the Feedback menu link and the phone menu button; opening Feedback marks them seen. A note pops up when one arrives while the app is open (`fbWatch`).
- Phone and desktop notifications use Web Push. `window.claude.use("push")` (runtime.js) has `state()`, `enable()`, `disable()` and `notify(kind,id)`. Devices are stored in `public.push_subs` (one row per device, owner-only RLS).
- The `notify` edge function (supabase/functions/notify) checks the caller, then sends to the right people: `kind:"test"` goes to the caller's own devices; `kind:"feedback"` goes to the space owner(s) other than the sender, and only for a report the caller wrote. Dead devices (404/410) are removed.
- The VAPID public key is in `config.js`; the private key is in `private.app_secrets`, readable only by the service role through `public.lh_secret()`. It is not in this repository. The service worker (`sw.js`) shows the notification and opens the Feedback page when it is tapped.
- iPhone and iPad only allow notifications from the installed home-screen app (iOS 16.4+).
