# Content Aggregator — Complete Architecture Plan (Multi-User)

## 1. Project Overview

A multi-user content aggregator that fetches full content from specified sources (X/Twitter, YouTube, Substack, Telegram, websites) and displays them in a unified, minimalistic feed. Sources are shared globally (fetched once, available to all subscribers). A background worker fetches content every 15 minutes. Users subscribe to sources and have their own read states, bookmarks, schedules, and preferences. Deployed on a DigitalOcean Droplet.

### Core Principles
- **Modular:** Each fetcher, component, and feature is independent — changing one must not break others
- **Content-first:** Full content displayed inline, not just links or headlines
- **Minimalistic:** Attract attention but never distract focus
- **Shared sources:** Global sources fetched once, per-user state (read/saved/blocked/scheduled)
- **Privacy:** Users never see each other's data (subscriptions, read states, saves, blocked posts)

### Tech Stack
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** SQLite via Prisma ORM (migrate to PostgreSQL at ~50 users)
- **Authentication:** Auth.js (NextAuth.js v5) with database sessions
- **State Management:** TanStack Query (server data) + useState (UI state)
- **Content Fetching:** rss-parser, cheerio, @mozilla/readability, YouTube Data API v3
- **Background Worker:** node-cron (separate PM2 process)
- **Payments:** Stripe (checkout, webhooks, customer portal)
- **Email:** Resend (verification, password reset)
- **Security:** sanitize-html, Zod, bcrypt, CSRF protection
- **Deployment:** DigitalOcean Droplet (Ubuntu + Node.js + PM2 + Nginx + Docker)

---

## 2. Features

### 2.1 Core Feed
- Type-specific cards (Tweet, YouTube, Article, Telegram — each with its own component)
- Smart preview: short content (< 280 chars) shown fully, longer content shows 150-char preview + "Read More"
- "Read More" on short/medium content expands inline; on long articles opens a **reading modal** with clean typography
- Infinite scroll (20 posts per load via `useInfiniteQuery`)
- Auto-mark-as-read: post 50% visible in viewport + 3 seconds + tab focused + user has interacted with page
- Auto-mark batched: collect newly-read post IDs, send one `POST /api/posts/batch-read` every 5 seconds
- Manual mark as read/unread via hover menu
- Mark all as read (global or per-source)
- Unread count badges (per source in sidebar + global count in browser tab title)
- "New posts available" banner at top of feed after new content detected
- Save/Bookmark posts + dedicated `/saved` page
- Schedule posts for later + dedicated `/schedule` page (full CRUD + overdue handling)
- Permanently delete posts (confirmation dialog + per-user blocklist prevents re-import)
- Search across user's subscribed posts only (SQLite FTS5 full-text search)
- Sort: newest first by `publishedAt` (default, no other sort options in V1)

### 2.2 Content Display Per Type

**Tweet Card:**
```
┌──────────────────────────────────────────────────┐
│ [X icon] @karpathy  •  2h ago            [🔖][…]│
│                                                   │
│  Full tweet text displayed here                   │
│  [image if exists]                                │
│                                                   │
│  Category: AI & ML                                │
└──────────────────────────────────────────────────┘
```

**YouTube Card:**
```
┌──────────────────────────────────────────────────┐
│ [YT icon] Darkesh Podcast  •  5h ago     [🔖][…]│
│                                                   │
│  ┌──────────────────────────────────────────┐    │
│  │          ▶  YouTube Player (iframe)      │    │
│  │        (streams from YouTube, no download)│    │
│  └──────────────────────────────────────────┘    │
│  Video Title Here                                 │
│  12:34  •  1.2M views                            │
│  First 150 chars of description...  [Read more]   │
│                                                   │
│  Category: AI & ML                                │
└──────────────────────────────────────────────────┘
```

**Article Card (Substack/Website):**
```
┌──────────────────────────────────────────────────┐
│ [Substack icon] Newsletter Name  •  1d ago[🔖][…]│
│                                                   │
│  Article Title (large)                            │
│  First 2 sentences of the article text here...    │
│                                    [Read more]    │
│  [hero image if exists]                           │
│                                                   │
│  Category: Programming                            │
└──────────────────────────────────────────────────┘
```
"Read more" on articles opens a **reading modal** (full-screen overlay with focused typography).

**Telegram Card:**
```
┌──────────────────────────────────────────────────┐
│ [TG icon] Channel Name  •  3h ago        [🔖][…]│
│                                                   │
│  Full message text (if short)                     │
│  Or preview + [Read more] if long                 │
│  [media if exists]                                │
│                                                   │
│  Category: Tech News                              │
└──────────────────────────────────────────────────┘
```

### 2.3 Post Actions (Clean, Not Cluttered)
- **Always visible:** Unread indicator (left border color), Bookmark icon (top right)
- **On hover / "..." menu:** Schedule for later, Open original link, Mark as read/unread toggle, Delete permanently
- **Inline:** "Read more" button (only on long content)

