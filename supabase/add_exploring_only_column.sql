-- Lets someone use the app without claiming a grade/school -- e.g. an
-- adult or professional just exploring careers, not a current Grade 9-12
-- learner. Run once in the Supabase SQL Editor.
alter table public.learners add column if not exists "exploringOnly" boolean not null default false;
