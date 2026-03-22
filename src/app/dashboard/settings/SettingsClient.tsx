"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateBusiness,
  inviteTeamMember,
  removeTeamMember,
  updateMemberRole,
  cancelInvitation,
  deleteBusiness,
} from "@/lib/business/actions";
import type { Business, TeamMember, BusinessInvitation } from "@/lib/business/actions";
import { getProfile, updateProfile, uploadAvatar } from "./actions";
import { Trash2, UserMinus, AlertTriangle, X, Crown, RotateCcw, Shield } from "lucide-react";
import { createClient } from "../../../../supabase/client";

// ── Role config ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  owner:      "bg-[#4F7FFF]/10 text-[#4F7FFF] border border-[#4F7FFF]/20",
  accountant: "bg-[#A855F7]/10 text-[#A855F7]",
  bookkeeper: "bg-[#22C55E]/10 text-[#22C55E]",
  readonly:   "bg-[#6B7A99]/10 text-[#6B7A99]",
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
  const [activeTab, setActiveTab] = useState<"personal" | "business" | "team" | "danger">("personal");

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

  // ── Business Profile tab state ─────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: business.name ?? "",
    entity_type: business.entity_type ?? "LLC",
    industry: business.industry ?? "",
    phone: business.phone ?? "",
    address: business.address ?? "",
    city: business.city ?? "",
    state: business.state ?? "",
    zip: business.zip ?? "",
    website: business.website ?? "",
  });
  const [profilePending, startProfileTransition] = useTransition();

  function handleProfileChange(key: string, value: string) {
    setProfileForm((f) => ({ ...f, [key]: value }));
  }

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    startProfileTransition(async () => {
      const result = await updateBusiness(business.id, profileForm);
      if (result.success) {
        showToast("Business profile saved.");
        router.refresh();
      } else {
        showToast(result.error ?? "Failed to save.", "error");
      }
    });
  }

  // ── Status helper ──────────────────────────────────────────────────────────
  function getStatus(member: TeamMember) {
    if (member.is_active && member.accepted_at) {
      return { label: "Active", color: "text-[#22C55E]" };
    }
    if (!member.is_active) {
      return { label: "Pending", color: "text-[#F59E0B]" };
    }
    return { label: "Active", color: "text-[#22C55E]" };
  }

  // ── Team tab state ─────────────────────────────────────────────────────────
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<BusinessInvitation[]>(initialInvitations);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("bookkeeper");
  const [invitePending, startInviteTransition] = useTransition();
  const [memberPending, startMemberTransition] = useTransition();

  const isOwner = members.find((m) => m.user_id === currentUserId)?.role === "owner";

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    startInviteTransition(async () => {
      const result = await inviteTeamMember(business.id, inviteEmail.trim(), inviteRole);
      if (result.success) {
        showToast(`Invitation sent to ${inviteEmail.trim()}.`);
        setInviteEmail("");
        router.refresh();
      } else {
        showToast(result.error ?? "Failed to send invitation.", "error");
      }
    });
  }

  function handleRemoveMember(userId: string) {
    const memberToRemove = members.find((m) => m.user_id === userId);
    const ownerCount = members.filter((m) => m.role === "owner").length;
    if (memberToRemove?.role === "owner" && ownerCount <= 1) {
      showToast("Cannot remove the last owner of a business.", "error");
      return;
    }
    startMemberTransition(async () => {
      const result = await removeTeamMember(business.id, userId);
      if (result.success) {
        setMembers((m) => m.filter((mem) => mem.user_id !== userId));
        showToast("Member removed.");
      } else {
        showToast(result.error ?? "Failed to remove member.", "error");
      }
    });
  }

  function handleRoleChange(userId: string, role: string) {
    if (role !== "owner") {
      const thisMember = members.find((m) => m.user_id === userId);
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (thisMember?.role === "owner" && ownerCount <= 1) {
        showToast("Cannot change role — at least one owner required.", "error");
        return;
      }
    }
    startMemberTransition(async () => {
      const result = await updateMemberRole(business.id, userId, role);
      if (result.success) {
        setMembers((m) =>
          m.map((mem) => (mem.user_id === userId ? { ...mem, role } : mem))
        );
        showToast("Role updated.");
      } else {
        showToast(result.error ?? "Failed to update role.", "error");
      }
    });
  }

  function handleResendInvite(inv: BusinessInvitation) {
    startMemberTransition(async () => {
      await cancelInvitation(inv.id);
      setInvitations((list) => list.filter((i) => i.id !== inv.id));
      const result = await inviteTeamMember(business.id, inv.invited_email, inv.role);
      if (result.success) {
        showToast(`Invitation resent to ${inv.invited_email}.`);
        router.refresh();
      } else {
        showToast(result.error ?? "Failed to resend invitation.", "error");
      }
    });
  }

  function handleCancelInvite(invitationId: string) {
    startMemberTransition(async () => {
      const result = await cancelInvitation(invitationId);
      if (result.success) {
        setInvitations((inv) => inv.filter((i) => i.id !== invitationId));
        showToast("Invitation cancelled.");
      } else {
        showToast(result.error ?? "Failed to cancel.", "error");
      }
    });
  }

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
        ? "bg-[#111827] border border-[#1E2A45] text-[#E8ECF4] font-medium"
        : "text-[#6B7A99] hover:text-[#E8ECF4]"
    }`;

  const avatarInitial = (name || email).charAt(0).toUpperCase();

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">Settings</h1>
          <p className="text-sm text-[#6B7A99] mt-1">{business.name}</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 flex-wrap">
          <button className={tabClass("personal")} onClick={() => setActiveTab("personal")}>
            Profile
          </button>
          <button className={tabClass("business")} onClick={() => setActiveTab("business")}>
            Business Profile
          </button>
          <button className={tabClass("team")} onClick={() => setActiveTab("team")}>
            Team Members
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
            <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
              <h3 className="font-syne font-semibold text-[#E8ECF4] mb-4">Profile Photo</h3>
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <div className="w-20 h-20 rounded-full bg-[#1E2A45] flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-[#6B7A99]">{avatarInitial}</span>
                    )}
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 rounded-full bg-[#0A0F1E]/70 flex items-center justify-center">
                      <svg className="animate-spin w-6 h-6 text-[#4F7FFF]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <label className={isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
                    <span className="bg-[#1E2A45] hover:bg-[#4F7FFF]/20 text-[#E8ECF4] px-4 py-2 rounded-lg text-sm transition-colors inline-block">
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
                  <p className="text-xs text-[#6B7A99] mt-1.5">JPG, PNG or WebP. Max 2MB.</p>
                </div>
              </div>
            </div>

            {/* Personal information form */}
            <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
              <h3 className="font-syne font-semibold text-[#E8ECF4] mb-5">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#6B7A99] mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6B7A99] mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="input-style opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-[#6B7A99] mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm text-[#6B7A99] mb-1.5">Phone number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6B7A99] mb-1.5">Job title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Owner, CFO, Bookkeeper"
                    className="input-style"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#6B7A99] mb-1.5">Timezone</label>
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
                    className="bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </div>

            {/* Password section */}
            <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-syne font-semibold text-[#E8ECF4]">Password</h3>
                  <p className="text-sm text-[#6B7A99] mt-0.5">Update your account password</p>
                </div>
                <a
                  href="/dashboard/change-password"
                  className="text-sm text-[#4F7FFF] hover:underline"
                >
                  Change password →
                </a>
              </div>
            </div>

            {/* MFA section */}
            <MFASettings />
          </div>
        )}

        {/* ── Business Profile Tab ─────────────────────────────────────────── */}
        {activeTab === "business" && (
          <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 max-w-xl">
            <h2 className="font-syne text-lg font-semibold text-[#E8ECF4] mb-5">
              Business Profile
            </h2>
            <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
              <FormField label="Business name *">
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  required
                  className="input-style"
                />
              </FormField>

              <FormField label="Entity type">
                <select
                  value={profileForm.entity_type}
                  onChange={(e) => handleProfileChange("entity_type", e.target.value)}
                  className="input-style"
                >
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Industry">
                <input
                  type="text"
                  value={profileForm.industry}
                  onChange={(e) => handleProfileChange("industry", e.target.value)}
                  placeholder="e.g. Technology, Consulting"
                  className="input-style"
                />
              </FormField>

              <FormField label="Phone">
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => handleProfileChange("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="input-style"
                />
              </FormField>

              <FormField label="Address">
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => handleProfileChange("address", e.target.value)}
                  placeholder="123 Main St"
                  className="input-style"
                />
              </FormField>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="City">
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={(e) => handleProfileChange("city", e.target.value)}
                    className="input-style"
                  />
                </FormField>
                <FormField label="State">
                  <input
                    type="text"
                    value={profileForm.state}
                    onChange={(e) => handleProfileChange("state", e.target.value)}
                    maxLength={2}
                    placeholder="CA"
                    className="input-style"
                  />
                </FormField>
                <FormField label="ZIP">
                  <input
                    type="text"
                    value={profileForm.zip}
                    onChange={(e) => handleProfileChange("zip", e.target.value)}
                    placeholder="90210"
                    className="input-style"
                  />
                </FormField>
              </div>

              <FormField label="Website">
                <input
                  type="url"
                  value={profileForm.website}
                  onChange={(e) => handleProfileChange("website", e.target.value)}
                  placeholder="https://example.com"
                  className="input-style"
                />
              </FormField>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profilePending}
                  className="px-5 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {profilePending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Team Tab ────────────────────────────────────────────────────── */}
        {activeTab === "team" && (
          <div className="flex flex-col gap-6">
            {/* Invite form */}
            {isOwner && (
              <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
                <h2 className="font-syne text-lg font-semibold text-[#E8ECF4] mb-4">
                  Invite Team Member
                </h2>
                <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-[#6B7A99] mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      placeholder="colleague@example.com"
                      className="w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF] placeholder:text-[#6B7A99]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#6B7A99] mb-1.5">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={invitePending}
                    className="px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {invitePending ? "Sending…" : "Send Invite"}
                  </button>
                </form>
              </div>
            )}

            {/* Members table */}
            <div className="bg-[#111827] border border-[#1E2A45] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1E2A45]">
                <h2 className="font-syne text-lg font-semibold text-[#E8ECF4]">
                  Team Members
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E2A45]">
                      <th className="text-left px-6 py-3 text-[#6B7A99] font-medium">
                        Name / Email
                      </th>
                      <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">Role</th>
                      <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">Status</th>
                      {isOwner && (
                        <th className="text-right px-6 py-3 text-[#6B7A99] font-medium">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-[#1E2A45] last:border-0 hover:bg-[#1E2A45]/20 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <div>
                            <p className="font-medium text-[#E8ECF4]">
                              {member.display_name}
                            </p>
                            {member.email && member.email !== member.display_name && (
                              <p className="text-xs text-[#6B7A99]">{member.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                ROLE_BADGE[member.role] ?? ROLE_BADGE.readonly
                              }`}
                            >
                              {member.role === "owner" && <Crown size={10} />}
                              {ROLE_LABEL[member.role] ?? member.role}
                            </span>
                            <p className="text-xs text-[#6B7A99] mt-0.5">
                              {ROLE_DESC[member.role] ?? ""}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            const s = getStatus(member);
                            return <span className={`text-xs ${s.color}`}>{s.label}</span>;
                          })()}
                        </td>
                        {isOwner && (
                          <td className="px-6 py-3 text-right">
                            {member.user_id === currentUserId ? (
                              <span className="text-xs text-[#6B7A99] italic">You</span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleRoleChange(member.user_id, e.target.value)
                                  }
                                  disabled={memberPending}
                                  className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#4F7FFF] cursor-pointer disabled:opacity-50"
                                >
                                  {ASSIGNABLE_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {ROLE_LABEL[r]}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleRemoveMember(member.user_id)}
                                  disabled={memberPending}
                                  className="p-1.5 text-[#6B7A99] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors disabled:opacity-50"
                                  title="Remove member"
                                >
                                  <UserMinus size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <div className="bg-[#111827] border border-[#1E2A45] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1E2A45]">
                  <h2 className="font-syne text-lg font-semibold text-[#E8ECF4]">
                    Pending Invitations
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1E2A45]">
                        <th className="text-left px-6 py-3 text-[#6B7A99] font-medium">Email</th>
                        <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">Role</th>
                        <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">
                          Invited
                        </th>
                        <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">
                          Expires
                        </th>
                        {isOwner && (
                          <th className="text-right px-6 py-3 text-[#6B7A99] font-medium">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => {
                        const isExpired = new Date(inv.expires_at) < new Date();
                        return (
                          <tr
                            key={inv.id}
                            className="border-b border-[#1E2A45] last:border-0 hover:bg-[#1E2A45]/20 transition-colors"
                          >
                            <td className="px-6 py-3 text-[#E8ECF4]">{inv.invited_email}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                  ROLE_BADGE[inv.role] ?? ROLE_BADGE.readonly
                                }`}
                              >
                                {ROLE_LABEL[inv.role] ?? inv.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#6B7A99] text-xs">
                              {new Date(inv.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs ${
                                  isExpired ? "text-[#EF4444]" : "text-[#6B7A99]"
                                }`}
                              >
                                {isExpired
                                  ? "Expired"
                                  : new Date(inv.expires_at).toLocaleDateString()}
                              </span>
                            </td>
                            {isOwner && (
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleResendInvite(inv)}
                                    disabled={memberPending}
                                    className="p-1.5 text-[#6B7A99] hover:text-[#4F7FFF] hover:bg-[#4F7FFF]/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="Resend invitation"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleCancelInvite(inv.id)}
                                    disabled={memberPending}
                                    className="p-1.5 text-[#6B7A99] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors disabled:opacity-50"
                                    title="Cancel invitation"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Danger Zone Tab ──────────────────────────────────────────────── */}
        {activeTab === "danger" && isOwner && (
          <div className="bg-[#111827] border border-[#EF4444]/30 rounded-xl p-6 max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-[#EF4444]" />
              </div>
              <div>
                <h2 className="font-syne text-lg font-semibold text-[#E8ECF4]">Danger Zone</h2>
                <p className="text-xs text-[#6B7A99]">These actions are irreversible</p>
              </div>
            </div>

            <div className="border border-[#EF4444]/20 rounded-lg p-4">
              <p className="text-sm font-medium text-[#E8ECF4] mb-1">Delete this business</p>
              <p className="text-xs text-[#6B7A99] mb-4">
                This will permanently delete all transactions, accounts, and reports for{" "}
                <span className="font-medium text-[#E8ECF4]">{business.name}</span>. This action
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
                  <p className="text-xs text-[#6B7A99]">
                    Type{" "}
                    <span className="font-mono font-semibold text-[#E8ECF4]">
                      {business.name}
                    </span>{" "}
                    to confirm deletion.
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={business.name}
                    className="w-full bg-[#0A0F1E] border border-[#EF4444]/30 text-[#E8ECF4] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#EF4444] placeholder:text-[#6B7A99]"
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
                      className="px-4 py-2 text-[#6B7A99] hover:text-[#E8ECF4] text-sm rounded-lg transition-colors"
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
          background: #0A0F1E;
          border: 1px solid #1E2A45;
          color: #E8ECF4;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .input-style:focus {
          border-color: #4F7FFF;
        }
        .input-style::placeholder {
          color: #6B7A99;
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
      <label className="block text-xs text-[#6B7A99] mb-1.5">{label}</label>
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
    <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-[#4F7FFF]" />
          <div>
            <h3 className="font-syne font-semibold text-[#E8ECF4]">
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          isEnabled
            ? 'bg-[#22C55E]/10 text-[#22C55E]'
            : 'bg-[#6B7A99]/10 text-[#6B7A99]'
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
          <p className="text-sm text-[#6B7A99] mb-4">
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
          <p className="text-sm text-[#E8ECF4] font-medium mb-2">
            Step 1: Scan this QR code
          </p>
          <p className="text-sm text-[#6B7A99] mb-4">
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
            <div className="mt-2 bg-[#0A0F1E] border border-[#1E2A45] rounded-lg px-3 py-2">
              <p className="text-xs text-[#6B7A99] mb-1">Manual entry key:</p>
              <p className="font-mono text-sm text-[#E8ECF4] break-all">{secret}</p>
            </div>
          </details>

          <p className="text-sm text-[#E8ECF4] font-medium mb-2">
            Step 2: Enter the 6-digit code
          </p>
          <p className="text-sm text-[#6B7A99] mb-3">
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
              className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4]
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
            className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] transition-colors mt-3 block"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Enrolled — show disable option */}
      {isEnabled && !qrCode && (
        <div>
          <p className="text-sm text-[#6B7A99] mb-4">
            Your account is protected with two-factor authentication. You&apos;ll
            need your authenticator app each time you sign in.
          </p>
          {factors
            .filter(f => f.status === 'verified')
            .map(factor => (
              <div
                key={factor.id}
                className="flex items-center justify-between bg-[#0A0F1E]
                  border border-[#1E2A45] rounded-lg px-4 py-3 mb-3"
              >
                <div>
                  <p className="text-sm text-[#E8ECF4] font-medium">
                    {factor.friendly_name ?? 'Authenticator App'}
                  </p>
                  <p className="text-xs text-[#6B7A99]">
                    Added {new Date(factor.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleUnenroll(factor.id)}
                  className="text-sm text-[#EF4444] hover:underline transition-colors"
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
