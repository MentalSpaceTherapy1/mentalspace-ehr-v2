/**
 * AdvancedMD API Configuration
 * Based on integration requirements and rate limits
 *
 * Central configuration module for all AdvancedMD services.
 * Loads from multiple possible .env locations for flexibility.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from multiple possible locations
// Priority order: backend/.env, root/.env, database/.env
const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'), // packages/backend/.env
  path.resolve(__dirname, '../../../../.env'), // root .env
  path.resolve(__dirname, '../../../database/.env'), // packages/database/.env
];

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export const advancedMDConfig = {
  // Environment-specific settings
  // Supports both old naming (ADVANCEDMD_*) and new naming (AMD_*)
  sandbox: {
    baseUrl: process.env.ADVANCEDMD_SANDBOX_URL || '',
    officeKey: process.env.ADVANCEDMD_SANDBOX_OFFICE_KEY || process.env.AMD_OFFICE_KEY || '',
    username: process.env.ADVANCEDMD_SANDBOX_USERNAME || process.env.AMD_PARTNER_USERNAME || '',
    password: process.env.ADVANCEDMD_SANDBOX_PASSWORD || process.env.AMD_PARTNER_PASSWORD || '',
    clientId: process.env.ADVANCEDMD_SANDBOX_CLIENT_ID || '',
    clientSecret: process.env.ADVANCEDMD_SANDBOX_CLIENT_SECRET || '',
  },
  production: {
    baseUrl: process.env.ADVANCEDMD_PROD_URL || '',
    officeKey: process.env.ADVANCEDMD_PROD_OFFICE_KEY || process.env.AMD_OFFICE_KEY || '',
    username: process.env.ADVANCEDMD_PROD_USERNAME || process.env.AMD_PARTNER_USERNAME || '',
    password: process.env.ADVANCEDMD_PROD_PASSWORD || process.env.AMD_PARTNER_PASSWORD || '',
    clientId: process.env.ADVANCEDMD_PROD_CLIENT_ID || '',
    clientSecret: process.env.ADVANCEDMD_PROD_CLIENT_SECRET || '',
  },

  // Rate limits based on AdvancedMD documentation
  rateLimits: {
    // Peak hours: 6:00 AM - 6:00 PM Mountain Time, Monday-Friday
    peakHours: {
      start: 6, // 6 AM MT
      end: 18, // 6 PM MT
      timezone: 'America/Denver', // Mountain Time
    },

    // Tier 1 - High Impact Calls (GETUPDATEDVISITS, GETUPDATEDPATIENTS)
    tier1: {
      peak: {
        callsPerMinute: 1,
        callsPerHour: 60,
      },
      offPeak: {
        callsPerMinute: 60,
        callsPerHour: 3600,
      },
      endpoints: [
        'GETUPDATEDVISITS',
        'GETUPDATEDPATIENTS',
      ],
    },

    // Tier 2 - Medium Impact Calls
    tier2: {
      peak: {
        callsPerMinute: 12,
        callsPerHour: 720,
      },
      offPeak: {
        callsPerMinute: 120,
        callsPerHour: 7200,
      },
      endpoints: [
        'SAVECHARGES',
        'GETDEMOGRAPHIC',
        'GETDATEVISITS',
        'UPDVISITWITHNEWCHARGES',
        'GETTXHISTORY',
        'GETAPPTS',
        'GETPAYMENTDETAILDATA',
      ],
    },

    // Tier 3 - Low Impact Calls (all LOOKUP APIs)
    tier3: {
      peak: {
        callsPerMinute: 24,
        callsPerHour: 1440,
      },
      offPeak: {
        callsPerMinute: 120,
        callsPerHour: 7200,
      },
      endpoints: [
        'LOOKUP',
        // All lookup endpoints
      ],
    },
  },

  // Token management
  token: {
    refreshInterval: 23 * 60 * 60 * 1000, // 23 hours (tokens expire every 24 hours)
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // API features and capabilities
  features: {
    eligibility: {
      enabled: true,
      responseTime: 30000, // 30 seconds max
      successRate: 99.9,
      cacheTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    },
    claims: {
      submission: true,
      batchSubmission: true,
      maxBatchSize: 100, // To be confirmed with AdvancedMD
      acceptanceRate: 99.5, // Guaranteed by AdvancedMD
      clearinghouse: 'Waystar', // or 'Change'
    },
    webhooks: {
      enabled: false, // AdvancedMD does not support webhooks
    },
    era: {
      enabled: false, // Not available via API, UI only
    },
    reporting: {
      enabled: true,
      viaUI: true, // Most reporting is UI-based
      viaODBC: true, // Can use ODBC for data export
      maxDateRange: 24, // months
    },
  },

  // Clearinghouse configuration
  clearinghouse: {
    name: 'Waystar',
    acceptanceRate: 99.5,
    directConnections: true,
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 10000,
  },

  // Timeout configuration
  timeout: {
    eligibility: 35000, // 35 seconds (30s + 5s buffer)
    claim: 10000, // 10 seconds
    patient: 5000, // 5 seconds
    default: 30000, // 30 seconds
  },

  // IP Whitelist (if needed)
  security: {
    ipWhitelistEnabled: true,
    allowedIPs: process.env.ADVANCEDMD_ALLOWED_IPS?.split(',') || [],
  },
};

/**
 * Get current environment configuration
 */
export const getAdvancedMDConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? advancedMDConfig.production : advancedMDConfig.sandbox;
};

/**
 * Check if current time is within peak hours (Mountain Time)
 */
export const isPeakHours = (): boolean => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: advancedMDConfig.rateLimits.peakHours.timezone,
    hour: 'numeric',
    weekday: 'short',
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);

  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const weekday = parts.find(p => p.type === 'weekday')?.value || '';

  const isWeekday = !['Sat', 'Sun'].includes(weekday);
  const isInPeakHourRange = hour >= advancedMDConfig.rateLimits.peakHours.start &&
                            hour < advancedMDConfig.rateLimits.peakHours.end;

  return isWeekday && isInPeakHourRange;
};

/**
 * Get rate limit for a specific endpoint
 */
export const getRateLimitForEndpoint = (endpoint: string): { callsPerMinute: number; callsPerHour: number } => {
  const limits = advancedMDConfig.rateLimits;
  const peak = isPeakHours();

  // Check Tier 1
  if (limits.tier1.endpoints.some(e => endpoint.includes(e))) {
    return peak ? limits.tier1.peak : limits.tier1.offPeak;
  }

  // Check Tier 2
  if (limits.tier2.endpoints.some(e => endpoint.includes(e))) {
    return peak ? limits.tier2.peak : limits.tier2.offPeak;
  }

  // Default to Tier 3 (Low Impact)
  return peak ? limits.tier3.peak : limits.tier3.offPeak;
};
