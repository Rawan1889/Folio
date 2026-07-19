'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BedDouble, CalendarDays, Users, Receipt, BarChart3, Settings, Hotel, LogOut, Menu, Plus, ChevronDown, Check, LayoutGrid, Search, UserCheck, Sparkles, Moon, Users2, Tag, Globe } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/translations'

const nav: { href: string; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { href: '/dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard },
  { href: '/dashboard/checkin', labelKey: 'nav_checkin', icon: UserCheck },
  { href: '/dashboard/rooms/board', labelKey: 'nav_room_board', icon: LayoutGrid },
  { href: '/dashboard/rooms', labelKey: 'nav_rooms', icon: BedDouble },
  { href: '/dashboard/bookings', labelKey: 'nav_bookings', icon: CalendarDays },
  { href: '/dashboard/guests', labelKey: 'nav_guests', icon: Users },
  { href: '/dashboard/search', labelKey: 'nav_search', icon: Search },
  { href: '/dashboard/housekeeping', labelKey: 'nav_housekeeping', icon: Sparkles },
  { href: '/dashboard/audit', labelKey: 'nav_night_audit', icon: Moon },
  { href: '/dashboard/finance', labelKey: 'nav_finance', icon: Receipt },
  { href: '/dashboard/rates', labelKey: 'nav_rate_plans', icon: Tag },
  { href: '/dashboard/channels', labelKey: 'nav_channels', icon: Globe },
  { href: '/dashboard/staff', labelKey: 'nav_staff', icon: Users2 },
  { href: '/dashboard/reports', labelKey: 'nav_reports', icon: BarChart3 },
  { href: '/dashboard/settings', labelKey: 'nav_settings', icon: Settings },
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
  const { t } = useT()
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
          {isSuperAdmin && <p className="text-[10px]" style={{ color: 'var(--amber)' }}>{t('nav_super_admin')}</p>}
        </div>
      </div>

      {/* Hotel section header */}
      <div className="flex items-center justify-between px-2 mt-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{t('nav_hotel')}</span>
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
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{t('nav_menu')}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {(() => {
          // Pick the single longest-matching href so nested routes highlight only their most specific entry
          const bestMatch = nav
            .filter(n => pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href + '/')))
            .sort((a, b) => b.href.length - a.href.length)[0]?.href
          return nav.map(({ href, labelKey, icon: Icon }) => {
            const active = href === bestMatch
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
                {t(labelKey)}
              </Link>
            )
          })
        })()}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted-2)' }}>{t('nav_super_admin')}</p>
            </div>
            <Link
              href="/dashboard/hotels"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-white/[0.04] transition-all"
              style={{ color: 'var(--muted)' }}
            >
              <Hotel size={16} />
              {t('nav_all_hotels')}
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <button onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-white/[0.04]"
        style={{ color: 'var(--muted)' }}>
        <LogOut size={16} />
        {t('nav_log_out')}
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
