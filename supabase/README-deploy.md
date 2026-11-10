# Query for a Million: the competition server (Supabase)

The competitive side of the game (`#/game`, Competitive) runs on the Supabase project `mbumfoxhmsrlytjwuypb`
(free plan). Contract: `docs/game-quiz.md` §15. Study mode does not need any of this.

What lives here:

| Path | What |
|---|---|
| `supabase/config.toml` | the local stack (Docker) and the settings of the `comp` function |
| `supabase/migrations/*.sql` | tables, RLS (deny by default), profile triggers, the @cunef.edu auth hook, `comp_start`, `comp_claim`, grading provenance |
| `supabase/functions/comp/index.ts` | the API (§15.3) |
| `supabase/functions/_shared/` | the grading engine: `engine.js`, `load.js`, copies of `js/oracle-dialect.js` and `js/game-core.js` |
| `supabase/templates/otp.html` | the sign-in email with the 6-digit code (`{{ .Token }}`) |
| `supabase/seed-teacher.sql` | gives the teacher role (run by hand) |
| `supabase/purge.sql` | retention: deletes old attempts and answers, keeps the badges (run by hand) |
| `tools/comp-*.mjs`, `tools/supabase-sync.mjs` | the hidden dataset, validation, upload, engine sync |
| `tools/check-comp-server.mjs`, `tools/check-no-secrets.mjs` | the tests |

Secrets never go into the repository: the service-role key and the database password are typed in the terminal
only. The anon (or publishable) key is public by design: it goes into `data/game-comp-config.js`.

All commands run from `tools/` (the Supabase CLI is a dev dependency there): `cd tools && npm install` first.
`--workdir ..` points the CLI at the repository root, where `supabase/` is.

## Deploy (the teacher, once)

1. **Region.** Dashboard → Project Settings → General: check the region. Student emails are personal data, so an
   EU region (such as Frankfurt or Ireland) is the right choice. If the project is outside the EU, create a new
   project in the EU before going on, and use its ref below.
2. **Email sending (SMTP).** The built-in email service only writes to the project's team members, so set up a
   free SMTP provider:
   - **Brevo** (300 emails/day free): verify a sender address (Senders & IP → Senders), create an SMTP key
     (SMTP & API). Dashboard → Authentication → Emails → SMTP Settings: enable custom SMTP, host
     `smtp-relay.brevo.com`, port `587`, user = your Brevo login, password = the SMTP key, sender = the verified
     address, sender name "Query for a Million".
   - **Resend** (100 emails/day free) works the same way (host `smtp.resend.com`, port `465`, user `resend`,
     password = an API key), but it needs a domain you can add DNS records to.
   - Then Authentication → Rate Limits: raise "emails sent per hour" (for example to 100). Keep it below the
     provider's daily quota (Brevo 300/day, Resend 100/day): every sign-in costs one email.