### 2.4 Filtering
- **Filter bar at top of feed** (NOT in sidebar): `[All Platforms ▼] [All Categories ▼] [All Profiles ▼] [🔍 Search...]`
- Filter by platform type: X, YouTube, Substack, Telegram, Website
- Filter by auto-detected category: AI & ML, Programming, Tech News, Science, Opinion, Uncategorized
- Filter by specific profile: dropdown grouped by platform (shows only current user's subscribed sources)
- All filters combine (AND logic)
- Category counts are per-user (only count posts from user's subscribed sources)

### 2.5 Sources Management (`/sources` page)
- **Subscribe to source:** Type dropdown + URL input → URL normalized → check if global source exists → if yes, subscribe user; if no, create global source + subscribe → validation test fetch → show "Fetched X posts (oldest: date)" notice
- **Edit subscription:** Update custom name, mute/unmute. Users CANNOT edit global source URL (admin only).
- **Unsubscribe:** Confirmation dialog → removes UserSource subscription only. Global source + posts remain for other users. If zero subscribers remain, worker auto-skips that source.
- **Mute source:** Duration picker (1 day / 1 week / 1 month / custom date) → stops NEW fetches for this user, old posts stay visible → auto-resumes when `mutedUntil` expires
- **Source status indicators:** 🟢 Fresh (fetched successfully), 🟡 Stale (showing cached, fetch failed), 🔴 Unavailable (no data, never fetched successfully). These are global per-source (same for all subscribers).

### 2.6 Schedule Feature (`/schedule` page)
- "Schedule" button on any post → date/time picker → creates per-user event
- `/schedule` page shows upcoming + overdue events sorted by date
- Overdue events stay visible until user marks the post as read or cancels the event
- Full CRUD: create, view, reschedule (change date/time), cancel (delete event)
- Pro plan only (free users see "Upgrade to Pro" prompt)
- V1.5: Google Calendar sync (one-way push, requires Google OAuth)

### 2.7 Authentication & User Management
- **Registration:** Email + password → email verification required before login
- **Login:** Email + password → database session (30-day rolling, extends on activity)
- **Password reset:** Forgot password → email with reset token (1 hour expiry) → new password → all sessions invalidated
- **Password policy:** Min 8 chars, max 128, at least 1 letter + 1 number, hashed with bcrypt (12 rounds)
- **Brute force protection:** 5 failed login attempts → account locked for 15 minutes
- **Session management:** 30-day rolling sessions, password change invalidates all sessions, admin can force-logout users
- **Account settings:** Change name, email (re-verification), password, timezone, theme preference
- **Account deletion:** User can delete account → removes all user-specific data (subscriptions, states, events, blocks, sessions). Global sources/posts remain.
- **Data export:** Download all personal data as JSON (GDPR compliance)
- **OAuth (V1.5):** "Sign in with Google" via Auth.js
- **Registration control:** ENV flag `REGISTRATION_MODE` = "open" | "invite-only" | "closed"

### 2.8 Payment & Subscription Tiers

| Feature | Free | Pro |
|---|---|---|
| Max sources | 5 | Unlimited |
| Fetch frequency | Every 30 min | Every 15 min |
| Search | Last 30 days | Full history |
| Schedule feature | No | Yes |
| Google Calendar sync | No | Yes |
| Price | $0 | $X/month |

- Stripe Checkout for payment page (never handle card data)
- Stripe Webhooks for payment events (success, failure, cancellation)
- Stripe Customer Portal for subscription management
- Grace period on failed payment (don't immediately downgrade)
- Cancellation: Pro features remain until end of billing period

### 2.9 Admin Dashboard (`/admin` — admin role only)
- View all users (list with stats: source count, post count, last active, plan)
- Enable/disable users
- Manage global sources (view all, edit URL, disable broken ones, force re-fetch)
- View worker status (running, last run time, errors, source fetch results)
- View system health (DB size, total posts, disk space, active users)

### 2.10 Design & UX
- **Typography:** 2 fonts max (Inter for both headings and body), 16px minimum body, 1.6 line-height
- **Colors:** 3 max — background (white/dark), text (gray-900/gray-100), accent (blue-500)
- **Whitespace:** Generous padding and gap, let content breathe
- **No animations except:** loading skeletons, hover transitions, read-more expand, page transition bar
- **Dark/Light mode:** Tailwind `dark:` classes + `prefers-color-scheme` detection + manual toggle. Preference stored in User.theme (DB) when logged in.
- **Smooth page transitions:** next-nprogress-bar (thin loading bar at top during navigation)
- **Sidebar navigation:** Feed (with unread count), Saved, Schedule, Sources
- **Empty state:** Welcome message + "Add your first source" button for new users after registration
- **Loading:** Skeleton loaders for initial load, keep old content visible during refresh
- **Mobile:** Sidebar collapses to hamburger menu, full-width cards, touch-friendly tap targets
- **Landing page:** Root `/` shows marketing page when not logged in, feed when logged in

### 2.11 Legal Pages
- `/terms` — Terms of Service (required for Stripe)
- `/privacy` — Privacy Policy (required for GDPR + Stripe)

### 2.12 Future Features
- **V1.5:** Google Calendar sync (OAuth + one-way event push)
- **V1.5:** OAuth login (Sign in with Google)
- **V2:** Keyboard shortcuts (J/K navigate, R mark read, S save, F expand, / search)
- **V2:** Thread detection for X (group connected tweets)
- **V2:** Bulk actions (select multiple posts → mark read / save / delete)
- **V2:** Data export as CSV
- **V2:** Puppeteer for JS-rendered websites (requires Droplet upgrade)
- **V2:** AI categorization via Claude API (replace keyword-based)
- **V2:** Email digest (weekly summary of unread content)
- **V2:** Browser push notifications for scheduled events

---

## 3. Database Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./data.db"
}

// ============ AUTH MODELS ============

model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  emailVerified       DateTime?
  passwordHash        String
  name                String?
  timezone            String    @default("UTC")
  theme               String    @default("system") // "light" | "dark" | "system"
  role                String    @default("user")   // "user" | "admin"
  plan                String    @default("free")   // "free" | "pro"
  stripeCustomerId    String?   @unique
  failedLoginAttempts Int       @default(0)
  lockedUntil         DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  sessions        Session[]
  accounts        Account[]
  userSources     UserSource[]
  userPostStates  UserPostState[]
  scheduledEvents ScheduledEvent[]
  blockedPosts    BlockedPost[]
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionToken String   @unique
  expires      DateTime

  @@index([userId])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())
}

model InviteCode {
  id        String    @id @default(cuid())
  code      String    @unique
  createdBy String    // admin userId
  usedBy    String?   // userId who redeemed it
  usedAt    DateTime?
  expiresAt DateTime?
  createdAt DateTime  @default(now())
}

// ============ CONTENT MODELS (GLOBAL) ============

model Source {
  id              String   @id @default(cuid())
  type            String   // "x" | "youtube" | "substack" | "telegram" | "website"
  url             String   // original URL as entered
  normalizedUrl   String   @unique // canonical form for dedup (e.g., "x:karpathy")
  name            String   // default name (fetched from profile or entered by first subscriber)
  config          String?  // JSON string for extra config
  enabled         Boolean  @default(true)
  lastFetchedAt   DateTime?
  lastFetchStatus String   @default("never") // "success" | "failed" | "never"
  createdAt       DateTime @default(now())

  posts       Post[]
  userSources UserSource[]
  cacheEntry  CacheEntry?
}

