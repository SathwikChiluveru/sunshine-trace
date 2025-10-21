import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink } from "lucide-react"

interface RecommendationsSectionProps {
  data: any // The data from backend (summaryData)
}

export function RecommendationsSection({ data }: RecommendationsSectionProps) {
  // Extract recommendations from backend data
  const recommendations = data?.recommended_actions || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Recommendations</h2>
        <p className="text-muted-foreground text-pretty">
          AI-generated actionable suggestions to improve your logging and debugging
        </p>
      </div>

      <div className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.map((rec: string, index: number) => (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-balance mb-2">{rec}</h3> {/* Display the action text */}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <p>No recommendations available</p>
        )}
      </div>
    </div>
  )
}