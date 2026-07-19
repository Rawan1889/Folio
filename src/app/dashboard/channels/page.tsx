'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import { Plus, X, Loader2, RefreshCw, Trash2, Link2, Globe } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { SkeletonRow } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'

type Channel = {
  id: string
  name: string
  provider: string
  ical_url: string
  room_id: string | null
  last_synced: string | null
  active: boolean
  rooms: { number: string } | null
}

type Room = { id: string; number: string }

const providerLabels: Record<string, string> = {
  booking_com: 'Booking.com',
  airbnb: 'Airbnb',
  expedia: 'Expedia',
  other: 'Other',
}

const providerColors: Record<string, string> = {
  booking_com: 'var(--tile-blue)',
  airbnb: 'var(--tile-pink)',
  expedia: 'var(--tile-yellow)',
  other: 'rgba(255,255,255,0.1)',
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('booking_com')
  const [icalUrl, setIcalUrl] = useState('')
  const [roomId, setRoomId] = useState('')
  const [saving, setSaving] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async (hId: string) => {
    const [{ data: chData }, { data: rmData }] = await Promise.all([
      supabase.from('channel_sources')
        .select('id, name, provider, ical_url, room_id, last_synced, active, rooms(number)')
        .eq('hotel_id', hId).order('created_at'),
      supabase.from('rooms').select('id, number').eq('hotel_id', hId).order('number'),
    ])
    setChannels((chData ?? []) as unknown as Channel[])
    setRooms((rmData ?? []) as Room[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const hotel = await initHotel()
      if (!hotel?.hotelId) { setLoading(false); return }
      setHotelId(hotel.hotelId)
      await load(hotel.hotelId)
      setLoading(false)
    }
    init()
  }, [load])

  async function addChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId) return
    setSaving(true)
    const { error } = await supabase.from('channel_sources').insert({
      hotel_id: hotelId, name, provider, ical_url: icalUrl, room_id: roomId || null,
    })
    if (error) { toast(error.message, 'error'); setSaving(false); return }
    await load(hotelId)
    setShowAdd(false); setSaving(false)
    setName(''); setProvider('booking_com'); setIcalUrl(''); setRoomId('')
    toast('Channel added')
  }

  async function sync(id: string) {
    setSyncing(id)
    const res = await fetch('/api/channels/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: id }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Sync failed', 'error'); setSyncing(null); return }
    toast(`Synced · ${data.imported} imported, ${data.skipped} skipped`)
    if (hotelId) await load(hotelId)
    setSyncing(null)
  }

  async function remove(id: string) {
    if (!confirm('Delete this channel? Existing imported bookings will stay.')) return
    await supabase.from('channel_sources').delete().eq('id', id)
    setChannels(channels.filter(c => c.id !== id))
    toast('Channel removed')
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Chan<span className="serif-italic">nels</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…' : `${channels.length} channels · pull bookings from Booking.com, Airbnb, Expedia`}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          <Plus size={14} /> Add Channel
        </button>
      </div>

      <div className="px-4 py-3 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: 'var(--muted)' }}>
        Paste an iCal URL from your Booking.com / Airbnb calendar export, attach it to a room. Click <b style={{ color: 'var(--cream)' }}>Sync</b> to pull new reservations as confirmed bookings.
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : channels.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No channels yet"
          description="Add your first iCal feed to import bookings from external OTAs."
          action={
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              <Plus size={14} /> Add Channel
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {channels.map(c => (
            <div key={c.id} className="glass p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: providerColors[c.provider] }}>
                <Link2 size={14} style={{ color: '#1a1a1a' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{c.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
                    {providerLabels[c.provider]}
                  </span>
                  {c.rooms?.number && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(212,177,90,0.15)', color: 'var(--amber)' }}>
                      Room {c.rooms.number}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>
                  {c.last_synced ? `Last synced ${new Date(c.last_synced).toLocaleString()}` : 'Never synced'}
                </p>
              </div>
              <button onClick={() => sync(c.id)} disabled={syncing === c.id || !c.room_id}
                title={!c.room_id ? 'Attach a room first' : 'Sync now'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 hover:opacity-90"
                style={{ background: 'var(--tile-blue)', color: '#1a1a1a' }}>
                {syncing === c.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                Sync
              </button>
              <button onClick={() => remove(c.id)}
                className="p-2 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--muted)' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Add Channel</h2>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={addChannel} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Booking.com — Rm 301"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Provider</label>
                  <select value={provider} onChange={e => setProvider(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    {Object.entries(providerLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Attach to Room *</label>
                  <select value={roomId} onChange={e => setRoomId(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">Select room…</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>Room {r.number}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>iCal URL *</label>
                <input value={icalUrl} onChange={e => setIcalUrl(e.target.value)} required type="url"
                  placeholder="https://admin.booking.com/hotel/ical.html?...uid=xxx"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted-2)' }}>
                  Find this in your Booking.com extranet under Rates & Availability → Calendar → iCal export.
                </p>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? 'Saving…' : 'Add Channel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
