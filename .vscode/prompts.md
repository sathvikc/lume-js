# Copilot Chat Prompts

Copy/paste these into Copilot Chat with `@workspace` prefix:

## Full Feature
```
@workspace Implement [feature] following AGENT_WORKFLOW.md (all 8 phases).
Must pass: npm test && npm run size. No skips.
```

## Ruthless Code Review
```
@workspace Review recent changes. Check: size <2KB? tests pass? docs updated? examples work?
Flag any violations immediately.
```

## Find Bloa
```
@workspace Analyze src/ for unnecessary code. Identify functions/imports that can be removed or simplified.
Target: reduce bundle size.
```

## Coverage Gaps
```
@workspace Find untested code paths in tests/. Generate tests to achieve 100% coverage.
```

## Quick Fix
```
@workspace Fix [issue]. Update tests. Verify examples still work. Run npm test && npm run size.
```

---

## 🚀 AI Project Management Prompts

### Comprehensive Audi
```
@workspace Follow .github/COMPREHENSIVE_AUDIT.md completely.
Update .github/AUDIT_PROGRESS.md as you work.
Execute ALL 15 phases systematically. Generate full audit report with:
- Code quality issues (specific line numbers)
- Test coverage gaps (missing scenarios)
- Documentation issues
- Marketing & content plan
- Benchmark comparisons
- Prioritized action items
- Future roadmap

Output format: Complete markdown report ready for review.
```

### Marketing & Content Generation
```
@workspace Execute Phase 12 & 13 from .github/COMPREHENSIVE_AUDIT.md:

1. Research trending JS topics (Hacker News, Reddit, Dev.to)
2. Generate 10 article ideas with:
   - SEO-optimized titles
   - Target audience
   - Key points
   - Publishing platforms
3. Create 30-day social media calendar
4. Draft 3 articles as markdown in .github/content/articles/
5. Generate social media snippets in .github/content/social/

Include benchmark data if available.
```

### Benchmark Setup & Analysis
```
@workspace Execute Phase 13 from .github/COMPREHENSIVE_AUDIT.md:

1. Create benchmarks/ directory structure
2. Set up benchmark framework
3. Create comparison benchmarks vs:
   - Vue 3 Reactivity
   - Solid.js Signals
   - Preact Signals
4. Test scenarios:
   - State creation/updates
   - DOM rendering
   - Memory usage
5. Generate markdown reports in benchmarks/results/
6. Create marketing-ready summaries

Output: Complete benchmark suite + comparison report.
```

### Weekly AI Summary
```
@workspace Generate weekly summary report:

1. Check metrics:
   - GitHub stars growth
   - npm downloads
   - Issues/PRs status
2. List completed work this week
3. Content published
4. Plan next week's tasks
5. Flag items needing human attention

Output: Weekly report markdown following Phase 14.4 template.
```

### Content Creation - Article
```
@workspace Write article on [topic]:

1. Research current discourse on topic
2. Draft comprehensive article (1500-2500 words)
3. Include runnable code examples
4. Add SEO metadata
5. Create social media snippets
6. Generate publish checklis

Save to .github/content/articles/[slug].md
```

### Content Creation - Social Media
```
@workspace Create social media content for next week:

1. 7 Twitter/X posts (code snippets, tips, features)
2. 2 LinkedIn posts (technical insights)
3. 1 Reddit post (r/javascript or r/webdev)
4. Include hashtags and timing suggestions

Save to .github/content/social/week-[number].md
```

### Test Coverage Sprin
```
@workspace Achieve 100% test coverage:

1. Run npm run coverage
2. Identify all uncovered lines/branches
3. Generate missing tests for:
   - Edge cases
   - Error conditions
   - Concurrent operations
4. Run tests and verify coverage
5. Update coverage repor

No line should be untested.
```

### Performance Optimization
```
@workspace Optimize lume-js performance:

1. Run benchmarks vs competitors
2. Identify bottlenecks
3. Suggest optimizations (maintain <2KB!)
4. Implement top 3 optimizations
5. Verify size and tests still pass
6. Document changes in design-decisions.md

Show before/after metrics.
```

### Documentation Sync
```
@workspace Sync all documentation:

1. Review every .md file
2. Verify code examples work
3. Update outdated information
4. Fix broken links
5. Ensure consistency
6. Add missing API docs

Check: README, docs/, examples/, .github/
```

### AI Instruction Optimizer
```
@workspace Follow .github/AI_INSTRUCTION_OPTIMIZER.md:

1. Research latest AI model improvements:
   - GitHub Copilot updates
   - GPT-4/Claude/Gemini improvements
   - Prompt engineering best practices
2. Analyze current instruction files:
   - Clarity, conciseness, completeness
   - Token efficiency
   - Effectiveness
3. Generate optimization report with:
   - Current issues identified
   - Proposed changes (prioritized)
   - Token savings estimate
   - Risks/testing needed
4. Create backups in .github/backups/[date]/
5. Apply optimizations on feature branch
6. Update VERSION_HISTORY.md

Human will test and approve before merge.

Schedule: Monthly or after major model updates.
```
