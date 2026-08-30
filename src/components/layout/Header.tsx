"use client";
import Link from "next/link";
import { Heart, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";
import { useSite } from "@/components/site/SiteProvider";

const links = ["Home", "Hotels", "Villas", "Resorts", "Homestays"];
const hrefFor = (label:string) => label === "Home" ? "/" : `/hotels?type=${label.toLowerCase().replace(/s$/, "")}`;

export function Header() {
  const site = useSite();
  const variant = site.theme.headerStyle || "default";
  const [open,setOpen]=useState(false);
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
  return <><header className={`site-header site-header-${variant} sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur`}><div className="container site-header-inner flex h-18 items-center justify-between">
    <button className="icon-btn lg:hidden" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu/></button><Brand/>
    <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">{links.map(x=><Link key={x} className="nav-link" href={hrefFor(x)}>{x}</Link>)}</nav>
    <div className="flex items-center gap-2"><Link href="/wishlist" className="icon-btn" aria-label="Wishlist"><Heart/></Link><Link href="/list-your-property" className="owner-btn hidden lg:inline-flex">List Your Property</Link><Link href="/login" className="btn-primary hidden sm:inline-flex">Login</Link></div>
  </div></header>
  {open&&<div className="fixed inset-0 z-[100] bg-slate-950/60 lg:hidden" onClick={()=>setOpen(false)}><aside role="dialog" aria-modal="true" aria-label="Mobile menu" className="h-dvh w-[84%] max-w-sm overflow-y-auto bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="mb-7 flex items-center justify-between"><Brand/><button className="icon-btn" onClick={()=>setOpen(false)} aria-label="Close menu"><X/></button></div><nav className="grid gap-1">{links.map(x=><Link onClick={()=>setOpen(false)} key={x} href={hrefFor(x)} className="rounded-xl px-4 py-3 font-semibold hover:bg-red-50">{x}</Link>)}<hr className="my-3 border-slate-200"/><Link onClick={()=>setOpen(false)} href="/list-your-property" className="rounded-xl border border-maroon px-4 py-3 font-bold text-maroon">List Your Property</Link><hr className="my-3 border-slate-200"/><Link onClick={()=>setOpen(false)} href="/login" className="rounded-xl bg-charcoal px-4 py-3 text-center font-bold text-white">Login</Link></nav></aside></div>}
  </>;
}
