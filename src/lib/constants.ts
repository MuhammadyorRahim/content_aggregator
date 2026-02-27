export const APP_NAME = "Content Aggregator";

export const SOURCE_TYPES = ["x", "youtube", "substack", "telegram", "website"] as const;
export const USER_THEMES = ["light", "dark", "system"] as const;
export const USER_ROLES = ["user", "admin"] as const;
export const USER_PLANS = ["free", "pro"] as const;
export const SOURCE_FETCH_STATUSES = ["success", "failed", "never"] as const;

export const POST_MEDIA_TYPES = ["text", "video", "image", "article"] as const;

export const CATEGORIES = [
  "AI & ML",
  "Programming",
  "Tech News",
  "Science",
  "Opinion",
  "Uncategorized",
] as const;

export const FEED_PAGE_SIZE = 20;
export const READ_PREVIEW_CHAR_LIMIT = 150;
export const SHORT_CONTENT_CHAR_LIMIT = 280;
export const MAX_POST_CONTENT_BYTES = 50 * 1024;
export const BLOCKED_POST_INTERNAL_PREFIX = "__internal__:";

export const CACHE_DURATION_PRO_MINUTES = Number(process.env.CACHE_DURATION_PRO_MINUTES ?? 15);
export const CACHE_DURATION_FREE_MINUTES = Number(process.env.CACHE_DURATION_FREE_MINUTES ?? 30);
export const CONTENT_START_DATE = new Date(process.env.CONTENT_START_DATE ?? "2026-02-20");
export const REGISTRATION_MODE = process.env.REGISTRATION_MODE ?? "open";

export const RATE_LIMIT_AUTH_MAX = Number(process.env.RATE_LIMIT_AUTH_MAX ?? 60);
export const RATE_LIMIT_UNAUTH_MAX = Number(process.env.RATE_LIMIT_UNAUTH_MAX ?? 10);
export const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const ACCOUNT_LOCK_MINUTES = 15;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
