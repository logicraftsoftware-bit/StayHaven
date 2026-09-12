"use client";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";

export const OWNER_TOKEN_KEY = "stayhaven-owner-token";
type Mode = "login" | "register" | "otp-login" | "forgot" | "verify" | "reset";
type Purpose = "register" | "login" | "forgot-password";
type Session = {
  accessToken: string;
  owner: { id: string; name: string; email: string };
};
type Api<T> = { success: boolean; message: string; data: T };

export function OwnerAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login"),
    [purpose, setPurpose] = useState<Purpose>("login");
  const [verificationToken, setVerificationToken] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false);
  const [name, setName] = useState(""),
    [businessName, setBusinessName] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [password, setPassword] = useState(""),
    [otp, setOtp] = useState("");
  useEffect(() => {
    if (localStorage.getItem(OWNER_TOKEN_KEY)) router.replace("/owner");
  }, [router]);
  useEffect(() => {
    const sync = () =>
      setMode(
        window.location.hash === "#create-account" ? "register" : "login",
      );
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const saveSession = (session: Session) => {
    localStorage.setItem(OWNER_TOKEN_KEY, session.accessToken);
    router.push("/owner");
  };
  const requestOtp = async (nextPurpose: Purpose) => {
    await apiRequest("/api/v1/owner/auth/otp/request", "", {
      method: "POST",
      body: JSON.stringify({ phone, purpose: nextPurpose }),
    });
    setPurpose(nextPurpose);
    setOtp("");
    setMode("verify");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      if (mode === "login") {
        const response = await apiRequest<Api<Session>>(
          "/api/v1/owner/auth/login",
          "",
          {
            method: "POST",
            body: JSON.stringify({ identifier: email, password }),
          },
        );
        saveSession(response.data);
      } else if (mode === "register") await requestOtp("register");
      else if (mode === "otp-login") await requestOtp("login");
      else if (mode === "forgot") await requestOtp("forgot-password");
      else if (mode === "verify") {
        const response = await apiRequest<
          Api<{
            mode: string;
            verificationToken?: string;
            accessToken?: string;
            owner?: Session["owner"];
          }>
        >("/api/v1/owner/auth/otp/verify", "", {
          method: "POST",
          body: JSON.stringify({ phone, purpose, otp }),
        });
        if (purpose === "login" && response.data.accessToken)
          saveSession(response.data as Session);
        else if (purpose === "register") {
          const complete = await apiRequest<Api<Session>>(
            "/api/v1/owner/auth/register/complete",
            "",
            {
              method: "POST",
              body: JSON.stringify({
                name,
                businessName,
                email,
                phone,
                password,
                verificationToken: response.data.verificationToken,
              }),
            },
          );
          saveSession(complete.data);
        } else {
          setVerificationToken(response.data.verificationToken || "");
          setPassword("");
          setMode("reset");
        }
      } else if (mode === "reset") {
        await apiRequest("/api/v1/owner/auth/password/reset", "", {
          method: "POST",
          body: JSON.stringify({
            resetToken: verificationToken,
            newPassword: password,
          }),
        });
        setPassword("");
        setMode("login");
        setNotice("Password updated. You can now log in.");
      }
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const copy = {
    login: ["Welcome back", "Use your email or mobile number and password."],
    register: [
      "Create owner account",
      "Create one secure account for every property.",
    ],
    "otp-login": ["Login with OTP", "We will send a secure code on WhatsApp."],
    forgot: [
      "Forgot password",
      "Verify your registered mobile number to reset access.",
    ],
    verify: [
      "Verify WhatsApp code",
      `Enter the six-digit code sent to ${phone}.`,
    ],
    reset: [
      "Create new password",
      "Choose a strong password for your owner account.",
    ],
  }[mode];
  const goLogin = () => {
    setMode("login");
    setNotice("");
    setVerificationToken("");
  };
  return (
    <section id="create-account" className="owner-auth-card">
      <header className="owner-auth-heading">
        <span className="owner-auth-icon">
          <Building2 />
        </span>
        <div>
          <p>STAYHAVEN PARTNER ACCOUNT</p>
          <h2>{copy[0]}</h2>
          <small>{copy[1]}</small>
        </div>
      </header>
      {notice && (
        <p role="alert" className="owner-auth-alert">
          {notice}
        </p>
      )}
      <form onSubmit={submit} className="owner-auth-form">
        {mode === "register" && (
          <>
            <div className="owner-auth-grid">
              <label className="owner-label">
                Owner name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </label>
              <label className="owner-label">
                Business name
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Hotel or company name"
                />
              </label>
            </div>
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
          </>
        )}
        {(mode === "register" || mode === "otp-login" || mode === "forgot") && (
          <label className="owner-label">
            Mobile number
            <div className="owner-phone-field">
              <span>IN +91</span>
              <input
                required
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>
          </label>
        )}
        {mode === "login" && (
          <label className="owner-label">
            Email or mobile number
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or registered mobile"
              autoComplete="username"
            />
          </label>
        )}
        {(mode === "login" || mode === "register" || mode === "reset") && (
          <label className="owner-label">
            {mode === "reset" ? "New password" : "Password"}
            <input
              required
              minLength={mode === "login" ? 1 : 8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            {mode !== "login" && (
              <small>Use a letter, number and special character.</small>
            )}
          </label>
        )}
        {mode === "verify" && (
          <label className="owner-label owner-otp-field">
            WhatsApp verification code
            <input
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
            />
          </label>
        )}
        <button disabled={loading} className="owner-auth-submit">
          {loading ? (
            <LoaderCircle className="owner-spin" />
          ) : mode === "login" ? (
            <LogIn />
          ) : mode === "register" ? (
            <UserPlus />
          ) : mode === "verify" ? (
            <CheckCircle2 />
          ) : mode === "reset" ? (
            <LockKeyhole />
          ) : (
            <MessageCircle />
          )}
          {loading
            ? "Please wait…"
            : mode === "login"
              ? "Login to owner account"
              : mode === "register"
                ? "Continue with WhatsApp"
                : mode === "verify"
                  ? "Verify and continue"
                  : mode === "reset"
                    ? "Reset password"
                    : "Send WhatsApp OTP"}
        </button>
        {mode === "login" ? (
          <div className="owner-auth-secondary">
            <button
              type="button"
              onClick={() => {
                setMode("otp-login");
                setNotice("");
              }}
            >
              <MessageCircle /> Login with OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setNotice("");
              }}
            >
              <KeyRound /> Forgot password?
            </button>
          </div>
        ) : (
          mode !== "verify" && (
            <button type="button" className="owner-auth-back" onClick={goLogin}>
              <ArrowLeft /> Back to login
            </button>
          )
        )}
        <div className="owner-auth-divider">
          <span>or</span>
        </div>
        <button
          type="button"
          className="owner-auth-switch"
          onClick={() =>
            mode === "register" ? goLogin() : setMode("register")
          }
        >
          {mode === "register"
            ? "Already registered? Login"
            : "Create a new owner account"}
        </button>
      </form>
      <p className="owner-auth-note">
        <KeyRound /> Your login and property data are securely protected.
      </p>
    </section>
  );
}
