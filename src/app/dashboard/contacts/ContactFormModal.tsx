"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { createContact, updateContact } from "./actions";
import type { Contact, ContactFormData } from "./actions";

interface ContactFormModalProps {
  contact?: Contact;
  initialName?: string;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}

const emptyForm = (): ContactFormData => ({
  type: "both",
  title: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  company_name: "",
  display_name: "",
  print_on_checks_name: "",
  email: "",
  cc_email: "",
  bcc_email: "",
  phone: "",
  mobile: "",
  fax: "",
  other_phone: "",
  website: "",
  notes: "",
});

export default function ContactFormModal({
  contact,
  initialName,
  onClose,
  onSaved,
}: ContactFormModalProps) {
  const isEditing = !!contact;

  const [form, setForm] = useState<ContactFormData>(() => {
    if (contact) {
      return {
        type: contact.type,
        title: contact.title ?? "",
        first_name: contact.first_name ?? "",
        middle_name: contact.middle_name ?? "",
        last_name: contact.last_name ?? "",
        suffix: contact.suffix ?? "",
        company_name: contact.company_name ?? "",
        display_name: contact.display_name,
        print_on_checks_name: contact.print_on_checks_name ?? "",
        email: contact.email ?? "",
        cc_email: contact.cc_email ?? "",
        bcc_email: contact.bcc_email ?? "",
        phone: contact.phone ?? "",
        mobile: contact.mobile ?? "",
        fax: contact.fax ?? "",
        other_phone: contact.other_phone ?? "",
        website: contact.website ?? "",
        notes: contact.notes ?? "",
      };
    }
    const f = emptyForm();
    if (initialName) f.display_name = initialName;
    return f;
  });

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-populate display name from name parts (only when not editing and not already set by user)
  const [displayNameTouched, setDisplayNameTouched] = useState(isEditing || !!initialName);

  useEffect(() => {
    if (displayNameTouched) return;
    const parts = [form.first_name, form.middle_name, form.last_name]
      .filter(Boolean)
      .join(" ");
    const auto = parts || form.company_name || "";
    if (auto) setForm((f) => ({ ...f, display_name: auto }));
  }, [form.first_name, form.middle_name, form.last_name, form.company_name, displayNameTouched]);

  const set = (field: keyof ContactFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.display_name.trim()) {
      setError("Display name is required.");
      return;
    }
    setError(null);
    setIsSaving(true);

    let result: { success: boolean; contact?: Contact; error?: string };
    if (isEditing) {
      const updateResult = await updateContact(contact.id, form);
      result = updateResult.success
        ? { success: true, contact: { ...contact, ...form } as Contact }
        : updateResult;
    } else {
      result = await createContact(form);
    }

    if (result.success && result.contact) {
      onSaved(result.contact);
    } else {
      setError(result.error ?? "Failed to save contact.");
    }
    setIsSaving(false);
  };

  const inputCls =
    "w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0F1E]/80 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-[#1E2A45] rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2A45] flex-shrink-0">
          <h2 className="font-sans font-bold text-lg text-[#E8ECF4]">
            {isEditing ? "Edit Contact" : "New Contact"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7A99] hover:text-[#E8ECF4] hover:bg-[#1E2A45] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Contact type */}
          <div>
            <label className="text-xs font-medium text-[#6B7A99] uppercase tracking-wide block mb-2">
              Contact Type
            </label>
            <div className="flex gap-3">
              {(["customer", "vendor", "both"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={() => setForm((f) => ({ ...f, type: t }))}
                    className="accent-[#4F7FFF]"
                  />
                  <span className="text-sm text-[#E8ECF4] capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Name section */}
          <div>
            <p className="text-xs font-medium text-[#6B7A99] uppercase tracking-wide mb-3">Name</p>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Title</label>
                  <input type="text" value={form.title} onChange={set("title")} placeholder="Mr." className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">First name</label>
                  <input type="text" value={form.first_name} onChange={set("first_name")} placeholder="Jane" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Middle name</label>
                  <input type="text" value={form.middle_name} onChange={set("middle_name")} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Last name</label>
                  <input type="text" value={form.last_name} onChange={set("last_name")} placeholder="Doe" className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Suffix</label>
                  <input type="text" value={form.suffix} onChange={set("suffix")} placeholder="Jr., III" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Company name</label>
                  <input type="text" value={form.company_name} onChange={set("company_name")} placeholder="Acme Corp" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">
                  Display name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => {
                    setDisplayNameTouched(true);
                    set("display_name")(e);
                  }}
                  placeholder="How this contact appears in lists"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">Name to print on checks</label>
                <input type="text" value={form.print_on_checks_name} onChange={set("print_on_checks_name")} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div>
            <p className="text-xs font-medium text-[#6B7A99] uppercase tracking-wide mb-3">Contact Info</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Email</label>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">CC email</label>
                  <input type="email" value={form.cc_email} onChange={set("cc_email")} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">BCC email</label>
                  <input type="email" value={form.bcc_email} onChange={set("bcc_email")} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Phone</label>
                  <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 (555) 000-0000" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Mobile</label>
                  <input type="tel" value={form.mobile} onChange={set("mobile")} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Fax</label>
                  <input type="tel" value={form.fax} onChange={set("fax")} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7A99] mb-1 block">Other phone</label>
                  <input type="tel" value={form.other_phone} onChange={set("other_phone")} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#6B7A99] mb-1 block">Website</label>
                <input type="url" value={form.website} onChange={set("website")} placeholder="https://example.com" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-[#6B7A99] uppercase tracking-wide mb-2 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={set("notes")}
              rows={3}
              placeholder="Internal notes about this contact"
              className="w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F7FFF] placeholder:text-[#6B7A99] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E2A45] flex-shrink-0">
          {error ? (
            <p className="text-sm text-[#EF4444]">{error}</p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#1E2A45] text-[#6B7A99] hover:text-[#E8ECF4] text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors"
            >
              {isSaving ? "Saving…" : "Save Contact"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
