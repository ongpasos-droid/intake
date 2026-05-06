# GHL / centralize.es sync

Pushes newsletter subscribers to GoHighLevel (or any white-label running
on the LeadConnector backend, like centralize.es) so welcome emails, drip
campaigns and pipeline-style CRM live in GHL while the **source of truth
stays in our local `newsletter_subscribers` table**.

## Architecture

```
WP form / tool signup
     ↓
POST /v1/subscribers
     ↓
subscribers/model.js  (writes to MySQL — source of truth)
     ↓ fire-and-forget
ghl/sync.js → ghl/client.js → POST /contacts/upsert (LeadConnector v2)
     ↓
GHL contact with tags (efs:cold | efs:warm | efs:hot)
     ↓
GHL workflow → welcome email, drip, pipeline move, etc.
```

**No data leaves the local DB without GHL credentials.** If `GHL_API_KEY`
or `GHL_LOCATION_ID` is missing, every sync call returns
`{ skipped: true }` and logs nothing — the app behaves identically.

## Setup (one time, ~10 minutes)

### 1. Get your Location ID

Open your centralize.es / GHL sub-account in a browser. The URL contains it:

```
https://app.centralize.es/v2/location/<LOCATION_ID>/dashboard
                                       ^^^^^^^^^^^^^
```

### 2. Get a Private Integration token

Inside your sub-account:

```
Settings → Business Profile → Private Integrations
           (or Settings → API Keys, depending on plan)
→ "Create Private Integration"
→ Scopes needed (minimum):
    - View / Edit Contacts
    - View / Edit Tags
    - View / Edit Workflows  (optional, for triggering)
→ Copy the token (shown only once)
```

If centralize.es has the option hidden, contact their support — most
white-labels enable it on request, often free.

### 3. Fill `.env`

```
GHL_API_KEY=<your private integration token>
GHL_LOCATION_ID=<the id from the URL>
```

(`GHL_API_BASE` defaults to the official LeadConnector endpoint, which
white-labels share — leave it commented unless your provider says
otherwise.)

### 4. Restart Node

```
node server.js
```

That's it. Next time someone subscribes via the WP form, you'll see in
the server log:

```
[GHL] synced foo@bar.com → cold (new contact)
```

And the contact will appear in your GHL panel with tag `efs:cold`.

## Tag taxonomy

All tags are prefixed with `efs:` to avoid collisions with other
projects / locations:

| Tag | Meaning |
|---|---|
| `efs:cold` | Signed up via WP newsletter form / blog |
| `efs:warm` | Signed in to the tool (account exists) |
| `efs:hot`  | Created at least one real (non-sandbox) project |
| `efs:source-blog_post` | Lead origin (varies: `blog_home`, `wp`, `tool_signup`, …) |

Promotion is **monotonic**: cold → warm → hot. Never demoted.

## Setting up GHL workflows (UI work, no code)

Once contacts arrive with tags, in the GHL panel you can:

1. **Welcome email on cold:** Automation → Workflow → Trigger "Tag Added:
   `efs:cold`" → Action "Send Email" with your welcome template.
2. **Drip on warm:** Trigger "Tag Added: `efs:warm`" → wait 2 days → send
   "How's the sandbox going?" email.
3. **Pipeline move on hot:** Trigger "Tag Added: `efs:hot`" → Action
   "Create Opportunity" in the "Active proposal" stage.
4. **Newsletter (manual or scheduled):** Marketing → Email Campaigns →
   Audience filter "Tag is `efs:cold` OR `efs:warm` OR `efs:hot`".

## Troubleshooting

- **"GHL not configured" in logs:** Check the two env vars are set, restart Node.
- **HTTP 401:** Token expired or wrong. Regenerate.
- **HTTP 422:** Usually a malformed payload — check `console.warn` for the body.
- **Contact appears but no tag:** Token scope missing "Edit Tags". Regenerate with the right scope.
- **Want to disable temporarily:** set `GHL_DISABLED=true` in `.env` and restart.

## Migrating from centralize.es to official GHL

When Oscar moves to the official GHL plan:

1. Create a new Location in the official GHL account.
2. Generate a new Private Integration token there.
3. Replace `GHL_API_KEY` and `GHL_LOCATION_ID` in `.env`.
4. Restart Node.

That's the full migration. **No code changes** — both run the same backend.
