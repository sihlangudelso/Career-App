-- Found in the pre-launch audit: js/course-links.js actively queries
-- "careerCourseLinks" and "courseRequirements" (joined via
-- courseRequirementId), but neither table has ever appeared anywhere in
-- this repo's schema.sql/migrations -- they were created directly in the
-- Supabase dashboard, outside version control, so their actual RLS state
-- couldn't be confirmed from the code alone. If RLS was left off (the
-- Postgres/Supabase default for a table created without it), both tables
-- would be readable AND writable/deletable by anyone, including
-- unauthenticated requests, via the public anon key.
--
-- The CREATE TABLE statements below are a best-effort reconstruction
-- from the only evidence available -- the exact columns js/course-links.js
-- selects, and the column names/types implied by add_humanities_course_
-- links.sql's own INSERT statements (careerCourseLinks.id is compared
-- with ">" there, i.e. auto-incrementing, not a uuid). They're wrapped in
-- IF NOT EXISTS specifically so they're a no-op against your real,
-- already-populated tables, whatever their exact existing shape turns
-- out to be -- they only matter for a brand-new install that's never had
-- this data. What actually fixes THIS project's live tables, regardless
-- of their current exact shape, is the ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY and the policy below -- both are safe and effective to run
-- even if the table already exists with different column details.
--
-- Read-only, matching how this reference data is actually used: every
-- learner-facing route that reads it already requires a real signed-in
-- session (see README/schema.sql's own RLS model), so authenticated-only
-- is the correct scope -- no anon policy, and no insert/update/delete
-- policy for anyone: new course-link data is added the same way it
-- already is today, by running a migration file directly in the
-- Supabase SQL Editor as the project owner (which bypasses RLS
-- entirely), never through the app itself.

create table if not exists public."courseRequirements" (
  id serial primary key,
  institution text,
  "courseName" text,
  faculty text,
  "apsScore" integer,
  "closingDate" text,
  "subjectRequirements" jsonb
);

create table if not exists public."careerCourseLinks" (
  id serial primary key,
  "careerId" text not null,
  "courseRequirementId" integer not null references public."courseRequirements"(id),
  "matchType" text,
  "matchedKeywords" text
);

alter table public."courseRequirements" enable row level security;
alter table public."careerCourseLinks" enable row level security;

drop policy if exists "course_requirements_select_authenticated" on public."courseRequirements";
create policy "course_requirements_select_authenticated"
  on public."courseRequirements" for select
  using (auth.role() = 'authenticated');

drop policy if exists "career_course_links_select_authenticated" on public."careerCourseLinks";
create policy "career_course_links_select_authenticated"
  on public."careerCourseLinks" for select
  using (auth.role() = 'authenticated');
