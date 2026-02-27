export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  createdAt: string;
  enabled: boolean;
  lockedUntil: string | null;
  sourceCount: number;
  postCount: number;
  scheduledCount: number;
  lastActiveAt: string | null;
};

export type AdminUsersResponse = {
  success: boolean;
  data: AdminUser[];
  error?: string;
};

export type AdminSource = {
  id: string;
  type: string;
  url: string;
  normalizedUrl: string;
  name: string;
  config: string | null;
  enabled: boolean;
  lastFetchedAt: string | null;
  lastFetchStatus: string;
  createdAt: string;
  subscriberCount: number;
  postCount: number;
};

export type AdminSourcesResponse = {
  success: boolean;
  data: AdminSource[];
  error?: string;
};

export type WorkerStatusPayload = {
  worker: {
    lockActive: boolean;
    lockedAt: string | null;
  };
  sources: {
    total: number;
    stale: number;
    failed: number;
    latestFetched: {
      id: string;
      name: string;
      lastFetchedAt: string;
      lastFetchStatus: string;
    } | null;
  };
};

export type WorkerStatusResponse = {
  success: boolean;
  data: WorkerStatusPayload;
  error?: string;
};

export type InviteCodeRecord = {
  id: string;
  code: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  isUsed: boolean;
  isExpired: boolean;
  isActive: boolean;
};

export type InviteCodesResponse = {
  success: boolean;
  data: InviteCodeRecord[];
  error?: string;
};
