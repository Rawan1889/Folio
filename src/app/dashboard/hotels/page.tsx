'use client'

import { useState, useEffect } from 'react'
import { Hotel, MapPin, BedDouble, TrendingUp, Users, Loader2, Plus, X, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type HotelRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  address: string | null
  phone: string | null
  email: string | null
  tenants: { name: string } | null
}

const tileColors = ['var(--tile-orange)', 'var(--tile-blue)', 'var(--tile-purple)', 'var(--tile-green)', 'var(--tile-yellow)', 'var(--tile-pink)']

export default function HotelsPage() {
  const [hotels, setHotels] = useState<HotelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [tenantName, setTenantName] = useState('')

  const supabase = createClient()

  async function loadHotels() {
    const { data } = await supabase
      .from('hotels')
      .select('id, name, city, country, address, phone, email, tenants(name)')
      .order('created_at', { ascending: false })
    setHotels((data as unknown as HotelRow[]) ?? [])
  }

  useEffect(() => {
    loadHotels().then(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveError('')

    // Create tenant first
    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .insert({ name: tenantName || name })
      .select('id')
      .single()
    if (tErr) { setSaveError(tErr.message); setSaving(false); return }

    const { error } = await supabase.from('hotels').insert({
      tenant_id: tenant.id,
      name,
      city: city || null,
      country: country || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
    })
    if (error) { setSaveError(error.message); setSaving(false); return }

    await loadHotels()
    setShowModal(false); setSaving(false)
    setName(''); setCity(''); setCountry(''); setAddress(''); setPhone(''); setEmail(''); setTenantName('')
  }

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
            All <span className="serif-italic">Hotels</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Super admin · {loading ? '…' : `${hotels.length} properties across all tenants`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          <Plus size={15} /> Add Hotel
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16" style={{ color: 'var(--muted)' }}>
          <Loader2 size={18} className="animate-spin" /> Loading hotels…
        </div>
      ) : hotels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Hotel size={32} style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No hotels yet. Add the first property.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hotels.map((h, i) => (
            <div key={h.id} className="glass p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tileColors[i % tileColors.length] }}>
                  <Hotel size={18} style={{ color: '#1a1a1a' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--cream)' }}>{h.name}</h3>
                  {h.tenants && <p className="text-xs mt-0.5" style={{ color: 'var(--amber)' }}>{h.tenants.name}</p>}
                  {(h.city || h.country) && (
                    <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <MapPin size={11} /> {[h.city, h.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {h.phone && (
                  <div className="col-span-3 text-xs" style={{ color: 'var(--muted)' }}>{h.phone}</div>
                )}
                {h.email && (
                  <div className="col-span-3 text-xs truncate" style={{ color: 'var(--muted)' }}>{h.email}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Hotel Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Add Hotel</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Hotel Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Grand Hotel"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Tenant / Brand Name</label>
                <input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Same as hotel if blank"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>City</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="Duhok"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Country</label>
                  <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Iraq"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Address</label>
                  <input value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              {saveError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{saveError}</p>}
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? 'Creating…' : 'Create Hotel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
