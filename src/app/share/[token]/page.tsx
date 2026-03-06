// @page SharedCampaign — Read-only campaign view for shared links
import type { Metadata } from "next";
import { SharedCampaignClient } from "./client";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/share/${params.token}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        title: "Shared Campaign — Meridian",
        description: "This shared link is no longer available.",
      };
    }
    const data = await res.json();
    return {
      title: `${data.campaign.title} — Meridian`,
      description: `Campaign strategy and content plan for "${data.campaign.title}" — shared via Meridian by Northwestern IPR.`,
      openGraph: {
        title: `${data.campaign.title} — Meridian`,
        description: `Campaign strategy and content plan shared via Meridian.`,
        type: "article",
        images: [
          {
            url: `${baseUrl}/api/og?title=${encodeURIComponent(data.campaign.title)}`,
            width: 1200,
            height: 630,
            alt: `${data.campaign.title} — Meridian`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${data.campaign.title} — Meridian`,
        description: `Campaign strategy and content plan shared via Meridian.`,
        images: [`${baseUrl}/api/og?title=${encodeURIComponent(data.campaign.title)}`],
      },
    };
  } catch {
    return {
      title: "Shared Campaign — Meridian",
    };
  }
}

export default function SharedCampaignPage({ params }: Props) {
  return <SharedCampaignClient token={params.token} />;
}
