// Metric Calculator Types for Productivity Module
// Phase 6 - Week 18

export interface MetricResult {
  value: number;
  metadata?: {
    numerator?: number;
    denominator?: number;
    [key: string]: any;
  };
}

export interface MetricCalculator {
  metricType: string;
  calculate(
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult>;
}

export interface MetricThreshold {
  benchmark: number;
  alertThreshold: number;
  inverted?: boolean; // For metrics where lower is better (e.g., No-Show Rate)
}

export const METRIC_THRESHOLDS: Record<string, MetricThreshold> = {
  KVR: {
    benchmark: 85,
    alertThreshold: 80,
    inverted: false,
  },
  NO_SHOW_RATE: {
    benchmark: 10,
    alertThreshold: 15,
    inverted: true, // Lower is better
  },
  CANCELLATION_RATE: {
    benchmark: 15,
    alertThreshold: 20,
    inverted: true,
  },
  REBOOK_RATE: {
    benchmark: 75,
    alertThreshold: 65,
    inverted: false,
  },
  SESSIONS_PER_DAY: {
    benchmark: 6, // Middle of 5-7 range
    alertThreshold: 4, // Alert if <4 or >8
    inverted: false,
  },
  SAME_DAY_DOCUMENTATION_RATE: {
    benchmark: 90,
    alertThreshold: 80,
    inverted: false,
  },
  AVG_DOCUMENTATION_TIME: {
    benchmark: 24, // hours
    alertThreshold: 48,
    inverted: true,
  },
  TREATMENT_PLAN_CURRENCY: {
    benchmark: 100,
    alertThreshold: 95,
    inverted: false,
  },
  UNSIGNED_NOTE_BACKLOG: {
    benchmark: 0,
    alertThreshold: 5,
    inverted: true,
  },
  CLIENT_RETENTION_RATE_90_DAYS: {
    benchmark: 70,
    alertThreshold: 60,
    inverted: false,
  },
  CRISIS_INTERVENTION_RATE: {
    benchmark: 5,
    alertThreshold: 10,
    inverted: true,
  },
  SAFETY_PLAN_COMPLIANCE: {
    benchmark: 100,
    alertThreshold: 100,
    inverted: false,
  },
  CHARGE_ENTRY_LAG: {
    benchmark: 1, // days
    alertThreshold: 3,
    inverted: true,
  },
  BILLING_COMPLIANCE_RATE: {
    benchmark: 100,
    alertThreshold: 95,
    inverted: false,
  },
  CLAIM_ACCEPTANCE_RATE: {
    benchmark: 95,
    alertThreshold: 90,
    inverted: false,
  },
  SCHEDULE_FILL_RATE: {
    benchmark: 85,
    alertThreshold: 75,
    inverted: false,
  },
  PRIME_TIME_UTILIZATION: {
    benchmark: 90,
    alertThreshold: 80,
    inverted: false,
  },
};

export function shouldTriggerAlert(
  metricType: string,
  value: number
): boolean {
  const threshold = METRIC_THRESHOLDS[metricType];
  if (!threshold) return false;

  if (threshold.inverted) {
    // For metrics where lower is better (e.g., No-Show Rate)
    return value > threshold.alertThreshold;
  } else {
    // For metrics where higher is better (e.g., KVR)
    return value < threshold.alertThreshold;
  }
}

export function getMetricStatus(
  metricType: string,
  value: number
): 'success' | 'warning' | 'danger' {
  const threshold = METRIC_THRESHOLDS[metricType];
  if (!threshold) return 'warning';

  if (threshold.inverted) {
    // Lower is better
    if (value <= threshold.benchmark) return 'success';
    if (value <= threshold.alertThreshold) return 'warning';
    return 'danger';
  } else {
    // Higher is better
    if (value >= threshold.benchmark) return 'success';
    if (value >= threshold.alertThreshold) return 'warning';
    return 'danger';
  }
}
