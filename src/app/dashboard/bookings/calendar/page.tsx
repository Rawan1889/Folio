'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import Link from 'next/link'

type Room = { id: string; number: string; room_types: { name: string } | null }

type Booking = {
  id: string
  room_id: string
  check_in: string
  check_out: string
  status: string
  guests: { full_name: string } | null
}

const statusBg: Record<string, string> = {
  confirmed: 'var(--tile-blue)',
  checked_in: 'var(--tile-green)',
  checked_out: 'rgba(255,255,255,0.12)',
  cancelled: 'rgba(239,68,68,0.25)',
  no_show: 'var(--tile-orange)',
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toISO(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d
  })

  const supabase = createClient()

  const load = useCallback(async (start: Date) => {
    const hotel = await initHotel()
    if (!hotel?.hotelId) { setLoading(false); return }
    const hId = hotel.hotelId

    const end = addDays(start, 13)

    const [{ data: r }, { data: b }] = await Promise.all([
      supabase.from('rooms').select('id, number, room_types(name)').eq('hotel_id', hId).order('number'),
      supabase.from('bookings')
        .select('id, room_id, check_in, check_out, status, guests(full_name)')
        .eq('hotel_id', hId)
        .lte('check_in', toISO(end))
        .gte('check_out', toISO(start))
        .neq('status', 'cancelled'),
    ])

    setRooms((r as unknown as Room[]) ?? [])
    setBookings((b as unknown as Booking[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load(weekStart) }, [weekStart, load])

  const days = Array.from({ length: 14 }, (_, i) => addDays(weekStart, i))
  const today = toISO(new Date())

  function getBookingForCell(roomId: string, date: Date) {
    const d = toISO(date)
    return bookings.find(b =>
      b.room_id === roomId && b.check_in <= d && b.check_out > d
    )
  }

  function isBookingStart(booking: Booking, date: Date) {
    return booking.check_in === toISO(date)
  }

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Calen<span className="serif-italic">dar</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {weekStart.toLocaleDateString('en', { month: 'long', day: 'numeric' })} – {addDays(weekStart, 13).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(d => addDays(d, -14))}
            className="p-2 rounded-xl glass hover:bg-white/[0.06]" style={{ color: 'var(--cream)' }}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); setWeekStart(d) }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium glass hover:bg-white/[0.06]" style={{ color: 'var(--cream)' }}>
            Today
          </button>
          <button onClick={() => setWeekStart(d => addDays(d, 14))}
            className="p-2 rounded-xl glass hover:bg-white/[0.06]" style={{ color: 'var(--cream)' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Confirmed', color: 'var(--tile-blue)' },
          { label: 'Checked In', color: 'var(--tile-green)' },
          { label: 'No Show', color: 'var(--tile-orange)' },
          { label: 'Checked Out', color: 'rgba(255,255,255,0.12)' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16" style={{ color: 'var(--muted)' }}>
          <Loader2 size={18} className="animate-spin" /> Loading calendar…
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>No rooms set up yet.</div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: rooms.length > 0 ? 900 : 'auto' }}>
              <thead>
                <tr>
                  {/* Room header */}
                  <th className="sticky left-0 z-10 px-3 py-2.5 text-left font-medium w-24 min-w-24"
                    style={{ background: 'rgba(13,15,20,0.95)', color: 'var(--muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    Room
                  </th>
                  {days.map(d => {
                    const iso = toISO(d)
                    const isToday = iso === today
                    return (
                      <th key={iso} className="px-2 py-2.5 text-center font-medium min-w-16 w-16"
                        style={{
                          background: isToday ? 'rgba(212,177,90,0.12)' : 'rgba(13,15,20,0.95)',
                          color: isToday ? 'var(--amber)' : 'var(--muted)',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          borderLeft: '1px solid rgba(255,255,255,0.04)',
                        }}>
                        <div>{d.toLocaleDateString('en', { weekday: 'short' })}</div>
                        <div className="font-bold" style={{ color: isToday ? 'var(--amber)' : 'var(--cream)' }}>{d.getDate()}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, ri) => (
                  <tr key={room.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {/* Room label */}
                    <td className="sticky left-0 z-10 px-3 py-2 font-medium"
                      style={{ color: 'var(--cream)', borderRight: '1px solid rgba(255,255,255,0.06)', background: ri % 2 === 0 ? 'rgba(13,15,20,0.95)' : 'rgba(20,22,28,0.95)' }}>
                      <Link href={`/dashboard/rooms/${room.id}`} className="hover:underline" style={{ color: 'var(--cream)' }}>
                        {room.number}
                      </Link>
                      {room.room_types && (
                        <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{room.room_types.name}</div>
                      )}
                    </td>
                    {days.map((d, di) => {
                      const iso = toISO(d)
                      const booking = getBookingForCell(room.id, d)
                      const isStart = booking ? isBookingStart(booking, d) : false
                      const isToday = iso === today

                      return (
                        <td key={di} className="p-0.5 relative"
                          style={{
                            background: isToday ? 'rgba(212,177,90,0.05)' : ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                            borderLeft: '1px solid rgba(255,255,255,0.04)',
                            height: 44,
                          }}>
                          {booking && (
                            <Link href={`/dashboard/bookings/${booking.id}`}
                              className="absolute inset-0.5 rounded-lg flex items-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                background: statusBg[booking.status] ?? 'rgba(255,255,255,0.1)',
                                borderLeft: isStart ? '3px solid rgba(0,0,0,0.2)' : 'none',
                              }}>
                              {isStart && (
                                <span className="px-1.5 truncate font-medium text-[10px]" style={{ color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                                  {booking.guests?.full_name?.split(' ')[0] ?? 'Guest'}
                                </span>
                              )}
                            </Link>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
