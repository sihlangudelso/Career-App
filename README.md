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
7. Open it in your browser — that's the public landing page
   (`index.html`); click **Sign Up** to reach the actual app
   (`app.html`), then **Create an account** and sign up with your own
   email. Check your inbox for the confirmation link (check spam too),
   click it, then come back and sign in.
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
   - This makes you a **super admin** (full access to every class). The
     narrower **class admin** role — scoped to only the class(es) they're
     assigned — never needs a manual table edit: assign one from
     **Classes & Licences** by email, once they've signed up. If you ever
     demote a class admin back to `learner` by hand here instead, also
     clear that class's `classAdminId` in the **classes** table — not
     required for security (access is revoked the instant their role
     changes), just so the class doesn't keep showing them as assigned.
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
- **Admin invites:** assigning a *class admin* is already self-service
  (Classes & Licences, by email) — but promoting someone to full *super
  admin* still means editing the `profiles` table by hand (Phase 2,
  step 1). Once you have more than one or two super admins, replace that
  with a Supabase Edge Function (using the `service_role` key, which only
  ever lives server-side inside the function, never in this repo) that
  checks an invite code before flipping `role` to `'admin'`.
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
- **Beyond Grade 9–12 (planned, not started):** the product direction is
  to serve adults and working professionals too, not just school
  learners — e.g. career changers or people re-skilling. Current
  onboarding (`grade`, `school`, subject choices) and admin model
  (school-issued class/licence codes) are learner-specific and will
  need a second path that doesn't assume a school context before this
  can happen.

---

## Project structure

```
index.html                public landing page (marketing, no Supabase calls)
app.html                  the actual app — entry point, loads everything in order
pricing.html              pricing page
privacy.html              privacy notice
style.css                 design system (colours, layout, components)
supabase/
  schema.sql              tables + Row Level Security policies — run once!
  add_*.sql               one-off migrations for databases created before a
                          feature existed (e.g. add_subject_choice_assessment.sql)
  catch_up_learner_columns.sql
                          every learner column the app writes, as "add column if not
                          exists" -- run it once if saving says "the app's database
                          needs an update" (safe to run again)
js/
  supabase-config.js      YOUR Supabase URL + anon key — edit this first
  icons.js                small inline SVG icon set
  data.js                 careers, faculties, assessment questions, subjects
  app.js                  auth bootstrap, Postgres data layer, matching engine
  auth-ui.js              sign-in / sign-up screen
  learner_report.js       the learner report: five sections laid out like the design mock-up (the
                          model, and the screen markup)
  report_pdf.js           the same report as a four-page A4 PDF (see "The PDF" below)
  report_download.js      the "Download PDF" button: builds that PDF in the browser and saves it
  answer_inputs.js        how an answer feels: the pick animation, the pause before the next
                          question, and the touch-first snap slider (see below)
  render_shell.js         router + page shell (sidebar/topbar/bottom nav)
  views_learner.js        onboarding, dashboard, assessment, careers, APS…
  subject_choice_config.js  Grade 9 Subject Choice Assessment: ALL tunable settings
                          (score weights, thresholds, subjects, questions, wording)
  subject_choice_engine.js  that assessment's scoring logic (no numbers to hunt for)
  views_subject_choice.js   that assessment's screens and report
  views_admin.js          admin overview, classes, cohort table + export
  app_handlers.js         all click/submit handlers (the `App` object)
```

### Grade 9 Subject Choice Assessment

An additional assessment that sits alongside the personality assessment (it
does not replace it). It scores 21 Grade 10 subject areas on three things
and blends them — **interest** (what the learner enjoys, from 35 short,
indirect questions), **personality alignment** (from the existing personality
assessment) and **academic readiness** (from their Grade 9 report or current
marks) — by default 40% / 25% / 35%.

The questions are shown **one per screen**, exactly like the personality
assessment: a progress bar, one question card, the same four answer styles
(labelled buttons, numbered dots, the snap slider, faces — the style cycles with
the question number), the pick animation, an automatic move to the next question,
and Back / Continue. The order is shuffled per learner so a subject's two
questions are never back to back. A half-finished attempt is kept on the device
and resumed (`scSanitizeDraft` repairs drafts saved by an older version or damaged
in storage).

