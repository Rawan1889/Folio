'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BedDouble, CalendarDays, Users, Receipt, BarChart3, Settings, Hotel, LogOut, Menu, Plus, ChevronDown, Check } from 'lucide-react'
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
  const [hotelPickerOpen, setHotelPickerOpen] = useState(false)
  const [allHotels, setAllHotels] = useState<{ id: string; name: string }[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null)
  const [displayHotelName, setDisplayHotelName] = useState(hotelName)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSelectedHotelId(localStorage.getItem('folio_hotel_id'))
    }
  }, [])

  async function openHotelPicker() {
    if (allHotels.length === 0) {
      const supabase = createClient()
      const { data } = await supabase.from('hotels').select('id, name').order('name')
      setAllHotels(data ?? [])
    }
    setHotelPickerOpen(true)
  }

  function pickHotel(id: string, name: string) {
    localStorage.setItem('folio_hotel_id', id)
    setSelectedHotelId(id)
    setDisplayHotelName(name)
    setHotelPickerOpen(false)
    window.location.href = '/dashboard'
  }

  function clearHotelOverride() {
    localStorage.removeItem('folio_hotel_id')
    setSelectedHotelId(null)
    setDisplayHotelName(hotelName)
    setHotelPickerOpen(false)
    window.location.href = '/dashboard'
  }

  async function handleLogout() {
    if (isSupabaseConfigured()) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* User header */}
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden" style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--cream)' }}>{userName}</p>
          {isSuperAdmin && <p className="text-[10px]" style={{ color: 'var(--amber)' }}>Super Admin</p>}
        </div>
      </div>

      {/* Hotel section header */}
      <div className="flex items-center justify-between px-2 mt-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Hotel</span>
        <button className="w-5 h-5 rounded-md flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
          <Plus size={11} />
        </button>
      </div>

      {/* Hotel card */}
      <div
        className="glass px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/[0.06]"
        style={{ cursor: isSuperAdmin ? 'pointer' : 'default' }}
        onClick={isSuperAdmin ? openHotelPicker : undefined}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tile-orange)' }}>
          <Hotel size={13} style={{ color: '#1a1a1a' }} />
        </div>
        <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--cream)' }}>
          {selectedHotelId ? (allHotels.find(h => h.id === selectedHotelId)?.name ?? displayHotelName) : displayHotelName}
        </span>
        {isSuperAdmin && <ChevronDown size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
      </div>

      {/* Hotel picker dropdown */}
      {hotelPickerOpen && (
        <div className="glass-strong p-2 space-y-0.5">
          {allHotels.map(h => (
            <button key={h.id} onClick={() => pickHotel(h.id, h.name)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left hover:bg-white/[0.06]"
              style={{ color: 'var(--cream)' }}>
              <span className="truncate">{h.name}</span>
              {selectedHotelId === h.id && <Check size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
            </button>
          ))}
          {selectedHotelId && (
            <button onClick={clearHotelOverride}
              className="w-full px-3 py-2 rounded-xl text-xs text-left hover:bg-white/[0.06]"
              style={{ color: 'var(--muted)' }}>
              Reset to default
            </button>
          )}
        </div>
      )}

      {/* Nav section header */}
      <div className="px-2 mt-3">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Menu</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all', active ? 'font-medium' : 'hover:bg-white/[0.04]')}
              style={active
                ? { background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', backdropFilter: 'blur(10px)' }
                : { color: 'var(--muted)' }
              }
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted-2)' }}>Super Admin</p>
            </div>
            <Link
              href="/dashboard/hotels"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/[0.04] transition-all"
              style={{ color: 'var(--muted)' }}
            >
              <Hotel size={16} />
              All Hotels
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-white/[0.04]"
        style={{ color: 'var(--muted)' }}>
        <LogOut size={16} />
        Log out
      </button>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 glass-strong m-3" style={{ borderRadius: 24 }}>
        <SidebarContent />
      </aside>

      <div className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40 glass" style={{ borderRadius: 0 }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--tile-yellow)' }}>
            <span className="font-bold text-[11px]" style={{ color: '#1a1a1a' }}>F</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>Folio</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg" style={{ color: 'var(--muted)' }}>
          <Menu size={18} />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full flex flex-col glass-strong m-3">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
