import Link from "next/link";
import { BedDouble, MapPin } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className="group flex items-center gap-2" aria-label="StayHaven home">
    <span className="relative grid size-10 place-items-center rounded-[14px] bg-gradient-to-br from-sky-400 to-blue-900 text-white shadow-md"><MapPin className="size-7"/><BedDouble className="absolute size-4"/></span>
    <span><span className={`block text-xl font-black tracking-tight ${light ? "text-white" : "text-navy"}`}>Stay<span className="text-orange">Haven</span></span><span className={`block text-[6px] font-bold tracking-[.2em] ${light ? "text-slate-300" : "text-blue-800"}`}>HOTELS • VILLAS • RESORTS</span></span>
  </Link>;
}