Everything you might want to change is in `js/subject_choice_config.js`:
`SC_CONFIG.weights`, the readiness bands and thresholds, `SC_SUBJECTS` (add a
subject here), `SC_BANK` (every question, 113 of them — each question's `weights`
say which subjects its answer feeds), `SC_ASKED_IDS` (the 35 that are actually
asked; `SC_QUESTIONS` is just that subset), `SC_COMBOS`, and the fixed wording in
`SC_COPY`. Only the learner's answers are stored (`learners."subjectChoice"`,
with a `bankVersion`); the report is recomputed from those plus their latest marks
and personality results.

**Why 35 of the 113.** 113 questions was far too long for a learner to finish.
The 35 were picked by simulation (seeded learners with a hidden "true" interest
in each subject; greedy forward selection of the questions that recover those
interests best, at most one question per subject and trait pairing — see the
comment above `SC_ASKED_IDS`). Measured, the short set recovers about 94% of what
all 113 do (0.758 vs 0.804 correlation on held-out simulated learners). Pushed
through the real engine on 467 simulated learners, the short set gave the same best
subject combination for 79.7%, the same Mathematics / Maths Literacy lean for 91%,
the same recommendation category for 91% of subjects, and moved a subject's overall
match by 2.5 points on average. To trade length for accuracy, change `SC_ASKED_IDS`
(the intro text, progress bar, question order and "complete" check all follow it).
Changing it after learners have answered means those learners are asked to retake
for the new questions — their old answers still count in the meantime.
**Learners who took the earlier 113-question version keep their report exactly as it
was**: scoring still reads every answer in `SC_BANK`, and a check over 1,000 simulated
learners with 113 answers found no difference in either report or the visible text.
"Complete" means every *asked* question is answered. Retaking replaces the saved
answers with the 35.

**Before deploying:** run `supabase/add_subject_choice_assessment.sql` once in
the Supabase SQL editor (or `supabase/catch_up_learner_columns.sql`, which adds this
and every other learner column in one go). Until the column exists, finishing the
assessment says "the app's database needs an update (subjectChoice)" and keeps the
learner's answers on screen.

**Who gets it:** Grade 9 learners choosing their Grade 10 subjects, plus anyone
who already has saved answers (they keep their report whatever grade they are in
now) — `subjectChoiceAvailable(l)` in `js/app.js`. Grade 10–12 and "just
exploring" learners are never offered it; their report words the same ideas
without "Grade 10" (`nextSubjectsPhrase(l)`, `isGrade9Learner(l)`) and shows the
subjects their best careers rely on instead. Reaching the route by address shows
a short explainer, not the form.

**Wording that is the owner's, not ours:** the example questions, the category
names (e.g. "Lower natural alignment") and the fixed sentences in `SC_COPY` that
came from the original specification are kept as written (see the comment above
`SC_COPY`). An automated review once flagged "does not mean you cannot succeed"
as breaking a "never say cannot" rule — it is the owner's own reassurance. Check
the spec before rewording any of it.

### The learner report

**Your Report** is one short report on screen — five numbered sections in a branded
layout drawn in the iroli brand colours — and a separate, deliberately composed
**four-page A4 PDF** (the "Download PDF" button, see *The PDF* below). Both read the same
object, `buildLearnerReport(l)`, so they cannot disagree.

1. **Your Learner Profile** — **Your key traits** (the learner's top 4–5, ranked, each
   with one sentence on what it means for them), how they like to work, "how you learn
   best", **Your interests** (five interest areas, each a 0–100% bar) and their
   personality type.
2. **Subject Fit** — each subject with **academic readiness, interest alignment and
   personality alignment kept as three separate numbers**, then overall fit and a label;
   a one-line personalised reason under every subject (the Mathematics or Mathematical
   Literacy decision, and the other similar-subject decisions below, show in those rows and
   reasons rather than in a card of their own); and the learner's strongest results and areas
   to strengthen.
3. **Recommended Subject Combination** — the best-fit combination and a second one that
   is deliberately not "equally safe" (see below): just the subjects to choose (Maths
   first; the compulsory languages and Life Orientation are not repeated).
4. **Career Pathways** — up to four broad career areas, each labelled from BOTH how well
   it matches the learner and whether their results support it, with example careers.
5. **Your Final Recommendation & Next Steps** — four answers (where the learner is likely
   to thrive, which subjects fit best right now, which areas to improve, which pathways
   could open if they improve), the summary and the next steps.

