'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

const monthly = [
  { m: 'Jan', rev: 8400, exp: 5100 }, { m: 'Feb', rev: 9200, exp: 5300 },
  { m: 'Mar', rev: 11800, exp: 6100 }, { m: 'Apr', rev: 12400, exp: 6400 },
  { m: 'May', rev: 14200, exp: 6800 }, { m: 'Jun', rev: 15800, exp: 7200 },
]

const methods = [
  { name: 'Card', value: 45, color: '#C8A84B' },
  { name: 'Cash', value: 25, color: '#3b82f6' },
  { name: 'FIB', value: 20, color: '#10b981' },
  { name: 'FastPay', value: 10, color: '#a78bfa' },
]

export default function FinancePage() {
  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Finance</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Revenue, expenses, payments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass p-5 lg:col-span-2">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Revenue vs Expenses</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#12121a', border: '1px solid #23232f', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="rev" stroke="#C8A84B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="exp" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Payment Methods</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={methods} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} strokeWidth={0}>
                {methods.map(m => <Cell key={m.name} fill={m.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {methods.map(m => (
              <div key={m.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                  <span style={{ color: 'var(--muted)' }}>{m.name}</span>
                </div>
                <span style={{ color: 'var(--cream)' }}>{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
