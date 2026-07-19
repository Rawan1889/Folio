'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'

type Booking = {
  check_in: string
  status: string
  source: string | null
  rooms: { room_types: { name: string } | null } | null
}

type Payment = { amount: number; created_at: string }

const tileColors = ['var(--tile-yellow)', 'var(--tile-orange)', 'var(--tile-purple)', 'var(--tile-green)', 'var(--tile-blue)', 'var(--tile-pink)']
const tooltipStyle = { background: 'rgba(13,15,20,0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }

export default function ReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadData = useCallback(async (hId: string) => {
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('bookings').select('check_in, status, source, rooms(room_types(name))').eq('hotel_id', hId),
      supabase.from('payments').select('amount, created_at').eq('hotel_id', hId).eq('status', 'completed'),
    ])
    setBookings((b as unknown as Booking[]) ?? [])
    setPayments((p ?? []).map(x => ({ ...x, amount: Number(x.amount) })) as Payment[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const hotel = await initHotel()
      if (hotel?.hotelId) await loadData(hotel.hotelId)
      setLoading(false)
    }
    init()
  }, [loadData])

  // Monthly revenue
  const byMonth: Record<string, number> = {}
  payments.forEach(p => {
    const m = p.created_at?.slice(0, 7) ?? ''
    if (m) byMonth[m] = (byMonth[m] ?? 0) + p.amount
  })
  const monthlyRevenue = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({ m: m.slice(5), v }))

  // Monthly bookings count
  const bookingsByMonth: Record<string, number> = {}
  bookings.forEach(b => {
    const m = b.check_in?.slice(0, 7) ?? ''
    if (m) bookingsByMonth[m] = (bookingsByMonth[m] ?? 0) + 1
  })
  const monthlyBookings = Object.entries(bookingsByMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => ({ m: m.slice(5), v }))

  // By room type
  const byType: Record<string, number> = {}
  bookings.forEach(b => {
    const name = (b.rooms as unknown as { room_types?: { name: string } })?.room_types?.name ?? 'Other'
    byType[name] = (byType[name] ?? 0) + 1
  })
  const typeData = Object.entries(byType).map(([name, value], i) => ({ name, value, color: tileColors[i % tileColors.length] }))

  // By source
  const bySource: Record<string, number> = {}
  bookings.forEach(b => { const s = b.source ?? 'direct'; bySource[s] = (bySource[s] ?? 0) + 1 })
  const sourceData = Object.entries(bySource).map(([source, count]) => ({ source, count }))

  // By status
  const byStatus: Record<string, number> = {}
  bookings.forEach(b => { byStatus[b.status] = (byStatus[b.status] ?? 0) + 1 })
  const statusData = Object.entries(byStatus).map(([name, value], i) => ({ name, value, color: tileColors[i % tileColors.length] }))

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Rep<span className="serif-italic">orts</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Operational insights & trends</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold glass transition-opacity hover:opacity-90"
          style={{ color: 'var(--cream)' }}>
          <Download size={14} /> Export
        </button>
      </div>

      {/* KPI tiles */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Bookings', value: bookings.length, color: 'var(--tile-blue)' },
            { label: 'Total Revenue', value: `$${payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}`, color: 'var(--tile-yellow)' },
            { label: 'Avg Revenue/Booking', value: bookings.length > 0 ? `$${Math.round(payments.reduce((s, p) => s + p.amount, 0) / Math.max(bookings.length, 1)).toLocaleString()}` : '—', color: 'var(--tile-green)' },
            { label: 'Cancellation Rate', value: bookings.length > 0 ? `${Math.round((byStatus['cancelled'] ?? 0) / bookings.length * 100)}%` : '0%', color: 'var(--tile-orange)' },
          ].map(s => (
            <div key={s.label} className="tile" style={{ background: s.color }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>{s.label}</p>
              <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16" style={{ color: 'var(--muted)' }}>
          <Loader2 size={18} className="animate-spin" /> Loading reports…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly revenue */}
            <div className="glass p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cream)' }}>Monthly Revenue</h2>
              {monthlyRevenue.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No payment data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="v" fill="var(--amber)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Monthly bookings */}
            <div className="glass p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cream)' }}>Monthly Bookings</h2>
              {monthlyBookings.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No booking data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={monthlyBookings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="v" stroke="var(--tile-purple)" strokeWidth={2.5} dot={{ fill: 'var(--tile-purple)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Room type breakdown */}
            <div className="glass p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cream)' }}>Bookings by Room Type</h2>
              {typeData.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No data yet</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={70} strokeWidth={0}>
                        {typeData.map(m => <Cell key={m.name} fill={m.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {typeData.map(m => (
                      <div key={m.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                          <span style={{ color: 'var(--muted)' }}>{m.name}</span>
                        </div>
                        <span style={{ color: 'var(--cream)' }}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking sources */}
            <div className="glass p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cream)' }}>Booking Sources</h2>
              {sourceData.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sourceData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="source" type="category" tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="var(--tile-blue)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Status breakdown */}
          {statusData.length > 0 && (
            <div className="glass p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cream)' }}>Booking Status Breakdown</h2>
              <div className="flex flex-wrap gap-3">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm capitalize" style={{ color: 'var(--cream)' }}>{s.name.replace('_', ' ')}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
