/**
 * @middleware Rate limiting for public share routes
 * In-memory rate limiter: 60 requests/minute per IP on /share/* and /api/share/*
 * Uses a simple sliding window approach with periodic cleanup.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Rate limit config ─────────────────────────────────────────────────
const RATE_LIMIT = 60; // requests
const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // clean stale entries every 5 min

// ── In-memory store ───────────────────────────────────────────────────
interface RateEntry {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateEntry>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  ipMap.forEach((entry, ip) => {
    if (entry.resetAt < now) {
      ipMap.delete(ip);
    }
  });
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown"
  );
}

// ── Middleware ─────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  cleanup();

  const ip = getClientIp(request);
  const now = Date.now();
  const entry = ipMap.get(ip);

  if (!entry || entry.resetAt < now) {
    // New window
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return addRateLimitHeaders(NextResponse.next(), 1);
  }

  entry.count += 1;

  if (entry.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    );
  }

  return addRateLimitHeaders(NextResponse.next(), entry.count);
}

function addRateLimitHeaders(response: NextResponse, count: number): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, RATE_LIMIT - count)));
  return response;
}

// ── Matcher — only apply to share routes ──────────────────────────────

export const config = {
  matcher: ["/share/:path*", "/api/share/:path*"],
};
