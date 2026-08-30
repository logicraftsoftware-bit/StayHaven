import { headers } from "next/headers";
import type { PageSectionType, PublishedPageConfig } from "@/types/site";

const homeSections = [
  "hero",
  "search",
  "property-categories",
  "promotional-banner",
  "destinations",
  "featured-properties",
  "why-choose-us",
  "cta",
] as PageSectionType[];
const fallback = (page: string): PublishedPageConfig => ({
  pageSlug: page,
  enabled: true,
  preset: page === "home" ? "DEFAULT_HOME" : "NONE",
  published: {
    seo: {},
    sections:
      page === "home"
        ? homeSections.map((type, order) => ({
            id: `${type}-${order + 1}`,
            type,
            enabled: true,
            order,
            config: {},
          }))
        : [],
  },
});
const hostname = (value: string | null) =>
  (value || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];

export async function getPublishedPage(
  page = "home",
): Promise<PublishedPageConfig> {
  const h = await headers();
  const host = hostname(h.get("x-forwarded-host") || h.get("host"));
  if (!host || ["localhost", "127.0.0.1"].includes(host)) return fallback(page);
  const base = (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:5001"
  ).replace(/\/$/, "");
  const response = await fetch(`${base}/api/v1/sites/current/pages/${page}`, {
    headers: { "x-forwarded-host": host },
    next: { revalidate: 300, tags: [`page:${host}:${page}`] },
  }).catch(() => null);
  if (!response?.ok) return fallback(page);
  const payload = (await response.json()) as { data?: PublishedPageConfig };
  return payload.data?.published?.sections ? payload.data : fallback(page);
}
