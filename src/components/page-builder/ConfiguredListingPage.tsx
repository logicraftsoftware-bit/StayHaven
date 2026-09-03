import { Shell } from "@/components/layout/Shell";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { Results } from "@/components/search/Results";
import { getPublishedPage } from "@/lib/page-config";
export async function ConfiguredListingPage({
  pageSlug,
  type,
  destination,
  keyword,
  minPrice,
  maxPrice,
  page: pageNumber,
}: {
  pageSlug: string;
  type?: string;
  destination?: string;
  keyword?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
}) {
  const page = await getPublishedPage(pageSlug);
  return (
    <Shell>
      <PageRenderer page={page} />
      <Results type={type} destination={destination} keyword={keyword} minPrice={minPrice} maxPrice={maxPrice} page={pageNumber} />
    </Shell>
  );
}
