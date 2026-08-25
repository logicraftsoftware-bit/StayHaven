import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand-logo ${light ? "brand-logo-light" : ""}`} aria-label={`${siteConfig.name} home`}>
    <Image src={siteConfig.logo} alt={siteConfig.name} width={1600} height={533} priority className="h-auto w-full object-contain" />
  </Link>;
}
