"use client";

import {
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  IndianRupee,
  LoaderCircle,
  Minus,
  PackageOpen,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";

type Room = {
  id?: string;
  _id?: string;
  name?: string;
  baseRate?: number;
  totalRooms?: number;
  baseAdults?: number;
  additionalAdultPrice?: number;
  additionalChildPrice?: number;
};
type InventoryRow = {
  roomId: string;
  date: string;
  available: number;
  blocked: number;
  rate: number;
  extraAdultRate: number;
  extraChildRate: number;
  minimumStay?: number;
  maximumStay?: number;
};
type Api<T> = { success: boolean; message?: string; data: T };

const DAY = 86400000;
const iso = (date: Date) => date.toISOString().slice(0, 10);
const utcDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const today = () => {
  const value = new Date();
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
};
const addDays = (date: Date, amount: number) => new Date(date.valueOf() + amount * DAY);

export function OwnerRatesInventory({
  propertyId,
  rooms,
  token,
}: {
  propertyId: string;
  rooms: Room[];
  token: string;
}) {
  const [start, setStart] = useState(today);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<{ roomId?: string; date?: string } | null>(null);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const roomEntries = useMemo(
    () => rooms.map((room, index) => ({ ...room, roomId: String(room.id || room._id || index) })),
    [rooms],
  );
  const byCell = useMemo(
    () => new Map(rows.map((row) => [`${row.roomId}:${row.date.slice(0, 10)}`, row])),
    [rows],
  );

  const load = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setMessage("");
    try {
      const result = await apiRequest<Api<{ rows: InventoryRow[] }>>(
        `/api/v1/owner/properties/${propertyId}/inventory?from=${iso(start)}&to=${iso(addDays(start, 6))}`,
        token,
      );
      setRows(result.data.rows);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [propertyId, start, token]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const valueFor = (room: Room & { roomId: string }, date: Date): InventoryRow => {
    const stored = byCell.get(`${room.roomId}:${iso(date)}`);
    return {
      roomId: room.roomId,
      date: iso(date),
      available: stored?.available ?? Number(room.totalRooms || 1),
      blocked: stored?.blocked ?? 0,
      rate: stored?.rate ?? Number(room.baseRate || 0),
      extraAdultRate: stored?.extraAdultRate ?? Number(room.additionalAdultPrice || 0),
      extraChildRate: stored?.extraChildRate ?? Number(room.additionalChildPrice || 0),
      minimumStay: stored?.minimumStay,
      maximumStay: stored?.maximumStay,
    };
  };
  const toggle = (roomId: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
    return next;
  });
  const toggleAll = () => setExpanded(
    expanded.size === roomEntries.length ? new Set() : new Set(roomEntries.map((room) => room.roomId)),
  );
  const saveCell = async (
    room: Room & { roomId: string },
    date: Date,
    patch: Partial<InventoryRow>,
  ) => {
    const current = valueFor(room, date);
    const next: InventoryRow = {
      ...current,
      extraAdultRate: Number(current.extraAdultRate || 0),
      extraChildRate: Number(current.extraChildRate || 0),
      ...patch,
    };
    const cellKey = `${room.roomId}:${iso(date)}`;
    setSavingCells((values) => new Set(values).add(cellKey));
    setRows((values) => [
      ...values.filter((row) => `${row.roomId}:${row.date.slice(0, 10)}` !== cellKey),
      next,
    ]);
    try {
      await apiRequest<Api<{ updated: number }>>(`/api/v1/owner/properties/${propertyId}/inventory`, token, {
        method: "PATCH",
        body: JSON.stringify({ entries: [next] }),
      });
      setMessage("Calendar cell updated successfully.");
    } catch (reason) {
      setMessage((reason as Error).message);
      await load();
    } finally {
      setSavingCells((values) => {
        const nextValues = new Set(values);
        nextValues.delete(cellKey);
        return nextValues;
      });
    }
  };

  return (
    <div className="inventory-workspace">
      <section className="inventory-toolbar">
        <div>
          <span>ROOM CONTROL CENTER</span>
          <h2>Manage inventory, rates &amp; restrictions</h2>
          <p>Rates in INR · Changes update public availability immediately.</p>
        </div>
        <div className="inventory-toolbar-actions">
          <button onClick={() => setEditor({})}><PackageOpen /> Bulk update</button>
          <div>
            <button onClick={() => setStart((value) => addDays(value, -7))} aria-label="Previous week"><ChevronLeft /></button>
            <button onClick={() => setStart(today())}><CalendarDays /> Today</button>
            <button onClick={() => setStart((value) => addDays(value, 7))} aria-label="Next week"><ChevronRight /></button>
          </div>
        </div>
      </section>

      {message && <div className={`inventory-message ${message.includes("updated") ? "success" : ""}`}>{message}</div>}

      <section className="inventory-calendar-card">
        <div className="inventory-calendar-scroll">
          <div className="inventory-calendar-head">
            <div><BedDouble /><strong>Rooms &amp; rates</strong></div>
            {dates.map((date, index) => (
              <button key={iso(date)} className={iso(date) === iso(today()) ? "today" : ""} onClick={() => setEditor({ date: iso(date) })}>
                <span>{date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }).toUpperCase()}</span>
                <strong>{date.getUTCDate()}</strong>
                <small>{date.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }).toUpperCase()}</small>
                {index === 0 && <em>START</em>}
              </button>
            ))}
          </div>

          <button className="inventory-expand-all" onClick={toggleAll}>
            <span>{expanded.size === roomEntries.length ? <Minus /> : <Plus />}</span>
            {expanded.size === roomEntries.length ? "Collapse all rooms" : "Expand all rooms & rate plans"}
          </button>

          {loading ? (
            <div className="inventory-loading"><LoaderCircle /> Loading rates and inventory…</div>
          ) : roomEntries.length ? (
            <div className="inventory-room-list">
              {roomEntries.map((room) => {
                const open = expanded.has(room.roomId);
                return (
                  <article className={`inventory-room ${open ? "expanded" : ""}`} key={room.roomId}>
                    <div className="inventory-room-summary">
                      <button onClick={() => toggle(room.roomId)} aria-label={open ? "Collapse room" : "Expand room"}>{open ? <Minus /> : <Plus />}</button>
                      <div><strong>{room.name || "Room"}</strong><small>{room.baseAdults || 2} adults · {room.totalRooms || 1} rooms</small></div>
                      <button onClick={() => setEditor({ roomId: room.roomId })}><Pencil /> Update</button>
                    </div>
                    {dates.map((date) => {
                      const cell = valueFor(room, date);
                      return (
                        <label className={`inventory-availability-cell editable ${savingCells.has(`${room.roomId}:${iso(date)}`) ? "saving" : ""}`} key={iso(date)}>
                          <input
                            type="number"
                            min="0"
                            max="9999"
                            defaultValue={cell.available}
                            aria-label={`${room.name || "Room"} availability on ${iso(date)}`}
                            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                            onBlur={(event) => {
                              const value = Number(event.currentTarget.value);
                              if (Number.isFinite(value) && value >= 0 && value !== cell.available) void saveCell(room, date, { available: value });
                            }}
                          />
                          <small>{cell.blocked ? `${cell.blocked} blocked` : "Available"}</small>
                        </label>
                      );
                    })}
                    {open && (
                      <>
                        <div className="inventory-rate-label"><IndianRupee /><div><strong>Standard rate</strong><small>Per night</small></div></div>
                        {dates.map((date) => {
                          const cell = valueFor(room, date);
                          return <InlineRate key={`rate-${iso(date)}`} label="nightly rate" value={cell.rate} saving={savingCells.has(`${room.roomId}:${iso(date)}`)} onSave={(value) => saveCell(room, date, { rate: value })} />;
                        })}
                        <div className="inventory-rate-label supplemental"><Plus /><div><strong>Extra adult rate</strong><small>Per additional adult</small></div></div>
                        {dates.map((date) => {
                          const cell = valueFor(room, date);
                          return <InlineRate supplemental key={`adult-${iso(date)}`} label="extra adult rate" value={Number(cell.extraAdultRate || 0)} saving={savingCells.has(`${room.roomId}:${iso(date)}`)} onSave={(value) => saveCell(room, date, { extraAdultRate: value })} />;
                        })}
                        <div className="inventory-rate-label supplemental"><Plus /><div><strong>Extra child rate</strong><small>Per additional child</small></div></div>
                        {dates.map((date) => {
                          const cell = valueFor(room, date);
                          return <InlineRate supplemental key={`child-${iso(date)}`} label="extra child rate" value={Number(cell.extraChildRate || 0)} saving={savingCells.has(`${room.roomId}:${iso(date)}`)} onSave={(value) => saveCell(room, date, { extraChildRate: value })} />;
                        })}
                        <div className="inventory-restriction-label"><ChevronsUpDown /> Stay restrictions</div>
                        {dates.map((date) => {
                          const cell = valueFor(room, date);
                          return <div className={`inventory-restriction-cell editable ${savingCells.has(`${room.roomId}:${iso(date)}`) ? "saving" : ""}`} key={`stay-${iso(date)}`}><input type="number" min="1" max="365" defaultValue={cell.minimumStay || 1} aria-label="Minimum stay" onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} onBlur={(event) => { const value = Number(event.currentTarget.value); if (value >= 1 && value !== (cell.minimumStay || 1)) void saveCell(room, date, { minimumStay: value }); }} /><span>–</span><input type="number" min={cell.minimumStay || 1} max="365" defaultValue={cell.maximumStay || 30} aria-label="Maximum stay" onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} onBlur={(event) => { const value = Number(event.currentTarget.value); if (value >= (cell.minimumStay || 1) && value !== (cell.maximumStay || 30)) void saveCell(room, date, { maximumStay: value }); }} /><small>nights</small></div>;
                        })}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="inventory-loading">Add a room in Property Information before configuring inventory.</div>
          )}
        </div>
      </section>

      {editor && (
        <InventoryEditor
          initialRoomId={editor.roomId}
          initialDate={editor.date}
          dates={dates}
          rooms={roomEntries}
          valueFor={valueFor}
          onClose={() => setEditor(null)}
          onSave={async (entries) => {
            setMessage("");
            await apiRequest<Api<{ updated: number }>>(`/api/v1/owner/properties/${propertyId}/inventory`, token, {
              method: "PATCH",
              body: JSON.stringify({ entries }),
            });
            setEditor(null);
            setMessage(`${entries.length} rate and inventory ${entries.length === 1 ? "entry" : "entries"} updated successfully.`);
            await load();
          }}
        />
      )}
    </div>
  );
}

function InlineRate({
  value,
  label,
  supplemental = false,
  saving,
  onSave,
}: {
  value: number;
  label: string;
  supplemental?: boolean;
  saving: boolean;
  onSave: (value: number) => Promise<void>;
}) {
  return (
    <label className={`inventory-rate-cell editable ${supplemental ? "supplemental" : ""} ${saving ? "saving" : ""}`}>
      <span>₹</span>
      <input
        type="number"
        min="0"
        defaultValue={value}
        aria-label={label}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        onBlur={(event) => {
          const next = Number(event.currentTarget.value);
          if (Number.isFinite(next) && next >= 0 && next !== value) void onSave(next);
        }}
      />
    </label>
  );
}

function InventoryEditor({
  initialRoomId,
  initialDate,
  dates,
  rooms,
  valueFor,
  onClose,
  onSave,
}: {
  initialRoomId?: string;
  initialDate?: string;
  dates: Date[];
  rooms: Array<Room & { roomId: string }>;
  valueFor: (room: Room & { roomId: string }, date: Date) => InventoryRow;
  onClose: () => void;
  onSave: (entries: InventoryRow[]) => Promise<void>;
}) {
  const [roomId, setRoomId] = useState(initialRoomId || "all");
  const [from, setFrom] = useState(initialDate || iso(dates[0]));
  const [to, setTo] = useState(initialDate || iso(dates[6]));
  const seedRoom = rooms.find((room) => room.roomId === initialRoomId) || rooms[0];
  const seed = seedRoom ? valueFor(seedRoom, utcDate(initialDate || iso(dates[0]))) : undefined;
  const [available, setAvailable] = useState(seed?.available ?? Number(seedRoom?.totalRooms || 1));
  const [blocked, setBlocked] = useState(seed?.blocked ?? 0);
  const [rate, setRate] = useState(seed?.rate ?? Number(seedRoom?.baseRate || 0));
  const [extraAdultRate, setExtraAdultRate] = useState(seed?.extraAdultRate ?? Number(seedRoom?.additionalAdultPrice || 0));
  const [extraChildRate, setExtraChildRate] = useState(seed?.extraChildRate ?? Number(seedRoom?.additionalChildPrice || 0));
  const [minimumStay, setMinimumStay] = useState(seed?.minimumStay || 1);
  const [maximumStay, setMaximumStay] = useState(seed?.maximumStay || 30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    const fromDate = utcDate(from);
    const toDate = utcDate(to);
    if (!from || !to || toDate < fromDate) return setError("Select a valid stay-date range.");
    if (maximumStay < minimumStay) return setError("Maximum stay must be equal to or greater than minimum stay.");
    const selectedRooms = roomId === "all" ? rooms : rooms.filter((room) => room.roomId === roomId);
    const selectedDates: Date[] = [];
    for (let date = fromDate; date <= toDate; date = addDays(date, 1)) selectedDates.push(date);
    if (selectedDates.length > 31) return setError("Bulk updates can cover up to 31 days at a time.");
    const entries = selectedRooms.flatMap((room) => selectedDates.map((date) => ({
      roomId: room.roomId,
      date: iso(date),
      available,
      blocked,
      rate,
      extraAdultRate,
      extraChildRate,
      minimumStay,
      maximumStay,
    })));
    setSaving(true);
    try { await onSave(entries); } catch (reason) { setError((reason as Error).message); setSaving(false); }
  };

  return (
    <div className="inventory-modal-backdrop" onMouseDown={onClose}>
      <section className="inventory-modal" role="dialog" aria-modal="true" aria-label="Manage rates and inventory" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><span>BULK RATE EDITOR</span><h2>Manage rates &amp; inventory</h2><p>Apply one update to a room, a date, or your selected range.</p></div>
          <button onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <div className="inventory-modal-body">
          {error && <p className="inventory-modal-error">{error}</p>}
          <section>
            <h3><span>1</span> Choose rooms and stay dates</h3>
            <div className="inventory-editor-grid three">
              <label>Room type<select value={roomId} onChange={(event) => setRoomId(event.target.value)}><option value="all">All room types</option>{rooms.map((room) => <option key={room.roomId} value={room.roomId}>{room.name || "Room"}</option>)}</select></label>
              <label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
              <label>To<input type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} /></label>
            </div>
          </section>
          <section>
            <h3><span>2</span> Set availability and nightly rate</h3>
            <div className="inventory-editor-grid four">
              <label>Rooms available<input type="number" min="0" max="9999" value={available} onChange={(event) => setAvailable(Number(event.target.value))} /></label>
              <label>Rooms blocked<input type="number" min="0" max="9999" value={blocked} onChange={(event) => setBlocked(Number(event.target.value))} /></label>
              <label>Nightly rate (₹)<input type="number" min="0" value={rate} onChange={(event) => setRate(Number(event.target.value))} /></label>
              <div className="inventory-sellable"><small>Sellable rooms</small><strong>{Math.max(0, available - blocked)}</strong></div>
            </div>
            <div className="inventory-editor-grid two inventory-extra-rates">
              <label>Extra adult rate (₹)<input type="number" min="0" value={extraAdultRate} onChange={(event) => setExtraAdultRate(Number(event.target.value))} /><small>Charged for each adult above the room&apos;s base occupancy.</small></label>
              <label>Extra child rate (₹)<input type="number" min="0" value={extraChildRate} onChange={(event) => setExtraChildRate(Number(event.target.value))} /><small>Charged for each additional child.</small></label>
            </div>
          </section>
          <section>
            <h3><span>3</span> Stay restrictions</h3>
            <div className="inventory-editor-grid two">
              <label>Minimum stay<input type="number" min="1" max="365" value={minimumStay} onChange={(event) => setMinimumStay(Number(event.target.value))} /></label>
              <label>Maximum stay<input type="number" min={minimumStay} max="365" value={maximumStay} onChange={(event) => setMaximumStay(Number(event.target.value))} /></label>
            </div>
          </section>
        </div>
        <footer><button onClick={onClose}>Cancel</button><button className="save" onClick={() => void save()} disabled={saving}>{saving ? <LoaderCircle /> : <Save />}{saving ? "Saving…" : "Save changes"}</button></footer>
      </section>
    </div>
  );
}
