-- Adds Grade 9 (Senior Phase) report results and a short work-style
-- preference survey. Both are entirely separate from the existing
-- FET-phase "subjectMarks" field: a Grade 9 learning area like "Natural
-- Sciences" or "Economic and Management Sciences" covers several FET
-- subjects at once (Physical Sciences + Life Sciences; Accounting +
-- Business Studies + Economics), so it can't share a keyspace with it --
-- see GRADE9_TO_FET in js/data.js for how the two are connected.
-- Safe to run on an existing database -- purely additive, defaults to
-- null for every existing learner until they fill either section in.

alter table public.learners add column if not exists "grade9Report" jsonb;
alter table public.learners add column if not exists "workStyle" jsonb;
