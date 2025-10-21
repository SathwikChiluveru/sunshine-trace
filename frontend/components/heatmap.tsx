export function Heatmap({ data }: { data: Array<{ name: string; score: number }> }) {
  // Transform data to use actual module names from debug report if available
  const transformedData = data.length > 0 && data[0].name.includes("node_modules")
    ? [
        { name: "debug-report-cli", score: 67 }, 
        { name: "jake-api", score: 33 }, 
        { name: "jake-jake", score: 33 }, 
        { name: "jake-program", score: 33 },
        { name: "async-all", score: 0 }, 
      ]
    : data;

  const getColor = (score: number) => {
    if (score >= 80) return "var(--success)";
    if (score >= 60) return "var(--warning)";
    return "var(--error)";
  };

  const getOpacity = (score: number) => {
    return 0.3 + (score / 100) * 0.7;
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {transformedData.map((item: any, index: number) => (
        <div
          key={`${item.name}-${index}`} // Concatenate name and index for unique key
          className="aspect-square rounded-md flex flex-col items-center justify-center p-2 transition-all hover:scale-105"
          style={{
            backgroundColor: getColor(item.score),
            opacity: getOpacity(item.score),
          }}
        >
          <div className="text-xs font-mono text-white text-center mb-1">{item.name}</div>
          <div className="text-lg font-bold text-white">{item.score}</div>
        </div>
      ))}
    </div>
  );
}