The longer views that used to be tabs (career pathways, careers, academic
strengths, subjects, profile, next steps) are one step away under "More detail",
and the PDF is only the short report.

It scores nothing itself. `buildLearnerReport(l)` in `js/learner_report.js`
gathers everything from the code that already owns it — `personalityTypeInfo`,
`scTraitScores` (key traits), the Subject Choice interest answers or the personality
assessment's RIASEC scores (interest areas), `buildAcademicProfile`, `buildSubjectChoiceReport` (subject fit,
combinations, the Maths decision), `bestSuitedCareers` (the example careers, in the same order as
Career Matches) — into one plain object, and `learnerReportHTML` / `reportA4HTML` draw it, so it cannot
disagree with the rest of the app. The words (Very Strong / Strong / Moderate / Low) and their
cut-offs are `LR_CONFIG` at the top of that file.

The first three sections are one chain — *key traits + interests + academic results →
Subject Fit → recommended combination* — and each says how it follows from the one
before.

#### Mathematics or Mathematical Literacy

Interests and personality never make Mathematics the safe choice on their own. The decision
(`decideMathPathway`, thresholds in `SC_CONFIG.math.bands`, wording in `SC_COPY`) starts from
the learner's **actual Grade 9 Mathematics result**:

| Result | Recommendation |
|---|---|
| 60% and above | Mathematics, where it supports their interests and pathways (otherwise "both are open") |
| 50–59% | Mathematics is suitable; steady effort still matters |
| 40–49% | Mathematics only if they strongly want careers that need it — clearly "readiness still developing", with extra support (and a safer Mathematical Literacy route beside it); otherwise Mathematical Literacy |
| below 40% | Mathematical Literacy by default (the stronger current academic fit) |
| below 30% | Mathematical Literacy is the main recommendation; Mathematics appears only as an aspirational pathway |
| no result | no decision is invented — the report asks for the mark |

"Strongly wants careers that need Mathematics" (`wants`) is read from interests and working
style only (the best-suited careers ranked with the marks left out, plus the subjects they like
best) — with marks in the ranking a low Mathematics result would hide the very careers they hope
for. When Mathematical Literacy is recommended and they do want Mathematics careers, the report
keeps the two things apart — what fits **for now** (the Mathematical Literacy row says so, with the
Mathematics result) and what the careers they want would need (Mathematics is marked *Aspirational*) —
shows an **Aspirational Mathematics pathway** combination beside the best fit, labels
Mathematics-heavy career areas and careers "Aspirational — Mathematics required" and never calls
them a strong fit. There is deliberately no separate "Mathematics or Mathematical Literacy?" card in
the report or the PDF (the owner asked for it to go); the decision still runs and still shapes
everything, and the owner's disclaimer sentence stays in full at the end. (The long Subject Choice
Report page still has its own explanation card.) Mathematical Literacy is described as a respected
subject that keeps many pathways open, never as the lesser one.

Two assumptions to know about (both in `SC_CONFIG.math`): `litLift` — Mathematical Literacy asks for
much less abstract algebra, so the same Maths result counts for more towards it (its readiness is the
Maths result plus 25% of the points missing to 100; an approximation, set it to 0 to use the plain
mark); and `interestSupports` / `interestAspires`, which decide when Mathematics "supports their
pathways" and when a medium pathway need counts as wanting Mathematics careers.

#### Similar subjects: Physical Sciences or Technical Sciences, IT or CAT

The same result-based decision applies to the other pairs of related subjects that differ mainly in how
demanding they are (`SC_CONFIG.pairs`; `decideSubjectPair` in `js/subject_choice_engine.js`):

| Demanding subject | Easier subject | Decided from |
|---|---|---|
| Mathematics | Mathematical Literacy | Grade 9 Mathematics (the section above) |
| Physical Sciences | Technical Sciences | the weakest of Grade 9 Mathematics and Natural Sciences |
| Information Technology | Computer Applications Technology | the weakest of Grade 9 Mathematics and Technology |

The bands are the Maths ones (`SC_CONFIG.math.bands`: 60 / 50 / 40 / 30) and so is the rule: from 50% the
demanding subject (when it supports their interests and pathways), 40–49% the demanding subject only if they
strongly want what needs it (with extra support, and the easier one as the safer route), otherwise the easier
subject with the demanding one *Aspirational* if they would like it. Notes:
- **Only for learners it applies to.** A pair is decided only when the learner shows some interest in either
  subject or their likely careers need the demanding one; for everyone else nothing changes (checked: for
  learners with no decision the report is identical, field for field, to the version before this existed).
