"use client";
/* Cloudinary previews and local QR/data previews require native media elements. */
/* eslint-disable @next/next/no-img-element */
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, publicApiBase } from "@/lib/api-client";
import { useSite } from "@/components/site/SiteProvider";
import { OWNER_TOKEN_KEY } from "./OwnerAuth";
import { PropertyManager } from "./PropertyManager";
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
};
type Media = {
  id: string;
  url: string;
  publicId?: string;
  mediaType: "image" | "video";
  roomId?: string;
  category: string;
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
    } catch (error) {
      setNotice((error as Error).message);
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
    const item: Media = {
      id: crypto.randomUUID(),
      ...result.data,
      mediaType: kind === "videos" ? "video" : "image",
      roomId: roomId || undefined,
      category: roomId ? "Room" : "Property",
      caption: "",
      primary: !form.media.length,
      sortOrder: form.media.length,
    };
    set("media", [...form.media, item]);
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
                label="Property name"
                value={form.name}
                onChange={(v) => set("name", v)}
              />
              <Field
                label="Display name"
                value={form.displayName}
                onChange={(v) => set("displayName", v)}
              />
              <Field
                label="Contact person"
                value={String(form.basicInfo.contactPerson || "")}
                onChange={(v) => setNested("basicInfo", "contactPerson", v)}
              />
              <Field
                label="Phone"
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
                label="Website (optional)"
                value={String(form.basicInfo.website || "")}
                onChange={(v) => setNested("basicInfo", "website", v)}
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
            <div className="wizard-grid">
              <label className="wide">
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
              <Field
                label="Area"
                value={String(form.locationDetails.area || "")}
                onChange={(v) => setNested("locationDetails", "area", v)}
              />
              <label className="wide">
                Full address
                <textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </label>
              <Field
                label="PIN / ZIP"
                value={String(form.locationDetails.postalCode || "")}
                onChange={(v) => setNested("locationDetails", "postalCode", v)}
              />
              <Field
                label="Google Maps URL"
                value={String(form.locationDetails.mapUrl || "")}
                onChange={(v) => setNested("locationDetails", "mapUrl", v)}
              />
            </div>
          )}
          {step === 3 && (
            <Rooms
              rooms={form.roomDetails}
              setRooms={(rooms) => set("roomDetails", rooms)}
            />
          )}
          {step === 4 && (
            <MediaManager
              media={form.media}
              rooms={form.roomDetails}
              upload={upload}
              setMedia={(media) => set("media", media)}
            />
          )}
          {step === 5 && (
            <ChoiceGrid
              values={form.amenities}
              onChange={(values) => set("amenities", values)}
              options={[
                "Wi-Fi",
                "Parking",
                "Swimming Pool",
                "Restaurant",
                "Room Service",
                "Air Conditioning",
                "Power Backup",
                "Laundry",
                "Garden",
                "CCTV",
                "Lift",
                "Wheelchair Access",
              ]}
            />
          )}
          {step === 6 && (
            <div className="wizard-grid">
              <label>
                Meal plan
                <select
                  value={String(form.mealPlans[0]?.name || "Room Only")}
                  onChange={(e) =>
                    set("mealPlans", [
                      {
                        name: e.target.value,
                        included: e.target.value !== "Room Only",
                      },
                    ])
                  }
                >
                  <option>Room Only</option>
                  <option>Breakfast Included</option>
                  <option>Breakfast + Dinner</option>
                  <option>All Meals</option>
                </select>
              </label>
              <Field
                label="Check-in time"
                type="time"
                value={String(form.policies.checkIn || "14:00")}
                onChange={(v) => setNested("policies", "checkIn", v)}
              />
              <Field
                label="Check-out time"
                type="time"
                value={String(form.policies.checkOut || "11:00")}
                onChange={(v) => setNested("policies", "checkOut", v)}
              />
              <Field
                label="Cancellation policy"
                value={String(form.policies.cancellation || "")}
                onChange={(v) => setNested("policies", "cancellation", v)}
              />
              <Field
                label="Child policy"
                value={String(form.policies.child || "")}
                onChange={(v) => setNested("policies", "child", v)}
              />
              <Field
                label="Pet policy"
                value={String(form.policies.pet || "")}
                onChange={(v) => setNested("policies", "pet", v)}
              />
              <label className="wide">
                Property rules
                <textarea
                  value={String(form.policies.rules || "")}
                  onChange={(e) =>
                    setNested("policies", "rules", e.target.value)
                  }
                />
              </label>
            </div>
          )}
          {step === 7 && (
            <div className="wizard-grid">
              <Field
                label="Legal owner name"
                value={String(form.financeLegal.legalName || "")}
                onChange={(v) => setNested("financeLegal", "legalName", v)}
              />
              <Field
                label="Ownership type"
                value={String(form.financeLegal.ownershipType || "")}
                onChange={(v) => setNested("financeLegal", "ownershipType", v)}
              />
              <Field
                label="Bank name"
                value={String(form.financeLegal.bankName || "")}
                onChange={(v) => setNested("financeLegal", "bankName", v)}
              />
              <Field
                label="Account holder"
                value={String(form.financeLegal.accountHolder || "")}
                onChange={(v) => setNested("financeLegal", "accountHolder", v)}
              />
              <Field
                label="Account number"
                value={String(form.financeLegal.accountNumber || "")}
                onChange={(v) => setNested("financeLegal", "accountNumber", v)}
              />
              <Field
                label="IFSC"
                value={String(form.financeLegal.ifsc || "")}
                onChange={(v) => setNested("financeLegal", "ifsc", v)}
              />
              <Field
                label="SEO title"
                value={String(form.seo.title || "")}
                onChange={(v) => setNested("seo", "title", v)}
              />
              <Field
                label="SEO description"
                value={String(form.seo.description || "")}
                onChange={(v) => setNested("seo", "description", v)}
              />
              <Field
                label="SEO keywords (comma separated)"
                value={String(form.seo.keywords || "")}
                onChange={(v) => setNested("seo", "keywords", v)}
              />
              <label>
                Legal document type
                <select id="property-document-type" defaultValue="ownership-proof">
                  <option value="ownership-proof">Ownership proof</option>
                  <option value="identity-proof">Identity proof</option>
                  <option value="tax-document">Tax document</option>
                  <option value="bank-document">Bank document</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="wide media-upload">
                Upload legal document (PDF or image, maximum 10 MB)
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    const type = (
                      document.getElementById(
                        "property-document-type",
                      ) as HTMLSelectElement | null
                    )?.value;
                    if (file) void uploadDocument(file, type || "other");
                  }}
                />
              </label>
              {form.documents.length > 0 && (
                <div className="wide document-list">
                  {form.documents.map((item, index) => (
                    <div key={String(item.id || index)}>
                      <a
                        href={String(item.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {String(item.type || "Document")}
                      </a>
                      <span>{String(item.verificationStatus || "pending")}</span>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "documents",
                            form.documents.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        <Trash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="wide secure-note">
                Banking and identity information is private and never included
                in public property APIs.
              </div>
            </div>
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
              <button className="btn-primary" onClick={() => setStep(step + 1)}>
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
function BuildingIcon() {
  return <div className="type-placeholder">⌂</div>;
}
function ChoiceGrid({
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
function Rooms({
  rooms,
  setRooms,
}: {
  rooms: Room[];
  setRooms: (r: Room[]) => void;
}) {
  const update = (index: number, patch: Partial<Room>) =>
    setRooms(rooms.map((r, i) => (i === index ? { ...r, ...patch } : r)));
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
              label="Room size"
              value={r.size}
              onChange={(v) => update(index, { size: v })}
            />
            <Field
              label="View"
              value={r.view}
              onChange={(v) => update(index, { view: v })}
            />
            <label>
              <input
                type="checkbox"
                checked={r.attachedBathroom}
                onChange={(e) =>
                  update(index, { attachedBathroom: e.target.checked })
                }
              />{" "}
              Attached bathroom
            </label>
            <label>
              <input
                type="checkbox"
                checked={r.kitchen}
                onChange={(e) => update(index, { kitchen: e.target.checked })}
              />{" "}
              Kitchen
            </label>
            <label className="wide">
              Description
              <textarea
                value={r.description}
                onChange={(e) => update(index, { description: e.target.value })}
              />
            </label>
          </div>
        </article>
      ))}
    </div>
  );
}
function MediaManager({
  media,
  rooms,
  upload,
  setMedia,
}: {
  media: Media[];
  rooms: Room[];
  upload: (f: File, roomId?: string) => Promise<void>;
  setMedia: (m: Media[]) => void;
}) {
  const [tag, setTag] = useState("");
  return (
    <div>
      <div className="media-upload">
        <ImagePlus />
        <b>Upload property or room media</b>
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
          onChange={(e) =>
            e.target.files?.[0] && void upload(e.target.files[0], tag)
          }
        />
      </div>
      <div className="media-grid">
        {media.map((item, i) => (
          <article key={item.id}>
            {item.mediaType === "video" ? (
              <video src={item.url} controls />
            ) : (
              <img src={item.url} alt="" />
            )}
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
