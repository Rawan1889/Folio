'use client'

import { Hotel, MapPin, TrendingUp, Users } from 'lucide-react'

const mock = [
  { id: 1, name: 'Grand Duhok Hotel', tenant: 'Barzani Hospitality', city: 'Duhok, Iraq', rooms: 42, occupancy: 78, revenue: 15800 },
  { id: 2, name: 'Cedar Erbil Resort', tenant: 'Kurdistan Group', city: 'Erbil, Iraq', rooms: 68, occupancy: 82, revenue: 24200 },
  { id: 3, name: 'Suli Suites', tenant: 'Suli Hospitality', city: 'Sulaymaniyah', rooms: 28, occupancy: 71, revenue: 9400 },
]

export default function HotelsPage() {
  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>All Hotels</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Super admin · all properties across all tenants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mock.map(h => (
          <div key={h.id} className="glass p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--amber-dim)' }}>
                <Hotel size={18} style={{ color: 'var(--amber)' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{h.name}</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{h.tenant}</p>
                <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                  <MapPin size={11} /> {h.city}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Rooms</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>{h.rooms}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--muted)' }}><Users size={9} />Occupancy</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>{h.occupancy}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide flex items-center gap-1" style={{ color: 'var(--muted)' }}><TrendingUp size={9} />Revenue</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--amber)' }}>${(h.revenue / 1000).toFixed(1)}k</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
