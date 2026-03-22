'use client'

import Link from 'next/link'
import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '../../supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import { UserCircle, KeyRound, LogOut, ChevronDown, Settings, Check, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useBusinessContext } from '@/lib/business/context'

export default function DashboardNavbar() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { currentBusiness, currentRole, businesses, switchBusiness, isLoading } =
    useBusinessContext()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      setEmail(user.email ?? null)
      // Fetch avatar from public.users
      supabase
        .from('users')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row?.avatar_url) setAvatarUrl(row.avatar_url)
        })
    })
  }, [])

  // Keep the navbar avatar in sync when the user uploads a new photo on
  // the settings page without requiring a full page reload.
  useEffect(() => {
    function handleAvatarUpdate(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url
      if (url) setAvatarUrl(url)
    }
    window.addEventListener('avatar-updated', handleAvatarUpdate)
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate)
  }, [])

  // Close business dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBusinessDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navLinks = useMemo(() => {
    const all = [
      { label: 'Transactions', href: '/dashboard/bookkeeping',
        roles: ['owner', 'accountant', 'bookkeeper'] },
      { label: 'Reports', href: '/dashboard/reports',
        roles: ['owner', 'accountant', 'readonly'] },
      { label: 'Accounts', href: '/dashboard/accounts',
        roles: ['owner', 'accountant', 'bookkeeper'] },
      { label: 'Journal Entries', href: '/dashboard/journal-entries',
        roles: ['owner', 'accountant'] },
    ]

    if (!currentRole) return all
    return all.filter(link => link.roles.includes(currentRole))
  }, [currentRole])

  return (
    <nav className="w-full border-b border-[#1E2A45] bg-[#111827] py-4">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            prefetch
            className="font-syne text-xl font-bold text-[#E8ECF4] hover:text-[#4F7FFF] transition-colors"
          >
            EZ Ledgr
          </Link>

          {/* Business selector */}
          <div className="relative" ref={dropdownRef}>
            {isLoading ? (
              <div className="h-7 w-28 bg-[#1E2A45] rounded-md animate-pulse" />
            ) : businesses.length > 1 ? (
              <button
                onClick={() => setBusinessDropdownOpen((o) => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E2A45] hover:border-[#4F7FFF] hover:bg-[#1E2A45] transition-colors"
              >
                <Building2 size={13} className="text-[#6B7A99]" />
                <span className="text-[#E8ECF4] font-medium text-sm max-w-[140px] truncate">
                  {currentBusiness?.name ?? '—'}
                </span>
                <ChevronDown
                  size={13}
                  className={`text-[#6B7A99] transition-transform ${businessDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
            ) : currentBusiness ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                <Building2 size={13} className="text-[#6B7A99]" />
                <span className="text-[#E8ECF4] font-medium text-sm">{currentBusiness.name}</span>
              </div>
            ) : null}

            {/* Business switcher dropdown */}
            {businessDropdownOpen && businesses.length > 1 && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#111827] border border-[#1E2A45] rounded-lg shadow-xl z-50 py-1">
                {businesses.map((bm) => (
                  <button
                    key={bm.business_id}
                    onClick={() => {
                      setBusinessDropdownOpen(false)
                      switchBusiness(bm.business_id)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#E8ECF4] hover:bg-[#1E2A45] transition-colors text-left"
                  >
                    <Building2 size={13} className="text-[#6B7A99] flex-shrink-0" />
                    <span className="flex-1 truncate">{bm.business.name}</span>
                    {bm.business_id === currentBusiness?.id && (
                      <Check size={13} className="text-[#4F7FFF] flex-shrink-0" />
                    )}
                  </button>
                ))}
                <div className="border-t border-[#1E2A45] mt-1 pt-1">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setBusinessDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#4F7FFF] hover:bg-[#1E2A45] transition-colors"
                  >
                    + New Business
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Nav links — filtered by role */}
          <div className="flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#6B7A99] hover:text-[#E8ECF4] hover:bg-[#1E2A45]"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <UserCircle className="h-6 w-6" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[220px] bg-[#111827] border border-[#1E2A45] rounded-lg shadow-xl py-1 z-50"
          >
            {email && (
              <>
                <DropdownMenuLabel className="text-xs text-[#6B7A99] font-normal px-3 py-2 truncate">
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#1E2A45]" />
              </>
            )}
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#E8ECF4] hover:bg-[#1E2A45] cursor-pointer focus:bg-[#1E2A45] focus:text-[#E8ECF4]"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="h-4 w-4 text-[#6B7A99]" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#E8ECF4] hover:bg-[#1E2A45] cursor-pointer focus:bg-[#1E2A45] focus:text-[#E8ECF4]"
              onClick={() => router.push('/dashboard/change-password')}
            >
              <KeyRound className="h-4 w-4 text-[#6B7A99]" />
              Change password
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1E2A45]" />
            <DropdownMenuItem
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer focus:bg-[#EF4444]/10 focus:text-[#EF4444]"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
