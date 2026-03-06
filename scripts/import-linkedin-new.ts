/**
 * Import LinkedIn posts from the user's extraction JSON, skipping existing posts.
 *
 * Usage: npx tsx scripts/import-linkedin-new.ts
 *
 * Reads ~/Downloads/ipr_linkedin_posts.json, extracts post_ids from URLs,
 * derives published_at from LinkedIn snowflake IDs, and POSTs to the import API.
 */

import fs from "fs";
import path from "path";

const API_URL = process.env.API_URL || "http://localhost:52094";
const CLIENT_ID = "8734831a-16e0-4cbf-8335-7322855b07b1";

interface RawPost {
  content_url: string;
  content_text: string;
  likes: number;
  comments: number;
  reposts: number;
  hashtags: string[];
  mentions: string[];
  links: string[];
  media_type: string | null;
  content_format: string;
  client_id: string;
  collected_at: string;
}

function extractPostId(url: string): string {
  const match = url.match(/urn:li:activity:(\d+)/);
  if (!match) throw new Error(`Cannot extract post_id from: ${url}`);
  return match[1];
}

/**
 * LinkedIn activity IDs are snowflake-like: upper bits encode ms since Unix epoch.
 * timestamp_ms = id >> 22  (approximately, using floating-point division)
 */
function derivePublishedAt(postId: string): string {
  const id = BigInt(postId);
  const timestampMs = Number(id >> BigInt(22));
  return new Date(timestampMs).toISOString();
}

function classifyContentLength(text: string): string {
  if (text.length < 200) return "short";
  if (text.length < 500) return "medium";
  return "long";
}

async function main() {
  const dataPath = path.join(
    process.env.HOME || "~",
    "Downloads",
    "ipr_linkedin_posts.json"
  );

  if (!fs.existsSync(dataPath)) {
    console.error("Error: ~/Downloads/ipr_linkedin_posts.json not found");
    process.exit(1);
  }

  const rawPosts: RawPost[] = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  console.log(`Loaded ${rawPosts.length} posts from extraction file`);

  // Transform posts for the import API
  const posts = rawPosts.map((raw) => {
    const postId = extractPostId(raw.content_url);
    const publishedAt = derivePublishedAt(postId);
    return {
      platform: "linkedin",
      post_id: postId,
      content_url: raw.content_url,
      published_at: publishedAt,
      content_text: raw.content_text,
      content_format: classifyContentLength(raw.content_text),
      likes: raw.likes,
      comments: raw.comments,
      reposts: raw.reposts,
      shares: 0,
      engagement_total: raw.likes + raw.comments + raw.reposts,
      hashtags: raw.hashtags.map((h) => h.replace(/^#/, "")),
      mentions: raw.mentions,
      links: raw.links,
      media_urls: [],
      media_type: raw.media_type === "text"
        ? null
        : raw.media_type === "article"
          ? "link"
          : raw.media_type,
      authors: ["Institute for Policy Research at Northwestern University"],
    };
  });

  console.log(`Transformed ${posts.length} posts`);
  console.log(
    `Date range: ${posts[posts.length - 1].published_at} → ${posts[0].published_at}`
  );

  // POST to import API (upsert will skip existing posts automatically)
  const response = await fetch(`${API_URL}/api/collect/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      platform: "linkedin",
      posts,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("Import failed:", result);
    process.exit(1);
  }

  console.log("Import successful!");
  console.log(`  Run ID: ${result.run_id}`);
  console.log(`  Posts imported: ${result.posts_imported}`);
  console.log(`  Platform: ${result.platform}`);
  console.log(`  Status: ${result.status}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
