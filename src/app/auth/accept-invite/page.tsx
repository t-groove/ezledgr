"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import Link from "next/link";

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("business_id");
  const invitedEmail = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  const supabaseRef = useRef(createClient());

  // Step 1: Exchange the invite token for a session before showing the form
  useEffect(() => {
    const supabase = supabaseRef.current;
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    // Also check URL hash for access_token/refresh_token (some Supabase flows)
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    const initSession = async () => {
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(
            "Invalid or expired invitation link. Please request a new invitation."
          );
          setSessionLoading(false);
          return;
        }
        setSessionReady(true);
        setSessionLoading(false);
      } else if (tokenHash && type === "invite") {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });
        if (otpError) {
          setError(
            "Invalid or expired invitation link. Please request a new invitation."
          );
          setSessionLoading(false);
          return;
        }
        setSessionReady(true);
        setSessionLoading(false);
      } else {
        // No token params — check if there's already a valid session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          setSessionReady(true);
          setSessionLoading(false);
        } else {
          setError(
            "Invalid invitation link. Please request a new invitation."
          );
          setSessionLoading(false);
        }
      }
    };

    initSession();
  }, [searchParams]);

  // Step 2: Once session is ready, fetch business name if needed
  useEffect(() => {
    if (!sessionReady || !businessId) return;
    const supabase = supabaseRef.current;
    supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .single()
      .then(({ data }) => {
        if (data) setBusinessName(data.name);
      });
  }, [sessionReady, businessId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = supabaseRef.current;

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    if (businessId) {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        await supabase
          .from("business_members")
          .update({ is_active: true, accepted_at: new Date().toISOString() })
          .eq("business_id", businessId)
          .eq("user_id", currentUser.id);

        await supabase
          .from("business_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("business_id", businessId)
          .eq("invited_email", currentUser.email?.toLowerCase());
      }
    }

    router.push("/dashboard");
  }

  const existingUserHref = businessId
    ? `/sign-in?redirect=${encodeURIComponent(`/auth/accept-invite/existing?business_id=${businessId}`)}`
    : "/sign-in";

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <span
            className="font-syne text-2xl font-bold"
            style={{ color: "#E8ECF4" }}
          >
            ezledgr
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8 shadow-lg"
          style={{
            backgroundColor: "#111827",
            border: "1px solid #1E2A45",
          }}
        >
          {/* Loading state */}
          {sessionLoading && (
            <div className="flex flex-col items-center space-y-4 py-8">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#4F7FFF", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "#6B7A99" }}>
                Setting up your account…
              </p>
            </div>
          )}

          {/* Error state */}
          {!sessionLoading && error && !sessionReady && (
            <div className="flex flex-col items-center space-y-4 py-8 text-center">
              <p className="text-sm" style={{ color: "#FF6B6B" }}>
                {error}
              </p>
              <Link
                href="/sign-in"
                className="text-sm font-medium hover:underline"
                style={{ color: "#4F7FFF" }}
              >
                Request new invitation →
              </Link>
            </div>
          )}

          {/* Password form — only shown after session is established */}
          {sessionReady && (
            <>
              <div className="space-y-2 text-center mb-6">
                <h1
                  className="font-syne text-2xl font-bold tracking-tight"
                  style={{ color: "#E8ECF4" }}
                >
                  {businessName
                    ? `You've been invited to ${businessName}`
                    : "You've been invited"}
                </h1>
                <p className="text-sm" style={{ color: "#6B7A99" }}>
                  {invitedEmail
                    ? `Set up a password for ${invitedEmail}`
                    : "Set up your password to get started"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                {/* Password */}
                <div className="space-y-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium"
                    style={{ color: "#E8ECF4" }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                      placeholder="Min 8 characters"
                      className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-2"
                      style={{
                        backgroundColor: "#0A0F1E",
                        border: "1px solid #1E2A45",
                        color: "#E8ECF4",
                        caretColor: "#4F7FFF",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: "#6B7A99" }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label
                    htmlFor="confirm"
                    className="block text-sm font-medium"
                    style={{ color: "#E8ECF4" }}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      minLength={8}
                      required
                      placeholder="Repeat your password"
                      className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-2"
                      style={{
                        backgroundColor: "#0A0F1E",
                        border: "1px solid #1E2A45",
                        color: "#E8ECF4",
                        caretColor: "#4F7FFF",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                      style={{ color: "#6B7A99" }}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm" style={{ color: "#FF6B6B" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "#4F7FFF", color: "#ffffff" }}
                >
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>

              {/* Existing user link */}
              <p className="mt-5 text-center text-sm" style={{ color: "#6B7A99" }}>
                Already have an ezledgr account?{" "}
                <Link
                  href={existingUserHref}
                  className="font-medium hover:underline"
                  style={{ color: "#4F7FFF" }}
                >
                  Sign in instead →
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center"
          style={{ backgroundColor: "#0A0F1E" }}
        >
          <span style={{ color: "#6B7A99" }}>Loading…</span>
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
