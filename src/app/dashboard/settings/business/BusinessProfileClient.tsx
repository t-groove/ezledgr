"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusiness } from "@/lib/business/actions";
import type { Business } from "@/lib/business/actions";

const ENTITY_TYPES = [
  "LLC", "S-Corp", "C-Corp", "Sole Proprietor",
  "Partnership", "Non-Profit", "Other",
];

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[#6B7A99] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

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

export default function BusinessProfileClient({ business }: { business: Business }) {
  const router = useRouter();

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const [profileForm, setProfileForm] = useState({
    name:        business.name        ?? "",
    entity_type: business.entity_type ?? "LLC",
    industry:    business.industry    ?? "",
    phone:       business.phone       ?? "",
    address:     business.address     ?? "",
    city:        business.city        ?? "",
    state:       business.state       ?? "",
    zip:         business.zip         ?? "",
    website:     business.website     ?? "",
  });
  const [profilePending, startProfileTransition] = useTransition();

  function handleChange(key: string, value: string) {
    setProfileForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave(e: React.FormEvent) {
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

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-6 max-w-xl">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <FormField label="Business name *">
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              className="input-style"
            />
          </FormField>

          <FormField label="Entity type">
            <select
              value={profileForm.entity_type}
              onChange={(e) => handleChange("entity_type", e.target.value)}
              className="input-style"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Industry">
            <input
              type="text"
              value={profileForm.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              placeholder="e.g. Technology, Consulting"
              className="input-style"
            />
          </FormField>

          <FormField label="Phone">
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="input-style"
            />
          </FormField>

          <FormField label="Address">
            <input
              type="text"
              value={profileForm.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main St"
              className="input-style"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="City">
              <input
                type="text"
                value={profileForm.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="input-style"
              />
            </FormField>
            <FormField label="State">
              <input
                type="text"
                value={profileForm.state}
                onChange={(e) => handleChange("state", e.target.value)}
                maxLength={2}
                placeholder="CA"
                className="input-style"
              />
            </FormField>
            <FormField label="ZIP">
              <input
                type="text"
                value={profileForm.zip}
                onChange={(e) => handleChange("zip", e.target.value)}
                placeholder="90210"
                className="input-style"
              />
            </FormField>
          </div>

          <FormField label="Website">
            <input
              type="url"
              value={profileForm.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://example.com"
              className="input-style"
            />
          </FormField>

          <div className="pt-2">
            <button
              type="submit"
              disabled={profilePending}
              className="px-5 py-2.5 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50
                text-white text-sm font-medium rounded-lg transition-colors"
            >
              {profilePending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

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
        .input-style:focus { border-color: #4F7FFF; }
        .input-style::placeholder { color: #6B7A99; }
        select.input-style { cursor: pointer; }
      `}</style>
    </>
  );
}
