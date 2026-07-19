'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, Plus, X, Trash2 } from 'lucide-react'
import { useToast } from '@/components/Toast'

type Charge = {
  id: string
  category: string
  description: string
  amount: number
  quantity: number
  created_at: string
}

const categoryLabels: Record<string, string> = {
  food: 'Food',
  beverage: 'Beverage',
  minibar: 'Mini Bar',
  laundry: 'Laundry',
  spa: 'Spa',
  phone: 'Phone',
  other: 'Other',
}

const categoryColors: Record<string, string> = {
  food: 'var(--tile-orange)',
  beverage: 'var(--tile-purple)',
  minibar: 'var(--tile-pink)',
  laundry: 'var(--tile-blue)',
  spa: 'var(--tile-green)',
  phone: 'var(--tile-yellow)',
  other: 'rgba(255,255,255,0.1)',
}

export function FolioCharges({
  bookingId,
  hotelId,
  onChanged,
}: {
  bookingId: string
  hotelId: string
  onChanged?: () => void
}) {
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [category, setCategory] = useState('minibar')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data } = await supabase.from('folio_charges')
      .select('id, category, description, amount, quantity, created_at')
      .eq('booking_id', bookingId)
      .order('created_at')
    const normalized = (data ?? []).map(c => ({ ...c, amount: Number(c.amount) })) as Charge[]
    setCharges(normalized)
    setLoading(false)
  }, [bookingId, supabase])

  useEffect(() => { load() }, [load])

  async function addCharge(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('folio_charges').insert({
      booking_id: bookingId,
      hotel_id: hotelId,
      category,
      description,
      amount: parseFloat(amount),
      quantity: parseInt(quantity) || 1,
    })
    if (error) { toast(error.message, 'error'); setSaving(false); return }
    await load()
    setShowAdd(false); setSaving(false)
    setDescription(''); setAmount(''); setQuantity('1'); setCategory('minibar')
    toast('Charge added')
    onChanged?.()
  }

  async function removeCharge(id: string) {
    if (!confirm('Delete this charge?')) return
    await supabase.from('folio_charges').delete().eq('id', id)
    setCharges(charges.filter(c => c.id !== id))
    toast('Charge removed')
    onChanged?.()
  }

  const total = charges.reduce((s, c) => s + c.amount * c.quantity, 0)

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="glass p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag size={14} style={{ color: 'var(--muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>Extras & Charges</h2>
          {charges.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              ${total.toFixed(2)}
            </span>
          )}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg glass hover:bg-white/[0.06]"
          style={{ color: 'var(--cream)' }}>
          <Plus size={11} /> Add
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-6 rounded-lg" />
      ) : charges.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: 'var(--muted)' }}>No extra charges</p>
      ) : (
        <div className="space-y-1.5">
          {charges.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: categoryColors[c.category] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--cream)' }}>
                  {c.description}
                  {c.quantity > 1 && <span className="text-xs" style={{ color: 'var(--muted)' }}> × {c.quantity}</span>}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {categoryLabels[c.category]} · {c.created_at?.slice(0, 10)}
                </p>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>
                ${(c.amount * c.quantity).toFixed(2)}
              </span>
              <button onClick={() => removeCharge(c.id)}
                className="p-1 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--muted)' }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>Add Charge</h2>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={addCharge} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none capitalize" style={inputStyle}>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Description *</label>
                <input value={description} onChange={e => setDescription(e.target.value)} required
                  placeholder="Coca-Cola, Room Service, Massage…" autoFocus
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Amount ($) *</label>
                  <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Quantity</label>
                  <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? 'Saving…' : 'Add Charge'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
