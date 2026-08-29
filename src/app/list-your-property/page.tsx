import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Brand } from "@/components/layout/Brand";
import { OwnerAuth } from "@/components/owner/OwnerAuth";
const steps = [
  "Owner login",
  "Add property",
  "Property details",
  "Rooms & pricing",
  "Documents",
  "Admin review",
];
export default function ListYourProperty() {
  return (
    <main className="min-h-screen bg-[#faf8f7]">
      <header className="border-b bg-white">
        <div className="container flex h-18 items-center justify-between">
          <Brand />
          <Link href="/" className="text-sm font-bold text-maroon">
            Back to website
          </Link>
        </div>
      </header>
      <div className="container grid gap-10 py-12 lg:grid-cols-[1.05fr_.95fr]">
        <section className="self-center">
          <p className="eyebrow">HOTEL OWNER PORTAL</p>
          <h1 className="font-display mt-3 text-4xl font-bold text-charcoal md:text-5xl">
            Manage properties across StayHaven
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Login with a separate hotel-owner account. New owners can create an
            account, then login to add and manage multiple properties.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {steps.map((x, i) => (
              <div
                className="flex items-center gap-3 rounded-xl border bg-white p-4"
                key={x}
              >
                <span className="grid size-8 place-items-center rounded-full bg-red-50 text-sm font-black text-maroon">
                  {i + 1}
                </span>
                <b className="text-sm">{x}</b>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-2xl border border-red-100 bg-red-50 p-5">
            <p className="flex items-center gap-2 font-bold text-maroon">
              <FileCheck2 />
              Approval required
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Each submitted property begins as <b>pending</b> and becomes
              public only after administrator approval.
            </p>
          </div>
        </section>
        <OwnerAuth />
      </div>
    </main>
  );
}
