/**
 * @module bluesky — AT Protocol client for Bluesky public API
 * App Spec Module 1 — Social media data collection
 *
 * Bluesky's AT Protocol provides free, unauthenticated access to public posts.
 * No API key required. Uses the public app.bsky.feed namespace.
 */

const BSKY_PUBLIC_API = "https://public.api.bsky.app";

/** Raw Bluesky post from AT Protocol */
export interface BskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    text: string;
    createdAt: string;
    langs?: string[];
    facets?: Array<{
      features: Array<{
        $type: string;
        uri?: string;
        tag?: string;
      }>;
    }>;
    embed?: {
      $type: string;
      external?: { uri: string; title: string };
      images?: Array<{ alt: string; image: { ref: { $link: string } } }>;
    };
  };
  likeCount?: number;
  repostCount?: number;
  replyCount?: number;
  quoteCount?: number;
  indexedAt: string;
  embed?: {
    $type: string;
    external?: { uri: string; title: string; description: string };
    images?: Array<{ fullsize: string; thumb: string; alt: string }>;
  };
}

/** Normalized post for our database */
export interface NormalizedPost {
  platform: "bluesky";
  post_id: string;
  content_text: string;
  content_url: string;
  published_at: string;
  likes: number;
  reposts: number;
  comments: number;
  engagement_total: number;
  hashtags: string[];
  mentions: string[];
  links: string[];
  media_urls: string[];
  media_type: string | null;
  content_format: string;
  authors: string[];
}

/**
 * Search Bluesky posts via AT Protocol (public, no auth).
 * Uses app.bsky.feed.searchPosts endpoint.
 */
export async function searchBlueskyPosts(params: {
  query: string;
  limit?: number;
  since?: string; // ISO datetime
  until?: string; // ISO datetime
  sort?: "top" | "latest";
}): Promise<{ posts: BskyPost[]; cursor?: string }> {
  const url = new URL(`${BSKY_PUBLIC_API}/xrpc/app.bsky.feed.searchPosts`);
  url.searchParams.set("q", params.query);
  url.searchParams.set("limit", String(params.limit || 25));
  if (params.sort) url.searchParams.set("sort", params.sort);
  if (params.since) url.searchParams.set("since", params.since);
  if (params.until) url.searchParams.set("until", params.until);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky API error ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Get posts from a specific Bluesky author's feed (public, no auth).
 * Uses app.bsky.feed.getAuthorFeed endpoint.
 */
export async function getAuthorFeed(params: {
  actor: string; // handle or DID
  limit?: number;
  cursor?: string;
  filter?: "posts_with_replies" | "posts_no_replies" | "posts_with_media" | "posts_and_author_threads";
}): Promise<{ feed: Array<{ post: BskyPost }>; cursor?: string }> {
  const url = new URL(`${BSKY_PUBLIC_API}/xrpc/app.bsky.feed.getAuthorFeed`);
  url.searchParams.set("actor", params.actor);
  url.searchParams.set("limit", String(params.limit || 50));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.filter) url.searchParams.set("filter", params.filter);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Bluesky API error ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Normalize a Bluesky post into our database schema format.
 */
export function normalizePost(post: BskyPost): NormalizedPost {
  const text = post.record?.text || "";

  // Extract hashtags from facets
  const hashtags: string[] = [];
  const mentions: string[] = [];
  const links: string[] = [];

  if (post.record?.facets) {
    for (const facet of post.record.facets) {
      for (const feature of facet.features) {
        if (feature.$type === "app.bsky.richtext.facet#tag" && feature.tag) {
          hashtags.push(feature.tag);
        }
        if (feature.$type === "app.bsky.richtext.facet#mention") {
          // mention DIDs are in the feature
        }
        if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
          links.push(feature.uri);
        }
      }
    }
  }

  // Also extract hashtags from text (#tag pattern)
  const hashtagMatches = text.match(/#[\w]+/g);
  if (hashtagMatches) {
    for (const tag of hashtagMatches) {
      const clean = tag.slice(1).toLowerCase();
      if (!hashtags.includes(clean)) hashtags.push(clean);
    }
  }

  // Extract mentions from text (@handle pattern)
  const mentionMatches = text.match(/@[\w.-]+/g);
  if (mentionMatches) {
    for (const mention of mentionMatches) {
      mentions.push(mention.slice(1));
    }
  }

  // Media
  const mediaUrls: string[] = [];
  let mediaType: string | null = null;

  if (post.embed?.images && post.embed.images.length > 0) {
    mediaType = "image";
    for (const img of post.embed.images) {
      if (img.fullsize) mediaUrls.push(img.fullsize);
    }
  }

  if (post.embed?.external?.uri) {
    links.push(post.embed.external.uri);
  }

  // Content format detection
  // Check for video/image embeds first
  if (post.record?.embed?.$type === "app.bsky.embed.video") {
    mediaType = "video";
  }

  // Determine format: use media type if present, otherwise classify by text length
  let contentFormat: string;
  if (mediaType === "video") {
    contentFormat = "video";
  } else if (mediaType === "image") {
    contentFormat = "image";
  } else if (links.length > 0) {
    contentFormat = "link";
  } else if (text.length <= 100) {
    contentFormat = "short";
  } else if (text.length <= 280) {
    contentFormat = "medium";
  } else {
    contentFormat = "long";
  }

  // Post URL
  const handle = post.author?.handle || "";
  const rkey = post.uri?.split("/").pop() || "";
  const contentUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

  const likes = post.likeCount || 0;
  const reposts = post.repostCount || 0;
  const comments = post.replyCount || 0;

  return {
    platform: "bluesky",
    post_id: post.uri,
    content_text: text,
    content_url: contentUrl,
    published_at: post.record?.createdAt || post.indexedAt,
    likes,
    reposts,
    comments,
    engagement_total: likes + reposts + comments + (post.quoteCount || 0),
    hashtags,
    mentions,
    links,
    media_urls: mediaUrls,
    media_type: mediaType,
    content_format: contentFormat,
    authors: [post.author?.displayName || post.author?.handle || "unknown"],
  };
}
