'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { BedDouble, Plus, Search, ImageIcon, MoreVertical, X, Film, Loader2, AlertCircle } from 'lucide-react'
import { getStatusColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const statusLabel: Record<string, string> = {
  available: 'Available', occupied: 'Occupied', cleaning: 'Cleaning', maintenance: 'Maintenance', blocked: 'Blocked',
}

type Room = {
  id: string; number: string; floor: number; status: string; notes: string | null
  room_types: { name: string; base_price: number } | null
  room_media: { url: string; type: string; is_cover: boolean }[]
}

type MediaPreview = { file: File; url: string; type: 'image' | 'video' }

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [noHotel, setNoHotel] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([])
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [roomNumber, setRoomNumber] = useState('')
  const [floor, setFloor] = useState('1')
  const [roomType, setRoomType] = useState('Standard')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  const loadRooms = useCallback(async (hId: string) => {
    const { data } = await supabase.from('rooms')
      .select('id, number, floor, status, notes, room_types(name, base_price), room_media(url, type, is_cover)')
      .eq('hotel_id', hId).order('number')
    setRooms((data as unknown as Room[]) ?? [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()

      let hotel: { id: string } | null = null
      if (profile?.role === 'super_admin') {
        const { data } = await supabase.from('hotels').select('id').order('created_at').limit(1).single()
        hotel = data
      } else if (profile?.tenant_id) {
        const { data } = await supabase.from('hotels').select('id').eq('tenant_id', profile.tenant_id).order('created_at').limit(1).single()
        hotel = data
      }
      if (!hotel) { setNoHotel(true); setLoading(false); return }
      setHotelId(hotel.id)
      await loadRooms(hotel.id)
      setLoading(false)
    }
    init()
  }, [loadRooms, supabase])

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newPreviews: MediaPreview[] = Array.from(files).map(file => ({
      file, url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image',
    }))
    setMediaPreviews(prev => [...prev, ...newPreviews])
  }

  function removeMedia(i: number) {
    setMediaPreviews(prev => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, x) => x !== i) })
  }

  function resetForm() {
    setRoomNumber(''); setFloor('1'); setRoomType('Standard'); setPrice(''); setNotes('')
    mediaPreviews.forEach(p => URL.revokeObjectURL(p.url))
    setMediaPreviews([]); setSaveError('')
  }

  function closeModal() { setShowAddModal(false); resetForm() }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId) return
    setSaving(true); setSaveError('')

    try {
      let roomTypeId: string | null = null
      const { data: existingType } = await supabase.from('room_types').select('id').eq('hotel_id', hotelId).eq('name', roomType).single()

      if (existingType) roomTypeId = existingType.id
      else {
        const { data: newType, error } = await supabase.from('room_types').insert({ hotel_id: hotelId, name: roomType, base_price: parseFloat(price) || 0 }).select('id').single()
        if (error) throw error
        roomTypeId = newType.id
      }

      const { data: room, error: roomErr } = await supabase.from('rooms').insert({
        hotel_id: hotelId, room_type_id: roomTypeId, number: roomNumber, floor: parseInt(floor) || 1, status: 'available', notes: notes || null,
      }).select('id').single()
      if (roomErr) throw roomErr

      for (let i = 0; i < mediaPreviews.length; i++) {
        const { file, type } = mediaPreviews[i]
        const ext = file.name.split('.').pop()
        const path = `${hotelId}/${room.id}/${Date.now()}-${i}.${ext}`
        const { error: uploadErr } = await supabase.storage.from('room-media').upload(path, file, { upsert: true })
        if (uploadErr) throw uploadErr
        const { data: { publicUrl } } = supabase.storage.from('room-media').getPublicUrl(path)
        await supabase.from('room_media').insert({ room_id: room.id, url: publicUrl, type, is_cover: i === 0, sort_order: i })
      }

      await loadRooms(hotelId)
      closeModal()
    } catch (err: unknown) {
      console.error('Save room error:', err)
      setSaveError(err instanceof Error ? err.message : JSON.stringify(err))
    } finally { setSaving(false) }
  }

  const filtered = rooms.filter(r => {
    const matchSearch = r.number.includes(search) || (r.room_types?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--amber)' }} /></div>

  if (noHotel) return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
      <AlertCircle size={32} style={{ color: 'var(--amber)' }} />
      <p className="font-medium" style={{ color: 'var(--cream)' }}>No hotel set up yet</p>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Go to Hotels → Add Hotel first, then come back.</p>
    </div>
  )

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Rooms</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{rooms.length} rooms · {rooms.filter(r => r.status === 'available').length} available</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          style={{ background: 'var(--amber)', color: '#000' }}>
          <Plus size={14} /> Add Room
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search room number or type…"
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'available', 'occupied', 'cleaning', 'maintenance', 'blocked'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-2 rounded-lg text-xs font-medium capitalize"
              style={filterStatus === s
                ? { background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(200,168,75,0.25)' }
                : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }
              }>
              {s === 'all' ? 'All' : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
          <BedDouble size={28} style={{ color: 'var(--border-hover)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No rooms yet — add your first room</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(room => {
            const cover = room.room_media?.find(m => m.is_cover) ?? room.room_media?.[0]
            return (
              <div key={room.id} className="glass overflow-hidden cursor-pointer group hover:border-white/10">
                <div className="h-28 flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                  {cover ? (
                    cover.type === 'image'
                      ? <img src={cover.url} alt="" className="w-full h-full object-cover" />
                      : <Film size={24} style={{ color: 'var(--amber)' }} />
                  ) : <BedDouble size={28} style={{ color: 'var(--border-hover)' }} />}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>Room {room.number}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{room.room_types?.name ?? '—'} · Floor {room.floor}</p>
                    </div>
                    <button className="p-0.5 opacity-0 group-hover:opacity-100" style={{ color: 'var(--muted)' }}><MoreVertical size={14} /></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${getStatusColor(room.status)}`}>{statusLabel[room.status]}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--amber)' }}>${room.room_types?.base_price ?? 0}/n</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative glass w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: 'var(--cream)' }}>Add New Room</h2>
              <button onClick={closeModal} style={{ color: 'var(--muted)' }}><X size={16} /></button>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Room Number *</label>
                  <input required value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. 201"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Floor</label>
                  <input type="number" value={floor} onChange={e => setFloor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Room Type</label>
                <select value={roomType} onChange={e => setRoomType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }}>
                  <option>Standard</option><option>Deluxe</option><option>Suite</option><option>Apartment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Base Price / Night ($)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="120"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Images & Videos</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors"
                  style={{ borderColor: dragging ? 'var(--amber)' : 'var(--border)', background: dragging ? 'var(--amber-dim)' : 'transparent' }}>
                  <ImageIcon size={22} className="mx-auto mb-2" style={{ color: dragging ? 'var(--amber)' : 'var(--muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--amber)' }}>Click to upload</span> or drag & drop
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--border-hover)' }}>JPG, PNG, WEBP, MP4, MOV</p>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
                </div>

                {mediaPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {mediaPreviews.map((m, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden aspect-square group" style={{ background: 'var(--surface-2)' }}>
                        {m.type === 'image'
                          ? <img src={m.url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex flex-col items-center justify-center gap-1"><Film size={20} style={{ color: 'var(--amber)' }} /><p className="text-[9px] px-1 truncate w-full text-center" style={{ color: 'var(--muted)' }}>{m.file.name}</p></div>
                        }
                        {i === 0 && <div className="absolute bottom-1 left-1"><span className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--amber)' }}>COVER</span></div>}
                        <button type="button" onClick={() => removeMedia(i)}
                          className="absolute top-1 right-1 p-0.5 rounded-full opacity-0 group-hover:opacity-100"
                          style={{ background: 'rgba(0,0,0,0.7)' }}>
                          <X size={10} style={{ color: 'var(--cream)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
              </div>

              {saveError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{saveError}</p>}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2 rounded-lg text-sm" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'var(--amber)', color: '#000' }}>
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {saving ? 'Saving…' : `Add Room${mediaPreviews.length > 0 ? ` · ${mediaPreviews.length} file${mediaPreviews.length > 1 ? 's' : ''}` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
