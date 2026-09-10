"use client";
import Link from "next/link";
import { CalendarDays, ChevronDown, Heart, LogOut, Menu, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Brand } from "./Brand";
import { useSite } from "@/components/site/SiteProvider";
import { CUSTOMER_AUTH_EVENT, CUSTOMER_TOKEN, CustomerAuthModal } from "@/components/customer/CustomerAuth";
import { apiRequest } from "@/lib/api-client";

const links = ["Home", "Hotels", "Villas", "Resorts", "Homestays"];
const hrefFor = (label:string) => label === "Home" ? "/" : `/hotels?type=${label.toLowerCase().replace(/s$/, "")}`;
const authSubscribe = (callback:()=>void) => {
  window.addEventListener("storage",callback);
  window.addEventListener(CUSTOMER_AUTH_EVENT,callback);
  return () => { window.removeEventListener("storage",callback); window.removeEventListener(CUSTOMER_AUTH_EVENT,callback); };
};
const authSnapshot = () => localStorage.getItem(CUSTOMER_TOKEN) || "";
const authServerSnapshot = () => "";
type Customer = { name?: string };

export function Header() {
  const site=useSite(), variant=site.theme.headerStyle||"default";
  const [open,setOpen]=useState(false),[authOpen,setAuthOpen]=useState(false),[profileOpen,setProfileOpen]=useState(false),[customer,setCustomer]=useState<Customer|null>(null);
  const token=useSyncExternalStore(authSubscribe,authSnapshot,authServerSnapshot);
  const closeAuth=useCallback(()=>setAuthOpen(false),[]);
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
  useEffect(()=>{if(!token){return}let active=true;apiRequest<{data:Customer}>("/api/v1/customer/me",token).then(response=>{if(active)setCustomer(response.data)}).catch(()=>{localStorage.removeItem(CUSTOMER_TOKEN);window.dispatchEvent(new Event(CUSTOMER_AUTH_EVENT))});return()=>{active=false}},[token]);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("login")==="1")window.setTimeout(()=>setAuthOpen(true),0)},[]);
  const logout=()=>{localStorage.removeItem(CUSTOMER_TOKEN);setCustomer(null);setProfileOpen(false);window.dispatchEvent(new Event(CUSTOMER_AUTH_EVENT))};
  const name=customer?.name?.trim()||"Guest", initial=name.charAt(0).toUpperCase();
  return <><header className={`site-header site-header-${variant} sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur`}><div className="container site-header-inner flex h-18 items-center justify-between">
    <button className="icon-btn lg:hidden" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu/></button><Brand/>
    <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">{links.map(link=><Link key={link} className="nav-link" href={hrefFor(link)}>{link}</Link>)}</nav>
    <div className="header-actions"><Link href="/wishlist" className="icon-btn" aria-label="Wishlist"><Heart/></Link><Link href="/list-your-property" className="owner-btn hidden lg:inline-flex">List Your Property</Link>
      {!token?<button className="btn-primary header-login-button hidden sm:inline-flex" onClick={()=>setAuthOpen(true)}>Login or Create Account</button>:<div className="header-profile-wrap"><button className="header-profile-button" onClick={()=>setProfileOpen(!profileOpen)} aria-expanded={profileOpen}><span>{initial}</span><b>{name}</b><ChevronDown/></button>{profileOpen&&<div className="header-profile-menu"><p>You are viewing your personal profile</p><Link href="/account" onClick={()=>setProfileOpen(false)}><UserRound/><span><b>My profile</b><small>Manage account and personal details</small></span></Link><Link href="/wishlist" onClick={()=>setProfileOpen(false)}><Heart/><span><b>Wishlist</b><small>Review your saved stays</small></span></Link><Link href="/account" onClick={()=>setProfileOpen(false)}><CalendarDays/><span><b>My trips</b><small>See your current and past bookings</small></span></Link><button onClick={logout}><LogOut/> Logout</button></div>}</div>}
    </div>
  </div></header>
  {open&&<div className="fixed inset-0 z-[100] bg-slate-950/60 lg:hidden" onClick={()=>setOpen(false)}><aside role="dialog" aria-modal="true" aria-label="Mobile menu" className="h-dvh w-[84%] max-w-sm overflow-y-auto bg-white p-6 shadow-2xl" onClick={event=>event.stopPropagation()}><div className="mb-7 flex items-center justify-between"><Brand/><button className="icon-btn" onClick={()=>setOpen(false)} aria-label="Close menu"><X/></button></div><nav className="grid gap-1">{links.map(link=><Link onClick={()=>setOpen(false)} key={link} href={hrefFor(link)} className="rounded-xl px-4 py-3 font-semibold hover:bg-red-50">{link}</Link>)}<hr className="my-3 border-slate-200"/><Link onClick={()=>setOpen(false)} href="/list-your-property" className="rounded-xl border border-maroon px-4 py-3 font-bold text-maroon">List Your Property</Link><hr className="my-3 border-slate-200"/>{token?<><Link onClick={()=>setOpen(false)} href="/account" className="mobile-profile-link"><span>{initial}</span><b>{name}</b></Link><button className="mobile-logout" onClick={()=>{setOpen(false);logout()}}><LogOut/> Logout</button></>:<button onClick={()=>{setOpen(false);setAuthOpen(true)}} className="rounded-xl bg-charcoal px-4 py-3 text-center font-bold text-white">Login or Create Account</button>}</nav></aside></div>}
  <CustomerAuthModal open={authOpen} onClose={closeAuth} onAuthenticated={data=>setCustomer(data)}/>
  </>;
}
