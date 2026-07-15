'use client'

import { useState } from 'react'
import { Plus, Search, CalendarDays } from 'lucide-react'
import { getStatusColor } from '@/lib/utils'

const mock = [
  { id: 'B-1024', guest: 'Ahmed Barzani', room: '201', in: '2026-07-16', out: '2026-07-19', nights: 3, total: 390, status: 'checked_in' },
  { id: 'B-1025', guest: 'Sara Ibrahim', room: '303', in: '2026-07-16', out: '2026-07-18', nights: 2, total: 440, status: 'confirmed' },
  { id: 'B-1026', guest: 'John Miller', room: '105', in: '2026-07-17', out: '2026-07-20', nights: 3, total: 240, status: 'confirmed' },
]

export default function BookingsPage() {
  const [search, setSearch] = useState('')
  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Bookings</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{mock.length} active bookings</p>
        </div>
        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--amber)', color: '#000' }}>
          <Plus size={14} /> New Booking
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings…"
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.map(b => (
              <tr key={b.id} className="hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--amber)' }}>{b.id}</td>
                <td className="px-4 py-3" style={{ color: 'var(--cream)' }}>{b.guest}</td>
                <td className="px-4 py-3" style={{ color: 'var(--cream)' }}>{b.room}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{b.in}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{b.out}</td>
                <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{b.nights}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--amber)' }}>${b.total}</td>
                <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getStatusColor(b.status)}`}>{b.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
