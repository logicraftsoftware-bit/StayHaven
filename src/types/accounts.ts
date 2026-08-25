export type AccountType = "customer" | "hotel_owner";
export type PropertyStatus = "pending" | "approved" | "rejected" | "changes_required" | "suspended";

export const authEndpoints = {
  customer: { login: "/api/customer/login", register: "/api/customer/register" },
  hotel_owner: { login: "/api/owner/login", register: "/api/owner/register" },
} as const;

export const publicPropertyStatuses: PropertyStatus[] = ["approved"];
