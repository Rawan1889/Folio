import { createClient } from './supabase/client'

export async function initHotel() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()

  const isSuperAdmin = profile?.role === 'super_admin'

  // Super admin can override hotel via localStorage picker
  const stored = typeof window !== 'undefined' ? localStorage.getItem('folio_hotel_id') : null
  if (stored && isSuperAdmin) return { hotelId: stored, isSuperAdmin, userId: user.id }

  if (isSuperAdmin) {
    const { data } = await supabase.from('hotels').select('id').order('created_at').limit(1).single()
    return { hotelId: data?.id ?? null, isSuperAdmin: true, userId: user.id }
  }

  if (profile?.tenant_id) {
    const { data } = await supabase.from('hotels').select('id').eq('tenant_id', profile.tenant_id).order('created_at').limit(1).single()
    return { hotelId: data?.id ?? null, isSuperAdmin: false, userId: user.id }
  }

  return { hotelId: null, isSuperAdmin: false, userId: user.id }
}
