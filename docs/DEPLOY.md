# Deploy and setup

Life Hub is now a standalone installable web app (PWA) on Supabase. The claude.ai artifact still works separately.

## What exists
- Supabase project **Life Hub** (`fclhcizewxiiwqbyfnmo`, ca-central-1): `docs` table, private `files` bucket, `claude` edge function. Schema is in `supabase/migrations`.
- Row-level security: each user sees only their own rows and files.
- Sign-ups are closed by a trigger on `auth.users` (`private.block_signups`). To add a person later, drop the trigger, create the user, then recreate it. Run `drop trigger block_signups on auth.users;` and recreate it from the `close_signups` migration.
- Login: Melissa's user was created with a confirmed email and no password. Sign in with "Email me a sign-in link".

## Still to do by hand
1. Edge Functions > Secrets: add `ANTHROPIC_API_KEY`. The Claude buttons fail until it is set.
2. Hosting: in GitHub, Settings > Pages > Source = "GitHub Actions", then merge to `main`. The workflow in `.github/workflows/pages.yml` publishes `app/`.
3. Supabase Authentication > URL Configuration: set Site URL and add a Redirect URL for the live address. The emailed link goes there.
4. Download a backup from the claude.ai hub and use Backup > Import backup file in the new app. Uploaded files are not in the backup.
