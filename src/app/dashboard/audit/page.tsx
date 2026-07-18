'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import { Moon, Loader2, AlertTriangle, CheckCircle, Lock, TrendingUp, X } from 'lucide-react'
import { useToast } from '@/components/Toast'
import Link from 'next/link'

type Snapshot = {
  totalRooms: number
  occupiedRooms: number
  arrivalsAll: number
  arrivalsPending: number
  departuresAll: number
  departuresPending: number
  noShows: string[]
  revenue: number
  adr: number
  revpar: number
  occupancy: number
}

type AuditRow = {
  id: string
  audit_date: string
  occupied_rooms: number
  total_rooms: number
  arrivals: number
  departures: number
  no_shows: number
  revenue: number
  adr: number
  revpar: number
  occupancy_pct: number
  notes: string | null
  closed_at: string
}

export default function NightAuditPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [history, setHistory] = useState<AuditRow[]>([])
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [alreadyClosed, setAlreadyClosed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [notes, setNotes] = useState('')

  const { toast } = useToast()
  const supabase = createClient()

  const today = new Date().toISOString().slice(0, 10)

  const load = useCallback(async (hId: string) => {
    // Existing audit for today?
    const { data: existing } = await supabase
      .from('night_audits')
      .select('id, audit_date')
      .eq('hotel_id', hId).eq('audit_date', today).maybeSingle()
    setAlreadyClosed(!!existing)

    // Rooms
    const { data: rooms } = await supabase
      .from('rooms').select('id, status').eq('hotel_id', hId)

    // Today's arrivals (confirmed with check_in = today, not yet checked in)
    const { data: arrivals } = await supabase
      .from('bookings')
      .select('id, status, guests(full_name), rooms(number)')
      .eq('hotel_id', hId).eq('check_in', today)

    // Today's departures (checked_in with check_out = today)
    const { data: departures } = await supabase
      .from('bookings')
      .select('id, status').eq('hotel_id', hId).eq('check_out', today)

    // Revenue = payments today
    const { data: pays } = await supabase
      .from('payments').select('amount, status, created_at').eq('hotel_id', hId).eq('status', 'completed')

    const totalRooms = rooms?.length ?? 0
    const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length ?? 0
    const arrivalsAll = arrivals?.length ?? 0
    const arrivalsPending = (arrivals ?? []).filter(a => a.status === 'confirmed').length
    const noShowList = (arrivals ?? []).filter(a => a.status === 'confirmed').map(a => {
      const g = a.guests as { full_name?: string } | null
      const r = a.rooms as { number?: string } | null
      return `${g?.full_name ?? 'Guest'} · Room ${r?.number ?? '?'}`
    })
    const departuresAll = departures?.length ?? 0
    const departuresPending = (departures ?? []).filter(d => d.status === 'checked_in').length
    const revenue = (pays ?? []).filter(p => p.created_at?.startsWith(today)).reduce((s, p) => s + Number(p.amount), 0)
    const occupancy = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0
    const adr = occupiedRooms > 0 ? revenue / occupiedRooms : 0
    const revpar = totalRooms > 0 ? revenue / totalRooms : 0

    setSnapshot({ totalRooms, occupiedRooms, arrivalsAll, arrivalsPending, departuresAll, departuresPending, noShows: noShowList, revenue, adr, revpar, occupancy })

    // History
    const { data: hist } = await supabase
      .from('night_audits').select('*').eq('hotel_id', hId)
      .order('audit_date', { ascending: false }).limit(14)
    setHistory((hist ?? []) as AuditRow[])
  }, [supabase, today])

  useEffect(() => {
    async function init() {
      const hotel = await initHotel()
      if (!hotel) { setLoading(false); return }
      setHotelId(hotel.hotelId)
      setUserId(hotel.userId)
      await load(hotel.hotelId)
      setLoading(false)
    }
    init()
  }, [load])

  async function closeDay() {
    if (!hotelId || !snapshot) return
    setClosing(true)

    // Mark still-confirmed arrivals from today as no_show
    await supabase.from('bookings')
      .update({ status: 'no_show' })
      .eq('hotel_id', hotelId).eq('check_in', today).eq('status', 'confirmed')

    // Save snapshot
    const { error } = await supabase.from('night_audits').insert({
      hotel_id: hotelId,
      audit_date: today,
      total_rooms: snapshot.totalRooms,
      occupied_rooms: snapshot.occupiedRooms,
      arrivals: snapshot.arrivalsAll,
      departures: snapshot.departuresAll,
      no_shows: snapshot.arrivalsPending,
      revenue: snapshot.revenue,
      adr: snapshot.adr,
      revpar: snapshot.revpar,
      occupancy_pct: snapshot.occupancy,
      notes: notes || null,
      closed_by: userId,
    })

    if (error) { toast(error.message, 'error'); setClosing(false); return }

    await load(hotelId)
    setConfirmOpen(false)
    setClosing(false)
    setNotes('')
    toast(`Night audit closed for ${today}`)
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--amber)' }} />
    </div>
  )

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Night <span className="serif-italic">Audit</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            End-of-day close · {today}
          </p>
        </div>
        {alreadyClosed ? (
          <span className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac' }}>
            <Lock size={13} /> Closed for today
          </span>
        ) : (
          <button onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--tile-purple)', color: '#1a1a1a' }}>
            <Moon size={14} /> Close Day
          </button>
        )}
      </div>

      {/* Snapshot */}
      {snapshot && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="tile" style={{ background: 'var(--tile-blue)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Occupancy</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{snapshot.occupancy.toFixed(0)}%</p>
            <p className="text-[10px] mt-1" style={{ color: 'rgba(0,0,0,0.55)' }}>
              {snapshot.occupiedRooms}/{snapshot.totalRooms} rooms
            </p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-yellow)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Revenue</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>${snapshot.revenue.toLocaleString()}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-green)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>ADR</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>${snapshot.adr.toFixed(0)}</p>
            <p className="text-[10px] mt-1" style={{ color: 'rgba(0,0,0,0.55)' }}>per occupied room</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-purple)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>RevPAR</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>${snapshot.revpar.toFixed(0)}</p>
            <p className="text-[10px] mt-1" style={{ color: 'rgba(0,0,0,0.55)' }}>per available room</p>
          </div>
        </div>
      )}

      {/* Movement summary */}
      {snapshot && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="glass p-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Arrivals</p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--cream)' }}>{snapshot.arrivalsAll}</p>
            <p className="text-xs mt-1" style={{ color: snapshot.arrivalsPending > 0 ? '#fdba74' : 'var(--muted)' }}>
              {snapshot.arrivalsPending} still pending
            </p>
          </div>
          <div className="glass p-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Departures</p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--cream)' }}>{snapshot.departuresAll}</p>
            <p className="text-xs mt-1" style={{ color: snapshot.departuresPending > 0 ? '#fdba74' : 'var(--muted)' }}>
              {snapshot.departuresPending} not yet checked out
            </p>
          </div>
          <div className="glass p-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Will Be No-Show</p>
            <p className="text-2xl font-semibold" style={{ color: snapshot.arrivalsPending > 0 ? '#fdba74' : 'var(--cream)' }}>
              {snapshot.arrivalsPending}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Marked at close</p>
          </div>
        </div>
      )}

      {/* No-show list */}
      {snapshot && snapshot.arrivalsPending > 0 && !alreadyClosed && (
        <div className="glass p-4 space-y-2 border" style={{ borderColor: 'rgba(251,146,60,0.2)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} style={{ color: '#fdba74' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Pending arrivals</p>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            The following will be marked <b>no-show</b> at close. Check them in first if the guest arrived late.
          </p>
          <div className="space-y-1.5 pt-1">
            {snapshot.noShows.map((n, i) => (
              <div key={i} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--cream)' }}>
                {n}
              </div>
            ))}
          </div>
          <Link href="/dashboard/checkin" className="text-xs" style={{ color: 'var(--amber)' }}>
            → Go to check-in
          </Link>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={12} style={{ color: 'var(--muted)' }} />
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Recent closes</p>
          </div>
          <div className="glass overflow-hidden">
            {history.map((a, i) => (
              <div key={a.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 px-4 py-3 items-center"
                style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{a.audit_date}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.occupancy_pct.toFixed(0)}% occ</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>${Number(a.revenue).toLocaleString()} rev</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>ADR ${Number(a.adr).toFixed(0)}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.arrivals} in · {a.departures} out</p>
                <p className="text-xs" style={{ color: a.no_shows > 0 ? '#fdba74' : 'var(--muted-2)' }}>
                  {a.no_shows} no-show
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirmOpen && snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--cream)' }}>
                <Moon size={16} /> Close {today}?
              </h2>
              <button onClick={() => setConfirmOpen(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p style={{ color: 'var(--muted)' }}>Occupancy</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{snapshot.occupancy.toFixed(0)}%</p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p style={{ color: 'var(--muted)' }}>Revenue</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>${snapshot.revenue.toLocaleString()}</p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p style={{ color: 'var(--muted)' }}>ADR</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>${snapshot.adr.toFixed(0)}</p>
                </div>
                <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p style={{ color: 'var(--muted)' }}>RevPAR</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>${snapshot.revpar.toFixed(0)}</p>
                </div>
              </div>
            </div>

            {snapshot.arrivalsPending > 0 && (
              <div className="px-3 py-2 rounded-xl border text-xs"
                style={{ background: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.2)', color: '#fdba74' }}>
                <b>{snapshot.arrivalsPending}</b> pending arrival{snapshot.arrivalsPending !== 1 ? 's' : ''} will be marked no-show.
              </div>
            )}

            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Anything worth remembering about today…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            </div>

            <button onClick={closeDay} disabled={closing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ background: 'var(--tile-purple)', color: '#1a1a1a' }}>
              {closing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {closing ? 'Closing…' : 'Confirm & Close Day'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
