'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Star, Mail, Phone, Globe, X, Loader2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
}

const tileColors = ['var(--tile-yellow)', 'var(--tile-orange)', 'var(--tile-purple)', 'var(--tile-green)', 'var(--tile-blue)', 'var(--tile-pink)']

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [isVip, setIsVip] = useState(false)
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  const loadGuests = useCallback(async (hId: string) => {
    const { data } = await supabase
      .from('guests')
      .select('id, full_name, email, phone, nationality, id_number, vip, notes, created_at')
      .eq('hotel_id', hId)
      .order('full_name')
    setGuests(data ?? [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()

      let hotel: { id: string } | null = null
      if (profile?.role === 'super_admin') {
        const { data } = await supabase.from('hotels').select('id').order('created_at').limit(1).single()
        hotel = data
      } else if (profile?.tenant_id) {
        const { data } = await supabase.from('hotels').select('id').eq('tenant_id', profile.tenant_id).order('created_at').limit(1).single()
        hotel = data
      }

      if (hotel?.id) { setHotelId(hotel.id); await loadGuests(hotel.id) }
      setLoading(false)
    }
    init()
  }, [loadGuests, supabase])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId) return
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('guests').insert({
      hotel_id: hotelId,
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      nationality: nationality || null,
      id_number: idNumber || null,
      vip: isVip,
      notes: notes || null,
    })
    if (error) { setSaveError(error.message); setSaving(false); return }
    await loadGuests(hotelId)
    setShowModal(false); setSaving(false)
    setFullName(''); setEmail(''); setPhone(''); setNationality(''); setIdNumber(''); setIsVip(false); setNotes('')
  }

  const filtered = guests.filter(g =>
    g.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (g.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (g.phone ?? '').includes(search)
  )

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            Gue<span className="serif-italic">sts</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…' : `${guests.length} guests in your CRM`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          <Plus size={15} /> Add Guest
        </button>
      </div>

      {/* Stat tiles */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="tile" style={{ background: 'var(--tile-blue)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Total Guests</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{guests.length}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-yellow)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>VIP Guests</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{guests.filter(g => g.vip).length}</p>
          </div>
          <div className="tile col-span-2 lg:col-span-1" style={{ background: 'var(--tile-purple)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Nationalities</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>
              {new Set(guests.map(g => g.nationality).filter(Boolean)).size}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
      </div>

      {/* Guest cards */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16" style={{ color: 'var(--muted)' }}>
          <Loader2 size={18} className="animate-spin" /> Loading guests…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Users size={32} style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No guests yet. Add your first guest.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g, i) => (
            <div key={g.id} className="glass p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ background: tileColors[i % tileColors.length], color: '#1a1a1a' }}>
                    {g.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{g.full_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {[g.nationality, g.id_number ? `ID: ${g.id_number}` : null].filter(Boolean).join(' · ') || 'Guest'}
                    </p>
                  </div>
                </div>
                {g.vip && <Star size={14} fill="var(--amber)" style={{ color: 'var(--amber)', flexShrink: 0 }} />}
              </div>
              <div className="space-y-1.5">
                {g.email && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <Mail size={11} /><span className="truncate">{g.email}</span>
                  </div>
                )}
                {g.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <Phone size={11} />{g.phone}
                  </div>
                )}
                {g.nationality && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <Globe size={11} />{g.nationality}
                  </div>
                )}
              </div>
              {g.notes && (
                <p className="text-xs mt-3 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)' }}>
                  {g.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Guest Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Add Guest</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Full Name *</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Ahmed Barzani"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+964 750…"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Nationality</label>
                  <input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="Iraq"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>ID Number</label>
                  <input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Passport / ID"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Allergies, preferences…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isVip} onChange={e => setIsVip(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm" style={{ color: 'var(--cream)' }}>Mark as VIP</span>
              </label>
              {saveError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{saveError}</p>}
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? 'Saving…' : 'Add Guest'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
