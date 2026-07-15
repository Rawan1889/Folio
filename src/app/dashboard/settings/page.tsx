'use client'

export default function SettingsPage() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--cream)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Hotel configuration & preferences</p>
      </div>

      <div className="glass p-5">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Hotel Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: 'Hotel Name', v: 'Grand Duhok Hotel' },
            { label: 'Address', v: 'Street 42, Duhok' },
            { label: 'Phone', v: '+964 750 000 0000' },
            { label: 'Email', v: 'info@granddu.com' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{f.label}</label>
              <input defaultValue={f.v} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-5">
        <h2 className="text-sm font-medium mb-4" style={{ color: 'var(--cream)' }}>Localization</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Currency', opts: ['USD', 'IQD', 'EUR', 'AED'] },
            { label: 'Timezone', opts: ['Asia/Baghdad', 'Asia/Dubai', 'UTC'] },
            { label: 'Language', opts: ['English', 'العربية', 'کوردی'] },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{f.label}</label>
              <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--cream)' }}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
