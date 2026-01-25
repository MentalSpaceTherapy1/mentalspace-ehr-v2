const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, '..', 'packages', 'backend', 'src', 'controllers');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file has catch blocks with error.message or similar patterns
  const hasErrorAccess = /catch\s*\([^)]*\)\s*\{[\s\S]*?error\.(message|code)/g.test(content);

  if (!hasErrorAccess) {
    return false;
  }

  // Add import if not already present
  const hasImport = content.includes("from '../utils/errorHelpers'") ||
                    content.includes("from '../../utils/errorHelpers'");

  // Find the right import path based on file location
  const relativePath = path.relative(path.dirname(filePath), controllersDir);
  const depth = relativePath.split(path.sep).filter(p => p === '..').length;

  let importPath;
  if (depth === 0) {
    importPath = '../utils/errorHelpers';
  } else if (depth === 1) {
    importPath = '../../utils/errorHelpers';
  } else {
    importPath = '../'.repeat(depth) + 'utils/errorHelpers';
  }

  if (!hasImport) {
    // Add import after the last import statement
    const importRegex = /^(import .+ from .+;?\n)+/m;
    const match = content.match(importRegex);
    if (match) {
      const lastImportEnd = match.index + match[0].length;
      const importStatement = `import { getErrorMessage, getErrorCode, getErrorName, getErrorStack, getErrorStatusCode } from '${importPath}';\n`;
      content = content.slice(0, lastImportEnd) + importStatement + content.slice(lastImportEnd);
      modified = true;
    }
  } else {
    // Update existing import to include all helpers
    const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*errorHelpers)['"]/);
    if (importMatch) {
      const currentImports = importMatch[1].split(',').map(s => s.trim());
      const allImports = ['getErrorMessage', 'getErrorCode', 'getErrorName', 'getErrorStack', 'getErrorStatusCode'];
      const newImports = [...new Set([...currentImports, ...allImports.filter(i => !currentImports.includes(i))])];
      const newImportStatement = `import { ${newImports.join(', ')} } from '${importMatch[2]}'`;
      content = content.replace(importMatch[0], newImportStatement);
      modified = true;
    }
  }

  // Replace error.message with getErrorMessage(error)
  const messagePattern = /(?<!getErrorMessage\()error\.message/g;
  if (messagePattern.test(content)) {
    content = content.replace(messagePattern, 'getErrorMessage(error)');
    modified = true;
  }

  // Replace error.code with getErrorCode(error) but be careful with Prisma error codes
  const codePattern = /(?<!getErrorCode\()error\.code(?!\s*===\s*['"]P\d)/g;
  if (codePattern.test(content)) {
    content = content.replace(codePattern, 'getErrorCode(error)');
    modified = true;
  }

  // Replace error.name with getErrorName(error)
  const namePattern = /(?<!getErrorName\()error\.name/g;
  if (namePattern.test(content)) {
    content = content.replace(namePattern, 'getErrorName(error)');
    modified = true;
  }

  // Replace error.stack with getErrorStack(error)
  const stackPattern = /(?<!getErrorStack\()error\.stack/g;
  if (stackPattern.test(content)) {
    content = content.replace(stackPattern, 'getErrorStack(error)');
    modified = true;
  }

  // Replace error.statusCode with getErrorStatusCode(error)
  const statusCodePattern = /(?<!getErrorStatusCode\()error\.statusCode/g;
  if (statusCodePattern.test(content)) {
    content = content.replace(statusCodePattern, 'getErrorStatusCode(error)');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      callback(filePath);
    }
  });
}

let count = 0;
walkDir(controllersDir, (filePath) => {
  if (processFile(filePath)) {
    console.log('Fixed:', filePath);
    count++;
  }
});

console.log(`\nTotal files fixed: ${count}`);
