"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { CUSTOMER_TOKEN } from "@/components/customer/CustomerAuth";
import type { PublicProperty, PublicRoom } from "@/types/public-property";

declare global { interface Window {
  Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (name: string, callback: (value: { error?: { description?: string } }) => void) => void };
  Cashfree?: (options: { mode: "sandbox" | "production" }) => { checkout: (options: { paymentSessionId: string; redirectTarget: "_modal" }) => Promise<{ error?: { message?: string } }> };
} }

type RazorpayOrder = { gateway: "RAZORPAY"; bookingId: string; bookingNumber: string; razorpayOrderId: string; keyId: string; amount: number; currency: string; propertyName: string; customer: { name: string; email: string; contact: string } };
type CashfreeOrder = { gateway: "CASHFREE"; bookingId: string; bookingNumber: string; orderId: string; paymentSessionId: string; mode: "sandbox" | "production"; amount: number; currency: string; propertyName: string };
type Order = RazorpayOrder | CashfreeOrder;

const loadScript = (id: string, src: string, ready: () => boolean) => new Promise<void>((resolve, reject) => {
  if (ready()) return resolve();
  const current = document.getElementById(id) as HTMLScriptElement | null;
  if (current) { current.addEventListener("load", () => resolve(), { once: true }); current.addEventListener("error", () => reject(new Error("Secure payment window could not be loaded")), { once: true }); return; }
  const script = document.createElement("script"); script.id = id; script.src = src; script.onload = () => resolve(); script.onerror = () => reject(new Error("Secure payment window could not be loaded")); document.head.appendChild(script);
});

