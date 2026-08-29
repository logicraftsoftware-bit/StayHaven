"use client";

import { Building2, ChevronLeft, FileText, LogOut, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSite } from "@/components/site/SiteProvider";
import { apiRequest } from "@/lib/api-client";
import type { SiteConfig } from "@/types/site";

type PropertyDraft = {
  id: string;
  ownerId?: string;
  siteId: string;
  siteName: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  rooms: string;
  maxGuests: string;
  amenities: string;
  price: string;
  taxes: string;
  photos: string;
  documents: string;
  status: "draft" | "pending";
};

const SESSION_KEY = "stayhaven-owner-session";
const PROPERTIES_KEY = "stayhaven-owner-properties";
const LEGACY_SESSION_KEY = "guwahati-homestay-owner-session";
const LEGACY_PROPERTIES_KEY = "guwahati-homestay-owner-properties";

function emptyProperty(site: SiteConfig): PropertyDraft {
  const siteId = site.id || site._id || site.slug;
  return {
    id: crypto.randomUUID(),
    siteId,
    siteName: site.name,
    name: "",
    type: "Homestay",
    address: "",
    city: site.location?.city || site.city,
    state: site.location?.state || site.state,
    pincode: "",
    description: "",
    rooms: "1",
    maxGuests: "2",
    amenities: "Wi-Fi, Parking, Breakfast",
    price: "",
    taxes: "",
    photos: "",
    documents: "",
    status: "draft",
  };
}

export function OwnerDashboard() {
  const router = useRouter();
  const currentSite = useSite();
  const [ready, setReady] = useState(false);
  const [sites, setSites] = useState<SiteConfig[]>([currentSite]);
  const [properties, setProperties] = useState<PropertyDraft[]>([]);
  const [editing, setEditing] = useState<PropertyDraft | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const storedSession = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
      const session = JSON.parse(storedSession || "null") as { accountType?: string } | null;
      if (session?.accountType !== "hotel_owner") {
        router.replace("/list-your-property");
        return;
      }
      if (!localStorage.getItem(SESSION_KEY) && storedSession) localStorage.setItem(SESSION_KEY, storedSession);

      const storedProperties = localStorage.getItem(PROPERTIES_KEY) || localStorage.getItem(LEGACY_PROPERTIES_KEY);
      const saved = JSON.parse(storedProperties || "[]") as Partial<PropertyDraft>[];
      const migrated = saved.map((property) => ({
        ...emptyProperty(currentSite),
        ...property,
        siteId: property.siteId || currentSite.id || currentSite._id || currentSite.slug,
        siteName: property.siteName || currentSite.name,
      }));
      setProperties(migrated);
      if (!localStorage.getItem(PROPERTIES_KEY) && migrated.length) {
        localStorage.setItem(PROPERTIES_KEY, JSON.stringify(migrated));
      }
      setReady(true);
    });
  }, [currentSite, router]);

  useEffect(() => {
    apiRequest<SiteConfig[]>("/api/v1/sites")
      .then((availableSites) => setSites(availableSites.length ? availableSites : [currentSite]))
      .catch(() => setSites([currentSite]));
  }, [currentSite]);

  const persist = (next: PropertyDraft[]) => {
    setProperties(next);
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(next));
  };

  const save = (submit = false) => {
    if (!editing) return;
    if (!editing.siteId || !editing.name || !editing.address || !editing.price) {
      setNotice("Marketplace, property name, address and price are required.");
      return;
    }
    const item = { ...editing, status: submit ? ("pending" as const) : editing.status };
    const next = properties.some((property) => property.id === item.id)
      ? properties.map((property) => (property.id === item.id ? item : property))
      : [...properties, item];
    persist(next);
    setEditing(null);
    setNotice(submit ? "Property submitted with pending status." : "Property draft saved.");
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    router.replace("/list-your-property");
  };

  if (!ready) return <div className="grid min-h-[60vh] place-items-center text-sm text-slate-500">Opening owner dashboard…</div>;

  return (
    <div className="container py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">GLOBAL HOTEL OWNER DASHBOARD</p>
          <h1 className="font-display text-3xl font-bold">My properties</h1>
          <p className="mt-1 text-sm text-slate-500">One owner account can manage properties across every StayHaven marketplace.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(emptyProperty(currentSite))} className="btn-primary"><Plus className="size-4" />Add Property</button>
          <button onClick={logout} className="owner-btn"><LogOut className="size-4" />Logout</button>
        </div>
      </div>

      {notice && <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm font-semibold text-maroon">{notice}</p>}

      {editing ? (
        <PropertyForm
          property={editing}
          sites={sites}
          setProperty={setEditing}
          onSave={() => save(false)}
          onSubmit={() => save(true)}
          onCancel={() => setEditing(null)}
        />
      ) : properties.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <article className="rounded-2xl border bg-white p-5 shadow-sm" key={property.id}>
              <div className="flex justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-red-50 text-maroon"><Building2 /></span>
                <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${property.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{property.status}</span>
              </div>
              <h2 className="mt-4 text-lg font-bold">{property.name}</h2>
              <p className="text-sm text-slate-500">{property.type} · {property.city}, {property.state}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-maroon">{property.siteName}</p>
              <p className="mt-3 font-black text-charcoal">₹{Number(property.price).toLocaleString("en-IN")} / night</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setEditing(property)} className="owner-btn flex-1 justify-center">Edit</button>
                <button onClick={() => persist(properties.filter((item) => item.id !== property.id))} className="icon-btn text-red-700" aria-label={`Delete ${property.name}`}><Trash2 /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed bg-white p-16 text-center">
          <Building2 className="mx-auto size-10 text-maroon" />
          <h2 className="mt-4 text-xl font-bold">No properties added yet</h2>
          <p className="mt-2 text-slate-500">Add your first property, save a draft, or submit it for review.</p>
          <button onClick={() => setEditing(emptyProperty(currentSite))} className="btn-primary mt-6"><Plus className="size-4" />Add your first property</button>
        </div>
      )}
    </div>
  );
}

