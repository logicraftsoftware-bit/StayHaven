import { headers } from "next/headers";
import type { PublicProperty, PublicPropertyResponse } from "@/types/public-property";

function base() { return (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://127.0.0.1:5001").replace(/\/$/, ""); }
async function siteHeaders() { const h = await headers(); return { "x-forwarded-host": h.get("x-forwarded-host") || h.get("host") || "localhost" }; }
export async function getPublicProperties(params: Record<string, string | undefined> = {}): Promise<PublicPropertyResponse> {
  const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const response = await fetch(`${base()}/api/v1/properties?${query}`, { headers: await siteHeaders(), cache: "no-store" }).catch(() => null);
  if (!response?.ok) return { success: false, data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
  return response.json();
}
export async function getPublicProperty(slug: string): Promise<PublicProperty | null> {
  const response = await fetch(`${base()}/api/v1/properties/${encodeURIComponent(slug)}`, { headers: await siteHeaders(), cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const payload = await response.json() as { data?: PublicProperty }; return payload.data || null;
}
export async function getPublicPropertyTypes(): Promise<Array<{ _id: string; name: string; slug: string }>> {
  const response = await fetch(`${base()}/api/v1/property-types`, { headers: await siteHeaders(), next: { revalidate: 300 } }).catch(() => null);
  if (!response?.ok) return []; const payload = await response.json() as { data?: Array<{ _id: string; name: string; slug: string }> }; return payload.data || [];
}
export function mediaUrl(media?: { url?: string; secureUrl?: string }) { return media?.secureUrl || media?.url || ""; }
export function coverFor(property: PublicProperty) { return mediaUrl(property.media?.find((item) => item.primary) || property.media?.find((item) => item.mediaType !== "video")); }
export function startingRate(property: PublicProperty) { const roomRates = (property.roomDetails || []).map((room) => Number(room.baseRate || room.price || 0)).filter((rate) => rate > 0); return roomRates.length ? Math.min(...roomRates) : Number(property.price || 0); }
