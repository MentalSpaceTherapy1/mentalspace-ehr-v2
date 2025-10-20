#!/usr/bin/env node
/**
 * HIPAA Compliance Fix: Replace console.error/log calls with sanitized logging
 * This script automatically fixes PHI exposure risks in backend controllers and services
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'packages/backend/src/controllers/clinicalNote.controller.ts',
  'packages/backend/src/controllers/appointment.controller.ts',
  'packages/backend/src/controllers/clinicianSchedule.controller.ts',
  'packages/backend/src/controllers/waitlist.controller.ts',
  'packages/backend/src/controllers/reminder.controller.ts',
  'packages/backend/src/controllers/portal/documents.controller.ts',
  'packages/backend/src/controllers/guardian.controller.ts',
  'packages/backend/src/controllers/emergencyContact.controller.ts',
  'packages/backend/src/controllers/reports.controller.ts',
  'packages/backend/src/controllers/insurance.controller.ts',
  'packages/backend/src/controllers/billing.controller.ts',
  'packages/backend/src/services/compliance.service.ts',
  'packages/backend/src/services/reminder.service.ts',
  'packages/backend/src/services/email.service.ts',
  'packages/backend/src/services/portal/auth.service.ts',
  'packages/backend/src/services/ai/clinicalNoteGeneration.service.ts',
  'packages/backend/src/services/ai/treatmentSuggestions.service.ts',
  'packages/backend/src/services/ai/anthropic.service.ts',
  'packages/backend/src/services/ai/billingIntelligence.service.ts',
  'packages/backend/src/services/ai/diagnosisAssistance.service.ts',
  'packages/backend/src/services/practiceSettings.service.ts',
  'packages/backend/src/services/chime.service.ts',
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} (not found)`);
    return { fixed: false, reason: 'not found' };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Check if logControllerError is already imported
  const hasLogControllerError = content.includes('logControllerError');

  // Add import if needed
  if (!hasLogControllerError && /console\.(error|log|warn)/.test(content)) {
    // Find the logger import line
    const loggerImportMatch = content.match(/import logger from ['"].*logger['"]/);
    if (loggerImportMatch) {
      content = content.replace(
        loggerImportMatch[0],
        loggerImportMatch[0].replace('import logger', 'import logger, { logControllerError }')
      );
    } else {
      // Add new import at the top
      const firstImportMatch = content.match(/^import .*$/m);
      if (firstImportMatch) {
        content = content.replace(
          firstImportMatch[0],
          `import logger, { logControllerError } from '../utils/logger';\n${firstImportMatch[0]}`
        );
      }
    }
  }

  // Replace console.error patterns in catch blocks
  // Pattern 1: console.error('message:', error); followed by res.status...json with errors: [error]
  content = content.replace(
    /console\.(error|log|warn)\(['"](.*?error.*?)['"],\s*error\);[\s\S]*?res\.status\((\d+)\)\.json\(\{[\s\S]*?errors:\s*\[error\]/g,
    (match, method, message, statusCode) => {
      // Extract context and build replacement
      const contextMsg = message.replace(/ error:?$/i, '').trim();
      return match
        .replace(/console\.(error|log|warn)\(['"](.*?)['"],\s*error\);/,
          `const errorId = logControllerError('${contextMsg}', error, {\n      userId: (req as any).user?.userId,\n    });`)
        .replace(/errors:\s*\[error\]/, 'errorId');
    }
  );

  // Pattern 2: Standalone console.error in services (just log, no response)
  content = content.replace(
    /console\.(error|log)\(['"](.*?)['"],\s*error\);/g,
    (match, method, message) => {
      return `logger.error('${message}', { errorType: error instanceof Error ? error.constructor.name : typeof error });`;
    }
  );

  // Pattern 3: console.log/warn that might expose PHI
  content = content.replace(
    /console\.(log|warn)\(/g,
    'logger.$1('
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    return { fixed: true, reason: 'updated' };
  }

  return { fixed: false, reason: 'no changes needed' };
}

console.log('🔒 HIPAA Compliance Fix: Sanitizing error logging\n');

let fixedCount = 0;
let skippedCount = 0;
let unchangedCount = 0;

filesToFix.forEach(filePath => {
  const result = fixFile(filePath);
  if (result.fixed) {
    console.log(`✅ Fixed: ${filePath}`);
    fixedCount++;
  } else if (result.reason === 'not found') {
    console.log(`⚠️  Skipped: ${filePath} (${result.reason})`);
    skippedCount++;
  } else {
    unchangedCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Fixed: ${fixedCount} files`);
console.log(`   Unchanged: ${unchangedCount} files`);
console.log(`   Skipped: ${skippedCount} files`);
console.log(`\n✅ HIPAA compliance fix complete!`);
