-- Fixes a duplication bug found in final pre-pilot QA: the humanities
-- course-links file was run once before it got regenerated to add
-- photographer/filmmaker/musician, then run again in full -- so teacher,
-- social-worker and graphic-designer each got their real course links
-- inserted TWICE (240/24/18 rows instead of 120/12/9). Every affected
-- career's "Real degree programmes" card is currently showing every
-- institution twice. photographer/filmmaker/musician were only ever
-- inserted once and are unaffected.
--
-- Optional: run this SELECT first to see exactly what will be removed
-- (should return 120+12+9 = 141 rows, the exact-duplicate copies):
--
-- SELECT a.* FROM "careerCourseLinks" a
-- JOIN "careerCourseLinks" b
--   ON a."careerId" = b."careerId"
--   AND a."courseRequirementId" = b."courseRequirementId"
--   AND a.id > b.id;

DELETE FROM "careerCourseLinks" a
USING "careerCourseLinks" b
WHERE a.id > b.id
  AND a."careerId" = b."careerId"
  AND a."courseRequirementId" = b."courseRequirementId";
