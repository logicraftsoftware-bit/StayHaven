import Link from "next/link";
import { Brand } from "@/components/layout/Brand";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";
import { PageRenderer } from "@/components/page-builder/PageRenderer";
import { getPublishedPage } from "@/lib/page-config";

export default async function OwnerPage() {
  const page = await getPublishedPage("owner-dashboard");
  return (
    <>
      <PageRenderer page={page} />
      <main className="min-h-screen bg-[#faf8f7]">
        <header className="border-b bg-white">
          <div className="container flex h-18 items-center justify-between">
            <Brand />
            <Link href="/" className="text-sm font-bold text-maroon">
              View public website
            </Link>
          </div>
        </header>
        <OwnerDashboard />
      </main>
    </>
  );
}
