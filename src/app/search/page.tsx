import { ConfiguredListingPage } from "@/components/page-builder/ConfiguredListingPage";
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string; type?: string; keyword?: string; minPrice?: string; maxPrice?: string; page?: string }>;
}) {
  const p = await searchParams;
  return (
    <ConfiguredListingPage
      pageSlug="search"
      destination={p.destination}
      type={p.type}
      keyword={p.keyword}
      minPrice={p.minPrice}
      maxPrice={p.maxPrice}
      page={p.page}
    />
  );
}
