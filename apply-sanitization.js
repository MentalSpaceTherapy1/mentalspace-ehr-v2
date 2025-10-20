#!/usr/bin/env node
/**
 * Security Fix: Apply input sanitization to search queries
 * Prevents SQL injection attacks in search functionality
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'packages/backend/src/controllers/appointment.controller.ts',
  'packages/backend/src/controllers/clinicalNote.controller.ts',
];

function applyInputSanitization(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping ${filePath} (not found)`);
    return { fixed: false };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Add import if not already present
  if (!content.includes('sanitizeSearchInput') && content.includes('{ contains:')) {
    // Find the import section
    const importMatch = content.match(/(import.*from ['"]\.\.\/utils\/logger['"];)/);
    if (importMatch) {
      content = content.replace(
        importMatch[0],
        `${importMatch[0]}\nimport { sanitizeSearchInput, sanitizePagination } from '../utils/sanitize';`
      );
    }
  }

  // Pattern 1: Replace unsafe search contains
  content = content.replace(
    /\{\s*contains:\s*(search|req\.query\.search)\s+as\s+string,\s*mode:\s*['"]insensitive['"]\s*\}/g,
    '{ contains: sanitizeSearchInput($1 as string), mode: \'insensitive\' }'
  );

  // Pattern 2: Apply pagination sanitization
  content = content.replace(
    /const\s+pageNum\s*=\s*parseInt\(page as string\);\s*const\s+limitNum\s*=\s*parseInt\(limit as string\);\s*const\s+skip\s*=\s*\(pageNum - 1\) \* limitNum;/g,
    'const pagination = sanitizePagination(page, limit);\n    const { page: pageNum, limit: limitNum, skip } = pagination;'
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    return { fixed: true };
  }

  return { fixed: false };
}

console.log('🔒 Applying input sanitization to controllers\n');

let fixedCount = 0;

filesToFix.forEach(filePath => {
  const result = applyInputSanitization(filePath);
  if (result.fixed) {
    console.log(`✅ Fixed: ${filePath}`);
    fixedCount++;
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
});

console.log(`\n📊 Summary: Fixed ${fixedCount} files`);
