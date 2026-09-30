-- Carries a learner's pre-registration 60-second mini-assessment answers
-- (interest/strength/motivation/activity picks from the anonymous flow,
-- see js/views_anon.js) into their real account, once, on first signup.
-- Purely informational: never read by the matching engine (evaluateCareer,
-- computeMatches, computeStrengthDomains) -- see js/app.js loadLearner()
-- for the merge and the guardrail comment above computeMiniDirections().
-- Safe to run on an existing database -- purely additive, defaults to
-- null for every existing learner.

alter table public.learners add column if not exists "miniAssessment" jsonb;
