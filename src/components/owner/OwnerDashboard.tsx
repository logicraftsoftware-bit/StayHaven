"use client";
/* Cloudinary URLs are already transformed/optimized by the media service. */
/* eslint-disable @next/next/no-img-element */
import {
  ArrowUpDown,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheckBig,
  Download,
  KeyRound,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "@/components/layout/Brand";
import { useSite } from "@/components/site/SiteProvider";
import { apiRequest } from "@/lib/api-client";
import { OWNER_TOKEN_KEY } from "./OwnerAuth";
type Site = {
  _id: string;
  name: string;
  domain: string;
  city: string;
  state: string;
};
type Property = {
  _id: string;
  siteId: Site | string;
  name: string;
  displayName?: string;
  propertyType: string;
  city: string;
  state: string;
  status: string;
  reviewReason?: string;
  pendingUpdateStatus?: "DRAFT" | "PENDING" | "CHANGES_REQUIRED";
  pendingReviewReason?: string;
  pendingReviewSections?: string[];
  completeness?: number;
  media?: Array<{ url: string; primary?: boolean }>;
};
type Api<T> = { success: boolean; data: T };
type Owner = {
  _id: string;
  name: string;
  email: string;
  businessName?: string;
  profileImage?: string;
};
export function OwnerDashboard() {
  const router = useRouter();
  const currentSite = useSite();
  const [sites, setSites] = useState<Site[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState<"property" | "city">("property");
  const [tab, setTab] = useState<"live" | "progress">("live");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const load = useCallback(async (token: string) => {
    const [s, p, account] = await Promise.all([
      apiRequest<Api<Site[]>>("/api/v1/owner/sites", token),
      apiRequest<Api<Property[]>>("/api/v1/owner/properties", token),
      apiRequest<Api<Owner>>("/api/v1/owner/me", token),
    ]);
    setSites(s.data);
    setProperties(p.data);
    setOwner(account.data);
    setLastUpdated(new Date());
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
      if (!token) return router.replace("/list-your-property");
      load(token)
        .catch(() => {
          localStorage.removeItem(OWNER_TOKEN_KEY);
          router.replace("/list-your-property");
        })
        .finally(() => setLoading(false));
    });
  }, [load, router]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setPasswordOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const logout = () => {
    localStorage.removeItem(OWNER_TOKEN_KEY);
    router.replace("/list-your-property");
  };
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
    setSavingPassword(true);
    setPasswordError("");
    setPasswordNotice("");
    try {
      await apiRequest("/api/v1/owner/me/password", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordNotice("Password changed successfully.");
    } catch (error) {
      setPasswordError((error as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };
  const visible = useMemo(
    () =>
      properties.filter((p) => {
        const siteId = typeof p.siteId === "string" ? p.siteId : p.siteId._id;
        return (
          (!filter || siteId === filter) &&
          (!search.trim() ||
            (searchBy === "property"
              ? (p.displayName || p.name)
                  .toLowerCase()
                  .includes(search.trim().toLowerCase())
              : p.city.toLowerCase().includes(search.trim().toLowerCase()))) &&
          (tab === "live" ? p.status === "APPROVED" : p.status !== "APPROVED")
        );
      }),
    [filter, properties, search, searchBy, tab],
  );
  const refresh = async () => {
    const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
    setRefreshing(true);
    try {
      await load(token);
    } finally {
      setRefreshing(false);
    }
  };
  const downloadSummary = () => {
    const rows = [
      [
        "Property",
        "City",
        "Status",
        "Content score",
        "Today's bookings",
        "Today's check-ins",
        "Staying today",
        "Today's check-outs",
        "Net bookings",
        "Net earnings",
      ],
      ...visible.map((property) => [
        property.displayName || property.name,
        property.city,
        property.status,
        `${property.completeness || 0}/100`,
        0,
        0,
        0,
        0,
        0,
        0,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `property-booking-summary-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  if (loading)
    return <div className="owner-loading">Opening owner dashboard…</div>;
  return (
    <main className="owner-dashboard-shell">
      <header className="owner-dashboard-header">
        <Brand />
        <div className="owner-profile-menu" ref={profileRef}>
          <button
            className="owner-profile-trigger"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            {owner?.profileImage ? (
              <img src={owner.profileImage} alt="" />
            ) : (
              <span>{owner?.name?.slice(0, 1).toUpperCase() || "O"}</span>
            )}
            <span className="owner-profile-name">
              <small>Welcome back</small>
              <strong>{owner?.businessName || owner?.name}</strong>
            </span>
            <ChevronDown className={profileOpen ? "open" : ""} />
          </button>
          {profileOpen && (
            <div className="owner-profile-dropdown">
              <div className="owner-profile-summary">
                <UserRound />
                <div>
                  <strong>{owner?.businessName || owner?.name}</strong>
                  <small>{owner?.email}</small>
                </div>
              </div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  setPasswordOpen(true);
                }}
              >
                <KeyRound />
                <span>
                  <strong>Change password</strong>
                  <small>Update your account password</small>
                </span>
                <ChevronDown />
              </button>
              <button className="owner-profile-logout" onClick={logout}>
                <LogOut /> Logout
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="owner-workspace">
        <aside className="owner-sidebar">
          <b>StayHaven Partner</b>
          <button className="active">
            <Building2 /> My Properties
          </button>
          <button onClick={() => router.push("/owner/team")}>
            <Users /> My Team
          </button>
        </aside>
        <section className="owner-main">
          <header className="owner-page-head">
            <div>
              <span>OWNER DASHBOARD</span>
              <h1>My Properties</h1>
              <p>
                Manage stays across every StayHaven marketplace from one
                account.
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => router.push("/owner/properties/new")}
            >
              <Plus /> List New Property
            </button>
          </header>
          {properties.some(
            (property) =>
              property.status === "CHANGES_REQUIRED" ||
              property.pendingUpdateStatus === "CHANGES_REQUIRED",
          ) && (
            <div className="owner-update-notification">
              <span>!</span>
              <div>
                <strong>Property update requested</strong>
                <p>
                  The administrator has sent correction instructions. Open the
                  affected property to review the message, update the unlocked
                  sections and resubmit it.
                </p>
              </div>
            </div>
          )}
          <div className="owner-tabs">
            <button
              className={tab === "live" ? "active" : ""}
              onClick={() => setTab("live")}
            >
              Active Properties (
              {properties.filter((p) => p.status === "APPROVED").length})
            </button>
            <button
              className={tab === "progress" ? "active" : ""}
              onClick={() => setTab("progress")}
            >
              In-Progress Properties (
              {properties.filter((p) => p.status !== "APPROVED").length})
            </button>
          </div>
          {tab === "live" ? (
            <section className="owner-booking-summary owner-active-properties">
              <header className="owner-summary-head">
                <div>
                  <span className="owner-summary-kicker">
                    <CircleCheckBig /> LIVE PORTFOLIO
                  </span>
                  <h2>Booking Summary</h2>
                  <p>
                    Today&apos;s bookings, pending tasks and business earnings
                    at a glance.
                  </p>
                </div>
                <div className="owner-summary-actions">
                  <span>
                    {lastUpdated
                      ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : "Not updated"}
                  </span>
                  <button onClick={() => void refresh()} disabled={refreshing}>
                    <RefreshCw className={refreshing ? "owner-spin" : ""} />
                    Refresh
                  </button>
                  <button className="download" onClick={downloadSummary}>
                    <Download /> Download
                  </button>
                </div>
              </header>
              <div className="owner-summary-filters">
                <div className="owner-search-modes">
                  <strong>Filter and Search by:</strong>
                  <button
                    className={searchBy === "property" ? "active" : ""}
                    onClick={() => setSearchBy("property")}
                  >
                    Property
                  </button>
                  <button
                    className={searchBy === "city" ? "active" : ""}
                    onClick={() => setSearchBy("city")}
                  >
                    City
                  </button>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search by ${searchBy}`}
                />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">All marketplaces</option>
                  {sites.map((site) => (
                    <option key={site._id} value={site._id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              {visible.length ? (
                <div className="owner-summary-panels">
                  <div className="owner-summary-table-wrap">
                    <table className="owner-summary-table owner-summary-main-table">
                      <thead>
                        <tr>
                          <th>
                            Property <ArrowUpDown />
                          </th>
                          <th>Content Score</th>
                          <th>Today&apos;s Bookings</th>
                          <th>Today&apos;s Check Ins</th>
                          <th>Staying Today</th>
                          <th>Today&apos;s Check Outs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((property) => {
                          const site =
                            typeof property.siteId === "string"
                              ? sites.find((s) => s._id === property.siteId)
                              : property.siteId;
                          const cover =
                            property.media?.find((media) => media.primary)
                              ?.url || property.media?.[0]?.url;
                          return (
                            <tr key={property._id}>
                              <td>
                                <div className="owner-summary-property">
                                  <button
                                    className="owner-summary-property-image-link"
                                    aria-label={`Manage ${property.displayName || property.name}`}
                                    onClick={() =>
                                      router.push(
                                        `/owner/properties/${property._id}`,
                                      )
                                    }
                                  >
                                    {cover ? (
                                      <img src={cover} alt="" />
                                    ) : (
                                      <span>
                                        <Building2 />
                                      </span>
                                    )}
                                  </button>
                                  <div>
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/owner/properties/${property._id}`,
                                        )
                                      }
                                    >
                                      {property.displayName || property.name}
                                    </button>
                                    <small>
                                      {property.propertyType} · {property.city}
                                    </small>
                                    <em>{site?.name || currentSite.name}</em>
                                  </div>
                                </div>
                                {property.reviewReason && (
                                  <div className="owner-review-note compact">
                                    <b>Admin note</b> {property.reviewReason}
                                  </div>
                                )}
                              </td>
                              <td>
                                <strong className="owner-content-score">
                                  {property.completeness || 0}/100
                                </strong>
                                <button
                                  className="owner-pending-task"
                                  onClick={() =>
                                    router.push(
                                      `/owner/properties/${property._id}`,
                                    )
                                  }
                                >
                                  {property.status === "CHANGES_REQUIRED"
                                    ? "1 pending task"
                                    : property.pendingUpdateStatus === "PENDING"
                                      ? "Update pending approval"
                                      : property.pendingUpdateStatus ===
                                          "CHANGES_REQUIRED"
                                        ? "Update changes requested"
                                        : property.status === "APPROVED"
                                          ? "No pending tasks"
                                          : "Listing in progress"}
                                </button>
                                {property.pendingReviewSections?.length ? (
                                  <small className="owner-pending-sections">
                                    Pending:{" "}
                                    {property.pendingReviewSections.join(", ")}
                                  </small>
                                ) : null}
                              </td>
                              <td>0</td>
                              <td>0</td>
                              <td>0</td>
                              <td>0</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="owner-summary-table-wrap owner-financial-panel">
                    <div className="owner-summary-range">
                      <span>
                        {dateFrom} – {dateTo}
                      </span>
                      <label>
                        <CalendarDays /> Change dates
                        <input
                          type="date"
                          value={dateFrom}
                          max={dateTo}
                          onChange={(event) => setDateFrom(event.target.value)}
                        />
                        <input
                          type="date"
                          value={dateTo}
                          min={dateFrom}
                          onChange={(event) => setDateTo(event.target.value)}
                        />
                      </label>
                    </div>
                    <table className="owner-summary-table owner-financial-table">
                      <thead>
                        <tr>
                          <th>Net Bookings</th>
                          <th>Net Earnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((property) => (
                          <tr key={property._id}>
                            <td>
                              <strong>0</strong>
                            </td>
                            <td>
                              <strong>₹0</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="owner-empty">
                  <Building2 />
                  <h2>
                    {tab === "live"
                      ? "No active properties yet"
                      : "No properties in progress"}
                  </h2>
                  <p>
                    Start a complete listing and save it as a draft whenever you
                    need.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => router.push("/owner/properties/new")}
                  >
                    <Plus /> List New Property
                  </button>
                </div>
              )}
            </section>
          ) : (
            <section className="owner-progress-properties">
              <header className="owner-summary-head">
                <div>
                  <span className="owner-summary-kicker">
                    <Sparkles /> LISTING WORKSPACE
                  </span>
                  <h2>Properties in Progress</h2>
                  <p>
                    Complete your listings, respond to review requests and
                    prepare them to go live.
                  </p>
                </div>
              </header>
              <div className="owner-progress-toolbar">
                <div className="owner-search-modes">
                  <strong>Search by:</strong>
                  <button
                    className={searchBy === "property" ? "active" : ""}
                    onClick={() => setSearchBy("property")}
                  >
                    Property
                  </button>
                  <button
                    className={searchBy === "city" ? "active" : ""}
                    onClick={() => setSearchBy("city")}
                  >
                    City
                  </button>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search by ${searchBy}`}
                />
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="">All marketplaces</option>
                  {sites.map((site) => (
                    <option key={site._id} value={site._id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              {visible.length ? (
                <div className="owner-progress-list">
                  <div className="owner-progress-list-head">
                    <span>Property</span>
                    <span>Status</span>
                    <span>Completion</span>
                    <span>Action</span>
                  </div>
                  {visible.map((property) => {
                    const site =
                      typeof property.siteId === "string"
                        ? sites.find((item) => item._id === property.siteId)
                        : property.siteId;
                    const cover =
                      property.media?.find((media) => media.primary)?.url ||
                      property.media?.[0]?.url;
                    const score = property.completeness || 0;
                    const needsChanges =
                      property.status === "CHANGES_REQUIRED" ||
                      property.pendingUpdateStatus === "CHANGES_REQUIRED";
                    return (
                      <article
                        className="owner-progress-card"
                        key={property._id}
                      >
                        <div className="owner-progress-cover">
                          {cover ? (
                            <img src={cover} alt="" />
                          ) : (
                            <span>
                              <Building2 />
                            </span>
                          )}
                          <em className={needsChanges ? "attention" : ""}>
                            {needsChanges
                              ? "Action required"
                              : property.status.replaceAll("_", " ")}
                          </em>
                        </div>
                        <div className="owner-progress-card-body">
                          <small>
                            {property.propertyType} · {property.city}
                          </small>
                          <h3>
                            {property.displayName ||
                              property.name ||
                              "Unnamed property"}
                          </h3>
                          <p>{site?.name || currentSite.name}</p>
                          <div className="owner-progress-label">
                            <span>Listing completion</span>
                            <strong>{score}%</strong>
                          </div>
                          <div className="owner-progress-bar">
                            <i style={{ width: `${Math.min(100, score)}%` }} />
                          </div>
                          {property.reviewReason && (
                            <div className="owner-progress-alert">
                              <strong>Admin feedback</strong>
                              <span>{property.reviewReason}</span>
                            </div>
                          )}
                          <footer>
                            <span>
                              {needsChanges
                                ? "Update requested sections"
                                : "Continue where you left off"}
                            </span>
                            <button
                              onClick={() =>
                                router.push(`/owner/properties/${property._id}`)
                              }
                            >
                              {needsChanges
                                ? "Review & update"
                                : "Continue listing"}
                              <ChevronRight />
                            </button>
                          </footer>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="owner-empty">
                  <Building2 />
                  <h2>No properties in progress</h2>
                  <p>All your submitted properties are up to date.</p>
                  <button
                    className="btn-primary"
                    onClick={() => router.push("/owner/properties/new")}
                  >
                    <Plus /> List New Property
                  </button>
                </div>
              )}
            </section>
          )}
        </section>
      </div>
      {passwordOpen && (
        <div className="owner-modal-scrim" role="presentation">
          <section
            className="owner-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="owner-password-title"
          >
            <header>
              <div>
                <span>ACCOUNT SECURITY</span>
                <h2 id="owner-password-title">Change password</h2>
                <p>Use at least eight characters for your new password.</p>
              </div>
              <button
                aria-label="Close password form"
                onClick={() => setPasswordOpen(false)}
              >
                <X />
              </button>
            </header>
            {passwordNotice && (
              <p className="owner-password-success">
                <Check /> {passwordNotice}
              </p>
            )}
            {passwordError && (
              <p className="owner-password-error">{passwordError}</p>
            )}
            <form onSubmit={changePassword}>
              <label>
                Current password
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label>
                New password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <footer>
                <button type="button" onClick={() => setPasswordOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={savingPassword}>
                  {savingPassword ? (
                    <LoaderCircle className="owner-spin" />
                  ) : (
                    <KeyRound />
                  )}
                  {savingPassword ? "Updatingâ€¦" : "Update password"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
