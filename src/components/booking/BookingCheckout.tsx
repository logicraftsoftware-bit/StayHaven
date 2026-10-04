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
  const [confirmed, setConfirmed] = useState<{ number: string; payAtHotel: boolean } | null>(null);
  const nights = Math.max(1, Math.round((new Date(checkOut).valueOf() - new Date(checkIn).valueOf()) / 86400000));
  const rate = Number(room.baseRate || room.price || property.price || 0);
  const estimate = rate * nights;
  const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
  const name = property.displayName || property.name;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem(CUSTOMER_TOKEN) || "";
    if (!token) { router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
    const form = new FormData(event.currentTarget);
    const payAtHotel = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "hotel";
    const details = { propertyId: property._id, roomId, checkIn, checkOut, rooms: Number(form.get("rooms")), adults: Number(form.get("adults")), children: Number(form.get("children")), guestName: `${String(form.get("firstName") || "").trim()} ${String(form.get("lastName") || "").trim()}`.trim(), guestEmail: form.get("guestEmail"), guestPhone: form.get("guestPhone") };
    setBusy(true); setError("");
    try {
      if (payAtHotel) {
        const booking = (await apiRequest<{ data: { bookingNumber: string } }>("/api/v1/customer/bookings/pay-at-hotel", token, { method: "POST", body: JSON.stringify(details) })).data;
        setConfirmed({ number: booking.bookingNumber, payAtHotel: true });
        setBusy(false);
        return;
      }
      const order = (await apiRequest<{ data: Order }>("/api/v1/customer/bookings/order", token, { method: "POST", body: JSON.stringify(details) })).data;
      if (order.gateway === "CASHFREE") {
        await loadScript("cashfree-checkout", "https://sdk.cashfree.com/js/v3/cashfree.js", () => Boolean(window.Cashfree));
        if (!window.Cashfree) throw new Error("Cashfree Checkout is unavailable");
        const result = await window.Cashfree({ mode: order.mode }).checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_modal" });
        if (result.error) throw new Error(result.error.message || "Cashfree payment was not completed");
        await apiRequest("/api/v1/customer/bookings/verify-cashfree", token, { method: "POST", body: JSON.stringify({ orderId: order.orderId }) });
        setConfirmed({ number: order.bookingNumber, payAtHotel: false }); setBusy(false); return;
      }
      await loadScript("razorpay-checkout", "https://checkout.razorpay.com/v1/checkout.js", () => Boolean(window.Razorpay));
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable");
      const instance = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: "Guwahati Homestay", description: `${order.propertyName} · ${nights} night stay`, order_id: order.razorpayOrderId, prefill: order.customer, theme: { color: "#af0d1d" }, modal: { ondismiss: () => setBusy(false) }, handler: async (response: Record<string, string>) => { try { await apiRequest("/api/v1/customer/bookings/verify", token, { method: "POST", body: JSON.stringify({ razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }) }); setConfirmed({ number: order.bookingNumber, payAtHotel: false }); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } } });
      instance.on("payment.failed", (response) => { setError(response.error?.description || "Payment failed. No booking was confirmed."); setBusy(false); });
      instance.open();
    } catch (reason) { setError((reason as Error).message); setBusy(false); }
  }

  if (confirmed) return <div className="booking-success"><i><CheckCircle2 /></i><p>{confirmed.payAtHotel ? "PAY AT HOTEL" : "PAYMENT RECEIVED"}</p><h1>Your stay is confirmed.</h1><span>Booking ID <b>{confirmed.number}</b></span><p>{confirmed.payAtHotel ? "No online payment was collected. Pay the property directly at check-in. This reservation is visible to the property owner." : "A secure payment record has been created. The property receives its settlement after checkout."}</p><Link href="/account#trips">View my booking in My trips</Link></div>;

  return <main className="secure-checkout checkout-reference"><div className="container">
    <header><div><p>REVIEW YOUR BOOKING</p><h1>Review your booking</h1></div><Link href={`/hotels/${property.slug}`}>Back to property</Link></header>
    <div className="checkout-layout"><form onSubmit={submit}>
      <section className="checkout-stay-card"><div className="checkout-property"><span><small>{property.propertyType || "PROPERTY"}</small><h2>{name}</h2><p>{[property.address, property.city, property.state].filter(Boolean).join(", ")}</p></span>{cover && <div><Image src={cover} alt={name} fill sizes="100px"/></div>}</div><div className="checkout-stay-dates"><div><small>CHECK-IN</small><strong>{dateLabel(checkIn)}</strong></div><div><small>CHECK-OUT</small><strong>{dateLabel(checkOut)}</strong></div><div><small>STAY</small><strong>{nights} {nights === 1 ? "night" : "nights"} · {guests} {guests === 1 ? "guest" : "guests"}</strong></div></div><div className="checkout-room-summary"><small>SELECTED ROOM</small><b>{room.name || "Selected room"}</b><span>{room.description || "Your selected room is ready for booking."}</span><div>{(room.facilities || []).slice(0, 5).map((facility) => <small key={facility}><CheckCircle2/>{facility}</small>)}</div></div></section>
      <section><div className="checkout-step"><span><h2>Important information</h2><p>Please review the property policies before confirming.</p></span></div><div className="checkout-policy-list">{Object.entries(property.policies || {}).filter(([, value]) => value !== "" && value !== undefined).slice(0, 8).map(([key, value]) => <div key={key}><CheckCircle2/><span><b>{key.replace(/([A-Z])/g, " $1")}</b> · {typeof value === "boolean" ? value ? "Allowed" : "Not allowed" : String(value)}</span></div>)}{!Object.keys(property.policies || {}).length && <p>Contact the property for specific house rules and cancellation terms.</p>}</div></section>
      <section><div className="checkout-step"><span><h2>Guest details</h2><p>We’ll save your booking under your account.</p></span></div><div className="checkout-guest-type"><label><input type="radio" name="guestType" defaultChecked/> Booking for myself</label><label><input type="radio" name="guestType"/> Booking for someone else</label></div><div className="checkout-fields"><label>First name<input name="firstName" required minLength={1} placeholder="First name" autoComplete="given-name"/></label><label>Last name<input name="lastName" required minLength={1} placeholder="Last name" autoComplete="family-name"/></label><label>Email address<input name="guestEmail" type="email" required placeholder="you@example.com" autoComplete="email"/></label><label>Mobile number<input name="guestPhone" required minLength={8} placeholder="+91 98765 43210" autoComplete="tel"/></label><label>Rooms<input name="rooms" type="number" min="1" max="20" defaultValue="1" required/></label><label>Adults<input name="adults" type="number" min="1" max="50" defaultValue={guests} required/></label><label>Children<input name="children" type="number" min="0" max="30" defaultValue="0" required/></label></div></section>
      <section className="checkout-payment-choice"><div className="checkout-step"><span><h2>Choose how to pay</h2><p>Both options use the live room rate. No payment is collected for pay at hotel.</p></span></div><div className="checkout-payment-option"><CreditCard/><div><strong>Pay online</strong><p>Open the active secure payment gateway.</p></div><ShieldCheck/></div><div className="checkout-payment-option"><CalendarDays/><div><strong>Pay at hotel</strong><p>Temporary booking option while online payments are unavailable. Reserve now and pay the property at check-in.</p></div></div>{error && <p className="checkout-error" role="alert">{error}</p>}<div className="checkout-payment-buttons"><button type="submit" value="online" disabled={busy} className="checkout-pay">{busy ? <LoaderCircle className="spin"/> : <LockKeyhole/>} Pay online</button><button type="submit" value="hotel" disabled={busy} className="checkout-pay-hotel">{busy ? "Confirming…" : "Book now · Pay at hotel"}</button></div><p className="checkout-terms">By booking, you agree to the property’s listed policies. The final charge is calculated from live rates by the booking service.</p></section>
    </form><aside><div className="checkout-price-title"><h2>Price summary</h2><span>{room.name || "Room"}</span></div><dl><div><dt><CalendarDays/> Check-in</dt><dd>{dateLabel(checkIn)}</dd></div><div><dt><CalendarDays/> Check-out</dt><dd>{dateLabel(checkOut)}</dd></div><div><dt><Users/> Guests</dt><dd>{guests}</dd></div><div><dt>Nights</dt><dd>{nights}</dd></div></dl><div className="checkout-estimate"><span>Room rate · ₹{rate.toLocaleString("en-IN")} × {nights} {nights === 1 ? "night" : "nights"}</span><strong>₹{estimate.toLocaleString("en-IN")}</strong><small>Estimated room charge. The booking service calculates any taxes and extra-guest charges before confirmation.</small></div><div className="checkout-trust"><ShieldCheck/> Pay at hotel does not charge your card or credit the owner wallet.</div></aside></div>
  </div></main>;
}
