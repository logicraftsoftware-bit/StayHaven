import { Shell } from "@/components/layout/Shell";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { getPublishedPage } from "@/lib/page-config";
export async function ConfiguredContentPage({
  pageSlug,
  title,
  children,
}: {
  pageSlug: string;
  title: string;
  children: React.ReactNode;
}) {
  const page = await getPublishedPage(pageSlug);
  return (
    <Shell>
      <PageRenderer page={page} />
      {page.published.sections.length === 0 && (
        <section className="container page-builder-section content-page-fallback">
          <h1>{title}</h1>
          {children}
        </section>
      )}
    </Shell>
  );
}
