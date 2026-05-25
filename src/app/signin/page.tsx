"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "sending" | "sent" | "error";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Skip the form and bounce to the app.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Email is required");
      setStatus("error");
      return;
    }

    // No leader_code in metadata — this is for returning users only.
    // First-time signups land in getOrCreateOwner() with "incomplete-signup"
    // and get bounced to /signup to provide their leader code.
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (otpErr) {
      setError(otpErr.message);
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="phone">
      <div className="topbar">
        <div className="logo">
          THE <span>CHAMPIONS</span>
        </div>
      </div>

      <div className="page active" style={{ paddingTop: 24 }}>
        {status === "sent" ? (
          <div className="card" style={{ textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📬</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--accent)",
                marginBottom: 8,
              }}
            >
              Check your email
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.5 }}>
              We sent a magic link to <strong>{email}</strong>. Tap it on this
              device to finish signing in.
            </div>
            <button
              className="btn-secondary"
              style={{ marginTop: 18 }}
              onClick={() => {
                setStatus("idle");
                setError(null);
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "var(--text)",
                  marginBottom: 6,
                }}
              >
                Welcome back, Champion.
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 14 }}>
                We&apos;ll email you a one-tap sign-in link — no password.
              </div>
            </div>

            <form onSubmit={submit}>
              <div className="input-row">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid var(--danger)",
                    color: "var(--danger)",
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 13,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={status === "sending"}
              >
                {status === "sending" ? "SENDING…" : "SEND SIGN-IN LINK"}
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                fontSize: 13,
                color: "var(--text-mute)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              First time here? Use the invite link from your leader to create an account.
            </div>

            <div className="tagline" style={{ marginTop: 18 }}>
              Discipline today. Freedom tomorrow.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
