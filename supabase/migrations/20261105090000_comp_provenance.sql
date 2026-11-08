-- Query for a Million: which bank an answer was graded with (docs/game-quiz.md §15.2).
-- A question can be reworded and re-uploaded under the same id during the course: each graded answer keeps the bank
-- version and the reference solution it was graded against, so the teacher's detail never pairs an old verdict
-- with a newer solution without saying so.
alter table public.answers add column version text;
alter table public.answers add column graded_solution text;

-- Any change to the bank, even by hand in the dashboard, moves updated_at: the function reloads its cache on it.
create function public.comp_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.comp_touch() from public, anon, authenticated;
create trigger comp_questions_touch before update on public.comp_questions for each row execute function public.comp_touch();
create trigger comp_meta_touch before update on public.comp_meta for each row execute function public.comp_touch();
