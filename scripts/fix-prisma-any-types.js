#!/usr/bin/env node
/**
 * Script to fix Prisma-related `any` type patterns
 * Replaces common patterns with proper Prisma types
 */

const fs = require('fs');
const path = require('path');

const srcDir = 'packages/backend/src';

const skipPatterns = [
  'node_modules',
  '.test.ts',
  '__tests__',
  '.d.ts',
];

function shouldSkip(filePath) {
  return skipPatterns.some(pattern => filePath.includes(pattern));
}

function getAllTsFiles(dir) {
  const files = [];
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (shouldSkip(fullPath)) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

// Model name mappings for Prisma types
const modelMappings = {
  'user': 'User',
  'client': 'Client',
  'appointment': 'Appointment',
  'clinicalNote': 'ClinicalNote',
  'billing': 'Billing',
  'insurance': 'InsuranceInformation',
  'guardian': 'Guardian',
  'crisis': 'CrisisResource',
  'exercise': 'ExerciseTracking',
  'sleep': 'SleepTracking',
  'symptom': 'SymptomTracking',
  'outcome': 'OutcomeMeasure',
  'training': 'Training',
  'report': 'ReportSchedule',
  'scheduling': 'SchedulingRule',
  'assessment': 'Assessment',
};

function inferModelFromContext(content, lineIndex, lines) {
  // Look for prisma.modelName patterns nearby
  const searchRange = 20;
  const startLine = Math.max(0, lineIndex - searchRange);
  const endLine = Math.min(lines.length, lineIndex + searchRange);

  for (let i = startLine; i < endLine; i++) {
    const line = lines[i];
    const match = line.match(/prisma\.(\w+)\./);
    if (match) {
      const modelName = match[1];
      // Capitalize first letter
      return modelName.charAt(0).toUpperCase() + modelName.slice(1);
    }
  }
  return null;
}

function fixPrismaAnyTypes(content, filePath) {
  const lines = content.split('\n');
  let modified = false;
  let hasPrismaImport = content.includes("from '@mentalspace/database'") ||
                        content.includes('from "@mentalspace/database"');
  let needsPrismaImport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fix: const where: any = {} or const where: any = {
    if (line.match(/const\s+(where|filters?|filter|updateData|dateFilter)\s*:\s*any\s*=\s*\{/)) {
      const varName = line.match(/const\s+(\w+)\s*:/)[1];
      const model = inferModelFromContext(content, i, lines);

      if (model) {
        let prismaType;
        if (varName === 'where' || varName.includes('filter') || varName.includes('Filter')) {
          prismaType = `Prisma.${model}WhereInput`;
        } else if (varName === 'updateData') {
          prismaType = `Prisma.${model}UpdateInput`;
        } else {
          prismaType = `Prisma.${model}WhereInput`;
        }

        lines[i] = line.replace(/:\s*any\s*=/, `: ${prismaType} =`);
        modified = true;
        needsPrismaImport = true;
      }
    }

    // Fix: let dateFilter: any = {}
    if (line.match(/let\s+(where|filters?|filter|updateData|dateFilter)\s*:\s*any\s*=\s*\{/)) {
      const varName = line.match(/let\s+(\w+)\s*:/)[1];
      const model = inferModelFromContext(content, i, lines);

      if (model) {
        let prismaType = `Prisma.${model}WhereInput`;
        lines[i] = line.replace(/:\s*any\s*=/, `: ${prismaType} =`);
        modified = true;
        needsPrismaImport = true;
      }
    }
  }

  // Add Prisma import if needed
  if (modified && needsPrismaImport && !content.includes('Prisma')) {
    // Find the database import line and add Prisma
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("from '@mentalspace/database'") || lines[i].includes('from "@mentalspace/database"')) {
        if (!lines[i].includes('Prisma')) {
          // Add Prisma to the import
          if (lines[i].includes('{ ')) {
            lines[i] = lines[i].replace('{ ', '{ Prisma, ');
          } else {
            // It's a default import or different format, skip
          }
        }
        break;
      }
    }
  }

  return { content: lines.join('\n'), modified };
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const result = fixPrismaAnyTypes(content, filePath);

  if (result.modified) {
    fs.writeFileSync(filePath, result.content, 'utf8');
    return true;
  }
  return false;
}

// Main
let totalFixed = 0;

if (!fs.existsSync(srcDir)) {
  console.log(`Directory not found: ${srcDir}`);
  process.exit(1);
}

const files = getAllTsFiles(srcDir);
console.log(`Processing ${files.length} files...`);

for (const file of files) {
  if (processFile(file)) {
    console.log(`Fixed: ${file}`);
    totalFixed++;
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
