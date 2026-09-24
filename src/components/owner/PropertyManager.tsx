"use client";
/* The generated QR code is a data URL and is intentionally rendered directly. */
/* eslint-disable @next/next/no-img-element */
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Copy,
  Download,
  Eye,
  Filter,
  HelpCircle,
  Home,
  IndianRupee,
  ListChecks,
  MessageSquareText,
  QrCode,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import QRCodeMaker from "qrcode";
import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { OwnerBookings } from "@/components/owner/OwnerBookings";
import { OwnerRatesInventory } from "@/components/owner/OwnerRatesInventory";
import { OwnerPayments } from "@/components/owner/OwnerPayments";
type Site = { name: string; domain: string };
type Property = {
  _id?: string;
  slug?: string;
  name: string;
  displayName: string;
  propertyType?: string;
  city: string;
  state: string;
  status?: string;
  completeness?: number;
  price: number;
  roomDetails: Array<{
    id?: string;
    _id?: string;
    name?: string;
    baseRate?: number;
    totalRooms?: number;
    baseAdults?: number;
    additionalAdultPrice?: number;
    additionalChildPrice?: number;
  }>;
  media: Array<{ url: string }>;
};
const sections = [
  { id: "home", label: "Overview", icon: Home },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "rates", label: "Rates & Inventory", icon: SlidersHorizontal },
  { id: "payments", label: "Payments", icon: CircleDollarSign },
  { id: "information", label: "Property Information", icon: Home },
  { id: "reviews", label: "Rating & Review", icon: QrCode },
  { id: "analytics", label: "Analysis & Report", icon: BarChart3 },
  { id: "help", label: "Help Center", icon: HelpCircle },
] as const;
const permissionFor = {
  home: "VIEW_PROPERTIES",
  bookings: "VIEW_BOOKINGS",
  rates: "VIEW_RATES",
  payments: "VIEW_PAYMENTS",
  information: "VIEW_PROPERTIES",
  reviews: "VIEW_REVIEWS",
  analytics: "VIEW_ANALYTICS",
  help: "CONTACT_SUPPORT",
} as const;
export function PropertyManager({
  property,
  site,
  token,
  onBack,
  onEdit,
  permissions,
}: {
  property: Property;
  site?: Site;
  token: string;
  onBack: () => void;
  onEdit: () => void;
  permissions?: string[];
}) {
  const [tab, setTab] = useState<(typeof sections)[number]["id"]>("home");
  const [qr, setQr] = useState("");
  const [message, setMessage] = useState("");
  const [ticket, setTicket] = useState({
    category: "Property information",
    subject: "",
    description: "",
    priority: "normal",
    attachments: [] as string[],
  });
  const availableSections = useMemo(
    () =>
      permissions
        ? sections.filter(({ id }) => permissions.includes(permissionFor[id]))
        : sections,
    [permissions],
  );
  const activeTab = availableSections.some((section) => section.id === tab)
    ? tab
    : availableSections[0]?.id;
  const reviewLink = useMemo(
    () =>
      `https://${site?.domain || "guwahatihomestay.com"}/hotels/${property.slug || property._id}?review=1`,
    [property._id, property.slug, site],
  );
  const makeQr = async () =>
    setQr(
      await QRCodeMaker.toDataURL(reviewLink, {
        width: 420,
        margin: 2,
        color: { dark: "#111315", light: "#ffffff" },
      }),
    );
  const submit = async () => {
    try {
      await apiRequest(
        permissions
          ? "/api/v1/owner/team-member/support-tickets"
          : "/api/v1/owner/support-tickets",
        token,
        {
          method: "POST",
          body: JSON.stringify({ ...ticket, propertyId: property._id }),
        },
      );
      setMessage("Support request submitted.");
      setTicket({ ...ticket, subject: "", description: "" });
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const uploadAttachment = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    const result = await apiRequest<{ data: { url: string } }>(
      "/api/v1/owner/media/images",
      token,
      { method: "POST", body },
    );
    setTicket((value) => ({
      ...value,
      attachments: [...value.attachments, result.data.url],
    }));
  };
  return (
    <main className="manager-shell">
      <aside>
        <button onClick={onBack}>
          <ArrowLeft /> My Properties
        </button>
        <h2>{property.displayName || property.name}</h2>
        <span className="owner-status approved">LIVE</span>
        <nav>
          {availableSections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <section>
        <header>
          <div>
            <span>PROPERTY DASHBOARD</span>
            <h1>{availableSections.find((x) => x.id === activeTab)?.label}</h1>
          </div>
          <b>{site?.name}</b>
        </header>
        {activeTab === "home" && (
          <div className="manager-cards">
            <div className="property-performance-dashboard">
              <div className="property-performance-intro">
                <div>
                  <span>
                    <Sparkles /> PERFORMANCE OVERVIEW
                  </span>
                  <h2>Good afternoon</h2>
                  <p>Here is how your property is performing today.</p>
                </div>
                {(!permissions || permissions.includes("EDIT_PROPERTIES")) && (
                  <button onClick={onEdit}>Improve content score</button>
                )}
              </div>
              <div className="property-performance-layout">
                <div className="property-performance-main">
                  <section className="property-score-strip">
                    <div>
                      <small>Property status</small>
                      <strong className="live">
                        {property.status || "APPROVED"}
                      </strong>
                    </div>
                    <div>
                      <small>Content score</small>
                      <strong>
                        {property.completeness || 0}
                        <span>/100</span>
                      </strong>
                    </div>
                    <div>
                      <small>Rooms listed</small>
                      <strong>{property.roomDetails.length}</strong>
                    </div>
                    <div>
                      <small>Starting rate</small>
                      <strong>
                        ₹{Number(property.price || 0).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </section>
                  <section className="property-competitor-card">
                    <div className="property-kpi-icon">
                      <TrendingUp />
                    </div>
                    <div>
                      <h3>Grow your property performance</h3>
                      <p>
                        Keep rates, availability and property content updated to
                        improve visibility and conversions.
                      </p>
                    </div>
                    <button onClick={() => setTab("rates")}>Manage now</button>
                  </section>
                  <div className="property-kpi-grid">
                    <KpiCard
                      icon={CalendarDays}
                      title="Today's room nights"
                      value="0"
                      comparison="Last 7 days: 0 room nights"
                      onClick={() => setTab("bookings")}
                    />
                    <KpiCard
                      icon={IndianRupee}
                      title="Today's revenue"
                      value="₹0"
                      comparison="Last 7 days: ₹0"
                      onClick={() => setTab("payments")}
                    />
                    <KpiCard
                      icon={TrendingUp}
                      title="Average selling price"
                      value="₹0"
                      comparison="Last 7 days: ₹0"
                      onClick={() => setTab("analytics")}
                    />
                    <KpiCard
                      icon={CalendarDays}
                      title="Today's check-ins"
                      value="0"
                      comparison="Last 7 days: 0 check-ins"
                      onClick={() => setTab("bookings")}
                    />
                    <KpiCard
                      icon={Eye}
                      title="Property visits"
                      value="0"
                      comparison="Last 7 days: 0 visits"
                      onClick={() => setTab("analytics")}
                    />
                    <KpiCard
                      icon={BarChart3}
                      title="Conversion"
                      value="0%"
                      comparison="Last 7 days: 0%"
                      onClick={() => setTab("analytics")}
                    />
                  </div>
                </div>
                <aside className="property-action-center">
                  <header>
                    <span>
                      <ListChecks /> ACTION CENTER
                    </span>
                    <em>LIVE</em>
                  </header>
                  <div>
                    <strong>
                      {(property.completeness || 0) >= 100
                        ? "Your listing is up to date"
                        : "Your listing can perform better"}
                    </strong>
                    <p>
                      {(property.completeness || 0) >= 100
                        ? "There are no urgent content tasks right now."
                        : `Complete the remaining ${100 - (property.completeness || 0)}% of your property profile.`}
                    </p>
                    <div className="property-action-progress">
                      <i
                        style={{
                          width: `${Math.min(100, property.completeness || 0)}%`,
                        }}
                      />
                    </div>
                    <small>{property.completeness || 0}% content score</small>
                    {(!permissions ||
                      permissions.includes("EDIT_PROPERTIES")) && (
                      <button onClick={onEdit}>
                        Update property information
                      </button>
                    )}
                  </div>
                  <footer>
                    <button onClick={() => setTab("help")}>
                      Need help? Contact support
                    </button>
                  </footer>
                </aside>
              </div>
            </div>
            <article>
              <small>Property status</small>
              <strong>{property.status}</strong>
            </article>
            <article>
              <small>Profile completeness</small>
              <strong>{property.completeness || 0}%</strong>
            </article>
            <article>
              <small>Rooms</small>
              <strong>{property.roomDetails.length}</strong>
            </article>
            <article>
              <small>Current starting rate</small>
              <strong>
                ₹{Number(property.price || 0).toLocaleString("en-IN")}
              </strong>
            </article>
          </div>
        )}
        {activeTab === "bookings" && (
          <OwnerBookings
            propertyName={property.displayName || property.name}
            marketplaceName={site?.name}
            onManageInventory={() => setTab("rates")}
          />
        )}
        {activeTab === "payments" && (
          <OwnerPayments
            propertyId={property._id || ""}
            propertyName={property.displayName || property.name}
            token={token}
          />
        )}
        {activeTab === "analytics" && (
          <EmptyState
            title="No analytics data available yet"
            text="Real views, conversion, bookings and revenue will appear here when collected."
          />
        )}
        {activeTab === "rates" && (
          <OwnerRatesInventory
            propertyId={property._id || ""}
            rooms={property.roomDetails}
            token={token}
          />
        )}
        {activeTab === "information" && (
          <div className="wizard-card">
            <h2>Property Information</h2>
            <p>
              Update basic information, location, rooms, media, amenities,
              meals, policies and private legal details. Critical changes return
              to Super Admin review before becoming public.
            </p>
            {(!permissions || permissions.includes("EDIT_PROPERTIES")) && (
              <button className="btn-primary" onClick={onEdit}>
                Edit property information
              </button>
            )}
          </div>
        )}
        {activeTab === "reviews" && (
          <OwnerReviewsDashboard
            propertyName={property.displayName || property.name}
            reviewLink={reviewLink}
            qr={qr}
            onGenerateQr={() => void makeQr()}
          />
        )}
        {activeTab === "help" && (
          <div className="wizard-card">
            <h2>Contact StayHaven Support</h2>
            {message && <p className="owner-review-note">{message}</p>}
            <div className="wizard-grid">
              <label>
                Issue category
                <select
                  value={ticket.category}
                  onChange={(e) =>
                    setTicket({ ...ticket, category: e.target.value })
                  }
                >
                  <option>Property information</option>
                  <option>Media upload</option>
                  <option>Rates</option>
                  <option>Account access</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Priority
                <select
                  value={ticket.priority}
                  onChange={(e) =>
                    setTicket({ ...ticket, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
              {!permissions && (
                <label className="wide">
                  Subject
                  <input
                    value={ticket.subject}
                    onChange={(e) =>
                      setTicket({ ...ticket, subject: e.target.value })
                    }
                  />
                </label>
              )}
              <label className="wide">
                Description
                <textarea
                  value={ticket.description}
                  onChange={(e) =>
                    setTicket({ ...ticket, description: e.target.value })
                  }
                />
              </label>
              <label className="wide">
                Screenshot
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    event.target.files?.[0] &&
                    void uploadAttachment(event.target.files[0])
                  }
                />
                {ticket.attachments.length > 0 && (
                  <small>{ticket.attachments.length} attachment uploaded</small>
                )}
              </label>
            </div>
            <button className="btn-primary" onClick={() => void submit()}>
              Submit issue
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
function OwnerReviewsDashboard({
  propertyName,
  reviewLink,
  qr,
  onGenerateQr,
}: {
  propertyName: string;
  reviewLink: string;
  qr: string;
  onGenerateQr: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const distributions = [5, 4, 3, 2, 1];
  const copyLink = async () => {
    await navigator.clipboard.writeText(reviewLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="owner-ratings-dashboard">
      <div className="owner-ratings-heading">
        <div>
          <h2>Ratings &amp; Reviews</h2>
          <p>All ratings and guest reviews received by {propertyName}.</p>
        </div>
        <button className="owner-review-qr-link" onClick={onGenerateQr}>
          <QrCode /> Get review QR code
        </button>
      </div>

      <div className="owner-rating-overview">
        <article className="owner-rating-summary-card">
          <header>
            <div className="owner-rating-brand"><Star /><span><strong>Direct website</strong><small>0 ratings &amp; 0 reviews</small></span></div>
            <span className="owner-rating-status">Awaiting first review</span>
          </header>
          <div className="owner-rating-score-layout">
            <div className="owner-rating-score"><strong>—</strong><span>/5</span><small>No ratings yet</small></div>
            <div className="owner-rating-bars">
              {distributions.map((rating) => (
                <div key={rating}><span>{rating} star</span><i><b style={{ width: "0%" }} /></i><small>0% (0)</small></div>
              ))}
            </div>
          </div>
          <div className="owner-rating-subsection"><span>Category ratings</span><p>Category scores will appear after guests rate cleanliness, location, service and value.</p></div>
          <div className="owner-rating-subsection"><span>Recent ratings</span><div className="owner-rating-chips">{[1, 2, 3, 4, 5].map((rating) => <i key={rating}>{rating}</i>)}</div></div>
        </article>

        <article className="owner-rating-qr-card">
          <div className="owner-rating-qr-icon"><QrCode /></div>
          <h3>Collect more guest reviews</h3>
          <p>Share this property-specific link or place the QR code at reception and inside guest rooms.</p>
          {qr ? <img src={qr} alt={`${propertyName} review QR code`} /> : <button className="btn-primary" onClick={onGenerateQr}><QrCode /> Generate QR code</button>}
          <div className="owner-rating-link-row"><span>{reviewLink}</span><button onClick={() => void copyLink()}><Copy /> {copied ? "Copied" : "Copy"}</button></div>
          {qr && <a className="owner-rating-download" href={qr} download={`${propertyName}-review-qr.png`}><Download /> Download PNG</a>}
        </article>
      </div>

      <section className="owner-review-list-card">
        <header><div><h2>All Ratings &amp; Reviews <span>(0)</span></h2><p>Search and filter feedback submitted by verified guests.</p></div><label className="owner-review-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by booking ID or guest" /></label></header>
        <div className="owner-review-filters"><span><Filter /> Filters</span><select aria-label="Posted on"><option>Posted: Newest first</option><option>Oldest first</option></select><select aria-label="Rating"><option>Rating: All</option>{distributions.map((rating) => <option key={rating}>{rating} stars</option>)}</select><select aria-label="Reply status"><option>Reply: All</option><option>Replied</option><option>Not replied</option></select><select aria-label="Room"><option>Room: All</option></select><button type="button">Clear all</button></div>
        <div className="owner-review-empty"><div><MessageSquareText /></div><h3>No guest reviews yet</h3><p>{search ? "No reviews match your search." : "New ratings and reviews will appear here automatically after guests submit feedback."}</p><button onClick={onGenerateQr}><QrCode /> Share review QR</button></div>
      </section>
    </div>
  );
}
function KpiCard({
  icon: Icon,
  title,
  value,
  comparison,
  onClick,
}: {
  icon: typeof CalendarDays;
  title: string;
  value: string;
  comparison: string;
  onClick: () => void;
}) {
  return (
    <article className="property-kpi-card">
      <div className="property-kpi-icon">
        <Icon />
      </div>
      <div>
        <h3>{title}</h3>
        <strong>{value}</strong>
        <small>{comparison}</small>
      </div>
      <button onClick={onClick}>View details</button>
    </article>
  );
}
function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="owner-empty">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
