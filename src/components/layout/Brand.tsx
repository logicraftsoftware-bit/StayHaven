import Image from "next/image";
import Link from "next/link";

export function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand-logo ${light ? "brand-logo-light" : ""}`} aria-label="StayHaven home">
    <Image src="/brand/stayhaven-logo.png" alt="StayHaven — Discover, Book, Explore" width={1983} height={793} priority className="h-auto w-full object-contain" />
  </Link>;
}
