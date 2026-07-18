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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--tile-yellow)' }}>
              <span className="font-bold text-base" style={{ color: '#1a1a1a' }}>F</span>
            </div>
          </div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>Welcome to <span className="serif-italic">Folio</span></h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>Every stay, on record</p>
        </div>

        {!configured && (
          <div className="mb-4 px-4 py-3 rounded-xl text-xs glass" style={{ color: 'var(--amber)' }}>
            <strong>Demo mode</strong> — Supabase not connected. Click Sign in to explore the UI.
          </div>
        )}

        <div className="glass-strong p-7">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required={configured} placeholder="you@hotel.com"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--cream)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={configured} placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--cream)' }} />
            </div>

            {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              {loading ? 'Signing in…' : configured ? 'Sign in' : 'Enter Demo →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
