import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { Results } from "@/components/search/Results";
import { getPublishedPage } from "@/lib/page-config";
type Params = { destination?: string; type?: string };
const routePage = (p: Params) =>
  p.type === "villa"
    ? "villas"
    : p.type === "resort"
      ? "resorts"
      : p.type === "homestay"
        ? "homestays"
        : p.destination
          ? "search"
          : "hotels";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const page = await getPublishedPage(routePage(await searchParams));
  const seo = page.published.seo || {};
  return {
    title: seo.title || undefined,
    description: seo.description || undefined,
    alternates: seo.canonical ? { canonical: seo.canonical } : undefined,
    robots: seo.noindex ? { index: false, follow: false } : undefined,
  };
}
export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const page = await getPublishedPage(routePage(p));
  return (
    <Shell>
      <PageRenderer page={page} />
      <Results destination={p.destination} type={p.type} />
    </Shell>
  );
}
