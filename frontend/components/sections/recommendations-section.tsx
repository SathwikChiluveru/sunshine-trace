import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Code, Check, Lightbulb, AlertCircle, Clock, Zap } from "lucide-react"
import { useState, useMemo } from "react"

interface RecommendationsSectionProps {
  data: any // The data from backend (summaryData)
}

type FilterType = 'all' | 'code' | 'guidance'
type PriorityType = 'high' | 'medium' | 'low'

interface RecommendationItem {
  id: string
  title: string
  description: string
  type: 'code' | 'guidance'
  priority: PriorityType
  code?: string
  language?: string
}

export function RecommendationsSection({ data }: RecommendationsSectionProps) {
  // Extract recommendations from backend data
  const recommendations = data?.recommended_actions || []
  const codeFixes = data?.code_fixes || []
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterType>('all')

  // Transform data into unified format
  const allRecommendations: RecommendationItem[] = useMemo(() => {
    const items: RecommendationItem[] = []
    
    // Add code fixes
    codeFixes.forEach((fix: any, index: number) => {
      items.push({
        id: `code-fix-${index}`,
        title: fix.title || 'Code Fix',
        description: fix.description || 'AI-generated code fix',
        type: 'code',
        priority: 'high', // Code fixes are typically high priority
        code: fix.code,
        language: detectLanguage(fix.code)
      })
    })
    
    // Add text recommendations
    recommendations.forEach((rec: string, index: number) => {
      items.push({
        id: `rec-${index}`,
        title: extractTitle(rec),
        description: rec,
        type: 'guidance',
        priority: determinePriority(rec)
      })
    })
    
    return items
  }, [recommendations, codeFixes])

  // Filter recommendations based on selected filter
  const filteredRecommendations = useMemo(() => {
    if (filter === 'all') return allRecommendations
    return allRecommendations.filter(item => item.type === filter)
  }, [allRecommendations, filter])

  // Count by type
  const counts = useMemo(() => {
    const codeCount = allRecommendations.filter(item => item.type === 'code').length
    const guidanceCount = allRecommendations.filter(item => item.type === 'guidance').length
    return { total: allRecommendations.length, code: codeCount, guidance: guidanceCount }
  }, [allRecommendations])

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

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityIcon = (priority: PriorityType) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-3 w-3" />
      case 'medium': return <Clock className="h-3 w-3" />
      case 'low': return <Zap className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-balance mb-2">AI Recommendations</h2>
          <p className="text-muted-foreground text-pretty">
            Actionable insights with ready-to-use code fixes and implementation guidance
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <Code className="h-3 w-3" />
            {counts.code} Code Fixes
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Lightbulb className="h-3 w-3" />
            {counts.guidance} Guidelines
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      {allRecommendations.length > 0 && (
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All ({counts.total})
          </Button>
          <Button 
            variant={filter === 'code' ? 'default' : 'outline'}
            onClick={() => setFilter('code')}
            size="sm"
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            Code Fixes ({counts.code})
          </Button>
          <Button 
            variant={filter === 'guidance' ? 'default' : 'outline'}
            onClick={() => setFilter('guidance')}
            size="sm"
            className="gap-2"
          >
            <Lightbulb className="h-4 w-4" />
            Guidance ({counts.guidance})
          </Button>
        </div>
      )}

      {/* Recommendations List */}
      {filteredRecommendations.length > 0 ? (
        <div className="space-y-4">
          {filteredRecommendations.map((item) => {
            const isCopied = copiedItems.has(item.id)
            const isCode = item.type === 'code'
            
            return (
              <Card key={item.id} className={`p-6 border-l-4 ${
                isCode ? 'border-l-blue-500' : 'border-l-green-500'
              }`}>
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-lg ${
                      isCode ? 'bg-blue-50 dark:bg-blue-950' : 'bg-green-50 dark:bg-green-950'
                    }`}>
                      {isCode ? (
                        <Code className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{item.title}</h4>
                      <Badge variant={isCode ? "default" : "secondary"}>
                        {isCode ? "Code Fix" : "Guidance"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} />
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {item.priority} Priority
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
                    
                    {/* Code block if available */}
                    {isCode && item.code && (
                      <div className="mt-4 border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {item.language || 'Code'} • Ready to use
                          </span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleCopyCode(item.code!, item.id)}
                            className="gap-1"
                          >
                            {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            {isCopied ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                        <div className="bg-gray-900 text-gray-100 p-4">
                          <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">{item.code}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions
                  <div className="flex-shrink-0">
                    {isCode ? (
                      <Button 
                        onClick={() => handleCopyCode(item.code!, item.id)}
                        className="gap-2"
                      >
                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {isCopied ? 'Copied!' : 'Copy Code'}
                      </Button>
                    ) : (
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Learn More
                      </Button>
                    )}
                  </div> */}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Lightbulb className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No recommendations found</h3>
          <p className="text-muted-foreground">
            {filter === 'all' 
              ? "No recommendations available for this analysis" 
              : `No ${filter} recommendations available. Try switching to "All" to see all recommendations.`
            }
          </p>
        </div>
      )}
    </div>
  )
}

// Helper functions
function detectLanguage(code: string): string {
  if (code.includes('function') || code.includes('const') || code.includes('let') || code.includes('var')) {
    return 'JavaScript'
  }
  if (code.includes('def ') || code.includes('import ') || code.includes('from ')) {
    return 'Python'
  }
  if (code.includes('public class') || code.includes('private ') || code.includes('public ')) {
    return 'Java'
  }
  if (code.includes('package ') || code.includes('import (')) {
    return 'Go'
  }
  if (code.includes('<?php') || code.includes('$')) {
    return 'PHP'
  }
  return 'Code'
}

function extractTitle(text: string): string {
  // Try to extract a meaningful title from the recommendation text
  const sentences = text.split('.')
  const firstSentence = sentences[0].trim()
  
  if (firstSentence.length > 60) {
    return firstSentence.substring(0, 60) + '...'
  }
  
  return firstSentence || 'Recommendation'
}

function determinePriority(text: string): PriorityType {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('critical') || lowerText.includes('urgent') || lowerText.includes('immediately')) {
    return 'high'
  }
  if (lowerText.includes('important') || lowerText.includes('should') || lowerText.includes('recommend')) {
    return 'medium'
  }
  
  return 'low'
}