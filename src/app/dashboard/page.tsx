'use client'

import { useEffect, useState } from 'react'
import { BedDouble, CalendarDays, DollarSign, TrendingUp, Upload, Sparkles, Award, Clock, LogIn, LogOut, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import Link from 'next/link'

type ActivityItem = {
  name: string
  msg: string
  time: string
  color: string
}

const tileColors = ['var(--tile-yellow)', 'var(--tile-orange)', 'var(--tile-purple)', 'var(--tile-green)', 'var(--tile-blue)', 'var(--tile-pink)']

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [hotelName, setHotelName] = useState('Your Hotel')
  const [hotelId, setHotelId] = useState<string | null>(null)

  // KPI state
  const [totalRooms, setTotalRooms] = useState(0)
  const [occupiedRooms, setOccupiedRooms] = useState(0)
  const [weekRevenue, setWeekRevenue] = useState(0)
  const [todayBookings, setTodayBookings] = useState(0)
  const [adr, setAdr] = useState(0)
  const [weeklyBars, setWeeklyBars] = useState<{ d: string; v: number }[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [arrivals, setArrivals] = useState<{ id: string; guest: string; room: string }[]>([])
  const [departures, setDepartures] = useState<{ id: string; guest: string; room: string }[]>([])

  useEffect(() => {
    async function load() {
      const hotel = await initHotel()
      if (!hotel?.hotelId) { setLoading(false); return }

      const supabase = createClient()
      const hId = hotel.hotelId
      setHotelId(hId)

      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

      const [
        { data: hotelRow },
        { data: rooms },
        { data: payments },
        { data: todayBkgs },
        { data: recentBkgs },
        { data: arrivalBkgs },
        { data: departureBkgs },
      ] = await Promise.all([
        supabase.from('hotels').select('name').eq('id', hId).single(),
        supabase.from('rooms').select('id, status').eq('hotel_id', hId),
        supabase.from('payments').select('amount, created_at').eq('hotel_id', hId).eq('status', 'completed').gte('created_at', weekAgo),
        supabase.from('bookings').select('id').eq('hotel_id', hId).eq('check_in', today),
        supabase.from('bookings').select('id, check_in, status, total_amount, guests(full_name), rooms(number)').eq('hotel_id', hId).order('created_at', { ascending: false }).limit(5),
        supabase.from('bookings').select('id, guests(full_name), rooms(number)').eq('hotel_id', hId).eq('check_in', today).eq('status', 'confirmed'),
        supabase.from('bookings').select('id, guests(full_name), rooms(number)').eq('hotel_id', hId).eq('check_out', today).eq('status', 'checked_in'),
      ])

      setHotelName(hotelRow?.name ?? 'Your Hotel')
      setTotalRooms(rooms?.length ?? 0)
      setOccupiedRooms(rooms?.filter(r => r.status === 'occupied').length ?? 0)
      setWeekRevenue(payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0)
      setTodayBookings(todayBkgs?.length ?? 0)

      // ADR from recent confirmed/checked_in bookings
      const activeBkgs = (recentBkgs ?? []).filter(b => ['confirmed', 'checked_in'].includes(b.status))
      const avgAdr = activeBkgs.length > 0 ? activeBkgs.reduce((s: number, b: { total_amount: number }) => s + b.total_amount, 0) / activeBkgs.length : 0
      setAdr(Math.round(avgAdr))

      // Build weekly bars from payments
      const barMap: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        barMap[d.toISOString().split('T')[0]] = 0
      }
      payments?.forEach(p => {
        const day = p.created_at?.slice(0, 10)
        if (day && day in barMap) barMap[day] += p.amount
      })
      setWeeklyBars(Object.entries(barMap).map(([date, v]) => ({
        d: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
        v: Math.round(v),
      })))

      // Activity feed from recent bookings
      const colorList = tileColors
      setActivity(
        (recentBkgs ?? []).slice(0, 5).map((b: { guests?: { full_name?: string } | null; status: string; check_in: string; rooms?: { number?: string } | null }, i: number) => {
          const guestName = (b.guests as { full_name?: string } | null)?.full_name ?? 'Guest'
          const roomNum = (b.rooms as { number?: string } | null)?.number ?? '—'
          const msgs: Record<string, string> = {
            confirmed: `Booking confirmed for ${b.check_in}`,
            checked_in: `Checked in to Room ${roomNum}`,
            checked_out: `Checked out from Room ${roomNum}`,
            cancelled: 'Booking cancelled',
            no_show: 'No-show recorded',
          }
          return { name: guestName, msg: msgs[b.status] ?? 'Updated', time: 'recently', color: colorList[i % colorList.length] }
        })
      )

      setArrivals(
        (arrivalBkgs ?? []).map((b: { id: string; guests?: { full_name?: string } | null; rooms?: { number?: string } | null }) => ({
          id: b.id,
          guest: (b.guests as { full_name?: string } | null)?.full_name ?? 'Guest',
          room: (b.rooms as { number?: string } | null)?.number ?? '—',
        }))
      )
      setDepartures(
        (departureBkgs ?? []).map((b: { id: string; guests?: { full_name?: string } | null; rooms?: { number?: string } | null }) => ({
          id: b.id,
          guest: (b.guests as { full_name?: string } | null)?.full_name ?? 'Guest',
          room: (b.rooms as { number?: string } | null)?.number ?? '—',
        }))
      )

      setLoading(false)
    }
    load()
  }, [])

  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
  const today = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--amber)' }} />
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 space-y-4 max-w-4xl">

        {/* Title */}
        <div className="px-2">
          <h1 className="text-4xl serif" style={{ color: 'var(--cream)' }}>
            {hotelName.split(' ').slice(0, -1).join(' ')}{' '}
            <span className="serif-italic">{hotelName.split(' ').slice(-1)[0]}</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>Overview · {today}</p>
        </div>

        {/* Today's notifications */}
        {(arrivals.length > 0 || departures.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {arrivals.length > 0 && (
              <div className="glass p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--tile-green)' }}>
                    <LogIn size={12} style={{ color: '#1a1a1a' }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>{arrivals.length} Arrival{arrivals.length > 1 ? 's' : ''} Today</span>
                </div>
                <div className="space-y-1">
                  {arrivals.map(a => (
                    <Link key={a.id} href={`/dashboard/bookings/${a.id}`}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded-lg hover:bg-white/[0.04]">
                      <span style={{ color: 'var(--cream)' }}>{a.guest}</span>
                      <span style={{ color: 'var(--muted)' }}>Rm {a.room}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {departures.length > 0 && (
              <div className="glass p-3.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--tile-orange)' }}>
                    <LogOut size={12} style={{ color: '#1a1a1a' }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>{departures.length} Departure{departures.length > 1 ? 's' : ''} Today</span>
                </div>
                <div className="space-y-1">
                  {departures.map(d => (
                    <Link key={d.id} href={`/dashboard/bookings/${d.id}`}
                      className="flex items-center justify-between text-xs px-2 py-1 rounded-lg hover:bg-white/[0.04]">
                      <span style={{ color: 'var(--cream)' }}>{d.guest}</span>
                      <span style={{ color: 'var(--muted)' }}>Rm {d.room}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Widget grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Occupancy — yellow */}
          <div className="tile col-span-2" style={{ background: 'var(--tile-yellow)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="tile-icon-btn"><BedDouble size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(0,0,0,0.55)' }}>Occupancy</span>
              </div>
              <Link href="/dashboard/rooms" className="tile-icon-btn"><Upload size={12} /></Link>
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-5xl font-semibold" style={{ color: '#1a1a1a' }}>{occupancyPct}%</span>
              <span className="text-sm" style={{ color: 'rgba(0,0,0,0.6)' }}>{occupiedRooms} of {totalRooms} rooms occupied</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${occupancyPct}%`, background: '#1a1a1a' }} />
            </div>
            <p className="text-xs mt-3" style={{ color: 'rgba(0,0,0,0.55)' }}>{todayBookings} new booking{todayBookings !== 1 ? 's' : ''} today</p>
          </div>

          {/* Revenue — orange */}
          <div className="tile" style={{ background: 'var(--tile-orange)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><DollarSign size={14} /></div>
              <Link href="/dashboard/finance" className="tile-icon-btn"><Upload size={12} /></Link>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Revenue</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>
                ${weekRevenue >= 1000 ? `${(weekRevenue / 1000).toFixed(1)}k` : weekRevenue.toLocaleString()}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(0,0,0,0.6)' }}>This week · completed payments</p>
          </div>

          {/* Bookings — purple */}
          <div className="tile" style={{ background: 'var(--tile-purple)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><CalendarDays size={14} /></div>
              <Link href="/dashboard/bookings" className="tile-icon-btn"><Upload size={12} /></Link>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Bookings today</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{todayBookings}</span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(0,0,0,0.6)' }}>{arrivals.length} arrivals · {departures.length} departures</p>
          </div>

          {/* ADR — green */}
          <div className="tile" style={{ background: 'var(--tile-green)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><TrendingUp size={14} /></div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>ADR</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>${adr}</span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(0,0,0,0.6)' }}>Avg booking value</p>
          </div>

          {/* Quick links — blue */}
          <div className="tile" style={{ background: 'var(--tile-blue)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><Award size={14} /></div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(0,0,0,0.55)' }}>Quick Access</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: CalendarDays, href: '/dashboard/bookings/calendar', label: 'Calendar' },
                { icon: Sparkles, href: '/dashboard/guests', label: 'Guests' },
                { icon: Clock, href: '/dashboard/reports', label: 'Reports' },
              ].map(({ icon: Icon, href, label }) => (
                <Link key={href} href={href} className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.08)' }}>
                  <Icon size={14} style={{ color: 'rgba(0,0,0,0.7)' }} />
                  <span className="text-[9px] font-semibold" style={{ color: 'rgba(0,0,0,0.6)' }}>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Revenue · Last 7 days</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              ${weekRevenue >= 1000 ? `${(weekRevenue / 1000).toFixed(1)}k` : weekRevenue} total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyBars}>
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.5)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.5)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(20,22,28,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="v" fill="#D4B15A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity sidebar */}
      <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
        <h2 className="text-xl serif px-2" style={{ color: 'var(--cream)' }}>Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm px-2" style={{ color: 'var(--muted)' }}>No recent bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((a, i) => (
              <div key={i} className="glass p-3.5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: a.color, color: '#1a1a1a' }}>
                  {a.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--cream)' }}>{a.name}</p>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--muted-2)' }}>{a.time}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{a.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
