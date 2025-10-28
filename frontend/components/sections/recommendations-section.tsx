import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink, Code, Check } from "lucide-react"
import { useState } from "react"

interface RecommendationsSectionProps {
  data: any // The data from backend (summaryData)
}

export function RecommendationsSection({ data }: RecommendationsSectionProps) {
  // Extract recommendations from backend data
  const recommendations = data?.recommended_actions || []
  const codeFixes = data?.code_fixes || []
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())

  const handleCopyCode = async (code: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedItems(prev => new Set(prev).add(itemId))
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-balance mb-2">Recommendations</h2>
        <p className="text-muted-foreground text-pretty">
          AI-generated actionable suggestions with copy-paste ready code fixes
        </p>
      </div>

      {/* Code Fixes Section */}
      {codeFixes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Code className="h-5 w-5 text-blue-500" />
            Copy-Paste Ready Code Fixes
          </h3>
          {codeFixes.map((fix: any, index: number) => {
            const itemId = `code-fix-${index}`
            const isCopied = copiedItems.has(itemId)
            
            return (
              <Card key={index} className="p-6 border-l-4 border-l-blue-500">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">{fix.title}</h4>
                      <p className="text-muted-foreground text-sm mb-3">{fix.description}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyCode(fix.code, itemId)}
                      className="flex items-center gap-2"
                    >
                      {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      {isCopied ? 'Copied!' : 'Copy Code'}
                    </Button>
                  </div>
                  
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{fix.code}</pre>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Text Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Additional Recommendations</h3>
          {recommendations.map((rec: string, index: number) => (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-balance mb-2">{rec}</h4>
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
          ))}
        </div>
      )}

      {recommendations.length === 0 && codeFixes.length === 0 && (
        <p className="text-muted-foreground">No recommendations available</p>
      )}
    </div>
  )
}