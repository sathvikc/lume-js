#!/usr/bin/env node

/**
 * Lume.js Complexity & Maintainability Report
 *
 * Reports per source file:
 *   LOC      — logical lines (non-blank, non-comment)
 *   Funcs    — number of functions / arrow functions
 *   Max CC   — highest cyclomatic complexity of any one function
 *   Avg CC   — average cyclomatic complexity across all functions
 *   MI       — Maintainability Index 0–100 (higher = easier to maintain)
 *              Formula (simplified): max(0, (171 - 0.23*CC - 16.2*ln(LOC)) * 100/171)
 *              ≥ 65 → A  maintainable
 *              40–64 → B  moderate
 *              < 40  → C  hard to maintain
 *
 * Thresholds (enforced in CI):
 *   Max CC per function ≤ 10
 *   MI per file ≥ 50
 *
 * Usage:
 *   node scripts/complexity.js
 *   node scripts/complexity.js --json
 *   npm run complexity
 */

import { parse }     from '../node_modules/acorn/dist/acorn.js';
import { readFile }  from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath }              from 'node:url';
import { readdirSync, statSync }      from 'node:fs';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const ROOT       = resolve(__dirname, '..');
const SRC        = resolve(ROOT, 'src');
const isJson     = process.argv.includes('--json');
const isCI       = process.env.GITHUB_ACTIONS === 'true';

// ── Thresholds ────────────────────────────────────────────────────────────────

const MAX_CC = 10;   // per function
const MIN_MI = 50;   // per file

// ── Known exceptions ─────────────────────────────────────────────────────────
// Pre-existing intentionally complex functions. CI only fails on NEW violations.
// Match by { file, func } — func is the function name (or '<arrow>').

const KNOWN_EXCEPTIONS = [
  {
    file: 'src/core/state.js',
    func: '<arrow>',
    reason: 'scheduleFlush inner loop — handles hooks, subscribers, effects, and cycle detection in one microtask for performance',
  },
  {
    file: 'src/addons/repeat.js',
    func: 'updateList',
    reason: 'keyed DOM reconciliation — inherently complex, fully tested',
  },
  {
    // repeat.js MI is driven by large LOC + algorithmic complexity — justified
    file: 'src/addons/repeat.js',
    mi: true,
    reason: 'Large reconciliation module, MI reflects size not poor structure',
  },
];

// ── AST helpers ───────────────────────────────────────────────────────────────

function walk(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    const v = node[key];
    if (Array.isArray(v)) {
      for (const child of v) {
        if (child && typeof child.type === 'string') walk(child, visitor);
      }
    } else if (v && typeof v.type === 'string') {
      walk(v, visitor);
    }
  }
}

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
]);

// Cyclomatic complexity = 1 + decision points inside a function body.
// We walk only the direct body of the function (not nested functions — each
// nested function gets its own CC score).
const CC_NODES = new Set([
  'IfStatement',
  'ForStatement', 'ForInStatement', 'ForOfStatement',
  'WhileStatement', 'DoWhileStatement',
  'CatchClause',
  'ConditionalExpression',
]);

function countCC(funcNode) {
  let cc = 1;
  let depth = 0;

  walk(funcNode.body ?? funcNode, (node) => {
    // Don't count decision points inside nested functions
    if (node !== funcNode && FUNCTION_TYPES.has(node.type)) {
      depth++;
      return;
    }
    if (depth > 0) return;

    if (CC_NODES.has(node.type)) { cc++; return; }

    // switch case (not default)
    if (node.type === 'SwitchCase' && node.test !== null) { cc++; return; }

    // logical &&, ||, ?? each add a branch
    if (node.type === 'LogicalExpression') { cc++; return; }
  });

  return cc;
}

function getFunctions(ast) {
  const funcs = [];
  walk(ast, (node) => {
    if (!FUNCTION_TYPES.has(node.type)) return;
    const name =
      node.id?.name ??
      (node.type === 'ArrowFunctionExpression' ? '<arrow>' : '<anonymous>');
    funcs.push({ name, cc: countCC(node), loc: node.loc });
  });
  return funcs;
}