model Post {
  id          String   @id @default(cuid())
  sourceId    String
  source      Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  externalId  String?  // original post ID from the platform (for dedup)
  title       String?
  content     String   // full text/HTML content (sanitized, max ~50KB)
  author      String?
  url         String?  // link back to original
  imageUrl    String?  // thumbnail or main image URL (not downloaded)
  mediaType   String?  // "text" | "video" | "image" | "article"
  category    String?  // auto-detected via keyword categorizer
  metadata    String?  // JSON — platform-specific data (duration, views, likes, etc.)
  publishedAt DateTime // always stored as UTC
  fetchedAt   DateTime @default(now())

  userPostStates  UserPostState[]
  scheduledEvents ScheduledEvent[]

  @@unique([sourceId, externalId])
  @@index([publishedAt])
  @@index([category])
  @@index([sourceId])
}

// ============ PER-USER MODELS ============

model UserSource {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceId   String
  source     Source    @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  customName String?   // user's own name for this source (overrides Source.name)
  mutedUntil DateTime? // null = active, future date = muted
  createdAt  DateTime  @default(now())

  @@unique([userId, sourceId])
  @@index([userId])
  @@index([sourceId])
}

// LAZY CREATION: rows only created when user interacts (reads/saves).
// No row = unread + unsaved. Query with LEFT JOIN + COALESCE.
model UserPostState {
  id      String    @id @default(cuid())
  userId  String
  user    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId  String
  post    Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  isRead  Boolean   @default(false)
  isSaved Boolean   @default(false)
  readAt  DateTime?
  savedAt DateTime?

  @@unique([userId, postId])
  @@index([userId])
  @@index([postId])
  @@index([userId, isRead])
  @@index([userId, isSaved])
}

model ScheduledEvent {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId        String
  post          Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  title         String   // e.g., "Watch Darkesh podcast"
  scheduledAt   DateTime
  googleEventId String?  // for Google Calendar sync (V1.5)
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([userId, scheduledAt])
}

model BlockedPost {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceId   String
  externalId String   // prevents re-import for this user after permanent delete
  deletedAt  DateTime @default(now())

  @@unique([userId, sourceId, externalId])
  @@index([userId])
}

// ============ SYSTEM MODELS ============

model CacheEntry {
  id        String   @id @default(cuid())
  sourceId  String   @unique
  source    Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  fetchedAt DateTime
  expiresAt DateTime
}

model WorkerLock {
  id       String   @id // "fetch-worker"
  lockedAt DateTime
}
```

**FTS5 Search Index** (raw SQL — the ONLY raw SQL in the project):
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(title, content, content=Post, content_rowid=rowid);
```
When migrating to PostgreSQL, replace with `tsvector`. Documented migration point.

**Key data model rules:**
- Source and Post are **global** (shared across all users)
- UserSource, UserPostState, ScheduledEvent, BlockedPost are **per-user**
- UserPostState uses **lazy creation**: rows only created when user interacts. No row = unread + unsaved
- Feed query: `Post JOIN UserSource (for subscription) LEFT JOIN UserPostState (for read/saved state) LEFT JOIN BlockedPost (to exclude deleted)`
- `isRead`/`isSaved` are NOT on the Post table — they live in UserPostState

---

## 4. API Design

### 4.1 Standard Response Envelope

```typescript
type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    page: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
};
```

### 4.2 Route Access Control

| Route | Access |
|---|---|
| `/`, `/pricing`, `/terms`, `/privacy` | Public |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Public (redirect to feed if logged in) |
| `/` (feed), `/saved`, `/schedule`, `/sources`, `/settings` | **Protected** (must be logged in) |
| `/admin` | **Protected + admin role** |
| `POST /api/auth/*` (register, login, forgot, reset) | Public |
| `POST /api/billing/webhook` | Public (verified by Stripe signature) |
| `GET /api/health` | **Admin only** |
| All other `/api/*` | **Protected** |

### 4.3 Auth Endpoints

```
POST   /api/auth/register        → create account { email, password, name, inviteCode? }
POST   /api/auth/login           → create session { email, password }
POST   /api/auth/logout          → destroy current session
POST   /api/auth/forgot-password → send reset email { email }
POST   /api/auth/reset-password  → reset password { token, newPassword }
GET    /api/auth/verify-email    → verify email ?token=xxx
GET    /api/auth/me              → current user profile
PATCH  /api/auth/me              → update profile { name?, email?, timezone?, theme? }
PATCH  /api/auth/password        → change password { currentPassword, newPassword }
DELETE /api/auth/me              → delete account (confirmation required)
GET    /api/auth/export          → download all personal data as JSON
```

### 4.4 Source Endpoints (User = Subscription, Admin = Global)

**User endpoints (operate on UserSource subscriptions):**
```
GET    /api/sources              → list MY subscriptions (UserSource + Source info + unread counts)
POST   /api/sources              → subscribe to source { type, url, name? }
                                    (creates global Source if new, normalizes URL)
PATCH  /api/sources/[sourceId]   → update MY subscription { customName?, mutedUntil? }
DELETE /api/sources/[sourceId]   → unsubscribe (remove UserSource, keep global Source)
```

**Admin endpoints (operate on global Sources):**
```
GET    /api/admin/sources              → list ALL global sources with subscriber counts
PATCH  /api/admin/sources/[id]         → edit global source { url?, name?, enabled? }
POST   /api/admin/sources/[id]/fetch   → force re-fetch a specific source
```

### 4.5 Post Endpoints (All Per-User Scoped)

