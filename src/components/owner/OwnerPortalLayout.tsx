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

export function OwnerPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname === "/owner") return;
    const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
    if (!token) {
      router.replace("/list-your-property");
      return;
    }
    apiRequest<Api<Owner>>("/api/v1/owner/me", token)
      .then((response) => setOwner(response.data))
      .catch(() => {
        localStorage.removeItem(OWNER_TOKEN_KEY);
        router.replace("/list-your-property");
      });
  }, [pathname, router]);

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
