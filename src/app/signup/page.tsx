"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "sending" | "sent" | "error";

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupShell />}>
      <SignupForm />
    </Suspense>
  );
}

function SignupShell() {
  return (
    <div className="phone">
      <div className="topbar">
        <div className="logo">
          THE <span>CHAMPIONS</span>
        </div>
      </div>
      <div className="page active" />
    </div>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Pre-fill leader code from ?code=XXXX so a leader can share
  // https://championstracker.org/signup?code=RONNIE2026 with a new owner.
  useEffect(() => {
    const fromUrl = searchParams.get("code");
    if (fromUrl) setCode(fromUrl.toUpperCase());
  }, [searchParams]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanEmail) {
      setError("Email is required");
      setStatus("error");
      return;
    }

    // Validate leader code exists. leader_codes table is publicly readable
    // (RLS policy) so this works without a session.
    const { data: lc, error: lcErr } = await supabase
      .from("leader_codes")
      .select("code")
      .eq("code", cleanCode)
      .maybeSingle();

    if (lcErr) {
      setError(`Couldn't check leader code: ${lcErr.message}`);
      setStatus("error");
      return;
    }
    if (!lc) {
      setError(
        `Leader code "${cleanCode}" not found. Ask your leader for the right code.`
      );
      setStatus("error");
      return;
    }

    // Send magic link. Name + leader_code travel in user_metadata so the
    // home page can create the owners row on first sign-in.
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: cleanName ? { name: cleanName, leader_code: cleanCode } : { leader_code: cleanCode },
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
                Welcome, Champion.
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 14 }}>
                Sign in or start your accountability streak. We&apos;ll email
                you a one-tap link — no password.
              </div>
            </div>

            <form onSubmit={submit}>
              <div className="input-row">
                <label>Your name</label>
                <input
                  type="text"
                  placeholder="Maria Lopez"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

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

              <div className="input-row">
                <label>Leader code</label>
                <input
                  type="text"
                  placeholder="RONNIE2026"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ letterSpacing: 1.5, textTransform: "uppercase" }}
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
                {status === "sending" ? "SENDING…" : "SEND MAGIC LINK"}
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                fontSize: 13,
                color: "var(--text-mute)",
                textAlign: "center",
              }}
            >
              Already have an account?{" "}
              <a
                href="/signin"
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                Sign in
              </a>
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
