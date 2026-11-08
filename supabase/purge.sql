-- Query for a Million: retention. Deletes the attempts (and, with them, their answers) started before a cut-off
-- date; the badges stay (their attempt_id becomes NULL). Run it after the course, once the grades are closed and the
-- oral checks are done (they need the answers of the badge attempts).
-- Dashboard → SQL Editor → set the date on the first line → Run. It shows what it deleted.
-- To also delete the accounts, use Authentication → Users (deleting a user deletes the profile, attempts and badges).
with cutoff as (select timestamptz '2026-09-01 00:00:00+00' as t),   -- ← the cut-off: attempts started before it go
gone as (
  delete from public.attempts a using cutoff
   where a.started_at < cutoff.t
  returning a.id, a.user_id, a.mode, a.status
)
select count(*) as attempts_deleted,
       count(*) filter (where status = 'won') as won_attempts_deleted
  from gone;

select count(*) as badges_kept, count(*) filter (where attempt_id is null) as badges_without_attempt from public.badges;
