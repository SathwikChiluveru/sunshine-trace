"use client"

interface MiniChartProps {
  data?: number[]
}

export function MiniChart({ data }: MiniChartProps) {
  // Use provided data or fallback to hardcoded data from debug report analysis
  const chartData = data || [1, 1, 1, 1, 1, 1, 1] // HARDCODED - from debug report (1 occurrence per error)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const max = Math.max(...chartData)

  return (
    <div className="h-48 flex items-end justify-between gap-2">
      {chartData.map((value, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full rounded-t transition-all hover:opacity-80"
            style={{
              height: `${(value / max) * 100}%`,
              backgroundColor: "var(--chart-1)",
            }}
          />
          <span className="text-xs text-muted-foreground">{days[index]}</span>
        </div>
      ))}
    </div>
  )
}
