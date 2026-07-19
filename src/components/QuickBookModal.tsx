'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, Zap, Search, UserPlus } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { useRouter } from 'next/navigation'
import { hasOverlap } from '@/lib/bookingChecks'
import { computePrice, type PricingResult } from '@/lib/pricing'

type Room = {
  id: string
  number: string
  floor: number
  room_types: { id?: string; name: string; base_price: number } | null
}

type Guest = { id: string; full_name: string; phone: string | null }
type ExtraRoomPick = { id: string; number: string; base_price: number }

export function QuickBookModal({
  hotelId,
  room,
  onClose,
  onBooked,
}: {
  hotelId: string
  room: Room
  onClose: () => void
  onBooked?: () => void
}) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(tomorrow)
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [source, setSource] = useState('walk_in')
  const [notes, setNotes] = useState('')
  const [checkInNow, setCheckInNow] = useState(true)

  // Extra rooms for group bookings
  const [availableExtras, setAvailableExtras] = useState<ExtraRoomPick[]>([])
  const [extraRooms, setExtraRooms] = useState<ExtraRoomPick[]>([])
  const [showExtraPicker, setShowExtraPicker] = useState(false)

  useEffect(() => {
    supabase.from('rooms')
      .select('id, number, status, room_types(base_price)')
      .eq('hotel_id', hotelId)
      .order('number')
      .then(({ data }) => {
        const list = (data ?? [])
          .filter(r => r.id !== room.id)
          .map(r => ({
            id: r.id,
            number: r.number,
            base_price: (r.room_types as { base_price?: number } | null)?.base_price ?? 0,
          }))
        setAvailableExtras(list)
      })
  }, [hotelId, room.id, supabase])

  // Guest search
  const [guestSearch, setGuestSearch] = useState('')
  const [guestResults, setGuestResults] = useState<Guest[]>([])
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [newGuestName, setNewGuestName] = useState('')
  const [newGuestPhone, setNewGuestPhone] = useState('')
  const [mode, setMode] = useState<'existing' | 'new'>('new')

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
  const basePrice = room.room_types?.base_price ?? 0
  const [total, setTotal] = useState((basePrice * nights).toString())
  const [totalDirty, setTotalDirty] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [pricing, setPricing] = useState<PricingResult | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Recompute price with rate plans whenever dates/promo change
  useEffect(() => {
    let cancelled = false
    computePrice({
      hotelId,
      roomTypeId: room.room_types?.id ?? null,
      basePrice,
      checkIn,
      checkOut,
      promoCode: promoCode.trim() || undefined,
    }).then(p => {
      if (cancelled) return
      setPricing(p)
      if (!totalDirty) setTotal(p.total.toFixed(2))
    })
    return () => { cancelled = true }
  }, [hotelId, room.room_types?.id, basePrice, checkIn, checkOut, promoCode, totalDirty])

  const searchGuests = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setGuestResults([]); return }
    const { data } = await supabase.from('guests')
      .select('id, full_name, phone')
      .eq('hotel_id', hotelId)
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(6)
    setGuestResults((data ?? []) as Guest[])
  }, [hotelId, supabase])

  useEffect(() => {
    const t = setTimeout(() => searchGuests(guestSearch), 200)
    return () => clearTimeout(t)
  }, [guestSearch, searchGuests])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSaving(true)

    // Overlap check
    const { overlap, guestName: conflictName } = await hasOverlap(room.id, checkIn, checkOut)
    if (overlap) {
      setError(`Room ${room.number} is already booked for these dates${conflictName ? ` (${conflictName})` : ''}`)
      setSaving(false)
      return
    }

    // Get or create guest
    let guestId = selectedGuest?.id ?? null

    if (mode === 'new') {
      if (!newGuestName.trim()) { setError('Guest name is required'); setSaving(false); return }
      const { data: g, error: gErr } = await supabase.from('guests').insert({
        hotel_id: hotelId,
        full_name: newGuestName.trim(),
        phone: newGuestPhone.trim() || null,
      }).select('id').single()
      if (gErr) { setError(gErr.message); setSaving(false); return }
      guestId = g.id
    } else if (!guestId) {
      setError('Please select a guest'); setSaving(false); return
    }

    // Create booking (checked_in immediately if requested and check-in is today)
    const arrivingToday = checkIn === today
    const willCheckIn = checkInNow && arrivingToday
    const { data: booking, error: bErr } = await supabase.from('bookings').insert({
      hotel_id: hotelId,
      room_id: room.id,
      guest_id: guestId,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      total_amount: parseFloat(total) || 0,
      source,
      notes: notes || null,
      status: willCheckIn ? 'checked_in' : 'confirmed',
    }).select('id').single()

    if (bErr) { setError(bErr.message); setSaving(false); return }

    // Attach extra rooms for group booking
    if (extraRooms.length > 0) {
      await supabase.from('booking_rooms').insert(
        extraRooms.map(r => ({ booking_id: booking.id, room_id: r.id, rate_amount: r.base_price * nights }))
      )
      if (willCheckIn) {
        await supabase.from('rooms').update({ status: 'occupied' }).in('id', extraRooms.map(r => r.id))
      }
    }

    // Flip room to occupied on immediate check-in
    if (willCheckIn) {
      await supabase.from('rooms').update({ status: 'occupied' }).eq('id', room.id)
    }

    const guestLabel = newGuestName || selectedGuest?.full_name
    toast(willCheckIn
      ? `Checked in ${guestLabel} · Room ${room.number}`
      : `Booked ${guestLabel} · Room ${room.number}`)
    setSaving(false)
    onClose()
    onBooked?.()
    router.push(`/dashboard/bookings/${booking.id}`)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-strong p-6 space-y-4 overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--tile-yellow)' }}>
              <Zap size={14} style={{ color: '#1a1a1a' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Quick Book</h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Room {room.number}{room.room_types?.name && ` · ${room.room_types.name}`} · ${basePrice}/night
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Check-in *</label>
              <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Check-out *</label>
              <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
          </div>

          {/* Guest picker tabs */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Guest *</label>
            <div className="flex gap-1.5 mb-2">
              <button type="button" onClick={() => setMode('new')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: mode === 'new' ? 'var(--tile-yellow)' : 'rgba(255,255,255,0.05)',
                  color: mode === 'new' ? '#1a1a1a' : 'var(--muted)',
                }}>
                <UserPlus size={11} /> New guest
              </button>
              <button type="button" onClick={() => setMode('existing')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: mode === 'existing' ? 'var(--tile-yellow)' : 'rgba(255,255,255,0.05)',
                  color: mode === 'existing' ? '#1a1a1a' : 'var(--muted)',
                }}>
                <Search size={11} /> Existing
              </button>
            </div>

            {mode === 'new' ? (
              <div className="space-y-2">
                <input value={newGuestName} onChange={e => setNewGuestName(e.target.value)}
                  placeholder="Full name *" autoFocus
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                <input value={newGuestPhone} onChange={e => setNewGuestPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
            ) : (
              <div className="space-y-2">
                <input value={guestSearch} onChange={e => { setGuestSearch(e.target.value); setSelectedGuest(null) }}
                  placeholder="Search name or phone…" autoFocus
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                {selectedGuest ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(212,177,90,0.1)', border: '1px solid rgba(212,177,90,0.3)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{selectedGuest.full_name}</p>
                      {selectedGuest.phone && <p className="text-xs" style={{ color: 'var(--muted)' }}>{selectedGuest.phone}</p>}
                    </div>
                    <button type="button" onClick={() => setSelectedGuest(null)} style={{ color: 'var(--muted)' }}>
                      <X size={13} />
                    </button>
                  </div>
                ) : guestResults.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {guestResults.map(g => (
                      <button key={g.id} type="button" onClick={() => setSelectedGuest(g)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-white/[0.06]"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{g.full_name}</p>
                          {g.phone && <p className="text-xs" style={{ color: 'var(--muted)' }}>{g.phone}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Occupancy + total */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Adults</label>
              <input type="number" min="1" value={adults} onChange={e => setAdults(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Children</label>
              <input type="number" min="0" value={children} onChange={e => setChildren(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Nights</label>
              <div className="w-full px-3 py-2.5 rounded-xl text-sm text-center font-semibold"
                style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--cream)' }}>
                {nights}
              </div>
            </div>
          </div>

          {/* Promo code */}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Promo Code</label>
            <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Optional"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
          </div>

          {/* Pricing breakdown */}
          {pricing && pricing.adjustments.length > 0 && (
            <div className="px-3 py-2 rounded-xl space-y-1 text-xs" style={{ background: 'rgba(212,177,90,0.06)', border: '1px solid rgba(212,177,90,0.15)' }}>
              <div className="flex justify-between" style={{ color: 'var(--muted)' }}>
                <span>Base ({nights} × ${basePrice})</span>
                <span>${pricing.subtotal.toFixed(2)}</span>
              </div>
              {pricing.adjustments.map((a, i) => (
                <div key={i} className="flex justify-between" style={{ color: a.delta < 0 ? '#86efac' : '#fdba74' }}>
                  <span>{a.name}</span>
                  <span>{a.delta > 0 ? '+' : ''}${a.delta.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1 font-semibold" style={{ color: 'var(--amber)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span>Total</span>
                <span>${pricing.total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
                Total ($) * {totalDirty && <span style={{ color: 'var(--amber)' }}>· manual</span>}
              </label>
              <input type="number" step="0.01" value={total} onChange={e => { setTotal(e.target.value); setTotalDirty(true) }} required
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-semibold" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Source</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none capitalize" style={inputStyle}>
                {['walk_in', 'direct', 'phone', 'online', 'agency'].map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Special requests…"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          </div>

          {/* Extra rooms for group bookings */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs" style={{ color: 'var(--muted)' }}>Additional rooms {extraRooms.length > 0 && `(${extraRooms.length})`}</label>
              <button type="button" onClick={() => setShowExtraPicker(!showExtraPicker)}
                className="text-xs" style={{ color: 'var(--amber)' }}>
                {showExtraPicker ? 'Done' : '+ Add room'}
              </button>
            </div>
            {extraRooms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {extraRooms.map(r => (
                  <span key={r.id} className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                    Rm {r.number}
                    <button type="button" onClick={() => setExtraRooms(extraRooms.filter(x => x.id !== r.id))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {showExtraPicker && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {availableExtras
                  .filter(r => !extraRooms.some(e => e.id === r.id))
                  .map(r => (
                    <button key={r.id} type="button"
                      onClick={() => setExtraRooms([...extraRooms, r])}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white/[0.06]"
                      style={{ color: 'var(--cream)' }}>
                      Room {r.number} — ${r.base_price}/night
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Check-in now toggle (only if arriving today) */}
          {checkIn === today && (
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
              style={{ background: checkInNow ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border: checkInNow ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent' }}>
              <input type="checkbox" checked={checkInNow} onChange={e => setCheckInNow(e.target.checked)}
                className="w-4 h-4" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Check in now</p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  Mark as checked in and set room to occupied
                </p>
              </div>
            </label>
          )}

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: checkInNow && checkIn === today ? 'var(--tile-green)' : 'var(--tile-yellow)', color: '#1a1a1a' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {saving
              ? (checkInNow && checkIn === today ? 'Checking in…' : 'Booking…')
              : (checkInNow && checkIn === today ? 'Book & Check In' : 'Confirm Booking')}
          </button>
        </form>
      </div>
    </div>
  )
}