```
GET    /api/posts                → list posts from MY subscribed sources
  ?cursor=lastPostId            → cursor-based pagination for infinite scroll
  ?limit=20                     → posts per page
  ?category=AI%20%26%20ML       → filter by category
  ?isRead=false                 → filter by read status (via UserPostState)
  ?isSaved=true                 → filter saved posts (via UserPostState)
  ?sourceId=xxx                 → filter by specific source
  ?sourceType=x                 → filter by platform type

PATCH  /api/posts/[id]          → update MY post state { isRead?, isSaved? }
                                   (creates UserPostState if doesn't exist — lazy creation)
DELETE /api/posts/[id]          → add to MY BlockedPost list (post hidden for me only)
POST   /api/posts/mark-all-read → mark all MY posts as read (optional: ?sourceId=xxx)
POST   /api/posts/batch-read    → batch mark as read { postIds: [...] }
```

**Feed query logic (pseudocode):**
```sql
SELECT
  p.*,
  COALESCE(ups.isRead, false) as isRead,
  COALESCE(ups.isSaved, false) as isSaved,
  us.customName as sourceCustomName
FROM Post p
JOIN UserSource us ON us.sourceId = p.sourceId AND us.userId = :userId
LEFT JOIN UserPostState ups ON ups.postId = p.id AND ups.userId = :userId
LEFT JOIN BlockedPost bp ON bp.sourceId = p.sourceId
  AND bp.externalId = p.externalId AND bp.userId = :userId
WHERE bp.id IS NULL
  AND (us.mutedUntil IS NULL OR us.mutedUntil < NOW())
ORDER BY p.publishedAt DESC
```

### 4.6 Schedule Endpoints (Per-User, Pro Plan Only)

```
GET    /api/schedule             → list MY events (upcoming + overdue)
POST   /api/schedule             → create event { postId, title, scheduledAt }
PATCH  /api/schedule/[id]        → reschedule MY event { scheduledAt }
DELETE /api/schedule/[id]        → cancel MY event
```
Returns 403 if user is on free plan.

### 4.7 Other Endpoints

```
POST   /api/fetch                → trigger background fetch (admin or manual refresh)
GET    /api/categories           → MY categories with counts (scoped to my subscriptions)
GET    /api/search?q=keyword     → search MY subscribed posts via FTS5
GET    /api/health               → system health (admin only)
```

### 4.8 Billing Endpoints

```
POST   /api/billing/checkout     → create Stripe checkout session → redirect to Stripe
POST   /api/billing/webhook      → Stripe webhook (verify signature, update user plan)
POST   /api/billing/portal       → create Stripe customer portal session → redirect
```

### 4.9 Admin Endpoints

```
GET    /api/admin/users              → list all users with stats
PATCH  /api/admin/users/[id]         → enable/disable user { enabled }
GET    /api/admin/sources            → list all global sources
PATCH  /api/admin/sources/[id]       → edit global source
POST   /api/admin/sources/[id]/fetch → force re-fetch source
GET    /api/admin/worker-status      → worker health info
POST   /api/admin/invite-codes       → generate invite code (for invite-only mode)
```

### 4.10 Input Validation (Zod)

```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
    .regex(/[a-zA-Z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  name: z.string().min(1).max(100),
  inviteCode: z.string().optional(),
});

const addSourceSchema = z.object({
  type: z.enum(["x", "youtube", "substack", "telegram", "website"]),
  url: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
});

const updatePostStateSchema = z.object({
  isRead: z.boolean().optional(),
  isSaved: z.boolean().optional(),
});
```

### 4.11 Rate Limiting

| Context | Limit |
|---|---|
| Authenticated requests | 60/min per user |
| Unauthenticated requests | 10/min per IP |
| Login endpoint | 5 attempts per email per 15 min |
| Registration endpoint | 3/hour per IP |
| Manual refresh | Free: 5/hour, Pro: 20/hour |

### 4.12 CSRF Protection
- Database sessions with `SameSite=Strict` cookies
- Origin header verification on all mutation endpoints (POST/PATCH/DELETE)
- Auth.js built-in CSRF for auth routes

---

## 5. Background Worker

### 5.1 Why Background Worker (Not Fetch-on-Page-Load)

50 users × 10 sources each = potentially 500 fetches on page load. APIs would be hammered and page load would be 30+ seconds. Instead:

- Background worker runs every 15 minutes (or 30 min for free-tier sources)
- Worker fetches ALL active global sources once
- Users always read from database (fast page loads)
- Content is always reasonably fresh (max 15-30 min old)

### 5.2 Worker Logic

```
Every 15 minutes (via node-cron):

1. Acquire lock (check WorkerLock — if locked < 30 min ago, skip this cycle)
2. Get all sources with at least one active subscriber:
   SELECT DISTINCT s.* FROM Source s
   JOIN UserSource us ON us.sourceId = s.id
   WHERE s.enabled = true
3. For each source, check CacheEntry:
   - Pro subscribers exist AND cache > 15 min old → fetch
   - Only free subscribers AND cache > 30 min old → fetch
   - Otherwise → skip
4. Fetch all stale sources in PARALLEL (Promise.allSettled, 10s timeout each, 1 retry)
5. For each result:
   - Success → process pipeline → store posts (skipDuplicates) → update CacheEntry → status = success
   - Failure → log error → update lastFetchStatus = "failed"
6. Release lock
7. Log summary: "Fetched 8/10 sources, 23 new posts, 2 failed"
```

### 5.3 Content Processing Pipeline (runs inside worker)

```
Fetcher returns raw FetchedPost[]
  → Filter: remove posts with publishedAt < CONTENT_START_DATE (2026-02-20)
  → Normalize: convert all publishedAt to UTC
  → Sanitize: run content through sanitize-html
  → Truncate: if content > 50KB, truncate with "[Content truncated]"
  → Categorize: run through keyword categorizer
  → Store: prisma.post.createMany({ data: posts, skipDuplicates: true })
  → Update CacheEntry
```

Note: BlockedPost filtering happens at QUERY time (per-user), not at storage time.

### 5.4 Worker Process

Runs as separate PM2 process:
```bash
pm2 start dist/worker.js --name "worker" --cron-restart="*/15 * * * *"
```

Or internally with node-cron:
```typescript
// src/worker.ts
import cron from "node-cron";
cron.schedule("*/15 * * * *", () => runFetchCycle());
```

