"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api-client";

type Order =
  | { gateway: "RAZORPAY"; razorpayOrderId: string; keyId: string; amount: number; currency: string; propertyName: string; customer: { name: string; email: string; contact: string } }
  | { gateway: "CASHFREE"; orderId: string; paymentSessionId: string; mode: "sandbox" | "production" };

function loadScript(id: string, src: string, ready: () => boolean) {
  return new Promise<void>((resolve, reject) => {
    if (ready()) return resolve();
    const current = document.getElementById(id) as HTMLScriptElement | null;
    if (current) { current.addEventListener("load", () => resolve(), { once: true }); current.addEventListener("error", () => reject(new Error("Payment window could not be loaded")), { once: true }); return; }
    const script = document.createElement("script"); script.id = id; script.src = src; script.onload = () => resolve(); script.onerror = () => reject(new Error("Payment window could not be loaded")); document.head.appendChild(script);
  });
}

export function BookingPayNowButton({ bookingId, token, onPaid }: { bookingId: string; token: string; onPaid: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true); setError("");
    try {
      const order = (await apiRequest<{ data: Order }>(`/api/v1/customer/bookings/${bookingId}/pay-now`, token, { method: "POST" })).data;
      if (order.gateway === "CASHFREE") {
        await loadScript("cashfree-checkout", "https://sdk.cashfree.com/js/v3/cashfree.js", () => Boolean(window.Cashfree));
        if (!window.Cashfree) throw new Error("Cashfree Checkout is unavailable");
        const result = await window.Cashfree({ mode: order.mode }).checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_modal" });
        if (result.error) throw new Error(result.error.message || "Payment was not completed");
        await apiRequest("/api/v1/customer/bookings/verify-cashfree", token, { method: "POST", body: JSON.stringify({ orderId: order.orderId }) });
        onPaid(); setBusy(false); return;
      }
      await loadScript("razorpay-checkout", "https://checkout.razorpay.com/v1/checkout.js", () => Boolean(window.Razorpay));
      if (!window.Razorpay) throw new Error("Razorpay Checkout is unavailable");
      const instance = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: "Guwahati Homestay", description: order.propertyName, order_id: order.razorpayOrderId, prefill: order.customer, theme: { color: "#af0d1d" }, modal: { ondismiss: () => setBusy(false) }, handler: async (response: Record<string, string>) => { try { await apiRequest("/api/v1/customer/bookings/verify", token, { method: "POST", body: JSON.stringify({ razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }) }); onPaid(); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } } });
      instance.on("payment.failed", (response) => { setError(response.error?.description || "Payment failed"); setBusy(false); });
      instance.open();
    } catch (reason) { setError((reason as Error).message); setBusy(false); }
  }
  return <span className="trip-pay-now"><button type="button" disabled={busy} onClick={() => void pay()}>{busy ? "Opening payment…" : "Pay now"}</button>{error && <small role="alert">{error}</small>}</span>;
}
