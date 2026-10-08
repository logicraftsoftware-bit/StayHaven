"use client";

import { FormEvent, useEffect, useState } from "react";
import { BadgePercent, CirclePlus, IndianRupee, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

type GstSlab = { maxNightlyRate: number | null; ratePercent: number };
type Coupon = { code: string; percent: number; minBillAmount?: number; active: boolean; startsAt?: string; endsAt?: string };
type Master = { gstSlabs: GstSlab[]; coupons: Coupon[] };

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

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

  function updateSlab(index: number, changes: Partial<GstSlab>) {
    setMaster((current) => ({ ...current, gstSlabs: current.gstSlabs.map((item, at) => at === index ? { ...item, ...changes } : item) }));
  }

  function updateCoupon(index: number, changes: Partial<Coupon>) {
    setMaster((current) => ({ ...current, coupons: current.coupons.map((item, at) => at === index ? { ...item, ...changes } : item) }));
  }

  function addSlab() {
    setMaster((current) => {
      const previous = current.gstSlabs.slice(0, -1);
      const lastLimit = previous.at(-1)?.maxNightlyRate || 0;
      return { ...current, gstSlabs: [...previous, { maxNightlyRate: lastLimit + 1000, ratePercent: 0 }, ...current.gstSlabs.slice(-1)] };
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apiRequest<{ data: Master }>("/api/v1/admin/settings/pricing", token, {
        method: "PATCH", body: JSON.stringify(master),
      });
      setMaster(result.data);
      setMessage("Pricing rules saved. New quotes and bookings use these rules.");
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  return <form className="admin-card pricing-editor" onSubmit={save}>
    <div className="pricing-editor-header">
      <div><span className="pricing-editor-kicker">REVENUE SETTINGS</span><h2>Taxes & offers</h2><p>Control hotel GST and guest-facing coupons from one place.</p></div>
      <span className="pricing-editor-count">{master.coupons.length} coupon{master.coupons.length === 1 ? "" : "s"}</span>
    </div>

    <section className="pricing-editor-section">
      <div className="pricing-editor-section-head"><div><h3>GST slabs</h3><p>Applied to each room’s nightly rate. The last band has no upper limit.</p></div><button type="button" className="pricing-editor-add" onClick={addSlab}><CirclePlus size={16}/> Add slab</button></div>
      <div className="pricing-editor-slabs">{master.gstSlabs.map((slab, index) => <div className="pricing-editor-slab" key={index}>
        <span className="pricing-editor-slab-number">{String(index + 1).padStart(2, "0")}</span>
        <label>Nightly rate up to<input type="number" min="0.01" step="0.01" value={slab.maxNightlyRate ?? ""} placeholder="No upper limit" disabled={slab.maxNightlyRate === null} onChange={(event) => updateSlab(index, { maxNightlyRate: Number(event.target.value) })}/></label>
        <label>GST rate (%)<input type="number" min="0" max="100" step="0.01" value={slab.ratePercent} onChange={(event) => updateSlab(index, { ratePercent: Number(event.target.value) })} required/></label>
        <span className="pricing-editor-slab-label">{slab.maxNightlyRate === null ? "Above previous limit" : `Up to ${money(slab.maxNightlyRate)}`}</span>
        <button type="button" className="pricing-editor-delete" aria-label={`Remove GST slab ${index + 1}`} disabled={slab.maxNightlyRate === null} title={slab.maxNightlyRate === null ? "The final unlimited slab is required" : "Remove slab"} onClick={() => setMaster((current) => ({ ...current, gstSlabs: current.gstSlabs.filter((_, at) => at !== index) }))}><Trash2 size={16}/></button>
      </div>)}</div>
      <p className="pricing-editor-note">These rates are used for new bookings only. Confirm the correct GST schedule with your tax adviser.</p>
    </section>

    <section className="pricing-editor-section">
      <div className="pricing-editor-section-head"><div><h3>Percentage coupons</h3><p>Set an optional minimum bill to limit an offer to qualifying stays.</p></div><button type="button" className="pricing-editor-add" onClick={() => setMaster((current) => ({ ...current, coupons: [...current.coupons, { code: "", percent: 10, minBillAmount: 0, active: true }] }))}><CirclePlus size={16}/> Add coupon</button></div>
      {master.coupons.length ? <div className="pricing-editor-coupons">{master.coupons.map((coupon, index) => <div className="pricing-editor-coupon" key={index}>
        <div className="pricing-editor-coupon-head"><span className="pricing-editor-coupon-icon"><BadgePercent size={19}/></span><div><strong>{coupon.code || "New coupon"}</strong><small>{coupon.percent}% off{coupon.minBillAmount ? ` on bills of ${money(coupon.minBillAmount)} or more` : " on any bill"}</small></div><label className="pricing-editor-switch"><input type="checkbox" checked={coupon.active} onChange={(event) => updateCoupon(index, { active: event.target.checked })}/><span>{coupon.active ? "Active" : "Paused"}</span></label><button type="button" className="pricing-editor-delete" aria-label={`Remove coupon ${index + 1}`} onClick={() => setMaster((current) => ({ ...current, coupons: current.coupons.filter((_, at) => at !== index) }))}><Trash2 size={17}/></button></div>
        <div className="pricing-editor-coupon-fields">
          <label>Coupon code<input value={coupon.code} maxLength={32} placeholder="e.g. STAY15" onChange={(event) => updateCoupon(index, { code: event.target.value.toUpperCase() })} required/></label>
          <label>Discount (%)<span className="pricing-editor-input-icon"><BadgePercent size={15}/><input type="number" min="0.01" max="99" step="0.01" value={coupon.percent} onChange={(event) => updateCoupon(index, { percent: Number(event.target.value) })} required/></span></label>
          <label>Minimum bill (₹)<span className="pricing-editor-input-icon"><IndianRupee size={15}/><input type="number" min="0" step="0.01" value={coupon.minBillAmount ?? 0} onChange={(event) => updateCoupon(index, { minBillAmount: Number(event.target.value) })} required/></span></label>
          <label>Starts on<input type="date" value={coupon.startsAt?.slice(0, 10) || ""} onChange={(event) => updateCoupon(index, { startsAt: event.target.value || undefined })}/></label>
          <label>Ends on<input type="date" value={coupon.endsAt?.slice(0, 10) || ""} onChange={(event) => updateCoupon(index, { endsAt: event.target.value || undefined })}/></label>
        </div>
        <p className="pricing-editor-coupon-help">Minimum applies to room and extra-guest charges before coupon discount and GST. Leave at ₹0 for no minimum.</p>
      </div>)}</div> : <div className="pricing-editor-empty"><BadgePercent size={22}/><strong>No coupons yet</strong><span>Add an offer to show it on checkout.</span></div>}
    </section>
    {error && <p role="alert" className="admin-alert error">{error}</p>}{message && <p className="admin-alert success">{message}</p>}
    <div className="pricing-editor-footer"><span>Changes affect new quotes and bookings; existing booking totals stay unchanged.</span><button className="admin-primary compact" disabled={busy}>{busy ? "Saving…" : "Save pricing rules"}</button></div>
  </form>;
}
