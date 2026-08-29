"use client";

import { createContext, useContext } from "react";
import type { SiteConfig } from "@/types/site";

const SiteContext = createContext<SiteConfig | null>(null);

export function SiteProvider({ site, children }: { site: SiteConfig; children: React.ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteConfig {
  const site = useContext(SiteContext);
  if (!site) throw new Error("useSite must be used inside SiteProvider");
  return site;
}
