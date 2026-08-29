import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { SiteProvider } from "@/components/site/SiteProvider";
import { canonicalUrl, getCurrentSite } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const site = await getCurrentSite();
  const canonical = canonicalUrl(site);
  const title = site.seo?.title || `${site.name} | Hotels, Homestays, Resorts & Villas in ${site.city}`;
  const description = site.seo?.description || site.description;
  const image = site.ogImage ? new URL(site.ogImage, canonical).toString() : undefined;
  return {
    metadataBase: canonical,
    title: { default: title, template: `%s | ${site.name}` },
    description,
    keywords: site.seo?.keywords || [
      `${site.city} hotels`, `${site.city} homestays`, `resorts in ${site.city}`,
      `villas in ${site.city}`, `accommodation in ${site.city}`,
    ],
    alternates: { canonical: "/" },
    icons: site.favicon ? { icon: site.favicon } : undefined,
    openGraph: {
      title, description, url: canonical, siteName: site.name, type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
    robots: { index: true, follow: true },
  };
}

type ThemeStyle = CSSProperties & Record<`--site-${string}`, string>;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getCurrentSite();
  const style: ThemeStyle = {
    "--site-primary": site.theme?.primary || site.theme?.primaryColor || "#8b0d18",
    "--site-secondary": site.theme?.secondary || site.theme?.secondaryColor || "#b4232e",
    "--site-dark": site.theme?.dark || "#111315",
    "--site-light": site.theme?.light || "#faf8f7",
  };
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`} style={style}>
      <body><SiteProvider site={site}>{children}</SiteProvider></body>
    </html>
  );
}
