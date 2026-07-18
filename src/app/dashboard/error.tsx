'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[folio] dashboard error:', error)
  }, [error])

  return (
    <div className="max-w-md">
      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--tile-orange)' }}>
            <AlertTriangle size={16} style={{ color: '#1a1a1a' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Couldn&apos;t load this page</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Something went wrong. Try refreshing.</p>
          </div>
        </div>
        {error.message && (
          <p className="text-xs font-mono px-3 py-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error.message}
          </p>
        )}
        <button onClick={() => reset()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          <RefreshCw size={13} /> Try again
        </button>
      </div>
    </div>
  )
}
