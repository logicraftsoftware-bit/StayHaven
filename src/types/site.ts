export type SiteThemePreset = "default" | "mountain" | "modern" | "minimal";
export type SiteHeroStyle = "default" | "full-image" | "video" | "split-screen" | "mountain" | "minimal";
export type SiteHeaderStyle = "default" | "centered" | "transparent" | "overlay";
export type SiteCardStyle = "default" | "rounded" | "minimal" | "image-overlay" | "compact";
export type SiteFooterStyle = "default" | "minimal" | "multi-column" | "dark";

export type SiteTheme = {
  preset?: SiteThemePreset;
  primary?: string;
  primaryColor?: string;
  secondary?: string;
  secondaryColor?: string;
  dark?: string;
  light?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  borderRadius?: string;
  buttonRadius?: string;
  spacingScale?: string;
  containerWidth?: string;
  headerStyle?: SiteHeaderStyle;
  heroStyle?: SiteHeroStyle;
  cardStyle?: SiteCardStyle;
  buttonStyle?: string;
  footerStyle?: SiteFooterStyle;
  layoutStyle?: string;
};

export type SiteHeroSlide = {
  id?: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mobileMediaUrl?: string;
  posterUrl?: string;
  eyebrow?: string;
  heading: string;
  highlightedText?: string;
  description?: string;
  altText?: string;
  enabled?: boolean;
  overlayOpacity?: number;
  durationSeconds?: number;
};

export type SitePageConfig = {
  hero?: {
    autoplay?: boolean;
    intervalSeconds?: number;
    showControls?: boolean;
    slides?: SiteHeroSlide[];
  };
  [key: string]: unknown;
};
export type PageSectionType = "hero"|"search"|"featured-properties"|"popular-hotels"|"popular-villas"|"popular-resorts"|"popular-homestays"|"property-categories"|"destinations"|"why-choose-us"|"promotional-banner"|"testimonials"|"gallery"|"faq"|"cta";
export type PageSection = { id:string; type:PageSectionType; enabled:boolean; order:number; config:Record<string,unknown> };
export type PublishedPageConfig = { pageSlug:string; enabled:boolean; preset:string; published:{ seo?:{title?:string;description?:string;canonical?:string;noindex?:boolean}; sections:PageSection[] } };

export type SiteConfig = {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  domain: string;
  domains: string[];
  city: string;
  state: string;
  country: string;
  timezone?: string;
  currency?: string;
  location?: { city?: string; state?: string; country?: string };
  logo?: string;
  favicon?: string;
  tagline?: string;
  description?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  ogImage?: string;
  theme: SiteTheme;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    robots?: string;
  };
  contact?: { email?: string; phone?: string; address?: string };
  social?: Record<string, string>;
  pageConfig?: SitePageConfig;
  status?: "active" | "inactive" | "archived";
};
