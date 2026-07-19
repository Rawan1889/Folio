import { createClient } from './supabase/client'

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
}

export type PricingResult = {
  basePrice: number
  nights: number
  subtotal: number
  adjustments: { name: string; delta: number }[]
  total: number
}

function nightsBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function containsWeekend(checkIn: string, checkOut: string) {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay() // 0 = Sun, 5 = Fri, 6 = Sat
    if (dow === 5 || dow === 6) return true
  }
  return false
}

export async function computePrice(opts: {
  hotelId: string
  roomTypeId: string | null
  basePrice: number
  checkIn: string
  checkOut: string
  promoCode?: string
}): Promise<PricingResult> {
  const nights = nightsBetween(opts.checkIn, opts.checkOut)
  const subtotal = opts.basePrice * nights

  const supabase = createClient()
  const { data } = await supabase.from('rate_plans')
    .select('id, name, type, adjustment_type, adjustment_value, start_date, end_date, promo_code, min_nights, active, room_type_id')
    .eq('hotel_id', opts.hotelId)
    .eq('active', true)
  const plans = (data ?? []) as Plan[]

  const hasWeekend = containsWeekend(opts.checkIn, opts.checkOut)

  const applicable = plans.filter(p => {
    if (p.room_type_id && p.room_type_id !== opts.roomTypeId) return false
    if (nights < p.min_nights) return false
    if (p.start_date && p.start_date > opts.checkOut) return false
    if (p.end_date && p.end_date < opts.checkIn) return false
    if (p.type === 'weekend' && !hasWeekend) return false
    if (p.type === 'promo' || p.type === 'corporate') {
      if (!opts.promoCode) return false
      if ((p.promo_code ?? '').toUpperCase() !== opts.promoCode.toUpperCase()) return false
    }
    return true
  })

  let total = subtotal
  const adjustments: { name: string; delta: number }[] = []

  // Apply overrides first (they replace price), then percent, then fixed
  const overrides = applicable.filter(p => p.adjustment_type === 'override')
  const percents = applicable.filter(p => p.adjustment_type === 'percent')
  const fixeds = applicable.filter(p => p.adjustment_type === 'fixed')

  if (overrides.length > 0) {
    const o = overrides[0]
    const newTotal = Number(o.adjustment_value) * nights
    adjustments.push({ name: `${o.name} (override)`, delta: newTotal - total })
    total = newTotal
  }
  for (const p of percents) {
    const delta = total * (Number(p.adjustment_value) / 100)
    adjustments.push({ name: p.name, delta })
    total += delta
  }
  for (const p of fixeds) {
    const delta = Number(p.adjustment_value) * nights
    adjustments.push({ name: p.name, delta })
    total += delta
  }

  return { basePrice: opts.basePrice, nights, subtotal, adjustments, total: Math.max(0, total) }
}