---

## 6. Fetcher System

### 6.1 Interface

```typescript
// src/lib/fetchers/types.ts
export interface FetchedPost {
  externalId: string;
  title?: string;
  content: string;
  author?: string;
  url?: string;
  imageUrl?: string;
  mediaType: "text" | "video" | "image" | "article";
  metadata?: Record<string, any>;
  publishedAt: Date; // MUST be UTC
}

export interface Fetcher {
  fetch(source: Source, since: Date): Promise<FetchedPost[]>;
}
```

### 6.2 Implementations

| Fetcher | Source | Tool | Metadata |
|---|---|---|---|
| `substack.ts` | RSS feed (`{url}/feed`) | `rss-parser` | readTimeMinutes |
| `youtube.ts` | YouTube Data API v3 | Native fetch | duration, viewCount, thumbnailUrl, embedUrl |
| `x.ts` | Self-hosted RSSHub | `rss-parser` | likeCount, retweetCount, replyCount |
| `telegram.ts` | Public page scraping | `cheerio` | viewCount, forwardCount |
| `website.ts` | RSS or HTML scraping | `rss-parser` + `@mozilla/readability` | siteName, readTimeMinutes |

### 6.3 URL Normalization

```typescript
// src/lib/url-normalizer.ts
export function normalizeSourceUrl(type: string, input: string): string {
  switch (type) {
    case "x":
      const username = input.replace(/https?:\/\/(twitter|x)\.com\//, "")
        .replace(/^@/, "").split("/")[0];
      return `x:${username.toLowerCase()}`;
    case "youtube":
      const handle = extractYoutubeHandle(input);
      return `youtube:${handle.toLowerCase()}`;
    case "substack":
      const subdomain = new URL(ensureProtocol(input)).hostname.split(".")[0];
      return `substack:${subdomain.toLowerCase()}`;
    case "telegram":
      const channel = input.replace(/https?:\/\/t\.me\/s?\//, "")
        .replace(/^@/, "").split("/")[0];
      return `telegram:${channel.toLowerCase()}`;
    case "website":
      return `website:${new URL(ensureProtocol(input)).hostname.toLowerCase()}`;
  }
}
```

Used when subscribing to a source: normalize URL → check if `normalizedUrl` already exists in Source table → reuse or create.

### 6.4 Fetcher Registry

```typescript
// src/lib/fetchers/index.ts
import type { Fetcher } from "./types";
export const fetchers: Record<string, Fetcher> = {
  substack: substackFetcher,
  youtube: youtubeFetcher,
  x: xFetcher,
  telegram: telegramFetcher,
  website: websiteFetcher,
};
```

---

## 7. Caching Strategy

- Cache is **per-source globally** (not per-user)
- Stored in `CacheEntry` table
- Duration: 15 min for sources with Pro subscribers, 30 min for free-only sources
- Background worker checks cache before fetching
- Manual "Refresh" button triggers `POST /api/fetch` which asks the worker to re-fetch (still respects a minimum 5-min cooldown to prevent abuse)
- Cache entries updated on successful fetch

---

## 8. Auto-Categorization

Same as before — keyword-based in V1, Claude API in V2. See `src/lib/categorizer.ts`. Categories are stored on the global Post record (same category for all users viewing that post).

---

## 9. Security

### 9.1 Authentication Security
- Passwords hashed with bcrypt (12 rounds)
- Database sessions (not JWT) — revocable, visible, secure
- `SameSite=Strict` + `HttpOnly` + `Secure` cookies
- CSRF: Origin header check on all mutations + Auth.js built-in CSRF
- Brute force: 5 failed logins → 15-min lock per account
- Password reset invalidates all existing sessions
- Email verification required before account activation

### 9.2 Content Security
- `sanitize-html` on all content before storage
- Zod validation on all API inputs
- React default escaping + `dangerouslySetInnerHTML` only on sanitized content
- YouTube embeds via controlled iframe component

### 9.3 Rate Limiting
- Per-user (authenticated) + per-IP (unauthenticated)
- Stricter limits on auth endpoints
- Plan-based limits on refresh actions
- Returns 429 with `Retry-After` header

### 9.4 Data Privacy
- All data queries scoped by userId (middleware enforced)
- Users cannot see other users' subscriptions, read states, saves, blocks, or schedules
- Search scoped to user's subscribed sources only
- Category counts scoped to user's subscriptions
- Account deletion removes all user-specific data
- Admin cannot see individual user's read states (only aggregate stats)

---

## 10. Frontend Architecture

### 10.1 Pages

```
/                → Landing page (not logged in) OR Feed (logged in)
/login           → Login form
/register        → Registration form
/forgot-password → Email input for password reset
/reset-password  → New password form (token from email)
/saved           → Bookmarked/saved posts (protected)
/schedule        → Scheduled events (protected, Pro only)
/sources         → Source management (protected)
/settings        → Profile, password, theme, timezone, data export, delete account (protected)
/pricing         → Free vs Pro comparison + upgrade button (public)
/terms           → Terms of Service (public)
/privacy         → Privacy Policy (public)
/admin           → Admin dashboard (protected, admin only)
```

### 10.2 Component Tree

