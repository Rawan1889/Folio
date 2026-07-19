import { NextResponse } from 'next/server'
import { createClient as createServer } from '@/lib/supabase/server'

// Minimal iCal parser — pulls VEVENT blocks
function parseIcal(text: string): { uid: string; summary: string; dtstart: string; dtend: string }[] {
  const events: { uid: string; summary: string; dtstart: string; dtend: string }[] = []
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1)
  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0]
    const get = (key: string) => {
      const match = body.match(new RegExp(`^${key}(?:;[^:\\n]*)?:(.*)$`, 'im'))
      return match?.[1]?.trim() ?? ''
    }
    const parseDate = (v: string) => {
      // 20260721 or 20260721T140000Z
      const m = v.match(/(\d{4})(\d{2})(\d{2})/)
      return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
    }
    const uid = get('UID')
    const summary = get('SUMMARY')
    const dtstart = parseDate(get('DTSTART'))
    const dtend = parseDate(get('DTEND'))
    if (uid && dtstart && dtend) events.push({ uid, summary, dtstart, dtend })
  }
  return events
}

export async function POST(req: Request) {
  try {
    const { channelId } = await req.json()
    if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 })

    const supabase = await createServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: channel } = await supabase.from('channel_sources')
      .select('id, hotel_id, ical_url, room_id, provider')
      .eq('id', channelId).single()
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    if (!channel.room_id) return NextResponse.json({ error: 'Attach a room first' }, { status: 400 })

    // Fetch iCal feed
    const res = await fetch(channel.ical_url, { headers: { 'User-Agent': 'Folio-iCal-Sync/1.0' } })
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 502 })
    const text = await res.text()
    const events = parseIcal(text)

    // Ensure a synthetic guest per channel exists
    const guestName = `${channel.provider.replace('_', '.')} Guest`
    let { data: guest } = await supabase.from('guests')
      .select('id').eq('hotel_id', channel.hotel_id).eq('full_name', guestName).limit(1).maybeSingle()
    if (!guest) {
      const { data: newGuest } = await supabase.from('guests').insert({
        hotel_id: channel.hotel_id, full_name: guestName, notes: 'External channel booking',
      }).select('id').single()
      guest = newGuest
    }

    let imported = 0
    let skipped = 0
    for (const e of events) {
      // Skip past events
      if (e.dtend < new Date().toISOString().slice(0, 10)) { skipped++; continue }
      const { error: insErr } = await supabase.from('bookings').insert({
        hotel_id: channel.hotel_id,
        room_id: channel.room_id,
        guest_id: guest!.id,
        check_in: e.dtstart,
        check_out: e.dtend,
        status: 'confirmed',
        source: 'online',
        total_amount: 0,
        external_uid: e.uid,
        channel_source_id: channel.id,
        notes: e.summary,
      })
      if (insErr) {
        // Duplicate external_uid = already imported
        if (insErr.code === '23505') skipped++
        else skipped++
      } else {
        imported++
      }
    }

    await supabase.from('channel_sources').update({ last_synced: new Date().toISOString() }).eq('id', channelId)

    return NextResponse.json({ ok: true, imported, skipped, total: events.length })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
