"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Users } from "lucide-react";
import type { PublicRoom } from "@/types/public-property";
import { publicApiBase } from "@/lib/api-client";

type Availability = {
  status: "CONFIGURED" | "NOT_CONFIGURED";
  message?: string;
  nights?: number;
  rooms: Array<{ roomId: string; status: "AVAILABLE" | "UNAVAILABLE" | "NOT_CONFIGURED"; availableInventory: number; totalRate: number | null }>;
};
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const nextDate = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return localDate(date); };

export function AvailabilityPicker({ slug, rooms }: { slug: string; rooms: PublicRoom[] }) {
  const tomorrow = useMemo(() => nextDate(1), []);
  const [checkIn, setCheckIn] = useState(tomorrow);
  const [checkOut, setCheckOut] = useState(() => nextDate(2));
  const [guests, setGuests] = useState(2);
  const [result, setResult] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function check() {
    setError(""); setResult(null);
    if (!checkIn || !checkOut || checkOut <= checkIn) { setError("Check-out must be after check-in."); return; }
    setBusy(true);
    try {
      const response = await fetch(`${publicApiBase}/api/v1/properties/${encodeURIComponent(slug)}/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message.join(", ") : body.message || "Availability could not be checked.");
      setResult(body.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Availability could not be checked."); }
    finally { setBusy(false); }
  }

  return <div className="availability-panel"><div className="availability-title"><div><p>PLAN YOUR STAY</p><h2>Check availability</h2></div><CalendarDays/></div>
    <div className="availability-fields"><label>Check-in<input type="date" min={tomorrow} value={checkIn} onChange={(event) => { setCheckIn(event.target.value); setResult(null); }}/></label><label>Check-out<input type="date" min={checkIn || tomorrow} value={checkOut} onChange={(event) => { setCheckOut(event.target.value); setResult(null); }}/></label><label><span><Users/> Guests</span><input type="number" min="1" max="30" value={guests} onChange={(event) => { setGuests(Number(event.target.value)); setResult(null); }}/></label></div>
    <button onClick={() => void check()} disabled={busy}>{busy ? "Checking…" : "Check rooms"}</button>
    {error && <p className="availability-error" role="alert">{error}</p>}
    {result?.status === "NOT_CONFIGURED" && <div className="availability-note"><CalendarDays/><div><strong>Availability needs an update</strong><p>{result.message || "Room count or rate is missing."} Please contact the property for these dates.</p></div></div>}
    {result?.status === "CONFIGURED" && <div className="availability-results"><p className="availability-live-label"><CheckCircle2/> Live availability · {result.nights} {result.nights === 1 ? "night" : "nights"}</p>{rooms.map((room, index) => { const roomId = String(room.id || room._id || index); const item = result.rooms.find((entry) => entry.roomId === roomId); return <div key={roomId}><span><CheckCircle2/>{room.name || `Room ${index + 1}`}</span><b>{item?.status === "AVAILABLE" ? `${item.availableInventory} left · ₹${item.totalRate?.toLocaleString("en-IN")} total` : item?.status === "UNAVAILABLE" ? "Sold out" : "Ask property"}</b>{item?.status === "AVAILABLE" && <Link href={`/booking/${encodeURIComponent(slug)}?roomId=${encodeURIComponent(roomId)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`}>Reserve</Link>}</div>; })}</div>}
  </div>;
}
