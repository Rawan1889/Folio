'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import { UserPlus, Trash2, Shield, X, Loader2, Users } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'

type Staff = {
  id: string
  full_name: string | null
  role: 'super_admin' | 'hotel_admin' | 'manager' | 'staff'
  tenant_id: string | null
  hotel_id: string | null
  created_at: string
}

const roleColors: Record<string, string> = {
  super_admin: 'var(--amber)',
  hotel_admin: 'var(--tile-orange)',
  manager: 'var(--tile-blue)',
  staff: 'var(--tile-purple)',
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  hotel_admin: 'Hotel Admin',
  manager: 'Manager',
  staff: 'Staff',
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [myRole, setMyRole] = useState<string>('')
  const [myId, setMyId] = useState<string>('')

  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Staff['role']>('staff')
  const [password, setPassword] = useState('')
  const [inviteHotelId, setInviteHotelId] = useState('')
  const [availableHotels, setAvailableHotels] = useState<{ id: string; name: string }[]>([])
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async (hId: string, tenantId: string | null, isSuperAdmin: boolean) => {
    let query = supabase.from('profiles')
      .select('id, full_name, role, tenant_id, hotel_id, created_at')
      .order('role').order('full_name')

    if (!isSuperAdmin && tenantId) {
      query = query.eq('tenant_id', tenantId)
    }
    const { data } = await query
    setStaff((data ?? []) as Staff[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const hotel = await initHotel()
      if (!hotel) { setLoading(false); return }
      setHotelId(hotel.hotelId)
      setMyId(hotel.userId)

      const { data: profile } = await supabase.from('profiles')
        .select('role, tenant_id').eq('id', hotel.userId).single()
      setMyRole(profile?.role ?? '')

      // Populate hotel picker for the invite modal
      let hotelsQuery = supabase.from('hotels').select('id, name').order('name')
      if (profile?.role !== 'super_admin' && profile?.tenant_id) {
        hotelsQuery = hotelsQuery.eq('tenant_id', profile.tenant_id)
      }
      const { data: hotelsData } = await hotelsQuery
      setAvailableHotels(hotelsData ?? [])
      setInviteHotelId(hotel.hotelId)

      await load(hotel.hotelId, profile?.tenant_id ?? null, profile?.role === 'super_admin')
      setLoading(false)
    }
    init()
  }, [load, supabase])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId) return
    setInviting(true); setInviteError('')
    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, role, hotelId: inviteHotelId || hotelId, password: password || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setInviteError(data.error ?? 'Failed'); setInviting(false); return }
    toast(password ? `${email} added` : `Invite sent to ${email}`)
    setShowInvite(false); setInviting(false)
    setEmail(''); setFullName(''); setRole('staff'); setPassword('')

    // Refresh
    const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', myId).single()
    await load(hotelId, profile?.tenant_id ?? null, myRole === 'super_admin')
  }

  async function updateRole(id: string, newRole: Staff['role']) {
    if (!hotelId) return
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    setStaff(s => s.map(x => x.id === id ? { ...x, role: newRole } : x))
    toast('Role updated')
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name}? This deletes their account permanently.`)) return
    const res = await fetch('/api/staff/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Failed', 'error'); return }
    setStaff(s => s.filter(x => x.id !== id))
    toast(`${name} removed`)
  }

  const canManage = ['super_admin', 'hotel_admin'].includes(myRole)

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
            St<span className="serif-italic">aff</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…' : `${staff.length} people with access`}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
            <UserPlus size={14} /> Add Staff
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff yet"
          description="Invite your first team member to start collaborating."
          action={canManage ? (
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              <UserPlus size={14} /> Add Staff
            </button>
          ) : undefined}
        />
      ) : (
        <div className="glass overflow-hidden">
          {staff.map((s, i) => (
            <div key={s.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: roleColors[s.role], color: '#1a1a1a' }}>
                {(s.full_name ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--cream)' }}>
                  {s.full_name ?? 'Unnamed'}
                  {s.id === myId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>You</span>
                  )}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Joined {s.created_at?.slice(0, 10)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && s.id !== myId ? (
                  <select value={s.role}
                    onChange={e => updateRole(s.id, e.target.value as Staff['role'])}
                    className="text-xs px-2.5 py-1.5 rounded-lg outline-none capitalize"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {(myRole === 'super_admin' ? ['super_admin', 'hotel_admin', 'manager', 'staff'] : ['hotel_admin', 'manager', 'staff']).map(r => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                ) : (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: roleColors[s.role] }}>
                    <Shield size={10} /> {roleLabels[s.role]}
                  </span>
                )}
                {canManage && s.id !== myId && (
                  <button onClick={() => remove(s.id, s.full_name ?? 'this user')}
                    className="p-2 rounded-lg hover:bg-red-500/10"
                    style={{ color: 'var(--muted)' }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Add Staff</h2>
              <button onClick={() => setShowInvite(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Set a password to add them immediately. Leave blank to send a magic-link invite instead.
            </p>
            <form onSubmit={invite} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="staff@example.com"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Sara Kurdi"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Role</label>
                  <select value={role} onChange={e => setRole(e.target.value as Staff['role'])}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    {(myRole === 'super_admin' ? ['super_admin', 'hotel_admin', 'manager', 'staff'] : ['hotel_admin', 'manager', 'staff']).map(r => (
                      <option key={r} value={r}>{roleLabels[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Hotel *</label>
                  <select value={inviteHotelId} onChange={e => setInviteHotelId(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    {availableHotels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
                  Password <span style={{ color: 'var(--muted-2)' }}>(optional · min 6 chars)</span>
                </label>
                <input type="text" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Leave blank to send email invite"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted-2)' }}>
                  Share this with the user securely. They can change it in Settings after login.
                </p>
              </div>
              {inviteError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{inviteError}</p>
              )}
              <button type="submit" disabled={inviting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {inviting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                {inviting ? 'Saving…' : (password ? 'Create Account' : 'Send Invite')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
