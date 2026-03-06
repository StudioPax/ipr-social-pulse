/**
 * @api GET /api/og — Dynamic OG image generation for shared campaign pages
 * Uses Next.js ImageResponse (Satori) to render a 1200×630 PNG with campaign title + Meridian branding
 *
 * Query params:
 *   ?title=Campaign+Title — campaign title to display
 */

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") || "Shared Campaign";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1a1f2b 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top: Meridian branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Meridian mark — simplified circle with compass star */}
          <svg
            width="56"
            height="56"
            viewBox="60 40 175 175"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#6c47ff"
              d="M145,40c47.8-.6,87.1,37.6,87.7,85.4.6,47.8-37.7,87.1-85.5,87.6-47.8.6-87-37.6-87.6-85.4-.6-47.8,37.6-87,85.4-87.6Z"
            />
            <path
              fill="white"
              d="M177.2,115.5c15.4,2.7,34.4,7.1,49.5,10.8-5.2,1.6-10.5,2.9-15.7,4.1l-33.9,7.5c-2.4-4-4.9-7.6-7.6-11.3,2.1-3.5,5.3-7.8,7.7-11.1Z"
            />
            <path
              fill="white"
              d="M146,47.7c1.1.9,4,16.8,4.6,19.3,2.2,9.4,4.4,18.9,6.6,28.2-2,1.5-9.4,7.2-11.4,8.1-3.7-2.7-7.8-5.4-11.6-8,.6-3.7,2.9-12.5,3.9-16.4,2.6-10.1,5-21.3,7.9-31.2Z"
            />
            <path
              fill="white"
              d="M113.4,116.1c.3,0,.9,0,1.2,0,1.8,1.3,6.5,8.4,8,10.7-2.8,3.7-5.7,7.6-8.3,11.4-10.4-2.6-20.8-5.2-31.2-7.7-5.7-1.3-11.3-2.8-17.1-4.1,6.4-2.1,17.1-3.8,23.8-5.2,7.5-1.6,16-3.7,23.5-5Z"
            />
            <path
              fill="white"
              d="M146.2,150.6c1.5.6,9.7,6.8,11.6,8.1-.5,2.2-1.1,4.6-1.7,6.7-3.5,12.7-6.4,25.6-9.7,38.3h0c-.1-.1-.3-.2-.4-.3-3.3-12.5-8.1-33.2-11.3-44.9,3.9-2.6,7.8-5.3,11.7-8Z"
            />
            <path
              fill="white"
              d="M115.2,142.2c3.8.6,8.7,1.8,12.4,2.8,1.2,3.4,2.3,7.9,3.3,11.5-3.3,2.6-8.5,5.5-12.2,7.8l-19.4,11.8c-3.6,2.1-7.2,4.3-10.7,6.6,1.7-3,3.8-6.1,5.7-8.9,7-10.4,13.7-21.2,20.8-31.5Z"
            />
            <path
              fill="white"
              d="M89.1,71.2c2.6,1,12.1,7,14.8,8.7,8.9,5.5,18.5,10.9,27.1,16.8-1.4,4.1-2.5,7.7-3.4,11.9-.8.7-9.6,2.6-11.6,3-9.1-13.4-18.1-26.8-26.9-40.4Z"
            />
            <path
              fill="white"
              d="M175.1,141.8h.5c.7.3.7.2,1.2,1,8.3,13.3,17.7,25.9,26,39.2-3.1-1.7-6-3.5-8.9-5.4-7.7-4.9-15.7-9.4-23.4-14.3-3.3-2.1-6.4-4.2-9.8-6.1,1.1-4,2.3-7.9,3.4-11.9,3.7-.8,7.4-1.7,11.1-2.5Z"
            />
            <path
              fill="white"
              d="M201.7,72.4h.3c-.2,1.4-23.7,34.9-26.3,39.3-4-.9-7.7-1.8-11.8-2.4-.7-1.2-2.6-10.5-3.1-12.4,2.3-1.7,5.5-3.5,8-4.9,11-6.3,21.8-13.4,32.9-19.5Z"
            />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "#e6edf3",
                letterSpacing: "-0.5px",
              }}
            >
              Meridian
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "#8b949e",
                letterSpacing: "2px",
                textTransform: "uppercase" as const,
              }}
            >
              Northwestern IPR
            </span>
          </div>
        </div>

        {/* Center: Campaign title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#6c47ff",
              letterSpacing: "2px",
              textTransform: "uppercase" as const,
            }}
          >
            Shared Campaign
          </span>
          <span
            style={{
              fontSize: title.length > 60 ? "36px" : "48px",
              fontWeight: 700,
              color: "#e6edf3",
              lineHeight: 1.2,
              letterSpacing: "-1px",
              maxWidth: "900px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>
        </div>

        {/* Bottom: Tagline */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "16px", color: "#8b949e" }}>
            Strategy & Campaign Plan
          </span>
          <span style={{ fontSize: "14px", color: "#484f58" }}>
            meridian.ipr.northwestern.edu
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