- **The weakest result decides**, because the demanding subject needs all the areas it builds on, so a strong
  Mathematics mark cannot hide a Natural Sciences mark of 35%. The report names that one area and its mark.
- **Physical Sciences follows the Mathematics decision.** It cannot be taken with Mathematical Literacy, so
  with Mathematical Literacy it is aspirational and Technical Sciences is the science option; it is never
  picked outright while the Mathematics choice itself is still open, and it inherits "with extra support".
- **Technical Sciences is new** (`SC_SUBJECTS.technicalSciences`) and only appears where the decision picks it
  (`hideEasier`); its interest comes from the existing physical-science and design questions (no extra
  question, the assessment stays at 35), and it is a variant of Physical Sciences (`variantOf`) so one interest is
  never counted twice. It is usually offered at technical schools only, so the report adds a line saying so
  (`SC_COPY.technicalOffer`) whenever it recommends it.
- Combinations that use the set-aside subject drop out, and `SC_COMBOS` entries with a `when` are offered only
  where a decision picks the easier subject (Applied Science & Technology, Digital & Business). The
  aspirational/safer second combination comes from the first decision that calls for one (Mathematics first).

Assumptions to know about (all in `SC_CONFIG`/`SC_SUBJECTS`): the pairs and which learning areas feed each; the
"weakest result" rule; the academic weights of Technical Sciences (Natural Sciences 1, Technology 0.7, Mathematics
0.5); and whether Technical Sciences may be taken with Mathematical Literacy (the report does not claim either
way and tells the learner to check which Mathematics goes with it).

Things worth knowing:
- **The sections must agree.** `lrCheckReport(R)` runs when the report is built: a subject is never
  recommended in one place and set aside in another, a Mathematics-heavy pathway is never a strong fit
  beside a Mathematical Literacy decision, the final answers name only recommended subjects, and so on.
  Problems are warned in the console (never shown to the learner) and the test suites assert there are none.
- **Results are named by the Grade 9 learning area they come from.** A Grade 9 learner has no Business
  Studies, Accounting or Economics result, so the report says "your EMS and language results, together
  with your interest in Business & Finance, suggest a good fit" (the learning areas each subject builds
  on are `academicInputs` in `SC_SUBJECTS`), never "your strong Business Studies results".
- **A subject is never recommended on interests and personality alone.** The label beside
  each subject has five levels (`lrRecommend`): *Strongly Recommended* (a strong match
  and an overall fit of 80+, `LR_CONFIG.stronglyRecommended`), *Recommended* (a strong
  match), *Consider* (anything in between — and every subject we have no result for, so
  without marks nothing can be more than Consider), *May Require More Effort* (high
  interest with results still developing, or lower natural alignment) and *Aspirational*
  (they would like it, but it needs Mathematics their results do not yet support). Mathematics and
  Mathematical Literacy follow the Maths decision instead of the usual categories. Likewise "Strong
  Fit" in the summary needs the learner's results and no weak side.
- **Career areas are judged on two things** (`lrCareerAreas`, `LR_CONFIG.pathway`): alignment (interests
  and personality) and readiness (the learner's results for the subjects the area's careers require),
  and labelled *Strong Fit*, *Good Fit*, *Explore*, *Academic Readiness Developing* or *Aspirational*.
  Careers that need Mathematics (or a subject that needs it, such as Physical Sciences) are flagged when
  Mathematical Literacy is the recommendation; realistic areas are listed first.
- **Interest areas are the same answers as Subject Fit.** With the Subject Choice
  Assessment done, an area's score is the learner's interest in the two subjects they
  like best within it (`LR_AREAS` lists them), the very scores behind each subject's
  "interest alignment"; before that it comes from the personality assessment's interest
  dimensions.
- **"How you learn best" is inferred, not measured.** There is no learning-style
  test: the sentence is read from the learner's personality and work-style answers
  (`LR_LEARN`).
