'use client'

import Link from 'next/link'
import { createClient } from '../../supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import { UserCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DashboardNavbar() {
  const supabase = createClient()
  const router = useRouter()

  return (
    <nav className="w-full border-b border-border bg-card py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" prefetch className="font-syne text-xl font-bold text-foreground hover:text-primary transition-colors">
            Centerbase
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/dashboard/accounts"
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
            >
              Accounts
            </Link>
            <Link
              href="/dashboard/bookkeeping"
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
            >
              Bookkeeping
            </Link>
            <Link
              href="/dashboard/reports"
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] px-3 py-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors"
            >
              Reports
            </Link>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <UserCircle className="h-6 w-6 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={async () => {
                await supabase.auth.signOut()
                router.push('/sign-in')
              }}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
