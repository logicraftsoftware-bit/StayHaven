"use client";

/* Client-side API loading is intentionally initiated after hydration. */
/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages */

import Image from "next/image";
import {
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Globe2,
  Home,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { apiRequest as api, publicApiBase } from "@/lib/api-client";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { SiteProvider as PublicSiteProvider } from "@/components/site/SiteProvider";
import type {
  PublishedPageConfig,
  SiteConfig,
  SiteHeroSlide,
} from "@/types/site";

const TOKEN_KEY = "gh_super_admin_token";

type View =
  "dashboard" | "sites" | "pages" | "owners" | "properties" | "api-settings" | "profile";
type Status =
  | "ACTIVE"
  | "SUSPENDED"
  | "PENDING"
  | "REJECTED"
  | "APPROVED"
  | "CHANGES_REQUIRED"
  | "DRAFT"
  | "active"
  | "inactive"
  | "archived";
type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  pagination?: { page: number; total: number; totalPages: number };
};
type Admin = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt?: string;
};
type Dashboard = {
  totalProperties: number;
  pendingProperties: number;
  approvedProperties: number;
  rejectedProperties: number;
  totalOwners: number;
  activeOwners: number;
  suspendedOwners: number;
  totalCustomers: number;
  totalSites: number;
};
type Site = {
  _id: string;
  name: string;
  slug: string;
  domain: string;
  domains?: string[];
  city: string;
  state: string;
  country: string;
  timezone?: string;
  currency?: string;
  logo?: string;
  favicon?: string;
  tagline?: string;
  description?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  ogImage?: string;
  theme?: Record<string, string>;
  pageConfig?: Record<string, unknown>;
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
  contact?: Record<string, string>;
  social?: Record<string, string>;
  domainRecords?: Array<{
    _id: string;
    normalizedDomain: string;
    isPrimary: boolean;
    verified: boolean;
    verificationStatus: string;
    sslStatus: string;
    active: boolean;
  }>;
  status: "active" | "inactive" | "archived";
  createdAt: string;
};
type Owner = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: Status;
  siteIds: string[];
  propertyCount?: number;
  properties?: Property[];
  sites?: Array<{ _id: string; name: string }>;
  auditHistory?: Array<{
    _id: string;
    action: string;
    createdAt: string;
  }>;
  createdAt: string;
};
type Property = {
  _id: string;
  name: string;
  slug: string;
  propertyType: string;
  city: string;
  state: string;
  address: string;
  status: Status;
  reviewReason?: string;
  createdAt: string;
};
type PropertyTypeMaster = {
  _id: string;
  name: string;
  image?: string;
  description: string;
  commissionPercent: number;
  status: "active" | "inactive";
  sortOrder: number;
};

function Brand() {
  return (
    <div className="admin-brand">
      <Image
        src="/logo.png"
        alt="StayHaven"
        width={500}
        height={167}
        priority
      />
      <span>Super Admin</span>
    </div>
  );
}

function Login({
  onLogin,
}: {
  onLogin: (token: string, admin: Admin) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api<
        ApiResponse<{ accessToken: string; admin: Admin }>
      >("/api/v1/admin/auth/login", "", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem(TOKEN_KEY, result.data.accessToken);
      onLogin(result.data.accessToken, result.data.admin);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="admin-login">
      <section className="login-story">
        <a href="/" className="back-link">
          <ChevronRight /> Back to website
        </a>
        <Brand />
        <div className="story-copy">
          <span className="admin-kicker">STAYHAVEN NETWORK CONTROL CENTRE</span>
          <h1>
            One dashboard.
            <br />
            Every stay under control.
          </h1>
          <p>
            Review properties, manage partners and operate every
            location-specific marketplace from one secure workspace.
          </p>
          <div className="trust-row">
            <ShieldCheck />
            <div>
              <strong>Super Admin access</strong>
              <span>Protected management portal</span>
            </div>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit} className="login-card">
          <div className="login-icon">
            <KeyRound />
          </div>
          <span className="admin-kicker">WELCOME BACK</span>
          <h2>Sign in to admin</h2>
          <p>Use your Super Admin credentials to continue.</p>
          {error && (
            <div className="admin-alert error">
              <CircleAlert />
              {error}
            </div>
          )}
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          <button className="admin-primary" disabled={loading}>
            {loading ? <LoaderCircle className="spin" /> : <ShieldCheck />}
            {loading ? "Signing in…" : "Secure sign in"}
          </button>
          <small>
            Authorized personnel only. All administrative actions are recorded.
          </small>
        </form>
      </section>
    </main>
  );
}

const nav: { id: View; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "sites", label: "Sites", icon: Globe2 },
  { id: "pages", label: "Page builder", icon: Home },
  { id: "properties", label: "Properties", icon: Building2 },
  { id: "owners", label: "Property owners", icon: Users },
  { id: "api-settings", label: "API Settings", icon: MapPinned },
  { id: "profile", label: "Account", icon: Settings },
];

