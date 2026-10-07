/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  Check,
  ChevronRight,
  MapPin,
  Ruler,
  Users,
} from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { PropertyReviews } from "@/components/hotel/PropertyReviews";
import { StaySearchBar } from "@/components/booking/StaySearchBar";
import { canonicalUrl, getCurrentSite } from "@/lib/site";
import {
  coverFor,
  getPublicAvailability,
  getPublicProperty,
  mediaUrl,
  startingRate,
} from "@/lib/public-marketplace";
import type { PublicMedia, PublicRoom } from "@/types/public-property";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string; rooms?: string; adults?: string; children?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [property, site] = await Promise.all([
    getPublicProperty(slug),
    getCurrentSite(),
  ]);
  if (!property)
    return { title: "Property not found", robots: { index: false } };
  const title =
    property.seo?.title ||
    `${property.displayName || property.name} in ${property.city}`;
  const description =
    property.seo?.description ||
    property.description ||
    `View rooms, amenities and stay information for ${property.name}.`;
  const canonical = new URL(
    `/hotels/${property.slug}`,
    canonicalUrl(site),
  ).toString();
  const image = coverFor(property);
  return {
    title,
    description,
    keywords: property.seo?.keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
function imageMedia(media: PublicMedia[] = []) {
  return media.filter((item) => item.mediaType !== "video" && mediaUrl(item));
}
function roomImages(room: PublicRoom, all: PublicMedia[]) {
  const own = imageMedia(room.media);
  if (own.length) return own;
  const name = (room.name || "").toLowerCase();
  return imageMedia(all).filter(
    (item) =>
      item.category?.toLowerCase() === "room" ||
      item.tags?.some((tag) => tag.toLowerCase() === name),
  );
}
const yesNo = (value?: boolean) =>
  value ? "Attached bathroom" : "Shared / no attached bathroom";
export default async function PropertyDetail({ params, searchParams }: Props) {
  const { slug } = await params;
  const search = await searchParams;
  const [property, site] = await Promise.all([
    getPublicProperty(slug),
    getCurrentSite(),
  ]);
  if (!property) notFound();
  const images = imageMedia(property.media);
  const hero = coverFor(property);
  const rate = startingRate(property);
  const rooms = property.roomDetails || [];
  const indianToday = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const dateAfter = (dateString: string, days: number) => { const date = new Date(`${dateString}T12:00:00`); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
  const today = `${indianToday.getFullYear()}-${String(indianToday.getMonth() + 1).padStart(2, "0")}-${String(indianToday.getDate()).padStart(2, "0")}`;
  const tomorrow = dateAfter(today, 1);
  const checkIn = /^\d{4}-\d{2}-\d{2}$/.test(search.checkIn || "") && (search.checkIn || "") >= tomorrow ? search.checkIn! : tomorrow;
  const checkOut = /^\d{4}-\d{2}-\d{2}$/.test(search.checkOut || "") && (search.checkOut || "") > checkIn ? search.checkOut! : dateAfter(checkIn, 1);
  const adults = Math.min(30, Math.max(1, Number.parseInt(search.adults || search.guests || "2", 10) || 2));
  const children = Math.min(30, Math.max(0, Number.parseInt(search.children || "0", 10) || 0));
  const selectedRooms = Math.min(20, Math.max(1, Number.parseInt(search.rooms || "1", 10) || 1));
  const guests = adults + children;
  const availability = await getPublicAvailability(property.slug, checkIn, checkOut, guests);
  const structured = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.displayName || property.name,
    description: property.description,
    image: images.map(mediaUrl),
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      addressCountry: property.country,
    },
    url: new URL(`/hotels/${property.slug}`, canonicalUrl(site)).toString(),
    priceRange: rate ? `₹${rate}+` : undefined,
  };
  return (
    <Shell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <main className="property-public">
        <div className="container">
          <StaySearchBar propertyName={property.displayName || property.name} action={`/hotels/${encodeURIComponent(property.slug)}`} initial={{ checkIn, checkOut, rooms: selectedRooms, adults, children }} />
          <nav className="property-breadcrumb">
            <span>{site.name}</span>
            <ChevronRight />
            <span>{property.propertyType}</span>
            <ChevronRight />
            <b>{property.displayName || property.name}</b>
          </nav>
          <header className="property-hero-heading">
            <div>
              <p className="market-eyebrow">
                VERIFIED {property.propertyType.toUpperCase()}
              </p>
              <h1>{property.displayName || property.name}</h1>
              <span>
                <MapPin />
                {[property.address, property.city, property.state]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
            {rate > 0 && (
              <div>
                <small>Rooms from</small>
                <strong>₹{rate.toLocaleString("en-IN")}</strong>
                <span>per night</span>
              </div>
            )}
          </header>
          <div className="property-showcase">
          <section
            className={`property-gallery ${images.length < 3 ? "compact" : ""}`}
          >
            {hero ? (
              <div className="property-gallery-main">
                <Image
                  src={hero}
                  alt={property.displayName || property.name}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 68vw"
                />
              </div>
            ) : (
              <div className="property-gallery-empty">Photos coming soon</div>
            )}
            {images
              .filter((item) => mediaUrl(item) !== hero)
              .slice(0, 4)
              .map((item, index) => (
                <figure key={item.id || mediaUrl(item)}>
                  <Image
                    src={mediaUrl(item)}
                    alt={item.caption || `${property.name} view ${index + 2}`}
                    fill
                    sizes="(max-width: 900px) 50vw, 18vw"
                  />
                  <figcaption>{item.caption}</figcaption>
                </figure>
              ))}
          </section>
          <div className="property-booking-card">
            <p className="market-eyebrow">YOUR STAY STARTS HERE</p>
            <h2>{rooms[0]?.name || property.propertyType}</h2>
            <p>{rooms.length} {rooms.length === 1 ? "room type" : "room types"} to explore</p>
            {rate > 0 && <div className="property-booking-price"><small>Starting from</small><strong>₹{rate.toLocaleString("en-IN")}</strong><span>per night</span></div>}
            <a href="#rooms" className="property-booking-action">View rooms &amp; rates</a>
            <span className="property-booking-caption">Check live prices and inventory below.</span>
          </div>
          </div>
          <nav className="property-section-nav" aria-label="Property sections">
            <a href="#overview">Overview</a>
            <a href="#rooms">Rooms &amp; rates</a>
            <a href="#amenities">Amenities</a>
            <a href="#policies">Policies</a>
            <a href="#reviews">Guest reviews</a>
          </nav>
          <div className="property-public-layout property-public-layout-full">
            <div className="property-public-content">
              <section className="property-intro" id="overview">
                <p className="market-eyebrow">WELCOME TO YOUR STAY</p>
                <h2>A place to slow down and feel at home</h2>
                <p>
                  {property.description ||
                    "Thoughtful accommodation, comfortable spaces and warm hospitality await."}
                </p>
                <div className="property-quick-facts">
                  <span>
                    <BedDouble />
                    <b>{rooms.length || property.rooms || 0}</b> room types
                  </span>
                  <span>
                    <Users />
                    <b>{property.maxGuests || "Flexible"}</b> guest capacity
                  </span>
                  <span>
                    <MapPin />
                    <b>{property.city}</b> local stay
                  </span>
                </div>
              </section>
              <section className="property-section" id="amenities">
                <div className="property-section-heading">
                  <p className="market-eyebrow">WHAT YOU'LL LOVE</p>
                  <h2>Amenities & highlights</h2>
                </div>
                <div className="property-amenities-public">
                  {(property.amenities || []).map((item) => (
                    <span key={item}>
                      <Check />
                      {item}
                    </span>
                  ))}
                </div>
              </section>
              <section className="property-section" id="rooms">
                <StaySearchBar action={`/hotels/${encodeURIComponent(property.slug)}`} initial={{ checkIn, checkOut, rooms: selectedRooms, adults, children }} compact />
                <div className="property-section-heading">
                  <p className="market-eyebrow">CHOOSE YOUR STAY</p>
                  <h2>Rooms &amp; rates</h2>
                  <span>{rooms.length} options</span>
                </div>
                {!availability && <p className="property-rate-message">Live availability is temporarily unavailable. Please try searching again.</p>}
                {availability?.status === "NOT_CONFIGURED" && <p className="property-rate-message">{availability.message || "Online booking is not configured for these rooms yet."}</p>}
                <div className="public-room-list">
                  {rooms.map((room, index) => {
                    const photos = roomImages(room, property.media || []);
                    const roomRate = Number(
                      room.baseRate || room.price || property.price || 0,
                    );
                    const roomId = String(room.id || room._id || index);
                    const liveRoom = availability?.rooms.find((item) => item.roomId === roomId);
                    const fitsGuests = (!room.maxAdults || adults <= room.maxAdults * selectedRooms) && (room.maxChildren === undefined || children <= room.maxChildren * selectedRooms);
                    const bookable = availability?.status === "CONFIGURED" && liveRoom?.status === "AVAILABLE" && liveRoom.availableInventory >= selectedRooms && fitsGuests;
                    const includedAdults = Math.max(1, Number(room.baseAdults || 2)) * selectedRooms;
                    const estimatedTotal = Number(liveRoom?.totalRate || 0) * selectedRooms + Math.max(0, adults - includedAdults) * Number(room.additionalAdultPrice || 0) * Number(availability?.nights || 1) + children * Number(room.additionalChildPrice || 0) * Number(availability?.nights || 1) + Number(property.taxes || 0);
                    return (
                      <article key={room.id || room._id || index}>
                        {photos[0] ? (
                          <div className="public-room-image">
                            <Image
                              src={mediaUrl(photos[0])}
                              alt={room.name || `Room ${index + 1}`}
                              fill
                              sizes="(max-width: 800px) 100vw, 360px"
                            />
                          </div>
                        ) : (
                          <div className="public-room-image empty">
                            <BedDouble />
                          </div>
                        )}
                        <div className="public-room-body">
                          <header>
                            <div>
                              <small>
                                ROOM {String(index + 1).padStart(2, "0")}
                              </small>
                              <h3>{room.name || `Room ${index + 1}`}</h3>
                            </div>
                            {roomRate > 0 && (
                              <p>
                                <strong>
                                  ₹{roomRate.toLocaleString("en-IN")}
                                </strong>{" "}
                                / night
                              </p>
                            )}
                          </header>
                          {room.description && <p>{room.description}</p>}
                          <div className="public-room-facts">
                            <span>
                              <Users />
                              {room.baseAdults || 2}–
                              {room.maxAdults || room.baseAdults || 2} adults
                            </span>
                            <span>
                              <BedDouble />
                              {room.beds
                                ?.map(
                                  (bed) =>
                                    `${bed.quantity || 1} ${bed.type || "bed"}`,
                                )
                                .join(", ") || "Bed configured"}
                            </span>
                            {room.size && (
                              <span>
                                <Ruler />
                                {room.size} sq. ft.
                              </span>
                            )}
                            <span>
                              <Bath />
                              {yesNo(room.attachedBathroom)}
                            </span>
                          </div>
                          <div className="market-card-tags">
                            {(room.facilities || []).slice(0, 6).map((item) => (
                              <span key={item}>{item}</span>
                            ))}
                          </div>
                        </div>
                        <div className="public-room-booking">
                          <small>{bookable ? `${liveRoom.availableInventory} available for your dates` : !fitsGuests ? "Select more rooms for your guests" : liveRoom?.status === "UNAVAILABLE" || (liveRoom?.availableInventory || 0) < selectedRooms ? "Not enough rooms for your dates" : "Live rate unavailable"}</small>
                          {roomRate > 0 && <strong>₹{roomRate.toLocaleString("en-IN")}</strong>}
                          {roomRate > 0 && <span>per night</span>}
                          {bookable && <><p>₹{estimatedTotal.toLocaleString("en-IN")} estimated total · {selectedRooms} {selectedRooms === 1 ? "room" : "rooms"} · {availability.nights} {availability.nights === 1 ? "night" : "nights"}</p><a href={`/booking/${encodeURIComponent(property.slug)}?roomId=${encodeURIComponent(roomId)}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${selectedRooms}&adults=${adults}&children=${children}&guests=${guests}`}>Book now</a></>}
                          {!bookable && <button type="button" disabled>{liveRoom?.status === "UNAVAILABLE" ? "Sold out" : "Booking unavailable"}</button>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
              <section className="property-section property-location-section" id="location">
                <div className="property-section-heading"><p className="market-eyebrow">FIND US</p><h2>Location</h2></div>
                <div className="property-location-card"><MapPin /><div><small>PROPERTY ADDRESS</small><h3>{[property.city, property.state].filter(Boolean).join(", ")}</h3><p>{property.address}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([property.address, property.city, property.state].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer">View on map</a></div></div>
              </section>
              <section className="property-section" id="policies">
                <div className="property-section-heading">
                  <p className="market-eyebrow">GOOD TO KNOW</p>
                  <h2>Policies & house rules</h2>
                </div>
                <div className="public-policies">
                  {Object.entries(property.policies || {})
                    .filter(([, value]) => value !== "" && value !== undefined)
                    .slice(0, 12)
                    .map(([key, value]) => (
                      <div key={key}>
                        <span>{key.replace(/([A-Z])/g, " $1")}</span>
                        <b>
                          {typeof value === "boolean"
                            ? value
                              ? "Yes"
                              : "No"
                            : String(value)}
                        </b>
                      </div>
                    ))}
                </div>
              </section>
              <PropertyReviews propertyId={property._id} slug={property.slug} />
            </div>
          </div>
        </div>
      </main>
    </Shell>
  );
}
