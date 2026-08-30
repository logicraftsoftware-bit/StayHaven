"use client";

import { createContext, useContext, type CSSProperties } from "react";
import type { SiteConfig } from "@/types/site";
import { resolveSiteTheme } from "@/lib/site-theme";

const SiteContext = createContext<SiteConfig | null>(null);

export function SiteProvider({ site, children }: { site: SiteConfig; children: React.ReactNode }) {
  const theme = resolveSiteTheme(site.theme);
  const themedSite = { ...site, theme };
  const style = { "--site-primary": theme.primaryColor, "--site-secondary": theme.secondaryColor, "--site-dark": theme.dark || "#111315", "--site-heading-font": theme.headingFontFamily, "--site-body-font": theme.bodyFontFamily, "--site-radius": theme.borderRadius, "--site-button-radius": theme.buttonRadius, "--site-spacing": theme.spacingScale, "--site-container-width": theme.containerWidth } as CSSProperties;
  return <SiteContext.Provider value={themedSite}><div className={`site-theme site-theme-${theme.preset}`} style={style}>{children}</div></SiteContext.Provider>;
}

export function useSite(): SiteConfig {
  const site = useContext(SiteContext);
  if (!site) throw new Error("useSite must be used inside SiteProvider");
  return site;
}
