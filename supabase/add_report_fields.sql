-- Adds a Grade 9 learner's own forward-looking Grade 10 subject intent,
-- distinct from `subjects` (only ever populated for already-enrolled
-- Grade 10+ learners) and from `subjectGuidance` (the app's own
-- recommendation, not the learner's stated plan -- comparing the
-- recommendation against itself for conflict detection would be
-- tautological). Kept as top-level columns rather than nested inside
-- subjectGuidance, since guideSubmit() wholesale-replaces that object on
-- every retake of the Subject Choice Guidance quiz.
-- Safe to run on an existing database -- purely additive, defaults to
-- empty/null for every existing learner until they declare their intent.

alter table public.learners add column if not exists "intendedSubjects" text[] default '{}';
alter table public.learners add column if not exists "intendedMathType" text;
