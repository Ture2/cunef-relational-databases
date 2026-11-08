'use strict';
/* Query for a Million, competitive side: where the competition server is (docs/game-quiz.md §15).
   - supabaseUrl: the Supabase project (the teacher's, mbumfoxhmsrlytjwuypb).
   - anonKey: the project's anon (public) key. It is public by design: it only lets the page call the `comp`
     function and sign students in (Row Level Security denies everything else). Empty until the teacher pastes it
     (Dashboard → Project Settings → API Keys): until then Competitive says "The competition is not set up yet".
   - limitMinutes, dailyAttempts: shown before the server answers (the server's own limits are the ones that count).
   - captchaSiteKey: the Cloudflare Turnstile site key when the hosted project requires a CAPTCHA at sign-in
     (supabase/README-deploy.md); empty = no widget (local and dev). */
const GAME_COMP_CONFIG = {
  supabaseUrl: 'https://mbumfoxhmsrlytjwuypb.supabase.co',
  anonKey: 'sb_publishable_ggigH7Jz6Aded1Pq9rffjw_R7XN2vAk',
  limitMinutes: 60,
  dailyAttempts: 3,
  captchaSiteKey: '',
};
if (typeof module !== 'undefined') module.exports = GAME_COMP_CONFIG;
