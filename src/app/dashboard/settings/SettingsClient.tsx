"use client";

import { useState, useTransition } from "react";
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
import { Trash2, UserMinus, AlertTriangle, X, Crown, RotateCcw } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"profile" | "team" | "danger">("profile");

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Profile tab state ──────────────────────────────────────────────────────
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
        // Refresh invitations
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
      // Cancel the existing invite so the duplicate check won't block re-send
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
        <div className="flex gap-2">
          <button className={tabClass("profile")} onClick={() => setActiveTab("profile")}>
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

        {/* ── Profile Tab ─────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
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
                          <div className="text-[#E8ECF4]">
                            {member.full_name || member.email || member.user_id.slice(0, 8)}
                          </div>
                          {member.full_name && member.email && (
                            <div className="text-xs text-[#6B7A99]">{member.email}</div>
                          )}
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
                          {member.accepted_at ? (
                            <span className="text-xs text-[#22C55E]">Active</span>
                          ) : (
                            <span className="text-xs text-[#F59E0B]">Pending</span>
                          )}
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

      {/* Inline styles for form inputs (avoids repeating Tailwind strings) */}
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
