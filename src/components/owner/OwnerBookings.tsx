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
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";

type BookingPeriod = "past" | "upcoming" | "custom";

const bookingStatuses = ["Acknowledged", "Cancelled", "Pending", "Modified", "Check-in denied"];
const paymentStatuses = ["Pending", "Processed"];
type Booking = { _id: string; bookingNumber: string; guestName: string; guestEmail: string; guestPhone: string; roomName: string; checkIn: string; checkOut: string; rooms: number; adults: number; children: number; grossAmount: number; paymentStatus: string; status: string; settlementStatus: string; cancelReason?: string; refundStatus?: string };

export function OwnerBookings({
  propertyId,
  token,
  canCancel,
  propertyName,
  marketplaceName,
  onManageInventory,
}: {
  propertyId: string;
  token: string;
  canCancel: boolean;
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const refreshBookings = () => apiRequest<{ data: Booking[] }>(`/api/v1/owner/payments/bookings?propertyId=${encodeURIComponent(propertyId)}`, token).then((response) => setBookings(response.data));
  async function cancelBooking() {
    if (!cancelTarget) return;
    setCancelling(true); setLoadError("");
    try {
      await apiRequest(`/api/v1/owner/payments/bookings/${cancelTarget._id}/cancel`, token, { method: "POST", body: JSON.stringify({ reason: cancelReason.trim() }) });
      await refreshBookings();
      setActionNotice(cancelTarget.paymentStatus === "PAID" ? "Booking cancelled. The refund has been requested from the payment gateway." : "Booking cancelled. No payment was collected.");
      setCancelTarget(null); setCancelReason("");
    } catch (reason) { setLoadError((reason as Error).message); }
    finally { setCancelling(false); }
  }
  useEffect(() => {
    let active = true;
    apiRequest<{ data: Booking[] }>(`/api/v1/owner/payments/bookings?propertyId=${encodeURIComponent(propertyId)}`, token)
      .then((response) => { if (active) setBookings(response.data); })
      .catch((reason) => { if (active) setLoadError((reason as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [propertyId, token]);
  const visible = useMemo(() => bookings.filter((booking) => {
    const today = new Date();
    const arrival = new Date(booking.checkIn);
    const departure = new Date(booking.checkOut);
    if (period === "past" && (departure >= today || departure < new Date(today.getTime() - 30 * 86400000))) return false;
    if (period === "upcoming" && (departure < today || arrival > new Date(today.getTime() + 90 * 86400000))) return false;
    if (period === "custom" && ((from && booking.checkIn.slice(0, 10) < from) || (to && booking.checkIn.slice(0, 10) > to))) return false;
    return `${booking.bookingNumber} ${booking.guestName}`.toLowerCase().includes(search.toLowerCase());
  }), [bookings, period, from, to, search]);

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
      {actionNotice && <p className="owner-booking-notice" role="status">{actionNotice}</p>}
      {loadError && <p className="owner-booking-notice error" role="alert">{loadError}</p>}
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
        <button className={period === "upcoming" ? "active" : ""} onClick={() => setPeriod("upcoming")}>Upcoming 90 days <span>{bookings.filter((booking) => new Date(booking.checkOut) >= new Date()).length}</span></button>
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
            <span className="owner-booking-count">{visible.length} {visible.length === 1 ? "booking" : "bookings"}</span>
          </div>
          <div className="owner-bookings-table" role="table" aria-label="Property bookings">
            <div className="owner-bookings-table-head" role="row">
              <span>Guest name</span>
              <span>Stay duration</span>
              <span>Room &amp; meal plan</span>
              <span>Booking ID</span>
              <span>Guest contact</span>
              <span>Booking amount</span>
            </div>
            {visible.map((booking) => <div className="owner-booking-real-row" role="row" key={booking._id}>
              <span><b>{booking.guestName}</b><small>{booking.status === "CANCELLED" ? `Cancelled · ${booking.cancelReason || "Owner cancelled"}` : booking.status === "REFUND_REQUESTING" ? "Refund request needs retry" : booking.paymentStatus === "PAY_AT_HOTEL" ? "Accepted · pay at hotel" : booking.paymentStatus === "PAYMENT_PENDING" ? "Accepted · online payment pending" : "Accepted · paid online"}</small></span>
              <span>{new Date(booking.checkIn).toLocaleDateString("en-IN")} – {new Date(booking.checkOut).toLocaleDateString("en-IN")}</span>
              <span>{booking.roomName}<small>{booking.rooms} room · {booking.adults} adults</small></span>
              <span>{booking.bookingNumber}</span>
              <span><a href={`tel:${booking.guestPhone.replace(/[^+\d]/g, "")}`}>{booking.guestPhone}</a><small>{booking.guestEmail}</small></span>
              <span>₹{(booking.grossAmount / 100).toLocaleString("en-IN")}<small>{booking.paymentStatus === "PAY_AT_HOTEL" ? "Due at property" : booking.paymentStatus === "REFUND_PENDING" ? "Refund in progress" : booking.paymentStatus === "REFUNDED" ? "Refund processed" : booking.paymentStatus === "REFUND_FAILED" ? "Refund failed" : "Paid"}</small>{canCancel && ["CONFIRMED", "REFUND_REQUESTING"].includes(booking.status) && booking.paymentStatus !== "PAYMENT_PENDING" && new Date(booking.checkIn) > new Date() && (booking.paymentStatus !== "PAID" || booking.settlementStatus === "ON_HOLD") && <button className="owner-booking-cancel" onClick={() => { setCancelTarget(booking); setCancelReason(booking.cancelReason || ""); }}>{booking.status === "REFUND_REQUESTING" ? "Retry refund request" : "Cancel booking"}</button>}</span>
            </div>)}
            {(loading || loadError || !visible.length) && <div className="owner-bookings-empty">
              <i><Inbox /></i>
              <span>{loading ? "LOADING BOOKINGS" : loadError ? "BOOKINGS UNAVAILABLE" : "NO RESERVATIONS FOUND"}</span>
              <h3>{loading ? "Loading reservations…" : loadError || (search ? "No booking matches your search" : `No ${period === "past" ? "past" : "upcoming"} bookings yet`)}</h3>
              <p>
                {search
                  ? "Try another booking ID or guest name."
                  : "New reservations will appear here automatically with guest, stay, payment and settlement details."}
              </p>
              <button onClick={onManageInventory}><CalendarDays /> Manage rates &amp; inventory</button>
            </div>}
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
      {cancelTarget && <div className="owner-booking-guide-backdrop" role="presentation" onMouseDown={() => setCancelTarget(null)}><section className="owner-booking-cancel-dialog" role="dialog" aria-modal="true" aria-label="Cancel booking" onMouseDown={(event) => event.stopPropagation()}><h2>Cancel {cancelTarget.bookingNumber}?</h2><p>{cancelTarget.paymentStatus === "PAID" ? "A full refund will be requested from the payment provider. The guest will see the refund status in My trips." : "This pay-at-hotel booking will be released. No refund is needed because no online payment was collected."}</p><label>Reason for cancellation<textarea minLength={5} maxLength={500} required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Explain the reason to the guest"/></label><div><button type="button" onClick={() => setCancelTarget(null)}>Keep booking</button><button type="button" disabled={cancelling || cancelReason.trim().length < 5} onClick={() => void cancelBooking()}>{cancelling ? "Processing…" : "Confirm cancellation"}</button></div>{loadError && <p role="alert">{loadError}</p>}</section></div>}
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
