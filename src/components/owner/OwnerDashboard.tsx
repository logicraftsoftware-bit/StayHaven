"use client";
/* Cloudinary URLs are already transformed/optimized by the media service. */
/* eslint-disable @next/next/no-img-element */
import { Building2, LogOut, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
export function OwnerDashboard() {
  const router = useRouter();
  const currentSite = useSite();
  const [sites, setSites] = useState<Site[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"live" | "progress">("live");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (token: string) => {
    const [s, p] = await Promise.all([
      apiRequest<Api<Site[]>>("/api/v1/owner/sites", token),
      apiRequest<Api<Property[]>>("/api/v1/owner/properties", token),
    ]);
    setSites(s.data);
    setProperties(p.data);
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
      if (!token) return router.replace("/list-your-property");
      load(token)
        .catch(() => router.replace("/list-your-property"))
        .finally(() => setLoading(false));
    });
  }, [load, router]);
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
    <main className="owner-workspace">
      <aside className="owner-sidebar">
        <b>StayHaven Partner</b>
        <button className="active">
          <Building2 /> My Properties
        </button>
        <button onClick={() => router.push("/owner/team")}>
          <Users /> My Team
        </button>
        <button
          onClick={() => {
            localStorage.removeItem(OWNER_TOKEN_KEY);
            router.replace("/list-your-property");
          }}
        >
          <LogOut /> Logout
        </button>
      </aside>
      <section className="owner-main">
        <header className="owner-page-head">
          <div>
            <span>OWNER DASHBOARD</span>
            <h1>My Properties</h1>
            <p>
              Manage stays across every StayHaven marketplace from one account.
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
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
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
                          : "Continue Editing"}
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
              Start a complete listing and save it as a draft whenever you need.
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
    </main>
  );
}
