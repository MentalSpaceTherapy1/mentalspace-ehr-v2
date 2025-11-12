/**
 * Crisis Keyword Detection Configuration
 *
 * This configuration defines keywords and phrases that trigger crisis alerts
 * in the messaging system. Keywords are organized by severity level.
 *
 * IMPORTANT: This is a safety-critical system component.
 * Changes to these keywords should be reviewed by clinical staff.
 */

export enum CrisisSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
}

/**
 * CRITICAL severity keywords - immediate notification required
 * These indicate imminent risk of suicide or self-harm
 */
export const CRITICAL_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'plan to die',
  'suicide plan',
  'overdose',
  'take pills',
  'hang myself',
  'shoot myself',
  'jump off',
  'end it all',
  'planning to die',
  'ready to die',
  'going to kill',
  'tonight is the night',
  'goodbye forever',
  'final goodbye',
  'this is goodbye',
];

/**
 * HIGH severity keywords - urgent review needed
 * These indicate serious self-harm ideation or planning
 */
export const HIGH_KEYWORDS = [
  'self harm',
  'self-harm',
  'cut myself',
  'hurt myself',
  'harm myself',
  'suicidal thoughts',
  'better off dead',
  'wish i was dead',
  'wish i were dead',
  'thinking about dying',
  'thinking about suicide',
  'burn myself',
  'starve myself',
  'punish myself',
  'hate myself',
  'deserve to die',
  'everyone would be better',
  'burden to everyone',
];

/**
 * MEDIUM severity keywords - monitoring required
 * These indicate significant distress but less immediate risk
 */
export const MEDIUM_KEYWORDS = [
  'hopeless',
  'cant go on',
  "can't go on",
  'cannot go on',
  'no reason to live',
  'give up',
  'worthless',
  'no point in living',
  'no way out',
  'cant take it',
  "can't take it",
  'cannot take it',
  'unbearable',
  'too much pain',
  'want it to end',
  'want this to end',
  'everything is pointless',
  'life is meaningless',
  'no future',
  'no hope',
];

/**
 * All keywords grouped by severity level
 */
export const CRISIS_KEYWORDS_BY_SEVERITY = {
  [CrisisSeverity.CRITICAL]: CRITICAL_KEYWORDS,
  [CrisisSeverity.HIGH]: HIGH_KEYWORDS,
  [CrisisSeverity.MEDIUM]: MEDIUM_KEYWORDS,
};

/**
 * Get the highest severity level from a list of detected keywords
 */
export function getHighestSeverity(detectedKeywords: string[]): CrisisSeverity {
  // Check critical first
  if (detectedKeywords.some(kw => CRITICAL_KEYWORDS.includes(kw))) {
    return CrisisSeverity.CRITICAL;
  }

  // Then check high
  if (detectedKeywords.some(kw => HIGH_KEYWORDS.includes(kw))) {
    return CrisisSeverity.HIGH;
  }

  // Default to medium if any keywords detected
  return CrisisSeverity.MEDIUM;
}

/**
 * Configuration for crisis detection behavior
 */
export const CRISIS_DETECTION_CONFIG = {
  // Maximum length of message snippet to store
  maxSnippetLength: 200,

  // Whether to enable real-time notifications
  enableNotifications: true,

  // Notification settings by severity
  notificationSettings: {
    [CrisisSeverity.CRITICAL]: {
      notifyAssignedClinician: true,
      notifyAllAdmins: true,
      notifyImmediately: true,
    },
    [CrisisSeverity.HIGH]: {
      notifyAssignedClinician: true,
      notifyAllAdmins: true,
      notifyImmediately: true,
    },
    [CrisisSeverity.MEDIUM]: {
      notifyAssignedClinician: true,
      notifyAllAdmins: false,
      notifyImmediately: false,
    },
  },
};
