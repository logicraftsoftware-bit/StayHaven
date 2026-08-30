"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSite } from "@/components/site/SiteProvider";
import { getSiteHeroSlides, resolveSiteTheme } from "@/lib/site-theme";
import { SearchBox } from "./SearchBox";

function SlideHeading({ heading, highlighted }: { heading: string; highlighted?: string }) {
  if (!highlighted || !heading.includes(highlighted)) return <>{heading}</>;
  const [before, ...after] = heading.split(highlighted);
  return <>{before}<span className="text-gold">{highlighted}</span>{after.join(highlighted)}</>;
}

export function Hero() {
  const site = useSite();
  const slides = useMemo(() => getSiteHeroSlides(site), [site]);
  const theme = resolveSiteTheme(site.theme);
  const config = site.pageConfig?.hero;
  const [active, setActive] = useState(0);
  const slide = slides[active] ?? slides[0];

  useEffect(() => {
    if (slides.length < 2 || config?.autoplay === false) return;
    const seconds = slide.durationSeconds || config?.intervalSeconds || 6;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % slides.length), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [active, config?.autoplay, config?.intervalSeconds, slide.durationSeconds, slides.length]);

  const move = (amount: number) => setActive((index) => (index + amount + slides.length) % slides.length);
  return <section className={`hero hero-style-${theme.heroStyle || "default"}`}>
    <div className="hero-media" aria-hidden="true">
      {slide.mediaType === "video" ? <video key={slide.mediaUrl} autoPlay muted loop playsInline poster={slide.posterUrl}><source src={slide.mediaUrl}/></video> : <picture>{slide.mobileMediaUrl && <source media="(max-width: 767px)" srcSet={slide.mobileMediaUrl}/>}<img src={slide.mediaUrl} alt=""/></picture>}
    </div>
    <div className="hero-overlay" style={{ opacity: slide.overlayOpacity ?? .58 }}/>
    <div className="container relative z-10 flex min-h-[520px] flex-col justify-center pb-26 pt-14 text-white">
      <p className="mb-3 text-xs font-bold uppercase tracking-[.25em] text-red-100">{slide.eyebrow || site.tagline}</p>
      <h1 className="font-display max-w-3xl text-4xl font-bold leading-[1.08] md:text-6xl"><SlideHeading heading={slide.heading} highlighted={slide.highlightedText}/></h1>
      {slide.description && <p className="mt-5 max-w-xl text-base text-slate-100 md:text-lg">{slide.description}</p>}
      {slides.length > 1 && config?.showControls !== false && <div className="hero-controls" aria-label="Hero slides">
        <button type="button" onClick={() => move(-1)} aria-label="Previous banner"><ChevronLeft/></button>
        <div className="hero-dots">{slides.map((item,index)=><button key={item.id || `${item.mediaUrl}-${index}`} type="button" className={index===active?"active":""} onClick={()=>setActive(index)} aria-label={`Show banner ${index+1}`}/>)}</div>
        <button type="button" onClick={() => move(1)} aria-label="Next banner"><ChevronRight/></button>
      </div>}
      <div className="hero-search absolute inset-x-4 -bottom-14 md:inset-x-0"><SearchBox/></div>
    </div>
  </section>;
}
