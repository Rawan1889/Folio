import { createClient } from './supabase/client'

export async function hasOverlap(roomId: string, checkIn: string, checkOut: string, excludeBookingId?: string): Promise<{ overlap: boolean; conflictBookingId?: string; guestName?: string }> {
  const supabase = createClient()
  // Overlap: existing.check_in < new.check_out AND existing.check_out > new.check_in
  let query = supabase
    .from('bookings')
    .select('id, guests(full_name)')
    .eq('room_id', roomId)
    .in('status', ['confirmed', 'checked_in'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
    .limit(1)
  if (excludeBookingId) query = query.neq('id', excludeBookingId)

  const { data } = await query
  if (data && data.length > 0) {
    const conflict = data[0] as { id: string; guests: { full_name?: string } | null }
    return { overlap: true, conflictBookingId: conflict.id, guestName: conflict.guests?.full_name }
  }
  return { overlap: false }
}
