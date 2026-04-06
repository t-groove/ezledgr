'use client'

// Mobile responsiveness is a future task — sidebar is desktop-only for now.

import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../supabase/client'
import { useBusinessContext } from '@/lib/business/context'
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart2,
  Wallet,
  BookOpen,
  Users,
  Briefcase,
  Settings,
  LogOut,
  UserCircle,
  ChevronDown,
  Check,
  Building2,
  ChevronsUpDown,
  BookUser,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/dashboard',                    icon: LayoutDashboard },
  { label: 'Transactions',    href: '/dashboard/bookkeeping',         icon: ArrowLeftRight  },
  { label: 'Reports',         href: '/dashboard/reports',             icon: BarChart2       },
  { label: 'Accounts',        href: '/dashboard/accounts',            icon: Wallet          },
  { label: 'Journal Entries', href: '/dashboard/journal-entries',     icon: BookOpen        },
  { label: 'Team Members',    href: '/dashboard/settings/team',       icon: Users           },
  { label: 'Contacts',        href: '/dashboard/contacts',            icon: BookUser        },
  { label: 'Businesses',      href: '/dashboard/businesses',          icon: Briefcase       },
] as const

export default function DashboardSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [email,       setEmail]       = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const { currentBusiness, businesses, switchBusiness, isLoading } = useBusinessContext()
  const [bizDropOpen, setBizDropOpen] = useState(false)
  const bizDropRef = useRef<HTMLDivElement>(null)

  // ── Fetch user profile on mount ───────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      setEmail(user.email ?? null)
      supabase
        .from('users')
        .select('avatar_url, image, name, full_name')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: row }) => {
          const url = row?.avatar_url ?? row?.image ?? null
          if (url) setAvatarUrl(url)
          const name = row?.name ?? row?.full_name
          if (name) setDisplayName(name)
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Keep avatar in sync after settings-page upload ───────────────────────
  useEffect(() => {
    function onAvatarUpdated(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url
      if (url) setAvatarUrl(url)
    }
    window.addEventListener('avatar-updated', onAvatarUpdated)
    return () => window.removeEventListener('avatar-updated', onAvatarUpdated)
  }, [])

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false)
      if (bizDropRef.current && !bizDropRef.current.contains(e.target as Node))
        setBizDropOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Exact match for /dashboard, prefix match for everything else
  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const navLabel = displayName ?? email?.split('@')[0] ?? 'Account'

  return (
    <aside className="fixed inset-y-0 left-0 w-[240px] bg-[#193764] border-r border-white/10 flex flex-col z-40">

      {/* ── Wordmark ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5 border-b border-[#1E2A45]">
        <Link
          href="/dashboard"
          className="text-xl font-medium text-white hover:text-white/80 transition-colors"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          EZ Ledgr
        </Link>
      </div>

      {/* ── Business selector ────────────────────────────────────────────── */}
      {!isLoading && (currentBusiness || businesses.length > 0) && (
        <div className="px-3 pt-3 pb-2 border-b border-[#1E2A45]" ref={bizDropRef}>
          {businesses.length > 1 ? (
            <div className="relative">
              <button
                onClick={() => setBizDropOpen(o => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1E2A45]
                  hover:border-[#4F7FFF]/50 hover:bg-[#1E2A45] transition-colors text-left"
              >
                <Building2 size={13} className="text-[#6B7A99] flex-shrink-0" />
                <span className="flex-1 text-xs font-medium text-[#E8ECF4] truncate">
                  {currentBusiness?.name ?? '—'}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-[#6B7A99] flex-shrink-0 transition-transform ${
                    bizDropOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {bizDropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border
                  border-[#1E2A45] rounded-lg shadow-xl z-50 py-1">
                  {businesses.map(bm => (
                    <button
                      key={bm.business_id}
                      onClick={() => { setBizDropOpen(false); switchBusiness(bm.business_id, bm.business.name) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#E8ECF4]
                        hover:bg-[#1E2A45] transition-colors text-left"
                    >
                      <Building2 size={12} className="text-[#6B7A99] flex-shrink-0" />
                      <span className="flex-1 truncate">{bm.business.name}</span>
                      {bm.business_id === currentBusiness?.id && (
                        <Check size={12} className="text-[#4F7FFF] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-[#1E2A45] mt-1 pt-1">
                    <Link
                      href="/dashboard/businesses"
                      onClick={() => setBizDropOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#6B7A99]
                        hover:text-[#E8ECF4] hover:bg-[#1E2A45] transition-colors"
                    >
                      <ChevronsUpDown size={12} className="flex-shrink-0" />
                      Manage businesses
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard/settings/business"
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1E2A45] transition-colors min-w-0"
              >
                <Building2 size={13} className="text-[#6B7A99] flex-shrink-0" />
                <span className="text-xs font-medium text-[#E8ECF4] truncate">
                  {currentBusiness?.name ?? '—'}
                </span>
              </Link>
              <Link
                href="/dashboard/businesses"
                title="Manage businesses"
                className="p-1.5 rounded-lg text-[#6B7A99] hover:text-[#E8ECF4] hover:bg-[#1E2A45]
                  transition-colors flex-shrink-0"
              >
                <ChevronsUpDown size={13} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Nav items ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#2F7FC8] text-white font-medium'
                  : 'text-[#b8ccdf] hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Icon
                size={17}
                className={`flex-shrink-0 ${active ? 'text-white' : 'text-[#b8ccdf]'}`}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── User section ─────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.12] px-3 py-3 relative" ref={userMenuRef}>

        {/* Dropdown — opens upward */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#111827] border
            border-[#1E2A45] rounded-lg shadow-xl py-1 z-50">
            <button
              onClick={() => { setUserMenuOpen(false); router.push('/dashboard/settings') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#E8ECF4]
                hover:bg-[#1E2A45] transition-colors text-left"
            >
              <Settings size={15} className="text-[#6B7A99]" />
              Settings
            </button>
            <div className="my-1 border-t border-[#1E2A45]" />
            <button
              onClick={async () => {
                setUserMenuOpen(false)
                await supabase.auth.signOut()
                router.push('/')
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#EF4444]
                hover:bg-[#EF4444]/10 transition-colors text-left"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setUserMenuOpen(o => !o)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg
            hover:bg-[#1E2A45] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[#1E2A45] flex items-center justify-center
            flex-shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  setAvatarUrl(null)
                }}
              />
            ) : (
              <UserCircle size={20} className="text-[#6B7A99]" />
            )}
          </div>
          <p className="flex-1 text-sm text-[#E8ECF4] font-medium truncate min-w-0">
            {navLabel}
          </p>
          <ChevronDown
            size={14}
            className={`text-[#6B7A99] flex-shrink-0 transition-transform ${
              userMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
    </aside>
  )
}
