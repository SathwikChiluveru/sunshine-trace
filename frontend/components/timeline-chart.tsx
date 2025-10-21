"use client"

interface TimelineChartProps {
  data?: Array<{ date: string; count: number }>
}

export function TimelineChart({ data }: TimelineChartProps) {
  // Use provided data or fallback to hardcoded data from debug report analysis
  const chartData = data || [
    { date: "Oct 10", count: 1 }, // HARDCODED - from debug report (1 occurrence per error)
    { date: "Oct 11", count: 1 }, // HARDCODED - from debug report (1 occurrence per error)
    { date: "Oct 12", count: 1 }, // HARDCODED - from debug report (1 occurrence per error)
    { date: "Oct 13", count: 1 }, // HARDCODED - from debug report (1 occurrence per error)
    { date: "Oct 14", count: 1 }, // HARDCODED - from debug report (1 occurrence per error)
    { date: "Oct 15", count: 1 }, // HARDCODED - from debug report (1 occurrence per error)
    { date: "Oct 16", count: 5 }, // HARDCODED - from debug report (5 recurring problems)
  ]
  const max = Math.max(...chartData.map((d) => d.count))

  return (
    <div className="h-64">
      <div className="h-full flex items-end justify-between gap-3">
        {chartData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col items-center">
              <span className="text-xs font-semibold mb-1" style={{ color: "var(--chart-4)" }}>
                {item.count}
              </span>
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{
                  height: `${(item.count / max) * 200}px`,
                  backgroundColor: "var(--chart-4)",
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{item.date}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