- **The report is deliberately short on words.** The owner asked for the explanations that are not
  needed to go (legends, "how to read" notes, section subtitles, what each personality dimension means,
  repeated advice, and then the whole "Mathematics or Mathematical Literacy?" card), so each trait, reason
  and answer is one short line (evidence plus one caution), and only the owner's own disclaimer wording
  stays in full. When adding text, ask what the learner would lose without it.
- **Every learner gets a report that fits them.** Grade 9 with a finished Subject
  Choice Assessment gets all of it; a Grade 10–12 or exploring learner has no
  "Recommended Subject Combination" (the numbers close up) and sees the subjects their
  careers rely on instead; someone with nothing done yet sees a "Start here" card,
  never an empty table. Finishing the Subject Choice or personality assessment lands
  on the report; the Subject Choice Assessment keeps its own detailed
  subject-by-subject page.
- **Brand colours only.** The look is the mock-up's layout, not its palette. The five
  section badges, trait icons and bars step through the logo gradient (blue → violet →
  pink, `--brand-*` in `style.css`); the Subject Fit bars use one colour per column
  (academic = blue, interest = violet, personality = pink); pills use the brand
  indigo and the existing blue and pink tints. Change the `--brand-*` / `--tint-*`
  tokens and the report follows.
- **The screen report is a light sheet in every theme.** Inside `.rp` the shared colour tokens are
  pinned to their light values. The phone layout is switched on by the report's own width (a CSS
  container query), not the screen width, because the report sits beside the sidebar;
  on a phone each subject becomes a small card with three labelled bars.

#### The PDF (`js/report_pdf.js`, `js/report_download.js`)

The report's PDF is a document built for A4, not the web page printed: **four pages**, each a
fixed 210 × 297 mm box (header, body, footer in a flex column), each answering one question:

| Page | Title | Answers | Contains |
|---|---|---|---|
| 1 | Your Learner Profile | Who am I? | details, key traits, interests (%), personality type, how they like to work, how they learn best |
| 2 | Your Subject Fit | Which subjects currently fit me? | every subject as a row (Academic / Interest / Personality / Overall, the label and a personalised reason), strongest results, areas to strengthen |
| 3 | Your Pathway | Where could these subjects take me? | best-fit and aspirational (or safer / alternative) combination, career areas with their labels and warnings |
| 4 | Your Recommendation | What should I do next? | the four answers, summary, academic readiness, next steps, the disclaimers |

A report that is not finished (no personality assessment yet, or a learner who is not choosing Grade 10
subjects) gets only the pages it has something real to say on (3 or 1), never pages of empty boxes.

**Download PDF** (the button above the report) builds the file in the learner's own browser and saves it —
no print window and no print settings to get wrong, and always exactly those pages (a browser's print engine
decides where pages break and can add blank ones; this cannot). The same A4 pages are laid out off-screen at
210 mm, fitted (`a4FitAll`), and each is drawn to an image (html2canvas) that becomes one page of a PDF (jsPDF);
an invisible text layer sits on top so the PDF can be searched and read by assistive technology. It takes a few
seconds and gives a file of about 2 MB. Things to know:
- The two libraries are loaded **from jsDelivr the first time the button is pressed** (never with the page), pinned
  to exact versions and checked against a fixed SRI hash — see `RD_LIBS` in `js/report_download.js`. To update one,
  change the version in the URL, download the file, and put its new `sha384` in `integrity`
  (`openssl dgst -sha384 -binary file | openssl base64 -A`). Nothing the learner sees or types leaves the browser.
- If they cannot be loaded (offline, or blocked by a school network), a page comes out blank, or anything else
  goes wrong, the print window opens instead with a short message ("Save as PDF" there still works).
- The pages are pictures (240 dpi), so the *look* is the browser's own rendering; only the hidden layer is text.
  `RD_CONFIG` holds the resolution and JPEG quality. Print and Download show the same pages; the print copy
  is shown only when printing (`.print-only`).
- Test hook: `rdBuildPDF(l, R)` returns the finished jsPDF document without saving it.

Printing from the browser (Ctrl/Cmd + P) still works and shows the same pages. To keep it from adding blank
sheets: pages break *between* pages only (`.a4-page + .a4-page { break-before: page }`, never after the last
one), each printed page is a hair shorter than the sheet (296.5 mm) so rounding can never push its end onto a
sheet of its own, and everything else on the screen (sidebar, top bar, toasts, dialogs) is hidden. The report's
screen version is wrapped in `.screen-only` (hidden when printing) beside its `.print-only` copy; **every other page
prints as itself** with the browser's usual margins (the zero-margin A4 `@page` rule travels inside the report's own
markup, see `reportA4HTML`). It used to print an *empty* page — everything that was not a print copy was hidden —
so printing, say, the long Subject Choice Report page gave blank sheets.

