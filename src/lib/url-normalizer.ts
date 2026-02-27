function ensureProtocol(input: string) {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  return `https://${input}`;
}

export function extractYoutubeHandle(input: string) {
  const value = input.trim();

  if (!value) {
    throw new Error("YouTube URL/handle is required");
  }

  if (/^@?[a-zA-Z0-9._-]+$/.test(value) && !value.includes("/")) {
    return value.replace(/^@/, "");
  }

  const url = new URL(ensureProtocol(value));
  const pathSegments = url.pathname.split("/").filter(Boolean);

  const atHandle = pathSegments.find((segment) => segment.startsWith("@"));
  if (atHandle) {
    return atHandle.replace(/^@/, "");
  }

  const channelSegmentIndex = pathSegments.findIndex((segment) => segment === "channel");
  if (channelSegmentIndex >= 0 && pathSegments[channelSegmentIndex + 1]) {
    return pathSegments[channelSegmentIndex + 1];
  }

  if (pathSegments[0]) {
    return pathSegments[0].replace(/^@/, "");
  }

  throw new Error("Unable to extract YouTube handle");
}

export function normalizeSourceUrl(type: string, input: string): string {
  const normalizedType = type.toLowerCase();
  const rawInput = input.trim();

  switch (normalizedType) {
    case "x": {
      const username = rawInput
        .replace(/https?:\/\/(twitter|x)\.com\//i, "")
        .replace(/^@/, "")
        .split("/")[0]
        .trim();

      if (!username) {
        throw new Error("Invalid X/Twitter source");
      }

      return `x:${username.toLowerCase()}`;
    }

    case "youtube": {
      const handle = extractYoutubeHandle(rawInput);
      return `youtube:${handle.toLowerCase()}`;
    }

    case "substack": {
      const hostname = new URL(ensureProtocol(rawInput)).hostname;
      const subdomain = hostname.split(".")[0];

      if (!subdomain) {
        throw new Error("Invalid Substack source");
      }

      return `substack:${subdomain.toLowerCase()}`;
    }

    case "telegram": {
      const channel = rawInput
        .replace(/https?:\/\/t\.me\/(s\/)?/i, "")
        .replace(/^@/, "")
        .split("/")[0]
        .trim();

      if (!channel) {
        throw new Error("Invalid Telegram source");
      }

      return `telegram:${channel.toLowerCase()}`;
    }

    case "website": {
      const hostname = new URL(ensureProtocol(rawInput)).hostname;

      if (!hostname) {
        throw new Error("Invalid website source");
      }

      return `website:${hostname.toLowerCase()}`;
    }

    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}

export { ensureProtocol };
