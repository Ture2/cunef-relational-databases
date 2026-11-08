-- Query for a Million, competitive side (docs/game-quiz.md §15.1–§15.2).
-- Students read nothing directly: every table has RLS on and no policy for anon / authenticated, except a user's
-- own profile (read it, update its name). Everything else goes through the Edge Function `comp`, which uses the
-- service role.

/* ---- Profiles ------------------------------------------------------------------------------- */

create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text check (name is null or char_length(btrim(name)) between 1 and 80),
  role        text not null default 'student' check (role in ('student', 'teacher')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (name) on table public.profiles to authenticated;   -- the name only: never the role or the email
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles: update own name" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- The profile row is created with the user (any sign-up path).
create function public.comp_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, email) values (new.id, lower(new.email)) on conflict (user_id) do nothing;
  return new;
end $$;
revoke execute on function public.comp_handle_new_user() from public, anon, authenticated;
create trigger comp_on_auth_user_created after insert on auth.users
  for each row execute function public.comp_handle_new_user();

/* ---- Auth hook: only @cunef.edu may sign up --------------------------------------------------- */
-- Wired in supabase/config.toml ([auth.hook.before_user_created]) for the local stack; on the hosted project:
-- Dashboard → Authentication → Hooks → "Before User Created" → Postgres → public.comp_before_user_created.
create function public.comp_before_user_created(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if v_email ~ '^[^@[:space:]]+@cunef\.edu$' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Only @cunef.edu email addresses can sign up. / Solo pueden registrarse direcciones @cunef.edu.'));
end $$;
revoke execute on function public.comp_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.comp_before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

/* ---- The bank (uploaded by tools/comp-upload.mjs) ------------------------------------------------- */

create table public.comp_questions (
  id                text primary key check (id ~ '^c[siudk][0-9]{2}[ab]$'),
  mode              text not null check (mode in ('select', 'insert', 'update', 'delete', 'ddl')),
  level             int  not null check (level between 1 and 15),
  prompt_en         text not null,
  prompt_es         text not null,
  clause_en         text not null,
  clause_es         text not null,
  template          text not null,
  template_note_en  text not null,
  template_note_es  text not null,
  ordered           boolean not null default false,
  checks            jsonb,                               -- probes; null = the default snapshots (DML)
  keywords          jsonb not null default '[]'::jsonb,  -- the Key clause keywords (for the no-clause flag)
  solution          text not null,
  traps             jsonb not null default '[]'::jsonb,
  alts              jsonb not null default '[]'::jsonb,
  main_only         boolean not null default false,      -- graded on the public dataset only
  updated_at        timestamptz not null default now()
);

create table public.comp_meta (
  key         text primary key,                          -- version, main_setup, hidden_setup, schema
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

/* ---- Attempts, answers, badges ---------------------------------------------------------------- */

create table public.attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (user_id) on delete cascade,
  mode            text not null check (mode in ('select', 'insert', 'update', 'delete', 'ddl')),
  ids             text[] not null check (cardinality(ids) = 15),
  level           int  not null default 1 check (level between 1 and 15),
  status          text not null default 'playing' check (status in ('playing', 'pending', 'won', 'lost', 'walked', 'expired')),
  prize           int  not null default 0,
  used            jsonb not null default '{"clause": false, "template": false, "review": false}'::jsonb,
  shown           jsonb not null default '{"clause": null, "template": null}'::jsonb,
  started_at      timestamptz not null default now(),
  deadline        timestamptz not null,
  finished_at     timestamptz,
  test            boolean not null default false,
  day             date not null,                         -- the calendar day of started_at in Europe/Madrid
  rev             int  not null default 0,               -- optimistic concurrency: every change bumps it
  last_submit_at  timestamptz                            -- rate limit of submit
);
create index attempts_user_mode_day on public.attempts (user_id, mode, day);
create index attempts_active on public.attempts (user_id, mode) where status in ('playing', 'pending');

create table public.answers (
  id           bigint generated always as identity primary key,
  attempt_id   uuid not null references public.attempts (id) on delete cascade,
  level        int  not null check (level between 1 and 15),
  question_id  text not null,
  sql          text,
  ok           boolean,
  reason       text,
  shown_at     timestamptz not null default now(),
  answered_at  timestamptz,
  tele         jsonb,
  flags        text[] not null default '{}'
);
create index answers_attempt on public.answers (attempt_id, id);

create table public.badges (
  user_id     uuid not null references public.profiles (user_id) on delete cascade,
  mode        text not null check (mode in ('select', 'insert', 'update', 'delete', 'ddl')),
  attempt_id  uuid not null references public.attempts (id) on delete cascade,
  earned_at   timestamptz not null default now(),
  primary key (user_id, mode)
);

-- Deny by default: RLS on, no policy, no privilege for the API roles (the service role bypasses RLS).
alter table public.comp_questions enable row level security;
alter table public.comp_meta enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.badges enable row level security;
revoke all on table public.comp_questions, public.comp_meta, public.attempts, public.answers, public.badges from anon, authenticated;
revoke all on sequence public.answers_id_seq from anon, authenticated;

/* ---- Starting an attempt, atomically ------------------------------------------------------------- */
-- One active attempt per user, mode and kind (test or not); at most p_daily non-test attempts per user and mode per
-- calendar day in Europe/Madrid. Returns { id } or { error: 'state' | 'limit' }. Called by the Edge Function only.
create function public.comp_start(p_user uuid, p_mode text, p_ids text[], p_test boolean, p_minutes int, p_daily int)
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
  insert into public.attempts (user_id, mode, ids, test, deadline, day)
  values (p_user, p_mode, p_ids, p_test, now() + make_interval(mins => p_minutes), v_day)
  returning id into v_id;
  insert into public.answers (attempt_id, level, question_id) values (v_id, 1, p_ids[1]);
  return jsonb_build_object('id', v_id);
end $$;
revoke execute on function public.comp_start(uuid, text, text[], boolean, int, int) from public, anon, authenticated;
grant execute on function public.comp_start(uuid, text, text[], boolean, int, int) to service_role;
