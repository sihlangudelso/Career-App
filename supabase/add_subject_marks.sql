-- Adds persistent storage for a learner's latest per-subject report marks,
-- so career matching can eventually weigh actual academic performance
-- alongside interests and subject choice, not just "did they tick this
-- subject's checkbox". Shape: { "Geography": { "pct": 81, "term": "..." }, ... }
-- Safe to run on an existing database -- purely additive, defaults to null
-- for every existing learner row until they enter marks themselves.

alter table public.learners add column if not exists "subjectMarks" jsonb;
