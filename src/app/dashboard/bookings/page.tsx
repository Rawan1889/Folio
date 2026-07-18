'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, X, Loader2, CalendarDays, CheckCircle, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Booking = {
  id: string
  check_in: string
  check_out: string
  total_amount: number
  status: string
  source: string | null
  guests: { full_name: string } | null
  rooms: { id: string; number: string } | null
}

type Room = { id: string; number: string }
type Guest = { id: string; full_name: string }

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  checked_in: 'bg-green-500/15 text-green-300 border-green-500/30',
  checked_out: 'bg-white/10 text-white/50 border-white/20',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
  no_show: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [quickUpdating, setQuickUpdating] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [guests, setGuests] = useState<Guest[]>([])

  // new booking form
  const [guestId, setGuestId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [source, setSource] = useState('direct')
  const [totalAmount, setTotalAmount] = useState('')

  const supabase = createClient()

  const loadBookings = useCallback(async (hId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, total_amount, status, source, guests(full_name), rooms(id, number)')
      .eq('hotel_id', hId)
      .order('check_in', { ascending: false })
    setBookings((data as unknown as Booking[]) ?? [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()

      let hotel: { id: string } | null = null
      if (profile?.role === 'super_admin') {
        const { data } = await supabase.from('hotels').select('id').order('created_at').limit(1).single()
        hotel = data
      } else if (profile?.tenant_id) {
        const { data } = await supabase.from('hotels').select('id').eq('tenant_id', profile.tenant_id).order('created_at').limit(1).single()
        hotel = data
      }

      if (hotel?.id) {
        setHotelId(hotel.id)
        await loadBookings(hotel.id)
        const { data: r } = await supabase.from('rooms').select('id, number').eq('hotel_id', hotel.id).order('number')
        setRooms(r ?? [])
        const { data: g } = await supabase.from('guests').select('id, full_name').eq('hotel_id', hotel.id).order('full_name')
        setGuests(g ?? [])
      }
      setLoading(false)
    }
    init()
  }, [loadBookings, supabase])

  async function quickCheckIn(bookingId: string, roomId: string | null) {
    setQuickUpdating(bookingId)
    await supabase.from('bookings').update({ status: 'checked_in' }).eq('id', bookingId)
    if (roomId) await supabase.from('rooms').update({ status: 'occupied' }).eq('id', roomId)
    if (hotelId) await loadBookings(hotelId)
    setQuickUpdating(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId || !roomId || !guestId) { setSaveError('Please select a room and guest'); return }
    setSaving(true); setSaveError('')

    const { error } = await supabase.from('bookings').insert({
      hotel_id: hotelId,
      guest_id: guestId,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      total_amount: parseFloat(totalAmount) || 0,
      status: 'confirmed',
      source,
    })
    if (error) { setSaveError(error.message); setSaving(false); return }
    await loadBookings(hotelId)
    setShowModal(false); setSaving(false)
    setGuestId(''); setRoomId(''); setCheckIn(''); setCheckOut(''); setTotalAmount(''); setSource('direct')
  }

  const filtered = bookings.filter(b =>
    (b.guests?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (b.rooms?.number ?? '').includes(search) ||
    b.id.includes(search)
  )

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Book<span className="serif-italic">ings</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…' : `${filtered.length} bookings`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/bookings/calendar"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium glass hover:bg-white/[0.06]"
            style={{ color: 'var(--cream)' }}>
            <LayoutGrid size={14} /> Calendar
          </Link>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
            <Plus size={15} /> New Booking
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by guest, room…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={inputStyle} />
      </div>

      {/* Stat tiles */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: bookings.length, color: 'var(--tile-blue)' },
            { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'var(--tile-purple)' },
            { label: 'Checked In', value: bookings.filter(b => b.status === 'checked_in').length, color: 'var(--tile-green)' },
            { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: 'var(--tile-orange)' },
          ].map(s => (
            <div key={s.label} className="tile" style={{ background: s.color }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>{s.label}</p>
              <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="glass overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16" style={{ color: 'var(--muted)' }}>
            <Loader2 size={18} className="animate-spin" /> Loading bookings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CalendarDays size={32} style={{ color: 'var(--muted)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No bookings yet. Create your first booking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Guest', 'Room', 'Check-in', 'Check-out', 'Total', 'Source', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/bookings/${b.id}`} className="font-medium hover:underline" style={{ color: 'var(--cream)' }}>
                        {b.guests?.full_name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>Rm {b.rooms?.number ?? '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{b.check_in}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{b.check_out}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--amber)' }}>${b.total_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--muted)' }}>{b.source ?? 'direct'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[b.status] ?? 'bg-white/10 text-white/50 border-white/20'}`}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {b.status === 'confirmed' && b.check_in <= new Date().toISOString().split('T')[0] && (
                        <button
                          onClick={() => quickCheckIn(b.id, (b.rooms as { id: string; number: string } | null)?.id ?? null)}
                          disabled={quickUpdating === b.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium disabled:opacity-50"
                          style={{ background: 'var(--tile-green)', color: '#1a1a1a' }}>
                          {quickUpdating === b.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                          Check In
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>New Booking</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Guest</label>
                  <select value={guestId} onChange={e => setGuestId(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">— Select guest —</option>
                    {guests.map(g => <option key={g.id} value={g.id}>{g.full_name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Room</label>
                  <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">Select room</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>Room {r.number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Check-in</label>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Check-out</label>
                  <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Total ($)</label>
                  <input type="number" min="0" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Source</label>
                  <select value={source} onChange={e => setSource(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    {['direct', 'online', 'phone', 'agency', 'walk_in'].map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              {saveError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{saveError}</p>}
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? 'Saving…' : 'Create Booking'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
