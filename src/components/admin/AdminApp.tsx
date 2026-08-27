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
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";

const API_URL = (process.env.NEXT_PUBLIC_ADMIN_API_URL || "https://backend-tawny-psi-14.vercel.app").replace(/\/$/, "");
const TOKEN_KEY = "gh_super_admin_token";

type View = "dashboard" | "sites" | "owners" | "properties" | "profile";
type Status = "ACTIVE" | "SUSPENDED" | "PENDING" | "REJECTED" | "APPROVED" | "CHANGES_REQUIRED" | "DRAFT" | "active" | "inactive";
type ApiResponse<T> = { success: boolean; message?: string; data: T; pagination?: { page: number; total: number; totalPages: number } };
type Admin = { _id?: string; id?: string; name: string; email: string; role: string; lastLoginAt?: string };
type Dashboard = { totalProperties: number; pendingProperties: number; approvedProperties: number; rejectedProperties: number; totalOwners: number; activeOwners: number; suspendedOwners: number; totalCustomers: number; totalSites: number };
type Site = { _id: string; name: string; slug: string; domain: string; city: string; state: string; country: string; logo?: string; favicon?: string; status: "active" | "inactive"; createdAt: string };
type Owner = { _id: string; name: string; email: string; phone: string; status: Status; siteIds: string[]; createdAt: string };
type Property = { _id: string; name: string; slug: string; propertyType: string; city: string; state: string; address: string; status: Status; reviewReason?: string; createdAt: string };

async function api<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    throw new Error(message || `Request failed (${response.status})`);
  }
  return body;
}

function Brand() {
  return <div className="admin-brand"><Image src="/brand/guwahati-homestay-logo.jpeg" alt="Guwahati Homestay" width={500} height={167} priority /><span>Super Admin</span></div>;
}

function Login({ onLogin }: { onLogin: (token: string, admin: Admin) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const result = await api<ApiResponse<{ accessToken: string; admin: Admin }>>("/api/v1/admin/auth/login", "", { method: "POST", headers: { Authorization: "" }, body: JSON.stringify({ email, password }) });
      sessionStorage.setItem(TOKEN_KEY, result.data.accessToken);
      onLogin(result.data.accessToken, result.data.admin);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in"); }
    finally { setLoading(false); }
  }
  return <main className="admin-login">
    <section className="login-story"><a href="/" className="back-link"><ChevronRight /> Back to website</a><Brand /><div className="story-copy"><span className="admin-kicker">GUWAHATI HOMESTAY CONTROL CENTRE</span><h1>One dashboard.<br />Every stay under control.</h1><p>Review properties, manage partners and operate every location-specific marketplace from one secure workspace.</p><div className="trust-row"><ShieldCheck /><div><strong>Super Admin access</strong><span>Protected management portal</span></div></div></div></section>
    <section className="login-panel"><form onSubmit={submit} className="login-card"><div className="login-icon"><KeyRound /></div><span className="admin-kicker">WELCOME BACK</span><h2>Sign in to admin</h2><p>Use your Super Admin credentials to continue.</p>{error && <div className="admin-alert error"><CircleAlert />{error}</div>}<label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="email" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" minLength={8} required /></label><button className="admin-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <ShieldCheck />}{loading ? "Signing in…" : "Secure sign in"}</button><small>Authorized personnel only. All administrative actions are recorded.</small></form></section>
  </main>;
}

const nav: { id: View; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard }, { id: "sites", label: "Sites", icon: Globe2 }, { id: "properties", label: "Properties", icon: Building2 }, { id: "owners", label: "Property owners", icon: Users }, { id: "profile", label: "Account", icon: Settings },
];

