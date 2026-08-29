"use client";
import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { hotels } from "@/data/hotels";
import { HotelCard } from "@/components/hotel/HotelCard";
import { useSite } from "@/components/site/SiteProvider";

export function Results({
  destination,
  type,
}: {
  destination?: string;
  type?: string;
}) {
  const site = useSite();
  const [max, setMax] = useState(20000);
  const city = site.city || site.name;
  const list = useMemo(
    () =>
      hotels.filter(
        (hotel) =>
          hotel.pricePerNight <= max &&
          (!destination ||
            hotel.city.toLowerCase() === destination.toLowerCase()) &&
          (!type ||
            type === "all" ||
            hotel.propertyType.toLowerCase() === type.toLowerCase()),
      ),
    [destination, type, max],
  );
  return (
    <div className="container py-8">
      <div className="mb-6 rounded-2xl bg-navy p-6 text-white">
        <p className="text-sm text-red-100">{site.name} search</p>
        <h1 className="font-display text-3xl font-bold">
          Stays {destination ? `in ${destination}` : `around ${city}`}
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          24 Aug – 27 Aug · 2 Adults · 1 Room
        </p>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto md:hidden">
        {["Sort", "Price", "Rating 4.0+", "Free cancellation", "Pool"].map(
          (item) => (
            <button className="filter-chip" key={item}>
              {item}
            </button>
          ),
        )}
      </div>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden rounded-2xl border bg-white p-5 lg:block">
          <h2 className="flex items-center gap-2 font-bold">
            <SlidersHorizontal className="size-5" />
            Filters
          </h2>
          <label className="mt-7 block text-sm font-bold">
            Maximum price: ₹{max.toLocaleString("en-IN")}
          </label>
          <input
            className="mt-3 w-full accent-blue"
            type="range"
            min="2500"
            max="20000"
            step="500"
            value={max}
            onChange={(event) => setMax(+event.target.value)}
          />
          {[
            "Free cancellation",
            "Breakfast included",
            "Swimming pool",
            "Parking",
            "Free Wi-Fi",
          ].map((item) => (
            <label className="mt-4 flex items-center gap-3 text-sm" key={item}>
              <input type="checkbox" className="size-4 accent-blue" />
              {item}
            </label>
          ))}
        </aside>
        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {list.length} properties found
              </h2>
              <p className="text-xs text-slate-500">
                Demo listings — details and availability are illustrative
              </p>
            </div>
            <select className="rounded-xl border p-3 text-sm">
              <option>Recommended</option>
              <option>Price: low to high</option>
              <option>Top rated</option>
            </select>
          </div>
          {list.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <h3 className="font-bold">No exact stays found</h3>
              <p className="text-slate-500">
                Try {city} or broaden your property type.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
