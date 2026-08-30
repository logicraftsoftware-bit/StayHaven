"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Headphones,
  LockKeyhole,
  Quote,
  Sparkles,
} from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { SearchBox } from "@/components/home/SearchBox";
import { HotelCard } from "@/components/hotel/HotelCard";
import { useSite } from "@/components/site/SiteProvider";
import { categories } from "@/data/categories";
import { destinations } from "@/data/destinations";
import { hotels } from "@/data/hotels";
import type { PageSection, PublishedPageConfig } from "@/types/site";

const text = (
  config: Record<string, unknown>,
  key: string,
  fallback: string,
) =>
  typeof config[key] === "string" && String(config[key]).trim()
    ? String(config[key])
    : fallback;
const limit = (config: Record<string, unknown>, fallback: number) =>
  typeof config.limit === "number"
    ? Math.min(24, Math.max(1, config.limit))
    : fallback;

function Heading({
  config,
  title,
  subtitle,
}: {
  config: Record<string, unknown>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-section-heading">
      <h2>{text(config, "title", title)}</h2>
      <p>{text(config, "subtitle", subtitle)}</p>
    </div>
  );
}

function Section({ section }: { section: PageSection }) {
  const site = useSite();
  const city = site.city || site.name;
  const c = section.config;
  const testimonials = [
    {
      name: "Priya Sharma",
      stay: `Family stay in ${city}`,
      quote: `The property was exactly as shown and the local support made our ${city} trip effortless.`,
    },
    {
      name: "Arjun Mehta",
      stay: "Verified guest",
      quote:
        "Easy discovery, clear details and a smooth stay from check-in to check-out.",
    },
    {
      name: "Neha Das",
      stay: "Weekend traveller",
      quote: `A thoughtfully selected stay and a wonderful way to experience ${city}.`,
    },
  ];
  const faqs = [
    [
      "How do I find a stay?",
      `Choose your destination, dates and property type to explore available stays in ${city}.`,
    ],
    [
      "Are the properties verified?",
      `${site.name} reviews property information before approved listings appear publicly.`,
    ],
    [
      "Can I list my property?",
      "Yes. Use List Your Property to create one global owner account and submit properties for review.",
    ],
    [
      "How can I get help?",
      `Contact ${site.contact?.email || "our support team"} for assistance with the marketplace.`,
    ],
  ];
  switch (section.type) {
    case "hero":
      return <Hero showSearch={false} sectionConfig={c} />;
    case "search":
      return (
        <section className="container page-search-section">
          <SearchBox />
        </section>
      );
    case "property-categories":
      return (
        <section className="container page-builder-section">
          <Heading
            config={c}
            title="Browse by property type"
            subtitle={`Find the right stay in ${city}`}
          />
          <div className="category-grid mt-6">
            {categories
              .slice(0, limit(c, 8))
              .map(({ name, count, type, icon: Icon }) => (
                <Link
                  key={name}
                  href={`/hotels?destination=${encodeURIComponent(city)}&type=${type}`}
                >
                  <Icon />
                  <strong>{name}</strong>
                  <span>{count}</span>
                </Link>
              ))}
          </div>
        </section>
      );
    case "destinations":
      return (
        <section className="container page-builder-section">
          <Heading
            config={c}
            title="Trending Destinations"
            subtitle="Explore places near you"
          />
          <div className="horizontal-list mt-5">
            {destinations.slice(0, limit(c, 6)).map((d) => (
              <Link
                href={`/hotels?destination=${encodeURIComponent(d.name)}`}
                className="destination-card"
                key={d.name}
              >
                <Image
                  src={d.image}
                  alt={d.name}
                  fill
                  className="object-cover"
                  sizes="250px"
                />
                <div>
                  <b>{d.name}</b>
                  <span>{d.count} Properties</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    case "featured-properties":
    case "popular-hotels":
    case "popular-villas":
    case "popular-resorts":
    case "popular-homestays":
      return (
        <section className="container page-builder-section">
          <Heading
            config={c}
            title="Popular Stays"
            subtitle={`Recommended stays in ${city}`}
          />
          <div className="hotel-list mt-5">
            {hotels.slice(0, limit(c, 8)).map((h) => (
              <HotelCard key={h.id} hotel={h} />
            ))}
          </div>
        </section>
      );
    case "why-choose-us":
      return (
        <section className="container page-builder-section">
          <div className="benefits">
            <div>
              <p className="eyebrow">THE {site.name.toUpperCase()} PROMISE</p>
              <h2>{text(c, "title", `Why Book With ${site.name}?`)}</h2>
            </div>
            {[
              [BadgeIndianRupee, "Best Price Guarantee"],
              [Sparkles, "Local Selection"],
              [LockKeyhole, "Easy & Secure"],
              [Headphones, "24/7 Support"],
            ].map(([Item, label]) => {
              const Icon = Item as typeof Sparkles;
              return (
                <div className="benefit" key={label as string}>
                  <Icon />
                  <b>{label as string}</b>
                </div>
              );
            })}
          </div>
        </section>
      );
    case "promotional-banner":
    case "cta":
      return (
        <section className="container page-builder-section">
          <div className="offer-banner">
            <div className="relative z-10">
              <h2>
                {text(
                  c,
                  "title",
                  section.type === "cta"
                    ? "Find your next stay"
                    : "Exclusive offers",
                )}
              </h2>
              <p>
                {text(c, "description", `Discover memorable stays in ${city}`)}
              </p>
              <Link
                className="btn-gold mt-5"
                href={text(c, "buttonLink", "/hotels")}
              >
                {text(c, "buttonText", "Explore stays")}
              </Link>
            </div>
          </div>
        </section>
      );
    case "testimonials":
      return (
        <section className="container page-builder-section">
          <Heading
            config={c}
            title="Guest stories"
            subtitle={`What travellers say about ${site.name}`}
          />
          <div className="testimonial-grid">
            {testimonials.slice(0, limit(c, 3)).map((item) => (
              <article className="testimonial-card" key={item.name}>
                <Quote aria-hidden="true" />
                <p>“{item.quote}”</p>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.stay}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    case "gallery":
      return (
        <section className="container page-builder-section">
          <Heading
            config={c}
            title={`Experience ${city}`}
            subtitle="A glimpse of stays and destinations"
          />
          <div className="page-gallery">
            {destinations.slice(0, limit(c, 6)).map((item, index) => (
              <figure className={index === 0 ? "featured" : ""} key={item.name}>
                <Image
                  src={item.image}
                  alt={`${item.name} travel destination`}
                  fill
                  sizes={
                    index === 0
                      ? "(max-width: 768px) 100vw, 50vw"
                      : "(max-width: 768px) 50vw, 25vw"
                  }
                />
                <figcaption>{item.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="container page-builder-section page-faq">
          <Heading
            config={c}
            title="Frequently asked questions"
            subtitle={`Helpful information about ${site.name}`}
          />
          <div>
            {faqs.slice(0, limit(c, 4)).map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      );
    default:
      return null;
  }
}

export function PageRenderer({ page }: { page: PublishedPageConfig }) {
  if (!page.enabled) return null;
  const sections = [...(page.published.sections || [])]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);
  return (
    <>
      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </>
  );
}
