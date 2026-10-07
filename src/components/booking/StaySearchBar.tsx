"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Stay = { checkIn: string; checkOut: string; rooms: number; adults: number; children: number };

export function StaySearchBar({ propertyName, action, initial, roomId, compact = false }: { propertyName?: string; action: string; initial: Stay; roomId?: string; compact?: boolean }) {
  const router = useRouter();
  const [stay, setStay] = useState(initial);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [error, setError] = useState("");
  const dateParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date());
  const today = `${dateParts.find((part) => part.type === "year")?.value}-${dateParts.find((part) => part.type === "month")?.value}-${dateParts.find((part) => part.type === "day")?.value}`;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stay.checkIn < today || stay.checkOut <= stay.checkIn) { setError("Choose a future check-in and a check-out after it."); return; }
    if (stay.adults + stay.children < stay.rooms) { setError("Select at least one guest for each room."); return; }
    setError("");
    const query = new URLSearchParams({ checkIn: stay.checkIn, checkOut: stay.checkOut, rooms: String(stay.rooms), adults: String(stay.adults), children: String(stay.children), guests: String(stay.adults + stay.children) });
    if (roomId) query.set("roomId", roomId);
    router.push(`${action}?${query}`);
    setGuestsOpen(false);
  }
  function adjust(key: "rooms" | "adults" | "children", amount: number) {
    setStay((value) => ({ ...value, [key]: Math.max(key === "children" ? 0 : 1, Math.min(key === "rooms" ? 20 : 30, value[key] + amount)) }));
  }
  return <form className={`stay-search-bar${compact ? " compact" : ""}`} onSubmit={submit}>
    {propertyName && <div className="stay-search-property"><small>PROPERTY</small><strong>{propertyName}</strong></div>}
    <label><small>CHECK-IN</small><input type="date" min={today} value={stay.checkIn} onChange={(event) => setStay((value) => ({ ...value, checkIn: event.target.value, checkOut: event.target.value >= value.checkOut ? "" : value.checkOut }))} required /></label>
    <label><small>CHECK-OUT</small><input type="date" min={stay.checkIn || today} value={stay.checkOut} onChange={(event) => setStay((value) => ({ ...value, checkOut: event.target.value }))} required /></label>
    <div className="stay-search-guests"><small>ROOMS &amp; GUESTS</small><button type="button" aria-expanded={guestsOpen} onClick={() => setGuestsOpen((value) => !value)}>{stay.rooms} {stay.rooms === 1 ? "room" : "rooms"}, {stay.adults} {stay.adults === 1 ? "adult" : "adults"}{stay.children ? `, ${stay.children} children` : ""} ▾</button>
      {guestsOpen && <div className="stay-search-popover">{(["rooms", "adults", "children"] as const).map((key) => <div key={key}><span>{key.charAt(0).toUpperCase() + key.slice(1)}</span><button type="button" aria-label={`Remove ${key}`} onClick={() => adjust(key, -1)}>−</button><b>{stay[key]}</b><button type="button" aria-label={`Add ${key}`} onClick={() => adjust(key, 1)}>+</button></div>)}<button className="stay-search-apply" type="button" onClick={() => setGuestsOpen(false)}>Apply</button></div>}
    </div>
    <button className="stay-search-submit" type="submit">{compact ? "Update search" : "Search rooms"}</button>
    {error && <p className="stay-search-error" role="alert">{error}</p>}
  </form>;
}
