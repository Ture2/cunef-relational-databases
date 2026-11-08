-- Gives the teacher role to the teacher's account (docs/game-quiz.md §15.1). Not run automatically.
-- 1. The teacher signs in once on the game page (#/game, Competitive) with the email code, so the profile exists.
-- 2. Dashboard → SQL Editor → paste this file → Run. It must say "UPDATE 1" (0 means: sign in first).
-- Add a line per extra teacher; to take the role away, set role = 'student'.
update public.profiles set role = 'teacher' where email = 'alberto.turegano@cunef.edu';

select email, name, role from public.profiles where role = 'teacher';
