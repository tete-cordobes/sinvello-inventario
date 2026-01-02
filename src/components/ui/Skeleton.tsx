import { Loader2 } from "lucide-react"

interface SkeletonCardProps {
  count?: number
}

export function SkeletonCard({ count = 1 }: SkeletonCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-6 bg-gradient-to-br from-[var(--card)] to-[var(--muted)]">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-8 w-48 rounded" />
            </div>
            <div className="skeleton w-12 h-12 rounded-full" />
          </div>
          <div className="skeleton h-32 rounded-lg mb-4" />
          <div className="space-y-2">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonRow({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-[var(--card)] rounded-lg border border-[var(--border)]">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-48 rounded" />
            <div className="skeleton h-3 w-32 rounded" />
          </div>
          <div className="skeleton w-20 h-8 rounded" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-4 w-48 rounded" />
      </div>
      <SkeletonCard count={4} />
      <SkeletonRow count={5} />
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-[var(--sinvello-primary)]" size={48} />
        <p className="text-[var(--muted-foreground)]">Cargando...</p>
      </div>
    </div>
  )
}
