-- Catch-up for a database that is missing some of the columns the app writes.
--
-- Symptom: saving the Grade 9 report results, a Grade 10-12 learner's subject
-- marks (profile / onboarding) or the quick-start answers fails, and the app
-- says "the app's database needs an update (<column>)".
--
-- Cause: each of these columns was added by its own one-off migration
-- (add_subject_marks.sql, add_grade9_report.sql, add_mini_assessment.sql ...),
-- and a database where one of those was never run does not have the column.
--
-- Fix: paste this whole file into the Supabase SQL editor and click Run. Every
-- statement is "add column if not exists", so it is safe to run on a database
-- that already has some or all of the columns, and safe to run again.

alter table public.learners add column if not exists "subjectMarks"      jsonb;
alter table public.learners add column if not exists "grade9Report"      jsonb;
alter table public.learners add column if not exists "workStyle"         jsonb;
alter table public.learners add column if not exists "miniAssessment"    jsonb;
alter table public.learners add column if not exists "subjectChoice"     jsonb;
alter table public.learners add column if not exists "intendedSubjects"  text[] default '{}';
alter table public.learners add column if not exists "intendedMathType"  text;
alter table public.learners add column if not exists "cellNumber"        text;
alter table public.learners add column if not exists "exploringOnly"     boolean not null default false;
alter table public.learners add column if not exists "licenseSource"     text check ("licenseSource" in ('admin','class'));

-- Make the API pick the new columns up straight away.
notify pgrst, 'reload schema';

-- Check: this should return NO rows once everything is in place.
select c.col as still_missing
from unnest(array[
  'subjectMarks','grade9Report','workStyle','miniAssessment','subjectChoice',
  'intendedSubjects','intendedMathType','cellNumber','exploringOnly','licenseSource'
]) as c(col)
where not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'learners' and column_name = c.col
);