// ── File metrics ──────────────────────────────────────────────────────────────

function maintainabilityIndex(avgCC, loc) {
  if (loc < 1) return 100;
  const mi = (171 - 0.23 * avgCC - 16.2 * Math.log(loc)) * 100 / 171;
  return Math.max(0, Math.min(100, mi));
}

function miGrade(mi) {
  if (mi >= 65) return 'A';
  if (mi >= 40) return 'B';
  return 'C';
}

async function analyzeFile(filePath) {
  const src   = await readFile(filePath, 'utf8');
  const lines = src.split('\n');

  const commentLines = new Set();
  let ast;
  try {
    ast = parse(src, {
      sourceType: 'module',
      ecmaVersion: 2022,
      locations: true,
      onComment(block, _text, _s, _e, start, end) {
        for (let l = start.line; l <= end.line; l++) commentLines.add(l);
      },
    });
  } catch {
    return null; // skip unparseable files
  }

  let blankLines = 0;
  for (const line of lines) {
    if (line.trim() === '') blankLines++;
  }

  const loc     = lines.length - blankLines - commentLines.size;
  const funcs   = getFunctions(ast);
  const ccs     = funcs.map(f => f.cc);
  const maxCC   = ccs.length ? Math.max(...ccs) : 0;
  const avgCC   = ccs.length ? ccs.reduce((a, b) => a + b, 0) / ccs.length : 0;
  const mi      = maintainabilityIndex(avgCC, loc);
  const grade   = miGrade(mi);

  const fileKey = relative(ROOT, filePath);

  const isExemptFunc = (name) =>
    KNOWN_EXCEPTIONS.some(e => e.file === fileKey && e.func === name);
  const isExemptMI = () =>
    KNOWN_EXCEPTIONS.some(e => e.file === fileKey && e.mi);

  const allViolations = funcs
    .filter(f => f.cc > MAX_CC)
    .map(f => ({ name: f.name, cc: f.cc, line: f.loc?.start.line ?? 0, exempt: isExemptFunc(f.name) }));

  const violations = allViolations.filter(v => !v.exempt);
  const exemptions = allViolations.filter(v => v.exempt);
  const miExempt   = mi < MIN_MI && isExemptMI();
  const miViolation = mi < MIN_MI && !miExempt;

  return {
    file: fileKey,
    loc,
    funcs: funcs.length,
    maxCC,
    avgCC: Math.round(avgCC * 10) / 10,
    mi: Math.round(mi * 10) / 10,
    grade,
    overBudget: miViolation || violations.length > 0,
    violations,
    exemptions,
    miExempt,
  };
}

// ── Collect files ─────────────────────────────────────────────────────────────

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFiles(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const files  = jsFiles(SRC);
const results = (await Promise.all(files.map(analyzeFile))).filter(Boolean);
results.sort((a, b) => a.file.localeCompare(b.file));

const anyFailed = results.some(r => r.overBudget);

// ── JSON output ───────────────────────────────────────────────────────────────

function cleanNumbers(obj) {
  if (typeof obj === 'number') {
    const r = Math.round(obj * 100) / 100;
    return r === 0 ? 0 : r;
  }
  if (Array.isArray(obj)) return obj.map(cleanNumbers);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = cleanNumbers(v);
    return out;
  }
  return obj;
}

if (isJson) {
  console.log(JSON.stringify(cleanNumbers({
    passed: !anyFailed,
    thresholds: { maxCC: MAX_CC, minMI: MIN_MI },
    files: results,
  }), null, 2));
  process.exit(anyFailed ? 1 : 0);
}

// ── GitHub Actions step summary ───────────────────────────────────────────────