3. **The code email.** Authentication → Emails → Templates: in **Confirm signup** AND in **Magic Link**, set the
   subject to `Your code for Query for a Million / Tu código` and paste the body of `supabase/templates/otp.html`
   (it shows `{{ .Token }}`, the 6-digit code; a new student gets the first email, a returning one the second).
   Authentication → Providers → Email: enabled; **Confirm email: ON** (keep it on); email OTP length 6; OTP
   expiry 3600 s; minimum interval between emails: 60 s. Students never use a password: the site only offers the
   email code, and the function refuses any session that did not come from the code (the token's `amr` must be
   `otp`), so a password account (even one made in the dashboard) cannot play. Supabase has no switch to turn
   password sign-in off; "Confirm email" ON means a password sign-up gets no session without the mailbox anyway.
   **Bot protection:** Authentication → Attack Protection → enable CAPTCHA with **Cloudflare Turnstile** (free:
   create a widget at dash.cloudflare.com → Turnstile for the site's domain, paste its secret key in Supabase). The
   page then needs the Turnstile site key in `data/game-comp-config.js` (`captchaSiteKey`) to show the widget and
   send its token with the code request. Without CAPTCHA anyone can make the project send code emails to
   @cunef.edu addresses until the SMTP quota runs out.
4. **Log in and link the CLI.**
   ```
   cd tools
   npm install
   npx supabase login
   npx supabase link --project-ref mbumfoxhmsrlytjwuypb --workdir ..
   ```
   `link` asks for the database password (Dashboard → Project Settings → Database: reset it if unknown).
5. **The database.** `npx supabase db push --remote --workdir ..` (CLI 3 targets the local stack unless `--remote`
   is given) creates the tables, the policies, the trigger, the hook
   function and `comp_start`. It prints the migration it applies; run it again after any new migration.
6. **The function.**
   ```
   node supabase-sync.mjs
   npx supabase functions deploy comp --workdir .. --no-verify-jwt
   ```
   `supabase-sync.mjs` copies the engine (and `sql-wasm.wasm`) into `supabase/functions/_shared/`. The function
   checks the user's token itself, hence `--no-verify-jwt` (also set in `config.toml`).
7. **The auth hook (only @cunef.edu may sign up).** Dashboard → Authentication → Hooks → Add hook →
   **Before User Created** → type **Postgres** → schema `public` → function `comp_before_user_created` → enable.
   The rule (hook, function and page): the lower-cased address must match `^[a-z0-9._-]+@cunef\.edu$`, so no
   `+tag` addresses (one account per mailbox). The function applies the same rule on every call, so a missing hook
   does not open the competition, but the hook stops accounts (and code emails) for other addresses.
8. **The bank.** The private files must be on this machine (`tools/comp/private/`, or
   `COMP_KEY='…' node comp-build.mjs --decrypt`). Then:
   ```
   node comp-build.mjs
   ```
   It must end with `30 question(s) ok` for each mode. Upload with the service-role key (Dashboard → Project
   Settings → API Keys: the `service_role` key, or a new secret key `sb_secret_…`), typed in the terminal only:
   ```
   # bash
   SUPABASE_URL=https://mbumfoxhmsrlytjwuypb.supabase.co SUPABASE_SERVICE_ROLE_KEY=<key> node comp-upload.mjs
   # PowerShell
   $env:SUPABASE_URL='https://mbumfoxhmsrlytjwuypb.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='<key>'; node comp-upload.mjs
   ```
   Run the upload again after any change to the questions or texts (the function reloads within a minute).
9. **The teacher role.** Sign in once on the site (`#/game` → Competitive) with the teacher's @cunef.edu address
   (the one written in `supabase/seed-teacher.sql`), then Dashboard → SQL Editor → paste `supabase/seed-teacher.sql` → Run (it must say `UPDATE 1`).
10. **The site.** Dashboard → Project Settings → API Keys: copy the **anon public** key (Legacy API keys tab) or the
    **publishable** key (`sb_publishable_…`). Put it, with `supabaseUrl: 'https://mbumfoxhmsrlytjwuypb.supabase.co'`,
    into `data/game-comp-config.js`, then commit and push the site.
11. **Check.** `node check-no-secrets.mjs` before every commit. A quick call without a token must answer
    `{"error":{"code":"auth",…},"serverTime":…}`:
    `curl -s -X POST https://mbumfoxhmsrlytjwuypb.supabase.co/functions/v1/comp -H "Content-Type: application/json" -d "{\"op\":\"status\"}"`

During the course: a free project pauses after a week without traffic. If students see "The competition server is
not responding", restore it from the dashboard.

**The encrypted backup** (`tools/comp/solutions.enc`, committed; it holds the questions, texts, hidden seed and
dataset): `node comp-build.mjs --new-key` prints a strong random passphrase once; store it in a password manager
(it is the only way to read the backup on another machine), then `COMP_KEY='…' node comp-build.mjs --encrypt` after
every change. A passphrase of your own must have 20+ characters mixing three of: lower case, upper case, digits,
symbols.

**After the course (retention):** once grades and oral checks are closed, open `supabase/purge.sql`, set the
cut-off date on its first line and run it in the SQL Editor: it deletes the attempts and answers started before
that date and keeps the badges. Deleting a user in Authentication → Users deletes everything of that student.

**Abuse limits in the function:** one run of student SQL per user every 2 s (claimed atomically, so parallel
requests are refused), queries joining more than 3 tables in one FROM or generating too many rows are refused at no
cost, and every run is stopped after about 0.45 s or 20,000 result rows. The teacher's detail marks the indicators
the page reports (`self:no-runs`, `self:pasted`, `self:left-tab`) apart from those the server measures (`fast`,
`streak`, `no-table`, `literal-list`, `no-clause`).

## Local development (Docker)

```
cd tools
npm install
npx supabase start --workdir ..          # first time: pulls the images (several minutes)
node supabase-sync.mjs                   # the engine copies and sql-wasm.wasm
node comp-hidden.mjs                     # only when tools/comp/private/hidden-setup.sql is missing
node comp-upload.mjs --local             # the bank into the local database
node check-comp-server.mjs --e2e         # engine on both datasets + the API end to end
npx supabase stop --workdir ..           # when done
```

- API and functions: `http://127.0.0.1:54321` (the function: `http://127.0.0.1:54321/functions/v1/comp`).
- Keys: `npx supabase status --workdir ..` prints the local `ANON_KEY` (or `PUBLISHABLE_KEY`) for the page and
  the `SERVICE_ROLE_KEY` for tools; these are the CLI's fixed demo keys, never the real project's. For a local
  test of the page, put the local URL and anon key into `data/game-comp-config.js` and do not commit them.
- Emails with the codes: Mailpit at `http://127.0.0.1:54324`.
- A local teacher: sign in once, then
  `docker exec -i supabase_db_cunef-comp psql -U postgres -c "update public.profiles set role='teacher' where email='you@cunef.edu'"`.
- After editing a migration: `npx supabase db reset --local --workdir ..` (wipes the local database), then the
  upload again. After editing `config.toml`: `npx supabase stop` and `start` again.
