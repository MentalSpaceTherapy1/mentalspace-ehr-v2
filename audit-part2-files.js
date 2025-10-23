// PART 2: Comprehensive file-by-file audit
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIT_OUTPUT = [];

function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

function getFileInfo(filePath) {
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;

  return {
    path: filePath,
    size: stats.size,
    lines: lines,
    hash: getFileHash(filePath),
    lastModified: stats.mtime.toISOString()
  };
}

function scanDirectory(dir, filePattern) {
  const files = [];

  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!item.includes('node_modules') && !item.includes('.git') && !item.includes('dist')) {
          scan(fullPath);
        }
      } else if (stat.isFile()) {
        if (!filePattern || filePattern.test(item)) {
          files.push(fullPath);
        }
      }
    }
  }

  scan(dir);
  return files.sort();
}

console.log('='.repeat(80));
console.log('PART 2: CODE-LEVEL FILE AUDIT');
console.log('='.repeat(80));
console.log('');

// Backend files
console.log('=== BACKEND SOURCE FILES ===\n');
const backendDir = path.join(__dirname, 'packages', 'backend', 'src');
const backendFiles = scanDirectory(backendDir, /\.(ts|js)$/);

console.log(`Total backend files: ${backendFiles.length}\n`);

const categories = {
  routes: [],
  controllers: [],
  services: [],
  middleware: [],
  utils: [],
  config: [],
  other: []
};

backendFiles.forEach(file => {
  const relativePath = path.relative(backendDir, file);
  const info = getFileInfo(file);

  if (file.includes('/routes/')) categories.routes.push(info);
  else if (file.includes('/controllers/')) categories.controllers.push(info);
  else if (file.includes('/services/')) categories.services.push(info);
  else if (file.includes('/middleware/')) categories.middleware.push(info);
  else if (file.includes('/utils/')) categories.utils.push(info);
  else if (file.includes('/config')) categories.config.push(info);
  else categories.other.push(info);

  AUDIT_OUTPUT.push({
    category: 'BACKEND',
    ...info
  });
});

console.log('BACKEND FILE BREAKDOWN:');
console.log(`  Routes: ${categories.routes.length} files`);
console.log(`  Controllers: ${categories.controllers.length} files`);
console.log(`  Services: ${categories.services.length} files`);
console.log(`  Middleware: ${categories.middleware.length} files`);
console.log(`  Utils: ${categories.utils.length} files`);
console.log(`  Config: ${categories.config.length} files`);
console.log(`  Other: ${categories.other.length} files`);

// List all route files
console.log('\n=== ALL ROUTE FILES ===');
categories.routes.forEach(file => {
  const name = path.basename(file.path);
  console.log(`  ${name} - ${file.lines} lines, ${file.size} bytes`);
});

// List all controller files
console.log('\n=== ALL CONTROLLER FILES ===');
categories.controllers.forEach(file => {
  const name = path.basename(file.path);
  console.log(`  ${name} - ${file.lines} lines, ${file.size} bytes`);
});

// Frontend files
console.log('\n\n=== FRONTEND SOURCE FILES ===\n');
const frontendDir = path.join(__dirname, 'packages', 'frontend', 'src');
const frontendFiles = scanDirectory(frontendDir, /\.(tsx?|jsx?)$/);

console.log(`Total frontend files: ${frontendFiles.length}\n`);

const frontendCategories = {
  pages: [],
  components: [],
  lib: [],
  hooks: [],
  contexts: [],
  other: []
};

frontendFiles.forEach(file => {
  const info = getFileInfo(file);

  if (file.includes('/pages/')) frontendCategories.pages.push(info);
  else if (file.includes('/components/')) frontendCategories.components.push(info);
  else if (file.includes('/lib/')) frontendCategories.lib.push(info);
  else if (file.includes('/hooks/')) frontendCategories.hooks.push(info);
  else if (file.includes('/contexts/')) frontendCategories.contexts.push(info);
  else frontendCategories.other.push(info);

  AUDIT_OUTPUT.push({
    category: 'FRONTEND',
    ...info
  });
});

console.log('FRONTEND FILE BREAKDOWN:');
console.log(`  Pages: ${frontendCategories.pages.length} files`);
console.log(`  Components: ${frontendCategories.components.length} files`);
console.log(`  Lib: ${frontendCategories.lib.length} files`);
console.log(`  Hooks: ${frontendCategories.hooks.length} files`);
console.log(`  Contexts: ${frontendCategories.contexts.length} files`);
console.log(`  Other: ${frontendCategories.other.length} files`);

// Database/Prisma files
console.log('\n\n=== DATABASE/PRISMA FILES ===\n');
const dbDir = path.join(__dirname, 'packages', 'database');
if (fs.existsSync(dbDir)) {
  const schemaFile = path.join(dbDir, 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaFile)) {
    const info = getFileInfo(schemaFile);
    console.log(`schema.prisma - ${info.lines} lines, ${info.size} bytes`);
    AUDIT_OUTPUT.push({
      category: 'DATABASE',
      ...info
    });
  }

  const migrationsDir = path.join(dbDir, 'prisma', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir).filter(f =>
      fs.statSync(path.join(migrationsDir, f)).isDirectory()
    ).sort();
    console.log(`\nMigrations: ${migrations.length} total`);
    migrations.forEach((m, i) => {
      console.log(`  ${i+1}. ${m}`);
    });
  }

  const seedsDir = path.join(dbDir, 'prisma', 'seeds');
  if (fs.existsSync(seedsDir)) {
    const seeds = fs.readdirSync(seedsDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    console.log(`\nSeed files: ${seeds.length} total`);
    seeds.forEach(seed => {
      const seedPath = path.join(seedsDir, seed);
      const info = getFileInfo(seedPath);
      console.log(`  ${seed} - ${info.lines} lines`);
      AUDIT_OUTPUT.push({
        category: 'SEED',
        ...info
      });
    });
  }
}

// Write comprehensive report
const reportPath = path.join(__dirname, 'FILE_AUDIT_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(AUDIT_OUTPUT, null, 2));

console.log(`\n\n📄 Complete file audit saved to: ${reportPath}`);
console.log(`Total files audited: ${AUDIT_OUTPUT.length}`);
