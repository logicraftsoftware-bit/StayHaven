"use client";
/* Cloudinary URLs are already transformed/optimized by the media service. */
/* eslint-disable @next/next/no-img-element */
import {
  Building2,
  Check,
  ChevronDown,
  KeyRound,
  LoaderCircle,
  LogOut,
  Plus,
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
  const [tab, setTab] = useState<"live" | "progress">("live");
  const [loading, setLoading] = useState(true);
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
          (tab === "live" ? p.status === "APPROVED" : p.status !== "APPROVED")
        );
      }),
    [filter, properties, tab],
  );
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
          <div className="owner-toolbar">
            <label>
              Marketplace
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">All sites</option>
                {sites.map((site) => (
                  <option key={site._id} value={site._id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <span>Current website: {currentSite.name}</span>
          </div>
          {visible.length ? (
            <div className="owner-property-grid">
              {visible.map((property) => {
                const site =
                  typeof property.siteId === "string"
                    ? sites.find((s) => s._id === property.siteId)
                    : property.siteId;
                const cover =
                  property.media?.find((m) => m.primary)?.url ||
                  property.media?.[0]?.url;
                return (
                  <article className="owner-property-card" key={property._id}>
                    {cover ? (
                      <img src={cover} alt="" />
                    ) : (
                      <div className="owner-property-placeholder">
                        <Building2 />
                      </div>
                    )}
                    <div>
                      <span
                        className={`owner-status ${property.status.toLowerCase()}`}
                      >
                        {property.status.replaceAll("_", " ")}
                      </span>
                      <h2>{property.displayName || property.name}</h2>
                      <p>
                        {property.propertyType} · {property.city},{" "}
                        {property.state}
                      </p>
                      <small>{site?.name}</small>
                      {property.reviewReason && (
                        <div className="owner-review-note">
                          <b>Admin note</b>
                          {property.reviewReason}
                        </div>
                      )}
                      <div className="owner-completion">
                        <span
                          style={{ width: `${property.completeness || 0}%` }}
                        />
                      </div>
                      <footer>
                        <small>{property.completeness || 0}% complete</small>
                        <button
                          onClick={() =>
                            router.push(`/owner/properties/${property._id}`)
                          }
                        >
                          {property.status === "APPROVED"
                            ? "Manage Property"
                            : property.status === "DRAFT" ||
                                property.status === "CHANGES_REQUIRED"
                              ? "Continue Editing"
                              : "View Review Status"}
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
