"use client";

/* Profile photos are served by the configured media provider. */
/* eslint-disable @next/next/no-img-element */
import {
  Building2,
  Camera,
  Check,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { OWNER_TOKEN_KEY } from "./OwnerAuth";

type Owner = {
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  address?: string;
  profileImage?: string;
};
type Api<T> = { success: boolean; data: T };

export function OwnerProfile() {
  const [owner, setOwner] = useState<Owner | null>(null),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const token =
    typeof window === "undefined"
      ? ""
      : localStorage.getItem(OWNER_TOKEN_KEY) || "";
  useEffect(() => {
    apiRequest<Api<Owner>>(
      "/api/v1/owner/me",
      localStorage.getItem(OWNER_TOKEN_KEY) || "",
    )
      .then((r) => setOwner(r.data))
      .catch((e) => setError((e as Error).message));
  }, []);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await apiRequest<Api<Owner>>("/api/v1/owner/me", token, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setOwner(response.data);
      setNotice("Profile updated successfully.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setSaving(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await apiRequest<Api<Owner>>(
        "/api/v1/owner/me/avatar",
        token,
        { method: "POST", body },
      );
      setOwner(response.data);
      setNotice("Profile photo updated.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  };
  if (!owner) return <div className="owner-loading">Loading profile…</div>;
  return (
    <section className="owner-profile-page">
      <header>
        <div>
          <span>OWNER ACCOUNT</span>
          <h1>My profile</h1>
          <p>Keep your identity and business contact details up to date.</p>
        </div>
      </header>
      <div className="owner-profile-card">
        <div className="owner-profile-identity">
          <label>
            {owner.profileImage ? (
              <img src={owner.profileImage} alt="Owner profile" />
            ) : (
              <UserRound />
            )}
            <span>
              <Camera /> Change photo
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
          </label>
          <div>
            <small>PROPERTY PARTNER</small>
            <h2>{owner.name}</h2>
            <p>{owner.businessName || "Independent property owner"}</p>
          </div>
        </div>
        {(notice || error) && (
          <p
            className={
              error ? "owner-profile-message error" : "owner-profile-message"
            }
          >
            {error || notice}
          </p>
        )}
        <form onSubmit={save}>
          <label>
            <span>
              <UserRound /> Full name
            </span>
            <input name="name" defaultValue={owner.name} required />
          </label>
          <label>
            <span>
              <Building2 /> Business name
            </span>
            <input
              name="businessName"
              defaultValue={owner.businessName}
              placeholder="Hotel or company name"
            />
          </label>
          <label>
            <span>
              <Mail /> Login email
            </span>
            <input value={owner.email} disabled />
          </label>
          <label>
            <span>
              <Phone /> Verified mobile
            </span>
            <input name="phone" value={`+${owner.phone}`} disabled />
          </label>
          <label className="wide">
            <span>
              <MapPin /> Business address
            </span>
            <textarea
              name="address"
              defaultValue={owner.address}
              placeholder="Enter your business or correspondence address"
            />
          </label>
          <button disabled={saving}>
            {saving ? <LoaderCircle className="owner-spin" /> : <Check />}
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </div>
    </section>
  );
}
