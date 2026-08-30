import { ConfiguredListingPage } from "@/components/page-builder/ConfiguredListingPage";
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string; type?: string }>;
}) {
  const p = await searchParams;
  return (
    <ConfiguredListingPage
      pageSlug="search"
      destination={p.destination}
      type={p.type}
    />
  );
}
