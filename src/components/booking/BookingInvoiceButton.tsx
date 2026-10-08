"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { CUSTOMER_TOKEN } from "@/components/customer/CustomerAuth";
import { publicApiBase } from "@/lib/api-client";

export function BookingInvoiceButton({ bookingId, bookingNumber, token }: { bookingId: string; bookingNumber: string; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");
    try {
      const accessToken = token || localStorage.getItem(CUSTOMER_TOKEN) || "";
      if (!accessToken) throw new Error("Please log in to download your booking invoice.");
      const response = await fetch(`${publicApiBase}/api/v1/customer/bookings/${encodeURIComponent(bookingId)}/invoice`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "The booking invoice could not be downloaded.");
      }
      const file = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = file;
      link.download = `booking-${bookingNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(file), 1000);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <span className="booking-invoice-action"><button type="button" onClick={() => void download()} disabled={busy}><Download size={15}/>{busy ? "Preparing…" : "Download invoice"}</button>{error && <small role="alert">{error}</small>}</span>;
}
