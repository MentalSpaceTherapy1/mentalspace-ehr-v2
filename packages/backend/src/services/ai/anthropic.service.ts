import logger, { logControllerError } from '../../utils/logger';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic Claude AI Service
 * Handles all interactions with Claude API for clinical AI features
 */
class AnthropicService {
  private client: Anthropic | null = null;
  // Claude Sonnet 4 - latest model as of 2025
  private model: string = 'claude-sonnet-4-20250514';

  private initializeClient() {
    if (this.client) {
      return; // Already initialized
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured in environment variables');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Generate a completion from Claude
   * @param systemPrompt System instructions for Claude
   * @param userPrompt User's request/content
   * @param options Additional options like max_tokens, temperature
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      stopSequences?: string[];
    } = {}
  ): Promise<string> {
    this.initializeClient();

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stop_sequences: options.stopSequences,
      });

      // Extract text content from the response
      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error: any) {
      logger.error('Anthropic API Error:', {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error.message,
        status: error.status,
        code: error.code,
        model: this.model
      });
      throw new Error(`AI Service Error: ${error.message}`);
    }
  }

  /**
   * Generate streaming completion (for real-time AI assistance)
   */
  async *generateStreamingCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    this.initializeClient();

    try {
      const stream = await this.client!.messages.stream({
        model: this.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          yield chunk.delta.text;
        }
      }
    } catch (error: any) {
      logger.error('Anthropic Streaming Error:', { errorType: error instanceof Error ? error.constructor.name : typeof error });
      throw new Error(`AI Streaming Error: ${error.message}`);
    }
  }

  /**
   * Analyze financial data and generate insights
   */
  async analyzeFinancialData(data: {
    revenue?: number[];
    expenses?: number[];
    appointments?: number[];
    period?: string;
    additionalContext?: string;
  }): Promise<{
    insights: string[];
    recommendations: string[];
    trends: { trend: string; direction: 'up' | 'down' | 'stable'; percentage: number }[];
    forecast: { period: string; predicted: number; confidence: number }[];
  }> {
    const systemPrompt = `You are a financial analyst specializing in mental health practice management.
Analyze the provided data and generate actionable insights for practice growth and efficiency.

Focus on:
- Revenue trends and optimization opportunities
- Appointment utilization patterns
- Cost management recommendations
- Growth opportunities
- Risk factors and mitigation strategies

Provide specific, data-driven recommendations.`;

    const userPrompt = `Analyze the following practice financial data:

${data.revenue ? `Revenue (last periods): ${data.revenue.join(', ')}` : ''}
${data.expenses ? `Expenses (last periods): ${data.expenses.join(', ')}` : ''}
${data.appointments ? `Appointments (last periods): ${data.appointments.join(', ')}` : ''}
${data.period ? `Period: ${data.period}` : ''}
${data.additionalContext ? `Additional Context: ${data.additionalContext}` : ''}

Provide analysis in JSON format:
{
  "insights": ["Insight 1", "Insight 2"],
  "recommendations": ["Action 1", "Action 2"],
  "trends": [
    {"trend": "Revenue", "direction": "up|down|stable", "percentage": 5.2}
  ],
  "forecast": [
    {"period": "Next Month", "predicted": 50000, "confidence": 0.85}
  ]
}`;

    try {
      const response = await this.generateCompletion(systemPrompt, userPrompt, {
        temperature: 0.5,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      logger.error('Financial analysis error:', { message: error.message });
      throw error;
    }
  }

  /**
   * Generate enhanced revenue forecast with AI insights
   */
  async enhanceRevenueForecast(historicalData: {
    dailyRevenue: { date: string; amount: number }[];
    appointmentCounts: { date: string; count: number }[];
    noShowRates: { date: string; rate: number }[];
    seasonalFactors?: string[];
  }): Promise<{
    enhancedForecast: { date: string; predicted: number; lower: number; upper: number; aiInsight: string }[];
    keyFactors: string[];
    recommendations: string[];
    riskFactors: string[];
    opportunityAreas: string[];
  }> {
    const systemPrompt = `You are a healthcare practice financial forecasting expert.
Analyze historical data patterns and provide enhanced revenue forecasts with insights.

Consider:
- Day of week patterns
- Seasonal trends in mental health services
- No-show impact on revenue
- Appointment capacity optimization
- External factors (holidays, economic conditions)

Provide specific, actionable forecasts with confidence intervals.`;

    const userPrompt = `Analyze the following data and enhance the revenue forecast:

Historical Daily Revenue (last 30 days):
${historicalData.dailyRevenue.slice(-30).map(d => `${d.date}: $${d.amount}`).join('\n')}

Appointment Counts:
${historicalData.appointmentCounts.slice(-30).map(d => `${d.date}: ${d.count}`).join('\n')}

No-Show Rates:
${historicalData.noShowRates.slice(-30).map(d => `${d.date}: ${(d.rate * 100).toFixed(1)}%`).join('\n')}

${historicalData.seasonalFactors ? `Seasonal Factors: ${historicalData.seasonalFactors.join(', ')}` : ''}

Provide enhanced forecast for the next 14 days in JSON format:
{
  "enhancedForecast": [
    {"date": "2025-01-01", "predicted": 5000, "lower": 4500, "upper": 5500, "aiInsight": "High confidence due to consistent patterns"}
  ],
  "keyFactors": ["Factor 1 affecting forecast", "Factor 2"],
  "recommendations": ["Revenue optimization suggestion 1"],
  "riskFactors": ["Risk 1 that could impact forecast"],
  "opportunityAreas": ["Opportunity 1 for revenue growth"]
}`;

    try {
      const response = await this.generateCompletion(systemPrompt, userPrompt, {
        temperature: 0.4,
        maxTokens: 3000,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      logger.error('Revenue forecast enhancement error:', { message: error.message });
      throw error;
    }
  }

  /**
   * Generate report insights
   */
  async generateReportInsights(reportData: {
    reportType: string;
    metrics: Record<string, number | string>;
    comparisonPeriod?: Record<string, number | string>;
    context?: string;
  }): Promise<{
    summary: string;
    keyFindings: string[];
    trends: string[];
    recommendations: string[];
    alerts: { level: 'info' | 'warning' | 'critical'; message: string }[];
  }> {
    const systemPrompt = `You are a healthcare analytics expert generating insights from practice reports.
Provide clear, actionable insights that help practice managers make informed decisions.

Focus on:
- Key performance indicators
- Trend analysis
- Comparison with benchmarks
- Actionable recommendations
- Early warning indicators`;

    const userPrompt = `Analyze this ${reportData.reportType} report and generate insights:

Current Metrics:
${Object.entries(reportData.metrics).map(([k, v]) => `${k}: ${v}`).join('\n')}

${reportData.comparisonPeriod ? `
Previous Period Comparison:
${Object.entries(reportData.comparisonPeriod).map(([k, v]) => `${k}: ${v}`).join('\n')}
` : ''}

${reportData.context ? `Context: ${reportData.context}` : ''}

Provide insights in JSON format:
{
  "summary": "Brief executive summary",
  "keyFindings": ["Finding 1", "Finding 2"],
  "trends": ["Trend 1", "Trend 2"],
  "recommendations": ["Action 1", "Action 2"],
  "alerts": [
    {"level": "info|warning|critical", "message": "Alert message"}
  ]
}`;

    try {
      const response = await this.generateCompletion(systemPrompt, userPrompt, {
        temperature: 0.5,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      logger.error('Report insights generation error:', { message: error.message });
      throw error;
    }
  }

  /**
   * Health check for AI service
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.generateCompletion(
        'You are a helpful assistant.',
        'Respond with OK if you can read this.',
        { maxTokens: 10 }
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const anthropicService = new AnthropicService();
export default anthropicService;
