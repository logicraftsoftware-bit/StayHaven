"use client";
import Link from "next/link";
import { CalendarCheck, Heart, House, Search } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  ["Home", "/", House],
  ["Search", "/hotels", Search],
  ["Bookings", "/account#trips", CalendarCheck],
  ["Wishlist", "/wishlist", Heart],
] as const;
export function MobileBottomNav() {
  const path = usePathname();
  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Mobile navigation">
      {items.map(([name, href, Icon]) => {
        const target = href.split("#")[0],
          active = target === "/" ? path === "/" : path.startsWith(target);
        return (
          <Link key={name} href={href} className={active ? "active" : ""}>
            <Icon />
            <span>{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
