import type { Fetcher } from "./types";
import { substackFetcher } from "./substack";
import { telegramFetcher } from "./telegram";
import { websiteFetcher } from "./website";
import { xFetcher } from "./x";
import { youtubeFetcher } from "./youtube";

export const fetchers: Record<string, Fetcher> = {
  substack: substackFetcher,
  youtube: youtubeFetcher,
  x: xFetcher,
  telegram: telegramFetcher,
  website: websiteFetcher,
};
