import type { SiteCardStyle, SiteConfig, SiteFooterStyle, SiteHeaderStyle, SiteHeroSlide, SiteHeroStyle, SiteTheme, SiteThemePreset } from "@/types/site";

const presets: Record<SiteThemePreset, Required<Pick<SiteTheme, "primaryColor" | "secondaryColor" | "fontFamily" | "headerStyle" | "heroStyle" | "cardStyle" | "footerStyle">>> = {
  default: { primaryColor: "#8b0d18", secondaryColor: "#111315", fontFamily: "Inter", headerStyle: "default", heroStyle: "default", cardStyle: "default", footerStyle: "dark" },
  mountain: { primaryColor: "#25634a", secondaryColor: "#17251f", fontFamily: "Inter", headerStyle: "transparent", heroStyle: "mountain", cardStyle: "rounded", footerStyle: "dark" },
  modern: { primaryColor: "#1d4ed8", secondaryColor: "#111827", fontFamily: "Inter", headerStyle: "centered", heroStyle: "split-screen", cardStyle: "compact", footerStyle: "multi-column" },
  minimal: { primaryColor: "#18181b", secondaryColor: "#71717a", fontFamily: "Inter", headerStyle: "default", heroStyle: "minimal", cardStyle: "minimal", footerStyle: "minimal" },
};

const choices = {
  preset: new Set<SiteThemePreset>(["default", "mountain", "modern", "minimal"]),
  headerStyle: new Set<SiteHeaderStyle>(["default", "centered", "transparent", "overlay"]),
  heroStyle: new Set<SiteHeroStyle>(["default", "full-image", "video", "split-screen", "mountain", "minimal"]),
  cardStyle: new Set<SiteCardStyle>(["default", "rounded", "minimal", "image-overlay", "compact"]),
  footerStyle: new Set<SiteFooterStyle>(["default", "minimal", "multi-column", "dark"]),
};

const validColor = (value: unknown, fallback: string) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const safeToken = (value: unknown, fallback: string, pattern: RegExp) => typeof value === "string" && pattern.test(value.trim()) ? value.trim() : fallback;

export function resolveSiteTheme(input?: SiteTheme): SiteTheme {
  const preset = choices.preset.has(input?.preset as SiteThemePreset) ? input!.preset! : "default";
  const base = presets[preset];
  return { ...base, ...input, preset,
    primaryColor: validColor(input?.primaryColor ?? input?.primary, base.primaryColor),
    secondaryColor: validColor(input?.secondaryColor ?? input?.secondary, base.secondaryColor),
    headingFontFamily: safeToken(input?.headingFontFamily ?? input?.fontFamily, base.fontFamily, /^[\w\s,'-]{1,80}$/),
    bodyFontFamily: safeToken(input?.bodyFontFamily ?? input?.fontFamily, base.fontFamily, /^[\w\s,'-]{1,80}$/),
    borderRadius: safeToken(input?.borderRadius, "18px", /^\d+(\.\d+)?(px|rem)$/),
    buttonRadius: safeToken(input?.buttonRadius, "11px", /^\d+(\.\d+)?(px|rem|%)$/),
    spacingScale: safeToken(input?.spacingScale, "1", /^(0\.[5-9]|1(\.\d)?|2)$/),
    containerWidth: safeToken(input?.containerWidth, "1360px", /^\d{3,4}px$/),
    headerStyle: choices.headerStyle.has(input?.headerStyle as SiteHeaderStyle) ? input!.headerStyle : base.headerStyle,
    heroStyle: choices.heroStyle.has(input?.heroStyle as SiteHeroStyle) ? input!.heroStyle : base.heroStyle,
    cardStyle: choices.cardStyle.has(input?.cardStyle as SiteCardStyle) ? input!.cardStyle : base.cardStyle,
    footerStyle: choices.footerStyle.has(input?.footerStyle as SiteFooterStyle) ? input!.footerStyle : base.footerStyle,
  };
}

export function getSiteHeroSlides(site: SiteConfig): SiteHeroSlide[] {
  const configured = site.pageConfig?.hero?.slides;
  if (Array.isArray(configured)) {
    const valid = configured.filter((slide) => slide?.enabled !== false && ["image", "video"].includes(slide?.mediaType) && typeof slide?.mediaUrl === "string" && slide.mediaUrl.trim());
    if (valid.length) return valid;
  }
  return [{ id: "legacy-default", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=2000&q=85", eyebrow: `${site.city || site.name}'s stays, one search away`, heading: site.heroTitle || `Find Your Perfect Stay in ${site.city || site.name}`, description: site.heroSubtitle, altText: `${site.name} accommodation`, enabled: true, overlayOpacity: 0.58, durationSeconds: 6 }];
}
