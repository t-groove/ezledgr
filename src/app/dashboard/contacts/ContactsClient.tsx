"use client";

import { useState } from "react";
import { Users, Pencil, Trash2, Plus, X } from "lucide-react";
import { deleteContact } from "./actions";
import type { Contact } from "./actions";
import ContactFormModal from "./ContactFormModal";

interface ToastState {
  message: string;
  type: "success" | "error";
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
        toast.type === "success"
          ? "bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]"
          : "bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]"
      }`}
    >
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

type FilterTab = "all" | "customer" | "vendor";

const TYPE_BADGE: Record<string, string> = {
  customer: "bg-[#22C55E]/10 text-[#22C55E]",
  vendor: "bg-[#4F7FFF]/10 text-[#4F7FFF]",
  both: "bg-[#6B7280]/10 text-[#6B7280]",
};

const TYPE_LABEL: Record<string, string> = {
  customer: "Customer",
  vendor: "Vendor",
  both: "Both",
};

interface ContactsClientProps {
  initialContacts: Contact[];
}

export default function ContactsClient({ initialContacts }: ContactsClientProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = contacts.filter((c) => {
    if (filterTab === "all") return true;
    if (filterTab === "customer") return c.type === "customer" || c.type === "both";
    if (filterTab === "vendor") return c.type === "vendor" || c.type === "both";
    return true;
  });

  const handleSaved = (contact: Contact) => {
    setContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === contact.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = contact;
        return next;
      }
      return [...prev, contact].sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      );
    });
    setShowModal(false);
    setEditingContact(undefined);
    showToast(editingContact ? "Contact updated" : "Contact created");
  };

  const handleDeleteConfirm = async (id: string) => {
    setDeletingId(id);
    const result = await deleteContact(id);
    if (result.success) {
      setContacts((prev) => prev.filter((c) => c.id !== id));
      showToast("Contact deleted");
    } else {
      showToast(result.error ?? "Failed to delete contact", "error");
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingContact(undefined);
    setShowModal(true);
  };

  const tabCls = (tab: FilterTab) =>
    `px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      filterTab === tab
        ? "bg-[#e8eef6] text-[#193764]"
        : "text-[#6B7280] hover:text-[#193764]"
    }`;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-syne text-3xl font-bold text-[#193764]">Contacts</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage your customers, vendors, and other contacts
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white font-medium text-sm rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={15} />
          Add Contact
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5">
        <button className={tabCls("all")} onClick={() => setFilterTab("all")}>
          All{" "}
          <span className="ml-1 text-xs text-[#6B7280]">({contacts.length})</span>
        </button>
        <button className={tabCls("customer")} onClick={() => setFilterTab("customer")}>
          Customers
        </button>
        <button className={tabCls("vendor")} onClick={() => setFilterTab("vendor")}>
          Vendors
        </button>
      </div>

      {/* Empty state */}
      {contacts.length === 0 ? (
        <div className="bg-white border border-[#dde4ef] rounded-xl flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#e8eef6] flex items-center justify-center mb-4">
            <Users size={28} className="text-[#6B7280]" />
          </div>
          <p className="font-syne font-semibold text-[#193764] text-lg mb-1">No contacts yet</p>
          <p className="text-sm text-[#6B7280] mb-5">
            Add customers, vendors, and other contacts to link them to transactions.
          </p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white font-medium text-sm rounded-lg transition-colors"
          >
            <Plus size={15} />
            Add your first contact
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#dde4ef] rounded-xl flex items-center justify-center py-16">
          <p className="text-[#6B7280]">No contacts match this filter.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#dde4ef] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dde4ef] bg-[#e8eef6]">
                  <th className="px-5 py-3 text-left text-[#6B7280] font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-[#6B7280] font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-[#6B7280] font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-[#6B7280] font-medium">Phone</th>
                  <th className="px-4 py-3 text-right text-[#6B7280] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#dde4ef] last:border-0 hover:bg-[#f0f4fa] group"
                  >
                    {/* Name */}
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#193764]">{c.display_name}</p>
                      {c.company_name && (
                        <p className="text-xs text-[#6B7280] mt-0.5">{c.company_name}</p>
                      )}
                    </td>

                    {/* Type badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          TYPE_BADGE[c.type] ?? TYPE_BADGE.both
                        }`}
                      >
                        {TYPE_LABEL[c.type] ?? "Both"}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-[#6B7280]">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="hover:text-[#193764] transition-colors"
                        >
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-[#1E2A45]">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-[#6B7280]">
                      {c.phone || c.mobile ? (
                        <span>{c.phone || c.mobile}</span>
                      ) : (
                        <span className="text-[#1E2A45]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      {confirmDeleteId === c.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-[#6B7280]">Delete?</span>
                          <button
                            onClick={() => handleDeleteConfirm(c.id)}
                            disabled={deletingId === c.id}
                            className="px-2.5 py-1 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-xs rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === c.id ? "Deleting…" : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 border border-[#dde4ef] text-[#6B7280] hover:text-[#193764] text-xs rounded-lg transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded text-[#6B7280] hover:text-[#4F7FFF] hover:bg-[#4F7FFF]/10 transition-colors"
                            title="Edit contact"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="p-1.5 rounded text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                            title="Delete contact"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => {
            setShowModal(false);
            setEditingContact(undefined);
          }}
          onSaved={handleSaved}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
