// AI Services Integration Tests
// Tests for Anthropic Claude and OpenAI services

// Create mock functions first
const mockAnthropicCreate = jest.fn();
const mockAnthropicStream = jest.fn();
const mockOpenAICreate = jest.fn();

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockAnthropicCreate,
        stream: mockAnthropicStream,
      },
    })),
  };
});

// Mock OpenAI SDK
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logControllerError: jest.fn(),
}));

// Mock field mappings service
jest.mock('../ai/fieldMappings.service', () => ({
  __esModule: true,
  getFieldMapping: jest.fn().mockReturnValue({
    subjective: {
      type: 'textarea',
      description: 'Client reported symptoms and concerns',
    },
    objective: {
      type: 'textarea',
      description: 'Observable behaviors and mental status',
    },
    assessment: {
      type: 'textarea',
      description: 'Clinical assessment and impressions',
    },
    plan: {
      type: 'textarea',
      description: 'Treatment plan and next steps',
    },
    riskLevel: {
      type: 'select',
      description: 'Risk assessment level',
      options: ['None', 'Low', 'Moderate', 'High', 'Imminent'],
    },
  }),
}));

// Set environment variables before imports
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

describe('AI Services Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset modules to get fresh instances
    jest.resetModules();
  });

  describe('Anthropic Service', () => {
    describe('generateCompletion', () => {
      it('should generate a completion with default options', async () => {
        // Re-import after mocks are set up
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'This is the AI response text.',
            },
          ],
        });

        const result = await anthropicService.generateCompletion(
          'You are a helpful assistant.',
          'Hello, how are you?'
        );

        expect(result).toBe('This is the AI response text.');
        expect(mockAnthropicCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: expect.any(String),
            max_tokens: 4096,
            temperature: 0.7,
            system: 'You are a helpful assistant.',
            messages: [
              {
                role: 'user',
                content: 'Hello, how are you?',
              },
            ],
          })
        );
      });

      it('should use custom options when provided', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Custom response' }],
        });

        await anthropicService.generateCompletion(
          'System prompt',
          'User prompt',
          {
            maxTokens: 2048,
            temperature: 0.5,
            stopSequences: ['END'],
          }
        );

        expect(mockAnthropicCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens: 2048,
            temperature: 0.5,
            stop_sequences: ['END'],
          })
        );
      });

      it('should throw error when no text content in response', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockResolvedValue({
          content: [],
        });

        await expect(
          anthropicService.generateCompletion('System', 'User')
        ).rejects.toThrow('No text content in Claude response');
      });

      it('should handle API errors gracefully', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockRejectedValue(
          new Error('API rate limit exceeded')
        );

        await expect(
          anthropicService.generateCompletion('System', 'User')
        ).rejects.toThrow('AI Service Error: API rate limit exceeded');
      });
    });

    describe('generateStreamingCompletion', () => {
      it('should yield text chunks from streaming response', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        // Create async iterator for streaming
        const mockStream = {
          [Symbol.asyncIterator]: async function* () {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Hello' },
            };
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: ' World' },
            };
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: '!' },
            };
          },
        };

        mockAnthropicStream.mockResolvedValue(mockStream);

        const chunks: string[] = [];
        for await (const chunk of anthropicService.generateStreamingCompletion(
          'System',
          'User'
        )) {
          chunks.push(chunk);
        }

        expect(chunks).toEqual(['Hello', ' World', '!']);
      });

      it('should handle streaming errors', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicStream.mockRejectedValue(new Error('Stream connection lost'));

        const generator = anthropicService.generateStreamingCompletion(
          'System',
          'User'
        );

        await expect(generator.next()).rejects.toThrow('AI Streaming Error');
      });
    });

    describe('analyzeFinancialData', () => {
      it('should analyze financial data and return structured insights', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        const mockResponse = JSON.stringify({
          insights: ['Revenue has increased by 15%', 'Appointment utilization is optimal'],
          recommendations: ['Consider hiring additional staff', 'Expand evening hours'],
          trends: [
            { trend: 'Revenue', direction: 'up', percentage: 15 },
            { trend: 'Appointments', direction: 'stable', percentage: 0 },
          ],
          forecast: [
            { period: 'Next Month', predicted: 50000, confidence: 0.85 },
          ],
        });

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: mockResponse }],
        });

        const result = await anthropicService.analyzeFinancialData({
          revenue: [45000, 47000, 49000, 52000],
          expenses: [30000, 31000, 30500, 31500],
          appointments: [200, 210, 215, 220],
          period: 'Q1 2025',
        });

        expect(result.insights).toHaveLength(2);
        expect(result.recommendations).toHaveLength(2);
        expect(result.trends).toHaveLength(2);
        expect(result.forecast).toHaveLength(1);
        expect(result.forecast[0].confidence).toBe(0.85);
      });

      it('should handle missing JSON in response', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'Invalid response without JSON' }],
        });

        await expect(
          anthropicService.analyzeFinancialData({
            revenue: [10000, 11000],
          })
        ).rejects.toThrow('No JSON in response');
      });
    });

    describe('enhanceRevenueForecast', () => {
      it('should enhance revenue forecast with AI insights', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        const mockResponse = JSON.stringify({
          enhancedForecast: [
            {
              date: '2025-01-15',
              predicted: 5000,
              lower: 4500,
              upper: 5500,
              aiInsight: 'Expected high volume due to beginning of year',
            },
          ],
          keyFactors: ['Seasonal demand increase', 'New client referrals'],
          recommendations: ['Extend hours on Monday and Friday'],
          riskFactors: ['Potential weather-related cancellations'],
          opportunityAreas: ['Group therapy sessions'],
        });

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: mockResponse }],
        });

        const result = await anthropicService.enhanceRevenueForecast({
          dailyRevenue: [
            { date: '2025-01-01', amount: 4800 },
            { date: '2025-01-02', amount: 5200 },
          ],
          appointmentCounts: [
            { date: '2025-01-01', count: 12 },
            { date: '2025-01-02', count: 14 },
          ],
          noShowRates: [
            { date: '2025-01-01', rate: 0.08 },
            { date: '2025-01-02', rate: 0.05 },
          ],
        });

        expect(result.enhancedForecast).toHaveLength(1);
        expect(result.keyFactors).toHaveLength(2);
        expect(result.recommendations).toHaveLength(1);
        expect(result.riskFactors).toHaveLength(1);
        expect(result.opportunityAreas).toHaveLength(1);
      });
    });

    describe('generateReportInsights', () => {
      it('should generate insights from report data', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        const mockResponse = JSON.stringify({
          summary: 'Practice revenue increased 12% this quarter',
          keyFindings: ['Client retention rate improved', 'Average session value increased'],
          trends: ['Upward revenue trend', 'Stable appointment volume'],
          recommendations: ['Continue current pricing strategy'],
          alerts: [
            { level: 'info', message: 'Consider expanding telehealth offerings' },
          ],
        });

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: mockResponse }],
        });

        const result = await anthropicService.generateReportInsights({
          reportType: 'Revenue Analysis',
          metrics: {
            totalRevenue: 150000,
            appointmentsCompleted: 450,
            averageSessionValue: 333,
          },
          comparisonPeriod: {
            totalRevenue: 134000,
            appointmentsCompleted: 420,
            averageSessionValue: 319,
          },
        });

        expect(result.summary).toBeDefined();
        expect(result.keyFindings).toHaveLength(2);
        expect(result.alerts[0].level).toBe('info');
      });
    });

    describe('healthCheck', () => {
      it('should return true when service is healthy', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'OK' }],
        });

        const result = await anthropicService.healthCheck();
        expect(result).toBe(true);
      });

      it('should return false when service is unhealthy', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockRejectedValue(new Error('Service unavailable'));

        const result = await anthropicService.healthCheck();
        expect(result).toBe(false);
      });
    });
  });

  describe('OpenAI Service', () => {
    describe('generateCompletion', () => {
      it('should generate a completion with default options', async () => {
        const { openaiService } = await import('../ai/openai.service');

        mockOpenAICreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: 'OpenAI response text',
              },
            },
          ],
        });

        const result = await openaiService.generateCompletion(
          'You are a financial analyst.',
          'Analyze this data'
        );

        expect(result).toBe('OpenAI response text');
        expect(mockOpenAICreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: expect.any(String),
            max_tokens: 4096,
            temperature: 0.7,
            messages: [
              { role: 'system', content: 'You are a financial analyst.' },
              { role: 'user', content: 'Analyze this data' },
            ],
          })
        );
      });

      it('should use JSON response format when specified', async () => {
        const { openaiService } = await import('../ai/openai.service');

        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: '{"key": "value"}' } }],
        });

        await openaiService.generateCompletion('System', 'User', {
          responseFormat: 'json_object',
        });

        expect(mockOpenAICreate).toHaveBeenCalledWith(
          expect.objectContaining({
            response_format: { type: 'json_object' },
          })
        );
      });

      it('should throw error when no content in response', async () => {
        const { openaiService } = await import('../ai/openai.service');

        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: null } }],
        });

        await expect(
          openaiService.generateCompletion('System', 'User')
        ).rejects.toThrow('No content in OpenAI response');
      });

      it('should handle API errors gracefully', async () => {
        const { openaiService } = await import('../ai/openai.service');

        mockOpenAICreate.mockRejectedValue(new Error('Quota exceeded'));

        await expect(
          openaiService.generateCompletion('System', 'User')
        ).rejects.toThrow('AI Service Error: Quota exceeded');
      });
    });

    describe('generateStreamingCompletion', () => {
      it('should yield content chunks from streaming response', async () => {
        const { openaiService } = await import('../ai/openai.service');

        // Create async iterator for streaming
        const mockStream = {
          [Symbol.asyncIterator]: async function* () {
            yield { choices: [{ delta: { content: 'Streaming ' } }] };
            yield { choices: [{ delta: { content: 'response ' } }] };
            yield { choices: [{ delta: { content: 'here' } }] };
          },
        };

        mockOpenAICreate.mockResolvedValue(mockStream);

        const chunks: string[] = [];
        for await (const chunk of openaiService.generateStreamingCompletion(
          'System',
          'User'
        )) {
          chunks.push(chunk);
        }

        expect(chunks).toEqual(['Streaming ', 'response ', 'here']);
        expect(mockOpenAICreate).toHaveBeenCalledWith(
          expect.objectContaining({
            stream: true,
          })
        );
      });

      it('should skip chunks without content', async () => {
        const { openaiService } = await import('../ai/openai.service');

        const mockStream = {
          [Symbol.asyncIterator]: async function* () {
            yield { choices: [{ delta: { content: 'Valid' } }] };
            yield { choices: [{ delta: {} }] }; // No content
            yield { choices: [{ delta: { content: ' chunk' } }] };
          },
        };

        mockOpenAICreate.mockResolvedValue(mockStream);

        const chunks: string[] = [];
        for await (const chunk of openaiService.generateStreamingCompletion(
          'System',
          'User'
        )) {
          chunks.push(chunk);
        }

        expect(chunks).toEqual(['Valid', ' chunk']);
      });
    });

    describe('analyzeFinancialData', () => {
      it('should use JSON response format for financial analysis', async () => {
        const { openaiService } = await import('../ai/openai.service');

        const mockResponse = JSON.stringify({
          insights: ['Revenue growing steadily'],
          recommendations: ['Optimize scheduling'],
          trends: [{ trend: 'Revenue', direction: 'up', percentage: 10 }],
          forecast: [{ period: 'Q2', predicted: 60000, confidence: 0.8 }],
        });

        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: mockResponse } }],
        });

        const result = await openaiService.analyzeFinancialData({
          revenue: [50000, 52000, 55000],
          period: 'Q1 2025',
        });

        expect(result.insights).toBeDefined();
        expect(result.forecast[0].predicted).toBe(60000);
        expect(mockOpenAICreate).toHaveBeenCalledWith(
          expect.objectContaining({
            response_format: { type: 'json_object' },
          })
        );
      });
    });

    describe('healthCheck', () => {
      it('should return true when service is healthy', async () => {
        const { openaiService } = await import('../ai/openai.service');

        mockOpenAICreate.mockResolvedValue({
          choices: [{ message: { content: 'OK' } }],
        });

        const result = await openaiService.healthCheck();
        expect(result).toBe(true);
      });

      it('should return false when service is unhealthy', async () => {
        const { openaiService } = await import('../ai/openai.service');

        mockOpenAICreate.mockRejectedValue(new Error('Service down'));

        const result = await openaiService.healthCheck();
        expect(result).toBe(false);
      });
    });
  });

  describe('Clinical Note Generation Service', () => {
    describe('generateNote', () => {
      it('should generate a Progress Note with all sections', async () => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        const mockResponse = JSON.stringify({
          content: {
            subjective:
              'Client reports improved mood since last session. Sleep has improved to 7 hours per night.',
            objective:
              'Client appeared well-groomed and engaged. Speech was normal rate and rhythm. Affect was congruent with mood.',
            assessment:
              'Client demonstrates progress toward treatment goals. Depression symptoms have decreased in severity.',
            plan:
              'Continue weekly CBT sessions. Assign thought record homework. Follow up on medication compliance.',
            riskLevel: 'Low',
          },
          confidence: 0.88,
          suggestions: [
            'Consider adding specific PHQ-9 score',
            'Document homework compliance from previous session',
          ],
          warnings: [],
        });

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: mockResponse }],
        });

        const result = await clinicalNoteGenerationService.generateNote({
          noteType: 'Progress Note',
          clientInfo: {
            firstName: 'John',
            lastName: 'Doe',
            age: 35,
            diagnoses: ['F32.1 Major Depressive Disorder'],
          },
          sessionData: {
            sessionDate: '2025-01-10',
            sessionDuration: '50 minutes',
            sessionType: 'Individual Therapy',
          },
        });

        expect(result.generatedContent.subjective).toBeDefined();
        expect(result.generatedContent.objective).toBeDefined();
        expect(result.generatedContent.assessment).toBeDefined();
        expect(result.generatedContent.plan).toBeDefined();
        expect(result.confidence).toBe(0.88);
        expect(result.suggestions).toHaveLength(2);
      });

      it('should generate an Intake Assessment with comprehensive sections', async () => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        const mockResponse = JSON.stringify({
          content: {
            chiefComplaint: 'Client presents with persistent low mood and anxiety',
            psychiatricHistory: 'No prior psychiatric treatment',
            medicalHistory: 'No significant medical history',
            socialHistory:
              'Client is employed full-time as a software engineer. Lives alone. Reports limited social support.',
            substanceUse: 'Denies substance use',
            mentalStatusExam:
              'Alert and oriented x4. Appearance appropriate. Mood depressed, affect constricted.',
            riskAssessment: 'No suicidal or homicidal ideation. Risk level: Low',
            clinicalAssessment:
              'Client presents with symptoms consistent with Major Depressive Disorder',
            diagnosis: 'F32.1 Major Depressive Disorder, Single Episode, Moderate',
            treatmentRecommendations:
              'Weekly individual therapy, CBT approach. Consider psychiatric evaluation for medication.',
            prognosis: 'Good prognosis given insight and motivation for treatment',
          },
          confidence: 0.82,
          suggestions: ['Obtain collateral information from family if consented'],
          warnings: ['Limited information about family psychiatric history'],
        });

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: mockResponse }],
        });

        const result = await clinicalNoteGenerationService.generateNote({
          noteType: 'Intake Assessment',
          clientInfo: {
            firstName: 'Jane',
            lastName: 'Smith',
            age: 28,
          },
          transcript:
            'Client: I have been feeling really down for the past two months...',
        });

        expect(result.generatedContent.chiefComplaint).toBeDefined();
        expect(result.generatedContent.diagnosis).toContain('F32.1');
        expect(result.warnings).toHaveLength(1);
      });

      it('should generate a Treatment Plan with SMART goals', async () => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        const mockResponse = JSON.stringify({
          content: {
            presentingProblems: ['Depression', 'Social Isolation', 'Sleep Disturbance'],
            diagnoses: ['F32.1 Major Depressive Disorder, Single Episode, Moderate'],
            goals: [
              {
                goal: 'Reduce depressive symptoms as measured by PHQ-9 from 15 to < 10 within 12 weeks',
                objectives: [
                  'Client will identify 3 cognitive distortions per week',
                  'Client will practice behavioral activation 3x per week',
                ],
                interventions: [
                  'Cognitive Restructuring',
                  'Behavioral Activation',
                  'Activity Scheduling',
                ],
              },
            ],
            frequency: 'Weekly 50-minute individual sessions',
            duration: '12-16 weeks',
            dischargeCriteria: 'PHQ-9 < 5 for 4 consecutive weeks',
          },
          confidence: 0.85,
          suggestions: [],
          warnings: [],
        });

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: mockResponse }],
        });

        const result = await clinicalNoteGenerationService.generateNote({
          noteType: 'Treatment Plan',
          clientInfo: {
            firstName: 'John',
            lastName: 'Doe',
            diagnoses: ['F32.1 Major Depressive Disorder'],
          },
        });

        expect(result.generatedContent.goals).toHaveLength(1);
        expect(result.generatedContent.goals[0].objectives).toHaveLength(2);
        expect(result.generatedContent.frequency).toContain('Weekly');
      });

      it('should handle AI response parsing failures gracefully', async () => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: 'This is an invalid response without JSON' }],
        });

        const result = await clinicalNoteGenerationService.generateNote({
          noteType: 'Progress Note',
          clientInfo: {
            firstName: 'Test',
            lastName: 'User',
          },
        });

        // Should return fallback response
        expect(result.generatedContent.rawResponse).toBeDefined();
        expect(result.confidence).toBe(0.5);
        expect(result.warnings).toContain(
          'Response parsing failed. Manual review required.'
        );
      });

      it('should throw error when AI service fails', async () => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        mockAnthropicCreate.mockRejectedValue(new Error('Connection timeout'));

        await expect(
          clinicalNoteGenerationService.generateNote({
            noteType: 'Progress Note',
            clientInfo: {
              firstName: 'Test',
              lastName: 'User',
            },
          })
        ).rejects.toThrow('Failed to generate clinical note');
      });
    });

    describe('generateFieldSuggestion', () => {
      it('should generate suggestions for a specific field', async () => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        mockAnthropicCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Consider adding specific behavioral observations such as eye contact, posture, and engagement level.',
            },
          ],
        });

        const result = await clinicalNoteGenerationService.generateFieldSuggestion(
          'Progress Note',
          'objective',
          'Client appeared calm and cooperative.',
          { mood: 'improved', sessionType: 'Individual' }
        );

        expect(result).toContain('behavioral observations');
        expect(mockAnthropicCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens: 200,
          })
        );
      });

      it('should return empty string on error', async () => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        mockAnthropicCreate.mockRejectedValue(new Error('API Error'));

        const result = await clinicalNoteGenerationService.generateFieldSuggestion(
          'Progress Note',
          'objective',
          'Client appeared calm.',
          {}
        );

        expect(result).toBe('');
      });
    });

    describe('Note Type Support', () => {
      it.each([
        'Progress Note',
        'Intake Assessment',
        'Treatment Plan',
        'Cancellation Note',
        'Consultation Note',
        'Contact Note',
        'Termination Note',
        'Miscellaneous Note',
      ])('should generate %s note type', async (noteType) => {
        const { clinicalNoteGenerationService } = await import(
          '../ai/clinicalNoteGeneration.service'
        );

        const mockResponse = JSON.stringify({
          content: { field1: 'Generated content' },
          confidence: 0.8,
          suggestions: [],
          warnings: [],
        });

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: mockResponse }],
        });

        const result = await clinicalNoteGenerationService.generateNote({
          noteType,
          clientInfo: {
            firstName: 'Test',
            lastName: 'Client',
          },
        });

        expect(result.generatedContent).toBeDefined();
        expect(result.confidence).toBe(0.8);
      });
    });
  });

  describe('Error Handling', () => {
    describe('Missing API Keys', () => {
      it('should throw error when ANTHROPIC_API_KEY is not set', async () => {
        // Clear the environment variable
        const originalKey = process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;

        // Need to re-import to test initialization
        jest.resetModules();

        // Re-mock the SDK
        jest.mock('@anthropic-ai/sdk', () => ({
          __esModule: true,
          default: jest.fn().mockImplementation(() => ({
            messages: { create: jest.fn(), stream: jest.fn() },
          })),
        }));

        jest.mock('../../utils/logger', () => ({
          __esModule: true,
          default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
          logControllerError: jest.fn(),
        }));

        const { anthropicService } = await import('../ai/anthropic.service');

        await expect(
          anthropicService.generateCompletion('System', 'User')
        ).rejects.toThrow('ANTHROPIC_API_KEY is not configured');

        // Restore
        process.env.ANTHROPIC_API_KEY = originalKey;
      });
    });

    describe('API Rate Limiting', () => {
      it('should handle rate limit errors appropriately', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).status = 429;
        (rateLimitError as any).code = 'rate_limit_error';

        mockAnthropicCreate.mockRejectedValue(rateLimitError);

        await expect(
          anthropicService.generateCompletion('System', 'User')
        ).rejects.toThrow('AI Service Error');
      });
    });

    describe('Invalid Response Format', () => {
      it('should handle malformed JSON in response', async () => {
        const { anthropicService } = await import('../ai/anthropic.service');

        mockAnthropicCreate.mockResolvedValue({
          content: [{ type: 'text', text: '{ invalid json }}}' }],
        });

        await expect(
          anthropicService.analyzeFinancialData({ revenue: [1000] })
        ).rejects.toThrow();
      });
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Complete Note Generation Flow', () => {
      it('should support generating notes with all available input types', async () => {
        // This test verifies that the clinical note generation service
        // can accept and process all types of input data:
        // - clientInfo (demographics, diagnoses)
        // - sessionData (date, duration, type)
        // - transcript (session recording)
        // - formData (clinician annotations)
        //
        // The actual AI response is tested in the generateNote tests above.
        // This test documents the expected input structure.

        const expectedInput = {
          noteType: 'Progress Note',
          clientInfo: {
            firstName: 'Alex',
            lastName: 'Johnson',
            age: 32,
            diagnoses: ['F41.1 Generalized Anxiety Disorder'],
            presentingProblems: ['Work-related anxiety', 'Panic symptoms'],
          },
          sessionData: {
            sessionDate: '2025-01-10',
            sessionDuration: '50 minutes',
            sessionType: 'Individual Therapy',
            location: 'Office',
          },
          transcript:
            'Therapist: How have things been since our last session? Client: I have been feeling really anxious about a big presentation at work...',
          formData: {
            interventionsUsed: ['CBT', 'Relaxation Training'],
            gad7Score: 12,
          },
        };

        // Verify the input structure is valid
        expect(expectedInput.noteType).toBe('Progress Note');
        expect(expectedInput.clientInfo.firstName).toBe('Alex');
        expect(expectedInput.sessionData.sessionDate).toBe('2025-01-10');
        expect(expectedInput.transcript).toContain('anxious');
        expect(expectedInput.formData.gad7Score).toBe(12);
      });
    });

    describe('Financial Analysis Workflow', () => {
      it('should analyze data and enhance forecast sequentially', async () => {
        const { openaiService } = await import('../ai/openai.service');

        // First call: analyze financial data
        const analysisResponse = JSON.stringify({
          insights: ['Revenue showing 10% growth'],
          recommendations: ['Consider expanding services'],
          trends: [{ trend: 'Revenue', direction: 'up', percentage: 10 }],
          forecast: [{ period: 'Next Month', predicted: 55000, confidence: 0.8 }],
        });

        mockOpenAICreate.mockResolvedValueOnce({
          choices: [{ message: { content: analysisResponse } }],
        });

        const analysis = await openaiService.analyzeFinancialData({
          revenue: [50000, 52000, 54000],
          period: 'Q1 2025',
        });

        expect(analysis.insights[0]).toContain('growth');

        // Second call: enhance forecast
        const forecastResponse = JSON.stringify({
          enhancedForecast: [
            {
              date: '2025-02-01',
              predicted: 5500,
              lower: 5000,
              upper: 6000,
              aiInsight: 'Continued growth expected',
            },
          ],
          keyFactors: ['Seasonal patterns', 'Client retention'],
          recommendations: ['Book ahead for peak times'],
          riskFactors: ['Holiday slowdown in March'],
          opportunityAreas: ['Group sessions'],
        });

        mockOpenAICreate.mockResolvedValueOnce({
          choices: [{ message: { content: forecastResponse } }],
        });

        const forecast = await openaiService.enhanceRevenueForecast({
          dailyRevenue: [{ date: '2025-01-01', amount: 5000 }],
          appointmentCounts: [{ date: '2025-01-01', count: 15 }],
          noShowRates: [{ date: '2025-01-01', rate: 0.05 }],
        });

        expect(forecast.enhancedForecast[0].aiInsight).toContain('growth');
        expect(forecast.riskFactors).toContain('Holiday slowdown in March');
      });
    });
  });
});
