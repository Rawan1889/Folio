'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Users, BedDouble, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import Link from 'next/link'

type GuestResult = { id: string; full_name: string; email: string | null; phone: string | null; nationality: string | null }
type RoomResult = { id: string; number: string; floor: number; status: string; room_types: { name: string } | null }
type BookingResult = {
  id: string; check_in: string; check_out: string; status: string; total_amount: number
  guests: { full_name: string } | null
  rooms: { number: string } | null
}

const statusColors: Record<string, string> = {
  confirmed: '#3b82f6',
  checked_in: '#22c55e',
  checked_out: 'var(--muted)',
  cancelled: '#ef4444',
  no_show: '#f97316',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [guests, setGuests] = useState<GuestResult[]>([])
  const [rooms, setRooms] = useState<RoomResult[]>([])
  const [bookings, setBookings] = useState<BookingResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [hotelId, setHotelId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    initHotel().then(h => { if (h) setHotelId(h.hotelId) })
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!hotelId || q.trim().length < 2) {
      setGuests([]); setRooms([]); setBookings([]); setSearched(false); return
    }
    setLoading(true)
    const term = `%${q.trim()}%`

    // Step 1: find matching guests
    const { data: guestData } = await supabase
      .from('guests')
      .select('id, full_name, email, phone, nationality')
      .eq('hotel_id', hotelId)
      .or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
      .limit(8)

    // Step 2: find matching rooms
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, number, floor, status, room_types(name)')
      .eq('hotel_id', hotelId)
      .ilike('number', term)
      .limit(8)

    // Step 3: find bookings by matching guest IDs or room IDs
    const guestIds = (guestData ?? []).map(g => g.id)
    const roomIds = (roomData ?? []).map(r => r.id)
    let bookingData: BookingResult[] = []

    if (guestIds.length > 0 || roomIds.length > 0) {
      const orFilters = [
        ...(guestIds.length > 0 ? [`guest_id.in.(${guestIds.join(',')})`] : []),
        ...(roomIds.length > 0 ? [`room_id.in.(${roomIds.join(',')})`] : []),
      ].join(',')

      const { data } = await supabase
        .from('bookings')
        .select('id, check_in, check_out, status, total_amount, guests(full_name), rooms(number)')
        .eq('hotel_id', hotelId)
        .or(orFilters)
        .order('check_in', { ascending: false })
        .limit(8)
      bookingData = (data ?? []) as unknown as BookingResult[]
    }

    setGuests((guestData ?? []) as GuestResult[])
    setRooms((roomData ?? []) as unknown as RoomResult[])
    setBookings(bookingData)
    setSearched(true)
    setLoading(false)
  }, [hotelId, supabase])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 280)
    return () => clearTimeout(t)
  }, [query, doSearch])

  const total = guests.length + rooms.length + bookings.length

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 16,
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
          Sea<span className="serif-italic">rch</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Find guests, rooms, and bookings instantly
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--muted)' }} />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Guest name, room number, email, phone…"
          className="w-full pl-12 pr-4 py-4 text-sm outline-none"
          style={{ ...inputStyle, fontSize: 15 }}
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--muted)' }}>
            Searching…
          </span>
        )}
      </div>

      {/* Results */}
      {searched && query.trim().length >= 2 && (
        <div className="space-y-4">
          {total === 0 && !loading && (
            <div className="py-16 text-center space-y-2">
              <Search size={28} className="mx-auto opacity-20" style={{ color: 'var(--cream)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {guests.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2 px-1">
                <Users size={12} style={{ color: 'var(--muted)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Guests
                </span>
              </div>
              <div className="glass overflow-hidden">
                {guests.map((g, i) => (
                  <Link key={g.id} href={`/dashboard/guests/${g.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'var(--tile-purple)', color: '#1a1a1a' }}>
                      {g.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{g.full_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {[g.email, g.phone, g.nationality].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--muted-2)' }}>→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {rooms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2 px-1">
                <BedDouble size={12} style={{ color: 'var(--muted)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Rooms
                </span>
              </div>
              <div className="glass overflow-hidden">
                {rooms.map((r, i) => (
                  <Link key={r.id} href={`/dashboard/rooms/${r.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Room {r.number}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        Floor {r.floor}{r.room_types?.name ? ` · ${r.room_types.name}` : ''}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg capitalize"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--cream)' }}>
                      {r.status}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {bookings.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2 px-1">
                <CalendarDays size={12} style={{ color: 'var(--muted)' }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Bookings
                </span>
              </div>
              <div className="glass overflow-hidden">
                {bookings.map((b, i) => (
                  <Link key={b.id} href={`/dashboard/bookings/${b.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>
                        {b.guests?.full_name ?? 'Unknown Guest'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        Room {b.rooms?.number} · {b.check_in} → {b.check_out}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--amber)' }}>
                        ${b.total_amount.toLocaleString()}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ color: statusColors[b.status] ?? 'var(--muted)', background: 'rgba(255,255,255,0.05)' }}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!searched && (
        <div className="py-20 text-center space-y-3">
          <Search size={36} className="mx-auto" style={{ color: 'rgba(255,255,255,0.08)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Type at least 2 characters to search
          </p>
        </div>
      )}
    </div>
  )
}
