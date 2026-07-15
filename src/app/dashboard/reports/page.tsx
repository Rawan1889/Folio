'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, CartesianGrid } from 'recharts'

const occupancy = [
  { month: 'Jan', pct: 58 }, { month: 'Feb', pct: 64 }, { month: 'Mar', pct: 72 },
  { month: 'Apr', pct: 68 }, { month: 'May', pct: 78 }, { month: 'Jun', pct: 84 },
]

const byType = [
  { name: 'Standard', value: 40, color: '#C8A84B' },
  { name: 'Deluxe', value: 30, color: '#3b82f6' },
  { name: 'Suite', value: 20, color: '#a78bfa' },
  { name: 'Apartment', value: 10, color: '#10b981' },
]

const sources = [
  { source: 'Direct', count: 45 }, { source: 'Online', count: 32 },
  { source: 'Phone', count: 18 }, { source: 'Agency', count: 12 }, { source: 'Walk-in', count: 8 },
]

export default function ReportsPage() {
  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Reports</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Operational insights & trends</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass p-5">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Occupancy Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={occupancy}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid #23232f', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="pct" stroke="#C8A84B" strokeWidth={2} dot={{ fill: '#C8A84B', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Bookings by Room Type</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byType} dataKey="value" nameKey="name" outerRadius={70} strokeWidth={0}>
                {byType.map(m => <Cell key={m.name} fill={m.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid #23232f', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5 lg:col-span-2">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Booking Sources</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sources}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid #23232f', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#C8A84B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
