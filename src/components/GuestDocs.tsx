'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Upload, Trash2, Loader2, Eye } from 'lucide-react'
import { useToast } from '@/components/Toast'

type Doc = {
  id: string
  type: string
  url: string
  file_name: string | null
  created_at: string
}

const typeLabels: Record<string, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  driving_license: 'Driving License',
  visa: 'Visa',
  other: 'Other',
}

export function GuestDocs({ guestId, hotelId }: { guestId: string; hotelId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('passport')
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data } = await supabase.from('guest_documents')
      .select('id, type, url, file_name, created_at')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false })
    setDocs((data ?? []) as Doc[])
    setLoading(false)
  }, [guestId, supabase])

  useEffect(() => { load() }, [load])

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const path = `${guestId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('guest-docs').upload(path, file)
    if (upErr) { toast(upErr.message, 'error'); setUploading(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    const { error: dbErr } = await supabase.from('guest_documents').insert({
      guest_id: guestId,
      hotel_id: hotelId,
      type: docType,
      url: path,
      file_name: file.name,
      uploaded_by: user?.id ?? null,
    })
    if (dbErr) { toast(dbErr.message, 'error'); setUploading(false); return }

    await load()
    setUploading(false)
    e.target.value = ''
    toast('Document uploaded')
  }

  async function viewDoc(d: Doc) {
    const { data } = await supabase.storage.from('guest-docs').createSignedUrl(d.url, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function remove(d: Doc) {
    if (!confirm(`Delete ${d.file_name ?? 'document'}?`)) return
    await supabase.storage.from('guest-docs').remove([d.url])
    await supabase.from('guest_documents').delete().eq('id', d.id)
    setDocs(docs.filter(x => x.id !== d.id))
    toast('Document deleted')
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--cream)',
    borderRadius: 12,
  }

  return (
    <div className="glass p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--cream)' }}>
          <FileText size={13} /> Documents
        </h2>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{docs.length} on file</span>
      </div>

      {loading ? (
        <div className="skeleton h-8 rounded-lg" />
      ) : docs.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: 'var(--muted)' }}>No documents yet</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map(d => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <FileText size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--cream)' }}>
                  {d.file_name ?? 'Document'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {typeLabels[d.type]} · {d.created_at?.slice(0, 10)}
                </p>
              </div>
              <button onClick={() => viewDoc(d)} className="p-1.5 rounded-lg hover:bg-white/[0.06]"
                style={{ color: 'var(--muted)' }}>
                <Eye size={12} />
              </button>
              <button onClick={() => remove(d)} className="p-1.5 rounded-lg hover:bg-red-500/10"
                style={{ color: 'var(--muted)' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <select value={docType} onChange={e => setDocType(e.target.value)}
          className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={inputStyle}>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)' }}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading…' : 'Upload File'}
          <input type="file" onChange={upload} disabled={uploading}
            accept="image/*,application/pdf"
            className="hidden" />
        </label>
      </div>
    </div>
  )
}
