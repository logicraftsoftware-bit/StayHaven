"use client";

import {
  CalendarDays,
  CalendarRange,
  Check,
  FileSpreadsheet,
  Inbox,
  List,
  QrCode,
  Search,
  SlidersHorizontal,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";

type BookingPeriod = "past" | "upcoming" | "custom";

const bookingStatuses = ["Acknowledged", "Cancelled", "Pending", "Modified", "Check-in denied"];
const paymentStatuses = ["Pending", "Processed"];

export function OwnerBookings({
  propertyName,
  marketplaceName,
  onManageInventory,
}: {
  propertyName: string;
  marketplaceName?: string;
  onManageInventory: () => void;
}) {
  const [view, setView] = useState<"list" | "hourly">("list");
  const [period, setPeriod] = useState<BookingPeriod>("upcoming");
  const [search, setSearch] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const downloadTemplate = () => {
    const header = "Guest Name,Check-in,Check-out,Room & Meal Plan,Booking ID,Guest Contact,Net Amount,Status\n";
    const blob = new Blob([header], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${propertyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-bookings.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="owner-bookings-workspace">
      <div className="owner-bookings-actions">
        <div className="owner-bookings-view" aria-label="Booking view">
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            <List /> List view
          </button>
          <button className={view === "hourly" ? "active" : ""} onClick={() => setView("hourly")}>
            <CalendarDays /> Hourly view
          </button>
        </div>
        <label className="owner-booking-search">
          <Search />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by booking ID or guest name"
          />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X /></button>}
        </label>
        <button className="owner-bookings-utility" onClick={() => setShowGuide(true)}>
          <Video /> Booking guide
        </button>
        <button className="owner-bookings-utility" onClick={downloadTemplate}>
          <FileSpreadsheet /> Download Excel
        </button>
      </div>

      <div className="owner-bookings-periods">
        <button className={period === "past" ? "active" : ""} onClick={() => setPeriod("past")}>Past 30 days</button>
        <button className={period === "upcoming" ? "active" : ""} onClick={() => setPeriod("upcoming")}>Upcoming 90 days <span>0</span></button>
        <button className={period === "custom" ? "active" : ""} onClick={() => setPeriod("custom")}>
          <CalendarRange /> Select date range
        </button>
        <button className="owner-bookings-filter-toggle" onClick={() => setShowMobileFilters((value) => !value)}>
          <SlidersHorizontal /> Filters
        </button>
      </div>

      {period === "custom" && (
        <div className="owner-bookings-date-range">
          <label>Check-in from <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>Check-in to <input type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <button onClick={() => { setFrom(""); setTo(""); }}>Clear dates</button>
        </div>
      )}

      <div className={`owner-bookings-layout ${showMobileFilters ? "filters-open" : ""}`}>
        <aside className="owner-bookings-filters">
          <div className="owner-bookings-filter-head">
            <div><SlidersHorizontal /><strong>Filters</strong></div>
            <button onClick={() => setShowMobileFilters(false)} aria-label="Close filters"><X /></button>
          </div>
          <div className="owner-review-prompt">
            <span><QrCode /> Guest reviews</span>
            <strong>Build trust after every stay</strong>
            <p>Your property review QR is ready in Rating &amp; Review.</p>
          </div>
          <FilterGroup title="Channels" items={["All bookings", "Direct website"]} radio defaultItem="All bookings" />
          <FilterGroup title="Date filters" items={["Check-in", "Check-out", "Booking dates", "Staying today"]} radio defaultItem="Check-in" />
          <FilterGroup title="Booking status" items={bookingStatuses} />
          <FilterGroup title="Payment status" items={paymentStatuses} />
        </aside>

        <section className="owner-bookings-results">
          <div className="owner-bookings-result-meta">
            <div>
              <span>{period === "past" ? "PAST BOOKINGS" : period === "custom" ? "CUSTOM RANGE" : "UPCOMING BOOKINGS"}</span>
              <h2>{propertyName}</h2>
              <p>{marketplaceName || "Your marketplace"} · {view === "list" ? "List view" : "Hourly view"}</p>
            </div>
            <span className="owner-booking-count">0 bookings</span>
          </div>
          <div className="owner-bookings-table" role="table" aria-label="Property bookings">
            <div className="owner-bookings-table-head" role="row">
              <span>Guest name</span>
              <span>Stay duration</span>
              <span>Room &amp; meal plan</span>
              <span>Booking ID</span>
              <span>Guest contact</span>
              <span>Net amount</span>
            </div>
            <div className="owner-bookings-empty">
              <i><Inbox /></i>
              <span>NO RESERVATIONS FOUND</span>
              <h3>{search ? "No booking matches your search" : `No ${period === "past" ? "past" : "upcoming"} bookings yet`}</h3>
              <p>
                {search
                  ? "Try another booking ID or guest name."
                  : "New reservations will appear here automatically with guest, stay, payment and settlement details."}
              </p>
              <button onClick={onManageInventory}><CalendarDays /> Manage rates &amp; inventory</button>
            </div>
          </div>
        </section>
      </div>

      {showGuide && (
        <div className="owner-booking-guide-backdrop" role="presentation" onMouseDown={() => setShowGuide(false)}>
          <section className="owner-booking-guide" role="dialog" aria-modal="true" aria-label="Booking guide" onMouseDown={(event) => event.stopPropagation()}>
            <button className="owner-booking-guide-close" onClick={() => setShowGuide(false)} aria-label="Close guide"><X /></button>
            <i><CalendarDays /></i>
            <span>BOOKING WORKSPACE</span>
            <h2>Everything needed to manage a stay</h2>
            <p>Search reservations, filter by stay or payment status, review guest and room details, and export the current booking list.</p>
            <ul>
              <li><Check /> Use Upcoming 90 days for arrival planning.</li>
              <li><Check /> Open a reservation to review payment and settlement details.</li>
              <li><Check /> Export the list for your operations team.</li>
            </ul>
            <button onClick={() => setShowGuide(false)}>Got it</button>
          </section>
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  items,
  radio = false,
  defaultItem,
}: {
  title: string;
  items: string[];
  radio?: boolean;
  defaultItem?: string;
}) {
  return (
    <fieldset className="owner-booking-filter-group">
      <legend>{title}</legend>
      {items.map((item) => (
        <label key={item}>
          <input type={radio ? "radio" : "checkbox"} name={radio ? title : undefined} defaultChecked={item === defaultItem} />
          <span>{item}</span>
        </label>
      ))}
    </fieldset>
  );
}
