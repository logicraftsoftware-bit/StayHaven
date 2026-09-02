"use client";
/* Cloudinary previews and local QR/data previews require native media elements. */
/* eslint-disable @next/next/no-img-element */
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, publicApiBase } from "@/lib/api-client";
import { useSite } from "@/components/site/SiteProvider";
import { OWNER_TOKEN_KEY } from "./OwnerAuth";
import { PropertyManager } from "./PropertyManager";
import { PropertyMediaManager } from "./PropertyMediaManager";
import { PropertyAmenities } from "./PropertyAmenities";
import { MealsPolicies } from "./MealsPolicies";
import { FinanceLegal } from "./FinanceLegal";
import { LocationPicker } from "./LocationPicker";
type Api<T> = { success: boolean; data: T; message?: string };
type Site = {
  _id: string;
  name: string;
  domain: string;
  city: string;
  state: string;
};
type Master = {
  _id: string;
  name: string;
  image?: string;
  description?: string;
};
type Room = {
  id: string;
  name: string;
  attachedBathroom: boolean;
  kitchen: boolean;
  beds: Array<{ type: string; quantity: number }>;
  baseAdults: number;
  maxAdults: number;
  facilities: string[];
  description: string;
  size: string;
  view: string;
  floor: string;
  smoking: boolean;
  baseRate: number;
  additionalSpaces: string;
  bathroomSize: string;
  bathroomAmenities: string[];
};
type Media = {
  id: string;
  url: string;
  publicId?: string;
  mediaType: "image" | "video";
  roomId?: string;
  category: string;
  tags?: string[];
  caption: string;
  primary: boolean;
  sortOrder: number;
};
type Form = {
  _id?: string;
  slug?: string;
  siteId: string;
  propertyTypeId: string;
  propertyType?: string;
  name: string;
  displayName: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  price: number;
  rooms: number;
  maxGuests: number;
  amenities: string[];
  basicInfo: Record<string, unknown>;
  locationDetails: Record<string, unknown>;
  location: { type: "Point"; coordinates: [number, number] };
  roomDetails: Room[];
  media: Media[];
  mealPlans: Array<Record<string, unknown>>;
  policies: Record<string, unknown>;
  financeLegal: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  seo: Record<string, unknown>;
  status?: string;
  reviewReason?: string;
  completeness?: number;
};
const steps = [
  "Property Type",
  "Basic Info",
  "Location",
  "Rooms & Spaces",
  "Photos & Videos",
  "Amenities",
  "Meals & Policies",
  "Finance & Legal",
];
const propertyYears = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, index) => String(new Date().getFullYear() - index),
);
const empty: Form = {
  siteId: "",
  propertyTypeId: "",
  name: "",
  displayName: "",
  description: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  price: 0,
  rooms: 1,
  maxGuests: 2,
  amenities: [],
  basicInfo: {},
  locationDetails: {},
  location: { type: "Point", coordinates: [91.7362, 26.1445] },
  roomDetails: [],
  media: [],
  mealPlans: [],
  policies: {},
  financeLegal: {},
  documents: [],
  seo: {},
};
const room = (): Room => ({
  id: crypto.randomUUID(),
  name: "",
  attachedBathroom: true,
  kitchen: false,
  beds: [{ type: "Queen Bed", quantity: 1 }],
  baseAdults: 2,
  maxAdults: 2,
  facilities: [],
  description: "",
  size: "",
  view: "",
  floor: "",
  smoking: false,
  baseRate: 0,
  additionalSpaces: "",
  bathroomSize: "",
  bathroomAmenities: [],
});
export function PropertyWizard({ propertyId }: { propertyId?: string }) {
  const router = useRouter();
  const currentSite = useSite();
  const [token, setToken] = useState("");
  const [form, setForm] = useState<Form>(empty);
  const [sites, setSites] = useState<Site[]>([]);
  const [types, setTypes] = useState<Master[]>([]);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [manageEdit, setManageEdit] = useState(false);
  useEffect(() => {
    queueMicrotask(async () => {
      const access = localStorage.getItem(OWNER_TOKEN_KEY) || "";
      if (!access) return router.replace("/list-your-property");
      setToken(access);
      try {
        const [siteResult, typeResult, existing] = await Promise.all([
          apiRequest<Api<Site[]>>("/api/v1/owner/sites", access),
          apiRequest<Api<Master[]>>("/api/v1/property-types"),
          propertyId
            ? apiRequest<Api<Form>>(
                `/api/v1/owner/properties/${propertyId}`,
                access,
              )
            : Promise.resolve(null),
        ]);
        setSites(siteResult.data);
        setTypes(typeResult.data);
        if (existing)
          setForm({
            ...empty,
            ...existing.data,
            siteId:
              typeof existing.data.siteId === "object"
                ? (existing.data.siteId as unknown as Site)._id
                : existing.data.siteId,
          });
        else if (siteResult.data[0]) {
          const defaultSite =
            siteResult.data.find(
              (site) => site._id === (currentSite.id || currentSite._id),
            ) || siteResult.data[0];
          setForm((v) => ({
            ...v,
            siteId: defaultSite._id,
            city: defaultSite.city,
            state: defaultSite.state,
          }));
        }
      } catch (error) {
        setNotice((error as Error).message);
      }
    });
  }, [currentSite.id, currentSite._id, propertyId, router]);
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((v) => ({ ...v, [key]: value }));
  const setNested = (
    key: "basicInfo" | "locationDetails" | "policies" | "financeLegal" | "seo",
    field: string,
    value: unknown,
  ) => setForm((v) => ({ ...v, [key]: { ...v[key], [field]: value } }));
  const save = async (submit = false) => {
    setSaving(true);
    setNotice("");
    try {
      const roomRates = form.roomDetails
        .map((roomItem) => roomItem.baseRate)
        .filter((rate) => rate > 0);
      const payload = {
        ...form,
        _id: undefined,
        submit,
        rooms: form.roomDetails.length || 1,
        price: roomRates.length ? Math.min(...roomRates) : form.price || 0,
      };
      const result = await apiRequest<Api<Form>>(
        `/api/v1/owner/properties${form._id ? `/${form._id}` : ""}`,
        token,
        { method: form._id ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      setForm((v) => ({ ...v, ...result.data }));
      setNotice(submit ? "Property submitted for review." : "Draft saved.");
      if (submit) setTimeout(() => router.push("/owner"), 800);
      return true;
    } catch (error) {
      setNotice((error as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const upload = async (file: File, roomId = "") => {
    const body = new FormData();
    body.append("file", file);
    const kind = file.type.startsWith("video/") ? "videos" : "images";
    const result = await apiRequest<Api<{ url: string; publicId?: string }>>(
      `/api/v1/owner/media/${kind}`,
      token,
      { method: "POST", body },
    );
    return {
      id: crypto.randomUUID(),
      ...result.data,
      mediaType: kind === "videos" ? "video" : "image",
      roomId: roomId || undefined,
      category: roomId ? "Room" : "Property",
      tags: [],
      caption: "",
      primary: !form.media.length,
      sortOrder: form.media.length,
    } satisfies Media;
  };
  const uploadDocument = async (file: File, documentType: string) => {
    const body = new FormData();
    body.append("file", file);
    const result = await apiRequest<Api<{ url: string; publicId?: string }>>(
      "/api/v1/owner/media/documents",
      token,
      { method: "POST", body },
    );
    set("documents", [
      ...form.documents,
      {
        id: crypto.randomUUID(),
        type: documentType,
        ...result.data,
        verificationStatus: "pending",
        uploadedAt: new Date().toISOString(),
      },
    ]);
  };
  const percent = useMemo(
    () =>
      Math.round(
        ([
          form.propertyTypeId,
          form.name,
          form.address,
          form.city,
          form.state,
          form.description,
          form.roomDetails.length,
          form.media.length,
          form.amenities.length,
          Object.keys(form.policies).length,
        ].filter(Boolean).length /
          10) *
          100,
      ),
    [form],
  );
  const goToNextStep = async () => {
    if (step === 4) {
      const roomsWithoutPhotos = form.roomDetails.filter(
        (roomItem) =>
          !form.media.some(
            (item) => item.mediaType === "image" && item.roomId === roomItem.id,
          ),
      );
      if (roomsWithoutPhotos.length) {
        setNotice("Add at least one photo for every room before continuing.");
        return;
      }
      if (
        !form.media.some((item) => item.mediaType === "image" && item.primary)
      ) {
        setNotice("Select one image as the main property cover photo.");
        return;
      }
    }
    setNotice("");
    if (await save(false)) setStep(step + 1);
  };
  if (form.status === "APPROVED" && !manageEdit)
    return (
      <PropertyManager
        property={form}
        site={sites.find((s) => s._id === form.siteId)}
        token={token}
        onBack={() => router.push("/owner")}
        onEdit={() => setManageEdit(true)}
      />
    );
  return (
    <main className="property-wizard">
      <header>
        <button onClick={() => router.push("/owner")}>
          <ArrowLeft /> My Properties
        </button>
        <div>
          <b>{form.name || "List New Property"}</b>
          <span className="owner-status">{form.status || "DRAFT"}</span>
        </div>
        <div className="wizard-progress">
          <span style={{ width: `${percent}%` }} />
        </div>
        <small>{percent}% complete</small>
      </header>
      <nav>
        {steps.map((label, index) => (
          <button
            key={label}
            className={index === step ? "active" : index < step ? "done" : ""}
            onClick={() => setStep(index)}
          >
            <i>{index < step ? <Check /> : index + 1}</i>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <section className="wizard-body">
        <div className="wizard-title">
          <span>
            STEP {step + 1} OF {steps.length}
          </span>
          <h1>{steps[step]}</h1>
          {form.reviewReason && (
            <p className="owner-review-note">
              <b>Changes requested:</b> {form.reviewReason}
            </p>
          )}
        </div>
        <div className="wizard-card">
          {step === 0 && (
            <div className="property-type-options">
              {types.map((type) => (
                <button
                  key={type._id}
                  className={form.propertyTypeId === type._id ? "selected" : ""}
                  onClick={() => {
                    set("propertyTypeId", type._id);
                    set("propertyType", type.name);
                  }}
                >
                  {type.image ? (
                    <img
                      src={`${type.image.startsWith("/") ? publicApiBase : ""}${type.image}`}
                      alt={`${type.name} property type`}
                    />
                  ) : (
                    <BuildingIcon />
                  )}
                  <b>{type.name}</b>
                  <span>
                    {type.description || `List your ${type.name.toLowerCase()}`}
                  </span>
                </button>
              ))}
            </div>
          )}
          {step === 1 && (
            <div className="wizard-grid">
              <Field
                label="Property name (Display name)"
                value={form.displayName || form.name}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    name: value,
                    displayName: value,
                  }))
                }
              />
              <YearField
                label="When was the property built?"
                value={String(form.basicInfo.builtYear || "")}
                onChange={(value) => setNested("basicInfo", "builtYear", value)}
              />
              <YearField
                label="Accepting bookings since"
                value={String(form.basicInfo.acceptingBookingsSince || "")}
                onChange={(value) =>
                  setNested("basicInfo", "acceptingBookingsSince", value)
                }
              />
              <Field
                label="Contact person name"
                value={String(form.basicInfo.contactPerson || "")}
                onChange={(v) => setNested("basicInfo", "contactPerson", v)}
              />
              <Field
                label="Phone"
                type="tel"
                value={String(form.basicInfo.phone || "")}
                onChange={(v) => setNested("basicInfo", "phone", v)}
              />
              <Field
                label="Email"
                type="email"
                value={String(form.basicInfo.email || "")}
                onChange={(v) => setNested("basicInfo", "email", v)}
              />
              <Field
                label="Landline number (optional)"
                type="tel"
                value={String(form.basicInfo.landline || "")}
                onChange={(v) => setNested("basicInfo", "landline", v)}
              />
              <label className="wide">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
            </div>
          )}
          {step === 2 && (
            <div className="property-location-step">
              <label className="property-location-site">
                Marketplace site
                <select
                  value={form.siteId}
                  onChange={(e) => {
                    const s = sites.find((x) => x._id === e.target.value);
                    setForm((v) => ({
                      ...v,
                      siteId: e.target.value,
                      city: s?.city || v.city,
                      state: s?.state || v.state,
                    }));
                  }}
                >
                  {sites.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <LocationPicker
                value={{
                  ...form.locationDetails,
                  latitude: form.location.coordinates[1],
                  longitude: form.location.coordinates[0],
                }}
                address={form.address}
                onChange={(patch) =>
                  setForm((current) => ({
                    ...current,
                    address: patch.address ?? current.address,
                    city: patch.city ?? current.city,
                    state: patch.state ?? current.state,
                    country: patch.country ?? current.country,
                    location:
                      patch.latitude !== undefined &&
                      patch.longitude !== undefined
                        ? {
                            type: "Point",
                            coordinates: [patch.longitude, patch.latitude],
                          }
                        : current.location,
                    locationDetails: {
                      ...current.locationDetails,
                      ...Object.fromEntries(
                        Object.entries(patch).filter(
                          ([key, value]) =>
                            !["address", "city", "state", "country"].includes(
                              key,
                            ) && value !== undefined,
                        ),
                      ),
                    },
                  }))
                }
              />
              <div className="property-location-address-grid wizard-grid">
                <Field
                  label="House / Building / Apartment No."
                  value={String(form.locationDetails.house || "")}
                  onChange={(v) => setNested("locationDetails", "house", v)}
                />
                <Field
                  label="Locality / Area / Street / Sector"
                  value={String(form.locationDetails.area || "")}
                  onChange={(v) => setNested("locationDetails", "area", v)}
                />
                <Field
                  label="PIN / ZIP"
                  value={String(form.locationDetails.postalCode || "")}
                  onChange={(v) =>
                    setNested("locationDetails", "postalCode", v)
                  }
                />
                <Field
                  label="Country"
                  value={form.country}
                  onChange={(v) => set("country", v)}
                />
                <Field
                  label="State"
                  value={form.state}
                  onChange={(v) => set("state", v)}
                />
                <Field
                  label="City"
                  value={form.city}
                  onChange={(v) => set("city", v)}
                />
                <label className="wide">
                  Full address
                  <textarea
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </label>
                <label className="property-address-confirm wide">
                  <input type="checkbox" required />I confirm this address
                  matches the registration or ownership document.
                </label>
              </div>
            </div>
          )}
          {step === 3 && (
            <Rooms
              rooms={form.roomDetails}
              setRooms={(rooms) => set("roomDetails", rooms)}
            />
          )}
          {step === 4 && (
            <PropertyMediaManager
              media={form.media}
              rooms={form.roomDetails}
              upload={upload}
              setMedia={(media) => set("media", media)}
            />
          )}
          {step === 5 && (
            <PropertyAmenities
              values={form.amenities}
              onChange={(values) => set("amenities", values)}
            />
          )}
          {step === 6 && (
            <MealsPolicies
              mealPlans={form.mealPlans}
              setMealPlans={(plans) => set("mealPlans", plans)}
              policies={form.policies}
              setPolicy={(field, value) => setNested("policies", field, value)}
            />
          )}
          {step === 7 && (
            <FinanceLegal
              values={form.financeLegal}
              documents={form.documents}
              propertyAddress={[
                form.address,
                form.city,
                form.state,
                String(form.locationDetails.pinCode || ""),
              ]
                .filter(Boolean)
                .join(", ")}
              setValue={(field, value) =>
                setNested("financeLegal", field, value)
              }
              uploadDocument={uploadDocument}
              removeDocument={(index) =>
                set(
                  "documents",
                  form.documents.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
          )}
        </div>
        {notice && <p className="owner-review-note">{notice}</p>}
        <footer>
          <button
            onClick={() => (step ? setStep(step - 1) : router.push("/owner"))}
          >
            <ArrowLeft /> Previous
          </button>
          <div>
            <button onClick={() => void save(false)} disabled={saving}>
              <Save /> Save Draft
            </button>
            {step < steps.length - 1 ? (
              <button
                className="btn-primary"
                onClick={() => void goToNextStep()}
                disabled={saving}
              >
                Save & Next
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => void save(true)}
                disabled={saving}
              >
                <Send /> Submit for Review
              </button>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function YearField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select year</option>
        {propertyYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
function BuildingIcon() {
  return <div className="type-placeholder">⌂</div>;
}
export function ChoiceGrid({
  values,
  onChange,
  options,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: string[];
}) {
  return (
    <div className="choice-grid">
      {options.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            checked={values.includes(option)}
            onChange={() =>
              onChange(
                values.includes(option)
                  ? values.filter((v) => v !== option)
                  : [...values, option],
              )
            }
          />
          {option}
        </label>
      ))}
    </div>
  );
}
const roomAmenityGroups = [
  {
    title: "Mandatory",
    items: [
      "TV",
      "Balcony",
      "Private Pool",
      "Air Conditioning",
      "Iron/Ironing Board",
      "Mineral Water",
      "Kettle",
      "Wifi",
      "Safe",
      "Bathroom",
      "Hairdryer",
      "Hot & Cold Water",
      "Toiletries",
      "Towels",
      "Peep Hole",
      "Bathtub",
      "Kitchen/Kitchenette",
      "Power backup",
      "Caretaker",
    ],
  },
  {
    title: "Popular with Guests",
    items: [
      "Heater",
      "Housekeeping",
      "In Room dining",
      "Laundry Service",
      "Room service",
      "Smoking Room",
      "Air Purifier",
      "Interconnected Room",
    ],
  },
  { title: "Basic Facilities", items: ["LAN"] },
  { title: "Bathroom", items: ["Bidet", "Toilet with grab rails"] },
  {
    title: "General Services",
    items: ["Cloak Room", "Specially abled assistance", "Butler Services"],
  },
  {
    title: "Room Features",
    items: [
      "Closet",
      "Blackout curtains",
      "Center Table",
      "Charging points",
      "Couch",
      "Fireplace",
      "Mini Fridge",
      "Sofa",
      "Telephone",
      "Work Desk",
      "Pillow menu",
      "Hypoallergenic Bedding",
      "Seating Area",
      "Chair",
      "Fireplace Guard",
      "Jaccuzi",
      "Hot Water Bag",
    ],
  },
  { title: "Common Area", items: ["Balcony/ Terrace"] },
  { title: "Food and Drinks", items: ["Cake", "Fruit Basket", "Mini Bar"] },
  { title: "Food and Drink", items: ["Kid's Menu"] },
  { title: "Appliances", items: ["Coffee Machine"] },
  { title: "Beds and Blanket", items: ["Blanket"] },
  { title: "Safety and Security", items: ["Cupboards with locks"] },
  { title: "Childcare", items: ["Child safety socket covers"] },
  { title: "Other Facilities", items: ["Mosquito Net", "Newspaper", "Fan"] },
];
const bathroomAmenityGroups = [
  {
    title: "Bathroom Amenities",
    items: [
      "Bathtub",
      "Toiletries",
      "Towels",
      "Shaving Mirror",
      "Western Toilet Seat",
      "Washing machine",
      "Bubble kit",
      "Dental Kit",
      "Geyser/ Water Heater",
      "Slipper",
      "Shower Cap",
    ],
  },
];
const roomViews = [
  "No View",
  "Sea View",
  "Valley View",
  "Hill View",
  "Pool View",
  "Garden View",
  "River View",
  "Lake View",
  "Palace View",
  "Bay View",
  "Jungle View",
  "City View",
  "Landmark View",
  "Terrace View",
  "Courtyard View",
  "Desert View",
  "Golf Course View",
  "Mountain View",
  "Ocean View",
  "Backwater View",
  "Harbor View",
  "Inter-coastal View",
  "Marina View",
  "Temple View",
  "Resort View",
  "Monument View",
  "Park View",
  "Lagoon View",
  "Forest View",
  "Beach View",
  "Airport View",
  "Countryside View",
];
const mediaTagOptions = [
  "Bathtub",
  "Jacuzzi",
  "Toiletries",
  "Washroom",
  "Balcony",
  "Bed",
  "Dining",
  "Dining Area",
  "Kitchenette",
  "Living Area",
  "Lobby/Common Area",
  "Outside View",
  "Play Area",
  "Private Pool",
  "Room",
  "Study Area",
  "View",
  "Bar",
  "Barbeque",
  "Bonfire",
  "Camp Site",
  "Restaurant/cafe",
  "Beverage Menu",
  "Food Menu",
  "Driver Room",
  "Kitchen",
  "Lounge",
  "Parking",
  "Activities & Experiences",
  "Banquet",
  "Club house",
  "Conference Room",
  "Elevator",
  "Entrance",
  "Facade",
  "Garden",
  "Golf Court",
  "Gym",
  "Menu",
  "Others",
  "Reception",
  "Registration Certificate",
  "Signature Amenity",
  "Spa",
  "Swimming Pool",
  "Terrace",
  "Food",
];

function Rooms({
  rooms,
  setRooms,
}: {
  rooms: Room[];
  setRooms: (r: Room[]) => void;
}) {
  const [amenityDialog, setAmenityDialog] = useState<{
    roomIndex: number;
    kind: "room" | "bathroom";
  } | null>(null);
  const update = (index: number, patch: Partial<Room>) =>
    setRooms(rooms.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const activeRoom = amenityDialog ? rooms[amenityDialog.roomIndex] : undefined;
  const selectedAmenities =
    amenityDialog?.kind === "bathroom"
      ? activeRoom?.bathroomAmenities || []
      : activeRoom?.facilities || [];
  return (
    <div>
      <button className="add-row" onClick={() => setRooms([...rooms, room()])}>
        <Plus /> Add Room
      </button>
      {rooms.map((r, index) => (
        <article className="room-editor" key={r.id}>
          <header>
            <b>Room {index + 1}</b>
            <button
              onClick={() => setRooms(rooms.filter((x) => x.id !== r.id))}
            >
              <Trash2 />
            </button>
          </header>
          <div className="wizard-grid">
            <Field
              label="Room name"
              value={r.name}
              onChange={(v) => update(index, { name: v })}
            />
            <label className="wide">
              Description
              <textarea
                value={r.description}
                onChange={(e) => update(index, { description: e.target.value })}
              />
            </label>
            <Field
              label="Base rate ₹ / night"
              type="number"
              value={String(r.baseRate)}
              onChange={(v) => update(index, { baseRate: Number(v) })}
            />
            <Field
              label="Base adults"
              type="number"
              value={String(r.baseAdults)}
              onChange={(v) => update(index, { baseAdults: Number(v) })}
            />
            <Field
              label="Maximum adults"
              type="number"
              value={String(r.maxAdults)}
              onChange={(v) => update(index, { maxAdults: Number(v) })}
            />
            <label>
              Bed type
              <select
                value={r.beds[0]?.type}
                onChange={(e) =>
                  update(index, {
                    beds: [
                      {
                        type: e.target.value,
                        quantity: r.beds[0]?.quantity || 1,
                      },
                    ],
                  })
                }
              >
                {[
                  "Single Bed",
                  "Twin Bed",
                  "Queen Bed",
                  "King Bed",
                  "Double Bed",
                  "Bunk Bed",
                  "Variable Size",
                  "Mattress",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <Field
              label="Bed quantity"
              type="number"
              value={String(r.beds[0]?.quantity || 1)}
              onChange={(v) =>
                update(index, {
                  beds: [
                    {
                      type: r.beds[0]?.type || "Queen Bed",
                      quantity: Number(v),
                    },
                  ],
                })
              }
            />
            <Field
              label="Room size (Sq. Ft.)"
              type="number"
              value={r.size}
              onChange={(v) => update(index, { size: v })}
            />
            <label className="room-amenity-field wide">
              Room amenities (optional)
              <button
                type="button"
                onClick={() =>
                  setAmenityDialog({ roomIndex: index, kind: "room" })
                }
              >
                <Plus /> Add amenities
              </button>
              {!!r.facilities.length && <span>{r.facilities.join(", ")}</span>}
            </label>
            <label>
              Room view (optional)
              <select
                value={r.view}
                onChange={(e) => update(index, { view: e.target.value })}
              >
                <option value="">Select View</option>
                {roomViews.map((view) => (
                  <option key={view}>{view}</option>
                ))}
              </select>
            </label>
            <label>
              Floor level (optional)
              <select
                value={r.floor}
                onChange={(e) => update(index, { floor: e.target.value })}
              >
                <option value="">Select floor</option>
                <option>Ground Floor</option>
                <option>Upper Floor</option>
              </select>
            </label>
            <label>
              Does the room have an attached bathroom?
              <select
                value={r.attachedBathroom ? "yes" : "no"}
                onChange={(e) =>
                  update(index, { attachedBathroom: e.target.value === "yes" })
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <Field
              label="Bathroom size (Sq. Ft.) (optional)"
              type="number"
              value={r.bathroomSize || ""}
              onChange={(v) => update(index, { bathroomSize: v })}
            />
            <label className="room-amenity-field wide">
              Bathroom amenities (optional)
              <button
                type="button"
                onClick={() =>
                  setAmenityDialog({ roomIndex: index, kind: "bathroom" })
                }
              >
                <Plus /> Add bathroom amenities
              </button>
              {!!r.bathroomAmenities?.length && (
                <span>{r.bathroomAmenities.join(", ")}</span>
              )}
            </label>
          </div>
        </article>
      ))}
      {amenityDialog && activeRoom && (
        <AmenityDialog
          title={
            amenityDialog.kind === "room"
              ? "Add room amenities"
              : "Add bathroom amenities"
          }
          groups={
            amenityDialog.kind === "room"
              ? roomAmenityGroups
              : bathroomAmenityGroups
          }
          selected={selectedAmenities}
          onChange={(values) =>
            update(
              amenityDialog.roomIndex,
              amenityDialog.kind === "room"
                ? { facilities: values }
                : { bathroomAmenities: values },
            )
          }
          onClose={() => setAmenityDialog(null)}
        />
      )}
    </div>
  );
}

function AmenityDialog({
  title,
  groups,
  selected,
  onChange,
  onClose,
}: {
  title: string;
  groups: Array<{ title: string; items: string[] }>;
  selected: string[];
  onChange: (values: string[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const filtered = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.toLowerCase().includes(term)),
    }))
    .filter((group) => group.items.length);
  const toggle = (item: string) =>
    onChange(
      selected.includes(item)
        ? selected.filter((value) => value !== item)
        : [...selected, item],
    );
  return (
    <div
      className="room-amenity-scrim"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="room-amenity-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <span>ROOM CONFIGURATION</span>
            <h2>{title}</h2>
            <p>Select multiple options for this room.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>
        <label className="room-amenity-search">
          <Search />
          <input
            autoFocus
            placeholder="Search amenities"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="room-amenity-groups">
          {filtered.map((group) => (
            <section key={group.title}>
              <h3>{group.title}</h3>
              <div>
                {group.items.map((item) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={selected.includes(item)}
                      onChange={() => toggle(item)}
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </section>
          ))}
          {!filtered.length && (
            <p className="room-amenity-empty">No amenities found.</p>
          )}
        </div>
        <footer>
          <span>{selected.length} selected</span>
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
export function MediaManager({
  media,
  rooms,
  upload,
  setMedia,
}: {
  media: Media[];
  rooms: Room[];
  upload: (f: File, roomId?: string) => Promise<Media>;
  setMedia: (m: Media[]) => void;
}) {
  const [tag, setTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState<Record<string, string>>({});
  const cover = media.find(
    (item) => item.primary && item.mediaType === "image",
  );
  const uploadMany = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => upload(file, tag)),
      );
      const firstImage = uploaded.findIndex(
        (item) => item.mediaType === "image",
      );
      const hasCover = media.some((item) => item.primary);
      setMedia([
        ...media,
        ...uploaded.map((item, index) => ({
          ...item,
          primary: !hasCover && index === firstImage,
          sortOrder: media.length + index,
        })),
      ]);
      setUploadOpen(false);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="property-media-manager">
      <header className="property-media-heading">
        <div>
          <h2>Photos & Videos ({media.length})</h2>
          <p>Upload, tag and assign media to your property and rooms.</p>
        </div>
        <button
          className="btn-primary"
          type="button"
          onClick={() => setUploadOpen(true)}
        >
          <ImagePlus /> Upload Photos & Videos
        </button>
      </header>
      {cover && (
        <div className="property-cover-preview">
          <img src={cover.url} alt="Property cover" />
          <span>
            Property cover photo
            {cover.tags?.[0] ? ` (${cover.tags[0]})` : ""}
          </span>
        </div>
      )}
      {uploadOpen && (
        <div className="media-upload-scrim">
          <section className="media-upload-modal">
            <header>
              <h2>Upload Photos & Videos</h2>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                disabled={uploading}
              >
                <X />
              </button>
            </header>
            <div className="media-upload-modal-body">
              <div
                className="media-upload media-drop-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!uploading) void uploadMany(event.dataTransfer.files);
                }}
              >
                <ImagePlus />
                <b>Drag & drop files here or choose multiple files</b>
                <select value={tag} onChange={(e) => setTag(e.target.value)}>
                  <option value="">Property photos/videos</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room · {r.name || "Unnamed room"}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  multiple
                  disabled={uploading}
                  onChange={(e) =>
                    e.target.files && void uploadMany(e.target.files)
                  }
                />
              </div>
              <aside>
                <h3>Photo resolution rules</h3>
                <ul>
                  <li>JPG, PNG or WEBP, maximum 5 MB each.</li>
                  <li>MP4 or WEBM video, maximum 25 MB each.</li>
                  <li>Use landscape photos, ideally 1920 × 1080 px.</li>
                  <li>Minimum recommended size: 1024 × 683 px.</li>
                  <li>Use bright, clear photos without watermarks.</li>
                  <li>Include at least one photo for every room.</li>
                </ul>
              </aside>
            </div>
          </section>
        </div>
      )}
      <section className="room-media-coverage">
        <h3>Photos assigned to rooms</h3>
        <p>Every room needs at least one photo.</p>
        <div>
          {rooms.map((roomItem) => {
            const count = media.filter(
              (item) =>
                item.roomId === roomItem.id && item.mediaType === "image",
            ).length;
            return (
              <article
                className={count ? "complete" : "missing"}
                key={roomItem.id}
              >
                <b>{roomItem.name || "Unnamed room"}</b>
                <small>
                  {count
                    ? `${count} photo${count > 1 ? "s" : ""}`
                    : "Photo required"}
                </small>
                <button
                  type="button"
                  onClick={() => {
                    setTag(roomItem.id);
                    setUploadOpen(true);
                  }}
                >
                  <Plus /> Add
                </button>
              </article>
            );
          })}
        </div>
      </section>
      <div className="media-grid">
        {media.map((item, i) => (
          <article key={item.id}>
            {item.mediaType === "video" ? (
              <video src={item.url} controls />
            ) : (
              <img src={item.url} alt="" />
            )}
            <select
              value={item.roomId || ""}
              onChange={(event) =>
                setMedia(
                  media.map((entry) =>
                    entry.id === item.id
                      ? {
                          ...entry,
                          roomId: event.target.value || undefined,
                          category: event.target.value ? "Room" : "Property",
                        }
                      : entry,
                  ),
                )
              }
            >
              <option value="">Entire property</option>
              {rooms.map((roomItem) => (
                <option key={roomItem.id} value={roomItem.id}>
                  {roomItem.name || "Unnamed room"}
                </option>
              ))}
            </select>
            <div className="media-tag-editor">
              <label>
                <Search />
                <input
                  placeholder="Search and select tags"
                  value={tagSearch[item.id] || ""}
                  onChange={(event) =>
                    setTagSearch((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </label>
              {!!tagSearch[item.id] && (
                <div className="media-tag-results">
                  {mediaTagOptions
                    .filter((option) =>
                      option
                        .toLowerCase()
                        .includes(tagSearch[item.id].toLowerCase()),
                    )
                    .map((option) => (
                      <label key={option}>
                        <input
                          type="checkbox"
                          checked={(item.tags || []).includes(option)}
                          onChange={() =>
                            setMedia(
                              media.map((entry) =>
                                entry.id === item.id
                                  ? {
                                      ...entry,
                                      tags: (entry.tags || []).includes(option)
                                        ? (entry.tags || []).filter(
                                            (value) => value !== option,
                                          )
                                        : [...(entry.tags || []), option],
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                        {option}
                      </label>
                    ))}
                </div>
              )}
              <div className="media-tag-chips">
                {(item.tags || []).map((selectedTag) => (
                  <button
                    type="button"
                    key={selectedTag}
                    onClick={() =>
                      setMedia(
                        media.map((entry) =>
                          entry.id === item.id
                            ? {
                                ...entry,
                                tags: (entry.tags || []).filter(
                                  (value) => value !== selectedTag,
                                ),
                              }
                            : entry,
                        ),
                      )
                    }
                  >
                    {selectedTag} <X />
                  </button>
                ))}
              </div>
            </div>
            <input
              placeholder="Caption"
              value={item.caption}
              onChange={(e) =>
                setMedia(
                  media.map((x, n) =>
                    n === i ? { ...x, caption: e.target.value } : x,
                  ),
                )
              }
            />
            <footer>
              <button
                onClick={() =>
                  setMedia(
                    media.map((x) => ({ ...x, primary: x.id === item.id })),
                  )
                }
              >
                {item.primary ? "Cover image" : "Set cover"}
              </button>
              <button
                onClick={() => setMedia(media.filter((x) => x.id !== item.id))}
              >
                <Trash2 />
              </button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
