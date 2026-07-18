import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
        <Icon size={28} style={{ color: 'var(--muted)' }} />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{title}</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{description}</p>
      </div>
      {action}
    </div>
  )
}
