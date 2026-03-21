"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../../../supabase/client";

type Status = "loading" | "joining" | "success" | "unauthenticated";

function ExistingUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("business_id");

  const [status, setStatus] = useState<Status>("loading");
  const [businessName, setBusinessName] = useState("");

  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    async function activate() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        // Not logged in — redirect to sign-in with return URL
        const returnUrl = businessId
          ? `/auth/accept-invite/existing?business_id=${businessId}`
          : "/auth/accept-invite/existing";
        router.replace(
          `/sign-in?redirect=${encodeURIComponent(returnUrl)}`
        );
        return;
      }

      setStatus("joining");
      const user = session.user;

      // Fetch business name
      if (businessId) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", businessId)
          .single();
        if (biz?.name) setBusinessName(biz.name);
      }

      // Activate membership
      if (businessId) {
        await supabase
          .from("business_members")
          .update({ is_active: true, accepted_at: new Date().toISOString() })
          .eq("business_id", businessId)
          .eq("user_id", user.id);

        await supabase
          .from("business_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("business_id", businessId)
          .eq("invited_email", user.email?.toLowerCase());
      }

      setStatus("success");

      // Brief success display before redirect
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }

    activate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = businessName || "your business";

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-xl p-8 shadow-lg text-center"
          style={{
            backgroundColor: "#111827",
            border: "1px solid #1E2A45",
          }}
        >
          {/* Logo */}
          <div className="mb-8">
            <span
              className="font-syne text-2xl font-bold"
              style={{ color: "#E8ECF4" }}
            >
              ezledgr
            </span>
          </div>

          {(status === "loading" || status === "joining") && (
            <>
              {/* Spinner */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#4F7FFF", borderTopColor: "transparent" }}
                />
              </div>
              <h1
                className="font-syne text-xl font-bold"
                style={{ color: "#E8ECF4" }}
              >
                Joining {displayName}…
              </h1>
              <p className="mt-2 text-sm" style={{ color: "#6B7A99" }}>
                Setting up your access, just a moment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              {/* Check icon */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "#22C55E20" }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <h1
                className="font-syne text-xl font-bold"
                style={{ color: "#E8ECF4" }}
              >
                Welcome to {displayName}!
              </h1>
              <p className="mt-2 text-sm" style={{ color: "#6B7A99" }}>
                Redirecting to your dashboard…
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExistingUserPage() {
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
      <ExistingUserContent />
    </Suspense>
  );
}