export function BookingCheckout({ property, room, roomId, checkIn, checkOut, guests, cover }: { property: PublicProperty; room: PublicRoom; roomId: string; checkIn: string; checkOut: string; guests: number; cover: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{ id: string; number: string } | null>(null);
  const nights = Math.max(1, Math.round((new Date(checkOut).valueOf() - new Date(checkIn).valueOf()) / 86400000));
  const rate = Number(room.baseRate || room.price || property.price || 0);
  const estimate = rate * nights;
  const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
  const name = property.displayName || property.name;

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem(CUSTOMER_TOKEN) || "";
    if (!token) { router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const order = (await apiRequest<{ data: Order }>("/api/v1/customer/bookings/order", token, { method: "POST", body: JSON.stringify({ propertyId: property._id, roomId, checkIn, checkOut, rooms: Number(form.get("rooms")), adults: Number(form.get("adults")), children: Number(form.get("children")), guestName: form.get("guestName"), guestEmail: form.get("guestEmail"), guestPhone: form.get("guestPhone") }) })).data;
      if (order.gateway === "CASHFREE") {
        await loadScript("cashfree-checkout", "https://sdk.cashfree.com/js/v3/cashfree.js", () => Boolean(window.Cashfree));
        if (!window.Cashfree) throw new Error("Cashfree Checkout is unavailable");
        const result = await window.Cashfree({ mode: order.mode }).checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_modal" });
        if (result.error) throw new Error(result.error.message || "Cashfree payment was not completed");
        await apiRequest("/api/v1/customer/bookings/verify-cashfree", token, { method: "POST", body: JSON.stringify({ orderId: order.orderId }) });
        setConfirmed({ id: order.bookingId, number: order.bookingNumber }); setBusy(false); return;
      }
      await loadScript("razorpay-checkout", "https://checkout.razorpay.com/v1/checkout.js", () => Boolean(window.Razorpay));
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable");
      const instance = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: "Guwahati Homestay", description: `${order.propertyName} · ${nights} night stay`, order_id: order.razorpayOrderId, prefill: order.customer, theme: { color: "#af0d1d" }, modal: { ondismiss: () => setBusy(false) }, handler: async (response: Record<string, string>) => { try { await apiRequest("/api/v1/customer/bookings/verify", token, { method: "POST", body: JSON.stringify({ razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }) }); setConfirmed({ id: order.bookingId, number: order.bookingNumber }); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } } });
      instance.on("payment.failed", (response) => { setError(response.error?.description || "Payment failed. No booking was confirmed."); setBusy(false); });
      instance.open();
    } catch (reason) { setError((reason as Error).message); setBusy(false); }
  }

  if (confirmed) return <div className="booking-success"><i><CheckCircle2/></i><p>PAYMENT RECEIVED</p><h1>Your stay is confirmed.</h1><span>Booking ID <b>{confirmed.number}</b></span><p>A secure payment record has been created. The property receives its settlement after checkout.</p><Link href="/account">View my bookings</Link></div>;

  return <main className="secure-checkout"><div className="container"><header><div><p>REVIEW YOUR BOOKING</p><h1>One step away from your stay</h1><span><LockKeyhole/> Secure booking and payment</span></div><Link href={`/hotels/${property.slug}`}>Back to property</Link></header>
    <div className="checkout-layout"><form onSubmit={pay}>
      <section className="checkout-stay-card"><div className="checkout-property">{cover && <div><Image src={cover} alt={name} fill sizes="100px"/></div>}<span><small>YOUR PROPERTY</small><h2>{name}</h2><p>{[property.city, property.state].filter(Boolean).join(", ")}</p></span></div><div className="checkout-stay-dates"><div><small>CHECK-IN</small><strong>{dateLabel(checkIn)}</strong></div><div><small>CHECK-OUT</small><strong>{dateLabel(checkOut)}</strong></div><div><small>STAY</small><strong>{nights} {nights === 1 ? "night" : "nights"} · {guests} {guests === 1 ? "guest" : "guests"}</strong></div></div><div className="checkout-room-summary"><b>{room.name || "Selected room"}</b><span>{room.description || "Your selected room is ready for booking."}</span><div>{(room.facilities || []).slice(0, 4).map((facility) => <small key={facility}><CheckCircle2/>{facility}</small>)}</div></div></section>
      <section><div className="checkout-step"><b>01</b><span><h2>Important information</h2><p>Please review the property policies before paying.</p></span></div><div className="checkout-policy-list">{Object.entries(property.policies || {}).filter(([, value]) => value !== "" && value !== undefined).slice(0, 5).map(([key, value]) => <div key={key}><CheckCircle2/><span><b>{key.replace(/([A-Z])/g, " $1")}</b> · {typeof value === "boolean" ? value ? "Allowed" : "Not allowed" : String(value)}</span></div>)}{!Object.keys(property.policies || {}).length && <p>Contact the property for specific house rules and cancellation terms.</p>}</div></section>
      <section><div className="checkout-step"><b>02</b><span><h2>Guest details</h2><p>We’ll send your booking confirmation to these details.</p></span></div><div className="checkout-fields"><label className="wide">Full name<input name="guestName" required minLength={2} placeholder="Name as on ID" autoComplete="name"/></label><label>Email address<input name="guestEmail" type="email" required placeholder="you@example.com" autoComplete="email"/></label><label>Mobile number<input name="guestPhone" required minLength={8} placeholder="+91 98765 43210" autoComplete="tel"/></label><label>Rooms<input name="rooms" type="number" min="1" max="20" defaultValue="1" required/></label><label>Adults<input name="adults" type="number" min="1" max="50" defaultValue={guests} required/></label><label>Children<input name="children" type="number" min="0" max="30" defaultValue="0" required/></label></div></section>
      <section><div className="checkout-step"><b>03</b><span><h2>Pay securely</h2><p>The final amount is calculated from live property rates by the booking service.</p></span></div><div className="razorpay-checkout-note"><CreditCard/><div><strong>Secure payment gateway</strong><p>Available UPI, cards, netbanking and wallets appear in the active gateway.</p></div><ShieldCheck/></div>{error && <p className="checkout-error" role="alert">{error}</p>}<button className="checkout-pay" disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <LockKeyhole/>}{busy ? "Preparing secure payment…" : "Continue to secure payment"}</button><p className="checkout-terms">By continuing, you agree to the property’s listed policies and the final amount shown in the payment window.</p></section>
    </form><aside><div className="checkout-property">{cover && <div><Image src={cover} alt={name} fill sizes="90px"/></div>}<span><small>PRICE SUMMARY</small><h2>{name}</h2><p>{room.name || "Room"}</p></span></div><dl><div><dt><CalendarDays/> Check-in</dt><dd>{dateLabel(checkIn)}</dd></div><div><dt><CalendarDays/> Check-out</dt><dd>{dateLabel(checkOut)}</dd></div><div><dt><Users/> Guests</dt><dd>{guests}</dd></div><div><dt>Nights</dt><dd>{nights}</dd></div></dl><div className="checkout-estimate"><span>Room rate · ₹{rate.toLocaleString("en-IN")} × {nights} {nights === 1 ? "night" : "nights"}</span><strong>₹{estimate.toLocaleString("en-IN")}</strong><small>Estimated room charge. Taxes, extra guests and any applicable charges are calculated securely before payment.</small></div><div className="checkout-trust"><ShieldCheck/> Your payment is processed by the active secure gateway.</div></aside></div>
  </div></main>;
}
