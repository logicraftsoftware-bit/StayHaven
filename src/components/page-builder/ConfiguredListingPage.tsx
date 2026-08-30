import { Shell } from "@/components/layout/Shell";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { Results } from "@/components/search/Results";
import { getPublishedPage } from "@/lib/page-config";
export async function ConfiguredListingPage({
  pageSlug,
  type,
  destination,
}: {
  pageSlug: string;
  type?: string;
  destination?: string;
}) {
  const page = await getPublishedPage(pageSlug);
  return (
    <Shell>
      <PageRenderer page={page} />
      <Results type={type} destination={destination} />
    </Shell>
  );
}
