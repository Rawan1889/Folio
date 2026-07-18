'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[folio] app error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-strong p-8 max-w-md w-full space-y-5 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
          style={{ background: 'var(--tile-orange)' }}>
          <AlertTriangle size={24} style={{ color: '#1a1a1a' }} />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Something went wrong</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            An unexpected error occurred. This has been logged.
          </p>
        </div>
        {error.message && (
          <p className="text-xs font-mono px-3 py-2 rounded-xl text-left"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="text-[10px]" style={{ color: 'var(--muted-2)' }}>Error ID: {error.digest}</p>
        )}
        <div className="flex gap-2">
          <button onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
            <RefreshCw size={13} /> Try again
          </button>
          <Link href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm glass hover:bg-white/[0.06]"
            style={{ color: 'var(--cream)' }}>
            <Home size={13} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
