import { notFound } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { PropertyReviews } from "@/components/hotel/PropertyReviews";
import { getPublicProperty } from "@/lib/public-marketplace";

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getPublicProperty(slug);
  if (!property) notFound();
  return <Shell><main className="container property-review-page"><Link href={`/hotels/${encodeURIComponent(slug)}`}>← Back to {property.displayName || property.name}</Link><h1>Share your stay at {property.displayName || property.name}</h1><PropertyReviews propertyId={property._id} slug={slug}/></main></Shell>;
}
