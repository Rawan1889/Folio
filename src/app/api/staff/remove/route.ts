import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServer } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.id === userId) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

    const { data: me } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
    if (!me || !['super_admin', 'hotel_admin'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: target } = await supabase.from('profiles').select('tenant_id, role').eq('id', userId).single()
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (me.role !== 'super_admin' && target.tenant_id !== me.tenant_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (target.role === 'super_admin' && me.role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot remove super admin' }, { status: 403 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const admin = createClient(url, serviceKey)
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
