'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import { Plus, Tag, X, Loader2, Trash2, Percent, DollarSign } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { SkeletonRow } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'

type Plan = {
  id: string
  name: string
  type: 'seasonal' | 'weekend' | 'promo' | 'corporate'
  adjustment_type: 'percent' | 'fixed' | 'override'
  adjustment_value: number
  start_date: string | null
  end_date: string | null
  promo_code: string | null
  min_nights: number
  active: boolean
  room_type_id: string | null
  room_types: { name: string } | null
}

type RoomType = { id: string; name: string; base_price: number }

const typeColors: Record<string, string> = {
  seasonal: 'var(--tile-blue)',
  weekend: 'var(--tile-purple)',
  promo: 'var(--tile-yellow)',
  corporate: 'var(--tile-green)',
}

export default function RatesPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<Plan['type']>('seasonal')
  const [adjustmentType, setAdjustmentType] = useState<Plan['adjustment_type']>('percent')
  const [adjustmentValue, setAdjustmentValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [minNights, setMinNights] = useState('1')
  const [roomTypeId, setRoomTypeId] = useState('')

  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async (hId: string) => {
    const [{ data: plansData }, { data: rtData }] = await Promise.all([
      supabase.from('rate_plans')
        .select('id, name, type, adjustment_type, adjustment_value, start_date, end_date, promo_code, min_nights, active, room_type_id, room_types(name)')
        .eq('hotel_id', hId)
        .order('active', { ascending: false })
        .order('start_date'),
      supabase.from('room_types')
        .select('id, name, base_price')
        .eq('hotel_id', hId).order('name'),
    ])
    setPlans((plansData ?? []) as unknown as Plan[])
    setRoomTypes((rtData ?? []) as RoomType[])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const hotel = await initHotel()
      if (!hotel) { setLoading(false); return }
      setHotelId(hotel.hotelId)
      await load(hotel.hotelId)
      setLoading(false)
    }
    init()
  }, [load])

  function resetForm() {
    setName(''); setType('seasonal'); setAdjustmentType('percent'); setAdjustmentValue('')
    setStartDate(''); setEndDate(''); setPromoCode(''); setMinNights('1'); setRoomTypeId('')
    setSaveError('')
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId) return
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('rate_plans').insert({
      hotel_id: hotelId,
      name,
      type,
      adjustment_type: adjustmentType,
      adjustment_value: parseFloat(adjustmentValue),
      start_date: startDate || null,
      end_date: endDate || null,
      promo_code: promoCode || null,
      min_nights: parseInt(minNights) || 1,
      room_type_id: roomTypeId || null,
      active: true,
    })
    if (error) { setSaveError(error.message); setSaving(false); return }
    await load(hotelId)
    setShowModal(false); setSaving(false)
    resetForm()
    toast('Rate plan created')
  }

  async function toggleActive(p: Plan) {
    if (!hotelId) return
    await supabase.from('rate_plans').update({ active: !p.active }).eq('id', p.id)
    setPlans(plans.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
    toast(p.active ? 'Plan deactivated' : 'Plan activated')
  }

  async function remove(p: Plan) {
    if (!confirm(`Delete rate plan "${p.name}"?`)) return
    await supabase.from('rate_plans').delete().eq('id', p.id)
    setPlans(plans.filter(x => x.id !== p.id))
    toast('Plan deleted')
  }

  function formatAdjustment(p: Plan) {
    const v = Number(p.adjustment_value)
    if (p.adjustment_type === 'percent') return `${v > 0 ? '+' : ''}${v}%`
    if (p.adjustment_type === 'fixed') return `${v > 0 ? '+' : ''}$${Math.abs(v)}`
    return `Override $${v}`
  }

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
            Rate <span className="serif-italic">Plans</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…' : `${plans.filter(p => p.active).length} active · ${plans.length} total`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
          <Plus size={14} /> New Rate Plan
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No rate plans yet"
          description="Create seasonal rates, weekend markups, or promo codes to adjust room prices dynamically."
          action={
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              <Plus size={14} /> New Rate Plan
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {plans.map(p => (
            <div key={p.id} className="glass p-4 space-y-2"
              style={{ opacity: p.active ? 1 : 0.55 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: typeColors[p.type] }}>
                    {p.adjustment_type === 'percent' ? <Percent size={14} style={{ color: '#1a1a1a' }} /> : <DollarSign size={14} style={{ color: '#1a1a1a' }} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{p.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>
                        {p.type}
                      </span>
                      {p.promo_code && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                          style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                          {p.promo_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      <span className="font-semibold" style={{ color: 'var(--amber)' }}>{formatAdjustment(p)}</span>
                      {p.room_types?.name && ` · ${p.room_types.name}`}
                      {p.min_nights > 1 && ` · min ${p.min_nights} nights`}
                      {p.start_date && p.end_date && ` · ${p.start_date} → ${p.end_date}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(p)}
                    className="text-xs px-2.5 py-1.5 rounded-lg glass hover:bg-white/[0.06]"
                    style={{ color: 'var(--muted)' }}>
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => remove(p)}
                    className="p-2 rounded-lg hover:bg-red-500/10"
                    style={{ color: 'var(--muted)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>New Rate Plan</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={createPlan} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Summer 2026 · Weekend Markup · EARLY10"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Type</label>
                  <select value={type} onChange={e => setType(e.target.value as Plan['type'])}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none capitalize" style={inputStyle}>
                    <option value="seasonal">Seasonal</option>
                    <option value="weekend">Weekend</option>
                    <option value="promo">Promo Code</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Room Type</label>
                  <select value={roomTypeId} onChange={e => setRoomTypeId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">All types</option>
                    {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Adjustment</label>
                  <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value as Plan['adjustment_type'])}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none capitalize" style={inputStyle}>
                    <option value="percent">Percent (+/-)</option>
                    <option value="fixed">Fixed $ (+/-)</option>
                    <option value="override">Override $</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Value *</label>
                  <input type="number" step="0.01" value={adjustmentValue} onChange={e => setAdjustmentValue(e.target.value)} required
                    placeholder={adjustmentType === 'percent' ? '15 or -10' : '25'}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Promo Code</label>
                  <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="EARLY10"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Min Nights</label>
                  <input type="number" min="1" value={minNights} onChange={e => setMinNights(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              {saveError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{saveError}</p>}
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? 'Saving…' : 'Create Plan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