```
src/components/
├── layout/
│   ├── Sidebar.tsx              → Navigation (Feed, Saved, Schedule, Sources + badges)
│   ├── Header.tsx               → Page title + Refresh button
│   ├── FilterBar.tsx            → Platform, Category, Profile dropdowns + Search
│   ├── ThemeProvider.tsx        → Dark/light mode context
│   └── AuthGuard.tsx            → Wrapper: redirect to /login if not authenticated
├── auth/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── ForgotPasswordForm.tsx
│   └── ResetPasswordForm.tsx
├── feed/
│   ├── PostList.tsx             → Infinite scroll (useInfiniteQuery)
│   ├── cards/
│   │   ├── TweetCard.tsx
│   │   ├── YoutubeCard.tsx
│   │   ├── ArticleCard.tsx
│   │   └── TelegramCard.tsx
│   ├── PostActions.tsx          → Hover menu
│   ├── ReadingModal.tsx         → Long article overlay
│   ├── NewPostsBanner.tsx       → "X new posts" banner
│   └── EmptyState.tsx           → New user welcome
├── sources/
│   ├── SourceList.tsx
│   ├── SourceCard.tsx
│   ├── AddSourceDialog.tsx      → Subscribe to source (with URL normalization)
│   ├── EditSubscriptionDialog.tsx → Edit custom name
│   └── MuteSourceDialog.tsx     → Duration picker
├── schedule/
│   ├── ScheduleList.tsx
│   ├── ScheduleCard.tsx
│   └── ScheduleDialog.tsx
├── saved/
│   └── SavedList.tsx
├── settings/
│   ├── ProfileSettings.tsx
│   ├── PasswordChange.tsx
│   ├── ThemeSettings.tsx
│   ├── DataExport.tsx
│   └── DeleteAccount.tsx
├── billing/
│   ├── PricingCard.tsx
│   ├── UpgradePrompt.tsx        → Shown when free user tries Pro feature
│   └── BillingStatus.tsx
├── admin/
│   ├── UserList.tsx
│   ├── GlobalSourceList.tsx
│   └── WorkerStatus.tsx
├── landing/
│   └── LandingPage.tsx          → Marketing page for non-logged-in visitors
├── filters/
│   ├── PlatformFilter.tsx
│   ├── CategoryFilter.tsx
│   ├── ProfileFilter.tsx
│   └── SearchBar.tsx
└── ui/                          → shadcn/ui components
```

### 10.3 Custom Hooks

```
src/hooks/
├── useAuth.ts           → Current user, login, logout, register
├── usePosts.ts          → useInfiniteQuery for posts + filters, optimistic mark-as-read
├── useSources.ts        → useQuery for user's subscriptions, mutations
├── useCategories.ts     → useQuery for category list (user-scoped counts)
├── useSchedule.ts       → useQuery for events, mutations
├── useSearch.ts         → useQuery for FTS5 search (user-scoped)
├── useReadTracker.ts    → Intersection Observer + timer for auto-mark-as-read
└── useTheme.ts          → Theme from user profile (DB) or localStorage for guests
```

### 10.4 State Management
Same as before: TanStack Query for server data, useState/useContext for UI state. Auth state managed by Auth.js session + `useAuth` hook.

---

## 11. File Structure

```
content-aggregator/
├── .env                           # All secrets (git-ignored)
├── .env.example                   # Template (committed)
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── CLAUDE.md
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── icons/
├── __tests__/
│   ├── fetchers/
│   │   ├── substack.test.ts
│   │   ├── youtube.test.ts
│   │   ├── x.test.ts
│   │   ├── telegram.test.ts
│   │   └── website.test.ts
│   ├── auth/
│   │   └── registration.test.ts
│   ├── data-isolation.test.ts     # Verify users can't see each other's data
│   └── fixtures/
│       ├── substack-feed.xml
│       ├── youtube-response.json
│       ├── rsshub-feed.xml
│       ├── telegram-page.html
│       └── website-article.html
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing (guest) or Feed (logged in)
│   │   ├── globals.css
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── saved/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── sources/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── admin/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register/route.ts
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   ├── forgot-password/route.ts
│   │       │   ├── reset-password/route.ts
│   │       │   ├── verify-email/route.ts
│   │       │   ├── me/route.ts
│   │       │   ├── password/route.ts
│   │       │   └── export/route.ts
│   │       ├── sources/
│   │       │   ├── route.ts
│   │       │   └── [sourceId]/route.ts
│   │       ├── posts/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   ├── mark-all-read/route.ts
│   │       │   └── batch-read/route.ts
│   │       ├── schedule/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── fetch/route.ts
│   │       ├── categories/route.ts
│   │       ├── search/route.ts
│   │       ├── health/route.ts
│   │       ├── billing/
│   │       │   ├── checkout/route.ts
│   │       │   ├── webhook/route.ts
│   │       │   └── portal/route.ts
│   │       └── admin/
│   │           ├── users/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           ├── sources/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           ├── worker-status/route.ts
│   │           └── invite-codes/route.ts
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts                # Auth.js configuration
│   │   ├── auth-middleware.ts     # requireAuth, requireAdmin helpers
│   │   ├── stripe.ts             # Stripe client setup
│   │   ├── email.ts              # Resend client setup
│   │   ├── content-processor.ts
│   │   ├── categorizer.ts
│   │   ├── url-normalizer.ts     # Source URL normalization
│   │   ├── plan-limits.ts        # Feature gating by plan
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   ├── validations.ts
│   │   └── fetchers/
│   │       ├── types.ts
│   │       ├── index.ts
│   │       ├── substack.ts
│   │       ├── youtube.ts
│   │       ├── x.ts
│   │       ├── telegram.ts
│   │       └── website.ts
│   ├── components/               # (see section 10.2)
│   ├── hooks/                    # (see section 10.3)
│   ├── email-templates/
│   │   ├── verification.ts
│   │   ├── password-reset.ts
│   │   └── welcome.ts
│   └── types/
│       └── index.ts
├── src/worker.ts                  # Background fetch worker (separate PM2 process)
└── deploy/
    ├── deploy.sh
    ├── nginx.conf
    ├── docker-compose.yml         # RSSHub
    └── backup.sh
```

---

## 12. Environment Variables

```env
# Database
DATABASE_URL="file:./prisma/data.db"

# Auth
AUTH_SECRET="random-32-char-secret"
AUTH_URL="https://yourdomain.com"

# Email (Resend)
RESEND_API_KEY="re_xxxx"
EMAIL_FROM="noreply@yourdomain.com"

# Stripe
STRIPE_SECRET_KEY="sk_xxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxx"
STRIPE_PRO_PRICE_ID="price_xxxx"

# YouTube Data API
YOUTUBE_API_KEY="your-youtube-api-key"

# Telegram (future)
TELEGRAM_API_ID=""
TELEGRAM_API_HASH=""

# RSSHub (self-hosted Docker)
RSSHUB_BASE_URL="http://localhost:1200"

# App config
CACHE_DURATION_PRO_MINUTES=15
CACHE_DURATION_FREE_MINUTES=30
CONTENT_START_DATE="2026-02-20"
REGISTRATION_MODE="open"

# Rate limiting
RATE_LIMIT_AUTH_MAX=60
RATE_LIMIT_UNAUTH_MAX=10
RATE_LIMIT_WINDOW_MS=60000

# Google Calendar (V1.5)
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
```

