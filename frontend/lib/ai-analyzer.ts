// Frontend AI analyzer integration
export interface AIAnalysisRequest {
  type: 'sensitive_data' | 'vulnerabilities' | 'code_quality' | 'risk_assessment' | 'error_flow' | 'codebase';
  data: any;
}

export interface SensitiveDataDetection {
  detections: Array<{
    type: string;
    value: string;
    confidence: number;
    context: string;
    suggestion: string;
  }>;
  summary: string;
}

export interface VulnerabilityAnalysis {
  vulnerabilities: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location: string;
    fix: string;
  }>;
  risk_score: number;
  summary: string;
}

export interface CodeQualityAnalysis {
  quality_score: number;
  metrics: {
    complexity: number;
    maintainability: number;
    performance: number;
    documentation: number;
  };
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
  recommendations: string[];
}

export interface RiskAssessment {
  risk_score: number;
  factors: Array<{
    category: string;
    impact: number;
    likelihood: number;
    description: string;
  }>;
  mitigation_strategies: string[];
  priority_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorFlowAnalysis {
  root_cause: string;
  flow_pattern: string;
  cascade_analysis: string;
  prevention_strategies: string[];
  monitoring_points: string[];
  business_impact: string;
}

export interface CodebaseAnalysis {
  architecture_score: number;
  security_score: number;
  quality_score: number;
  technical_debt: string;
  recommendations: Array<{
    category: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    effort: string;
  }>;
  compliance_status: string;
}

export type AIAnalysisResult = 
  | SensitiveDataDetection 
  | VulnerabilityAnalysis 
  | CodeQualityAnalysis 
  | RiskAssessment 
  | ErrorFlowAnalysis 
  | CodebaseAnalysis;

// AI Analysis API client
export class AIAnalyzer {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  async analyzeSensitiveData(logContent: string): Promise<SensitiveDataDetection> {
    return this.performAnalysis({
      type: 'sensitive_data',
      data: logContent
    }) as Promise<SensitiveDataDetection>;
  }

  async analyzeVulnerabilities(codeContent: string, fileType: string): Promise<VulnerabilityAnalysis> {
    return this.performAnalysis({
      type: 'vulnerabilities',
      data: { content: codeContent, fileType }
    }) as Promise<VulnerabilityAnalysis>;
  }

  async analyzeCodeQuality(codeContent: string, fileType: string): Promise<CodeQualityAnalysis> {
    return this.performAnalysis({
      type: 'code_quality',
      data: { content: codeContent, fileType }
    }) as Promise<CodeQualityAnalysis>;
  }

  async analyzeRisk(moduleData: any): Promise<RiskAssessment> {
    return this.performAnalysis({
      type: 'risk_assessment',
      data: moduleData
    }) as Promise<RiskAssessment>;
  }

  async analyzeErrorFlow(errorSequence: any): Promise<ErrorFlowAnalysis> {
    return this.performAnalysis({
      type: 'error_flow',
      data: errorSequence
    }) as Promise<ErrorFlowAnalysis>;
  }

  async analyzeCodebase(codebaseData: any): Promise<CodebaseAnalysis> {
    return this.performAnalysis({
      type: 'codebase',
      data: codebaseData
    }) as Promise<CodebaseAnalysis>;
  }

  private async performAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Handle potential AI parsing errors
      if (result.error) {
        throw new Error(`AI analysis error: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    }
  }
}

// Enhanced log parser with AI integration
export class EnhancedLogParser {
  private aiAnalyzer: AIAnalyzer;

  constructor(aiAnalyzer?: AIAnalyzer) {
    this.aiAnalyzer = aiAnalyzer || new AIAnalyzer();
  }

  async parseWithAI(content: string, fileType?: string): Promise<{
    basic: any;
    ai: {
      sensitiveData?: SensitiveDataDetection;
      vulnerabilities?: VulnerabilityAnalysis;
      codeQuality?: CodeQualityAnalysis;
    };
  }> {
    // Basic parsing (existing functionality)
    const basic = this.parseBasic(content);

    // AI-enhanced analysis
    const ai: any = {};

    try {
      // Always analyze for sensitive data in logs
      if (fileType === 'log' || content.includes('ERROR') || content.includes('INFO')) {
        ai.sensitiveData = await this.aiAnalyzer.analyzeSensitiveData(content);
      }

      // Analyze code files for vulnerabilities and quality
      if (fileType && ['js', 'ts', 'py', 'java', 'cpp', 'c'].includes(fileType)) {
        ai.vulnerabilities = await this.aiAnalyzer.analyzeVulnerabilities(content, fileType);
        ai.codeQuality = await this.aiAnalyzer.analyzeCodeQuality(content, fileType);
      }
    } catch (error) {
      console.warn('AI analysis failed, falling back to basic analysis:', error);
    }

    return { basic, ai };
  }

  private parseBasic(content: string): any {
    // This would integrate with your existing parseLogFile function
    // For now, return a basic structure
    return {
      entries: content.split('\n').filter(line => line.trim()),
      timestamp: new Date().toISOString()
    };
  }
}

// Utility functions for AI analysis
export const AIAnalysisUtils = {
  // Convert AI results to display format
  formatSensitiveDataResults(detection: SensitiveDataDetection) {
    return {
      totalDetections: detection.detections.length,
      highConfidence: detection.detections.filter(d => d.confidence > 0.8).length,
      categories: [...new Set(detection.detections.map(d => d.type))],
      summary: detection.summary
    };
  },

  formatVulnerabilityResults(analysis: VulnerabilityAnalysis) {
    return {
      totalVulnerabilities: analysis.vulnerabilities.length,
      criticalCount: analysis.vulnerabilities.filter(v => v.severity === 'critical').length,
      highCount: analysis.vulnerabilities.filter(v => v.severity === 'high').length,
      riskScore: analysis.risk_score,
      summary: analysis.summary
    };
  },

  formatCodeQualityResults(analysis: CodeQualityAnalysis) {
    return {
      overallScore: analysis.quality_score,
      complexity: analysis.metrics.complexity,
      maintainability: analysis.metrics.maintainability,
      performance: analysis.metrics.performance,
      documentation: analysis.metrics.documentation,
      issueCount: analysis.issues.length,
      recommendations: analysis.recommendations
    };
  },

  // Generate risk heatmap data from AI analysis
  generateRiskHeatmap(modules: Array<{name: string, analysis: RiskAssessment}>) {
    return modules.map(module => ({
      name: module.name,
      score: module.analysis.risk_score,
      priority: module.analysis.priority_level,
      factors: module.analysis.factors.length
    }));
  }
};
