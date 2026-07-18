'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BedDouble, Plus, X, Loader2 } from 'lucide-react'
import { useToast } from '@/components/Toast'
import Link from 'next/link'

type ExtraRoom = {
  id: string
  rate_amount: number
  rooms: { id: string; number: string; floor: number; room_types: { name: string; base_price: number } | null } | null
}

type Room = { id: string; number: string; floor: number; status: string; room_types: { name: string; base_price: number } | null }

export function BookingRooms({
  bookingId,
  hotelId,
  primaryRoomId,
}: {
  bookingId: string
  hotelId: string
  primaryRoomId: string | null
}) {
  const [extras, setExtras] = useState<ExtraRoom[]>([])
  const [available, setAvailable] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    const [{ data: extraData }, { data: roomsData }] = await Promise.all([
      supabase.from('booking_rooms')
        .select('id, rate_amount, rooms(id, number, floor, room_types(name, base_price))')
        .eq('booking_id', bookingId)
        .order('created_at'),
      supabase.from('rooms')
        .select('id, number, floor, status, room_types(name, base_price)')
        .eq('hotel_id', hotelId)
        .order('floor').order('number'),
    ])
    setExtras((extraData ?? []) as unknown as ExtraRoom[])
    setAvailable((roomsData ?? []) as unknown as Room[])
    setLoading(false)
  }, [bookingId, hotelId, supabase])

  useEffect(() => { load() }, [load])

  async function addRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRoom) return
    setSaving(true)
    const { error } = await supabase.from('booking_rooms').insert({
      booking_id: bookingId,
      room_id: selectedRoom,
      rate_amount: parseFloat(rate) || 0,
    })
    if (error) { toast(error.message, 'error'); setSaving(false); return }
    await load()
    setAdding(false); setSaving(false); setSelectedRoom(''); setRate('')
    toast('Room added to booking')
  }

  async function removeRoom(id: string) {
    await supabase.from('booking_rooms').delete().eq('id', id)
    setExtras(extras.filter(x => x.id !== id))
    toast('Room removed')
  }

  const attachedIds = new Set([primaryRoomId, ...extras.map(e => e.rooms?.id)].filter(Boolean))
  const attachable = available.filter(r => !attachedIds.has(r.id))

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--muted)' }}>
          <BedDouble size={12} /> Additional Rooms
        </h2>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg glass hover:bg-white/[0.06]"
            style={{ color: 'var(--cream)' }}>
            <Plus size={11} /> Add
          </button>
        )}
      </div>

      {loading ? (
        <div className="skeleton h-6 rounded-lg" />
      ) : extras.length === 0 && !adding ? (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Single-room booking</p>
      ) : (
        <div className="space-y-1.5">
          {extras.map(e => (
            <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Link href={`/dashboard/rooms/${e.rooms?.id}`}
                className="text-xs font-semibold hover:underline flex-1" style={{ color: 'var(--cream)' }}>
                Room {e.rooms?.number}
                {e.rooms?.room_types?.name && (
                  <span className="font-normal ml-1.5" style={{ color: 'var(--muted)' }}>
                    · {e.rooms.room_types.name}
                  </span>
                )}
              </Link>
              {Number(e.rate_amount) > 0 && (
                <span className="text-xs" style={{ color: 'var(--amber)' }}>
                  ${Number(e.rate_amount).toLocaleString()}
                </span>
              )}
              <button onClick={() => removeRoom(e.id)}
                className="p-1 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--muted)' }}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <form onSubmit={addRoom} className="space-y-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} required
            className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={inputStyle}>
            <option value="">Select room…</option>
            {attachable.map(r => (
              <option key={r.id} value={r.id}>
                Room {r.number} · Fl {r.floor} · {r.status} · ${r.room_types?.base_price ?? 0}/night
              </option>
            ))}
          </select>
          <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)}
            placeholder="Rate for stay (optional)"
            className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={inputStyle} />
          <div className="flex gap-2">
            <button type="submit" disabled={saving || !selectedRoom}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              Attach
            </button>
            <button type="button" onClick={() => { setAdding(false); setSelectedRoom(''); setRate('') }}
              className="px-3 py-2 rounded-xl text-xs glass hover:bg-white/[0.06]" style={{ color: 'var(--muted)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
