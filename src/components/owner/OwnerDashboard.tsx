"use client";

import {
  Building2,
  ChevronLeft,
  FileText,
  LogOut,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
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
  _id?: string;
  siteId: Site | string;
  name: string;
  propertyType: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  price?: number;
  taxes?: number;
  rooms?: number;
  maxGuests?: number;
  amenities?: string[];
  status:
    | "DRAFT"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CHANGES_REQUIRED"
    | "SUSPENDED";
  createdAt?: string;
};
type Api<T> = { success: boolean; message?: string; data: T };
type OwnerProfile = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  status: string;
};
const empty = (site: {
  id?: string;
  _id?: string;
  name: string;
  city: string;
  state: string;
}): Property => ({
  siteId: site.id || site._id || "",
  name: "",
  propertyType: "Homestay",
  address: "",
  city: site.city,
  state: site.state,
  country: "India",
  price: 0,
  taxes: 0,
  rooms: 1,
  maxGuests: 2,
  amenities: [],
  status: "DRAFT",
});

export function OwnerDashboard() {
  const router = useRouter();
  const currentSite = useSite();
  const [token, setToken] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [editing, setEditing] = useState<Property | null>(null);
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (accessToken: string) => {
    const [ownerResponse, siteResponse, propertyResponse] = await Promise.all([
      apiRequest<Api<OwnerProfile>>("/api/v1/owner/me", accessToken),
      apiRequest<Api<Site[]>>("/api/v1/owner/sites", accessToken),
      apiRequest<Api<Property[]>>("/api/v1/owner/properties", accessToken),
    ]);
    setOwner(ownerResponse.data);
    setSites(siteResponse.data);
    setProperties(propertyResponse.data);
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      const accessToken = localStorage.getItem(OWNER_TOKEN_KEY) || "";
      if (!accessToken) {
        router.replace("/list-your-property");
        return;
      }
      setToken(accessToken);
      load(accessToken)
        .catch(() => {
          localStorage.removeItem(OWNER_TOKEN_KEY);
          router.replace("/list-your-property");
        })
        .finally(() => setLoading(false));
    });
  }, [load, router]);
  const counts = useMemo(
    () => ({
      total: properties.length,
      approved: properties.filter((p) => p.status === "APPROVED").length,
      pending: properties.filter((p) => p.status === "PENDING").length,
      draft: properties.filter((p) => p.status === "DRAFT").length,
      rejected: properties.filter((p) =>
        ["REJECTED", "CHANGES_REQUIRED"].includes(p.status),
      ).length,
      suspended: properties.filter((p) => p.status === "SUSPENDED").length,
    }),
    [properties],
  );
  const visibleProperties = useMemo(
    () =>
      filter
        ? properties.filter((property) => {
            const siteId =
              typeof property.siteId === "string"
                ? property.siteId
                : property.siteId._id;
            return siteId === filter;
          })
        : properties,
    [filter, properties],
  );
  const save = async (submit: boolean) => {
    if (!editing) return;
    setNotice("");
    try {
      const siteId =
        typeof editing.siteId === "string"
          ? editing.siteId
          : editing.siteId._id;
      const payload = { ...editing, _id: undefined, siteId, submit };
      const response = await apiRequest<Api<Property>>(
        `/api/v1/owner/properties${editing._id ? `/${editing._id}` : ""}`,
        token,
        {
          method: editing._id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setNotice(
        response.message ||
          (submit ? "Property submitted for review." : "Draft saved."),
      );
      setEditing(null);
      await load(token);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  const remove = async (property: Property) => {
    if (!property._id || !confirm(`Delete ${property.name}?`)) return;
    try {
      await apiRequest(`/api/v1/owner/properties/${property._id}`, token, {
        method: "DELETE",
      });
      await load(token);
    } catch (error) {
      setNotice((error as Error).message);
    }
  };
  const logout = () => {
    localStorage.removeItem(OWNER_TOKEN_KEY);
    router.replace("/list-your-property");
  };
  if (loading)
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">
        Opening owner dashboard…
      </div>
    );
  return (
    <div className="container py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">GLOBAL HOTEL OWNER DASHBOARD</p>
          <h1 className="font-display text-3xl font-bold">
            {owner ? `${owner.name}'s properties` : "My properties"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Current marketplace: {currentSite.name}. Your account and property
            list remain global.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(empty(currentSite))}
            className="btn-primary"
          >
            <Plus className="size-4" />
            Add Property
          </button>
          <button onClick={logout} className="owner-btn">
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Object.entries(counts).map(([label, value]) => (
          <div className="rounded-2xl border bg-white p-4" key={label}>
            <span className="text-xs uppercase text-slate-500">{label}</span>
            <strong className="mt-1 block text-2xl">{value}</strong>
          </div>
        ))}
      </div>
      {notice && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-red-50 p-3 text-sm font-semibold text-maroon"
        >
          {notice}
        </p>
      )}
      {editing ? (
        <PropertyForm
          property={editing}
          sites={sites}
          setProperty={setEditing}
          onSave={() => save(false)}
          onSubmit={() => save(true)}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <label className="owner-label mt-7 max-w-xs">
            Marketplace filter
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
              }}
            >
              <option value="">All sites</option>
              {sites.map((site) => (
                <option value={site._id} key={site._id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
          {visibleProperties.length ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleProperties.map((property) => {
                const site =
                  typeof property.siteId === "string"
                    ? sites.find((item) => item._id === property.siteId)
                    : property.siteId;
                const editable = [
                  "DRAFT",
                  "REJECTED",
                  "CHANGES_REQUIRED",
                ].includes(property.status);
                return (
                  <article
                    className="rounded-2xl border bg-white p-5 shadow-sm"
                    key={property._id}
                  >
                    <div className="flex justify-between">
                      <Building2 className="text-maroon" />
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                        {property.status}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-bold">{property.name}</h2>
                    <p className="text-sm text-slate-500">
                      {property.propertyType} · {property.city},{" "}
                      {property.state}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase text-maroon">
                      {site?.name || "Marketplace"}
                    </p>
                    <p className="mt-3 font-black">
                      ₹{Number(property.price || 0).toLocaleString("en-IN")} /
                      night
                    </p>
                    <div className="mt-5 flex gap-2">
                      {editable && (
                        <button
                          onClick={() => setEditing(property)}
                          className="owner-btn flex-1 justify-center"
                        >
                          Edit
                        </button>
                      )}
                      {["DRAFT", "REJECTED"].includes(property.status) && (
                        <button
                          onClick={() => void remove(property)}
                          className="icon-btn text-red-700"
                        >
                          <Trash2 />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-7 rounded-3xl border border-dashed bg-white p-14 text-center">
              <Building2 className="mx-auto size-10 text-maroon" />
              <h2 className="mt-4 text-xl font-bold">No properties found</h2>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PropertyForm({
  property,
  sites,
  setProperty,
  onSave,
  onSubmit,
  onCancel,
}: {
  property: Property;
  sites: Site[];
  setProperty: (p: Property) => void;
  onSave: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const field = (key: keyof Property, value: string | number | string[]) =>
    setProperty({ ...property, [key]: value });
  const selectedSiteId =
    typeof property.siteId === "string" ? property.siteId : property.siteId._id;
  const selectSite = (siteId: string) => {
    const site = sites.find((item) => item._id === siteId);
    if (site)
      setProperty({ ...property, siteId, city: site.city, state: site.state });
  };
  return (
    <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <button
        onClick={onCancel}
        className="mb-5 flex items-center gap-1 text-sm font-bold text-maroon"
      >
        <ChevronLeft />
        Back
      </button>
      <h2 className="font-display text-2xl font-bold">
        {property.name || "New property"}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        The current site is the default. You may select any active marketplace.
      </p>
      <div className="owner-form-grid mt-7">
        <label className="wide">
          Marketplace
          <select
            required
            value={selectedSiteId}
            onChange={(e) => selectSite(e.target.value)}
          >
            {sites.map((site) => (
              <option value={site._id} key={site._id}>
                {site.name} — {site.city}
              </option>
            ))}
          </select>
        </label>
        <label>
          Property name
          <input
            required
            value={property.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          Property type
          <select
            value={property.propertyType}
            onChange={(e) => field("propertyType", e.target.value)}
          >
            {[
              "Hotel",
              "Homestay",
              "Resort",
              "Villa",
              "Apartment",
              "Guest House",
              "Cottage",
            ].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="wide">
          Full address
          <input
            required
            value={property.address}
            onChange={(e) => field("address", e.target.value)}
          />
        </label>
        <label>
          City
          <input
            required
            value={property.city}
            onChange={(e) => field("city", e.target.value)}
          />
        </label>
        <label>
          State
          <input
            required
            value={property.state}
            onChange={(e) => field("state", e.target.value)}
          />
        </label>
        <label>
          Rooms
          <input
            type="number"
            min="1"
            value={property.rooms || 1}
            onChange={(e) => field("rooms", Number(e.target.value))}
          />
        </label>
        <label>
          Maximum guests
          <input
            type="number"
            min="1"
            value={property.maxGuests || 2}
            onChange={(e) => field("maxGuests", Number(e.target.value))}
          />
        </label>
        <label>
          Price per night (₹)
          <input
            type="number"
            min="0"
            value={property.price || 0}
            onChange={(e) => field("price", Number(e.target.value))}
          />
        </label>
        <label>
          Taxes (₹)
          <input
            type="number"
            min="0"
            value={property.taxes || 0}
            onChange={(e) => field("taxes", Number(e.target.value))}
          />
        </label>
        <label className="wide">
          Description
          <textarea
            value={property.description || ""}
            onChange={(e) => field("description", e.target.value)}
          />
        </label>
        <label className="wide">
          Amenities
          <input
            value={(property.amenities || []).join(", ")}
            onChange={(e) =>
              field(
                "amenities",
                e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <button onClick={onSave} className="owner-btn">
          <Save className="size-4" />
          Save Draft
        </button>
        <button onClick={onSubmit} className="btn-primary">
          <FileText className="size-4" />
          Submit for Approval
        </button>
      </div>
    </section>
  );
}
