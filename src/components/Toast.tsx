'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; type: ToastType }
type ToastCtx = { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colors = {
  success: 'var(--tile-green)',
  error: '#ef4444',
  info: 'var(--tile-blue)',
}

function ToastItem({ t, onClose }: { t: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  const Icon = icons[t.type]

  return (
    <div
      className="glass-strong flex items-center gap-3 px-4 py-3 min-w-64 max-w-sm"
      style={{ animation: 'slideUp 0.2s ease-out' }}>
      <Icon size={16} style={{ color: colors[t.type], flexShrink: 0 }} />
      <p className="text-sm flex-1" style={{ color: 'var(--cream)' }}>{t.message}</p>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70" style={{ color: 'var(--muted)' }}>
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  function remove(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
