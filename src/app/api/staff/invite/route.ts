import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServer } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { email, fullName, role, hotelId, password } = await req.json()
    if (!email || !role) return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
    if (password && password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

    // Auth check — only super_admin or hotel_admin may invite
    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: me } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
    if (!me || !['super_admin', 'hotel_admin'].includes(me.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Look up tenant for the hotel
    const { data: hotel } = await supabase.from('hotels').select('tenant_id').eq('id', hotelId).single()
    if (!hotel) return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })

    if (me.role !== 'super_admin' && hotel.tenant_id !== me.tenant_id) {
      return NextResponse.json({ error: 'Cannot invite to another tenant' }, { status: 403 })
    }

    // Admin client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!serviceKey) return NextResponse.json({ error: 'Service role key missing' }, { status: 500 })

    const admin = createClient(url, serviceKey)

    let createdUserId: string | null = null

    if (password) {
      // Direct create with password — no email needed
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName ?? email, role },
      })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })
      createdUserId = created.user?.id ?? null
    } else {
      // Fallback: email invite
      const origin = new URL(req.url).origin
      const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName ?? email, role },
        redirectTo: `${origin}/auth/callback?next=/set-password`,
      })
      if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 })
      createdUserId = invited.user?.id ?? null
    }

    if (createdUserId) {
      await admin.from('profiles').upsert({
        id: createdUserId,
        full_name: fullName ?? email,
        role,
        tenant_id: hotel.tenant_id,
        hotel_id: hotelId,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