if (isCI) {
  console.log('## 🧠 Complexity & Maintainability\n');
  console.log('| File | LOC | Funcs | Max CC | Avg CC | MI | Grade | Status |');
  console.log('|------|-----|-------|--------|--------|----|-------|--------|');
  for (const r of results) {
    const status = r.overBudget ? `❌` : '✅';
    console.log(`| \`${r.file}\` | ${r.loc} | ${r.funcs} | ${r.maxCC} | ${r.avgCC} | ${r.mi} | **${r.grade}** | ${status} |`);
    for (const v of r.violations) {
      console.log(`| ↳ \`${v.name}\` (line ${v.line}) | | | **${v.cc}** | | | | ❌ CC>${MAX_CC} |`);
    }
    for (const v of r.exemptions) {
      console.log(`| ↳ \`${v.name}\` (line ${v.line}) | | | ${v.cc} | | | | ⚠︎ known |`);
    }
  }
  console.log(anyFailed ? '\n❌ Complexity budget exceeded.' : '\n✅ All files within budget.');
  process.exit(anyFailed ? 1 : 0);
}

// ── Terminal output ───────────────────────────────────────────────────────────

const GRADE_COLOR = { A: '\x1b[32m', B: '\x1b[33m', C: '\x1b[31m' };
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

const w  = (s, n) => String(s).padEnd(n);
const wr = (s, n) => String(s).padStart(n);

console.log(`\n${BOLD}🧠 Lume.js Complexity & Maintainability${RESET}`);
console.log('═'.repeat(80));
console.log(
  `${w('File', 38)} ${wr('LOC', 5)} ${wr('Funcs', 5)} ${wr('MaxCC', 6)} ${wr('AvgCC', 6)} ${wr('MI', 6)}  Grade`
);
console.log('─'.repeat(80));

let totalLOC = 0, totalFuncs = 0;
for (const r of results) {
  totalLOC   += r.loc;
  totalFuncs += r.funcs;
  const color = GRADE_COLOR[r.grade] ?? '';
  const flag  = r.overBudget ? ' ❌' : r.exemptions.length || r.miExempt ? ' ⚠︎' : '';
  console.log(
    `${w(r.file, 38)} ${wr(r.loc, 5)} ${wr(r.funcs, 5)} ${wr(r.maxCC, 6)} ${wr(r.avgCC, 6)} ${wr(r.mi, 6)}  ${color}${BOLD}${r.grade}${RESET}${flag}`
  );
  for (const v of r.violations) {
    console.log(`  \x1b[31m↳ ${v.name} (line ${v.line}) — CC ${v.cc} exceeds ${MAX_CC}\x1b[0m`);
  }
  for (const v of r.exemptions) {
    console.log(`  ${DIM}↳ ${v.name} (line ${v.line}) — CC ${v.cc} [known exception]${RESET}`);
  }
  if (r.miExempt) {
    console.log(`  ${DIM}↳ MI ${r.mi} < ${MIN_MI} [known exception]${RESET}`);
  }
}

console.log('─'.repeat(80));
console.log(`${w('TOTAL', 38)} ${wr(totalLOC, 5)} ${wr(totalFuncs, 5)}`);
console.log('═'.repeat(80));

console.log(`\n${DIM}MI scale: A ≥ 65 (green)  B 40-64 (yellow)  C < 40 (red)`);
console.log(`Thresholds: max CC per function ≤ ${MAX_CC}, MI per file ≥ ${MIN_MI}${RESET}`);

if (!anyFailed) {
  console.log('\n✅ All files within complexity budget.\n');
} else {
  console.log('\n❌ Budget exceeded:\n');
  for (const r of results.filter(r => r.overBudget)) {
    if (r.mi < MIN_MI) console.log(`   ${r.file}: MI ${r.mi} < ${MIN_MI}`);
    for (const v of r.violations) {
      console.log(`   ${r.file}: ${v.name}() CC ${v.cc} > ${MAX_CC} (line ${v.line})`);
    }
  }
  console.log();
}

process.exit(anyFailed ? 1 : 0);
