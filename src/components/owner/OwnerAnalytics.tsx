"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";

export type Analytics = {
  asOf: string;
  timeZone: string;
  today: { roomNights: number; revenue: number; checkIns: number };
  last7Days: { roomNights: number; revenue: number; checkIns: number; averageSellingPrice: number | null };
  visits: number | null;
  conversionRate: number | null;
};

export function useOwnerAnalytics(propertyId: string, token: string, enabled: boolean) {
  const [result, setResult] = useState<{ propertyId: string; data: Analytics } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !propertyId || !token) return;
    let active = true;
    apiRequest<{ data: Analytics }>(`/api/v1/owner/payments/analytics?propertyId=${encodeURIComponent(propertyId)}`, token)
      .then((response) => { if (active) { setResult({ propertyId, data: response.data }); setError(""); } })
      .catch((reason) => { if (active) setError((reason as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, propertyId, token]);
  return { data: result?.propertyId === propertyId ? result.data : null, error, loading };
}

export const analyticsMoney = (paise: number | null | undefined) =>
  paise == null ? "—" : `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function OwnerAnalytics({ data, error, loading }: { data: Analytics | null; error: string; loading: boolean }) {
  if (loading && !data) return <div className="wizard-card"><h2>Loading report…</h2></div>;
  if (error && !data) return <div className="wizard-card"><h2>Report unavailable</h2><p>{error}</p></div>;
  if (!data) return null;
  return <div className="wizard-card owner-analytics-report">
    <span>BOOKING-BASED REPORT · INDIA TIME</span>
    <h2>Property performance</h2>
    <p>Paid, non-cancelled bookings only. Revenue is the owner amount after platform commission, recorded on the payment date.</p>
    <div className="owner-analytics-grid">
      <article><small>Room nights today</small><strong>{data.today.roomNights}</strong></article>
      <article><small>Revenue today</small><strong>{analyticsMoney(data.today.revenue)}</strong></article>
      <article><small>Check-ins today</small><strong>{data.today.checkIns}</strong></article>
      <article><small>Room nights · last 7 days</small><strong>{data.last7Days.roomNights}</strong></article>
      <article><small>Revenue · last 7 days</small><strong>{analyticsMoney(data.last7Days.revenue)}</strong></article>
      <article><small>Average room price · last 7 days</small><strong>{analyticsMoney(data.last7Days.averageSellingPrice)}</strong></article>
    </div>
    <p>Property visits and conversion are unavailable until visit tracking is implemented. No estimated values are shown.</p>
  </div>;
}
