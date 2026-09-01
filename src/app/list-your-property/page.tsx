import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Download,
  Users,
} from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { OwnerAuth } from "@/components/owner/OwnerAuth";
import styles from "./owner-portal.module.css";

const benefits = [
  {
    value: "Free",
    title: "Property registration",
    text: "Create your owner account and submit your first property without a listing fee.",
    icon: Building2,
  },
  {
    value: "Direct",
    title: "Owner control",
    text: "Manage property details, rooms, pricing, photos and availability from one dashboard.",
    icon: BadgeCheck,
  },
  {
    value: "Local",
    title: "Traveller reach",
    text: "Connect with guests searching for trusted stays across Guwahati and the Northeast.",
    icon: Users,
  },
];

export default function ListYourProperty() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
          <nav aria-label="Owner portal actions">
            <a className={styles.downloadButton} href="#owner-app">
              <Download />
              Download App
            </a>
            <a className={styles.listButton} href="#create-account">
              List New Property For Free
              <ArrowRight />
            </a>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span>GUWAHATI HOMESTAY OWNER NETWORK</span>
            <h1>
              List your property for free and grow your hospitality business
            </h1>
            <p>
              Reach travellers looking for genuine hotels, homestays, villas,
              resorts and guest houses across Guwahati and Northeast India.
            </p>
            <div className={styles.heroPoints}>
              <strong>
                <BadgeCheck /> Simple property onboarding
              </strong>
              <strong>
                <BadgeCheck /> One dashboard for every listing
              </strong>
              <strong>
                <BadgeCheck /> Review and publishing support
              </strong>
            </div>
          </div>
          <OwnerAuth />
        </div>
      </section>

      <section className={styles.benefits} id="owner-app">
        <div className={styles.benefitGrid}>
          {benefits.map(({ value, title, text, icon: Icon }) => (
            <article key={title}>
              <div>
                <Icon />
                <strong>{value}</strong>
              </div>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <p className={styles.backLink}>
          Already exploring stays? <Link href="/">Back to website</Link>
        </p>
      </section>
    </main>
  );
}