---

## 13. Deployment

### 13.1 Server Specs
- **Droplet:** Ubuntu 24.04, 4GB RAM, 2 vCPU, 80GB SSD ($24/month)
- **Why 4GB:** Next.js (~500MB) + Worker (~200MB) + RSSHub Docker (~300MB) + Nginx + SQLite = ~1.5GB baseline. Multi-user needs headroom for concurrent requests.

### 13.2 Server Setup

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
curl -fsSL https://get.docker.com | sh

# Clone and build
git clone your-repo-url /app
cd /app && npm install && npx prisma migrate deploy && npm run build

# Start services
cd /app/deploy && docker-compose up -d
pm2 start npm --name "web" -- start
pm2 start dist/worker.js --name "worker"
pm2 save && pm2 startup

# SSL (required for auth cookies)
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

### 13.3 Nginx Config

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 13.4 RSSHub Docker

```yaml
version: '3'
services:
  rsshub:
    image: diygod/rsshub
    restart: always
    ports:
      - "1200:1200"
    environment:
      - NODE_ENV=production
      - CACHE_TYPE=memory
      - CACHE_EXPIRE=600
```

### 13.5 Deploy Script

```bash
#!/bin/bash
set -e
cd /app
echo "Pulling latest code..."
git pull origin main
echo "Installing dependencies..."
npm install
echo "Running migrations..."
npx prisma migrate deploy
echo "Building..."
npm run build
echo "Restarting services..."
pm2 restart web
pm2 restart worker
echo "Deployed at $(date)"
```

