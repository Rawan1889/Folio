'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type InvoiceData = {
  id: string
  check_in: string
  check_out: string
  total_amount: number
  paid_amount: number
  status: string
  adults: number
  children: number
  created_at: string
  guests: { full_name: string; email: string | null; phone: string | null; nationality: string | null } | null
  rooms: { number: string; floor: number; room_types: { name: string; base_price: number } | null } | null
  hotels: { name: string; address: string | null; phone: string | null; email: string | null; city: string | null; country: string | null } | null
}

type Payment = {
  id: string
  amount: number
  method: string
  created_at: string
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const [booking, setBooking] = useState<InvoiceData | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('id, check_in, check_out, total_amount, paid_amount, status, adults, children, created_at, guests(full_name, email, phone, nationality), rooms(number, floor, room_types(name, base_price)), hotels(name, address, phone, email, city, country)')
        .eq('id', id)
        .single()
      setBooking(data as unknown as InvoiceData)

      const { data: pays } = await supabase
        .from('payments')
        .select('id, amount, method, created_at')
        .eq('booking_id', id)
        .order('created_at')
      setPayments(pays ?? [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--amber)' }} />
    </div>
  )
  if (!booking) return <div className="text-center py-24" style={{ color: 'var(--muted)' }}>Booking not found.</div>

  const nights = Math.max(1, Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000))
  const balance = booking.total_amount - (booking.paid_amount ?? 0)
  const invoiceNum = `INV-${booking.id.slice(0, 8).toUpperCase()}`
  const issueDate = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
  const hotel = booking.hotels

  return (
    <>
      {/* Print controls — hidden when printing */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href={`/dashboard/bookings/${id}`}
          className="p-2 rounded-xl hover:bg-white/[0.04]" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </Link>
        <span className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Invoice {invoiceNum}</span>
        <button onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Invoice card */}
      <div className="glass p-8 max-w-2xl mx-auto print:bg-white print:text-black print:border-none print:shadow-none print:max-w-full">
        <style>{`@media print { body { background: white !important; } .glass { background: white !important; border: none !important; backdrop-filter: none !important; } }`}</style>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base" style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>F</div>
              <span className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Folio</span>
            </div>
            {hotel && (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{hotel.name}</p>
                {hotel.address && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hotel.address}</p>}
                {(hotel.city || hotel.country) && <p className="text-xs" style={{ color: 'var(--muted)' }}>{[hotel.city, hotel.country].filter(Boolean).join(', ')}</p>}
                {hotel.phone && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hotel.phone}</p>}
                {hotel.email && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hotel.email}</p>}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold" style={{ color: 'var(--cream)' }}>INVOICE</p>
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--amber)' }}>{invoiceNum}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Issued: {issueDate}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="mb-6 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Bill To</p>
          {booking.guests ? (
            <div>
              <p className="font-semibold" style={{ color: 'var(--cream)' }}>{booking.guests.full_name}</p>
              {booking.guests.email && <p className="text-sm" style={{ color: 'var(--muted)' }}>{booking.guests.email}</p>}
              {booking.guests.phone && <p className="text-sm" style={{ color: 'var(--muted)' }}>{booking.guests.phone}</p>}
              {booking.guests.nationality && <p className="text-sm" style={{ color: 'var(--muted)' }}>{booking.guests.nationality}</p>}
            </div>
          ) : <p style={{ color: 'var(--muted)' }}>Walk-in Guest</p>}
        </div>

        {/* Booking details table */}
        <div className="mb-6 overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--muted)' }}>Description</th>
                <th className="px-4 py-3 text-center text-xs font-semibold" style={{ color: 'var(--muted)' }}>Nights</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: 'var(--muted)' }}>Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: 'var(--muted)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: 'var(--cream)' }}>
                    Room {booking.rooms?.number} — {booking.rooms?.room_types?.name ?? 'Standard'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{booking.check_in} → {booking.check_out}</p>
                </td>
                <td className="px-4 py-3 text-center" style={{ color: 'var(--muted)' }}>{nights}</td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--muted)' }}>
                  ${booking.rooms?.room_types?.base_price ?? '—'}/night
                </td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--cream)' }}>
                  ${booking.total_amount.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--muted)' }}>Subtotal</span>
              <span style={{ color: 'var(--cream)' }}>${booking.total_amount.toLocaleString()}</span>
            </div>
            {payments.map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span style={{ color: 'var(--muted)' }}>Payment ({p.method})</span>
                <span style={{ color: 'var(--tile-green)' }}>-${p.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ color: 'var(--cream)' }}>Balance Due</span>
              <span style={{ color: balance > 0 ? 'var(--tile-orange)' : 'var(--tile-green)' }}>
                ${balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Thank you for staying with us.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>Powered by Folio Hotel POS</p>
        </div>
      </div>
    </>
  )
}
