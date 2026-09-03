import type { Metadata } from "next";
import { CustomerAuth } from "@/components/customer/CustomerAuth";
export const metadata: Metadata = { title: "Customer login", description: "Sign in or create your customer account." };
export default function LoginPage() { return <CustomerAuth/>; }
