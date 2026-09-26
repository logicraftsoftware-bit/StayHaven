import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { PublicProperty } from "@/types/public-property";
import { coverFor, startingRate } from "@/lib/public-marketplace";

export function PublicPropertyCard({ property }: { property: PublicProperty }) {
  const cover = coverFor(property);
  const rate = startingRate(property);
  const name = property.displayName || property.name;
  return <article className="market-card">
    <Link href={`/hotels/${property.slug}`} className="market-card-media" aria-label={`View ${name}`}>
      {cover ? <Image src={cover} alt={name} fill sizes="(max-width: 640px) 100vw, 260px" /> : <div className="market-card-placeholder"><Sparkles/><span>New stay</span></div>}
      <span className="market-card-type">{property.propertyType}</span>
    </Link>
    <div className="market-card-body"><div><h3><Link href={`/hotels/${property.slug}`}>{name}</Link></h3><p className="market-card-location"><MapPin/>{[property.city, property.state].filter(Boolean).join(", ")}</p></div><p className="market-card-description">{property.description || "Thoughtful accommodation and warm local hospitality await."}</p><div className="market-card-tags">{(property.amenities || []).slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div><p className="market-card-trust"><ShieldCheck/> Property details verified by Guwahati Homestay</p></div>
    <div className="market-card-price"><small>Starting from</small>{rate > 0 ? <><strong>₹{rate.toLocaleString("en-IN")}</strong><span>per room, per night</span></> : <strong>Rate on request</strong>}<Link href={`/hotels/${property.slug}`}>View rooms <ArrowRight/></Link></div>
  </article>;
}
