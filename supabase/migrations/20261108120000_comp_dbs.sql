-- Query for a Million: several competitive databases (docs/game-quiz.md §16).
-- Each competitive attempt draws one database at random (the video-game shop and four more). Every question belongs
-- to one database; the attempt keeps the database it drew. The datasets live in comp_meta.dbs
-- ({ <db>: { main_setup, hidden_setup, schema, types } }); the shop's old keys stay for older function versions.

/* 1. Questions: their database, and ids with a database prefix (the shop keeps cs01a…, the others f1_cs01a…). */
alter table public.comp_questions add column db text not null default 'shop' check (db ~ '^[a-z][a-z0-9]{1,15}$');
alter table public.comp_questions drop constraint comp_questions_id_check;
alter table public.comp_questions add constraint comp_questions_id_check check (id ~ '^([a-z][a-z0-9]{1,15}_)?c[siudk][0-9]{2}[ab]$');
create index comp_questions_db_mode on public.comp_questions (db, mode, level);

/* 2. Attempts: the database drawn at start (older attempts are the shop's). */
alter table public.attempts add column db text not null default 'shop' check (db ~ '^[a-z][a-z0-9]{1,15}$');

/* 3. comp_start with the database (the old six-argument version is replaced). */
drop function public.comp_start(uuid, text, text[], boolean, int, int);
create function public.comp_start(p_user uuid, p_mode text, p_ids text[], p_test boolean, p_minutes int, p_daily int, p_db text default 'shop')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_day   date := (now() at time zone 'Europe/Madrid')::date;
  v_n     int;
  v_id    uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || '|' || p_mode, 0));
  select id into v_id from public.attempts
   where user_id = p_user and mode = p_mode and test = p_test and status in ('playing', 'pending') and deadline > now()
   limit 1;
  if v_id is not null then
    return jsonb_build_object('error', 'state', 'active', v_id);
  end if;
  if not p_test then
    select count(*) into v_n from public.attempts where user_id = p_user and mode = p_mode and not test and day = v_day;
    if v_n >= p_daily then
      return jsonb_build_object('error', 'limit', 'count', v_n);
    end if;
  end if;
  insert into public.attempts (user_id, mode, ids, test, deadline, day, db)
  values (p_user, p_mode, p_ids, p_test, now() + make_interval(mins => p_minutes), v_day, coalesce(p_db, 'shop'))
  returning id into v_id;
  insert into public.answers (attempt_id, level, question_id) values (v_id, 1, p_ids[1]);
  return jsonb_build_object('id', v_id);
end $$;
revoke execute on function public.comp_start(uuid, text, text[], boolean, int, int, text) from public, anon, authenticated;
grant execute on function public.comp_start(uuid, text, text[], boolean, int, int, text) to service_role;
