import type { Metadata } from "next";
import { Shell } from "@/components/layout/Shell";
import { CustomerAccount } from "@/components/customer/CustomerAccount";
export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };
export default function AccountPage() { return <Shell><CustomerAccount/></Shell>; }