function PropertyForm({ property, sites, setProperty, onSave, onSubmit, onCancel }: {
  property: PropertyDraft;
  sites: SiteConfig[];
  setProperty: (property: PropertyDraft) => void;
  onSave: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const field = (key: keyof PropertyDraft, value: string) => setProperty({ ...property, [key]: value });
  const selectSite = (siteId: string) => {
    const site = sites.find((item) => (item.id || item._id || item.slug) === siteId);
    if (!site) return;
    setProperty({
      ...property,
      siteId: site.id || site._id || site.slug,
      siteName: site.name,
      city: site.location?.city || site.city,
      state: site.location?.state || site.state,
    });
  };

  return (
    <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <button onClick={onCancel} className="mb-5 flex items-center gap-1 text-sm font-bold text-maroon"><ChevronLeft />Back to properties</button>
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">PROPERTY INFORMATION</p><h2 className="font-display text-2xl font-bold">{property.name || "New property"}</h2></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{property.status}</span>
      </div>
      <p className="mt-3 max-w-3xl text-sm text-slate-500">The current marketplace is selected by default. You can choose any active marketplace without creating another owner account.</p>
      <div className="owner-form-grid mt-7">
        <label className="wide">Marketplace / site<select value={property.siteId} onChange={(event) => selectSite(event.target.value)}>{sites.map((site) => {
          const siteId = site.id || site._id || site.slug;
          return <option value={siteId} key={siteId}>{site.name} — {site.location?.city || site.city}</option>;
        })}</select></label>
        <label>Property name<input value={property.name} onChange={(event) => field("name", event.target.value)} placeholder="Property name" /></label>
        <label>Property type<select value={property.type} onChange={(event) => field("type", event.target.value)}>{["Hotel", "Homestay", "Resort", "Villa", "Apartment", "Guest House", "Cottage"].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="wide">Full address<input value={property.address} onChange={(event) => field("address", event.target.value)} placeholder="Street, locality and landmark" /></label>
        <label>City<input value={property.city} onChange={(event) => field("city", event.target.value)} /></label>
        <label>State<input value={property.state} onChange={(event) => field("state", event.target.value)} /></label>
        <label>Pincode<input value={property.pincode} onChange={(event) => field("pincode", event.target.value)} placeholder="781001" /></label>
        <label>Number of rooms<input type="number" min="1" value={property.rooms} onChange={(event) => field("rooms", event.target.value)} /></label>
        <label>Maximum guests<input type="number" min="1" value={property.maxGuests} onChange={(event) => field("maxGuests", event.target.value)} /></label>
        <label>Price per night (₹)<input type="number" min="0" value={property.price} onChange={(event) => field("price", event.target.value)} /></label>
        <label>Taxes & fees (₹)<input type="number" min="0" value={property.taxes} onChange={(event) => field("taxes", event.target.value)} /></label>
        <label className="wide">Description<textarea value={property.description} onChange={(event) => field("description", event.target.value)} placeholder="Describe the stay and nearby highlights" /></label>
        <label className="wide">Amenities<input value={property.amenities} onChange={(event) => field("amenities", event.target.value)} placeholder="Comma-separated amenities" /></label>
        <label className="wide">Photo links<input value={property.photos} onChange={(event) => field("photos", event.target.value)} placeholder="Comma-separated image URLs (prototype)" /></label>
        <label className="wide">Document references<input value={property.documents} onChange={(event) => field("documents", event.target.value)} placeholder="Registration, ID and compliance document names" /></label>
      </div>
      <div className="mt-7 flex flex-wrap justify-end gap-3">
        <button onClick={onSave} className="owner-btn"><Save className="size-4" />Save Draft</button>
        <button onClick={onSubmit} className="btn-primary"><FileText className="size-4" />Submit for Approval</button>
      </div>
    </section>
  );
}