How overlap and overflow are prevented (not just hoped against):
- `@page { size: A4 portrait; margin: 0 }`: the pages carry their own margins, which also leaves the
  browser no margin to print its own URL, date and page numbers in.
- Nothing is positioned absolutely. Blocks stack in a flex/grid body that grows with its text; the footer
  owns its own strip, so the body cannot run underneath it. Text wraps (`overflow-wrap`), grid columns are
  `minmax(0, …)`, and the subject table is one row per subject instead of six crowded columns.
- Type is never shrunk to fit (9.5 pt body, 8.5 pt smallest). If a learner's content is longer than usual, the
  fit pass `a4FitAll` (run on `beforeprint`, and by the download) tightens the page (smaller gaps), then leaves
  out the least important blocks one at a time (`data-opt`, higher number goes first) and brings back whatever
  still fits.
- Colours are forced to print (`print-color-adjust: exact`) and the palette is pinned to light (the download
  is light in dark mode too).

To check a change by hand: open the report, press **Download PDF** and look at every page; also Print, tick
**Headers and footers** (they should still not appear); with long names/schools too. To check in a script, print the
page with `chrome --headless=new --print-to-pdf=out.pdf <url>` (leave out `--no-pdf-header-footer`, so the
margin trick is really tested) and read it back with PyMuPDF: page count, every word inside the safe
area, no two words overlapping, and every word on screen present in the PDF (text clipped by a page box
is silently missing from the PDF text). For the download, call `rdBuildPDF`, save the blob and compare it with
Chrome's own print of the same report (they should differ only at the edges of letters).

### One story across the app (please keep it that way)

A learner is shown their personality type, best careers and Grade 10 subjects
on several pages (report overview, subjects tab, My Profile, the subject
report, assessment results, dashboard, and the teacher's views). They must
never disagree, so each has exactly one definition — use these, don't
re-derive them:

| What | One definition | Lives in |
|---|---|---|
| Personality type (e.g. `IR`) | `personalityTypeInfo(l)` — top two RIASEC dimensions from the **Personality Assessment** | `js/app.js` |
| Best-suited careers | `bestSuitedCareers(l, n)` — the order the Career Matches page shows (strong matches first). **Empty until the personality assessment is done**: before it every career ties, so a "top three" would be arbitrary | `js/app.js` |
| Grade 10 subject recommendations | `reportSubjectSource(l)` — the **Subject Choice Assessment** once done, else a labelled provisional list ("the subjects your top careers rely on" for anyone who is not in Grade 9) | `js/views_report.js` |
| The learner report (screen and PDF) | `buildLearnerReport(l)` — built only from the rows above | `js/learner_report.js` (model, screen), `js/report_pdf.js` (A4 PDF) |
| Mathematics or Mathematical Literacy | `decideMathPathway` — from the learner's Grade 9 Mathematics result | `js/subject_choice_engine.js` |
| Physical or Technical Sciences, IT or CAT | `decideSubjectPair` — from the weakest Grade 9 result the demanding subject builds on | `js/subject_choice_engine.js` |
| Who sees what | `isGrade9Learner`, `subjectChoiceAvailable`, `learnerGate` (profile / activation screen), `resultsEntryLinkHTML` (where a learner adds marks) | `js/app.js` |
| How careers and subjects relate | `careerSubjectSupport()` / `reconcileCareersAndSubjects()` | `js/subject_choice_engine.js` |

Two assessments, two names: **Personality Assessment** (interests + strengths,
the `assessment` route) and **Subject Choice Assessment** (the `subject-choice`
route). The older 2-step Subject Guidance tool was retired; its
`learners."subjectGuidance"` column is unused but kept so old rows keep their data.

### Saving, drafts and shared computers

Learners often use school computers and patchy mobile data, so:

- **Saves are guarded.** `saveLearnerOrRevert` puts the in-memory profile back if
  a save fails (and `saveLearner` gives up after 20 s), the "Saving…" button
  restores its real label, and while a save is in flight (`SAVING` in
  `js/app.js`) taps that would change or repeat it are ignored.
- **Only what changed is written.** `writeLearner` UPDATEs just the fields being
  saved; only a learner's very first save is an INSERT. Do not go back to upserting
  the whole row: the database checks `learners_insert_own` (licenseStatus must be
  `'trial'`) against an upsert's proposed row even when the row exists, and every
  licensed learner's row says `'active'`, so that was refused on every save. (It
  also let a stale copy overwrite a newer one, and one failed save poison the next.)
