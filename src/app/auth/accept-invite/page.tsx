"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../../supabase/client";
import Link from "next/link";

function AcceptInviteForm() {
  const searchParams = useSearchParams();

  const [sessionReady, setSessionReady] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const supabaseRef = useRef(createClient());

  // On mount: verify token → get user → get business name → get role → show form
  useEffect(() => {
    const supabase = supabaseRef.current;

    const init = async () => {
      // Step A — Verify invite token and establish session
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const tokenHash =
        query.get("token_hash") ?? hash.get("token_hash");
      const type = query.get("type") ?? hash.get("type");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(
            "Invalid or expired invitation link. Please request a new invitation."
          );
          return;
        }
      } else if (tokenHash && type === "invite") {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });
        if (otpError) {
          setError(
            "Invalid or expired invitation link. Please request a new invitation."
          );
          return;
        }
      } else {
        // Check for an existing valid session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError(
            "Invalid invitation link. Please request a new invitation."
          );
          return;
        }
      }

      // Step B — Get user email from session
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? "");

      // Step C — Get business name from URL (bypasses RLS — user has no active membership yet)
      const rawName = query.get("business_name");
      setBusinessName(
        rawName ? decodeURIComponent(rawName) : "your new business"
      );

      // Step D — Get role from URL
      const rawRole = query.get("role");
      setRole(rawRole ? decodeURIComponent(rawRole) : "member");

      // Step E — Show the form
      setSessionReady(true);
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const supabase = supabaseRef.current;
    const query = new URLSearchParams(window.location.search);
    const businessId = query.get("business_id");

    // Step 1: Set password
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      setError(passwordError.message);
      setIsSubmitting(false);
      return;
    }

    // Step 2: Activate membership
    if (businessId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase
        .from("business_members")
        .update({
          is_active: true,
          accepted_at: new Date().toISOString(),
        })
        .eq("business_id", businessId)
        .eq("user_id", user?.id);

      await supabase
        .from("business_invitations")
        .update({
          accepted_at: new Date().toISOString(),
        })
        .eq("business_id", businessId)
        .eq("invited_email", user?.email?.toLowerCase());
    }

    // Step 3: Small delay to let Supabase replicate the membership before the
    // server component runs its active-membership check, then redirect.
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="font-syne font-bold text-2xl text-[#E8ECF4]">
            ezledgr
          </h1>
        </div>

        {/* Loading state */}
        {!sessionReady && !error && (
          <div className="flex flex-col items-center space-y-4 py-8">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2"
              style={{
                borderColor: "#4F7FFF",
                borderTopColor: "transparent",
              }}
            />
            <p className="text-sm text-[#6B7A99]">
              Setting up your account...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !sessionReady && (
          <div className="flex flex-col items-center space-y-4 py-8 text-center">
            <p className="text-sm text-[#FF6B6B]">{error}</p>
            <Link
              href="/sign-in"
              className="text-sm font-medium hover:underline text-[#4F7FFF]"
            >
              Request new invitation →
            </Link>
          </div>
        )}

        {/* Main form — shown once session is ready */}
        {sessionReady && (
          <>
            {/* Invitation context */}
            <div className="bg-[#0A0F1E] border border-[#1E2A45] rounded-lg p-4 mb-6">
              <p className="text-sm text-[#6B7A99] mb-1">
                You&apos;ve been invited to join
              </p>
              <p className="font-syne font-bold text-[#E8ECF4] text-lg">
                {businessName}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-[#6B7A99]">Signing in as:</span>
                <span className="text-xs text-[#E8ECF4] font-medium">
                  {userEmail}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#6B7A99]">Role:</span>
                <span className="text-xs bg-[#4F7FFF]/10 text-[#4F7FFF] px-2 py-0.5 rounded-full capitalize">
                  {role}
                </span>
              </div>
            </div>

            {/* Password form */}
            <h2 className="font-syne font-semibold text-[#E8ECF4] mb-1">
              Create your password
            </h2>
            <p className="text-sm text-[#6B7A99] mb-5">
              Choose a secure password to access your account.
            </p>

            {/* Password */}
            <div className="space-y-1 mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#E8ECF4]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#4F7FFF]"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7A99]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 mb-4">
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-[#E8ECF4]"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#4F7FFF]"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7A99]"
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#FF6B6B] mb-2">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition-colors mt-4"
            >
              {isSubmitting
                ? "Setting up your account..."
                : "Create Account & Join →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-8 w-full max-w-md">
            <div className="text-center mb-6">
              <h1 className="font-syne font-bold text-2xl text-[#E8ECF4]">
                ezledgr
              </h1>
            </div>
            <div className="flex flex-col items-center space-y-4 py-8">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2"
                style={{
                  borderColor: "#4F7FFF",
                  borderTopColor: "transparent",
                }}
              />
              <p className="text-sm text-[#6B7A99]">
                Setting up your account...
              </p>
            </div>
          </div>
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