function StatusBadge({ value }: { value: Status }) {
  return (
    <span className={`status status-${value.toLowerCase()}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="admin-empty">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function PageHeader({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </header>
  );
}

function DashboardView({
  token,
  go,
}: {
  token: string;
  go: (view: View) => void;
}) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<ApiResponse<Dashboard>>("/api/v1/admin/dashboard", token)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, [token]);
  useEffect(load, [load]);
  const cards = data
    ? [
        {
          label: "Total properties",
          value: data.totalProperties,
          icon: Building2,
        },
        {
          label: "Pending review",
          value: data.pendingProperties,
          icon: CircleAlert,
        },
        { label: "Active owners", value: data.activeOwners, icon: Users },
        { label: "Managed sites", value: data.totalSites, icon: Globe2 },
      ]
    : [];
  return (
    <>
      <PageHeader
        eyebrow="CONTROL CENTRE"
        title="Dashboard overview"
        text="A clear view of marketplace activity and items needing attention."
        action={
          <button className="admin-secondary" onClick={load}>
            <RefreshCw /> Refresh
          </button>
        }
      />
      {error && (
        <div className="admin-alert error">
          <CircleAlert />
          {error}
        </div>
      )}
      {!data ? (
        <div className="admin-loading">
          <LoaderCircle className="spin" /> Loading dashboard…
        </div>
      ) : (
        <>
          <div className="metric-grid">
            {cards.map(({ label, value, icon: Icon }) => (
              <article className="metric-card" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <i>
                  <Icon />
                </i>
              </article>
            ))}
          </div>
          <div className="admin-grid-two">
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <span className="admin-kicker">PROPERTY PIPELINE</span>
                  <h2>Review activity</h2>
                </div>
                <button onClick={() => go("properties")}>
                  View all <ChevronRight />
                </button>
              </div>
              <div className="pipeline">
                <div>
                  <span>Approved</span>
                  <strong>{data.approvedProperties}</strong>
                </div>
                <div>
                  <span>Pending</span>
                  <strong>{data.pendingProperties}</strong>
                </div>
                <div>
                  <span>Rejected</span>
                  <strong>{data.rejectedProperties}</strong>
                </div>
              </div>
            </section>
            <section className="admin-card quick-card">
              <span className="admin-kicker">QUICK ACTIONS</span>
              <h2>Keep operations moving</h2>
              <button onClick={() => go("sites")}>
                <Globe2 />
                <span>
                  <strong>Add or manage a site</strong>
                  <small>Configure marketplace locations</small>
                </span>
                <ChevronRight />
              </button>
              <button onClick={() => go("owners")}>
                <Users />
                <span>
                  <strong>Review property owners</strong>
                  <small>Activate or suspend accounts</small>
                </span>
                <ChevronRight />
              </button>
            </section>
          </div>
        </>
      )}
    </>
  );
}

const blankSite = {
  name: "",
  slug: "",
  domain: "",
  aliases: "",
  city: "",
  state: "",
  country: "India",
  timezone: "Asia/Kolkata",
  currency: "INR",
  logo: "/logo.png",
  favicon: "/favicon.ico",
  primaryColor: "#8b0d18",
  secondaryColor: "#111315",
  fontFamily: "",
  headingFontFamily: "",
  bodyFontFamily: "",
  borderRadius: "18px",
  buttonRadius: "11px",
  spacingScale: "1",
  containerWidth: "1360px",
  headerStyle: "default",
  heroStyle: "default",
  cardStyle: "default",
  buttonStyle: "default",
  footerStyle: "default",
  layoutStyle: "default",
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  email: "",
  phone: "",
  address: "",
  facebook: "",
  instagram: "",
  youtube: "",
  pageConfig: "{}",
};

const siteFormSteps = [
  {
    title: "Basic information",
    description: "Site identity and marketplace name",
    fields: ["name", "slug"],
  },
  {
    title: "Domain & location",
    description: "Domains, city and regional defaults",
    fields: [
      "domain",
      "aliases",
      "city",
      "state",
      "country",
      "timezone",
      "currency",
    ],
  },
  {
    title: "Branding",
    description: "Logo, favicon, colors and typography",
    fields: [
      "logo",
      "favicon",
      "primaryColor",
      "secondaryColor",
      "fontFamily",
      "headingFontFamily",
      "bodyFontFamily",
    ],
  },
  {
    title: "Theme",
    description: "Shared component and layout styles",
    fields: [
      "headerStyle",
      "heroStyle",
      "cardStyle",
      "buttonStyle",
      "footerStyle",
      "layoutStyle",
      "borderRadius",
      "buttonRadius",
      "spacingScale",
      "containerWidth",
    ],
  },
  {
    title: "Hero banners",
    description: "Images, videos and banner content",
    fields: ["pageConfig"],
  },
  {
    title: "SEO & contact",
    description: "Search metadata and public channels",
    fields: [
      "seoTitle",
      "seoDescription",
      "canonicalUrl",
      "email",
      "phone",
      "address",
      "facebook",
      "instagram",
      "youtube",
    ],
  },
] as const;

function SitesView({ token }: { token: string }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blankSite);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"logo" | "favicon" | "">("");
  const [heroSlides, setHeroSlides] = useState<SiteHeroSlide[]>([]);
  const [uploadingHero, setUploadingHero] = useState<number | null>(null);
  const [siteFormStep, setSiteFormStep] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api<ApiResponse<Site[]>>("/api/v1/admin/sites", token);
      setSites(r.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    let parsedPageConfig: Record<string, unknown>;
    try {
      parsedPageConfig = JSON.parse(form.pageConfig || "{}");
    } catch {
      setError("Homepage section configuration must be valid JSON.");
      return;
    }
    if (heroSlides.some((slide) => !slide.mediaUrl.trim())) {
      setError("Upload an image or video for every hero banner before saving.");
      return;
    }
    const {
      aliases,
      primaryColor,
      secondaryColor,
      fontFamily,
      headingFontFamily,
      bodyFontFamily,
      borderRadius,
      buttonRadius,
      spacingScale,
      containerWidth,
      headerStyle,
      heroStyle,
      cardStyle,
      buttonStyle,
      footerStyle,
      layoutStyle,
      seoTitle,
      seoDescription,
      canonicalUrl,
      email,
      phone,
      address,
      facebook,
      instagram,
      youtube,
      ...base
    } = form;
    const body = {
      ...base,
      domains: aliases
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      theme: {
        primaryColor,
        secondaryColor,
        fontFamily,
        headingFontFamily,
        bodyFontFamily,
        borderRadius,
        buttonRadius,
        spacingScale,
        containerWidth,
        headerStyle,
        heroStyle,
        cardStyle,
        buttonStyle,
        footerStyle,
        layoutStyle,
      },
      seo: { title: seoTitle, description: seoDescription, canonicalUrl },
      contact: { email, phone, address },
      social: { facebook, instagram, youtube },
      pageConfig: {
        ...parsedPageConfig,
        hero: {
          ...((parsedPageConfig.hero as Record<string, unknown> | undefined) ||
            {}),
          slides: heroSlides,
        },
      },
    };
    try {
      await api(
        editingId ? `/api/v1/admin/sites/${editingId}` : "/api/v1/admin/sites",
        token,
        { method: editingId ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      setForm(blankSite);
      setHeroSlides([]);
      setEditingId("");
      setShow(false);
      setMessage(
        editingId ? "Site updated successfully." : "Site created successfully.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function uploadHeroMedia(index: number, file?: File) {
    if (!file) return;
    const video = file.type.startsWith("video/");
    const limit = video ? 25 : 5;
    if (file.size > limit * 1024 * 1024) {
      setError(`${video ? "Video" : "Image"} must be ${limit} MB or smaller.`);
      return;
    }
    setError("");
    setUploadingHero(index);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await api<ApiResponse<{ url: string }>>(
        video ? "/api/v1/admin/media/videos" : "/api/v1/admin/media/images",
        token,
        { method: "POST", body: data },
      );
      setHeroSlides((old) =>
        old.map((slide, slideIndex) =>
          slideIndex === index
            ? {
                ...slide,
                mediaType: video ? "video" : "image",
                mediaUrl: response.data.url,
              }
            : slide,
        ),
      );
      setMessage("Hero media uploaded. Save the site to publish it.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingHero(null);
    }
  }
  function addHeroSlide() {
    setHeroSlides((old) => [
      ...old,
      {
        id: `hero-${Date.now()}`,
        mediaType: "image",
        mediaUrl: "",
        eyebrow: "",
        heading: "",
        highlightedText: "",
        description: "",
        altText: "",
        enabled: true,
        overlayOpacity: 0.58,
        durationSeconds: 6,
      },
    ]);
  }
  async function uploadSiteImage(field: "logo" | "favicon", file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setError("");
    setUploading(field);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await api<ApiResponse<{ url: string }>>(
        "/api/v1/admin/media/images",
        token,
        { method: "POST", body: data },
      );
      setForm((old) => ({ ...old, [field]: response.data.url }));
      setMessage(
        `${field === "logo" ? "Logo" : "Favicon"} uploaded. Save the site to apply it.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading("");
    }
  }
  function edit(site: Site) {
    setEditingId(site._id);
    setForm({
      ...blankSite,
      name: site.name,
      slug: site.slug,
      domain: site.domain,
      aliases: (site.domains || []).filter((x) => x !== site.domain).join(", "),
      city: site.city,
      state: site.state,
      country: site.country,
      timezone: site.timezone || "Asia/Kolkata",
      currency: site.currency || "INR",
      logo: site.logo || "",
      favicon: site.favicon || "",
      primaryColor: site.theme?.primaryColor || blankSite.primaryColor,
      secondaryColor: site.theme?.secondaryColor || blankSite.secondaryColor,
      fontFamily: site.theme?.fontFamily || "",
      headingFontFamily:
        site.theme?.headingFontFamily || site.theme?.fontFamily || "",
      bodyFontFamily:
        site.theme?.bodyFontFamily || site.theme?.fontFamily || "",
      borderRadius: site.theme?.borderRadius || "18px",
      buttonRadius: site.theme?.buttonRadius || "11px",
      spacingScale: site.theme?.spacingScale || "1",
      containerWidth: site.theme?.containerWidth || "1360px",
      headerStyle: site.theme?.headerStyle || "default",
      heroStyle: site.theme?.heroStyle || "default",
      cardStyle: site.theme?.cardStyle || "default",
      buttonStyle: site.theme?.buttonStyle || "default",
      footerStyle: site.theme?.footerStyle || "default",
      layoutStyle: site.theme?.layoutStyle || "default",
      seoTitle: site.seo?.title || "",
      seoDescription: site.seo?.description || "",
      canonicalUrl: site.seo?.canonicalUrl || "",
      email: site.contact?.email || "",
      phone: site.contact?.phone || "",
      address: site.contact?.address || "",
      facebook: site.social?.facebook || "",
      instagram: site.social?.instagram || "",
      youtube: site.social?.youtube || "",
      pageConfig: JSON.stringify(site.pageConfig || {}, null, 2),
    });
    const pageConfig = site.pageConfig as
      { hero?: { slides?: SiteHeroSlide[] } } | undefined;
    setHeroSlides(
      Array.isArray(pageConfig?.hero?.slides) ? pageConfig.hero.slides : [],
    );
    setSiteFormStep(0);
    setShow(true);
  }
  async function toggle(site: Site) {
    setError("");
    try {
      await api(`/api/v1/admin/sites/${site._id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({
          status: site.status === "active" ? "inactive" : "active",
        }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function archive(site: Site) {
    if (
      !window.confirm(`Archive ${site.name}? It will stop resolving publicly.`)
    )
      return;
    setError("");
    try {
      await api(`/api/v1/admin/sites/${site._id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      });
      setMessage(`${site.name} archived safely. Its records were retained.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function updateDomain(
    site: Site,
    domainId: string,
    updates: Record<string, boolean | string>,
  ) {
    setError("");
    try {
      await api(`/api/v1/admin/sites/${site._id}/domains/${domainId}`, token, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setMessage("Domain status updated.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      {!show && (
        <>
          <PageHeader
            eyebrow="MARKETPLACE NETWORK"
            title="Sites"
            text="Create and control every location-specific StayHaven marketplace from one shared platform."
            action={
              <button
                className="admin-primary compact"
                onClick={() => {
                  setEditingId("");
                  setForm(blankSite);
                  setHeroSlides([]);
                  setSiteFormStep(0);
                  setShow(true);
                }}
              >
                <Plus /> Add site
              </button>
            }
          />
          {message && (
            <div className="admin-alert success">
              <Check />
              {message}
            </div>
          )}
          {error && (
            <div className="admin-alert error">
              <CircleAlert />
              {error}
            </div>
          )}
          {loading ? (
            <div className="admin-loading">
              <LoaderCircle className="spin" /> Loading sites…
            </div>
          ) : sites.length === 0 ? (
            <Empty
              icon={<Globe2 />}
              title="No sites yet"
              text="Create your first marketplace site to get started."
            />
          ) : (
            <div className="site-grid">
              {sites.map((site) => (
                <article className="site-card" key={site._id}>
                  <div className="site-card-top">
                    <i>
                      <Globe2 />
                    </i>
                    <StatusBadge value={site.status} />
                  </div>
                  <h2>{site.name}</h2>
                  <p>
                    {site.city}, {site.state}, {site.country}
                  </p>
                  <a
                    href={`https://${site.domain}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {site.domain}
                    <ExternalLink />
                  </a>
                  <div className="site-meta">
                    <span>/{site.slug}</span>
                    <span>
                      Created {new Date(site.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="site-domain-health">
                    {(site.domainRecords || []).map((domain) => (
                      <div className="site-domain-health-row" key={domain._id}>
                        <span>
                          {domain.isPrimary ? "Primary" : "Alias"}:{" "}
                          {domain.normalizedDomain}
                          {` · ${domain.verificationStatus} · SSL ${domain.sslStatus}`}
                        </span>
                        <div>
                          {!domain.verified && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDomain(site, domain._id, {
                                  verified: true,
                                  verificationStatus: "verified",
                                })
                              }
                            >
                              Mark verified
                            </button>
                          )}
                          {domain.sslStatus !== "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDomain(site, domain._id, {
                                  sslStatus: "active",
                                })
                              }
                            >
                              Mark SSL active
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              updateDomain(site, domain._id, {
                                active: !domain.active,
                              })
                            }
                          >
                            {domain.active ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="site-card-actions">
                    <button
                      className="admin-secondary full"
                      onClick={() => edit(site)}
                    >
                      Edit configuration
                    </button>
                    {site.status !== "archived" && (
                      <button
                        className="admin-secondary full"
                        onClick={() => toggle(site)}
                      >
                        {site.status === "active"
                          ? "Set inactive"
                          : "Activate site"}
                      </button>
                    )}
                    {site.status !== "archived" && (
                      <button
                        className="admin-secondary full danger"
                        onClick={() => archive(site)}
                      >
                        Archive site
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {show && (
        <div className="site-editor-page">
          <div className="site-editor-panel">
            <div className="site-wizard-heading">
              <span className="admin-kicker">
                {editingId ? "SITE CONFIGURATION" : "NEW MARKETPLACE"}
              </span>
              <div className="site-editor-title-row">
                <h2>{editingId ? "Edit site" : "Add a site"}</h2>
                <button
                  className="admin-secondary"
                  type="button"
                  onClick={() => setShow(false)}
                >
                  <X /> Back to sites
                </button>
              </div>
              <p>
                Configure domains, location, branding, SEO and public contact
                information.
              </p>
            </div>
            <nav
              className="site-wizard-steps"
              aria-label="Site configuration steps"
            >
              {siteFormSteps.map((step, index) => (
                <button
                  type="button"
                  className={`${index === siteFormStep ? "active" : ""} ${index < siteFormStep ? "complete" : ""}`}
                  key={step.title}
                  onClick={() => setSiteFormStep(index)}
                  aria-current={index === siteFormStep ? "step" : undefined}
                >
                  <span>{index < siteFormStep ? <Check /> : index + 1}</span>
                  <strong>{step.title}</strong>
                </button>
              ))}
            </nav>
            <div className="site-wizard-scroll" key={siteFormStep}>
              <div className="site-wizard-section-heading">
                <div>
                  <span>
                    STEP {siteFormStep + 1} OF {siteFormSteps.length}
                  </span>
                  <h3>{siteFormSteps[siteFormStep].title}</h3>
                  <p>{siteFormSteps[siteFormStep].description}</p>
                </div>
              </div>
              <form
                className="admin-form-grid site-wizard-form"
                onSubmit={create}
              >
                {Object.entries(form)
                  .filter(([key]) =>
                    siteFormSteps[siteFormStep].fields.some(
                      (field) => field === key,
                    ),
                  )
                  .map(([key, value]) =>
                    key === "logo" || key === "favicon" ? (
                      <label className="site-image-field" key={key}>
                        {key === "logo" ? "Logo" : "Favicon"}
                        <span className="site-image-upload">
                          <span className={`site-image-preview ${key}`}>
                            {/* Uploaded public media is served by the site's API host. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`${value.startsWith("/") ? publicApiBase : ""}${value}`}
                              alt={`${key} preview`}
                            />
                          </span>
                          <span className="site-image-upload-copy">
                            <strong>
                              {uploading === key
                                ? "Uploading image…"
                                : `Upload ${key}`}
                            </strong>
                            <small>
                              PNG, JPG, WEBP, GIF or ICO · maximum 5 MB
                            </small>
                            <small className="site-image-path">{value}</small>
                          </span>
                          <span className="admin-secondary compact site-image-button">
                            {uploading === key ? (
                              <LoaderCircle className="spin" />
                            ) : (
                              <Upload />
                            )}
                            Choose file
                          </span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,.ico"
                            disabled={Boolean(uploading)}
                            onChange={(event) => {
                              void uploadSiteImage(
                                key,
                                event.target.files?.[0],
                              );
                              event.target.value = "";
                            }}
                          />
                        </span>
                      </label>
                    ) : key === "pageConfig" ? (
                      <div className="admin-form-wide hero-editor" key={key}>
                        <div className="hero-editor-title">
                          <span>
                            <strong>Hero banners</strong>
                            <small>
                              Add multiple images or videos with independent
                              text.
                            </small>
                          </span>
                          <button
                            type="button"
                            className="admin-secondary compact"
                            onClick={addHeroSlide}
                          >
                            <Plus />
                            Add banner
                          </button>
                        </div>
                        {heroSlides.length === 0 && (
                          <p className="hero-editor-empty">
                            No custom banners yet. The current site hero remains
                            as the fallback.
                          </p>
                        )}
                        {heroSlides.map((slide, index) => (
                          <section
                            className="hero-slide-editor"
                            key={slide.id || index}
                          >
                            <div className="hero-slide-preview">
                              {slide.mediaUrl ? (
                                slide.mediaType === "video" ? (
                                  <video
                                    src={`${slide.mediaUrl.startsWith("/") ? publicApiBase : ""}${slide.mediaUrl}`}
                                    muted
                                    controls
                                  />
                                ) : (
                                  <>
                                    {/* Hero media may be uploaded dynamically from the API. */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={`${slide.mediaUrl.startsWith("/") ? publicApiBase : ""}${slide.mediaUrl}`}
                                      alt="Banner preview"
                                    />
                                  </>
                                )
                              ) : (
                                <Upload />
                              )}
                              <label className="admin-secondary compact">
                                {uploadingHero === index ? (
                                  <LoaderCircle className="spin" />
                                ) : (
                                  <Upload />
                                )}
                                Upload image/video
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                                  hidden
                                  disabled={uploadingHero !== null}
                                  onChange={(event) => {
                                    void uploadHeroMedia(
                                      index,
                                      event.target.files?.[0],
                                    );
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            <div className="hero-slide-fields">
                              <label>
                                Heading
                                <input
                                  value={slide.heading}
                                  required
                                  onChange={(e) =>
                                    setHeroSlides((old) =>
                                      old.map((item, i) =>
                                        i === index
                                          ? { ...item, heading: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Highlighted text
                                <input
                                  value={slide.highlightedText || ""}
                                  onChange={(e) =>
                                    setHeroSlides((old) =>
                                      old.map((item, i) =>
                                        i === index
                                          ? {
                                              ...item,
                                              highlightedText: e.target.value,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label className="wide">
                                Description
                                <textarea
                                  rows={3}
                                  value={slide.description || ""}
                                  onChange={(e) =>
                                    setHeroSlides((old) =>
                                      old.map((item, i) =>
                                        i === index
                                          ? {
                                              ...item,
                                              description: e.target.value,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Eyebrow text
                                <input
                                  value={slide.eyebrow || ""}
                                  onChange={(e) =>
                                    setHeroSlides((old) =>
                                      old.map((item, i) =>
                                        i === index
                                          ? { ...item, eyebrow: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Alt text
                                <input
                                  value={slide.altText || ""}
                                  onChange={(e) =>
                                    setHeroSlides((old) =>
                                      old.map((item, i) =>
                                        i === index
                                          ? { ...item, altText: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Duration (seconds)
                                <input
                                  type="number"
                                  min="3"
                                  max="30"
                                  value={slide.durationSeconds || 6}
                                  onChange={(e) =>
                                    setHeroSlides((old) =>
                                      old.map((item, i) =>
                                        i === index
                                          ? {
                                              ...item,
                                              durationSeconds: Number(
                                                e.target.value,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label>
                                Overlay opacity
                                <input
                                  type="number"
                                  min="0"
                                  max="0.9"
                                  step="0.05"
                                  value={slide.overlayOpacity ?? 0.58}
                                  onChange={(e) =>
                                    setHeroSlides((old) =>
                                      old.map((item, i) =>
                                        i === index
                                          ? {
                                              ...item,
                                              overlayOpacity: Number(
                                                e.target.value,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </label>
                            </div>
                            <button
                              type="button"
                              className="modal-close"
                              aria-label="Remove banner"
                              onClick={() =>
                                setHeroSlides((old) =>
                                  old.filter((_, i) => i !== index),
                                )
                              }
                            >
                              <X />
                            </button>
                          </section>
                        ))}
                        <details>
                          <summary>Advanced homepage JSON</summary>
                          <textarea
                            rows={6}
                            value={value}
                            onChange={(e) =>
                              setForm((old) => ({
                                ...old,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        </details>
                      </div>
                    ) : [
                        "headerStyle",
                        "heroStyle",
                        "cardStyle",
                        "footerStyle",
                      ].includes(key) ? (
                      <label key={key}>
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (letter) => letter.toUpperCase())}
                        <select
                          value={value}
                          onChange={(event) =>
                            setForm((old) => ({
                              ...old,
                              [key]: event.target.value,
                            }))
                          }
                        >
                          {(key === "headerStyle"
                            ? ["default", "centered", "transparent", "overlay"]
                            : key === "heroStyle"
                              ? [
                                  "default",
                                  "full-image",
                                  "video",
                                  "split-screen",
                                  "mountain",
                                  "minimal",
                                ]
                              : key === "cardStyle"
                                ? [
                                    "default",
                                    "rounded",
                                    "minimal",
                                    "image-overlay",
                                    "compact",
                                  ]
                                : ["default", "minimal", "multi-column", "dark"]
                          ).map((option) => (
                            <option value={option} key={option}>
                              {option.replaceAll("-", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label key={key}>
                        {key === "slug"
                          ? "URL slug"
                          : key === "aliases"
                            ? "Domain aliases (comma separated)"
                            : key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (letter) =>
                                  letter.toUpperCase(),
                                )}
                        <input
                          value={value}
                          onChange={(e) =>
                            setForm((old) => ({
                              ...old,
                              [key]: e.target.value,
                            }))
                          }
                          required={[
                            "name",
                            "slug",
                            "domain",
                            "city",
                            "state",
                            "country",
                          ].includes(key)}
                          placeholder={
                            key === "domain" ? "example.com" : undefined
                          }
                        />
                      </label>
                    ),
                  )}
                {siteFormStep === 3 && (
                  <div
                    className="theme-live-preview"
                    style={
                      {
                        "--preview-primary": form.primaryColor,
                        "--preview-secondary": form.secondaryColor,
                        "--preview-radius": form.borderRadius,
                        "--preview-button-radius": form.buttonRadius,
                        fontFamily:
                          form.bodyFontFamily || form.fontFamily || "Inter",
                      } as CSSProperties
                    }
                  >
                    <span className="admin-kicker">LIVE PREVIEW</span>
                    <div
                      className={`theme-preview-header theme-preview-header-${form.headerStyle}`}
                    >
                      <strong>{form.name || "Marketplace name"}</strong>
                      <span>Home&nbsp;&nbsp; Hotels&nbsp;&nbsp; Contact</span>
                      <button>Login</button>
                    </div>
                    <div className="theme-preview-body">
                      <div>
                        <small>{form.heroStyle} hero</small>
                        <h4>Discover your perfect stay</h4>
                        <p>
                          Your site colors, typography, spacing and component
                          styles update here.
                        </p>
                        <button>Explore stays</button>
                      </div>
                      <article
                        className={`theme-preview-card theme-preview-card-${form.cardStyle}`}
                      >
                        <div />
                        <strong>Featured property</strong>
                        <span>Beautiful stays near you</span>
                      </article>
                    </div>
                    <div
                      className={`theme-preview-footer theme-preview-footer-${form.footerStyle}`}
                    >
                      {form.name || "Marketplace"} · Footer preview
                    </div>
                  </div>
                )}
                <div className="modal-actions site-wizard-actions">
                  <button
                    type="button"
                    className="admin-secondary"
                    onClick={() => {
                      if (siteFormStep === 0) setShow(false);
                      else setSiteFormStep((step) => step - 1);
                    }}
                  >
                    {siteFormStep === 0 ? "Cancel" : "Previous"}
                  </button>
                  {siteFormStep < siteFormSteps.length - 1 ? (
                    <button
                      type="button"
                      className="admin-primary compact"
                      onClick={(event) => {
                        const currentForm = event.currentTarget.form;
                        if (currentForm?.reportValidity()) {
                          setSiteFormStep((step) => step + 1);
                        }
                      }}
                    >
                      Save & Next <ChevronRight />
                    </button>
                  ) : (
                    <button
                      className="admin-primary compact"
                      disabled={Boolean(uploading) || uploadingHero !== null}
                    >
                      {editingId ? <Check /> : <Plus />}
                      {editingId ? "Save changes" : "Create site"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type BuilderSection = {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
};
type BuilderPage = {
  siteId: string;
  pageSlug: string;
  enabled: boolean;
  preset: string;
  draft: { seo: Record<string, unknown>; sections: BuilderSection[] };
  published: { seo: Record<string, unknown>; sections: BuilderSection[] };
  publishedAt?: string;
};
const builderPages = [
  "home",
  "hotels",
  "villas",
  "resorts",
  "homestays",
  "search",
  "about",
  "contact",
  "list-your-property",
  "account",
  "owner-dashboard",
];
const builderTypes = [
  "hero",
  "search",
  "featured-properties",
  "popular-hotels",
  "popular-villas",
  "popular-resorts",
  "popular-homestays",
  "property-categories",
  "destinations",
  "why-choose-us",
  "promotional-banner",
  "testimonials",
  "gallery",
  "faq",
  "cta",
];
function PagesView({ token }: { token: string }) {
  const [sites, setSites] = useState<Site[]>([]),
    [siteId, setSiteId] = useState(""),
    [pageSlug, setPageSlug] = useState("home"),
    [page, setPage] = useState<BuilderPage | null>(null),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    void api<ApiResponse<Site[]>>("/api/v1/admin/sites", token)
      .then((r) => {
        setSites(r.data);
        setSiteId(
          (old) =>
            old ||
            r.data.find((s) => s.status === "active")?._id ||
            r.data[0]?._id ||
            "",
        );
      })
      .catch((e) => setError((e as Error).message));
  }, [token]);
  useEffect(() => {
    if (!siteId) return;
    setLoading(true);
    void api<ApiResponse<BuilderPage>>(
      `/api/v1/admin/sites/${siteId}/pages/${pageSlug}`,
      token,
    )
      .then((r) => {
        setPage(r.data);
        setSelected(r.data.draft.sections[0]?.id || "");
        setError("");
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [siteId, pageSlug, token]);
  const sections = page?.draft.sections || [];
  const updateSections = (next: BuilderSection[]) =>
    setPage((old) =>
      old
        ? {
            ...old,
            draft: {
              ...old.draft,
              sections: next.map((s, order) => ({ ...s, order })),
            },
          }
        : old,
    );
  const move = (index: number, amount: number) => {
    const next = [...sections],
      target = index + amount;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateSections(next);
  };
  const save = async () => {
    if (!page) return;
    try {
      const r = await api<ApiResponse<BuilderPage>>(
        `/api/v1/admin/sites/${siteId}/pages/${pageSlug}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            enabled: page.enabled,
            preset: page.preset,
            seo: page.draft.seo,
            sections,
          }),
        },
      );
      setPage(r.data);
      setMessage("Draft saved.");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const publish = async () => {
    try {
      const r = await api<ApiResponse<BuilderPage>>(
        `/api/v1/admin/sites/${siteId}/pages/${pageSlug}/publish`,
        token,
        { method: "POST" },
      );
      setPage(r.data);
      setMessage("Page published successfully.");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const current = sections.find((s) => s.id === selected);
  const selectedSite = sites.find((s) => s._id === siteId);
  const previewSite = selectedSite
    ? ({
        ...selectedSite,
        domains: selectedSite.domains || [selectedSite.domain],
        theme: selectedSite.theme || {},
      } as SiteConfig)
    : null;
  const previewPage: PublishedPageConfig = {
    pageSlug,
    enabled: page?.enabled ?? true,
    preset: page?.preset || "DEFAULT_HOME",
    published: {
      seo: (page?.draft.seo || {}) as PublishedPageConfig["published"]["seo"],
      sections: sections as PublishedPageConfig["published"]["sections"],
    },
  };
  return (
    <>
      <PageHeader
        eyebrow="PAGE CONFIGURATION"
        title="Page builder"
        text="Control what each marketplace page shows using approved shared sections."
        action={
          <>
            <button className="admin-secondary" onClick={() => void save()}>
              Save draft
            </button>
            <button
              className="admin-primary compact"
              onClick={() => void publish()}
            >
              <Check />
              Publish
            </button>
          </>
        }
      />
      {message && (
        <div className="admin-alert success">
          <Check />
          {message}
        </div>
      )}
      {error && (
        <div className="admin-alert error">
          <CircleAlert />
          {error}
        </div>
      )}
      <div className="page-builder-toolbar">
        <label>
          Site
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Page
          <select
            value={pageSlug}
            onChange={(e) => setPageSlug(e.target.value)}
          >
            {builderPages.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <span>
          {page?.publishedAt
            ? `Published ${new Date(page.publishedAt).toLocaleString()}`
            : "Using safe defaults"}
        </span>
      </div>
      {loading ? (
        <div className="admin-loading">
          <LoaderCircle className="spin" />
          Loading page configuration…
        </div>
      ) : (
        page && (
          <div className="page-builder-layout">
            <section className="admin-card">
              <div className="card-heading">
                <div>
                  <span className="admin-kicker">SECTIONS</span>
                  <h2>Page structure</h2>
                </div>
                <select
                  aria-label="Add section"
                  value=""
                  onChange={(e) => {
                    const type = e.target.value;
                    if (!type) return;
                    const next = {
                      id: `${type}-${Date.now()}`,
                      type,
                      enabled: true,
                      order: sections.length,
                      config: {},
                    };
                    updateSections([...sections, next]);
                    setSelected(next.id);
                  }}
                >
                  <option value="">+ Add section</option>
                  {builderTypes.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div className="builder-section-list">
                {sections.map((s, index) => (
                  <article
                    className={selected === s.id ? "selected" : ""}
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                  >
                    <button
                      type="button"
                      className={`builder-toggle ${s.enabled ? "on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSections(
                          sections.map((x) =>
                            x.id === s.id ? { ...x, enabled: !x.enabled } : x,
                          ),
                        );
                      }}
                    >
                      {s.enabled ? "✓" : "○"}
                    </button>
                    <div>
                      <strong>{s.type.replaceAll("-", " ")}</strong>
                      <small>
                        {s.enabled ? "Visible" : "Hidden"} · Position{" "}
                        {index + 1}
                      </small>
                    </div>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        move(index, -1);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === sections.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        move(index, 1);
                      }}
                    >
                      ↓
                    </button>
                  </article>
                ))}
              </div>
            </section>
            <section className="admin-card builder-editor">
              <span className="admin-kicker">SECTION EDITOR</span>
              <h2>
                {current?.type.replaceAll("-", " ") || "Select a section"}
              </h2>
              {current && (
                <>
                  <label>
                    Title
                    <input
                      value={String(current.config.title || "")}
                      onChange={(e) =>
                        updateSections(
                          sections.map((s) =>
                            s.id === current.id
                              ? {
                                  ...s,
                                  config: {
                                    ...s.config,
                                    title: e.target.value,
                                  },
                                }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Description / subtitle
                    <textarea
                      rows={4}
                      value={String(
                        current.config.subtitle ||
                          current.config.description ||
                          "",
                      )}
                      onChange={(e) =>
                        updateSections(
                          sections.map((s) =>
                            s.id === current.id
                              ? {
                                  ...s,
                                  config: {
                                    ...s.config,
                                    subtitle: e.target.value,
                                    description: e.target.value,
                                  },
                                }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                  {[
                    "featured-properties",
                    "popular-hotels",
                    "popular-villas",
                    "popular-resorts",
                    "popular-homestays",
                    "destinations",
                    "property-categories",
                    "testimonials",
                    "gallery",
                    "faq",
                  ].includes(current.type) && (
                    <label>
                      Item limit
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={Number(current.config.limit || 6)}
                        onChange={(e) =>
                          updateSections(
                            sections.map((s) =>
                              s.id === current.id
                                ? {
                                    ...s,
                                    config: {
                                      ...s.config,
                                      limit: Number(e.target.value),
                                    },
                                  }
                                : s,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                  {["cta", "promotional-banner"].includes(current.type) && (
                    <>
                      <label>
                        Button text
                        <input
                          value={String(current.config.buttonText || "")}
                          onChange={(e) =>
                            updateSections(
                              sections.map((s) =>
                                s.id === current.id
                                  ? {
                                      ...s,
                                      config: {
                                        ...s.config,
                                        buttonText: e.target.value,
                                      },
                                    }
                                  : s,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Button URL
                        <input
                          value={String(current.config.buttonLink || "")}
                          onChange={(e) =>
                            updateSections(
                              sections.map((s) =>
                                s.id === current.id
                                  ? {
                                      ...s,
                                      config: {
                                        ...s.config,
                                        buttonLink: e.target.value,
                                      },
                                    }
                                  : s,
                              ),
                            )
                          }
                        />
                      </label>
                    </>
                  )}
                  <button
                    className="admin-secondary danger"
                    onClick={() => {
                      updateSections(
                        sections.filter((s) => s.id !== current.id),
                      );
                      setSelected("");
                    }}
                  >
                    Remove section
                  </button>
                </>
              )}
            </section>
            {previewSite && (
              <section className="admin-card builder-preview">
                <div className="builder-preview-heading">
                  <div>
                    <span className="admin-kicker">LIVE DRAFT PREVIEW</span>
                    <h2>{previewSite.name}</h2>
                  </div>
                  <small>Uses the same renderer as the public website</small>
                </div>
                <div className="builder-preview-viewport">
                  <PublicSiteProvider site={previewSite}>
                    <PageRenderer page={previewPage} />
                  </PublicSiteProvider>
                </div>
              </section>
            )}
          </div>
        )
      )}
    </>
  );
}

function OwnersView({ token }: { token: string }) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Owner | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      const r = await api<ApiResponse<Owner[]>>(
        `/api/v1/admin/owners?${q}`,
        token,
      );
      setOwners(r.data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, status, token]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function change(owner: Owner, next: Status) {
    try {
      await api(`/api/v1/admin/owners/${owner._id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function inspect(owner: Owner) {
    try {
      const response = await api<ApiResponse<Owner>>(
        `/api/v1/admin/owners/${owner._id}`,
        token,
      );
      setSelected(response.data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="PARTNER MANAGEMENT"
        title="Property owners"
        text="Review and manage every accommodation partner account."
      />
      <Filters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        options={["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]}
      />
      {error && (
        <div className="admin-alert error">
          <CircleAlert />
          {error}
        </div>
      )}
      {selected && (
        <section className="admin-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="admin-eyebrow">GLOBAL OWNER</p>
              <h2>{selected.name}</h2>
              <p>
                {selected.email} · {selected.phone}
              </p>
            </div>
            <button
              className="admin-secondary-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div>
              <strong>Properties</strong>
              <p>{selected.properties?.length ?? 0} across all sites</p>
            </div>
            <div>
              <strong>Marketplaces</strong>
              <p>
                {selected.sites?.map((site) => site.name).join(", ") || "None"}
              </p>
            </div>
            <div>
              <strong>Recent activity</strong>
              <p>
                {selected.auditHistory
                  ?.slice(0, 4)
                  .map((event) => event.action.replaceAll("_", " "))
                  .join(", ") || "No activity"}
              </p>
            </div>
          </div>
        </section>
      )}
      {loading ? (
        <div className="admin-loading">
          <LoaderCircle className="spin" /> Loading owners…
        </div>
      ) : owners.length === 0 ? (
        <Empty
          icon={<Users />}
          title="No owners found"
          text="Owner accounts will appear here when they register."
        />
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Phone</th>
                <th>Properties</th>
                <th>Marketplaces</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr key={owner._id}>
                  <td>
                    <strong>{owner.name}</strong>
                    <span>{owner.email}</span>
                  </td>
                  <td>{owner.phone}</td>
                  <td>{owner.propertyCount ?? 0}</td>
                  <td>{owner.siteIds?.length ?? 0}</td>
                  <td>
                    <StatusBadge value={owner.status} />
                  </td>
                  <td>{new Date(owner.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className="admin-secondary-button"
                        onClick={() => void inspect(owner)}
                      >
                        View
                      </button>
                      <select
                        value={owner.status}
                        onChange={(e) =>
                          change(owner, e.target.value as Status)
                        }
                      >
                        {["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Filters({
  search,
  setSearch,
  status,
  setStatus,
  options,
}: {
  search: string;
  setSearch: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="admin-filters">
      <label>
        <Search />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or location"
        />
      </label>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function PropertiesView({ token }: { token: string }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeMaster[]>([]);
  const [uploadingTypeImage, setUploadingTypeImage] = useState(false);
  const [typeForm, setTypeForm] = useState<Partial<PropertyTypeMaster> | null>(
    null,
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: "1", limit: "100" });
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      const [r, masters] = await Promise.all([
        api<ApiResponse<Property[]>>(`/api/v1/admin/properties?${q}`, token),
        api<ApiResponse<PropertyTypeMaster[]>>(
          "/api/v1/admin/property-types",
          token,
        ),
      ]);
      setProperties(r.data);
      setPropertyTypes(masters.data);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, status, token]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function review(
    property: Property,
    action: "approve" | "reject" | "request-changes" | "suspend",
  ) {
    const needsReason = action !== "approve";
    const reason = needsReason
      ? window.prompt("Add a reason for this decision:")
      : "";
    if (needsReason && !reason) return;
    try {
      await api(`/api/v1/admin/properties/${property._id}/${action}`, token, {
        method: "PATCH",
        body: JSON.stringify(needsReason ? { reason } : {}),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function saveType(event: FormEvent) {
    event.preventDefault();
    if (!typeForm || uploadingTypeImage) return;
    try {
      setError("");
      const payload = {
        name: typeForm.name || "",
        description: typeForm.description || "",
        image: typeForm.image || undefined,
        commissionPercent: Number(typeForm.commissionPercent ?? 0),
        status: typeForm.status || "active",
        sortOrder: Number(typeForm.sortOrder ?? 0),
      };
      await api(
        `/api/v1/admin/property-types${typeForm._id ? `/${typeForm._id}` : ""}`,
        token,
        {
          method: typeForm._id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setTypeForm(null);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  async function uploadTypeImage(file: File) {
    setUploadingTypeImage(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await api<ApiResponse<{ url: string }>>(
        "/api/v1/admin/media/images",
        token,
        { method: "POST", body: data },
      );
      setTypeForm((value) => ({ ...value, image: result.data.url }));
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setUploadingTypeImage(false);
    }
  }
  async function deleteType(item: PropertyTypeMaster) {
    if (!window.confirm(`Delete ${item.name}? Existing properties will keep their saved type.`)) return;
    try {
      await api(`/api/v1/admin/property-types/${item._id}`, token, {
        method: "DELETE",
      });
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="QUALITY CONTROL"
        title="Properties"
        text="Review submissions and keep every published stay up to standard."
      />
      <section className="admin-card property-master-card">
        <div className="property-master-heading">
          <div>
            <h2>Property type master</h2>
            <p>
              Controls the active types owners can select. Commission is
              private.
            </p>
          </div>
          <button
            className="admin-primary compact"
            onClick={() =>
              setTypeForm({
                name: "",
                description: "",
                commissionPercent: 0,
                status: "active",
                sortOrder: propertyTypes.length * 10,
              })
            }
          >
            <Plus /> Add Property Type
          </button>
        </div>
        <div className="property-master-table-wrap">
          <table className="property-master-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Property type</th>
                <th>Description</th>
                <th>Commission</th>
                <th>Status</th>
                <th>Order</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {propertyTypes.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span className="property-type-thumbnail">
                      {item.image ? (
                        // Cloudinary and legacy API-hosted images are both supported.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${item.image.startsWith("/") ? publicApiBase : ""}${item.image}`}
                          alt={`${item.name} property type`}
                        />
                      ) : (
                        <Building2 />
                      )}
                    </span>
                  </td>
                  <td><strong>{item.name}</strong></td>
                  <td><span className="table-muted">{item.description || "—"}</span></td>
                  <td>{item.commissionPercent}%</td>
                  <td><StatusBadge value={item.status} /></td>
                  <td>{item.sortOrder}</td>
                  <td className="actions">
                    <div className="table-action-buttons">
                      <button className="edit" onClick={() => setTypeForm(item)}>Edit</button>
                      <button className="delete" onClick={() => void deleteType(item)} aria-label={`Delete ${item.name}`}><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {typeForm && (
        <div className="property-type-modal-backdrop" role="presentation" onMouseDown={() => setTypeForm(null)}>
        <form className="property-type-modal" onSubmit={saveType} onMouseDown={(event) => event.stopPropagation()}>
          <header>
            <div><span>PROPERTY TYPE</span><h2>{typeForm._id ? "Edit" : "Add"} property type</h2><p>Configure how this accommodation type appears to owners.</p></div>
            <button type="button" className="property-type-modal-close" onClick={() => setTypeForm(null)} aria-label="Close"><X /></button>
          </header>
          <div className="property-type-modal-body admin-grid-two">
            {error && (
              <div className="admin-alert error property-type-form-error">
                <CircleAlert /> {error}
              </div>
            )}
            <label>
              Name
              <input
                required
                value={typeForm.name || ""}
                onChange={(e) =>
                  setTypeForm({ ...typeForm, name: e.target.value })
                }
              />
            </label>
            <label>
              Commission %
              <input
                required
                type="number"
                min="0"
                max="100"
                value={typeForm.commissionPercent ?? 0}
                onChange={(e) =>
                  setTypeForm({
                    ...typeForm,
                    commissionPercent: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Description
              <input
                value={typeForm.description || ""}
                onChange={(e) =>
                  setTypeForm({ ...typeForm, description: e.target.value })
                }
              />
            </label>
            <label>
              Status
              <select
                value={typeForm.status || "active"}
                onChange={(e) =>
                  setTypeForm({
                    ...typeForm,
                    status: e.target.value as "active" | "inactive",
                  })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              Sort order
              <input
                type="number"
                value={typeForm.sortOrder ?? 0}
                onChange={(e) =>
                  setTypeForm({
                    ...typeForm,
                    sortOrder: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="property-type-image-field">
              Property type image
              <span className="property-type-upload">
                <span className="property-type-upload-preview">
                  {typeForm.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${typeForm.image.startsWith("/") ? publicApiBase : ""}${typeForm.image}`} alt="Property type preview" />
                  ) : <ImagePlus />}
                </span>
                <span><strong>{uploadingTypeImage ? "Uploading to Cloudinary…" : typeForm.image ? "Image uploaded" : "Choose image"}</strong><small>PNG, JPG or WEBP · maximum 5 MB</small></span>
                <Upload />
                <input disabled={uploadingTypeImage} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files?.[0] && void uploadTypeImage(e.target.files[0])} />
              </span>
            </label>
          </div>
          <div className="property-type-modal-actions">
            <button type="button" onClick={() => setTypeForm(null)}>
              Cancel
            </button>
            <button className="admin-primary compact" disabled={uploadingTypeImage}>
              {uploadingTypeImage ? "Uploading image…" : "Save property type"}
            </button>
          </div>
        </form>
        </div>
      )}
      <Filters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        options={[
          "DRAFT",
          "PENDING",
          "APPROVED",
          "REJECTED",
          "CHANGES_REQUIRED",
          "SUSPENDED",
        ]}
      />
      {error && (
        <div className="admin-alert error">
          <CircleAlert />
          {error}
        </div>
      )}
      {loading ? (
        <div className="admin-loading">
          <LoaderCircle className="spin" /> Loading properties…
        </div>
      ) : properties.length === 0 ? (
        <Empty
          icon={<Building2 />}
          title="No properties found"
          text="Submitted properties will appear here for review."
        />
      ) : (
        <div className="property-list">
          {properties.map((property) => (
            <article className="property-row" key={property._id}>
              <div className="property-symbol">
                <Building2 />
              </div>
              <div className="property-main">
                <div>
                  <StatusBadge value={property.status} />
                  <span>{property.propertyType}</span>
                </div>
                <h2>{property.name}</h2>
                <p>
                  {property.address}, {property.city}, {property.state}
                </p>
                {property.reviewReason && (
                  <small>Last note: {property.reviewReason}</small>
                )}
              </div>
              <div className="property-actions">
                {property.status === "PENDING" && (
                  <>
                    <button
                      className="approve"
                      onClick={() => review(property, "approve")}
                    >
                      <Check /> Approve
                    </button>
                    <button onClick={() => review(property, "request-changes")}>
                      Request changes
                    </button>
                    <button
                      className="danger"
                      onClick={() => review(property, "reject")}
                    >
                      Reject
                    </button>
                  </>
                )}
                {property.status === "APPROVED" && (
                  <button
                    className="danger"
                    onClick={() => review(property, "suspend")}
                  >
                    Suspend
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function ProfileView({
  token,
  admin,
  setAdmin,
}: {
  token: string;
  admin: Admin;
  setAdmin: (a: Admin) => void;
}) {
  const [name, setName] = useState(admin.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function updateProfile(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api<ApiResponse<Admin>>("/api/v1/admin/me", token, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setAdmin(r.data);
      setMessage("Profile updated.");
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/admin/me/password", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed successfully.");
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATOR"
        title="Account settings"
        text="Manage your profile and secure your Super Admin account."
      />
      {message && (
        <div className="admin-alert success">
          <Check />
          {message}
        </div>
      )}
      {error && (
        <div className="admin-alert error">
          <CircleAlert />
          {error}
        </div>
      )}
      <div className="admin-grid-two">
        <form className="admin-card account-form" onSubmit={updateProfile}>
          <h2>Profile details</h2>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              required
            />
          </label>
          <label>
            Email
            <input value={admin.email} disabled />
          </label>
          <button className="admin-primary compact">Save profile</button>
        </form>
        <form className="admin-card account-form" onSubmit={updatePassword}>
          <h2>Change password</h2>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button className="admin-primary compact">
            <KeyRound /> Update password
          </button>
        </form>
      </div>
    </>
  );
}

function ApiSettingsView({ token }: { token: string }) {
  const [googleMapsBrowserKey, setGoogleMapsBrowserKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<ApiResponse<{ googleMapsBrowserKey: string }>>(
      "/api/v1/admin/settings/maps",
      token,
    )
      .then((result) => setGoogleMapsBrowserKey(result.data.googleMapsBrowserKey || ""))
      .catch((reason) => setError((reason as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await api<ApiResponse<{ googleMapsBrowserKey: string }>>(
        "/api/v1/admin/settings/maps",
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ googleMapsBrowserKey }),
        },
      );
      setGoogleMapsBrowserKey(result.data.googleMapsBrowserKey || "");
      setMessage(result.message || "API settings saved.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="INTEGRATIONS"
        title="API Settings"
        text="Connect external services used across the StayHaven platform."
      />
      {message && <div className="admin-alert success"><Check />{message}</div>}
      {error && <div className="admin-alert error"><CircleAlert />{error}</div>}
      {loading ? (
        <div className="admin-loading"><LoaderCircle className="spin" /> Loading API settings…</div>
      ) : (
        <form className="admin-card api-settings-card" onSubmit={save}>
          <div className="api-settings-card-heading">
            <i><MapPinned /></i>
            <div>
              <h2>Google Maps & Places</h2>
              <p>Enable Google business/place search, automatic addresses and exact map-pin selection for property onboarding.</p>
            </div>
            <StatusBadge value={googleMapsBrowserKey ? "active" : "inactive"} />
          </div>
          <label>
            Google Maps browser API key
            <input
              type="password"
              value={googleMapsBrowserKey}
              onChange={(event) => setGoogleMapsBrowserKey(event.target.value)}
              placeholder="AIza…"
              autoComplete="off"
            />
            <small>Leave empty to use the current fallback map automatically.</small>
          </label>
          <div className="api-settings-security">
            <ShieldCheck />
            <div>
              <strong>Required Google Cloud restrictions</strong>
              <p>Use Website restrictions for <code>https://guwahatihomestay.com/*</code> and <code>https://www.guwahatihomestay.com/*</code>. Restrict the key to Maps JavaScript API and Places API (New). Add future StayHaven domains before enabling them.</p>
            </div>
          </div>
          <div className="api-settings-actions">
            {googleMapsBrowserKey && <button type="button" onClick={() => setGoogleMapsBrowserKey("")}>Remove key</button>}
            <button className="admin-primary compact" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <KeyRound />}{saving ? "Saving…" : "Save API settings"}</button>
          </div>
        </form>
      )}
    </>
  );
}

export function AdminApp() {
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [checking, setChecking] = useState(true);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setChecking(false);
      return;
    }
    api<ApiResponse<Admin>>("/api/v1/admin/me", saved)
      .then((r) => {
        setToken(saved);
        setAdmin(r.data);
      })
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setChecking(false));
  }, []);
  function login(nextToken: string, nextAdmin: Admin) {
    setToken(nextToken);
    setAdmin(nextAdmin);
  }
  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAdmin(null);
  }
  if (checking)
    return (
      <div className="admin-splash">
        <Brand />
        <LoaderCircle className="spin" />
      </div>
    );
  if (!token || !admin) return <Login onLogin={login} />;
  const content =
    view === "dashboard" ? (
      <DashboardView token={token} go={setView} />
    ) : view === "sites" ? (
      <SitesView token={token} />
    ) : view === "pages" ? (
      <PagesView token={token} />
    ) : view === "owners" ? (
      <OwnersView token={token} />
    ) : view === "properties" ? (
      <PropertiesView token={token} />
    ) : view === "api-settings" ? (
      <ApiSettingsView token={token} />
    ) : (
      <ProfileView token={token} admin={admin} setAdmin={setAdmin} />
    );
  return (
    <div className="admin-shell">
      <aside className={menu ? "open" : ""}>
        <div className="sidebar-head">
          <Brand />
          <button onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => {
                setView(id);
                setMenu(false);
              }}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="admin-avatar">
            {admin.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{admin.name}</strong>
            <span>{admin.email}</span>
          </div>
          <button title="Sign out" onClick={logout}>
            <LogOut />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button className="menu-trigger" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div>
            <span>StayHaven Network</span>
            <strong>{nav.find((item) => item.id === view)?.label}</strong>
          </div>
          <a href="/" target="_blank">
            View website <ExternalLink />
          </a>
        </header>
        <main className="admin-content">{content}</main>
      </div>
    </div>
  );
}
