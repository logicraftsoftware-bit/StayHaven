"use client";

/* Cloudinary profile photos are rendered directly. */
/* eslint-disable @next/next/no-img-element */
import {
  Building2,
  Check,
  ChevronDown,
  KeyRound,
  LoaderCircle,
  LogOut,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Brand } from "@/components/layout/Brand";
import { apiRequest } from "@/lib/api-client";
import { OWNER_TOKEN_KEY } from "./OwnerAuth";

type Api<T> = { success: boolean; data: T };
type Owner = {
  name: string;
  email: string;
  businessName?: string;
  profileImage?: string;
};
type OwnerProperty = {
  _id: string;
  name: string;
  displayName?: string;
  propertyType?: string;
  city?: string;
  status?: string;
};

export function OwnerPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [properties, setProperties] = useState<OwnerProperty[]>([]);
  const [propertySwitchOpen, setPropertySwitchOpen] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const propertySwitchRef = useRef<HTMLDivElement>(null);
  const propertyId = pathname.match(/^\/owner\/properties\/([^/]+)$/)?.[1];
  const currentProperty = properties.find(
    (property) => property._id === propertyId,
  );
  const filteredProperties = properties.filter(
    (property) =>
      property.status === "APPROVED" &&
      `${property.displayName || property.name} ${property.city || ""}`
        .toLowerCase()
        .includes(propertySearch.trim().toLowerCase()),
  );

  useEffect(() => {
    if (pathname === "/owner") return;
    const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
    if (!token) {
      router.replace("/list-your-property");
      return;
    }
    Promise.all([
      apiRequest<Api<Owner>>("/api/v1/owner/me", token),
      propertyId
        ? apiRequest<Api<OwnerProperty[]>>("/api/v1/owner/properties", token)
        : Promise.resolve(null),
    ])
      .then(([response, propertyResponse]) => {
        setOwner(response.data);
        if (propertyResponse) setProperties(propertyResponse.data);
      })
      .catch(() => {
        localStorage.removeItem(OWNER_TOKEN_KEY);
        router.replace("/list-your-property");
      });
  }, [pathname, propertyId, router]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
      if (!propertySwitchRef.current?.contains(event.target as Node))
        setPropertySwitchOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setPropertySwitchOpen(false);
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

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      await apiRequest(
        "/api/v1/owner/me/password",
        localStorage.getItem(OWNER_TOKEN_KEY) || "",
        {
          method: "PATCH",
          body: JSON.stringify({ currentPassword, newPassword }),
        },
      );
      setCurrentPassword("");
      setNewPassword("");
      setNotice("Password changed successfully.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (pathname === "/owner") return children;

  return (
    <main className="owner-dashboard-shell">
      <header className="owner-dashboard-header">
        <div className="owner-header-property-area">
          <Brand />
          {propertyId && currentProperty && (
            <div className="owner-property-switcher" ref={propertySwitchRef}>
              <button
                className="owner-property-switch-trigger"
                onClick={() => setPropertySwitchOpen((open) => !open)}
                aria-expanded={propertySwitchOpen}
              >
                <Building2 />
                <span>
                  <strong>
                    {currentProperty.displayName || currentProperty.name}
                  </strong>
                  <small>
                    {currentProperty.propertyType || "Property"}
                    {currentProperty.city ? ` · ${currentProperty.city}` : ""}
                  </small>
                </span>
                <ChevronDown className={propertySwitchOpen ? "open" : ""} />
              </button>
              {propertySwitchOpen && (
                <div className="owner-property-switch-menu">
                  <div className="owner-property-switch-search">
                    <input
                      autoFocus
                      value={propertySearch}
                      onChange={(event) =>
                        setPropertySearch(event.target.value)
                      }
                      placeholder="Search by property name or city"
                    />
                  </div>
                  <div className="owner-property-switch-list">
                    {filteredProperties.map((property) => (
                      <button
                        key={property._id}
                        className={property._id === propertyId ? "active" : ""}
                        onClick={() => {
                          setPropertySwitchOpen(false);
                          setPropertySearch("");
                          router.push(`/owner/properties/${property._id}`);
                        }}
                      >
                        <Building2 />
                        <span>
                          <strong>
                            {property.displayName || property.name}
                          </strong>
                          <small>
                            {property.city ||
                              property.propertyType ||
                              "Property"}
                          </small>
                        </span>
                        {property._id === propertyId && <Check />}
                      </button>
                    ))}
                    {!filteredProperties.length && (
                      <p>No matching properties found.</p>
                    )}
                  </div>
                  <button
                    className="owner-property-switch-all"
                    onClick={() => router.push("/owner")}
                  >
                    View all properties
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
              <strong>{owner?.businessName || owner?.name || "Owner"}</strong>
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

      <div className="owner-workspace owner-nested-workspace">
        <aside className="owner-sidebar">
          <b>StayHaven Partner</b>
          <button
            className={pathname.includes("/properties") ? "active" : ""}
            onClick={() => router.push("/owner")}
          >
            <Building2 /> My Properties
          </button>
          <button
            className={pathname === "/owner/team" ? "active" : ""}
            onClick={() => router.push("/owner/team")}
          >
            <Users /> My Team
          </button>
        </aside>
        <div className="owner-portal-content">{children}</div>
      </div>

      {passwordOpen && (
        <div className="owner-modal-scrim">
          <section
            className="owner-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nested-owner-password-title"
          >
            <header>
              <div>
                <span>ACCOUNT SECURITY</span>
                <h2 id="nested-owner-password-title">Change password</h2>
                <p>Use at least eight characters for your new password.</p>
              </div>
              <button
                aria-label="Close password form"
                onClick={() => setPasswordOpen(false)}
              >
                <X />
              </button>
            </header>
            {notice && (
              <p className="owner-password-success">
                <Check /> {notice}
              </p>
            )}
            {error && <p className="owner-password-error">{error}</p>}
            <form onSubmit={changePassword}>
              <label>
                Current password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label>
                New password
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <footer>
                <button type="button" onClick={() => setPasswordOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" disabled={saving}>
                  {saving ? (
                    <LoaderCircle className="owner-spin" />
                  ) : (
                    <KeyRound />
                  )}
                  {saving ? "Updating..." : "Update password"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
