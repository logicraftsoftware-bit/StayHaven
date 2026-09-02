import { ReactNode } from "react";
import { OwnerPortalLayout } from "@/components/owner/OwnerPortalLayout";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <OwnerPortalLayout>{children}</OwnerPortalLayout>;
}
