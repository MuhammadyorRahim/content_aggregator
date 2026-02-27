export type FeedSource = {
  id: string;
  type: string;
  url: string;
  normalizedUrl: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  lastFetchedAt: string | null;
  lastFetchStatus: string;
};

export type FeedPostItem = {
  id: string;
  sourceId: string;
  externalId: string | null;
  title: string | null;
  content: string;
  author: string | null;
  url: string | null;
  imageUrl: string | null;
  mediaType: string | null;
  category: string | null;
  metadata: string | null;
  publishedAt: string;
  fetchedAt: string;
  source: FeedSource;
  sourceCustomName: string | null;
  isRead: boolean;
  isSaved: boolean;
};

export type FeedPageMeta = {
  page: number;
  totalPages: number;
  totalCount: number;
  hasMore: boolean;
};

export type FeedPostsResponse = {
  success: boolean;
  data: FeedPostItem[];
  meta?: FeedPageMeta;
  error?: string;
};

export type SearchResponse = {
  success: boolean;
  data: FeedPostItem[];
  error?: string;
};

export type CategoryCount = {
  category: string;
  count: number;
};

export type CategoriesResponse = {
  success: boolean;
  data: CategoryCount[];
  error?: string;
};

export type SourceSubscription = {
  id: string;
  userId: string;
  sourceId: string;
  customName: string | null;
  mutedUntil: string | null;
  createdAt: string;
  source: FeedSource;
  unreadCount: number;
};

export type SourcesResponse = {
  success: boolean;
  data: SourceSubscription[];
  error?: string;
};

export type ScheduleEventItem = {
  id: string;
  userId: string;
  postId: string;
  title: string;
  scheduledAt: string;
  googleEventId: string | null;
  createdAt: string;
  post: {
    id: string;
    sourceId: string;
    title: string | null;
    url: string | null;
    publishedAt: string;
    source: FeedSource;
  };
};

export type ScheduleResponse = {
  success: boolean;
  data: ScheduleEventItem[];
  error?: string;
};

export type CurrentUserProfile = {
  id: string;
  email: string;
  emailVerified: string | null;
  name: string | null;
  timezone: string;
  theme: "light" | "dark" | "system";
  role: string;
  plan: "free" | "pro";
  createdAt: string;
  googleConnected?: boolean;
};

export type CurrentUserResponse = {
  success: boolean;
  data: CurrentUserProfile | null;
  error?: string;
};
