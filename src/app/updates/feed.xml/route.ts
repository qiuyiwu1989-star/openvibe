import { getUpdateHistory } from "@/lib/update-history";

export const dynamic = "force-static";

export function GET() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const entries = getUpdateHistory();
  const items = entries.map((entry) => {
    const link = entry.projectSlug
      ? `${siteUrl}/projects/${entry.projectSlug}`
      : `${siteUrl}/updates`;
    return [
      "<item>",
      `<title>${escapeXml(entry.title)}</title>`,
      `<link>${escapeXml(link)}</link>`,
      `<guid isPermaLink="false">${escapeXml(entry.id)}</guid>`,
      `<pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate>`,
      `<description>${escapeXml(entry.summary)}</description>`,
      "</item>",
    ].join("");
  }).join("");
  const lastBuildDate = entries[0]
    ? new Date(entries[0].publishedAt).toUTCString()
    : new Date(0).toUTCString();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    "<title>OpenVibe 更新</title>",
    `<link>${escapeXml(`${siteUrl}/updates`)}</link>`,
    "<description>已审核的新作品任务、项目信息变化与风险提示。</description>",
    `<atom:link href="${escapeXml(`${siteUrl}/updates/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    `<lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    items,
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);
}
