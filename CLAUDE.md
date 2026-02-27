# Content Aggregator

## Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS + shadcn/ui
- Prisma + SQLite
- Auth.js (credentials + database sessions)
- TanStack Query
- Stripe + Resend
- Background worker with `node-cron`

## Architecture Rules
- Sources are global (`Source`), user subscriptions are per-user (`UserSource`).
- Posts are global (`Post`), per-user read/save state is in `UserPostState`.
- Hidden/deleted posts are user-scoped in `BlockedPost`.
- Schedule is Pro-only and user-scoped (`ScheduledEvent`).
- Every protected query must be scoped by `userId`.
- `UserPostState` is lazy: no row means unread/unsaved.
- Worker fetches shared sources, users read from DB only.

## Plan Limits
- Free: max 5 sources, search lookback 30 days, manual refresh 5/hour.
- Pro: unlimited sources, full-history search, manual refresh 20/hour.
- Central enforcement is in `src/lib/plan-limits.ts`.

## Registration Modes
- `REGISTRATION_MODE=open` allows normal signup.
- `REGISTRATION_MODE=invite-only` requires valid invite code.
- `REGISTRATION_MODE=closed` disables signup.

## Key Paths
- API routes: `src/app/api/**`
- Fetchers: `src/lib/fetchers/**`
- Worker: `src/worker.ts`
- Deploy files: `deploy/`
- Tests: `tests/`

## Common Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Worker (local): `npm run worker`
- Prepare test DB: `npm run test:prepare`
- Run tests: `npm test`

## Deployment Notes
- Use `deploy/deploy.sh` for pull/install/migrate/build/restart.
- Use `deploy/backup.sh` with cron for daily SQLite backups.
- RSSHub runs via `deploy/docker-compose.yml`.
- Reverse proxy template is in `deploy/nginx.conf`.
