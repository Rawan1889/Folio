'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail, Phone, Globe, Star, CalendarDays, DollarSign, BedDouble, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GuestDocs } from '@/components/GuestDocs'

type Guest = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  nationality: string | null
  id_number: string | null
  vip: boolean
  notes: string | null
  created_at: string
  hotel_id: string
}

type BookingRow = {
  id: string
  check_in: string
  check_out: string
  status: string
  total_amount: number
  rooms: { number: string } | null
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  checked_in: 'bg-green-500/15 text-green-300 border-green-500/30',
  checked_out: 'bg-white/10 text-white/50 border-white/20',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
  no_show: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
}

export default function GuestProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [guest, setGuest] = useState<Guest | null>(null)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [vip, setVip] = useState(false)
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  const loadGuest = useCallback(async () => {
    const { data: g } = await supabase
      .from('guests')
      .select('id, full_name, email, phone, nationality, id_number, vip, notes, created_at, hotel_id')
      .eq('id', id)
      .single()

    const guest = g as unknown as Guest
    setGuest(guest)
    if (guest) {
      setFullName(guest.full_name); setEmail(guest.email ?? ''); setPhone(guest.phone ?? '')
      setNationality(guest.nationality ?? ''); setIdNumber(guest.id_number ?? '')
      setVip(guest.vip); setNotes(guest.notes ?? '')
    }

    const { data: bkgs } = await supabase
      .from('bookings')
      .select('id, check_in, check_out, status, total_amount, rooms(number)')
      .eq('guest_id', id)
      .order('check_in', { ascending: false })
    setBookings((bkgs as unknown as BookingRow[]) ?? [])
  }, [id, supabase])

  useEffect(() => { loadGuest().then(() => setLoading(false)) }, [loadGuest])

  async function saveGuest(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('guests').update({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      nationality: nationality || null,
      id_number: idNumber || null,
      vip,
      notes: notes || null,
    }).eq('id', id)
    await loadGuest()
    setSaving(false); setSaved(true); setEditing(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle = {
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
  if (!guest) return <div className="text-center py-24" style={{ color: 'var(--muted)' }}>Guest not found.</div>

  const completedBookings = bookings.filter(b => b.status === 'checked_out')
  const totalSpent = completedBookings.reduce((s, b) => s + b.total_amount, 0)
  const totalNights = completedBookings.reduce((s, b) => {
    return s + Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000))
  }, 0)

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-white/[0.04]" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl serif flex items-center gap-2" style={{ color: 'var(--cream)' }}>
            <span className="serif-italic">{guest.full_name}</span>
            {guest.vip && <Star size={18} fill="var(--amber)" style={{ color: 'var(--amber)' }} />}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Guest since {new Date(guest.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setEditing(!editing)}
          className="px-3.5 py-2 rounded-xl text-sm glass hover:bg-white/[0.06]" style={{ color: 'var(--cream)' }}>
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="tile" style={{ background: 'var(--tile-blue)' }}>
          <div className="tile-icon-btn mb-2"><CalendarDays size={12} /></div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Total Stays</p>
          <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>{bookings.length}</p>
        </div>
        <div className="tile" style={{ background: 'var(--tile-green)' }}>
          <div className="tile-icon-btn mb-2"><BedDouble size={12} /></div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Total Nights</p>
          <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>{totalNights}</p>
        </div>
        <div className="tile" style={{ background: 'var(--tile-yellow)' }}>
          <div className="tile-icon-btn mb-2"><DollarSign size={12} /></div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Total Spent</p>
          <p className="text-2xl font-semibold" style={{ color: '#1a1a1a' }}>${totalSpent.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Guest info / edit form */}
        <div className="lg:col-span-1 space-y-4">
          {editing ? (
            <form onSubmit={saveGuest} className="glass p-5 space-y-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Edit Guest</h2>
              {[
                { label: 'Full Name *', value: fullName, set: setFullName, required: true, type: 'text' },
                { label: 'Email', value: email, set: setEmail, required: false, type: 'email' },
                { label: 'Phone', value: phone, set: setPhone, required: false, type: 'text' },
                { label: 'Nationality', value: nationality, set: setNationality, required: false, type: 'text' },
                { label: 'ID Number', value: idNumber, set: setIdNumber, required: false, type: 'text' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} required={f.required}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              ))}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={vip} onChange={e => setVip(e.target.checked)} />
                <span className="text-sm" style={{ color: 'var(--cream)' }}>VIP Guest</span>
              </label>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {saved ? 'Saved!' : 'Save'}
              </button>
            </form>
          ) : (
            <div className="glass p-5 space-y-3">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Contact Info</h2>
              {[
                { icon: Mail, value: guest.email },
                { icon: Phone, value: guest.phone },
                { icon: Globe, value: guest.nationality },
              ].filter(f => f.value).map(({ icon: Icon, value }) => (
                <div key={value} className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                  <Icon size={13} /> {value}
                </div>
              ))}
              {guest.id_number && (
                <div className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)' }}>
                  ID: {guest.id_number}
                </div>
              )}
              {guest.notes && (
                <p className="text-sm px-2.5 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)' }}>
                  {guest.notes}
                </p>
              )}
            </div>
          )}
          <GuestDocs guestId={guest.id} hotelId={guest.hotel_id} />
        </div>

        {/* Booking history */}
        <div className="lg:col-span-2 glass overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Stay History</h2>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>No bookings yet.</p>
          ) : (
            <div>
              {bookings.map(b => (
                <Link key={b.id} href={`/dashboard/bookings/${b.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>
                      Room {b.rooms?.number ?? '—'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{b.check_in} → {b.check_out}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>${b.total_amount.toLocaleString()}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusColors[b.status] ?? 'bg-white/10 text-white/50 border-white/20'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
