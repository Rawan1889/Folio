'use client'

import { BedDouble, CalendarDays, DollarSign, TrendingUp, Upload, Sparkles, Award, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const weekly = [
  { d: 'Mon', v: 1200 }, { d: 'Tue', v: 1500 }, { d: 'Wed', v: 900 },
  { d: 'Thu', v: 1800 }, { d: 'Fri', v: 2200 }, { d: 'Sat', v: 2600 }, { d: 'Sun', v: 2100 },
]

const activity = [
  { name: 'Ahmed Barzani', msg: 'Checked in to Room 201', time: '2h', color: 'var(--tile-yellow)' },
  { name: 'Sara Ibrahim', msg: 'Booking confirmed for July 18', time: '3h', color: 'var(--tile-purple)' },
  { name: 'John Miller', msg: 'Requested late check-out', time: '4h', color: 'var(--tile-blue)' },
  { name: 'Layla Ahmad', msg: 'Left a 5★ review', time: '5h', color: 'var(--tile-pink)' },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Main content */}
      <div className="flex-1 space-y-4 max-w-4xl">
        {/* Title */}
        <div className="px-2">
          <h1 className="text-4xl serif" style={{ color: 'var(--cream)' }}>
            Grand <span className="serif-italic">Duhok Hotel</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>Overview · Thursday, July 18</p>
        </div>

        {/* Widget grid — mimic the reference layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Occupancy — large yellow tile */}
          <div className="tile col-span-2" style={{ background: 'var(--tile-yellow)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="tile-icon-btn"><BedDouble size={14} /></div>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(0,0,0,0.55)' }}>Occupancy</span>
              </div>
              <button className="tile-icon-btn"><Upload size={12} /></button>
            </div>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-5xl font-semibold" style={{ color: '#1a1a1a' }}>72%</span>
              <span className="text-sm" style={{ color: 'rgba(0,0,0,0.6)' }}>30 of 42 rooms occupied</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <div className="h-full rounded-full" style={{ width: '72%', background: '#1a1a1a' }} />
            </div>
            <div className="flex items-center gap-1 mt-3">
              {['#F28C4B', '#C7A2E8', '#8FCFE8', '#B8E366', '#F0A5C0'].map(c => (
                <div key={c} className="w-6 h-6 rounded-full border-2 border-white/90" style={{ background: c }} />
              ))}
              <span className="text-xs ml-2" style={{ color: 'rgba(0,0,0,0.55)' }}>+12 guests today</span>
            </div>
          </div>

          {/* Revenue — orange */}
          <div className="tile" style={{ background: 'var(--tile-orange)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><DollarSign size={14} /></div>
              <button className="tile-icon-btn"><Upload size={12} /></button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Revenue</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>$12.3k</span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(0,0,0,0.6)' }}>This week · +12% vs last week</p>
          </div>

          {/* Bookings — purple */}
          <div className="tile" style={{ background: 'var(--tile-purple)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><CalendarDays size={14} /></div>
              <button className="tile-icon-btn"><Upload size={12} /></button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Bookings today</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>18</span>
              <span className="text-xs" style={{ color: 'rgba(0,0,0,0.6)' }}>+2 vs yesterday</span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(0,0,0,0.6)' }}>6 pending arrivals</p>
          </div>

          {/* ADR — green */}
          <div className="tile" style={{ background: 'var(--tile-green)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><TrendingUp size={14} /></div>
              <button className="tile-icon-btn"><Upload size={12} /></button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>ADR</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>$142</span>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(0,0,0,0.6)' }}>Avg daily rate · +3%</p>
          </div>

          {/* Badges — blue */}
          <div className="tile" style={{ background: 'var(--tile-blue)' }}>
            <div className="flex items-start justify-between mb-3">
              <div className="tile-icon-btn"><Award size={14} /></div>
              <button className="tile-icon-btn"><Upload size={12} /></button>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(0,0,0,0.55)' }}>Milestones</p>
            <div className="grid grid-cols-3 gap-2">
              {[Sparkles, Award, Clock].map((Icon, i) => (
                <div key={i} className="aspect-square rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.08)' }}>
                  <Icon size={16} style={{ color: 'rgba(0,0,0,0.7)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue chart in glass card */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Revenue · Last 7 days</h2>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>$12,300 total</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly}>
              <XAxis dataKey="d" tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.5)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(245,242,234,0.5)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(20,22,28,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="v" fill="#D4B15A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity sidebar (right) */}
      <div className="w-full lg:w-72 flex-shrink-0 space-y-3">
        <h2 className="text-xl serif px-2" style={{ color: 'var(--cream)' }}>Activity</h2>
        <div className="space-y-2">
          {activity.map((a, i) => (
            <div key={i} className="glass p-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: a.color, color: '#1a1a1a' }}>
                {a.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--cream)' }}>{a.name}</p>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--muted-2)' }}>{a.time}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{a.msg}</p>
                <button className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--amber)' }}>Reply</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
