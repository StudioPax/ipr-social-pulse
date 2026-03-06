/**
 * Import LinkedIn posts into Meridian via the /api/collect/import endpoint.
 *
 * Usage: npx tsx scripts/import-linkedin.ts
 *
 * Reads data/linkedin-posts-all.json and POSTs to the local dev server.
 */

import fs from "fs";
import path from "path";

const API_URL = process.env.API_URL || "http://localhost:3000";
const CLIENT_ID = "8734831a-16e0-4cbf-8335-7322855b07b1";

async function main() {
  const dataPath = path.join(__dirname, "..", "data", "linkedin-posts-all.json");

  if (!fs.existsSync(dataPath)) {
    console.error("Error: data/linkedin-posts-all.json not found");
    process.exit(1);
  }

  const posts = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  console.log(`Loaded ${posts.length} LinkedIn posts from JSON`);

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
