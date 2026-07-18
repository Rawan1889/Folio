'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'

type Room = {
  id: string
  number: string
  floor: number
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'blocked'
  room_types: { name: string } | null
  guest_name?: string
}

const STATUS = {
  available:   { label: 'Available',   bg: 'var(--tile-green)',         text: '#1a1a1a' },
  occupied:    { label: 'Occupied',    bg: '#c0392b',                   text: '#fff'    },
  cleaning:    { label: 'Cleaning',    bg: 'var(--tile-yellow)',        text: '#1a1a1a' },
  maintenance: { label: 'Maintenance', bg: 'var(--tile-orange)',        text: '#1a1a1a' },
  blocked:     { label: 'Blocked',     bg: 'rgba(255,255,255,0.07)',    text: 'var(--muted)' },
}

export default function RoomBoardPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const hotel = await initHotel()
    if (!hotel) { setLoading(false); return }

    const [{ data: roomsData }, { data: bookingsData }] = await Promise.all([
      supabase
        .from('rooms')
        .select('id, number, floor, status, room_types(name)')
        .eq('hotel_id', hotel.hotelId)
        .order('floor').order('number'),
      supabase
        .from('bookings')
        .select('room_id, guests(full_name)')
        .eq('hotel_id', hotel.hotelId)
        .eq('status', 'checked_in'),
    ])

    const guestByRoom: Record<string, string> = {}
    for (const b of (bookingsData ?? [])) {
      const g = b.guests as { full_name: string } | null
      if (b.room_id && g?.full_name) guestByRoom[b.room_id] = g.full_name
    }

    setRooms((roomsData ?? []).map(r => ({ ...r, guest_name: guestByRoom[r.id] })) as Room[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const counts = Object.keys(STATUS).reduce((acc, k) => {
    acc[k] = rooms.filter(r => r.status === k).length
    return acc
  }, {} as Record<string, number>)

  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b)
  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter)

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Room <span className="serif-italic">Board</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Live front-desk view · {rooms.length} rooms
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm glass hover:bg-white/[0.06] transition-colors"
          style={{ color: 'var(--muted)' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{
            background: filter === 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
            color: filter === 'all' ? 'var(--cream)' : 'var(--muted)',
            border: filter === 'all' ? 'none' : '1px solid rgba(255,255,255,0.08)',
          }}>
          All ({rooms.length})
        </button>
        {(Object.entries(STATUS) as [keyof typeof STATUS, typeof STATUS[keyof typeof STATUS]][]).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: filter === key ? cfg.bg : 'rgba(255,255,255,0.04)',
              color: filter === key ? cfg.text : 'var(--muted)',
              border: filter === key ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}>
            {cfg.label} ({counts[key] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl aspect-square" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map(floor => {
            const floorRooms = filtered.filter(r => r.floor === floor)
            if (floorRooms.length === 0) return null
            return (
              <div key={floor}>
                <p className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--muted-2)' }}>
                  Floor {floor}
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-2">
                  {floorRooms.map(room => {
                    const cfg = STATUS[room.status]
                    return (
                      <Link
                        key={room.id}
                        href={`/dashboard/rooms/${room.id}`}
                        className="relative flex flex-col items-center justify-center p-2 rounded-xl aspect-square text-center hover:scale-105 transition-transform cursor-pointer"
                        style={{ background: cfg.bg, color: cfg.text }}>
                        <span className="text-sm font-bold leading-none">{room.number}</span>
                        {room.room_types?.name && (
                          <span className="text-[8px] mt-1 opacity-60 leading-none truncate w-full px-0.5">
                            {room.room_types.name}
                          </span>
                        )}
                        {room.guest_name && (
                          <span className="text-[7px] mt-0.5 opacity-80 leading-none truncate w-full px-0.5">
                            {room.guest_name.split(' ')[0]}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-center py-16 text-sm" style={{ color: 'var(--muted)' }}>
              No rooms match this filter.
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2">
        {(Object.entries(STATUS) as [keyof typeof STATUS, typeof STATUS[keyof typeof STATUS]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: cfg.bg, border: key === 'blocked' ? '1px solid rgba(255,255,255,0.15)' : 'none' }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
