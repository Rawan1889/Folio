'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, KeyRound } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login?error=invite_expired')
        return
      }
      setEmail(user.email ?? '')
      setChecking(false)
    })
  }, [router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setSaving(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--amber)' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-strong p-8 w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--tile-yellow)' }}>
            <KeyRound size={22} style={{ color: '#1a1a1a' }} />
          </div>
          <h1 className="text-2xl serif" style={{ color: 'var(--cream)' }}>
            Set your <span className="serif-italic">password</span>
          </h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Signed in as {email}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>New Password *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              autoFocus minLength={8} placeholder="Min 8 characters"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
