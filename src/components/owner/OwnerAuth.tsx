"use client";

import { Building2, KeyRound, LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";

export const OWNER_TOKEN_KEY = "stayhaven-owner-token";
type Session = {
  accessToken: string;
  owner: { id: string; name: string; email: string; role: string };
};
type Response = { success: boolean; message: string; data: Session };

export function OwnerAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (localStorage.getItem(OWNER_TOKEN_KEY)) router.replace("/owner");
  }, [router]);
  useEffect(() => {
    const selectRequestedMode = () => {
      if (window.location.hash === "#create-account") setMode("register");
    };
    selectRequestedMode();
    window.addEventListener("hashchange", selectRequestedMode);
    return () => window.removeEventListener("hashchange", selectRequestedMode);
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      const body =
        mode === "register"
          ? { name, businessName, email, phone, password }
          : { email, password };
      const response = await apiRequest<Response>(
        `/api/v1/owner/auth/${mode}`,
        "",
        { method: "POST", body: JSON.stringify(body) },
      );
      localStorage.setItem(OWNER_TOKEN_KEY, response.data.accessToken);
      router.push("/owner");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="create-account"
      className="owner-auth-card scroll-mt-6 rounded-3xl border bg-white p-7 shadow-xl md:p-9"
    >
      <div className="flex items-center gap-3">
        <span className="owner-auth-icon grid size-12 place-items-center rounded-xl bg-charcoal text-white">
          <Building2 />
        </span>
        <div>
          <p className="owner-auth-subtitle text-xs font-bold uppercase tracking-wider text-maroon">
            Global hotel owner account
          </p>
          <h2 className="font-display text-2xl font-bold">
            {mode === "login" ? "Owner login" : "Create owner account"}
          </h2>
        </div>
      </div>
      {notice && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-maroon"
        >
          {notice}
        </p>
      )}
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "register" && (
          <>
            <label className="owner-label">
              Owner name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="owner-label">
              Business name
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
          </>
        )}
        <label className="owner-label">
          Business email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@example.com"
          />
        </label>
        {mode === "register" && (
          <label className="owner-label">
            Mobile number
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        )}
        <label className="owner-label">
          Password
          <input
            required
            minLength={mode === "register" ? 8 : 1}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button
          disabled={loading}
          className="btn-primary w-full justify-center"
        >
          {mode === "login" ? (
            <LogIn className="size-4" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {loading
            ? "Please wait…"
            : mode === "login"
              ? "Login to Owner Account"
              : "Create Global Owner Account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setNotice("");
          }}
          className="owner-auth-switch w-full text-sm font-bold text-maroon"
        >
          {mode === "login"
            ? "Create an owner account"
            : "Already registered? Login"}
        </button>
      </form>
      <p className="owner-auth-note mt-6 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-maroon" />
        One account works across every StayHaven marketplace and the future
        owner app.
      </p>
    </section>
  );
}
