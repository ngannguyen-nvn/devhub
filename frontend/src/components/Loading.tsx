interface LoadingProps {
  count?: number
}

export function SkeletonLoader({ count = 3 }: LoadingProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="h-24 glass-card rounded-xl overflow-hidden">
            <div
              className="h-full w-full"
              style={{
                background: 'linear-gradient(90deg, transparent, hsla(175, 50%, 50%, 0.05), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
