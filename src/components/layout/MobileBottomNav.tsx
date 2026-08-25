"use client";
import Link from "next/link";
import { CalendarCheck, CircleUserRound, House, Search, Tag } from "lucide-react";
import { usePathname } from "next/navigation";
const items = [["Home", "/", House], ["Search", "/hotels", Search], ["Bookings", "/booking/1", CalendarCheck], ["Offers", "/#offers", Tag], ["Profile", "/login", CircleUserRound]] as const;
export function MobileBottomNav(){const path=usePathname();return <nav className="fixed inset-x-0 bottom-0 z-50 flex h-17 items-center justify-around border-t bg-white px-2 shadow-[0_-4px_20px_#082b6314] lg:hidden">{items.map(([name,href,Icon])=><Link key={name} href={href} className={`flex min-w-14 flex-col items-center gap-1 text-[10px] font-bold ${path===href?"text-blue":"text-slate-500"}`}><Icon className="size-5"/><span>{name}</span></Link>)}</nav>}
