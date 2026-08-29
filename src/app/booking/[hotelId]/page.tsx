import Image from "next/image";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { hotels } from "@/data/hotels";
export default async function Booking({
  params,
  searchParams,
}: {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { hotelId } = await params;
  const { confirmed } = await searchParams;
  const h = hotels.find((x) => x.id === hotelId) || hotels[0];
  const nights = 3,
    total = h.pricePerNight * nights + h.taxes;
  if (confirmed)
    return (
      <Shell>
        <div className="container max-w-2xl py-20 text-center">
          <div className="mx-auto grid size-18 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
            ✓
          </div>
          <p className="eyebrow mt-6">REQUEST RECEIVED</p>
          <h1 className="font-display text-4xl font-bold">
            Your prototype booking is confirmed
          </h1>
          <p className="mt-4 text-slate-600">
            This demonstration did not reserve a real room or collect payment.
            Your selected stay was {h.name}.
          </p>
          <Link href="/" className="btn-primary mt-7">
            Back to StayHaven
          </Link>
        </div>
      </Shell>
    );
  return (
    <Shell>
      <div className="container max-w-5xl py-10">
        <p className="eyebrow">SECURE CHECKOUT · FRONTEND PROTOTYPE</p>
        <h1 className="font-display text-3xl font-bold">
          Complete your booking
        </h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <form className="space-y-6">
            <section className="booking-section">
              <h2>1. Guest details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  First name
                  <input required placeholder="First name" />
                </label>
                <label>
                  Last name
                  <input required placeholder="Last name" />
                </label>
                <label>
                  Email
                  <input type="email" required placeholder="you@example.com" />
                </label>
                <label>
                  Mobile number
                  <input type="tel" required placeholder="+91 98765 43210" />
                </label>
              </div>
            </section>
            <section className="booking-section">
              <h2>2. Payment</h2>
              <div className="rounded-xl border border-dashed bg-slate-50 p-6 text-center text-slate-500">
                Payment gateway placeholder
                <br />
                <small>No payment will be collected in this prototype.</small>
              </div>
              <Link
                className="btn-primary mt-5 w-full justify-center"
                href={`/booking/${h.id}?confirmed=true`}
              >
                Continue to Payment
              </Link>
            </section>
          </form>
          <aside className="h-fit rounded-2xl border bg-white p-5 shadow">
            <div className="flex gap-4">
              <div className="relative size-20 overflow-hidden rounded-xl">
                <Image
                  src={h.images[0]}
                  alt={h.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <b>{h.name}</b>
                <p className="text-sm text-slate-500">Deluxe King Room</p>
              </div>
            </div>
            <div className="my-5 border-y py-4 text-sm">
              <p className="flex justify-between">
                <span>24–27 Aug · {nights} nights</span>
                <span>2 guests</span>
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between">
                <span>
                  ₹{h.pricePerNight.toLocaleString("en-IN")} × {nights}
                </span>
                <span>
                  ₹{(h.pricePerNight * nights).toLocaleString("en-IN")}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Taxes & fees</span>
                <span>₹{h.taxes.toLocaleString("en-IN")}</span>
              </p>
              <p className="flex justify-between border-t pt-3 text-lg font-black">
                <span>Total</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </p>
            </div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
