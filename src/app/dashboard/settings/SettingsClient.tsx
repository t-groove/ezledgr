"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBusiness } from "@/lib/business/actions";
import type { Business, TeamMember, BusinessInvitation } from "@/lib/business/actions";
import { getProfile, updateProfile, uploadAvatar } from "./actions";
import { Trash2, AlertTriangle, Shield } from "lucide-react";
import { createClient } from "../../../../supabase/client";

// ── Role config ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  owner:      "bg-[#4F7FFF]/10 text-[#4F7FFF] border border-[#4F7FFF]/20",
  accountant: "bg-[#A855F7]/10 text-[#A855F7]",
  bookkeeper: "bg-[#22C55E]/10 text-[#22C55E]",
  readonly:   "bg-[#6B7280]/10 text-[#6B7280]",
};

const ROLE_DESC: Record<string, string> = {
  owner:      "Full access including settings and billing",
  accountant: "View and edit transactions and reports",
  bookkeeper: "Manage transactions only",
  readonly:   "View reports only",
};

const ROLE_LABEL: Record<string, string> = {
  owner:      "Owner",
  accountant: "Accountant",
  bookkeeper: "Bookkeeper",
  readonly:   "Read-only",
};

const ASSIGNABLE_ROLES = ["owner", "accountant", "bookkeeper", "readonly"];
const ENTITY_TYPES = [
  "LLC", "S-Corp", "C-Corp", "Sole Proprietor",
  "Partnership", "Non-Profit", "Other",
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  business: Business;
  members: TeamMember[];
  invitations: BusinessInvitation[];
  currentUserId: string;
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm shadow-xl border max-w-sm ${
        type === "success"
          ? "bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]"
          : "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]"
      }`}
    >
      {message}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SettingsClient({
  business,
  members: initialMembers,
  invitations: initialInvitations,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"personal" | "danger">("personal");

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Personal Profile tab state ─────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    getProfile().then((profile) => {
      if (profile) {
        setName(profile.name);
        setEmail(profile.email);
        setPhone(profile.phone);
        setJobTitle(profile.job_title);
        setTimezone(profile.timezone);
        setAvatarUrl(profile.avatar_url);
      }
    });
  }, []);

  async function handleSaveProfile() {
    setIsSaving(true);
    const result = await updateProfile({
      name,
      phone,
      job_title: jobTitle,
      timezone,
    });
    if (result.success) {
      showToast("Profile updated successfully");
    } else {
      showToast(result.error ?? "Failed to save profile", "error");
    }
    setIsSaving(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input so the same file can be re-selected after an error
    e.target.value = "";
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      showToast("Please select a JPG, PNG, or WebP image", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB", "error");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = (ev.target?.result as string).split(",")[1];
        const result = await uploadAvatar(base64, file.type);
        if (result.success && result.url) {
          setAvatarUrl(result.url);
          showToast("Photo updated!");
          // Notify other components on the page (e.g. navbar) that the
          // avatar changed without requiring a full page refresh.
          window.dispatchEvent(
            new CustomEvent("avatar-updated", { detail: { url: result.url } })
          );
        } else {
          showToast(result.error ?? "Upload failed — please try again", "error");
        }
      } catch {
        showToast("Upload failed — please try again", "error");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      showToast("Could not read file — please try again", "error");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  }

  const isOwner = initialMembers.find((m) => m.user_id === currentUserId)?.role === "owner";

  // ── Danger zone state ──────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (deleteInput !== business.name) {
      showToast("Business name does not match.", "error");
      return;
    }
    startDeleteTransition(async () => {
      const result = await deleteBusiness(business.id);
      if (result.success) {
        router.push("/dashboard");
      } else {
        showToast(result.error ?? "Failed to delete business.", "error");
      }
    });
  }

  // ── Tab button style ───────────────────────────────────────────────────────
  const tabClass = (t: string) =>
    `px-5 py-2 rounded-lg text-sm transition-colors ${
      activeTab === t
        ? "bg-[#193764] border border-[#193764] text-white font-medium"
        : "text-[#6B7280] hover:text-[#193764]"
    }`;

  const avatarInitial = (name || email).charAt(0).toUpperCase();

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="font-sans text-3xl font-bold text-[#193764]">Settings</h1>
          <p className="text-sm text-[#6B7280] mt-1">{business.name}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 flex-wrap">
          <button className={tabClass("personal")} onClick={() => setActiveTab("personal")}>
            Profile
          </button>
          {isOwner && (
            <button className={tabClass("danger")} onClick={() => setActiveTab("danger")}>
              Danger Zone
            </button>
          )}
        </div>

        {/* ── Personal Profile Tab ─────────────────────────────────────────── */}
        {activeTab === "personal" && (
          <div className="space-y-6 max-w-xl">

            {/* Avatar section */}
            <div className="bg-white border border-[#dde4ef] rounded-xl p-6">
              <h3 className="font-sans font-semibold text-[#193764] mb-4">Profile Photo</h3>
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-[#e8eef6] flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-[#6B7280]">{avatarInitial}</span>
                    )}
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 rounded-full bg-[#f5f4f2]/70 flex items-center justify-center">
                      <svg className="animate-spin w-6 h-6 text-[#4F7FFF]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <label className={isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
                    <span className="bg-[#e8eef6] hover:bg-[#4F7FFF]/20 text-[#193764] px-4 py-2 rounded-lg text-sm transition-colors inline-block">
                      {isUploading ? "Uploading…" : "Upload photo"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  <p className="text-xs text-[#6B7280] mt-1.5">JPG, PNG or WebP. Max 2MB.</p>
                </div>
              </div>
            </div>

            {/* Personal information form */}
            <div className="bg-white border border-[#dde4ef] rounded-xl p-6">
              <h3 className="font-sans font-semibold text-[#193764] mb-5">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#6B7280] mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6B7280] mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="input-style opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-[#6B7280] mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm text-[#6B7280] mb-1.5">Phone number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6B7280] mb-1.5">Job title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Owner, CFO, Bookkeeper"
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6B7280] mb-1.5">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="input-style"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-[#2F7FC8] hover:bg-[#2568a8] disabled:opacity-50 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>

            {/* Password section */}
            <div className="bg-white border border-[#dde4ef] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-semibold text-[#193764]">Password</h3>
                  <p className="text-sm text-[#6B7280] mt-0.5">Update your account password</p>
                </div>
                <a
                  href="/dashboard/change-password"
                  className="text-sm text-[#2F7FC8] hover:underline"
                >
                  Change password →
                </a>
              </div>
            </div>

            {/* MFA section */}
            <MFASettings />
          </div>
        )}



        {/* ── Danger Zone Tab ──────────────────────────────────────────────── */}
        {activeTab === "danger" && isOwner && (
          <div className="bg-white border border-[#EF4444]/30 rounded-xl p-6 max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-[#EF4444]" />
              </div>
              <div>
                <h2 className="font-sans text-lg font-semibold text-[#193764]">Danger Zone</h2>
                <p className="text-xs text-[#6B7280]">These actions are irreversible</p>
              </div>
            </div>

            <div className="border border-[#EF4444]/20 rounded-lg p-4">
              <p className="text-sm font-medium text-[#193764] mb-1">Delete this business</p>
              <p className="text-xs text-[#6B7280] mb-4">
                This will permanently delete all transactions, accounts, and reports for{" "}
                <span className="font-medium text-[#193764]">{business.name}</span>. This action
                cannot be undone.
              </p>

              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete Business
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-[#6B7280]">
                    Type{" "}
                    <span className="font-mono font-semibold text-[#193764]">
                      {business.name}
                    </span>{" "}
                    to confirm deletion.
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={business.name}
                    className="w-full bg-[#f5f4f2] border border-[#EF4444]/30 text-[#193764] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#EF4444] placeholder:text-[#6B7280]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deletePending || deleteInput !== business.name}
                      className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {deletePending ? "Deleting…" : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm(false);
                        setDeleteInput("");
                      }}
                      className="px-4 py-2 text-[#6B7280] hover:text-[#193764] text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline styles for form inputs */}
      <style>{`
        .input-style {
          width: 100%;
          background: #f5f4f2;
          border: 1px solid #dde4ef;
          color: #193764;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .input-style:focus {
          border-color: #4F7FFF;
        }
        .input-style::placeholder {
          color: #6B7280;
        }
        select.input-style {
          cursor: pointer;
        }
      `}</style>
    </>
  );
}

// ── FormField helper ───────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[#6B7280] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── MFA Settings ───────────────────────────────────────────────────────────────

function MFASettings() {
  const [factors, setFactors] = useState<{ id: string; status: string; friendly_name?: string; created_at: string }[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setError('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'EZ Ledgr',
      friendlyName: 'EZ Ledgr Authenticator',
    });

    if (error) {
      setError(error.message);
      setIsEnrolling(false);
      return;
    }

    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setIsEnrolling(false);
  };

  const handleVerifyEnrollment = async () => {
    if (!factorId || verifyCode.length !== 6) return;

    setIsVerifying(true);
    setError('');

    const supabase = createClient();

    const { data: challengeData, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      setError(challengeError.message);
      setIsVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });

    if (verifyError) {
      setError('Invalid code. Please check your app and try again.');
      setVerifyCode('');
      setIsVerifying(false);
      return;
    }

    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerifyCode('');
    setSuccess('Two-factor authentication enabled successfully!');
    await loadFactors();
    setIsVerifying(false);
  };

  const handleUnenroll = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (!error) {
      setSuccess('Two-factor authentication disabled.');
      await loadFactors();
    }
  };

  const isEnabled = factors.some(f => f.status === 'verified');

  return (
    <div className="bg-white border border-[#dde4ef] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-[#4F7FFF]" />
          <div>
            <h3 className="font-sans font-semibold text-[#193764]">
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-[#6B7280] mt-0.5">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          isEnabled
            ? 'bg-[#22C55E]/10 text-[#22C55E]'
            : 'bg-[#6B7280]/10 text-[#6B7280]'
        }`}>
          {isEnabled ? '✓ Enabled' : 'Disabled'}
        </span>
      </div>

      {success && (
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-[#22C55E]">{success}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-[#EF4444] mb-4">{error}</p>
      )}

      {/* Not enrolled — show enable button */}
      {!isEnabled && !qrCode && (
        <div>
          <p className="text-sm text-[#6B7280] mb-4">
            Use an authenticator app like Google Authenticator or Authy to
            generate one-time codes when signing in.
          </p>
          <button
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50
              text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            {isEnrolling ? 'Setting up...' : 'Enable 2FA'}
          </button>
        </div>
      )}

      {/* QR code enrollment step */}
      {qrCode && (
        <div>
          <p className="text-sm text-[#193764] font-medium mb-2">
            Step 1: Scan this QR code
          </p>
          <p className="text-sm text-[#6B7280] mb-4">
            Open Google Authenticator, Authy, or any TOTP app and scan the
            QR code below.
          </p>

          <div className="bg-white p-4 rounded-lg inline-block mb-4">
            <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
          </div>

          <details className="mb-4">
            <summary className="text-sm text-[#4F7FFF] cursor-pointer hover:underline">
              Can&apos;t scan? Enter code manually
            </summary>
            <div className="mt-2 bg-[#f5f4f2] border border-[#dde4ef] rounded-lg px-3 py-2">
              <p className="text-xs text-[#6B7280] mb-1">Manual entry key:</p>
              <p className="font-mono text-sm text-[#193764] break-all">{secret}</p>
            </div>
          </details>

          <p className="text-sm text-[#193764] font-medium mb-2">
            Step 2: Enter the 6-digit code
          </p>
          <p className="text-sm text-[#6B7280] mb-3">
            Enter the code shown in your authenticator app to verify setup.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              className="bg-[#f5f4f2] border border-[#dde4ef] text-[#193764]
                rounded-lg px-4 py-2.5 text-center font-mono tracking-widest
                text-lg focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] w-40"
            />
            <button
              onClick={handleVerifyEnrollment}
              disabled={verifyCode.length !== 6 || isVerifying}
              className="bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50
                text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {isVerifying ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>

          <button
            onClick={() => {
              setQrCode(null);
              setSecret(null);
              setFactorId(null);
            }}
            className="text-sm text-[#6B7280] hover:text-[#193764] transition-colors mt-3 block"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Enrolled — show disable option */}
      {isEnabled && !qrCode && (
        <div>
          <p className="text-sm text-[#6B7280] mb-4">
            Your account is protected with two-factor authentication. You&apos;ll
            need your authenticator app each time you sign in.
          </p>
          {factors
            .filter(f => f.status === 'verified')
            .map(factor => (
              <div
                key={factor.id}
                className="flex items-center justify-between bg-[#f5f4f2]
                  border border-[#dde4ef] rounded-lg px-4 py-3 mb-3"
              >
                <div>
                  <p className="text-sm text-[#193764] font-medium">
                    {factor.friendly_name ?? 'Authenticator App'}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Added {new Date(factor.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleUnenroll(factor.id)}
                  className="text-sm text-[#C0392B] hover:underline transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
