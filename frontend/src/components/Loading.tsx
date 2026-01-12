interface LoadingProps {
  count?: number
}

export function SkeletonLoader({ count = 3 }: LoadingProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  )
}
