'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'

type Payment = {
  id: string
  amount: number
  method: string
  status: string
  created_at: string
  bookings: { check_in: string; total_amount: number } | null
}

const methodColors: Record<string, string> = {
  card: 'var(--tile-yellow)',
  cash: 'var(--tile-green)',
  fib: 'var(--tile-blue)',
  fastpay: 'var(--tile-purple)',
  other: 'var(--tile-pink)',
}

export default function FinancePage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadPayments = useCallback(async (hId: string) => {
    const { data } = await supabase
      .from('payments')
      .select('id, amount, method, status, created_at, bookings(check_in, total_amount)')
      .eq('hotel_id', hId)
      .order('created_at', { ascending: false })
    const normalized = (data ?? []).map(p => ({
      ...p,
      amount: Number(p.amount),
      bookings: p.bookings ? { ...p.bookings, total_amount: Number((p.bookings as { total_amount: number }).total_amount) } : null,
    })) as unknown as Payment[]
    setPayments(normalized)
  }, [supabase])

  useEffect(() => {
    async function init() {
      const hotel = await initHotel()
      if (hotel?.hotelId) await loadPayments(hotel.hotelId)
      setLoading(false)
    }
    init()
  }, [loadPayments])

  const completed = payments.filter(p => p.status === 'completed')
  const totalRevenue = completed.reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  // Group by month for line chart
  const byMonth: Record<string, number> = {}
  completed.forEach(p => {
    const m = p.created_at?.slice(0, 7) ?? ''
    if (m) byMonth[m] = (byMonth[m] ?? 0) + p.amount
  })
  const monthlyData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => ({ m: m.slice(5), v }))

  // Group by payment method
  const byMethod: Record<string, number> = {}
  completed.forEach(p => { byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount })
  const methodData = Object.entries(byMethod).map(([name, value]) => ({ name, value }))

  const tooltipStyle = { background: 'rgba(13,15,20,0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
          Fin<span className="serif-italic">ance</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Revenue, payments & trends</p>
      </div>

      {/* Stat tiles */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="tile" style={{ background: 'var(--tile-yellow)' }}>
            <div className="tile-icon-btn mb-3"><DollarSign size={14} /></div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Total Revenue</p>
            <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-green)' }}>
            <div className="tile-icon-btn mb-3"><TrendingUp size={14} /></div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Paid</p>
            <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>{completed.length}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-orange)' }}>
            <div className="tile-icon-btn mb-3"><TrendingDown size={14} /></div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Pending</p>
            <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>${pending.toLocaleString()}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-blue)' }}>
            <div className="tile-icon-btn mb-3"><CreditCard size={14} /></div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Transactions</p>
            <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>{payments.length}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16" style={{ color: 'var(--muted)' }}>
          <Loader2 size={18} className="animate-spin" /> Loading finance data…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue chart */}
            <div className="glass p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cream)' }}>Revenue by Month</h2>
              {monthlyData.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No payment data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="m" tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.4)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="v" stroke="var(--amber)" strokeWidth={2.5} dot={{ fill: 'var(--amber)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment methods */}
            <div className="glass p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--cream)' }}>Payment Methods</h2>
              {methodData.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No data yet</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={methodData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={62} strokeWidth={0}>
                        {methodData.map(m => <Cell key={m.name} fill={methodColors[m.name] ?? 'var(--tile-pink)'} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {methodData.map(m => (
                      <div key={m.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: methodColors[m.name] ?? 'var(--tile-pink)' }} />
                          <span className="capitalize" style={{ color: 'var(--muted)' }}>{m.name}</span>
                        </div>
                        <span style={{ color: 'var(--cream)' }}>${m.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="glass overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Recent Transactions</h2>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--muted)' }}>No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Date', 'Method', 'Amount', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 20).map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-5 py-3 text-xs" style={{ color: 'var(--muted)' }}>{p.created_at?.slice(0, 10) ?? '—'}</td>
                        <td className="px-5 py-3">
                          <span className="capitalize text-xs px-2 py-0.5 rounded-lg" style={{ background: `${methodColors[p.method] ?? 'rgba(255,255,255,0.1)'}22`, color: methodColors[p.method] ?? 'var(--muted)' }}>
                            {p.method}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold" style={{ color: 'var(--amber)' }}>${p.amount.toLocaleString()}</td>
                        <td className="px-5 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${p.status === 'completed' ? 'bg-green-500/15 text-green-300 border-green-500/30' : p.status === 'pending' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
