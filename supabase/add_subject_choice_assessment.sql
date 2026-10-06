-- Adds storage for the Grade 9 Subject Choice Assessment.
--
-- One new jsonb column on learners holding a learner's answers:
--   { "answers": { "<questionId>": 1-5, ... },
--     "completedAt": "<ISO timestamp>",
--     "bankVersion": <number> }
--
-- Only the answers are stored. The report itself (interest, personality
-- alignment, academic readiness, overall fit, categories) is computed in
-- the browser from these answers plus the learner's current marks and
-- personality assessment results, so it always reflects their latest data.
--
-- Existing learners RLS already covers this (a learner reads/writes their
-- own row; admins see their scope), so no policy changes are needed.
--
-- IMPORTANT: run this BEFORE the new app version goes live. Without this
-- column, finishing the assessment cannot be saved (the app says "the app's
-- database needs an update (subjectChoice)"). If several columns might be
-- missing, run supabase/catch_up_learner_columns.sql instead -- it adds all of
-- them in one go.
--
-- Safe to run on an existing database -- purely additive.

alter table public.learners add column if not exists "subjectChoice" jsonb;

-- Make sure the API picks up the new column straight away.
notify pgrst, 'reload schema';
