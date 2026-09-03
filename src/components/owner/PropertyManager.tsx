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
  HelpCircle,
  Home,
  IndianRupee,
  ListChecks,
  QrCode,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import QRCodeMaker from "qrcode";
import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
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
  roomDetails: Array<{ name?: string; baseRate?: number }>;
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
export function PropertyManager({
  property,
  site,
  token,
  onBack,
  onEdit,
}: {
  property: Property;
  site?: Site;
  token: string;
  onBack: () => void;
  onEdit: () => void;
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
      await apiRequest("/api/v1/owner/support-tickets", token, {
        method: "POST",
        body: JSON.stringify({ ...ticket, propertyId: property._id }),
      });
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
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
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
            <h1>{sections.find((x) => x.id === tab)?.label}</h1>
          </div>
          <b>{site?.name}</b>
        </header>
        {tab === "home" && (
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
                <button onClick={onEdit}>Improve content score</button>
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
                    <button onClick={onEdit}>
                      Update property information
                    </button>
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
        {["bookings", "payments", "analytics"].includes(tab) && (
          <EmptyState
            title={
              tab === "bookings"
                ? "No booking records yet"
                : tab === "payments"
                  ? "No payment records yet"
                  : "No analytics data available yet"
            }
            text={
              tab === "bookings"
                ? "Bookings and filters will appear here when the booking engine is connected."
                : tab === "payments"
                  ? "Payments will appear after bookings are processed."
                  : "Real views, conversion, bookings and revenue will appear here when collected."
            }
          />
        )}
        {tab === "rates" && (
          <div className="wizard-card">
            <h2>Rates & Inventory foundation</h2>
            <p>
              Room base rates are ready. Date-range rates, adjustments and
              availability will connect to the future inventory engine.
            </p>
            {property.roomDetails.map((room, index) => (
              <div className="rate-row" key={index}>
                <b>{String(room.name || `Room ${index + 1}`)}</b>
                <span>
                  ₹{Number(room.baseRate || 0).toLocaleString("en-IN")} / night
                </span>
              </div>
            ))}
          </div>
        )}
        {tab === "information" && (
          <div className="wizard-card">
            <h2>Property Information</h2>
            <p>
              Update basic information, location, rooms, media, amenities,
              meals, policies and private legal details. Critical changes return
              to Super Admin review before becoming public.
            </p>
            <button className="btn-primary" onClick={onEdit}>
              Edit property information
            </button>
          </div>
        )}
        {tab === "reviews" && (
          <div className="wizard-card qr-panel">
            <h2>Property review QR</h2>
            <p>The QR is tied to this property and marketplace only.</p>
            <code>{reviewLink}</code>
            {qr ? (
              <>
                <img src={qr} alt="Property review QR" />
                <div>
                  <button
                    onClick={() =>
                      void navigator.clipboard.writeText(reviewLink)
                    }
                  >
                    <Copy /> Copy link
                  </button>
                  <a href={qr} download={`${property.name}-review-qr.png`}>
                    <Download /> Download PNG
                  </a>
                </div>
              </>
            ) : (
              <button className="btn-primary" onClick={() => void makeQr()}>
                <QrCode /> Generate Review QR
              </button>
            )}
          </div>
        )}
        {tab === "help" && (
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
              <label className="wide">
                Subject
                <input
                  value={ticket.subject}
                  onChange={(e) =>
                    setTicket({ ...ticket, subject: e.target.value })
                  }
                />
              </label>
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
