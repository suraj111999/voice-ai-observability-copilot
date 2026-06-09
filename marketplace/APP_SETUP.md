# Marketplace App Configuration

Use this when submitting the observability dashboard as a GHL Marketplace app.

## App metadata

| Field | Value |
|-------|-------|
| Name | Voice AI Observability Copilot |
| Category | Analytics / AI |
| Distribution | Sub-account (or Agency + Sub-account) |
| Type | Custom JS + Custom Page |

## Custom Page (dashboard embed)

**Module:** Custom Pages → Add Page

```
Title:    Voice AI Observability
URL:      https://YOUR_DOMAIN/?location_id={{location.id}}&embedded=ghl
Placement: Left navigation menu
```

HighLevel replaces `{{location.id}}` with the active sub-account ID. The Vue app reads this from the query string.

## Webhook (transcript ingestion)

Configure in your app settings OR via sub-account workflow:

```
POST https://YOUR_API_DOMAIN/webhooks/ghl/transcript
```

## OAuth scopes (if using full Marketplace OAuth)

Minimum recommended scopes:

- `voice-ai.readonly` / Voice AI read
- `locations.readonly`
- `conversations.readonly` (transcription fallback)

For assignment speed, **Private Integration** in the sandbox is simpler than full OAuth.

## Custom JS (optional supplement)

Upload `widget/embed.js` as agency Custom JS if you need script injection beyond Custom Page.

## Testing flow

1. Create app in developer portal
2. Open **Testing** tab → install on sandbox sub-account
3. Custom Page appears in left nav
4. Create workflow webhook → place test call
5. Refresh dashboard → real transcript analyzed

## iframe hosting requirements

Your deployed frontend must:

- Serve over **HTTPS**
- Allow embedding from `app.gohighlevel.com` and `app.leadconnectorhq.com`
- Not send `X-Frame-Options: DENY`

This repo's `frontend/vite.config.js` is configured for preview builds accordingly.
