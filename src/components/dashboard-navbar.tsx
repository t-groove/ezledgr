'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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
import { UserCircle, KeyRound, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardNavbar() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  return (
    <nav className="w-full border-b border-[#1E2A45] bg-[#111827] py-4">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" prefetch className="font-syne text-xl font-bold text-[#E8ECF4] hover:text-[#4F7FFF] transition-colors">
            Centerbase
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/bookkeeping"
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
            >
              Transactions
            </Link>
            <Link
              href="/dashboard/reports"
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
            >
              Reports
            </Link>
            <Link
              href="/dashboard/accounts"
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
            >
              Accounts
            </Link>
            <Link
              href="/dashboard/journal-entries"
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
            >
              Journal Entries
            </Link>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-[#6B7A99] hover:text-[#E8ECF4] hover:bg-[#1E2A45]">
              <UserCircle className="h-6 w-6" />
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
