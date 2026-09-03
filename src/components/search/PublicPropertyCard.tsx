import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, Sparkles } from "lucide-react";
import type { PublicProperty } from "@/types/public-property";
import { coverFor, startingRate } from "@/lib/public-marketplace";

export function PublicPropertyCard({ property }: { property: PublicProperty }) {
  const cover = coverFor(property); const rate = startingRate(property);
  return <article className="market-card"><Link href={`/hotels/${property.slug}`} className="market-card-media" aria-label={`View ${property.displayName || property.name}`}>{cover ? <Image src={cover} alt={property.displayName || property.name} fill sizes="(max-width: 768px) 92vw, 420px" /> : <div className="market-card-placeholder"><Sparkles/><span>New stay</span></div>}<span className="market-card-type">{property.propertyType}</span></Link><div className="market-card-body"><div><p className="market-card-location"><MapPin/>{[property.city, property.state].filter(Boolean).join(", ")}</p><h3><Link href={`/hotels/${property.slug}`}>{property.displayName || property.name}</Link></h3></div><p className="market-card-description">{property.description || "A verified stay with thoughtful spaces and warm local hospitality."}</p><div className="market-card-tags">{(property.amenities || []).slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div><footer><div>{rate > 0 ? <><strong>₹{rate.toLocaleString("en-IN")}</strong><small> / night</small></> : <strong>Rate on request</strong>}</div><Link href={`/hotels/${property.slug}`}>View property <ArrowUpRight/></Link></footer></div></article>;
}