function StatusBadge({ value }: { value: Status }) { return <span className={`status status-${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>; }
function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="admin-empty">{icon}<h3>{title}</h3><p>{text}</p></div>; }
function PageHeader({ eyebrow, title, text, action }: { eyebrow: string; title: string; text: string; action?: ReactNode }) { return <header className="admin-page-header"><div><span className="admin-kicker">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</header>; }

function DashboardView({ token, go }: { token: string; go: (view: View) => void }) {
  const [data, setData] = useState<Dashboard | null>(null); const [error, setError] = useState("");
  const load = useCallback(() => { setError(""); api<ApiResponse<Dashboard>>("/api/v1/admin/dashboard", token).then((r) => setData(r.data)).catch((e) => setError(e.message)); }, [token]);
  useEffect(load, [load]);
  const cards = data ? [{ label: "Total properties", value: data.totalProperties, icon: Building2 }, { label: "Pending review", value: data.pendingProperties, icon: CircleAlert }, { label: "Active owners", value: data.activeOwners, icon: Users }, { label: "Managed sites", value: data.totalSites, icon: Globe2 }] : [];
  return <><PageHeader eyebrow="CONTROL CENTRE" title="Dashboard overview" text="A clear view of marketplace activity and items needing attention." action={<button className="admin-secondary" onClick={load}><RefreshCw /> Refresh</button>} />{error && <div className="admin-alert error"><CircleAlert />{error}</div>}{!data ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading dashboard…</div> : <><div className="metric-grid">{cards.map(({ label, value, icon: Icon }) => <article className="metric-card" key={label}><div><span>{label}</span><strong>{value}</strong></div><i><Icon /></i></article>)}</div><div className="admin-grid-two"><section className="admin-card"><div className="card-heading"><div><span className="admin-kicker">PROPERTY PIPELINE</span><h2>Review activity</h2></div><button onClick={() => go("properties")}>View all <ChevronRight /></button></div><div className="pipeline"><div><span>Approved</span><strong>{data.approvedProperties}</strong></div><div><span>Pending</span><strong>{data.pendingProperties}</strong></div><div><span>Rejected</span><strong>{data.rejectedProperties}</strong></div></div></section><section className="admin-card quick-card"><span className="admin-kicker">QUICK ACTIONS</span><h2>Keep operations moving</h2><button onClick={() => go("sites")}><Globe2 /><span><strong>Add or manage a site</strong><small>Configure marketplace locations</small></span><ChevronRight /></button><button onClick={() => go("owners")}><Users /><span><strong>Review property owners</strong><small>Activate or suspend accounts</small></span><ChevronRight /></button></section></div></>}</>;
}

const blankSite = { name: "", slug: "", domain: "", city: "Guwahati", state: "Assam", country: "India", logo: "/logo.png", favicon: "/favicon.ico" };
function SitesView({ token }: { token: string }) {
  const [sites, setSites] = useState<Site[]>([]); const [show, setShow] = useState(false); const [form, setForm] = useState(blankSite); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(""); try { const r = await api<ApiResponse<Site[]>>("/api/v1/admin/sites", token); setSites(r.data); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function create(event: FormEvent) { event.preventDefault(); setError(""); try { await api("/api/v1/admin/sites", token, { method: "POST", body: JSON.stringify({ ...form, theme: { primaryColor: "#8b0d18", secondaryColor: "#111315" } }) }); setForm(blankSite); setShow(false); setMessage("Site created successfully."); await load(); } catch (e) { setError((e as Error).message); } }
  async function toggle(site: Site) { setError(""); try { await api(`/api/v1/admin/sites/${site._id}/status`, token, { method: "PATCH", body: JSON.stringify({ status: site.status === "active" ? "inactive" : "active" }) }); await load(); } catch (e) { setError((e as Error).message); } }
  return <><PageHeader eyebrow="MARKETPLACE NETWORK" title="Sites" text="Create and control each location-specific Guwahati Homestay marketplace." action={<button className="admin-primary compact" onClick={() => setShow(true)}><Plus /> Add site</button>} />{message && <div className="admin-alert success"><Check />{message}</div>}{error && <div className="admin-alert error"><CircleAlert />{error}</div>}{loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading sites…</div> : sites.length === 0 ? <Empty icon={<Globe2 />} title="No sites yet" text="Create your first marketplace site to get started." /> : <div className="site-grid">{sites.map((site) => <article className="site-card" key={site._id}><div className="site-card-top"><i><Globe2 /></i><StatusBadge value={site.status} /></div><h2>{site.name}</h2><p>{site.city}, {site.state}, {site.country}</p><a href={`https://${site.domain}`} target="_blank" rel="noreferrer">{site.domain}<ExternalLink /></a><div className="site-meta"><span>/{site.slug}</span><span>Created {new Date(site.createdAt).toLocaleDateString()}</span></div><button className="admin-secondary full" onClick={() => toggle(site)}>{site.status === "active" ? "Set inactive" : "Activate site"}</button></article>)}</div>}{show && <div className="admin-modal-backdrop" onMouseDown={() => setShow(false)}><div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setShow(false)}><X /></button><span className="admin-kicker">NEW MARKETPLACE</span><h2>Add a site</h2><p>Enter the location and domain for this marketplace.</p><form className="admin-form-grid" onSubmit={create}>{Object.entries(form).map(([key, value]) => <label key={key}>{key === "slug" ? "URL slug" : key[0].toUpperCase() + key.slice(1)}<input value={value} onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))} required={!['logo','favicon'].includes(key)} placeholder={key === "domain" ? "example.com" : undefined} /></label>)}<div className="modal-actions"><button type="button" className="admin-secondary" onClick={() => setShow(false)}>Cancel</button><button className="admin-primary compact"><Plus /> Create site</button></div></form></div></div>}</>;
}

function OwnersView({ token }: { token: string }) {
  const [owners, setOwners] = useState<Owner[]>([]); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const q = new URLSearchParams(); if (search) q.set("search", search); if (status) q.set("status", status); const r = await api<ApiResponse<Owner[]>>(`/api/v1/admin/owners?${q}`, token); setOwners(r.data); setError(""); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }, [search, status, token]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  async function change(owner: Owner, next: Status) { try { await api(`/api/v1/admin/owners/${owner._id}/status`, token, { method: "PATCH", body: JSON.stringify({ status: next }) }); await load(); } catch (e) { setError((e as Error).message); } }
  return <><PageHeader eyebrow="PARTNER MANAGEMENT" title="Property owners" text="Review and manage every accommodation partner account." /><Filters search={search} setSearch={setSearch} status={status} setStatus={setStatus} options={["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]} />{error && <div className="admin-alert error"><CircleAlert />{error}</div>}{loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading owners…</div> : owners.length === 0 ? <Empty icon={<Users />} title="No owners found" text="Owner accounts will appear here when they register." /> : <div className="admin-table-wrap"><table><thead><tr><th>Owner</th><th>Phone</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>{owners.map((owner) => <tr key={owner._id}><td><strong>{owner.name}</strong><span>{owner.email}</span></td><td>{owner.phone}</td><td><StatusBadge value={owner.status} /></td><td>{new Date(owner.createdAt).toLocaleDateString()}</td><td><select value={owner.status} onChange={(e) => change(owner, e.target.value as Status)}>{["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"].map((s) => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>}</>;
}

function Filters({ search, setSearch, status, setStatus, options }: { search: string; setSearch: (v: string) => void; status: string; setStatus: (v: string) => void; options: string[] }) { return <div className="admin-filters"><label><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or location" /></label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{options.map((o) => <option key={o}>{o}</option>)}</select></div>; }

function PropertiesView({ token }: { token: string }) {
  const [properties, setProperties] = useState<Property[]>([]); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const q = new URLSearchParams({ page: "1", limit: "100" }); if (search) q.set("search", search); if (status) q.set("status", status); const r = await api<ApiResponse<Property[]>>(`/api/v1/admin/properties?${q}`, token); setProperties(r.data); setError(""); } catch (e) { setError((e as Error).message); } finally { setLoading(false); } }, [search, status, token]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  async function review(property: Property, action: "approve" | "reject" | "request-changes" | "suspend") { const needsReason = action !== "approve"; const reason = needsReason ? window.prompt("Add a reason for this decision:") : ""; if (needsReason && !reason) return; try { await api(`/api/v1/admin/properties/${property._id}/${action}`, token, { method: "PATCH", body: JSON.stringify(needsReason ? { reason } : {}) }); await load(); } catch (e) { setError((e as Error).message); } }
  return <><PageHeader eyebrow="QUALITY CONTROL" title="Properties" text="Review submissions and keep every published stay up to standard." /><Filters search={search} setSearch={setSearch} status={status} setStatus={setStatus} options={["DRAFT", "PENDING", "APPROVED", "REJECTED", "CHANGES_REQUIRED", "SUSPENDED"]} />{error && <div className="admin-alert error"><CircleAlert />{error}</div>}{loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading properties…</div> : properties.length === 0 ? <Empty icon={<Building2 />} title="No properties found" text="Submitted properties will appear here for review." /> : <div className="property-list">{properties.map((property) => <article className="property-row" key={property._id}><div className="property-symbol"><Building2 /></div><div className="property-main"><div><StatusBadge value={property.status} /><span>{property.propertyType}</span></div><h2>{property.name}</h2><p>{property.address}, {property.city}, {property.state}</p>{property.reviewReason && <small>Last note: {property.reviewReason}</small>}</div><div className="property-actions">{property.status === "PENDING" && <><button className="approve" onClick={() => review(property, "approve")}><Check /> Approve</button><button onClick={() => review(property, "request-changes")}>Request changes</button><button className="danger" onClick={() => review(property, "reject")}>Reject</button></>}{property.status === "APPROVED" && <button className="danger" onClick={() => review(property, "suspend")}>Suspend</button>}</div></article>)}</div>}</>;
}

function ProfileView({ token, admin, setAdmin }: { token: string; admin: Admin; setAdmin: (a: Admin) => void }) {
  const [name, setName] = useState(admin.name); const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function updateProfile(e: FormEvent) { e.preventDefault(); try { const r = await api<ApiResponse<Admin>>("/api/v1/admin/me", token, { method: "PATCH", body: JSON.stringify({ name }) }); setAdmin(r.data); setMessage("Profile updated."); setError(""); } catch (reason) { setError((reason as Error).message); } }
  async function updatePassword(e: FormEvent) { e.preventDefault(); try { await api("/api/v1/admin/me/password", token, { method: "PATCH", body: JSON.stringify({ currentPassword, newPassword }) }); setCurrentPassword(""); setNewPassword(""); setMessage("Password changed successfully."); setError(""); } catch (reason) { setError((reason as Error).message); } }
  return <><PageHeader eyebrow="ADMINISTRATOR" title="Account settings" text="Manage your profile and secure your Super Admin account." />{message && <div className="admin-alert success"><Check />{message}</div>}{error && <div className="admin-alert error"><CircleAlert />{error}</div>}<div className="admin-grid-two"><form className="admin-card account-form" onSubmit={updateProfile}><h2>Profile details</h2><label>Name<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></label><label>Email<input value={admin.email} disabled /></label><button className="admin-primary compact">Save profile</button></form><form className="admin-card account-form" onSubmit={updatePassword}><h2>Change password</h2><label>Current password<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} minLength={8} required /></label><label>New password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required /></label><button className="admin-primary compact"><KeyRound /> Update password</button></form></div></>;
}

