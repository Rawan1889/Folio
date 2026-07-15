'use client'

import { Plus, Star, Mail, Phone } from 'lucide-react'

const mock = [
  { id: 1, name: 'Ahmed Barzani', email: 'ahmed@example.com', phone: '+964 750 123 4567', nationality: 'Iraq', stays: 4, vip: true },
  { id: 2, name: 'Sara Ibrahim', email: 'sara@example.com', phone: '+964 751 234 5678', nationality: 'Iraq', stays: 2, vip: false },
  { id: 3, name: 'John Miller', email: 'john@example.com', phone: '+1 555 987 6543', nationality: 'USA', stays: 1, vip: false },
]

export default function GuestsPage() {
  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Guests</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{mock.length} guests in your CRM</p>
        </div>
        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--amber)', color: '#000' }}>
          <Plus size={14} /> Add Guest
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {mock.map(g => (
          <div key={g.id} className="glass p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--amber)' }}>
                  {g.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--cream)' }}>{g.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{g.nationality} · {g.stays} stays</p>
                </div>
              </div>
              {g.vip && <Star size={14} fill="#C8A84B" style={{ color: 'var(--amber)' }} />}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}><Mail size={11} />{g.email}</div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}><Phone size={11} />{g.phone}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
