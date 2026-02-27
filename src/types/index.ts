import type {
  Post,
  Source,
  User,
  UserPostState,
  UserSource,
  ScheduledEvent,
  BlockedPost,
  CacheEntry,
} from "@prisma/client";

export type ApiResponse<T> = {
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

export type SourceType = "x" | "youtube" | "substack" | "telegram" | "website";
export type UserTheme = "light" | "dark" | "system";
export type UserRole = "user" | "admin";
export type UserPlan = "free" | "pro";
export type SourceFetchStatus = "success" | "failed" | "never";
export type PostMediaType = "text" | "video" | "image" | "article";

export type FeedPost = Post & {
  source: Source;
  userPostState?: UserPostState | null;
  sourceCustomName?: string | null;
  isRead: boolean;
  isSaved: boolean;
};

export type SourceWithSubscription = Source & {
  userSource: UserSource;
  unreadCount: number;
};

export type ScheduledEventWithPost = ScheduledEvent & {
  post: Post & {
    source: Source;
  };
};

export type UserWithStats = User & {
  sourceCount: number;
  postCount: number;
  lastActiveAt?: Date | null;
};

export type UserScopedPostState = Pick<UserPostState, "isRead" | "isSaved" | "readAt" | "savedAt">;

export type BlockedPostMatch = Pick<BlockedPost, "sourceId" | "externalId">;

export type SourceCache = CacheEntry;