export function AdminApp() {
  const [token, setToken] = useState(""); const [admin, setAdmin] = useState<Admin | null>(null); const [view, setView] = useState<View>("dashboard"); const [checking, setChecking] = useState(true); const [menu, setMenu] = useState(false);
  useEffect(() => { const saved = sessionStorage.getItem(TOKEN_KEY); if (!saved) { setChecking(false); return; } api<ApiResponse<Admin>>("/api/v1/admin/me", saved).then((r) => { setToken(saved); setAdmin(r.data); }).catch(() => sessionStorage.removeItem(TOKEN_KEY)).finally(() => setChecking(false)); }, []);
  function login(nextToken: string, nextAdmin: Admin) { setToken(nextToken); setAdmin(nextAdmin); }
  function logout() { sessionStorage.removeItem(TOKEN_KEY); setToken(""); setAdmin(null); }
  if (checking) return <div className="admin-splash"><Brand /><LoaderCircle className="spin" /></div>;
  if (!token || !admin) return <Login onLogin={login} />;
  const content = view === "dashboard" ? <DashboardView token={token} go={setView} /> : view === "sites" ? <SitesView token={token} /> : view === "owners" ? <OwnersView token={token} /> : view === "properties" ? <PropertiesView token={token} /> : <ProfileView token={token} admin={admin} setAdmin={setAdmin} />;
  return <div className="admin-shell"><aside className={menu ? "open" : ""}><div className="sidebar-head"><Brand /><button onClick={() => setMenu(false)}><X /></button></div><nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMenu(false); }}><Icon />{label}</button>)}</nav><div className="sidebar-foot"><div className="admin-avatar">{admin.name.slice(0, 1).toUpperCase()}</div><div><strong>{admin.name}</strong><span>{admin.email}</span></div><button title="Sign out" onClick={logout}><LogOut /></button></div></aside>{menu && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMenu(false)} />}<div className="admin-workspace"><header className="admin-topbar"><button className="menu-trigger" onClick={() => setMenu(true)}><Menu /></button><div><span>Guwahati Homestay</span><strong>{nav.find((item) => item.id === view)?.label}</strong></div><a href="/" target="_blank">View website <ExternalLink /></a></header><main className="admin-content">{content}</main></div></div>;
}