### 13.6 Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DB_PATH="/app/prisma/data.db"
DATE=$(date +%F)
mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup $BACKUP_DIR/data-$DATE.db"
ls -t $BACKUP_DIR/data-*.db | tail -n +31 | xargs -r rm
# Optional: push to DigitalOcean Spaces
# s3cmd put $BACKUP_DIR/data-$DATE.db s3://your-bucket/backups/
echo "Backup completed: data-$DATE.db"
```

Cron: `0 2 * * * /bin/bash /app/deploy/backup.sh >> /var/log/backup.log 2>&1`

### 13.7 Disaster Recovery
Same as before: ~30 min recovery from GitHub + backup. PM2 processes: restart `web` + `worker`.

---

## 14. Edge Cases & Solutions

### 14.1 Source URL Changes
- 🔴 indicator alerts all subscribers
- Admin edits global source URL
- Users can only edit their own subscription (custom name, mute)

### 14.2 Initial Backfill
- Best-effort per platform
- Transparency notice when subscribing

### 14.3 Duplicate Posts
- `@@unique([sourceId, externalId])` + `skipDuplicates: true`
- Background worker is the only writer (no concurrent fetch race conditions)

### 14.4 Timezone
- All dates stored UTC
- Frontend uses user's `timezone` preference (from User model) for display

### 14.5 Content Size
- 50KB max per post, truncate larger

### 14.6 Author Deletes Post
- Our copy stays. Standard RSS behavior.

### 14.7 JS-Rendered Websites
- V1: Readability null check → warn user
- V2: Puppeteer

### 14.8 Disk Space
- Monitor in /api/health, PM2 log rotation
- SQLite fine for years of multi-user use (text is tiny)

### 14.9 SQLite → PostgreSQL
- All queries through Prisma, one FTS5 migration point
- Migrate when approaching 50 concurrent users or write contention issues

### 14.10 User Deletes Account
- Remove: User, all UserSource, UserPostState, ScheduledEvent, BlockedPost, Sessions
- Keep: Global Source and Post records (other users need them)
- If source has zero subscribers after deletion → worker auto-skips

### 14.11 Last Subscriber Unsubscribes
- Worker query JOINs with UserSource → sources with 0 subscribers automatically skipped
- Global source record stays (someone might subscribe later)
- Old posts remain in database (negligible storage cost)

---

## 15. Operations

### 15.1 Cost

| Item | Monthly |
|---|---|
| DigitalOcean Droplet (4GB) | $24 |
| Domain name | ~$1 |
| Resend (email) | $0 (free: 3K emails/mo) |
| Stripe | $0 (only 2.9% + $0.30 per transaction) |
| YouTube API | Free |
| RSSHub (self-hosted) | Free |
| SSL (Let's Encrypt) | Free |
| **Total (before revenue)** | **~$25/month** |

### 15.2 Development Workflow
- ESLint + Prettier + TypeScript strict
- Git: `main` (deployed), `dev` (development), feature branches
- CLAUDE.md for Claude Code context
- Domain required (for email delivery + SSL + auth cookies)

### 15.3 Performance Targets

| Metric | Target | Unacceptable |
|---|---|---|
| Feed page load | < 2s | > 5s |
| Mark as read / bookmark | < 200ms | > 1s |
| Search results | < 500ms | > 2s |
| Login | < 1s | > 3s |
| Subscribe to source | < 10s | > 20s |
| Worker full cycle (10 sources) | < 60s | > 180s |

### 15.4 Legal
- `/terms` and `/privacy` pages required
- Substack/YouTube: legal. X/Telegram scraping: gray area, low risk.
- GDPR: data export + account deletion supported

---

## 16. Testing

| Test | Why |
|---|---|
| Each fetcher parses sample response | Fetchers are most fragile |
| Data isolation (user A can't see user B's data) | Privacy is critical in multi-user |
| BlockedPost per-user scoping | User A blocks post, user B still sees it |
| Mute expiry logic | Auto-resume |
| Auth flow (register → verify → login) | Core user journey |
| Plan limits enforcement | Free users blocked from Pro features |
| Worker lock prevents concurrent runs | Data integrity |

---

## 17. Build Order (for Claude Code Terminal)

### Phase 1: Foundation (steps 1-10)
1. Initialize Next.js + TypeScript + Tailwind + App Router
2. Install ALL dependencies (prisma, rss-parser, cheerio, @mozilla/readability, sanitize-html, zod, @tanstack/react-query, next-nprogress-bar, date-fns, next-auth, bcrypt, resend, stripe, node-cron)
3. Set up full Prisma schema (all 13 models) + generate + migrate
4. `src/lib/db.ts` (Prisma singleton)
5. `src/lib/constants.ts`
6. `src/lib/validations.ts` (all Zod schemas including auth)
7. `src/types/index.ts`
8. `src/lib/utils.ts`
9. Set up shadcn/ui + components
10. `.env.example`

### Phase 2: Auth System (steps 11-18)
11. `src/lib/auth.ts` (Auth.js config with credentials provider + database adapter)
12. `src/lib/auth-middleware.ts` (requireAuth, requireAdmin)
13. `src/lib/email.ts` (Resend client)
14. Email templates (verification, password-reset, welcome)
15. Auth API routes (register, login, logout, verify-email)
16. Auth API routes (forgot-password, reset-password, me, password change, export, delete)
17. Login + Register + ForgotPassword + ResetPassword pages
18. AuthGuard component

### Phase 3: Backend Core (steps 19-26)
19. `src/lib/url-normalizer.ts`
20. `src/lib/content-processor.ts`
21. `src/lib/categorizer.ts`
22. Fetcher interface + registry
23. Substack fetcher
24. YouTube fetcher
25. X/Twitter fetcher (RSSHub)
26. Telegram + Website fetchers

### Phase 4: Background Worker (steps 27-28)
27. `src/worker.ts` (cron + lock + fetch cycle + logging)
28. Worker PM2 configuration

### Phase 5: API Routes (steps 29-38)
29. Sources: GET (user's subscriptions), POST (subscribe), PATCH, DELETE (unsubscribe)
30. Posts: GET (user-scoped with JOINs), PATCH (lazy UserPostState creation), DELETE (per-user blocklist)
31. Posts: batch-read, mark-all-read
32. Schedule: full CRUD (with plan check)
33. Categories: GET (user-scoped counts)
34. Search: GET (user-scoped FTS5)
35. Fetch: POST (trigger worker)
36. Health: GET (admin only)
37. Billing: checkout, webhook, portal
38. Admin: users, sources, worker-status, invite-codes

### Phase 6: Frontend — Layout & Auth (steps 39-46)
39. ThemeProvider
40. Root layout (with auth session provider + TanStack QueryProvider)
41. Landing page (for guests)
42. Sidebar + Header + FilterBar
43. Smooth transitions (nprogress)
44. Settings page (profile, password, theme, export, delete)
45. Pricing page
46. Terms + Privacy pages

### Phase 7: Frontend — Feed (steps 47-57)
47. Custom hooks (useAuth, usePosts, useSources, useCategories, useSearch, useSchedule)
48. TweetCard
49. YoutubeCard (embedded player)
50. ArticleCard
51. TelegramCard
52. PostActions (hover menu)
53. ReadingModal
54. PostList (infinite scroll)
55. Feed page assembly
56. useReadTracker (auto-mark-as-read)
57. NewPostsBanner

### Phase 8: Frontend — Sources, Saved, Schedule (steps 58-65)
58. SourceCard + SourceList
59. AddSourceDialog (with URL normalization + validation)
60. EditSubscriptionDialog + MuteSourceDialog
61. Sources page
62. SavedList + Saved page
63. ScheduleCard + ScheduleList + ScheduleDialog
64. Schedule page (with Pro gate)
65. UpgradePrompt component

### Phase 9: Frontend — Admin (steps 66-68)
66. UserList + admin user management
67. GlobalSourceList + admin source management
68. WorkerStatus display

### Phase 10: Polish (steps 69-76)
69. EmptyState (new user onboarding)
70. Loading skeletons for all pages
71. Error handling + toasts
72. Responsive design (mobile)
73. Dark mode styling pass
74. Unread count in browser tab title
75. `src/lib/plan-limits.ts` (enforce all plan restrictions)
76. InviteCode system (for invite-only mode)

### Phase 11: Testing & Deployment (steps 77-82)
77. Fetcher tests with fixtures
78. Data isolation tests
79. Auth flow tests
80. Deploy scripts (deploy.sh, backup.sh, docker-compose.yml, nginx.conf)
81. CLAUDE.md
82. Final .env.example

---

## 18. CLAUDE.md

```markdown
# Content Aggregator (Multi-User)

## Stack
- Next.js 14+ App Router, TypeScript
- Tailwind CSS + shadcn/ui
- SQLite + Prisma ORM
- Auth.js v5 (database sessions, credentials provider)
- TanStack Query for client state
- Background worker (node-cron, separate PM2 process)
- Stripe for payments, Resend for email

## Architecture
- Sources are GLOBAL (shared). Users SUBSCRIBE via UserSource.
- Posts are GLOBAL. Per-user state (read/saved) in UserPostState (LAZY creation).
- Background worker fetches all active sources every 15 min.
- Users never fetch directly — they always read from DB.
- Fetchers in src/lib/fetchers/ — one per source type, same interface.
- API routes in src/app/api/ — RESTful, standard envelope, auth middleware on all protected routes.
- All queries scoped by userId — users NEVER see each other's data.

## Key Rules
- UserPostState is LAZY: no row = unread + unsaved. Create row only on user interaction.
- Feed query: Post JOIN UserSource LEFT JOIN UserPostState LEFT JOIN BlockedPost
- Source URLs normalized via src/lib/url-normalizer.ts before storage/matching
- Worker uses WorkerLock to prevent concurrent runs
- Only ONE raw SQL: FTS5 search (migration point for PostgreSQL)
- Content sanitized BEFORE storage. Dates always UTC.
- YouTube = iframe embed, NEVER download. Post content max 50KB.
- Auth: bcrypt, database sessions, SameSite=Strict, CSRF on mutations
- Plan limits enforced in src/lib/plan-limits.ts
```
