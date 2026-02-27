import { BLOCKED_POST_INTERNAL_PREFIX } from "@/lib/constants";

export function toBlockedExternalId(postId: string, externalId: string | null | undefined) {
  return externalId && externalId.length > 0 ? externalId : `${BLOCKED_POST_INTERNAL_PREFIX}${postId}`;
}
