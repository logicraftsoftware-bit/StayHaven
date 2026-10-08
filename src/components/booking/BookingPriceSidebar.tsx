"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck, Tag } from "lucide-react";

export type Quote = { roomAmount: number; extraGuestAmount: number; couponCode: string; couponPercent: number; couponDiscountAmount: number; gstRatePercent: number | null; gstIncluded: boolean; gstAmount: number; propertyTaxAmount: number; grossAmount: number };
export type AvailableCoupon = { code: string; percent: number; minBillAmount?: number; active: boolean };

const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const amount = (rupees: number) => `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function BookingPriceSidebar({ roomName, rooms, nights, quote, couponInput, setCouponInput, appliedCoupon, setAppliedCoupon, couponError, coupons }: {
  roomName: string; rooms: number; nights: number; quote: Quote | null;
  couponInput: string; setCouponInput: (value: string) => void;
  appliedCoupon: string; setAppliedCoupon: (value: string) => void;
  couponError: string; coupons: AvailableCoupon[];
}) {
  const [breakupOpen, setBreakupOpen] = useState(false);
  const [showAllCoupons, setShowAllCoupons] = useState(false);
  const beforeDiscount = (quote?.roomAmount || 0) + (quote?.extraGuestAmount || 0);
  const afterDiscount = beforeDiscount - (quote?.couponDiscountAmount || 0);
  const billForEligibility = beforeDiscount / 100;
  const visibleCoupons = showAllCoupons ? coupons : coupons.slice(0, 2);

  function selectCoupon(code: string) {
    setCouponInput(code);
    setAppliedCoupon(code);
  }

  return <aside className="checkout-side-stack">
    <section className="checkout-price-card">
      <div className="checkout-side-heading"><div><h2>{breakupOpen ? "Price Breakup" : "Price Summary"}</h2><small>{roomName}</small></div><button type="button" aria-expanded={breakupOpen} onClick={() => setBreakupOpen((value) => !value)}>{breakupOpen ? "Hide Price Breakup" : "View Price Breakup"}<ChevronDown className={breakupOpen ? "is-open" : ""} size={16}/></button></div>
      {quote ? breakupOpen ? <div className="checkout-breakup-rows">
        <div><span>Base room price<small>{rooms} {rooms === 1 ? "room" : "rooms"} × {nights} {nights === 1 ? "night" : "nights"}</small></span><b>{money(quote.roomAmount)}</b></div>
        {quote.extraGuestAmount > 0 && <div><span>Extra guests</span><b>{money(quote.extraGuestAmount)}</b></div>}
        {quote.couponDiscountAmount > 0 && <div className="discount"><span>Coupon {quote.couponCode} ({quote.couponPercent}% off)</span><b>−{money(quote.couponDiscountAmount)}</b></div>}
        <div className="checkout-breakup-subtotal"><span>Price after discount</span><b>{money(afterDiscount)}</b></div>
        <div><span>GST {quote.gstRatePercent === null ? "(mixed nightly rates)" : `(${quote.gstRatePercent}%)`}{quote.gstIncluded && <small>Included in room price</small>}</span><b>{quote.gstIncluded ? "Included " : "+"}{money(quote.gstAmount)}</b></div>
        {quote.propertyTaxAmount > 0 && <div><span>Other taxes & fees</span><b>+{money(quote.propertyTaxAmount)}</b></div>}
      </div> : <div className="checkout-price-compact"><span>Price{quote.couponDiscountAmount > 0 ? " after coupon" : ""} {quote.gstIncluded ? "(incl. GST)" : "+ GST"}</span><b>{money(afterDiscount)}{!quote.gstIncluded && quote.gstAmount > 0 ? ` + ${money(quote.gstAmount)}` : ""}</b></div> : <p className="checkout-price-loading">Checking live price…</p>}
      <div className="checkout-price-total"><span>Total amount to be paid</span><strong>{quote ? money(quote.grossAmount) : "—"}</strong></div>
      {breakupOpen && <p className="checkout-price-fineprint">GST follows the nightly room-rate slab. Final price is recalculated when booking.</p>}
    </section>

    <section className="checkout-coupon-card">
      <div className="checkout-side-heading"><div><h2>Coupon Codes</h2><small>Save on your stay</small></div>{coupons.length > 2 && <button type="button" onClick={() => setShowAllCoupons((value) => !value)}>{showAllCoupons ? "Show less" : "View all"}</button>}</div>
      <div className="checkout-coupon-entry"><input aria-label="Coupon code" placeholder="Have a coupon code?" value={couponInput} onChange={(event) => setCouponInput(event.target.value.toUpperCase())}/><button type="button" disabled={!couponInput.trim() || couponInput.trim() === appliedCoupon} onClick={() => selectCoupon(couponInput.trim())}>Apply</button></div>
      {appliedCoupon && quote?.couponCode === appliedCoupon && <div className="checkout-coupon-applied"><span><Tag size={15}/><b>{appliedCoupon}</b> applied · You save {money(quote.couponDiscountAmount)}</span><button type="button" onClick={() => { setAppliedCoupon(""); setCouponInput(""); }}>Remove</button></div>}
      {couponError && <p role="alert" className="checkout-coupon-error">{couponError}</p>}
      {visibleCoupons.length > 0 ? <div className="checkout-coupon-list">{visibleCoupons.map((coupon) => {
        const eligible = quote !== null && billForEligibility >= (coupon.minBillAmount || 0);
        const isApplied = quote?.couponCode === coupon.code;
        return <div className={`checkout-coupon-option${isApplied ? " is-applied" : ""}`} key={coupon.code}>
          <span className="checkout-coupon-icon"><Tag size={17}/></span><div><strong>{coupon.code}</strong><p>{coupon.percent}% off{coupon.minBillAmount ? ` on bills of ${amount(coupon.minBillAmount)} or more` : " on your booking"}</p>{!eligible && quote && <small>Add {amount((coupon.minBillAmount || 0) - billForEligibility)} more to use this offer</small>}</div>
          <button type="button" disabled={!eligible || isApplied} onClick={() => selectCoupon(coupon.code)}>{isApplied ? "Applied" : "Apply"}</button>
        </div>;
      })}</div> : <p className="checkout-coupon-empty">No offers are available right now. You can still enter a code above.</p>}
    </section>
    <p className="checkout-side-trust"><ShieldCheck size={17}/> Pay at hotel does not charge your card or credit the owner wallet.</p>
  </aside>;
}
