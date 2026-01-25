import prisma from './database';
import symptomTrackingService from './symptom-tracking.service';
import sleepTrackingService from './sleep-tracking.service';
import exerciseTrackingService from './exercise-tracking.service';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface CorrelationData {
  metric1: string;
  metric2: string;
  correlation: number;
  strength: string;
  description: string;
}

export interface Pattern {
  type: string;
  description: string;
  confidence: number;
  recommendation?: string;
}

export class ProgressAnalyticsService {
  /**
   * Get combined analytics across all tracking domains
   */
  async getCombinedAnalytics(clientId: string, dateRange: DateRange) {
    // Fetch data from all three tracking types in parallel
    const [symptomLogs, sleepLogs, exerciseLogs] = await Promise.all([
      prisma.symptomLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.sleepLog.findMany({
        where: {
          clientId,
          logDate: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { logDate: 'asc' },
      }),
      prisma.exerciseLog.findMany({
        where: {
          clientId,
          loggedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    // Get individual summaries
    const [symptomSummary, sleepMetrics, exerciseStats] = await Promise.all([
      symptomTrackingService.getSymptomSummary(clientId, dateRange),
      sleepTrackingService.calculateSleepMetrics(clientId, dateRange),
      exerciseTrackingService.getExerciseStats(clientId, dateRange),
    ]);

    // Calculate correlations
    const correlations = this.calculateCorrelations(symptomLogs, sleepLogs, exerciseLogs);

    // Identify patterns
    const patterns = this.identifyPatterns(symptomLogs, sleepLogs, exerciseLogs);

    // Overall health score (0-100)
    const healthScore = this.calculateHealthScore(
      symptomSummary,
      sleepMetrics,
      exerciseStats
    );

    return {
      period: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        days: Math.ceil(
          (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
      symptoms: symptomSummary,
      sleep: sleepMetrics,
      exercise: exerciseStats,
      correlations,
      patterns,
      healthScore,
      insights: this.generateInsights(correlations, patterns, healthScore),
    };
  }

  /**
   * Identify patterns using ML-lite approach
   */
  identifyPatterns(symptomLogs: any[], sleepLogs: any[], exerciseLogs: any[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Pattern 1: Poor sleep → Higher symptom severity
    const sleepSymptomCorrelation = this.calculateSleepSymptomCorrelation(
      symptomLogs,
      sleepLogs
    );
    if (sleepSymptomCorrelation < -0.3) {
      patterns.push({
        type: 'SLEEP_SYMPTOM_LINK',
        description: 'Poor sleep quality is associated with increased symptom severity',
        confidence: Math.abs(sleepSymptomCorrelation) * 100,
        recommendation: 'Improving sleep hygiene may help reduce symptom severity',
      });
    }

    // Pattern 2: Exercise → Better mood
    const exerciseMoodPattern = this.analyzeExerciseMoodPattern(exerciseLogs);
    if (exerciseMoodPattern.positive) {
      patterns.push({
        type: 'EXERCISE_MOOD_BOOST',
        description: 'Exercise sessions are consistently followed by improved mood',
        confidence: exerciseMoodPattern.confidence,
        recommendation: 'Continue regular exercise routine to maintain positive mood',
      });
    }

    // Pattern 3: Consistent sleep schedule
    const sleepConsistency = this.analyzeSleepConsistency(sleepLogs);
    if (sleepConsistency.isConsistent) {
      patterns.push({
        type: 'GOOD_SLEEP_ROUTINE',
        description: 'Maintaining a consistent sleep schedule',
        confidence: sleepConsistency.score,
        recommendation: 'Keep up the good work with consistent sleep times',
      });
    } else if (sleepLogs.length > 5) {
      patterns.push({
        type: 'INCONSISTENT_SLEEP',
        description: 'Sleep schedule is irregular, which may impact overall health',
        confidence: 100 - sleepConsistency.score,
        recommendation: 'Try to maintain more consistent bedtime and wake time',
      });
    }

    // Pattern 4: Exercise frequency and symptom improvement
    const exerciseImpact = this.analyzeExerciseImpact(symptomLogs, exerciseLogs);
    if (exerciseImpact.hasPositiveImpact) {
      patterns.push({
        type: 'EXERCISE_SYMPTOM_REDUCTION',
        description: 'Regular exercise is associated with reduced symptom severity',
        confidence: exerciseImpact.confidence,
        recommendation: 'Aim for at least 3-4 exercise sessions per week',
      });
    }

    // Pattern 5: Weekend vs weekday differences
    const weekdayPattern = this.analyzeWeekdayPattern(symptomLogs, sleepLogs, exerciseLogs);
    if (weekdayPattern.significantDifference) {
      patterns.push({
        type: 'WEEKDAY_WEEKEND_PATTERN',
        description: weekdayPattern.description,
        confidence: weekdayPattern.confidence,
        recommendation: weekdayPattern.recommendation,
      });
    }

    return patterns;
  }

  /**
   * Calculate correlations between different metrics
   */
  private calculateCorrelations(
    symptomLogs: any[],
    sleepLogs: any[],
    exerciseLogs: any[]
  ): CorrelationData[] {
    const correlations: CorrelationData[] = [];

    // Sleep quality vs symptom severity
    const sleepSymptomCorr = this.calculateSleepSymptomCorrelation(symptomLogs, sleepLogs);
    correlations.push({
      metric1: 'Sleep Quality',
      metric2: 'Symptom Severity',
      correlation: sleepSymptomCorr,
      strength: this.getCorrelationStrength(sleepSymptomCorr),
      description: this.getCorrelationDescription('sleep', 'symptoms', sleepSymptomCorr),
    });

    // Exercise frequency vs symptom severity
    const exerciseSymptomCorr = this.calculateExerciseSymptomCorrelation(
      symptomLogs,
      exerciseLogs
    );
    correlations.push({
      metric1: 'Exercise Frequency',
      metric2: 'Symptom Severity',
      correlation: exerciseSymptomCorr,
      strength: this.getCorrelationStrength(exerciseSymptomCorr),
      description: this.getCorrelationDescription('exercise', 'symptoms', exerciseSymptomCorr),
    });

    // Sleep hours vs exercise performance
    const sleepExerciseCorr = this.calculateSleepExerciseCorrelation(sleepLogs, exerciseLogs);
    correlations.push({
      metric1: 'Sleep Hours',
      metric2: 'Exercise Duration',
      correlation: sleepExerciseCorr,
      strength: this.getCorrelationStrength(sleepExerciseCorr),
      description: this.getCorrelationDescription('sleep', 'exercise', sleepExerciseCorr),
    });

    return correlations;
  }

  /**
   * Calculate correlation between sleep quality and symptom severity
   */
  private calculateSleepSymptomCorrelation(symptomLogs: any[], sleepLogs: any[]): number {
    if (symptomLogs.length === 0 || sleepLogs.length === 0) return 0;

    // Group by date
    const dailyData = new Map<string, { sleepQuality?: number; symptomSeverity?: number }>();

    sleepLogs.forEach((log) => {
      const date = log.logDate.toISOString().split('T')[0];
      dailyData.set(date, { ...dailyData.get(date), sleepQuality: log.quality });
    });

    symptomLogs.forEach((log) => {
      const date = log.loggedAt.toISOString().split('T')[0];
      const existing = dailyData.get(date) || {};
      dailyData.set(date, { ...existing, symptomSeverity: log.severity });
    });

    // Filter to days with both metrics
    const paired = Array.from(dailyData.values()).filter(
      (d) => d.sleepQuality !== undefined && d.symptomSeverity !== undefined
    );

    if (paired.length < 3) return 0;

    // Calculate Pearson correlation (inverted because higher sleep quality = lower severity)
    return -this.pearsonCorrelation(
      paired.map((d) => d.sleepQuality!),
      paired.map((d) => d.symptomSeverity!)
    );
  }

  /**
   * Calculate correlation between exercise and symptoms
   */
  private calculateExerciseSymptomCorrelation(symptomLogs: any[], exerciseLogs: any[]): number {
    if (symptomLogs.length === 0 || exerciseLogs.length === 0) return 0;

    // Group by week
    const weeklyData = new Map<
      string,
      { exerciseMinutes: number; avgSeverity: number; symptomCount: number }
    >();

    exerciseLogs.forEach((log) => {
      const week = this.getWeekKey(log.loggedAt);
      const existing = weeklyData.get(week) || {
        exerciseMinutes: 0,
        avgSeverity: 0,
        symptomCount: 0,
      };
      existing.exerciseMinutes += log.duration;
      weeklyData.set(week, existing);
    });

    symptomLogs.forEach((log) => {
      const week = this.getWeekKey(log.loggedAt);
      const existing = weeklyData.get(week) || {
        exerciseMinutes: 0,
        avgSeverity: 0,
        symptomCount: 0,
      };
      existing.avgSeverity += log.severity;
      existing.symptomCount += 1;
      weeklyData.set(week, existing);
    });

    const paired = Array.from(weeklyData.values())
      .filter((d) => d.exerciseMinutes > 0 && d.symptomCount > 0)
      .map((d) => ({
        exercise: d.exerciseMinutes,
        severity: d.avgSeverity / d.symptomCount,
      }));

    if (paired.length < 2) return 0;

    return -this.pearsonCorrelation(
      paired.map((d) => d.exercise),
      paired.map((d) => d.severity)
    );
  }

  /**
   * Calculate correlation between sleep and exercise
   */
  private calculateSleepExerciseCorrelation(sleepLogs: any[], exerciseLogs: any[]): number {
    if (sleepLogs.length === 0 || exerciseLogs.length === 0) return 0;

    const dailyData = new Map<string, { sleepHours?: number; exerciseMinutes?: number }>();

    sleepLogs.forEach((log) => {
      const date = log.logDate.toISOString().split('T')[0];
      dailyData.set(date, { ...dailyData.get(date), sleepHours: log.hoursSlept });
    });

    exerciseLogs.forEach((log) => {
      const date = log.loggedAt.toISOString().split('T')[0];
      const existing = dailyData.get(date) || {};
      existing.exerciseMinutes = (existing.exerciseMinutes || 0) + log.duration;
      dailyData.set(date, existing);
    });

    const paired = Array.from(dailyData.values()).filter(
      (d) => d.sleepHours !== undefined && d.exerciseMinutes !== undefined
    );

    if (paired.length < 3) return 0;

    return this.pearsonCorrelation(
      paired.map((d) => d.sleepHours!),
      paired.map((d) => d.exerciseMinutes!)
    );
  }

  /**
   * Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return parseFloat((numerator / denominator).toFixed(3));
  }

  /**
   * Analyze exercise mood pattern
   */
  private analyzeExerciseMoodPattern(exerciseLogs: any[]) {
    const logsWithMood = exerciseLogs.filter((log) => log.mood);

    if (logsWithMood.length < 3) {
      return { positive: false, confidence: 0 };
    }

    const moodScores = {
      VERY_POOR: 1,
      POOR: 2,
      NEUTRAL: 3,
      GOOD: 4,
      VERY_GOOD: 5,
    };

    const avgMoodScore =
      logsWithMood.reduce((sum, log) => sum + (moodScores[log.mood as keyof typeof moodScores] || 3), 0) /
      logsWithMood.length;

    return {
      positive: avgMoodScore >= 3.5,
      confidence: Math.min(((avgMoodScore - 3) / 2) * 100, 100),
    };
  }

  /**
   * Analyze sleep consistency
   */
  private analyzeSleepConsistency(sleepLogs: any[]) {
    if (sleepLogs.length < 3) {
      return { isConsistent: false, score: 0 };
    }

    const bedtimes = sleepLogs.map((log) =>
      log.bedtime.getHours() + log.bedtime.getMinutes() / 60
    );

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const variance =
      bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
    const stdDev = Math.sqrt(variance);

    const consistencyScore = Math.max(0, 100 - stdDev * 20);

    return {
      isConsistent: consistencyScore >= 70,
      score: parseFloat(consistencyScore.toFixed(2)),
    };
  }

  /**
   * Analyze exercise impact on symptoms
   */
  private analyzeExerciseImpact(symptomLogs: any[], exerciseLogs: any[]) {
    // Compare weeks with exercise vs without
    const weeklyData = new Map<
      string,
      { hasExercise: boolean; symptoms: number[]; avgSeverity: number }
    >();

    exerciseLogs.forEach((log) => {
      const week = this.getWeekKey(log.loggedAt);
      const existing = weeklyData.get(week) || {
        hasExercise: false,
        symptoms: [],
        avgSeverity: 0,
      };
      existing.hasExercise = true;
      weeklyData.set(week, existing);
    });

    symptomLogs.forEach((log) => {
      const week = this.getWeekKey(log.loggedAt);
      const existing = weeklyData.get(week) || {
        hasExercise: false,
        symptoms: [],
        avgSeverity: 0,
      };
      existing.symptoms.push(log.severity);
      weeklyData.set(week, existing);
    });

    // Calculate averages
    weeklyData.forEach((data) => {
      if (data.symptoms.length > 0) {
        data.avgSeverity = data.symptoms.reduce((a, b) => a + b, 0) / data.symptoms.length;
      }
    });

    const weeksWithExercise = Array.from(weeklyData.values()).filter(
      (d) => d.hasExercise && d.avgSeverity > 0
    );
    const weeksWithoutExercise = Array.from(weeklyData.values()).filter(
      (d) => !d.hasExercise && d.avgSeverity > 0
    );

    if (weeksWithExercise.length < 1 || weeksWithoutExercise.length < 1) {
      return { hasPositiveImpact: false, confidence: 0 };
    }

    const avgWithExercise =
      weeksWithExercise.reduce((sum, d) => sum + d.avgSeverity, 0) / weeksWithExercise.length;
    const avgWithoutExercise =
      weeksWithoutExercise.reduce((sum, d) => sum + d.avgSeverity, 0) /
      weeksWithoutExercise.length;

    const improvement = ((avgWithoutExercise - avgWithExercise) / avgWithoutExercise) * 100;

    return {
      hasPositiveImpact: improvement > 10,
      confidence: Math.min(Math.abs(improvement), 100),
    };
  }

  /**
   * Analyze weekday vs weekend patterns
   */
  private analyzeWeekdayPattern(symptomLogs: any[], sleepLogs: any[], exerciseLogs: any[]) {
    const weekdayData = { symptoms: [] as number[], sleep: [] as number[], exercise: 0 };
    const weekendData = { symptoms: [] as number[], sleep: [] as number[], exercise: 0 };

    symptomLogs.forEach((log) => {
      const isWeekend = [0, 6].includes(log.loggedAt.getDay());
      (isWeekend ? weekendData : weekdayData).symptoms.push(log.severity);
    });

    sleepLogs.forEach((log) => {
      const isWeekend = [0, 6].includes(log.logDate.getDay());
      (isWeekend ? weekendData : weekdayData).sleep.push(log.hoursSlept);
    });

    exerciseLogs.forEach((log) => {
      const isWeekend = [0, 6].includes(log.loggedAt.getDay());
      (isWeekend ? weekendData : weekdayData).exercise += log.duration;
    });

    // Check for significant differences
    const sleepDiff =
      weekendData.sleep.length > 0 && weekdayData.sleep.length > 0
        ? (weekendData.sleep.reduce((a, b) => a + b, 0) / weekendData.sleep.length) -
          (weekdayData.sleep.reduce((a, b) => a + b, 0) / weekdayData.sleep.length)
        : 0;

    if (Math.abs(sleepDiff) > 1) {
      return {
        significantDifference: true,
        description:
          sleepDiff > 0
            ? 'Getting more sleep on weekends, suggesting weekday sleep debt'
            : 'Sleep is more consistent throughout the week',
        confidence: Math.min(Math.abs(sleepDiff) * 30, 100),
        recommendation:
          sleepDiff > 0
            ? 'Try to maintain weekend sleep schedule during weekdays'
            : 'Great job maintaining consistent sleep!',
      };
    }

    return { significantDifference: false, description: '', confidence: 0, recommendation: '' };
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(symptomSummary: any, sleepMetrics: any, exerciseStats: any): number {
    let score = 100;

    // Symptom impact (0-40 points)
    if (symptomSummary.averageSeverity > 0) {
      const symptomPenalty = (symptomSummary.averageSeverity / 10) * 40;
      score -= symptomPenalty;
    }

    // Sleep impact (0-30 points)
    if (sleepMetrics.averageHoursSlept > 0) {
      const sleepOptimal = 8;
      const sleepDeviation = Math.abs(sleepMetrics.averageHoursSlept - sleepOptimal);
      const sleepPenalty = Math.min(sleepDeviation * 5, 30);
      score -= sleepPenalty;

      // Quality bonus/penalty
      const qualityBonus = ((sleepMetrics.averageQuality - 3) / 2) * 10;
      score += qualityBonus;
    }

    // Exercise impact (0-30 points)
    const weeklyExerciseGoal = 150; // minutes per week
    const daysInPeriod =
      exerciseStats.totalMinutes > 0 ? Math.max(exerciseStats.activeDays * 7, 7) : 7;
    const weeklyAvg = (exerciseStats.totalMinutes / daysInPeriod) * 7;
    const exerciseScore = Math.min((weeklyAvg / weeklyExerciseGoal) * 30, 30);
    score += exerciseScore - 30; // Start at 0 and add up to 30

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate insights based on analysis
   */
  private generateInsights(
    correlations: CorrelationData[],
    patterns: Pattern[],
    healthScore: number
  ): string[] {
    const insights: string[] = [];

    // Health score insight
    if (healthScore >= 80) {
      insights.push('Excellent overall health metrics! Keep up the great work.');
    } else if (healthScore >= 60) {
      insights.push('Good progress, with room for improvement in some areas.');
    } else {
      insights.push('Several areas could benefit from attention and improvement.');
    }

    // Add pattern insights
    patterns.forEach((pattern) => {
      if (pattern.confidence >= 60 && pattern.recommendation) {
        insights.push(pattern.recommendation);
      }
    });

    // Add correlation insights
    correlations.forEach((corr) => {
      if (Math.abs(corr.correlation) >= 0.5) {
        insights.push(corr.description);
      }
    });

    return insights;
  }

  /**
   * Helper: Get correlation strength label
   */
  private getCorrelationStrength(correlation: number): string {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'Strong';
    if (abs >= 0.4) return 'Moderate';
    if (abs >= 0.2) return 'Weak';
    return 'None';
  }

  /**
   * Helper: Get correlation description
   */
  private getCorrelationDescription(
    metric1: string,
    metric2: string,
    correlation: number
  ): string {
    const strength = this.getCorrelationStrength(correlation).toLowerCase();
    const direction = correlation > 0 ? 'positive' : 'negative';

    if (strength === 'none') {
      return `No significant correlation found between ${metric1} and ${metric2}`;
    }

    return `${strength.charAt(0).toUpperCase() + strength.slice(1)} ${direction} correlation between ${metric1} and ${metric2}`;
  }

  /**
   * Helper: Get week key for grouping
   */
  private getWeekKey(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const weekStart = new Date(d.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  /**
   * Generate progress report (PDF-ready data)
   */
  async generateProgressReport(clientId: string, dateRange: DateRange) {
    const analytics = await this.getCombinedAnalytics(clientId, dateRange);

    // Get client info
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return {
      client,
      reportDate: new Date(),
      period: analytics.period,
      summary: {
        healthScore: analytics.healthScore,
        totalSymptomLogs: analytics.symptoms.totalLogs,
        totalSleepLogs: analytics.sleep.totalNights,
        totalExerciseSessions: analytics.exercise.totalSessions,
      },
      symptoms: analytics.symptoms,
      sleep: analytics.sleep,
      exercise: analytics.exercise,
      correlations: analytics.correlations,
      patterns: analytics.patterns,
      insights: analytics.insights,
    };
  }

  /**
   * Compare actual metrics to goals
   */
  async compareToGoals(clientId: string, dateRange: DateRange) {
    const analytics = await this.getCombinedAnalytics(clientId, dateRange);

    // Default goals (these could be stored per client in future)
    const goals = {
      sleep: {
        targetHoursPerNight: 8,
        targetQuality: 4,
        maxSleepDebt: 5,
      },
      exercise: {
        targetMinutesPerWeek: 150,
        targetSessionsPerWeek: 3,
      },
      symptoms: {
        targetMaxSeverity: 3,
        targetAverageSeverity: 2,
      },
    };

    const daysInPeriod = analytics.period.days;
    const weeksInPeriod = daysInPeriod / 7;

    return {
      sleep: {
        hoursPerNight: {
          actual: analytics.sleep.averageHoursSlept,
          target: goals.sleep.targetHoursPerNight,
          met: Math.abs(analytics.sleep.averageHoursSlept - goals.sleep.targetHoursPerNight) <= 0.5,
        },
        quality: {
          actual: analytics.sleep.averageQuality,
          target: goals.sleep.targetQuality,
          met: analytics.sleep.averageQuality >= goals.sleep.targetQuality,
        },
        sleepDebt: {
          actual: analytics.sleep.sleepDebt,
          target: goals.sleep.maxSleepDebt,
          met: analytics.sleep.sleepDebt <= goals.sleep.maxSleepDebt,
        },
      },
      exercise: {
        minutesPerWeek: {
          actual: (analytics.exercise.totalMinutes / weeksInPeriod).toFixed(0),
          target: goals.exercise.targetMinutesPerWeek,
          met: analytics.exercise.totalMinutes / weeksInPeriod >= goals.exercise.targetMinutesPerWeek,
        },
        sessionsPerWeek: {
          actual: (analytics.exercise.totalSessions / weeksInPeriod).toFixed(1),
          target: goals.exercise.targetSessionsPerWeek,
          met: analytics.exercise.totalSessions / weeksInPeriod >= goals.exercise.targetSessionsPerWeek,
        },
      },
      symptoms: {
        averageSeverity: {
          actual: analytics.symptoms.averageSeverity,
          target: goals.symptoms.targetAverageSeverity,
          met: analytics.symptoms.averageSeverity <= goals.symptoms.targetAverageSeverity,
        },
      },
      overallGoalsMet: 0, // Calculated below
    };
  }

  /**
   * Phase 3.2: Get clinician notes for a client (signed notes only)
   */
  async getClinicianNotesForClient(
    clientId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ) {
    const { startDate, endDate, limit = 20 } = options;

    const where: Prisma.ClinicalNoteWhereInput = {
      clientId,
      status: { in: ['SIGNED', 'COSIGNED', 'LOCKED'] },
    };

    if (startDate && endDate) {
      where.sessionDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    return prisma.clinicalNote.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      take: limit,
      select: {
        id: true,
        noteType: true,
        sessionDate: true,
        assessment: true,
        plan: true,
        progressTowardGoals: true,
        createdAt: true,
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Phase 3.2: Create a progress observation note
   */
  async createProgressNote(
    clientId: string,
    clinicianId: string,
    content: string
  ) {
    return prisma.clinicalNote.create({
      data: {
        clientId,
        clinicianId,
        noteType: 'PROGRESS_OBSERVATION',
        sessionDate: new Date(),
        progressTowardGoals: content.trim(),
        status: 'SIGNED',
        signedDate: new Date(),
        signedBy: clinicianId,
        lastModifiedBy: clinicianId,
      },
    });
  }

  /**
   * Phase 3.2: Get user (clinician) info by ID
   */
  async getClinicianInfo(clinicianId: string) {
    return prisma.user.findUnique({
      where: { id: clinicianId },
      select: { id: true, firstName: true, lastName: true },
    });
  }
}

export default new ProgressAnalyticsService();
