import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy } from "lucide-react"

interface SensitiveDataSectionProps {
  data: any 
}

export function SensitiveDataSection({ data }: SensitiveDataSectionProps) {
  const detections = data?.piiFindings || []
  
  console.log("[SensitiveDataSection] Received data:", {
    hasData: !!data,
    piiFindings: data?.piiFindings?.length || 0,
    detections: detections.length,
    sampleDetection: detections[0]
  });

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "error"
    if (severity === "high") return "warning"
    return "info"
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Sensitive Data Detection</h2>
        <p className="text-muted-foreground text-pretty">
          Identify privacy violations and exposed sensitive information in logs
        </p>
        {detections.length > 0 && (
          <p className="text-sm text-error mt-2 font-medium">
            Found {detections.length} sensitive data exposure{detections.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {detections.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No sensitive data detected in logs. Great job!</p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Service/File</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Line</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Data Type</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Severity</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold">Suggested Fix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detections.map((detection: any, index: number) => (
                    <tr key={index} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <code className="font-mono text-xs">{detection.file}</code>
                      </td>
                      <td className="px-6 py-4">
                        <code className="font-mono text-sm">{detection.line}</code>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{detection.type}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className="border-0"
                          style={{
                            backgroundColor: `var(--${getSeverityColor('critical')})/0.1`,
                            color: `var(--${getSeverityColor('critical')})`,
                          }}
                        >
                          {detection.type === 'NRIC' ? 'Critical' : 'High'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{detection.action}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}