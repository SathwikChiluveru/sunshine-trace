export function SunshineLogo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Sun rays */}
      <path
        d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50 M20 20 L27 27 M73 73 L80 80 M20 80 L27 73 M73 27 L80 20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-yellow-500"
      />
      {/* Sun circle */}
      <circle cx="50" cy="50" r="18" fill="currentColor" className="text-yellow-500" />
      {/* Trace path overlay */}
      <path
        d="M30 50 Q40 35, 50 50 T70 50"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className="text-orange-500"
        opacity="0.9"
      />
      {/* Trace dots */}
      <circle cx="30" cy="50" r="2.5" fill="currentColor" className="text-orange-500" />
      <circle cx="50" cy="50" r="2.5" fill="currentColor" className="text-orange-500" />
      <circle cx="70" cy="50" r="2.5" fill="currentColor" className="text-orange-500" />
    </svg>
  )
}
