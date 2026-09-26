import Link from "next/link";
import { MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { getPublicProperties, getPublicPropertyTypes } from "@/lib/public-marketplace";
import { getCurrentSite } from "@/lib/site";
import { PublicPropertyCard } from "./PublicPropertyCard";

export async function Results({ destination, type, keyword, minPrice, maxPrice, page = "1" }: { destination?: string; type?: string; keyword?: string; minPrice?: string; maxPrice?: string; page?: string }) {
  const [site, result, types] = await Promise.all([
    getCurrentSite(),
    getPublicProperties({ city: destination, type, keyword, minPrice, maxPrice, page, limit: "12" }),
    getPublicPropertyTypes(),
  ]);
  const current = result.pagination.page;
  return <section className="marketplace-section"><div className="container">
    <div className="marketplace-heading"><div><p className="market-eyebrow">EXPLORE {site.city?.toUpperCase() || "STAYS"}</p><h1>{result.pagination.total} {result.pagination.total === 1 ? "property" : "properties"} to explore</h1><p>Compare local stays, room options and prices in one place.</p></div><span><ShieldCheck size={17}/> Verified listings</span></div>
    <form className="market-search" action="/hotels"><label><Search/><input name="keyword" defaultValue={keyword} placeholder="Search property or location" /></label><input name="destination" defaultValue={destination} placeholder="City or destination"/><select name="type" defaultValue={type || "all"}><option value="all">All stay types</option>{types.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}</select><button type="submit"><Search/> Search</button></form>
    <div className="market-layout"><aside className="market-filters"><div className="market-filter-map"><MapPin/><span>Explore stays around {destination || site.city || "the city"}</span></div><p>FILTER YOUR STAY</p><h2>Refine results</h2><form action="/hotels"><input type="hidden" name="keyword" value={keyword || ""}/><input type="hidden" name="destination" value={destination || ""}/><label>Property type<select name="type" defaultValue={type || "all"}><option value="all">All types</option>{types.map((item) => <option key={item._id} value={item.name}>{item.name}</option>)}</select></label><div className="market-price-row"><label>Minimum price<input type="number" min="0" name="minPrice" defaultValue={minPrice} placeholder="₹0"/></label><label>Maximum price<input type="number" min="0" name="maxPrice" defaultValue={maxPrice} placeholder="Any"/></label></div><button><SlidersHorizontal/> Apply filters</button><Link className="market-clear-filters" href="/hotels">Clear all filters</Link></form></aside>
    <div className="market-results"><div className="market-results-head"><div><b>Available stays</b><span>{result.pagination.total} results · prices shown per night</span></div><span>View a property to check room availability</span></div>{result.data.length ? <div className="market-grid">{result.data.map((property) => <PublicPropertyCard key={property._id} property={property}/>)}</div> : <div className="market-empty"><Search/><h2>No properties found</h2><p>Try a different city, property type or a broader price range.</p><Link href="/hotels">Clear all filters</Link></div>}{result.pagination.totalPages > 1 && <nav className="market-pagination" aria-label="Results pages">{Array.from({ length: result.pagination.totalPages }, (_, index) => index + 1).map((value) => <Link className={value === current ? "active" : ""} key={value} href={`/hotels?page=${value}${type ? `&type=${encodeURIComponent(type)}` : ""}${destination ? `&destination=${encodeURIComponent(destination)}` : ""}`}>{value}</Link>)}</nav>}</div></div>
  </div></section>;
}
