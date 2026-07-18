'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Hotel, Globe, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

type Hotel = {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  city: string | null
  country: string | null
  currency: string | null
  timezone: string | null
  check_in_time: string | null
  check_out_time: string | null
}

type Profile = {
  id: string
  full_name: string | null
  role: string
}

export default function SettingsPage() {
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Hotel form state
  const [hotelName, setHotelName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('Asia/Baghdad')
  const [checkInTime, setCheckInTime] = useState('14:00')
  const [checkOutTime, setCheckOutTime] = useState('12:00')

  // Profile form state
  const [fullName, setFullName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('id, full_name, role, tenant_id').eq('id', user.id).single()
      setProfile(prof)
      setFullName(prof?.full_name ?? '')

      let h: Hotel | null = null
      if (prof?.role === 'super_admin') {
        const { data } = await supabase.from('hotels').select('*').order('created_at').limit(1).single()
        h = data
      } else if (prof?.tenant_id) {
        const { data } = await supabase.from('hotels').select('*').eq('tenant_id', prof.tenant_id).order('created_at').limit(1).single()
        h = data
      }

      if (h) {
        setHotel(h)
        setHotelName(h.name ?? '')
        setAddress(h.address ?? '')
        setPhone(h.phone ?? '')
        setEmail(h.email ?? '')
        setCity(h.city ?? '')
        setCountry(h.country ?? '')
        setCurrency(h.currency ?? 'USD')
        setTimezone(h.timezone ?? 'Asia/Baghdad')
        setCheckInTime(h.check_in_time ?? '14:00')
        setCheckOutTime(h.check_out_time ?? '12:00')
      }
      setLoading(false)
    }
    init()
  }, [supabase])

  async function saveHotel(e: React.FormEvent) {
    e.preventDefault()
    if (!hotel) return
    setSaving(true); setError('')
    const { error: err } = await supabase.from('hotels').update({
      name: hotelName,
      address: address || null,
      phone: phone || null,
      email: email || null,
      city: city || null,
      country: country || null,
      currency,
      timezone,
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
    }).eq('id', hotel.id)
    if (err) { setError(err.message); toast(err.message, 'error') }
    else { setSaved(true); setTimeout(() => setSaved(false), 2000); toast('Hotel settings saved') }
    setSaving(false)
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setProfileSaving(true)
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)
    setProfileSaving(false); setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
    toast('Profile saved')
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  if (loading) return (
    <div className="flex items-center justify-center gap-3 py-24" style={{ color: 'var(--muted)' }}>
      <Loader2 size={18} className="animate-spin" /> Loading settings…
    </div>
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
          Set<span className="serif-italic">tings</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Hotel configuration & preferences</p>
      </div>

      {/* Hotel Info */}
      <form onSubmit={saveHotel} className="glass p-5 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--tile-orange)' }}>
            <Hotel size={13} style={{ color: '#1a1a1a' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Hotel Info</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Hotel Name</label>
            <input value={hotelName} onChange={e => setHotelName(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Country</label>
            <input value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
        </div>
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>

      {/* Localization */}
      <form onSubmit={saveHotel} className="glass p-5 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--tile-blue)' }}>
            <Globe size={13} style={{ color: '#1a1a1a' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Localization & Operations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              {['USD', 'IQD', 'EUR', 'AED', 'GBP', 'SAR'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              {['Asia/Baghdad', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/London', 'UTC'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Language</label>
            <select className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              {['English', 'العربية', 'کوردی'].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Check-in Time</label>
            <input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Check-out Time</label>
            <input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>

      {/* Profile */}
      <form onSubmit={saveProfile} className="glass p-5 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--tile-purple)' }}>
            <User size={13} style={{ color: '#1a1a1a' }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Your Profile</h2>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full max-w-sm px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
        </div>
        {profile && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Role: <span className="capitalize" style={{ color: 'var(--amber)' }}>{profile.role.replace('_', ' ')}</span>
          </p>
        )}
        <button type="submit" disabled={profileSaving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {profileSaved ? 'Saved!' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
