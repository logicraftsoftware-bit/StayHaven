"use client";
import Link from "next/link";
import { useSite } from "@/components/site/SiteProvider";

export function Brand({ light = false }: { light?: boolean }) {
  const site = useSite();
  return <Link href="/" className={`brand-logo ${light ? "brand-logo-light" : ""}`} aria-label={`${site.name} home`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={site.logo || "/logo.png"} alt={site.name} className="h-auto w-full object-contain" />
  </Link>;
}
