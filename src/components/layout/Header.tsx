"use client";
import Link from "next/link";
import { Globe2, Heart, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";

const links = ["Home", "Hotels", "Villas", "Resorts", "Apartments", "Homestays", "Offers", "Explore"];
export function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return <><header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="container flex h-18 items-center justify-between">
      <button className="icon-btn lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu/></button>
      <Brand />
      <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">{links.map((x) => <Link key={x} className="nav-link" href={x === "Home" ? "/" : x === "Hotels" ? "/hotels" : `/#${x.toLowerCase()}`}>{x}</Link>)}</nav>
      <div className="flex items-center gap-2"><button className="hidden items-center gap-1 text-sm md:flex"><Globe2 className="size-4"/> EN · INR</button><Link href="/wishlist" className="icon-btn" aria-label="Wishlist"><Heart/></Link><Link href="/login" className="btn-primary hidden sm:inline-flex">Sign in</Link></div>
    </div>
  </header>{open && <div className="fixed inset-0 z-[100] bg-slate-950/60 lg:hidden" onClick={() => setOpen(false)}><aside role="dialog" aria-modal="true" aria-label="Mobile menu" className="h-dvh w-[84%] max-w-sm overflow-y-auto bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-7 flex items-center justify-between"><Brand/><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu"><X/></button></div><nav className="grid gap-1">{[...links, "My Bookings", "Sign In"].map(x => <Link onClick={() => setOpen(false)} key={x} href={x === "Home" ? "/" : x === "Hotels" ? "/hotels" : x === "Sign In" ? "/login" : `/#${x.toLowerCase().replace(" ", "-")}`} className="rounded-xl px-4 py-3 font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue">{x}</Link>)}</nav></aside></div>}</>;
}
