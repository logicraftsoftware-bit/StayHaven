"use client";

import { useEffect, useState } from "react";
import { OwnerDashboard } from "./OwnerDashboard";
import { OwnerTeamDashboard } from "./OwnerTeamDashboard";
import { OWNER_ROLE_KEY } from "./OwnerAuth";

export function OwnerEntry() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() =>
      setRole(localStorage.getItem(OWNER_ROLE_KEY) || "HOTEL_OWNER"),
    );
  }, []);
  if (!role) return null;
  return role === "TEAM_MEMBER" ? <OwnerTeamDashboard /> : <OwnerDashboard />;
}
