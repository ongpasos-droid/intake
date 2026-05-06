# Coolify environment variables

Variables that the application reads from `process.env` at runtime. Configure these in Coolify → app → Environment Variables before redeploying after a MERGE that touches auth/email/Google.

> ⚠️ **Set `is_build_time: false`** for all of these (they're runtime, not build-time). The Coolify API expects this; setting it to `true` causes the value to be missing in production. (See `reference_coolify_api.md` in memory.)

## Required for transactional email (Resend)

| Variable | Example | Notes |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | From resend.com → API keys. The key is the secret — copy directly into Coolify (do not commit). |
| `EMAIL_FROM` | `noreply@eufundingschool.com` | Must match a verified domain at Resend. Until verified, use `onboarding@resend.dev` (sends only to the Resend account email). |
| `EMAIL_FROM_NAME` | `EU Funding School` | Display name shown to recipients. Optional; defaults to "EU Funding School". |
| `APP_URL` | `https://intake.eufundingschool.com` | Base URL used to build verification + reset links. **Must NOT have trailing slash.** Local dev uses `http://localhost:3000`. |

## Required for Google Sign-In

| Variable | Example | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `123...abc.apps.googleusercontent.com` | From Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs. Web application type. Must list `https://intake.eufundingschool.com` as Authorized JavaScript origin. |

If `GOOGLE_CLIENT_ID` is empty or missing, the frontend hides the "Continue with Google" block (the `loadConfig()` function in `public/js/app.js` checks this and toggles `#google-btn-container` accordingly).

## Already configured (do not remove)

These are existing and should stay:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`, `AI_MODEL`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `GHL_API_KEY`, `GHL_LOCATION_ID`, `GHL_API_BASE`
- `NODE_ENV=production`

## Promoting a user to admin / scribe in production

After a user signs up and verifies their email, promote them with SQL:

```sql
-- Full admin (all data + documents + subscribers + research)
UPDATE users SET role='admin' WHERE email IN ('person1@example.com');

-- Scribe (only Admin → Data E+: calls, eligibility, eval, forms, entities, per diems, workers, countries)
UPDATE users SET role='scribe' WHERE email IN ('escriba1@example.com');
```

Run from the production MySQL container (`wordpress-eufunding-db-1`).
