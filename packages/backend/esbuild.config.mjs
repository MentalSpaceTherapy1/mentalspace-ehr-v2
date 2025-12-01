import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

// Recursively find all TypeScript files
function getAllTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip test directories
      if (item === '__tests__' || item === 'node_modules') continue;
      getAllTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts') && !item.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

const entryPoints = getAllTsFiles('src');

console.log(`Found ${entryPoints.length} TypeScript files to compile...`);

await esbuild.build({
  entryPoints,
  outdir: 'dist',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: true,
  bundle: false,
  outbase: 'src',
});

console.log('Build completed successfully!');
