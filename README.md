# Iroli Career Pathway — Supabase build

A South African career-guidance web app for Grades 9–12, running on
Supabase (Postgres + Auth) instead of Firebase or Claude's in-artifact
runtime — fully self-hostable and workable as a normal GitHub project.

**Stack:** plain HTML/CSS/JS, no build step, no framework. Supabase's
JS client is loaded from a CDN as a plain `<script>` tag.

---

## Phase 0 — Before you start

- A free [Supabase](https://supabase.com) account.
- A place to host static files — this guide uses **GitHub Pages** since
  you already have a repo, but Netlify/Vercel/Cloudflare Pages work
  identically (Supabase only provides the backend, not frontend hosting).

---

## Phase 1 — Get it running locally

1. At [supabase.com/dashboard](https://supabase.com/dashboard), click
   **New project**. Pick an organisation, name it, set a strong database
   password (save it somewhere — you may need it later for direct DB
   access), pick a region close to your users, and create it. Wait
   ~2 minutes for provisioning.
2. **Project Settings → API.** Copy the **Project URL** and the
   **anon public** key (NOT the `service_role` key — that one is secret
   and must never go in browser code).
3. Open `js/supabase-config.js` and paste those two values in place of
   the `REPLACE_WITH_...` placeholders.
4. **SQL Editor → New query.** Paste in the entire contents of
   `supabase/schema.sql` from this project and click **Run**. This
   creates the `profiles`, `classes` and `learners` tables, turns on
   Row Level Security, and sets up the trigger that gives every new
   sign-up a safe default role. If it runs without errors, you're set.
5. **Authentication → Providers** — Email is on by default. Leave
   "Confirm email" on for now (default) — you'll get a "check your
   email" step when you sign up, which is normal and expected.
6. Serve the folder locally (it's static):
   ```bash
   npx serve .
   # or
   python3 -m http.server 8000
   ```
7. Open it in your browser, click **Create an account**, sign up with
   your own email. Check your inbox for the confirmation link (check
   spam too), click it, then come back and sign in.
8. In the Supabase dashboard, **Table Editor → profiles** — you should
   see one row for you, with `role = learner`. That confirms the whole
   chain (Auth → trigger → Postgres) is working.

---

## Phase 2 — Lock it down before anyone else touches it

The schema you ran in Phase 1 already includes the real security rules
(Row Level Security policies) — that part is done. This phase is about
verifying it and taking the one manual step nothing can do for you.

1. **Promote yourself to admin.** Nobody can do this from the app on
   purpose (the policies block it) — it has to be done directly in the
   database once:
   - Supabase dashboard → **Table Editor → profiles** → find your row →
     change `role` from `learner` to `admin` → save.
   - Refresh the app — you should now land in the Admin Portal.
2. **Sanity-check the policies.** Sign up a second test account and
   confirm it can only ever see its own `learners` row — not yours —
   until you promote it to admin too.
3. **Turn on Realtime for `learners`** (optional but nice): Database →
   Replication → toggle it on for the `learners` table. This makes
   things like a licence activation show up live for a learner who has
   the app open, without a refresh. The app works fine without this too.
4. **Set up Google sign-in** (optional): Google Cloud Console → create
   an OAuth 2.0 Client ID (Web application) → add
   `https://<your-project-ref>.supabase.co/auth/v1/callback` as an
   authorised redirect URI → copy the Client ID/Secret into Supabase
   **Authentication → Providers → Google**.
5. **Auth → URL Configuration** — once you know your real hosted URL
   (Phase 3), set the **Site URL** and add it to **Redirect URLs** here.
   Password reset and Google sign-in both redirect through this setting.

---

## Phase 3 — Push to GitHub and deploy with GitHub Pages

You've already created the repo — from inside this project folder:

```bash
git init                      # skip if the repo already has history
git add .
git commit -m "Iroli Career Pathway — Supabase build"
git branch -M main
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

- `js/supabase-config.js` is safe to commit — the URL and anon key
  identify your project, they don't grant access on their own (Row
  Level Security does that). **Never** commit a `service_role` key —
  that one bypasses RLS entirely and must only ever live on a trusted
  server, never in this repo or the browser.
- **Turn on GitHub Pages:** repo **Settings → Pages → Source → Deploy
  from a branch → `main` / `(root)`**. GitHub gives you a URL like
  `https://<your-org>.github.io/<your-repo>/` within a minute or two.
- Go back to Supabase **Authentication → URL Configuration** and set
  that GitHub Pages URL as the **Site URL** (Phase 2, step 5) — email
  confirmation links and password resets need this to point back to the
  right place.
- Add collaborators under GitHub repo **Settings → Collaborators**, work
  in branches, open PRs against `main` — Pages redeploys automatically
  on every push to `main`.

---

## Phase 4 — Pilot with a small group first

Don't go from "it runs on my laptop" straight to "every learner in the
school uses it." Run a short pilot (one class, a few weeks) and fix what
breaks before wider rollout.

Because this collects data from learners, many of whom are minors, treat
this phase as your privacy checkpoint under South Africa's **POPIA**
(Protection of Personal Information Act), not just a technical one:

- Write a short, plain-language notice in the app (or a linked page)
  saying what's collected (name, email, grade, school, subject choices,
  assessment answers), why, and who can see it (the learner and their
  school's admins/teachers).
- Get your school's usual parental/guardian consent process to cover
  this tool, the same way it would cover any other school system — this
  app doesn't (and shouldn't) try to collect consent itself.
- Only collect what you're actually using — the schema here is already
  fairly minimal (no ID numbers, no home addresses, no sensitive
  categories beyond what's needed for career guidance).
- Decide a retention rule (e.g. delete a learner's data N months after
  they leave the school) and who at your organisation is responsible
  for handling access/deletion requests. Deleting someone's row in
  `learners` plus their row in `auth.users` (via the dashboard) removes
  their data entirely.
- Check **Project Settings → Usage** so a bug or abuse doesn't run up a
  surprise bill during the pilot (Supabase's free tier is generous but
  has limits on database size, egress and monthly active users).

---

## Phase 5 — Harden before a real, paid launch

- **Payments:** this app deliberately does **not** process payments —
  the "licence" status is a manual admin toggle. If you want real
  checkout, integrate a South African payment gateway (e.g. PayFast,
  Yoco, Peach Payments) through a **Supabase Edge Function**, never by
  handling card details in the browser.
- **Admin invites:** right now, promoting someone to admin means editing
  the `profiles` table by hand (Phase 2, step 1). Once you have more
  than one or two admins, replace that with a Supabase Edge Function
  (using the `service_role` key, which only ever lives server-side
  inside the function, never in this repo) that checks an invite code
  before flipping `role` to `'admin'`.
- **Backups:** Supabase takes automatic daily backups on paid plans; on
  the free tier, schedule your own periodic export (Database →
  Backups shows connection details) so a bad migration can't
  permanently destroy learner data.
- **Rate limiting / abuse:** review Supabase's built-in Auth rate limits
  (Authentication → Rate Limits) and keep an eye on the API logs
  (Logs → API) for unusual traffic.
- **Monitoring:** Supabase's dashboard shows database and API usage —
  check in regularly (or set an alert) for unexpected spikes, often the
  first sign of an abused or leaked key.
- **Legal:** have a real Terms of Service and Privacy Policy reviewed
  for your jurisdiction before selling licences — this README is
  engineering guidance, not legal advice.

---

## Phase 6 — Grow it

- Add more careers/faculties (the data model in `js/data.js` was built
  to support this — Humanities, Law, Education, Creative Arts, etc. are
  just more entries in the `CAREERS` array and, if needed, `FACULTIES`).
- Feed real per-university admission data in as you get it, replacing
  the general guidance currently in each career's
  `apsGuidance`/`institutions`.
- Add analytics on which careers/faculties learners actually explore, to
  refine the matching weights in `scoreCareer()` (`js/app.js`).
- If the cohort table grows large, move the CSV export to a Postgres
  view or an Edge Function so it isn't computed entirely in the browser.

---

## Project structure

```
index.html                entry point, loads everything in order
style.css                 design system (colours, layout, components)
supabase/
  schema.sql              tables + Row Level Security policies — run once!
js/
  supabase-config.js      YOUR Supabase URL + anon key — edit this first
  icons.js                small inline SVG icon set
  data.js                 careers, faculties, assessment questions, subjects
  app.js                  auth bootstrap, Postgres data layer, matching engine
  auth-ui.js              sign-in / sign-up screen
  render_shell.js         router + page shell (sidebar/topbar/bottom nav)
  views_learner.js        onboarding, dashboard, assessment, careers, APS…
  views_admin.js          admin overview, classes, cohort table + export
  app_handlers.js         all click/submit handlers (the `App` object)
```

### Why the column names look like `"mathType"` in SQL

The Postgres tables use quoted, camelCase column names (`"mathType"`,
`"classId"`, etc.) instead of the more typical Postgres convention of
`snake_case`. That's deliberate: it means every JavaScript object in
this app (`learner.mathType`, `learner.classId`, …) matches the database
row exactly, with zero translation layer. If you write your own raw SQL
against these tables, remember to double-quote those column names —
Postgres silently lowercases unquoted identifiers.