- **A failed save says why**, in the toast (`classifySaveError` / `saveFailureMessage`):
  connection problem, sign-in expired, "not allowed", or "the app's database needs
  an update (<column>)". That last one means a column the app writes does not exist
  yet: run `supabase/catch_up_learner_columns.sql`. Any new column the app starts
  writing needs its migration run before the new code goes live.
- **Drafts** of in-progress forms live in `localStorage` under
  `iroli_drafts_v1_<learner id>` as `{ v:2, savedAt, drafts }`. They are dropped
  after 14 days, never stored for an admin's preview, not stored for pages that
  only pre-filled from saved data (nothing changed), validated on restore, and
  **removed when the learner signs out**. If a screen still throws, `render()`
  resets the drafts and returns home with a message instead of looping.
- **The 4-question quick start** is kept on the device until the account has
  saved it.

### Answer animations and sliders

Every question screen (personality assessment, Subject Choice, the Grade 9
work-style sliders, the 4-question quick start) goes through
`js/answer_inputs.js`, so they all feel the same:

- **The pick is shown.** The chosen option pops and sends out a ring (stars
  light up one after another, emoji bounce, quick-start tiles get a tick), and on
  the one-question-at-a-time screens the other options fade. The app then waits
  `ANSWER_HOLD_MS` (480 ms, top of `answer_inputs.js`) before sliding to the next
  question. Back or Continue during that pause cancels the wait; taps during it
  are ignored. Subject Choice behaves the same way (one question per screen, built
  from the same `assessWidgetHTML`); its answers are phrases ("Definitely not me"),
  so on a phone (≤ 480 px) the labelled-button style stacks instead of sitting five
  across (`.likert.long`).
- **Sliders are a "snap slider", not `<input type=range>`.** The thumb follows the
  finger exactly, then springs to the nearest of five stops. Tapping any stop, or
  the parked middle thumb, answers — a native range input only reports a *change*,
  so an untouched slider could never be answered "3" without dragging away and
  back. `touch-action: pan-y` keeps vertical swipes scrolling the page; a gesture
  the browser takes over (a scroll) records nothing. Keyboard: arrows move, Enter
  or Space confirm.
- Options carry `data-v` and sit in a `data-answer-group`; the look is in
  `style.css` under "Answer feedback" and "Snap slider". With "reduce motion" on,
  the movement is dropped and the pause shortens to 200 ms.
- **Retaking starts clean.** "Retake assessment" (personality) and "Retake" (Subject
  Choice) open a blank attempt: nothing pre-selected, from the first question. The
  saved results are only replaced when the new attempt is finished and saved, so
  leaving halfway keeps the old ones.

### Navigation

`LEARNER_NAV` in `js/render_shell.js` drives the sidebar, the phone's menu sheet and
(its first five entries) the phone's bottom bar. **Grade 9 Report Results** sits above
the two assessments for Grade 9 learners only (`grade9Only`): it is where the marks
that the assessments use are entered. It is `menuOnly`, so the phone's bottom bar keeps
the five places it always had (Dashboard, Report, Personality, Subjects, Career) and
this one lives in the menu there, in the same spot; delete `menuOnly` to put it in the
bar (it would push Career out).

### Admin preview

An admin can preview the learner experience as Grade 9, 10, 11, 12 or "just
exploring" (the chips on the preview dashboard). It is memory-only: nothing is
saved, and joining or leaving a class is switched off so no real seat is used.

### Why the column names look like `"mathType"` in SQL

The Postgres tables use quoted, camelCase column names (`"mathType"`,
`"classId"`, etc.) instead of the more typical Postgres convention of
`snake_case`. That's deliberate: it means every JavaScript object in
this app (`learner.mathType`, `learner.classId`, …) matches the database
row exactly, with zero translation layer. If you write your own raw SQL
against these tables, remember to double-quote those column names —
Postgres silently lowercases unquoted identifiers.
