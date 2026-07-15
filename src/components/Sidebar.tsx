'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BedDouble, CalendarDays, Users, Receipt, BarChart3, Settings, ChevronDown, Hotel, LogOut, Menu } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/rooms', label: 'Rooms', icon: BedDouble },
  { href: '/dashboard/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/dashboard/guests', label: 'Guests', icon: Users },
  { href: '/dashboard/finance', label: 'Finance', icon: Receipt },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  hotelName?: string
  userName?: string
  isSuperAdmin?: boolean
  hotelId?: string | null
}

export default function Sidebar({ hotelName = 'No Hotel', userName = 'Admin', isSuperAdmin, hotelId }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--amber)' }}>
            <span className="text-black font-bold text-xs">F</span>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--cream)' }}>Folio</span>
          {isSuperAdmin && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>SUPER</span>
          )}
        </div>
      </div>

      <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <button className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-white/5">
          <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
            <Hotel size={13} style={{ color: 'var(--amber)' }} />
          </div>
          <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--cream)' }}>{hotelName}</span>
          <ChevronDown size={13} style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all', active ? 'font-medium' : 'hover:bg-white/5')}
              style={active ? { background: 'var(--amber-dim)', color: 'var(--amber)' } : { color: 'var(--muted)' }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}

        {isSuperAdmin && (
          <>
            <div className="pt-3 pb-1 px-2.5">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Super Admin</p>
            </div>
            <Link
              href="/dashboard/hotels"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm hover:bg-white/5 transition-all"
              style={{ color: 'var(--muted)' }}
            >
              <Hotel size={15} />
              All Hotels
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--amber)' }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm flex-1 truncate" style={{ color: 'var(--cream)' }}>{userName}</span>
          <button onClick={handleLogout} className="p-1 rounded transition-colors hover:bg-white/5" style={{ color: 'var(--muted)' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 h-screen sticky top-0" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <SidebarContent />
      </aside>

      <div className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--amber)' }}>
            <span className="text-black font-bold text-[10px]">F</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>Folio</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg" style={{ color: 'var(--muted)' }}>
          <Menu size={18} />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full flex flex-col" style={{ background: 'var(--surface)' }}>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
