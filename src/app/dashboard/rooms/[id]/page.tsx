'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, BedDouble, CalendarDays, Save, Film } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getStatusColor } from '@/lib/utils'

type Room = {
  id: string
  number: string
  floor: number
  status: string
  notes: string | null
  hotel_id: string
  room_types: { id: string; name: string; base_price: number; max_adults: number; amenities: string[] } | null
  room_media: { id: string; url: string; type: string; is_cover: boolean }[]
}

type BookingRow = {
  id: string
  check_in: string
  check_out: string
  status: string
  total_amount: number
  guests: { full_name: string } | null
}

const statusOptions = ['available', 'occupied', 'cleaning', 'maintenance', 'blocked']
const statusLabel: Record<string, string> = {
  available: 'Available', occupied: 'Occupied', cleaning: 'Cleaning', maintenance: 'Maintenance', blocked: 'Blocked',
}
const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  checked_in: 'bg-green-500/15 text-green-300 border-green-500/30',
  checked_out: 'bg-white/10 text-white/50 border-white/20',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [price, setPrice] = useState('')

  const supabase = createClient()

  const loadRoom = useCallback(async () => {
    const { data } = await supabase
      .from('rooms')
      .select('id, number, floor, status, notes, hotel_id, room_types(id, name, base_price, max_adults, amenities), room_media(id, url, type, is_cover)')
      .eq('id', id)
      .single()
    const r = data as unknown as Room
    setRoom(r)
    setStatus(r?.status ?? '')
    setNotes(r?.notes ?? '')
    setPrice(String(r?.room_types?.base_price ?? ''))

    const { data: bkgs } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, status, total_amount, guests(full_name)')
      .eq('room_id', id)
      .order('check_in', { ascending: false })
      .limit(10)
    setBookings((bkgs as unknown as BookingRow[]) ?? [])
  }, [id, supabase])

  useEffect(() => { loadRoom().then(() => setLoading(false)) }, [loadRoom])

  async function saveChanges(e: React.FormEvent) {
    e.preventDefault()
    if (!room) return
    setSaving(true)
    await supabase.from('rooms').update({ status, notes: notes || null }).eq('id', id)
    if (room.room_types?.id) {
      await supabase.from('room_types').update({ base_price: parseFloat(price) || 0 }).eq('id', room.room_types.id)
    }
    await loadRoom()
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--amber)' }} />
    </div>
  )
  if (!room) return <div className="text-center py-24" style={{ color: 'var(--muted)' }}>Room not found.</div>

  const cover = room.room_media?.find(m => m.is_cover) ?? room.room_media?.[0]

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/[0.04]" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Room <span className="serif-italic">{room.number}</span>
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{room.room_types?.name ?? 'Standard'} · Floor {room.floor}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Edit form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Media preview */}
          {cover && (
            <div className="glass overflow-hidden" style={{ height: 200 }}>
              {cover.type === 'image'
                ? <img src={cover.url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}><Film size={32} style={{ color: 'var(--amber)' }} /></div>
              }
            </div>
          )}
          {room.room_media.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {room.room_media.slice(1).map(m => (
                <div key={m.id} className="w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {m.type === 'image'
                    ? <img src={m.url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Film size={16} style={{ color: 'var(--amber)' }} /></div>
                  }
                </div>
              ))}
            </div>
          )}

          {/* Edit */}
          <form onSubmit={saveChanges} className="glass p-5 space-y-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Room Settings</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none capitalize" style={inputStyle}>
                  {statusOptions.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Base Price / Night ($)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="0.01"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Maintenance notes, special features…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Side info */}
        <div className="space-y-4">
          {/* Status card */}
          <div className="tile" style={{ background: status === 'available' ? 'var(--tile-green)' : status === 'occupied' ? 'var(--tile-orange)' : status === 'cleaning' ? 'var(--tile-blue)' : 'var(--tile-purple)' }}>
            <div className="tile-icon-btn mb-3"><BedDouble size={14} /></div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Status</p>
            <p className="text-xl font-semibold" style={{ color: '#1a1a1a' }}>{statusLabel[status]}</p>
            {room.room_types && <p className="text-xs mt-1" style={{ color: 'rgba(0,0,0,0.6)' }}>${room.room_types.base_price}/night</p>}
          </div>

          {/* Room info */}
          <div className="glass p-4 space-y-2">
            {[
              { label: 'Room Number', value: room.number },
              { label: 'Floor', value: room.floor },
              { label: 'Type', value: room.room_types?.name ?? '—' },
              { label: 'Max Adults', value: room.room_types?.max_adults ?? '—' },
            ].map(f => (
              <div key={f.label} className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{f.label}</span>
                <span className="text-xs font-medium" style={{ color: 'var(--cream)' }}>{f.value}</span>
              </div>
            ))}
            {room.room_types?.amenities?.length ? (
              <div className="pt-2">
                <p className="text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Amenities</p>
                <div className="flex flex-wrap gap-1">
                  {room.room_types.amenities.map(a => (
                    <span key={a} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)' }}>{a}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Booking history */}
      <div className="glass overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <CalendarDays size={14} style={{ color: 'var(--muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Booking History</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No bookings for this room yet.</p>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': '1' } as React.CSSProperties}>
            {bookings.map(b => (
              <Link key={b.id} href={`/dashboard/bookings/${b.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{b.guests?.full_name ?? 'Guest'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{b.check_in} → {b.check_out}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>${b.total_amount.toLocaleString()}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[b.status] ?? 'bg-white/10 text-white/50 border-white/20'}`}>
                    {b.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
