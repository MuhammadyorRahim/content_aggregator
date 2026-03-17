# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please use [GitHub Security Advisories](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) to report it privately (Repository → Security → Advisories → "Report a vulnerability"). Do **not** open a public issue, as that would expose the vulnerability before it can be fixed.

---

## Sensitive Environment Variables

The following environment variables contain secret values and **must never be committed to source control**. All `.env*` files are excluded by `.gitignore`.

| Variable | Description | Required |
|---|---|---|
| `AUTH_SECRET` | Secret used to sign Auth.js sessions. Generate with `openssl rand -base64 32`. | ✅ Yes |
| `AUTH_URL` | Public URL of the app (e.g. `https://yourdomain.com`). Used by Auth.js for redirects. | ✅ Yes |
| `DATABASE_URL` | Path to the SQLite database file (e.g. `file:./data.db`). | ✅ Yes |
| `STRIPE_SECRET_KEY` | Stripe server-side secret key (`sk_live_…` or `sk_test_…`). | Optional |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) for verifying webhook events. | Optional |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key exposed to the browser. Do **not** confuse with the secret key. | Optional |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for the Pro plan. | Optional |
| `RESEND_API_KEY` | API key for the Resend email service (`re_…`). | Optional |
| `RESEND_FROM_EMAIL` | Sender address for transactional emails. | Optional |
| `YOUTUBE_API_KEY` | Google/YouTube Data API v3 key. | Optional |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID for Google sign-in. | Optional |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret for Google sign-in. | Optional |
| `TWITTER_AUTH_TOKEN` | Auth token for X/Twitter cookie-based authentication via RSSHub. | Optional |

---

## What Is NOT a Secret

| Item | Notes |
|---|---|
| `RSSHUB_BASE_URL` | URL of your local RSSHub Docker container (typically `http://localhost:1200`). Not a secret — it is an internal service address. |
| `REGISTRATION_MODE` | Controls sign-up behaviour (`open` / `invite-only` / `closed`). Not a secret. |
| `CACHE_DURATION_*_MINUTES` | Worker tuning values. Not a secret. |

---

## No Hardcoded Secrets

The codebase contains **no hardcoded API keys, tokens, passwords, or third-party service addresses**. All sensitive values are read exclusively from environment variables at runtime:

- `AUTH_SECRET` → `src/lib/auth-middleware.ts`
- `STRIPE_SECRET_KEY` → `src/lib/stripe.ts`
- `STRIPE_WEBHOOK_SECRET` → `src/app/api/billing/webhook/route.ts`
- `RESEND_API_KEY` → `src/lib/email.ts`
- `YOUTUBE_API_KEY` → `src/lib/fetchers/youtube.ts`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` → `src/lib/auth.ts`
- `TWITTER_AUTH_TOKEN` / `RSSHUB_BASE_URL` → `src/lib/fetchers/x.ts`

---

## Setting Up Secrets Safely

1. Copy the example file and fill in real values on your server only:
   ```bash
   cp deploy/.env.production.example /app/.env.local
   # Edit /app/.env.local with your actual secrets — never commit this file
   ```

2. For local development, create `.env.local` at the project root:
   ```bash
   cp deploy/.env.production.example .env.local
   # .env.local is ignored by git via the .env* rule in .gitignore
   ```

3. Rotate `AUTH_SECRET` immediately if it is ever accidentally exposed:
   ```bash
   openssl rand -base64 32
   ```
   > **Note:** Changing `AUTH_SECRET` invalidates all existing user sessions. Every logged-in user will be signed out and will need to log in again.

---

## .gitignore Coverage

The `.gitignore` at the project root includes `.env*`, which prevents any file whose name starts with `.env` from being committed, including `.env`, `.env.local`, `.env.production`, etc.
