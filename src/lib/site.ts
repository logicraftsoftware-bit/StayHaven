import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { siteConfig as localFallback } from "@/config/site";
import type { SiteConfig } from "@/types/site";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function hostnameFromHeader(value: string | null): string {
  const first = (value || "").split(",")[0].trim().toLowerCase();
  return first.replace(/^https?:\/\//, "").split("/")[0].split(":")[0].replace(/\.$/, "");
}

function apiBase(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_ADMIN_API_URL ||
    "http://127.0.0.1:5001"
  ).replace(/\/$/, "");
}

export async function getCurrentSite(): Promise<SiteConfig> {
  const requestHeaders = await headers();
  const hostname = hostnameFromHeader(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );
  if (LOCAL_HOSTS.has(hostname) || !hostname) return localFallback;

  const response = await fetch(`${apiBase()}/api/v1/sites/current`, {
    headers: { "x-forwarded-host": hostname },
    next: { revalidate: 300, tags: [`site:${hostname}`] },
  }).catch(() => null);
  if (!response?.ok) notFound();
  const payload = (await response.json()) as { data?: SiteConfig };
  if (!payload.data) notFound();
  return payload.data;
}

export function canonicalUrl(site: SiteConfig): URL {
  return new URL(`https://${site.domain}`);
}
