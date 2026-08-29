import type { SiteConfig } from "@/types/site";

/** Local-development fallback only. Production domains must resolve through the API. */
export const siteConfig: SiteConfig = {
  name: "Guwahati Homestay",
  slug: "guwahati-homestay",
  domain: "guwahatihomestay.com",
  domains: ["guwahatihomestay.com", "www.guwahatihomestay.com"],
  city: "Guwahati",
  state: "Assam",
  country: "India",
  logo: "/brand/guwahati-homestay-logo.jpeg",
  description: "Find and book hotels, homestays, resorts, villas and unique stays in Guwahati, Assam.",
  theme: { primary: "#8B0D18", secondary: "#B4232E", dark: "#111315", light: "#FAF8F7" },
};
