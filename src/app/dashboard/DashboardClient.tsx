"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Tag,
  Building2,
  FileText,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import type { AccountSummary } from "./accounts/actions";
import { createBusiness } from "@/lib/business/actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCurrency(v: number) {
  return fmtCurrency.format(v);
}

function formatPct(v: number) {
  if (!isFinite(v)) return "—";
  return v.toFixed(1) + "%";
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const TYPE_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  credit_card: "Credit Card",
  cash: "Cash",
  other: "Other",
};

const TYPE_COLORS: Record<string, string> = {
  checking: "bg-[#4F7FFF]/10 text-[#4F7FFF]",
  savings: "bg-[#22C55E]/10 text-[#22C55E]",
  credit_card: "bg-purple-500/10 text-purple-400",
  cash: "bg-[#F59E0B]/10 text-[#F59E0B]",
  other: "bg-[#6B7A99]/20 text-[#6B7A99]",
};

const ENTITY_TYPES = [
  "LLC",
  "S-Corp",
  "C-Corp",
  "Sole Proprietor",
  "Partnership",
  "Non-Profit",
  "Other",
];

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
  iconBg: string;
  subtext: string;
}

function KpiCard({ label, value, color, icon, iconBg, subtext }: KpiCardProps) {
  return (
    <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm text-[#6B7A99]">{label}</p>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
      <p className="font-syne text-2xl font-bold leading-none" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-[#6B7A99]">{subtext}</p>
    </div>
  );
}

// ── Action Item Card ──────────────────────────────────────────────────────────

interface ActionItemProps {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  linkHref: string;
  linkLabel: string;
}

function ActionItem({
  color,
  bgColor,
  borderColor,
  icon,
  title,
  description,
  linkHref,
  linkLabel,
}: ActionItemProps) {
  return (
    <div
      className="flex items-start gap-4 rounded-xl p-5 border"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + "20" }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#E8ECF4] mb-0.5">{title}</p>
        <p className="text-xs text-[#6B7A99]">{description}</p>
      </div>
      <Link
        href={linkHref}
        className="text-sm font-medium whitespace-nowrap flex-shrink-0 hover:underline"
        style={{ color }}
      >
        {linkLabel}
      </Link>
    </div>
  );
}

// ── Onboarding Card ───────────────────────────────────────────────────────────

function OnboardingCard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("LLC");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createBusiness({ name: name.trim(), entity_type: entityType });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md bg-[#111827] border border-[#1E2A45] rounded-2xl p-8">
        <div className="w-12 h-12 rounded-full bg-[#4F7FFF]/10 flex items-center justify-center mb-6">
          <Building2 size={24} className="text-[#4F7FFF]" />
        </div>
        <h1 className="font-syne text-2xl font-bold text-[#E8ECF4] mb-1">
          Welcome to EZ Ledgr!
        </h1>
        <p className="text-sm text-[#6B7A99] mb-6">Let&apos;s set up your business.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[#6B7A99] mb-1.5">Business name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme LLC"
              required
              className="w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#4F7FFF] placeholder:text-[#6B7A99]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#6B7A99] mb-1.5">Entity type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#4F7FFF] cursor-pointer"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? "Creating..." : "Get Started"}
            {!isPending && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  ytdIncome: number;
  ytdExpenses: number;
  ytdProfit: number;
  profitMargin: number;
  bankAccounts: AccountSummary[];
  uncategorizedCount: number;
  userName: string;
  currentYear: number;
  hasBusiness: boolean;
  showOnboarding?: boolean;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardClient({
  ytdIncome,
  ytdExpenses,
  ytdProfit,
  profitMargin,
  bankAccounts,
  uncategorizedCount,
  userName,
  currentYear,
  hasBusiness,
  showOnboarding = true,
}: Props) {
  if (!hasBusiness) {
    // Don't show onboarding for invited users whose membership row exists
    // but isn't active yet (race condition after accepting invite)
    return showOnboarding ? <OnboardingCard /> : null;
  }

  const today = new Date();
  const periodLabel = `Jan 1 – ${today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  return (
    <div className="flex flex-col gap-10">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header>
        <h1 className="font-syne text-3xl font-bold text-[#E8ECF4]">
          {greeting()}, {userName}
        </h1>
        <p className="text-sm text-[#6B7A99] mt-1">
          Here&apos;s your business overview for {currentYear}
        </p>
      </header>

      {/* ── Section 1: YTD P&L ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-syne text-xl font-semibold text-[#E8ECF4]">
            Year-to-date Performance
          </h2>
          <Link href="/dashboard/reports" className="text-sm text-[#4F7FFF] hover:underline">
            View full report →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="YTD Revenue"
            value={formatCurrency(ytdIncome)}
            color="#22C55E"
            iconBg="bg-[#22C55E]/10"
            icon={<TrendingUp size={18} className="text-[#22C55E]" />}
            subtext={periodLabel}
          />
          <KpiCard
            label="YTD Expenses"
            value={formatCurrency(ytdExpenses)}
            color="#EF4444"
            iconBg="bg-[#EF4444]/10"
            icon={<TrendingDown size={18} className="text-[#EF4444]" />}
            subtext={periodLabel}
          />
          <KpiCard
            label="Net Profit"
            value={formatCurrency(ytdProfit)}
            color={ytdProfit >= 0 ? "#22C55E" : "#EF4444"}
            iconBg={ytdProfit >= 0 ? "bg-[#22C55E]/10" : "bg-[#EF4444]/10"}
            icon={
              <DollarSign
                size={18}
                style={{ color: ytdProfit >= 0 ? "#22C55E" : "#EF4444" }}
              />
            }
            subtext={periodLabel}
          />
          <KpiCard
            label="Profit Margin"
            value={ytdIncome > 0 ? formatPct(profitMargin) : "—"}
            color={
              ytdIncome === 0 ? "#6B7A99" : profitMargin >= 0 ? "#22C55E" : "#EF4444"
            }
            iconBg={
              ytdIncome === 0
                ? "bg-[#6B7A99]/10"
                : profitMargin >= 0
                ? "bg-[#22C55E]/10"
                : "bg-[#EF4444]/10"
            }
            icon={
              <Percent
                size={18}
                style={{
                  color:
                    ytdIncome === 0
                      ? "#6B7A99"
                      : profitMargin >= 0
                      ? "#22C55E"
                      : "#EF4444",
                }}
              />
            }
            subtext={periodLabel}
          />
        </div>
      </section>

      {/* ── Section 2: Action Items ───────────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="font-syne text-xl font-semibold text-[#E8ECF4]">Action Items</h2>
          <p className="text-sm text-[#6B7A99] mt-0.5">Things that need your attention</p>
        </div>

        <div className="flex flex-col gap-3">
          {uncategorizedCount === 0 && bankAccounts.length > 0 && (
            <ActionItem
              color="#22C55E"
              bgColor="#22C55E0D"
              borderColor="#22C55E30"
              icon={<CheckCircle size={20} />}
              title="You're all caught up!"
              description="All transactions are categorized and your accounts are connected."
              linkHref="/dashboard/bookkeeping"
              linkLabel="View transactions →"
            />
          )}

          {uncategorizedCount > 0 && (
            <ActionItem
              color="#F59E0B"
              bgColor="#F59E0B0D"
              borderColor="#F59E0B30"
              icon={<Tag size={20} />}
              title={`${uncategorizedCount} transaction${uncategorizedCount !== 1 ? "s" : ""} need categorization`}
              description="Uncategorized transactions affect the accuracy of your P&L report."
              linkHref="/dashboard/bookkeeping?category=Uncategorized"
              linkLabel="Categorize now →"
            />
          )}

          {bankAccounts.length === 0 && (
            <ActionItem
              color="#4F7FFF"
              bgColor="#4F7FFF0D"
              borderColor="#4F7FFF30"
              icon={<Building2 size={20} />}
              title="Connect your first bank account"
              description="Add a bank account to start organizing your transactions."
              linkHref="/dashboard/accounts"
              linkLabel="Add account →"
            />
          )}

          <ActionItem
            color="#4F7FFF"
            bgColor="#4F7FFF0D"
            borderColor="#4F7FFF30"
            icon={<FileText size={20} />}
            title="View your P&L report"
            description="See your full profit and loss breakdown with charts and category analysis."
            linkHref="/dashboard/reports"
            linkLabel="View report →"
          />
        </div>
      </section>

      {/* ── Section 3: Bank Accounts ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-syne text-xl font-semibold text-[#E8ECF4]">Bank Accounts</h2>
          <Link href="/dashboard/accounts" className="text-sm text-[#4F7FFF] hover:underline">
            Manage accounts →
          </Link>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="bg-[#111827] border border-[#1E2A45] rounded-xl p-8 text-center">
            <Building2 size={32} className="text-[#6B7A99] mx-auto mb-3" />
            <p className="text-[#E8ECF4] font-medium mb-1">No bank accounts connected yet</p>
            <p className="text-sm text-[#6B7A99] mb-4">
              Add a bank account to start organizing your transactions.
            </p>
            <Link
              href="/dashboard/accounts"
              className="inline-flex items-center px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add account
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-[#111827] border border-[#1E2A45] rounded-xl p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-1">
                  {acc.bank_name && acc.bank_name !== "None" ? (
                    <p className="text-xs text-[#6B7A99]">{acc.bank_name}</p>
                  ) : (
                    <span />
                  )}
                  {acc.transaction_count > 0 && (
                    <p
                      className={`font-syne font-bold text-2xl leading-none mt-1 ${
                        acc.net > 0
                          ? "text-[#22C55E]"
                          : acc.net < 0
                          ? "text-[#EF4444]"
                          : "text-[#6B7A99]"
                      }`}
                    >
                      {acc.net > 0 ? "+" : ""}
                      {formatCurrency(acc.net)}
                    </p>
                  )}
                </div>
                <p className="font-syne font-semibold text-[#E8ECF4] text-base mb-3">{acc.name}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      TYPE_COLORS[acc.account_type] ?? TYPE_COLORS.other
                    }`}
                  >
                    {TYPE_LABELS[acc.account_type] ?? "Other"}
                  </span>
                  {acc.last_four && (
                    <span className="text-sm text-[#6B7A99] font-mono">
                      ••••{acc.last_four}
                    </span>
                  )}
                  {acc.is_plaid_connected && (
                    <span className="flex items-center gap-1 text-xs text-[#22C55E]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <Link
                  href={`/dashboard/bookkeeping?account=${acc.id}`}
                  className="text-sm text-[#4F7FFF] hover:underline mt-auto"
                >
                  View transactions →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
