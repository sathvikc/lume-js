#!/usr/bin/env node

/**
 * Lume.js Size Check Script
 * 
 * Verifies core bundle size stays under 2KB gzipped.
 * GitHub Actions friendly - outputs summaries for PR comments.
 * 
 * Usage:
 *   node scripts/check-size.js
 *   npm run size
 */

import { gzip } from 'zlib';
import { promisify } from 'util';
import { readFile, readdir } from 'fs/promises';
import { resolve, extname } from 'path';
import { fileURLToPath } from 'url';
import { minify } from 'terser';

const gzipAsync = promisify(gzip);

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcDir = resolve(__dirname, '../src');

// Core folder budget
const CORE_BUDGET = 2048; // 2KB gzipped

// Check if running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

/**
 * Minify code with Terser (production settings)
 */
async function minifyCode(code) {
  const result = await minify(code, {
    compress: {
      passes: 2,
      unsafe: true,
      unsafe_comps: true,
      unsafe_methods: true,
    },
    mangle: {
      toplevel: true,
    },
    format: {
      comments: false,
    },
  });
  
  return result.code;
}

/**
 * Recursively scan directory for .js files
 */
async function scanDirectory(dir, baseDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...await scanDirectory(fullPath, baseDir));
    } else if (entry.isFile() && extname(entry.name) === '.js') {
      const relativePath = fullPath.substring(baseDir.length + 1);
      files.push({ path: relativePath, fullPath });
    }
  }
  
  return files;
}

/**
 * Get size of a file
 */
async function getFileSize(filePath, name) {
  const originalCode = await readFile(filePath, 'utf-8');
  const minifiedCode = await minifyCode(originalCode);
  const gzipped = await gzipAsync(Buffer.from(minifiedCode));
  
  return {
    name,
    original: Buffer.byteLength(originalCode),
    minified: Buffer.byteLength(minifiedCode),
    gzipped: gzipped.length
  };
}

/**
 * Format bytes
 */
function formatSize(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function formatBytes(bytes) {
  return bytes + ' B';
}

/**
 * Output for terminal
 */
function printTerminalOutput(coreResults, coreGzipped, passed) {
  console.log('🔍 Lume.js Size Check');
  console.log('=====================\n');
  console.log('Core Budget: <2KB gzipped\n');
  
  console.log('📦 Core Files:');
  for (const file of coreResults) {
    console.log(`   ${file.name.padEnd(25)} ${formatSize(file.gzipped)}`);
  }
  
  const percentage = ((coreGzipped / CORE_BUDGET) * 100).toFixed(1);
  
  console.log('\n=====================');
  console.log(`Core Total: ${formatSize(coreGzipped)} / ${formatSize(CORE_BUDGET)} (${percentage}%)`);
  console.log('=====================\n');
  
  if (passed) {
    console.log(`✅ PASSED: Core is under 2KB!`);
  } else {
    const overBy = coreGzipped - CORE_BUDGET;
    console.log(`❌ FAILED: Core is over 2KB by ${formatBytes(overBy)}!`);
  }
}

/**
 * Output for GitHub Actions
 */
function printGitHubOutput(coreResults, coreGzipped, passed) {
  const percentage = ((coreGzipped / CORE_BUDGET) * 100).toFixed(1);
  const overBy = coreGzipped - CORE_BUDGET;
  
  // GitHub Actions Step Summary
  console.log('\n## 📦 Lume.js Bundle Size Report\n');
  console.log('| File | Gzipped |');
  console.log('|------|---------|');
  
  for (const file of coreResults) {
    console.log(`| ${file.name} | ${formatSize(file.gzipped)} |`);
  }
  
  console.log(`| **Core Total** | **${formatSize(coreGzipped)}** |`);
  console.log(`\n**Budget:** ${formatSize(CORE_BUDGET)} gzipped\n`);
  
  if (passed) {
    console.log(`### ✅ Size Check Passed\n`);
    console.log(`Core bundle is **${formatSize(coreGzipped)}** (${percentage}% of budget)\n`);
    console.log(`🎉 Well done! Core is under 2KB gzipped.`);
  } else {
    console.log(`### ❌ Size Check Failed\n`);
    console.log(`Core bundle is **${formatSize(coreGzipped)}** (${percentage}% of budget)\n`);
    console.log(`⚠️  Core exceeds 2KB budget by **${formatBytes(overBy)}**\n`);
    console.log(`**Action Required:**`);
    console.log(`- Remove unnecessary code from core`);
    console.log(`- Move non-essential features to addons`);
    console.log(`- Simplify complex logic`);
  }
}

/**
 * Main
 */
async function main() {
  try {
    // Scan core directory
    const coreDir = resolve(srcDir, 'core');
    const coreFiles = await scanDirectory(coreDir, srcDir);
    
    // Get sizes
    const coreResults = [];
    for (const file of coreFiles) {
      const size = await getFileSize(file.fullPath, file.path);
      coreResults.push(size);
    }
    
    // Calculate total
    const coreGzipped = coreResults.reduce((sum, r) => sum + r.gzipped, 0);
    const passed = coreGzipped <= CORE_BUDGET;
    
    // Output based on environment
    if (isGitHubActions) {
      printGitHubOutput(coreResults, coreGzipped, passed);
    } else {
      printTerminalOutput(coreResults, coreGzipped, passed);
    }
    
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error during size check:', error.message);
    process.exit(1);
  }
}

main();