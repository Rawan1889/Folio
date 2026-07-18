'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initHotel } from '@/lib/initHotel'
import { Sparkles, Plus, X, CheckCircle, Loader2, Play, ClipboardList } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { SkeletonRow } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'

type Task = {
  id: string
  type: 'clean' | 'inspect' | 'maintenance' | 'turndown'
  status: 'pending' | 'in_progress' | 'done' | 'skipped'
  notes: string | null
  created_at: string
  completed_at: string | null
  rooms: { id: string; number: string; floor: number } | null
  assigned: { id: string; full_name: string | null } | null
}

type Room = { id: string; number: string; floor: number; status: string }
type Staff = { id: string; full_name: string | null; role: string }

const typeColors: Record<string, string> = {
  clean: 'var(--tile-yellow)',
  inspect: 'var(--tile-blue)',
  maintenance: 'var(--tile-orange)',
  turndown: 'var(--tile-purple)',
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'rgba(255,255,255,0.06)', text: 'var(--muted)', label: 'Pending' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', label: 'In Progress' },
  done:        { bg: 'rgba(34,197,94,0.15)', text: '#86efac', label: 'Done' },
  skipped:     { bg: 'rgba(255,255,255,0.04)', text: 'var(--muted-2)', label: 'Skipped' },
}

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [taskRoom, setTaskRoom] = useState('')
  const [taskType, setTaskType] = useState<Task['type']>('clean')
  const [taskAssigned, setTaskAssigned] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async (hId: string) => {
    const [{ data: tasksData }, { data: roomsData }, { data: staffData }] = await Promise.all([
      supabase
        .from('housekeeping_tasks')
        .select('id, type, status, notes, created_at, completed_at, rooms(id, number, floor), assigned:profiles!housekeeping_tasks_assigned_to_fkey(id, full_name)')
        .eq('hotel_id', hId)
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('rooms')
        .select('id, number, floor, status')
        .eq('hotel_id', hId)
        .order('floor').order('number'),
      supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name'),
    ])
    setTasks((tasksData ?? []) as unknown as Task[])
    setRooms((roomsData ?? []) as Room[])
    setStaff((staffData ?? []) as Staff[])
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

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    if (!hotelId || !taskRoom) return
    setSaving(true); setSaveError('')
    const { error } = await supabase.from('housekeeping_tasks').insert({
      hotel_id: hotelId,
      room_id: taskRoom,
      type: taskType,
      assigned_to: taskAssigned || null,
      notes: taskNotes || null,
    })
    if (error) { setSaveError(error.message); setSaving(false); return }
    await load(hotelId)
    setShowModal(false); setSaving(false)
    setTaskRoom(''); setTaskType('clean'); setTaskAssigned(''); setTaskNotes('')
    toast('Task created')
  }

  async function startTask(t: Task) {
    if (!hotelId) return
    await supabase.from('housekeeping_tasks').update({ status: 'in_progress' }).eq('id', t.id)
    await load(hotelId)
    toast('Task started', 'info')
  }

  async function completeTask(t: Task) {
    if (!hotelId) return
    await supabase.from('housekeeping_tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', t.id)
    // Auto-flip room to available on cleaning task done
    if (t.type === 'clean' && t.rooms?.id) {
      await supabase.from('rooms').update({ status: 'available' }).eq('id', t.rooms.id)
    }
    await load(hotelId)
    toast(t.type === 'clean' ? `Room ${t.rooms?.number} ready` : 'Task done')
  }

  async function autoQueueDirtyRooms() {
    if (!hotelId) return
    const dirty = rooms.filter(r => r.status === 'cleaning')
    if (dirty.length === 0) { toast('No dirty rooms to queue', 'info'); return }
    // Skip rooms already having pending clean tasks
    const pendingRoomIds = new Set(tasks.filter(t => t.type === 'clean' && ['pending', 'in_progress'].includes(t.status)).map(t => t.rooms?.id))
    const toQueue = dirty.filter(r => !pendingRoomIds.has(r.id))
    if (toQueue.length === 0) { toast('All dirty rooms already queued', 'info'); return }
    await supabase.from('housekeeping_tasks').insert(
      toQueue.map(r => ({ hotel_id: hotelId, room_id: r.id, type: 'clean' as const }))
    )
    await load(hotelId)
    toast(`Queued ${toQueue.length} clean task${toQueue.length !== 1 ? 's' : ''}`)
  }

  const filtered = tasks.filter(t => {
    if (filter === 'active') return ['pending', 'in_progress'].includes(t.status)
    if (filter === 'done') return t.status === 'done'
    return true
  })

  const activeCount = tasks.filter(t => ['pending', 'in_progress'].includes(t.status)).length
  const doneToday = tasks.filter(t => t.status === 'done' && t.completed_at?.startsWith(new Date().toISOString().slice(0, 10))).length
  const dirtyRooms = rooms.filter(r => r.status === 'cleaning').length

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl serif" style={{ color: 'var(--cream)' }}>
            House<span className="serif-italic">keeping</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {loading ? 'Loading…' : `${activeCount} active · ${doneToday} completed today`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={autoQueueDirtyRooms}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm glass hover:bg-white/[0.06] transition-colors"
            style={{ color: 'var(--cream)' }}>
            <Sparkles size={13} /> Queue dirty ({dirtyRooms})
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="tile" style={{ background: 'var(--tile-yellow)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Active</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{activeCount}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-green)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Done Today</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{doneToday}</p>
          </div>
          <div className="tile" style={{ background: 'var(--tile-orange)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'rgba(0,0,0,0.55)' }}>Dirty Rooms</p>
            <p className="text-3xl font-semibold" style={{ color: '#1a1a1a' }}>{dirtyRooms}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'active', label: 'Active' },
          { key: 'done', label: 'Done' },
          { key: 'all', label: 'All' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background: filter === f.key ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              color: filter === f.key ? 'var(--cream)' : 'var(--muted)',
              border: filter === f.key ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filter === 'active' ? 'All caught up' : 'No tasks yet'}
          description={filter === 'active'
            ? 'No pending housekeeping tasks. Queue dirty rooms or create a manual task.'
            : 'Create your first housekeeping task.'}
          action={
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
              <Plus size={14} /> New Task
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const cfg = statusColors[t.status]
            return (
              <div key={t.id} className="glass p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: typeColors[t.type] }}>
                  <span className="text-xs font-bold" style={{ color: '#1a1a1a' }}>
                    {t.rooms?.number ?? '—'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium capitalize" style={{ color: 'var(--cream)' }}>
                      {t.type}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: cfg.bg, color: cfg.text }}>
                      {cfg.label}
                    </span>
                    {t.assigned?.full_name && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        · {t.assigned.full_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {t.rooms ? `Room ${t.rooms.number} · Floor ${t.rooms.floor}` : 'No room'}
                    {t.notes && ` · ${t.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {t.status === 'pending' && (
                    <button onClick={() => startTask(t)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs glass hover:bg-white/[0.06]"
                      style={{ color: 'var(--cream)' }}>
                      <Play size={11} /> Start
                    </button>
                  )}
                  {['pending', 'in_progress'].includes(t.status) && (
                    <button onClick={() => completeTask(t)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90"
                      style={{ background: 'var(--tile-green)', color: '#1a1a1a' }}>
                      <CheckCircle size={11} /> Done
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create task modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md glass-strong p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cream)' }}>New Task</h2>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={createTask} className="space-y-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Room *</label>
                <select value={taskRoom} onChange={e => setTaskRoom(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                  <option value="">Select room…</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} · Fl {r.floor} · {r.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Type</label>
                  <select value={taskType} onChange={e => setTaskType(e.target.value as Task['type'])}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="clean">Clean</option>
                    <option value="inspect">Inspect</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="turndown">Turndown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Assign To</label>
                  <select value={taskAssigned} onChange={e => setTaskAssigned(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name ?? 'Staff'} ({s.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>Notes</label>
                <textarea value={taskNotes} onChange={e => setTaskNotes(e.target.value)} rows={2}
                  placeholder="Broken lamp, extra towels…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
              </div>
              {saveError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{saveError}</p>}
              <button type="submit" disabled={saving}
                className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90"
                style={{ background: 'var(--tile-yellow)', color: '#1a1a1a' }}>
                {saving ? 'Saving…' : 'Create Task'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
