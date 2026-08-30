"use client";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useSite } from "@/components/site/SiteProvider";
import type { Hotel } from "@/types";
const KEY = "guwahati-homestay-wishlist";
export function HotelCard({ hotel }: { hotel: Hotel }) {
  const site = useSite(); const [liked, setLiked] = useState(false);
  useEffect(() => { queueMicrotask(() => setLiked(JSON.parse(localStorage.getItem(KEY) || "[]").includes(hotel.id))); }, [hotel.id]);
  const toggle = (event: React.MouseEvent) => { event.preventDefault(); const ids: string[] = JSON.parse(localStorage.getItem(KEY) || "[]"); const next = ids.includes(hotel.id) ? ids.filter((id) => id !== hotel.id) : [...ids, hotel.id]; localStorage.setItem(KEY, JSON.stringify(next)); setLiked(next.includes(hotel.id)); window.dispatchEvent(new Event("wishlist-change")); };
  return <Link href={`/hotels/${hotel.slug}`} className={`hotel-card hotel-card-${site.theme.cardStyle || "default"} group`}><div className="hotel-card-media relative aspect-[4/3] overflow-hidden"><Image src={hotel.images[0]} alt={hotel.name} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 768px) 85vw, 320px"/><button onClick={toggle} aria-label={liked ? "Remove from wishlist" : "Add to wishlist"} className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white/90 text-navy shadow"><Heart className={`size-5 ${liked ? "fill-orange text-orange" : ""}`}/></button></div><div className="hotel-card-content p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-bold text-slate-900">{hotel.name}</h3><span className="flex shrink-0 items-center gap-1 text-sm font-bold"><Star className="size-4 fill-gold text-gold"/>{hotel.rating}</span></div><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3"/>{hotel.location} · ({hotel.reviewCount.toLocaleString("en-IN")})</p><p className="mt-4 text-xl font-black text-navy">₹{hotel.pricePerNight.toLocaleString("en-IN")}<span className="text-xs font-normal text-slate-500"> / night</span></p><p className="text-xs text-slate-500">+₹{hotel.taxes.toLocaleString("en-IN")} taxes & fees</p>{hotel.freeCancellation && <span className="mt-3 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Free cancellation</span>}</div></Link>;
}
