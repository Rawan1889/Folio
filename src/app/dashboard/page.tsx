'use client'

import { BedDouble, CalendarDays, DollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const weekly = [
  { d: 'Mon', v: 1200 }, { d: 'Tue', v: 1500 }, { d: 'Wed', v: 900 },
  { d: 'Thu', v: 1800 }, { d: 'Fri', v: 2200 }, { d: 'Sat', v: 2600 }, { d: 'Sun', v: 2100 },
]

const kpis = [
  { label: 'Occupancy', value: '72%', delta: '+4%', icon: BedDouble },
  { label: 'Bookings today', value: '18', delta: '+2', icon: CalendarDays },
  { label: 'Revenue (week)', value: '$12.3k', delta: '+12%', icon: DollarSign },
  { label: 'ADR', value: '$142', delta: '+3%', icon: TrendingUp },
]

export default function DashboardPage() {
  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Overview of your hotel operations</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, delta, icon: Icon }) => (
          <div key={label} className="glass p-4">
            <div className="flex items-center justify-between mb-2">
              <Icon size={16} style={{ color: 'var(--amber)' }} />
              <span className="text-[10px] font-medium" style={{ color: '#10b981' }}>{delta}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-xl font-semibold mt-0.5" style={{ color: 'var(--cream)' }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="glass p-5">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Revenue · Last 7 days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="d" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#12121a', border: '1px solid #23232f', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="v" fill="#C8A84B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
