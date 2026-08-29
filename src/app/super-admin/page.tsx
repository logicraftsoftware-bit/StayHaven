import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import "./super-admin.css";

export const metadata: Metadata = {
  title: "Super Admin",
  description: "StayHaven multi-site administration portal",
  robots: { index: false, follow: false },
};

export default function SuperAdminPage() {
  return <AdminApp />;
}
