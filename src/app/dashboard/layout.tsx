import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import { ToastProvider } from '@/components/Toast'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role, tenant_id').eq('id', user.id).single()
  const isSuperAdmin = profile?.role === 'super_admin'

  let hotelName = 'No Hotel Yet'
  let hotelId: string | null = null

  if (isSuperAdmin) {
    const { data: hotel } = await supabase.from('hotels').select('id, name').order('created_at').limit(1).single()
    if (hotel) { hotelName = hotel.name; hotelId = hotel.id }
  } else if (profile?.tenant_id) {
    const { data: hotel } = await supabase.from('hotels').select('id, name').eq('tenant_id', profile.tenant_id).order('created_at').limit(1).single()
    if (hotel) { hotelName = hotel.name; hotelId = hotel.id }
  }

  return (
    <ToastProvider>
      <div className="flex flex-col lg:flex-row min-h-screen">
        <Sidebar hotelName={hotelName} userName={profile?.full_name ?? user.email ?? 'Admin'} isSuperAdmin={isSuperAdmin} hotelId={hotelId} />
        <main className="flex-1 overflow-y-auto lg:p-6 p-4 pt-4">{children}</main>
      </div>
    </ToastProvider>
  )
}
