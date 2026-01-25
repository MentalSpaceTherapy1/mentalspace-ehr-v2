#!/usr/bin/env node
/**
 * Script to fix common `any` type patterns in TypeScript files
 *
 * Patterns fixed:
 * 1. catch (error: any) -> catch (error: unknown) with type guard helper
 * 2. } catch (error: any) { -> } catch (error: unknown) {
 */

const fs = require('fs');
const path = require('path');

// Directories to process
const srcDirs = [
  'packages/backend/src',
];

// Files to skip
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
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function fixCatchErrorAny(content) {
  // Replace catch (error: any) with catch (error: unknown)
  // Also handles catch (err: any), catch (e: any), etc.
  return content
    .replace(/catch\s*\(\s*(\w+)\s*:\s*any\s*\)/g, 'catch ($1: unknown)')
    .replace(/catch\s*\(\s*(\w+)\s*:\s*any,/g, 'catch ($1: unknown,');
}

function fixFilterAnyTypes(content) {
  // These need manual review - just add comments for now
  return content;
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Apply fixes
  content = fixCatchErrorAny(content);

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

// Main
let totalFixed = 0;

for (const srcDir of srcDirs) {
  if (!fs.existsSync(srcDir)) {
    console.log(`Directory not found: ${srcDir}`);
    continue;
  }

  const files = getAllTsFiles(srcDir);
  console.log(`Processing ${files.length} files in ${srcDir}...`);

  for (const file of files) {
    if (processFile(file)) {
      console.log(`Fixed: ${file}`);
      totalFixed++;
    }
  }
}

console.log(`\nTotal files fixed: ${totalFixed}`);
