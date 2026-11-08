-- Query for a Million: hardening after the security review (docs/game-quiz.md §15).

/* 1. One SQL run per user every few seconds, claimed atomically BEFORE the server runs any student SQL (submit,
      Review, rescue): parallel requests cannot all get through. */
alter table public.profiles add column last_sql_at timestamptz;
create function public.comp_claim(p_user uuid, p_gap_ms int)
returns boolean language sql security definer set search_path = '' as $$
  with c as (
    update public.profiles set last_sql_at = now()
     where user_id = p_user
       and (last_sql_at is null or last_sql_at <= now() - make_interval(secs => p_gap_ms / 1000.0))
    returning 1
  )
  select exists (select 1 from c);
$$;
revoke execute on function public.comp_claim(uuid, int) from public, anon, authenticated;
grant execute on function public.comp_claim(uuid, int) to service_role;

/* 2. One account per mailbox: only plain addresses (no +tags), lower case, @cunef.edu. The same rule is in the
      function (comp/index.ts) and in the page. */
create or replace function public.comp_before_user_created(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_email text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if v_email ~ '^[a-z0-9._-]+@cunef\.edu$' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Only plain @cunef.edu addresses can sign up (letters, digits, dot, hyphen, underscore). / Solo pueden registrarse direcciones @cunef.edu sencillas.'));
end $$;

/* 3. An email change in Auth keeps profiles.email in step (the function also re-checks the domain on every call). */
create function public.comp_handle_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    begin
      update public.profiles set email = lower(new.email) where user_id = new.id;
    exception when unique_violation then
      raise exception 'This email is already used by another profile.';
    end;
  end if;
  return new;
end $$;
revoke execute on function public.comp_handle_user_email() from public, anon, authenticated;
create trigger comp_on_auth_user_email after update of email on auth.users
  for each row execute function public.comp_handle_user_email();

/* 4. Retention (supabase/purge.sql): old attempts can be deleted while the badges stay. */
alter table public.badges alter column attempt_id drop not null;
alter table public.badges drop constraint badges_attempt_id_fkey;
alter table public.badges add constraint badges_attempt_id_fkey foreign key (attempt_id) references public.attempts (id) on delete set null;
