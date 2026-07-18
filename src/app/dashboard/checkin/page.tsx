'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import { UserCheck, X, Loader2, CheckCircle, Clock } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Link from 'next/link'

type Arrival = {
  id: string
  check_in: string
  check_out: string
  adults: number
  children: number
  notes: string | null
  guests: { id: string; full_name: string; phone: string | null; email: string | null; nationality: string | null; id_number: string | null } | null
  rooms: { id: string; number: string; floor: number; room_types: { name: string } | null } | null
}

export default function CheckInPage() {
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [loading, setLoading] = useState(true)
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Arrival | null>(null)
  const [idNumber, setIdNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async (hId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, adults, children, notes, guests(id, full_name, phone, email, nationality, id_number), rooms(id, number, floor, room_types(name))')
      .eq('hotel_id', hId)
      .eq('check_in', today)
      .eq('status', 'confirmed')
      .order('created_at')
    setArrivals((data ?? []) as unknown as Arrival[])
  }, [supabase, today])

  useEffect(() => {
    async function init() {
      const hotel = await initHotel()
      if (!hotel) { setLoading(false); return }
      setHotelId(hotel.hotelId)
      await load(hotel.hotelId)
      setLoading(false)
    }
    init()
  }, [load])

  function openModal(arrival: Arrival) {
    setSelected(arrival)
    setIdNumber(arrival.guests?.id_number ?? '')
    setNotes(arrival.notes ?? '')
  }

  function closeModal() {
    setSelected(null)
    setIdNumber('')
    setNotes('')
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !hotelId) return
    setSaving(true)

    // Update booking status
    const { error: bookingErr } = await supabase
      .from('bookings')
      .update({ status: 'checked_in', notes: notes || selected.notes })
      .eq('id', selected.id)

    if (bookingErr) {
      toast(bookingErr.message, 'error')
      setSaving(false)
      return
    }

    // Update room status to occupied
    if (selected.rooms?.id) {
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', selected.rooms.id)
    }

    // Update guest ID number if provided
    if (idNumber.trim() && selected.guests?.id) {
      await supabase.from('guests').update({ id_number: idNumber.trim() }).eq('id', selected.guests.id)
    }

    toast(`${selected.guests?.full_name ?? 'Guest'} checked in to Room ${selected.rooms?.number}`)
    closeModal()
    await load(hotelId)
    setSaving(false)
  }

  const nights = selected
    ? Math.max(1, Math.round((new Date(selected.check_out).getTime() - new Date(selected.check_in).getTime()) / 86400000))
    : 0

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
          Check-<span className="serif-italic">in</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Today&apos;s arrivals · {today}
        </p>
      </div>

      {/* Summary tiles */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <div className="tile" style={{ background: 'var(--tile-blue)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>
              Arriving Today
            </p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{arrivals.length}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-green)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>
              Guests
            </p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>
              {arrivals.reduce((s, a) => s + a.adults + a.children, 0)}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : arrivals.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No arrivals today"
          description="All of today's check-ins are complete, or there are no bookings for today."
          action={
            <Link href="/dashboard/bookings"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              View Bookings
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {arrivals.map(arrival => (
            <div key={arrival.id} className="glass p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                    {arrival.guests?.full_name?.charAt(0) ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>
                      {arrival.guests?.full_name ?? 'Unknown Guest'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {arrival.guests?.nationality ?? ''}{arrival.guests?.phone ? ` · ${arrival.guests.phone}` : ''}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                  <Clock size={10} /> Arriving
                </span>
              </div>

              {/* Room + dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--muted)' }}>Room</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>
                    {arrival.rooms?.number ?? '—'}
                    {arrival.rooms?.room_types?.name && (
                      <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--muted)' }}>
                        {arrival.rooms.room_types.name}
                      </span>
                    )}
                  </p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--muted)' }}>Stay</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>
                    {Math.max(1, Math.round((new Date(arrival.check_out).getTime() - new Date(arrival.check_in).getTime()) / 86400000))} nights
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {arrival.adults} adult{arrival.adults !== 1 ? 's' : ''}
                  {arrival.children > 0 ? ` · ${arrival.children} child${arrival.children !== 1 ? 'ren' : ''}` : ''}
                </p>
                <button
                  onClick={() => openModal(arrival)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--tile-green)', color: '#1a1a1a' }}>
                  <CheckCircle size={12} /> Check In
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Check-in modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Check In Guest</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Room {selected.rooms?.number} · {nights} night{nights !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={closeModal} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>

            {/* Guest summary */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {selected.guests?.full_name?.charAt(0) ?? '?'}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{selected.guests?.full_name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {[selected.guests?.nationality, selected.guests?.email, selected.guests?.phone].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                  ID / Passport Number
                </label>
                <input
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  placeholder="Scan or enter document number"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                  style={inputStyle}
                />
                {selected.guests?.id_number && (
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    On file: {selected.guests.id_number}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                  Arrival Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Late arrival, extra pillow, allergies…"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="px-3 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--muted)' }}>Check-in</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{selected.check_in}</p>
                </div>
                <div className="px-3 py-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--muted)' }}>Check-out</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{selected.check_out}</p>
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: 'var(--tile-green)', color: '#1a1a1a' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {saving ? 'Checking in…' : 'Confirm Check-in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
