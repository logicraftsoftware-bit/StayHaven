"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";

type GstSlab = { maxNightlyRate: number | null; ratePercent: number };
type Coupon = { code: string; percent: number; active: boolean; startsAt?: string; endsAt?: string };
type Master = { gstSlabs: GstSlab[]; coupons: Coupon[] };

export function PricingSettings({ token }: { token: string }) {
  const [master, setMaster] = useState<Master>({ gstSlabs: [], coupons: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest<{ data: Master }>("/api/v1/admin/settings/pricing", token)
      .then((result) => setMaster(result.data))
      .catch((reason) => setError((reason as Error).message));
  }, [token]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest<{ data: Master }>("/api/v1/admin/settings/pricing", token, {
        method: "PATCH", body: JSON.stringify(master),
      });
      setMaster(result.data);
      setMessage("GST slabs and coupons saved. New quotes and bookings now use these rules.");
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="admin-card api-settings-card pricing-master" onSubmit={save}>
    <div className="api-settings-card-heading"><div><h2>Booking price master</h2><p>Manage GST slabs by per-room nightly rate and percentage coupons. Existing bookings keep their original price snapshot.</p></div></div>
    <p className="pricing-master-warning">Confirm the applicable GST rules with your tax adviser before taking live bookings. Rates here affect every property.</p>
    <h3>GST slabs</h3>
    <div className="pricing-master-rows">{master.gstSlabs.map((slab, index) => <div className="pricing-master-row" key={index}>
      <label>Nightly rate up to (₹)<input type="number" min="0" step="0.01" value={slab.maxNightlyRate ?? ""} placeholder="No upper limit" onChange={(event) => setMaster((previous) => ({ ...previous, gstSlabs: previous.gstSlabs.map((item, at) => at === index ? { ...item, maxNightlyRate: event.target.value === "" ? null : Number(event.target.value) } : item) }))} /></label>
      <label>GST (%)<input type="number" min="0" max="100" step="0.01" value={slab.ratePercent} onChange={(event) => setMaster((previous) => ({ ...previous, gstSlabs: previous.gstSlabs.map((item, at) => at === index ? { ...item, ratePercent: Number(event.target.value) } : item) }))} required /></label>
      <button type="button" onClick={() => setMaster((previous) => ({ ...previous, gstSlabs: previous.gstSlabs.filter((_, at) => at !== index) }))}>Remove</button>
    </div>)}</div>
    <button type="button" onClick={() => setMaster((previous) => ({ ...previous, gstSlabs: [...previous.gstSlabs.slice(0, -1), { maxNightlyRate: 0, ratePercent: 0 }, ...(previous.gstSlabs.length ? previous.gstSlabs.slice(-1) : [{ maxNightlyRate: null, ratePercent: 0 }])] }))}>Add GST slab</button>
    <p>Keep slabs in ascending order. The final slab must have no upper limit.</p>
    <h3>Percentage coupons</h3>
    <div className="pricing-master-rows">{master.coupons.map((coupon, index) => <div className="pricing-master-row coupon" key={index}>
      <label>Code<input value={coupon.code} maxLength={32} onChange={(event) => setMaster((previous) => ({ ...previous, coupons: previous.coupons.map((item, at) => at === index ? { ...item, code: event.target.value.toUpperCase() } : item) }))} required /></label>
      <label>Discount (%)<input type="number" min="0.01" max="99" step="0.01" value={coupon.percent} onChange={(event) => setMaster((previous) => ({ ...previous, coupons: previous.coupons.map((item, at) => at === index ? { ...item, percent: Number(event.target.value) } : item) }))} required /></label>
      <label>Start date<input type="date" value={coupon.startsAt?.slice(0, 10) || ""} onChange={(event) => setMaster((previous) => ({ ...previous, coupons: previous.coupons.map((item, at) => at === index ? { ...item, startsAt: event.target.value || undefined } : item) }))} /></label>
      <label>End date<input type="date" value={coupon.endsAt?.slice(0, 10) || ""} onChange={(event) => setMaster((previous) => ({ ...previous, coupons: previous.coupons.map((item, at) => at === index ? { ...item, endsAt: event.target.value || undefined } : item) }))} /></label>
      <label>Enabled<input type="checkbox" checked={coupon.active} onChange={(event) => setMaster((previous) => ({ ...previous, coupons: previous.coupons.map((item, at) => at === index ? { ...item, active: event.target.checked } : item) }))} /></label>
      <button type="button" onClick={() => setMaster((previous) => ({ ...previous, coupons: previous.coupons.filter((_, at) => at !== index) }))}>Remove</button>
    </div>)}</div>
    <button type="button" onClick={() => setMaster((previous) => ({ ...previous, coupons: [...previous.coupons, { code: "", percent: 10, active: true }] }))}>Add coupon</button>
    {error && <p role="alert" className="admin-alert error">{error}</p>}{message && <p className="admin-alert success">{message}</p>}
    <div className="api-settings-actions"><button className="admin-primary compact" disabled={busy}>{busy ? "Saving…" : "Save pricing rules"}</button></div>
  </form>;
}
