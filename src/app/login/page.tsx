'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const configured = isSupabaseConfigured()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!configured) { router.push('/dashboard'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--obsidian)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--amber)' }}>
              <span className="text-black font-bold text-sm">F</span>
            </div>
            <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--cream)' }}>Folio</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Hotel Management Platform</p>
        </div>

        {!configured && (
          <div className="mb-4 px-4 py-3 rounded-lg text-xs border" style={{ background: '#C8A84B10', borderColor: '#C8A84B30', color: '#C8A84B' }}>
            <strong>Demo mode</strong> — Supabase not connected. Click Sign in to explore the UI.
          </div>
        )}

        <div className="glass p-8">
          <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--cream)' }}>Sign in</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Access your hotel dashboard</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required={configured} placeholder="you@hotel.com"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={configured} placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--amber)', color: '#000' }}>
              {loading ? 'Signing in…' : configured ? 'Sign in' : 'Enter Demo →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--muted)' }}>Folio · Every stay, on record.</p>
      </div>
    </div>
  )
}
