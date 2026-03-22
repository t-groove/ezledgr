"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteTeamMember,
  removeTeamMember,
  updateMemberRole,
  cancelInvitation,
} from "@/lib/business/actions";
import type { Business, TeamMember, BusinessInvitation } from "@/lib/business/actions";
import { UserMinus, Crown, RotateCcw, X } from "lucide-react";

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

function getStatus(member: TeamMember) {
  if (member.is_active && member.accepted_at) return { label: "Active",  color: "text-[#22C55E]" };
  if (!member.is_active)                      return { label: "Pending", color: "text-[#F59E0B]" };
  return { label: "Active", color: "text-[#22C55E]" };
}

interface Props {
  business:      Business;
  members:       TeamMember[];
  invitations:   BusinessInvitation[];
  currentUserId: string;
}

export default function TeamClient({
  business,
  members:     initialMembers,
  invitations: initialInvitations,
  currentUserId,
}: Props) {
  const router = useRouter();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const [members,     setMembers]     = useState<TeamMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<BusinessInvitation[]>(initialInvitations);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState("bookkeeper");
  const [invitePending,  startInviteTransition]  = useTransition();
  const [memberPending,  startMemberTransition]  = useTransition();

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

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

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
                  className="w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-sm
                    rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF]
                    placeholder:text-[#6B7A99]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6B7A99] mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-sm
                    rounded-lg px-3 py-2 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={invitePending}
                className="px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50
                  text-white text-sm font-medium rounded-lg transition-colors"
              >
                {invitePending ? "Sending…" : "Send Invite"}
              </button>
            </form>
          </div>
        )}

        {/* Members table */}
        <div className="bg-[#111827] border border-[#1E2A45] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1E2A45]">
            <h2 className="font-syne text-lg font-semibold text-[#E8ECF4]">Team Members</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2A45]">
                  <th className="text-left px-6 py-3 text-[#6B7A99] font-medium">Name / Email</th>
                  <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">Status</th>
                  {isOwner && (
                    <th className="text-right px-6 py-3 text-[#6B7A99] font-medium">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-[#1E2A45] last:border-0
                      hover:bg-[#1E2A45]/20 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-[#E8ECF4]">{member.display_name}</p>
                        {member.email && member.email !== member.display_name && (
                          <p className="text-xs text-[#6B7A99]">{member.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                            text-xs font-medium ${ROLE_BADGE[member.role] ?? ROLE_BADGE.readonly}`}
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
                              onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                              disabled={memberPending}
                              className="bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4]
                                text-xs rounded-lg px-2 py-1 focus:outline-none
                                focus:border-[#4F7FFF] cursor-pointer disabled:opacity-50"
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={memberPending}
                              className="p-1.5 text-[#6B7A99] hover:text-[#EF4444]
                                hover:bg-[#EF4444]/10 rounded-lg transition-colors
                                disabled:opacity-50"
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
                    <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">Invited</th>
                    <th className="text-left px-4 py-3 text-[#6B7A99] font-medium">Expires</th>
                    {isOwner && (
                      <th className="text-right px-6 py-3 text-[#6B7A99] font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const isExpired = new Date(inv.expires_at) < new Date();
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[#1E2A45] last:border-0
                          hover:bg-[#1E2A45]/20 transition-colors"
                      >
                        <td className="px-6 py-3 text-[#E8ECF4]">{inv.invited_email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                              ${ROLE_BADGE[inv.role] ?? ROLE_BADGE.readonly}`}
                          >
                            {ROLE_LABEL[inv.role] ?? inv.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7A99] text-xs">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${isExpired ? "text-[#EF4444]" : "text-[#6B7A99]"}`}>
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
                                className="p-1.5 text-[#6B7A99] hover:text-[#4F7FFF]
                                  hover:bg-[#4F7FFF]/10 rounded-lg transition-colors
                                  disabled:opacity-50"
                                title="Resend invitation"
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                onClick={() => handleCancelInvite(inv.id)}
                                disabled={memberPending}
                                className="p-1.5 text-[#6B7A99] hover:text-[#EF4444]
                                  hover:bg-[#EF4444]/10 rounded-lg transition-colors
                                  disabled:opacity-50"
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
    </>
  );
}
