export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />
}

export function SkeletonTile({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl p-5 space-y-3 ${className}`} style={{ background: 'rgba(255,255,255,0.05)' }}>
      <Skeleton className="h-7 w-7 rounded-lg" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-3.5 w-16 ml-auto" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  )
}

export function SkeletonRoomCard() {
  return (
    <div className="glass overflow-hidden">
      <Skeleton className="h-28 rounded-none rounded-t-xl" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-20" />
        <div className="flex justify-between mt-1">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-12" />
        </div>
      </div>
    </div>
  )
}
