"use client";

import { Building2, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/layout/Brand";
import { apiRequest } from "@/lib/api-client";
import { OWNER_ROLE_KEY, OWNER_TOKEN_KEY } from "./OwnerAuth";
import { PropertyManager } from "./PropertyManager";

type TeamProperty = {
  _id: string;
  slug?: string;
  name?: string;
  displayName?: string;
  propertyType?: string;
  city?: string;
  state?: string;
  status?: string;
  completeness?: number;
  price?: number;
  roomDetails?: Array<{
    id?: string;
    _id?: string;
    name?: string;
    baseRate?: number;
    totalRooms?: number;
    baseAdults?: number;
    additionalAdultPrice?: number;
    additionalChildPrice?: number;
  }>;
  media?: Array<{ url: string }>;
  siteId?: { name?: string; domain?: string };
};

const readClaims = (token: string) => {
  try {
    return JSON.parse(
      atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
    ) as {
      permissions?: string[];
    };
  } catch {
    return { permissions: [] };
  }
};

export function OwnerTeamDashboard() {
  const router = useRouter();
  const [properties, setProperties] = useState<TeamProperty[]>([]);
  const [selected, setSelected] = useState<TeamProperty | null>(null);
  const [permissions] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return (
      readClaims(localStorage.getItem(OWNER_TOKEN_KEY) || "").permissions || []
    );
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
    if (!token) return router.replace("/list-your-property");
    apiRequest<{ data: TeamProperty[] }>(
      "/api/v1/owner/team-member/properties",
      token,
    )
      .then((response) => setProperties(response.data))
      .catch((reason) => setError((reason as Error).message));
  }, [router]);

  const logout = () => {
    localStorage.removeItem(OWNER_TOKEN_KEY);
    localStorage.removeItem(OWNER_ROLE_KEY);
    router.replace("/list-your-property");
  };

  if (selected) {
    const token = localStorage.getItem(OWNER_TOKEN_KEY) || "";
    return (
      <PropertyManager
        property={{
          ...selected,
          name: selected.name || "Property",
          displayName: selected.displayName || selected.name || "Property",
          city: selected.city || "",
          state: selected.state || "",
          price: selected.price || 0,
          roomDetails: selected.roomDetails || [],
          media: selected.media || [],
        }}
        site={
          selected.siteId
            ? {
                name: selected.siteId.name || "Marketplace",
                domain: selected.siteId.domain || "guwahatihomestay.com",
              }
            : undefined
        }
        token={token}
        permissions={permissions.filter(
          (permission) => permission !== "EDIT_PROPERTIES",
        )}
        onBack={() => setSelected(null)}
        onEdit={() => router.push(`/owner/properties/${selected._id}`)}
      />
    );
  }

  return (
    <main className="owner-dashboard-shell team-member-dashboard">
      <header className="owner-dashboard-header">
        <Brand />
        <div className="team-member-session">
          <ShieldCheck />
          <span>
            <small>TEAM MEMBER</small>
            <strong>Restricted access</strong>
          </span>
          <button onClick={logout}>
            <LogOut /> Logout
          </button>
        </div>
      </header>
      <section className="owner-main">
        <header className="owner-page-head">
          <div>
            <span>PARTNER TEAM PORTAL</span>
            <h1>Assigned Properties</h1>
            <p>
              Only properties and tools granted by the hotel owner are shown
              here.
            </p>
          </div>
        </header>
        {error && <p className="owner-review-note">{error}</p>}
        <div className="team-assigned-properties">
          {properties.map((property) => (
            <article key={property._id}>
              <i>
                <Building2 />
              </i>
              <div>
                <small>ASSIGNED PROPERTY</small>
                <h2>{property.displayName || property.name || "Property"}</h2>
                <p>
                  {property.city || ""}
                  {property.state ? `, ${property.state}` : ""}
                </p>
              </div>
              <button onClick={() => setSelected(property)}>
                Open dashboard
              </button>
            </article>
          ))}
          {!properties.length && !error && (
            <div className="owner-empty">
              <Building2 />
              <h2>No assigned properties</h2>
              <p>
                Ask the hotel owner to assign a property and viewing permission.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
