import { db } from "@/lib/db";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? "primary";

type GoogleAccount = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

type CalendarSyncInput = {
  userId: string;
  title: string;
  scheduledAt: Date;
  timezone?: string | null;
  description?: string | null;
};

function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function getUserGoogleAccount(userId: string): Promise<GoogleAccount | null> {
  if (!isGoogleConfigured()) {
    return null;
  }

  return db.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });
}

async function refreshAccessToken(account: GoogleAccount): Promise<string | null> {
  if (!account.refresh_token || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!payload.access_token) {
    return null;
  }

  const expiresAt = payload.expires_in
    ? Math.floor(Date.now() / 1000) + payload.expires_in
    : account.expires_at;

  await db.account.update({
    where: {
      id: account.id,
    },
    data: {
      access_token: payload.access_token,
      refresh_token: payload.refresh_token ?? account.refresh_token,
      expires_at: expiresAt ?? null,
      token_type: payload.token_type ?? null,
      scope: payload.scope ?? null,
    },
  });

  return payload.access_token;
}

async function getValidAccessToken(account: GoogleAccount): Promise<string | null> {
  const expirySkewSeconds = 60;
  const now = Math.floor(Date.now() / 1000);
  const tokenExpired = account.expires_at !== null && account.expires_at <= now + expirySkewSeconds;

  if (account.access_token && !tokenExpired) {
    return account.access_token;
  }

  return refreshAccessToken(account);
}

async function sendCalendarRequest(
  account: GoogleAccount,
  endpoint: string,
  init: {
    method: "POST" | "PATCH" | "DELETE";
    body?: string;
  }
) {
  let accessToken = await getValidAccessToken(account);
  if (!accessToken) {
    return null;
  }

  const requestInit: RequestInit = {
    method: init.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(init.body ? { body: init.body } : {}),
  };

  const response = await fetch(endpoint, requestInit);
  if (response.status !== 401) {
    return response;
  }

  accessToken = await refreshAccessToken(account);
  if (!accessToken) {
    return response;
  }

  return fetch(endpoint, {
    ...requestInit,
    headers: {
      ...requestInit.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function buildEventPayload(input: CalendarSyncInput) {
  const timezone = input.timezone || "UTC";
  const end = new Date(input.scheduledAt.getTime() + 30 * 60 * 1000);

  return {
    summary: input.title,
    description: input.description ?? undefined,
    start: {
      dateTime: input.scheduledAt.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: timezone,
    },
    reminders: {
      useDefault: true,
    },
  };
}

export async function createGoogleCalendarEvent(input: CalendarSyncInput): Promise<string | null> {
  const account = await getUserGoogleAccount(input.userId);
  if (!account) {
    return null;
  }

  const endpoint = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(DEFAULT_CALENDAR_ID)}/events`;
  const response = await sendCalendarRequest(account, endpoint, {
    method: "POST",
    body: JSON.stringify(buildEventPayload(input)),
  });

  if (!response?.ok) {
    return null;
  }

  const payload = (await response.json()) as { id?: string };
  return payload.id ?? null;
}

export async function updateGoogleCalendarEvent(
  input: CalendarSyncInput & { googleEventId: string }
): Promise<string | null> {
  const account = await getUserGoogleAccount(input.userId);
  if (!account) {
    return null;
  }

  const endpoint = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(DEFAULT_CALENDAR_ID)}/events/${encodeURIComponent(input.googleEventId)}`;
  const response = await sendCalendarRequest(account, endpoint, {
    method: "PATCH",
    body: JSON.stringify(buildEventPayload(input)),
  });

  if (!response) {
    return null;
  }

  if (response.status === 404) {
    return createGoogleCalendarEvent(input);
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { id?: string };
  return payload.id ?? null;
}

export async function deleteGoogleCalendarEvent(userId: string, googleEventId: string) {
  const account = await getUserGoogleAccount(userId);
  if (!account) {
    return;
  }

  const endpoint = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(DEFAULT_CALENDAR_ID)}/events/${encodeURIComponent(googleEventId)}`;
  const response = await sendCalendarRequest(account, endpoint, {
    method: "DELETE",
  });

  if (!response) {
    return;
  }

  if (!response.ok && response.status !== 404) {
    console.error("[google-calendar] Failed to delete calendar event", response.status);
  }
}

export async function hasGoogleCalendarConnection(userId: string) {
  const account = await getUserGoogleAccount(userId);
  return Boolean(account);
}
