'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, User, BedDouble, Calendar, DollarSign, CreditCard, Plus, X, Printer, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type Booking = {
  id: string
  check_in: string
  check_out: string
  total_amount: number
  paid_amount: number
  status: string
  source: string | null
  notes: string | null
  adults: number
  children: number
  created_at: string
  guests: { id: string; full_name: string; email: string | null; phone: string | null; nationality: string | null } | null
  rooms: { id: string; number: string; floor: number; room_types: { name: string; base_price: number } | null } | null
  hotel_id: string
}

type Payment = {
  id: string
  amount: number
  method: string
  status: string
  notes: string | null
  created_at: string
}

const statusFlow: Record<string, string | null> = {
  confirmed: 'checked_in',
  checked_in: 'checked_out',
  checked_out: null,
  cancelled: null,
  no_show: null,
}

const statusLabel: Record<string, string> = {
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  checked_in: 'bg-green-500/15 text-green-300 border-green-500/30',
  checked_out: 'bg-white/10 text-white/50 border-white/20',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
  no_show: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
}

const nextStatusLabel: Record<string, string> = {
  confirmed: 'Check In',
  checked_in: 'Check Out',
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payNotes, setPayNotes] = useState('')
  const [paySaving, setPaySaving] = useState(false)
  const [payError, setPayError] = useState('')

  const { toast } = useToast()
  const supabase = createClient()

  const loadBooking = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, total_amount, paid_amount, status, source, notes, adults, children, created_at, hotel_id, guests(id, full_name, email, phone, nationality), rooms(id, number, floor, room_types(name, base_price))')
      .eq('id', id)
      .single()
    setBooking(data as unknown as Booking)

    const { data: pays } = await supabase
      .from('payments')
      .select('id, amount, method, status, notes, created_at')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
    setPayments(pays ?? [])
  }, [id, supabase])

  useEffect(() => {
    loadBooking().then(() => setLoading(false))
  }, [loadBooking])

  async function advanceStatus() {
    if (!booking) return
    const next = statusFlow[booking.status]
    if (!next) return
    setUpdating(true)
    await supabase.from('bookings').update({ status: next }).eq('id', id)
    // If checking in, mark room as occupied; if checking out, mark as cleaning
    if (booking.rooms?.id) {
      const roomStatus = next === 'checked_in' ? 'occupied' : 'cleaning'
      await supabase.from('rooms').update({ status: roomStatus }).eq('id', booking.rooms.id)
    }
    await loadBooking()
    setUpdating(false)
    toast(next === 'checked_in' ? 'Guest checked in' : 'Guest checked out')
  }

  async function cancelBooking() {
    if (!booking || !confirm('Cancel this booking?')) return
    setUpdating(true)
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    if (booking.rooms?.id) await supabase.from('rooms').update({ status: 'available' }).eq('id', booking.rooms.id)
    await loadBooking()
    setUpdating(false)
    toast('Booking cancelled', 'info')
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!booking) return
    setPaySaving(true); setPayError('')
    const amount = parseFloat(payAmount)
    const { error } = await supabase.from('payments').insert({
      booking_id: id,
      hotel_id: booking.hotel_id,
      amount,
      method: payMethod,
      status: 'completed',
      notes: payNotes || null,
    })
    if (error) { setPayError(error.message); setPaySaving(false); return }
    // Update paid_amount on booking
    await supabase.from('bookings').update({ paid_amount: (booking.paid_amount ?? 0) + amount }).eq('id', id)
    await loadBooking()
    setShowPayModal(false); setPaySaving(false)
    setPayAmount(''); setPayNotes(''); setPayMethod('cash')
    toast('Payment recorded')
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

  if (!booking) return (
    <div className="text-center py-24" style={{ color: 'var(--muted)' }}>Booking not found.</div>
  )

  const nights = Math.max(1, Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000))
  const balance = booking.total_amount - (booking.paid_amount ?? 0)
  const nextStatus = statusFlow[booking.status]

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/[0.04]" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Book<span className="serif-italic">ing</span>
          </h1>
          <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted)' }}>{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Link href={`/dashboard/bookings/${id}/invoice`}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm glass hover:bg-white/[0.06]"
          style={{ color: 'var(--cream)' }}>
          <Printer size={14} /> Invoice
        </Link>
      </div>

      {/* Status + actions */}
      <div className="glass p-4 flex flex-wrap items-center gap-3">
        <span className={`text-xs px-3 py-1 rounded-full border font-medium ${statusColors[booking.status] ?? ''}`}>
          {statusLabel[booking.status]}
        </span>
        {nextStatus && (
          <button onClick={advanceStatus} disabled={updating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: 'var(--tile-green)', color: '#1a1a1a' }}>
            {updating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            {nextStatusLabel[booking.status]}
          </button>
        )}
        <button onClick={() => setShowPayModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          <Plus size={13} /> Record Payment
        </button>
        {['confirmed', 'checked_in'].includes(booking.status) && (
          <button onClick={cancelBooking} disabled={updating}
            className="px-3.5 py-2 rounded-xl text-sm glass hover:bg-red-500/10 transition-colors"
            style={{ color: 'var(--muted)' }}>
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stay details */}
          <div className="glass p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--cream)' }}>
              <Calendar size={15} /> Stay Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Check-in', value: booking.check_in },
                { label: 'Check-out', value: booking.check_out },
                { label: 'Nights', value: nights },
                { label: 'Guests', value: `${booking.adults} adult${booking.adults !== 1 ? 's' : ''}${booking.children > 0 ? ` · ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''}` },
                { label: 'Source', value: booking.source?.replace('_', ' ') ?? 'direct' },
                { label: 'Created', value: booking.created_at?.slice(0, 10) ?? '—' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>{f.label}</p>
                  <p className="text-sm font-medium capitalize" style={{ color: 'var(--cream)' }}>{f.value}</p>
                </div>
              ))}
            </div>
            {booking.notes && (
              <div className="mt-4 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)' }}>
                {booking.notes}
              </div>
            )}
          </div>

          {/* Payment summary */}
          <div className="glass p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--cream)' }}>
              <DollarSign size={15} /> Payments
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="tile" style={{ background: 'var(--tile-yellow)', padding: 14 }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Total</p>
                <p className="text-xl font-semibold" style={{ color: '#1a1a1a' }}>${booking.total_amount.toLocaleString()}</p>
              </div>
              <div className="tile" style={{ background: 'var(--tile-green)', padding: 14 }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Paid</p>
                <p className="text-xl font-semibold" style={{ color: '#1a1a1a' }}>${(booking.paid_amount ?? 0).toLocaleString()}</p>
              </div>
              <div className="tile" style={{ background: balance > 0 ? 'var(--tile-orange)' : 'var(--tile-blue)', padding: 14 }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Balance</p>
                <p className="text-xl font-semibold" style={{ color: '#1a1a1a' }}>${balance.toLocaleString()}</p>
              </div>
            </div>

            {payments.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-3">
                      <CreditCard size={13} style={{ color: 'var(--muted)' }} />
                      <div>
                        <p className="text-sm font-medium capitalize" style={{ color: 'var(--cream)' }}>{p.method}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{p.created_at?.slice(0, 10)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>${p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-4">
          {/* Guest */}
          <div className="glass p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
              <User size={12} /> Guest
            </h2>
            {booking.guests ? (
              <div>
                <Link href={`/dashboard/guests/${booking.guests.id}`}
                  className="font-semibold text-sm hover:underline" style={{ color: 'var(--cream)' }}>
                  {booking.guests.full_name}
                </Link>
                {booking.guests.email && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{booking.guests.email}</p>}
                {booking.guests.phone && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{booking.guests.phone}</p>}
                {booking.guests.nationality && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{booking.guests.nationality}</p>}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No guest attached</p>
            )}
          </div>

          {/* Room */}
          <div className="glass p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
              <BedDouble size={12} /> Room
            </h2>
            {booking.rooms ? (
              <div>
                <Link href={`/dashboard/rooms/${booking.rooms.id}`}
                  className="font-semibold text-sm hover:underline" style={{ color: 'var(--cream)' }}>
                  Room {booking.rooms.number}
                </Link>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Floor {booking.rooms.floor}</p>
                {booking.rooms.room_types && (
                  <>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{booking.rooms.room_types.name}</p>
                    <p className="text-sm font-semibold mt-2" style={{ color: 'var(--amber)' }}>
                      ${booking.rooms.room_types.base_price}/night
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No room attached</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative w-full max-w-sm glass-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Record Payment</h2>
              <button onClick={() => setShowPayModal(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={recordPayment} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Amount ($) *</label>
                <input type="number" min="0" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} required
                  placeholder={`Balance: $${balance}`}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                  {['cash', 'card', 'fib', 'fastpay', 'bank_transfer', 'other'].map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Notes</label>
                <input value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              {payError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{payError}</p>}
              <button type="submit" disabled={paySaving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {paySaving ? 'Saving…' : 'Record Payment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
