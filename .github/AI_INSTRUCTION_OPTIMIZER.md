# AI Instruction Optimizer

**Purpose:** Continuously improve AI instruction files based on latest model capabilities and best practices.

## How It Works

1. **Research** - AI checks latest prompt engineering best practices
2. **Analyze** - Reviews current instruction files
3. **Optimize** - Suggests improvements
4. **Backup** - Saves current version before changes
5. **Apply** - Creates optimized versions
6. **Test** - Human tests new prompts
7. **Rollback** - If needed, restore from backup

## Files to Optimize

### Primary Instruction Files
- `.github/copilot-instructions.md` - Main AI behavior rules
- `.github/copilot-persona.md` - Session starter
- `.vscode/prompts.md` - Reusable prompts library
- `AGENT_WORKFLOW.md` - Development workflow
- `.github/COMPREHENSIVE_AUDIT.md` - Audit checklis
- `.github/GIT_WORKFLOW.md` - Git safety rules

### Backup Location
All backups stored in: `.github/backups/YYYY-MM-DD/`

## Optimization Process

### Step 1: Research Latest Best Practices

AI should research:
- **GitHub Copilot improvements**
  - New features in latest release
  - Changes to instruction file parsing
  - Token limit updates
  - Context window changes

- **Prompt engineering advances**
  - Chain-of-thought improvements
  - Few-shot learning techniques
  - Instruction clarity patterns
  - Token efficiency methods

- **AI model updates**
  - GPT-4 Turbo improvements
  - Claude 3.5 capabilities
  - Gemini updates
  - Model-specific prompt patterns

**Sources to check:**
- GitHub Copilot changelog
- OpenAI documentation
- Anthropic prompt engineering guide
- Google AI documentation
- Prompt engineering research papers
- Community best practices (Reddit, HN, Twitter)

### Step 2: Analyze Current Instructions

For each instruction file, check:
- [ ] **Clarity** - Are instructions unambiguous?
- [ ] **Conciseness** - Any unnecessary words?
- [ ] **Completeness** - Missing important rules?
- [ ] **Token efficiency** - Could be more compact?
- [ ] **Effectiveness** - Do prompts produce good results?
- [ ] **Consistency** - Aligned across files?
- [ ] **Model-specific** - Leveraging latest capabilities?

### Step 3: Generate Optimization Repor

Create report with:

```markdown
# Instruction Optimization Repor
Date: [YYYY-MM-DD]

## Research Summary
- Latest Copilot version: [version]
- Key changes: [list]
- New best practices found: [list]

## Current Issues Identified

### `.github/copilot-instructions.md`
- Issue 1: [description] - Impact: [high/medium/low]
- Issue 2: [description] - Impact: [high/medium/low]

### `.vscode/prompts.md`
- Issue 1: [description] - Impact: [high/medium/low]

[etc for each file]

## Proposed Optimizations

### High Priority (Apply First)
1. [File]: [Specific change] - Reason: [why this helps]

### Medium Priority
1. [File]: [Specific change] - Reason: [why this helps]

### Low Priority (Nice to Have)
1. [File]: [Specific change] - Reason: [why this helps]

## Token Savings
- Current total: ~[X] tokens
- Optimized total: ~[Y] tokens
- Savings: [Z]% reduction

## Risks
- [Any potential downsides]
- [Testing needed]

## Recommendation
[Apply all / Apply high priority only / Wait for more research]
```

### Step 4: Create Backups

Before making ANY changes:

```bash
# Create backup directory with timestamp
mkdir -p .github/backups/$(date +%Y-%m-%d)

# Backup all instruction files
cp .github/copilot-instructions.md .github/backups/$(date +%Y-%m-%d)/
cp .github/copilot-persona.md .github/backups/$(date +%Y-%m-%d)/
cp .vscode/prompts.md .github/backups/$(date +%Y-%m-%d)/
cp AGENT_WORKFLOW.md .github/backups/$(date +%Y-%m-%d)/
cp .github/COMPREHENSIVE_AUDIT.md .github/backups/$(date +%Y-%m-%d)/
cp .github/GIT_WORKFLOW.md .github/backups/$(date +%Y-%m-%d)/

# Create backup metadata
echo "Backup created: $(date)" > .github/backups/$(date +%Y-%m-%d)/METADATA.md
echo "Reason: Prompt optimization" >> .github/backups/$(date +%Y-%m-%d)/METADATA.md
echo "Files backed up: [list]" >> .github/backups/$(date +%Y-%m-%d)/METADATA.md
```

### Step 5: Apply Optimizations

AI creates optimized versions on a feature branch:

```bash
git checkout -b ai/prompt-optimization-$(date +%Y-%m-%d)

# Apply changes to instruction files
# ... make edits ...

git add -A
git commit -m "chore(ai): optimize instruction files based on latest best practices"
git push origin ai/prompt-optimization-$(date +%Y-%m-%d)
```

### Step 6: Human Testing

Human should:
1. Review optimization repor
2. Check what changed (git diff)
3. Test new prompts with sample tasks:
   - Run comprehensive audi
   - Generate conten
   - Code review
   - Test coverage check
4. Compare results to previous version
5. Decide: Accept / Revise / Rollback

### Step 7: Rollback (If Needed)

If new prompts don't work well:

```bash
# Copy backups back
cp .github/backups/YYYY-MM-DD/* [destination]

# Or delete branch and start over
git checkout main
git branch -D ai/prompt-optimization-YYYY-MM-DD
```

## Version History

Keep track in `.github/backups/VERSION_HISTORY.md`:

```markdown
# AI Instruction Version History

## v3 - 2024-12-15
- Optimized for Copilot improvements
- Added chain-of-thought patterns
- Reduced tokens by 15%
- Status: Active ✅

## v2 - 2024-11-28
- Added git safety rules
- Human writing guidelines
- Progress tracking
- Status: Active ✅

## v1 - 2024-11-01
- Initial instruction files
- Status: Deprecated
```

## Optimization Schedule

Recommend running optimization:
- **Monthly** - Check for major model updates
- **Quarterly** - Deep research on prompt engineering
- **As needed** - When AI behavior seems suboptimal
- **After issues** - If prompts produce poor results

## Testing Checklis

After optimization, test these scenarios:

- [ ] Full feature implementation (AGENT_WORKFLOW.md)
- [ ] Comprehensive audit (COMPREHENSIVE_AUDIT.md)
- [ ] Content generation (natural, human-like?)
- [ ] Code review (catches issues?)
- [ ] Test generation (100% coverage?)
- [ ] Git workflow (creates branches correctly?)
- [ ] Benchmark creation
- [ ] Documentation updates

If ALL tests pass → Accep
If SOME tests fail → Revise
If MANY tests fail → Rollback

## Metrics to Track

Compare before/after:
- **Token usage** - Total tokens across all files
- **Clarity score** - Subjective 1-10 rating
- **Effectiveness** - Do prompts work better?
- **Error rate** - Fewer mistakes?
- **Response quality** - Better code/content?

## Safety Rules

1. **Always backup** before changes
2. **Never delete** old backups (keep all versions)
3. **Test thoroughly** before accepting
4. **Document changes** in VERSION_HISTORY.md
5. **One file at a time** - Don't optimize everything at once
6. **Human approval required** - AI proposes, human decides

## Example Optimization

**Before:**
```markdown
## Development Workflow
You should implement features in src/ directory. After implementation,
you need to write comprehensive tests in tests/ directory. Make sure
to update the TypeScript definitions in .d.ts files. Furthermore, don'
forget to update examples if relevant.
```

**After (optimized):**
```markdown
## Workflow
1. Implement in `src/`
2. Test in `tests/` (100% coverage)
3. Update `.d.ts` types
4. Update `examples/` if relevan
```

**Improvements:**
- More concise (40% fewer tokens)
- Clearer structure (numbered list)
- Removed filler words ("furthermore", "don't forget")
- More scannable

## Self-Improvement Loop

```
Research → Analyze → Optimize → Backup → Apply → Test → Measure
    ↑                                                      ↓
    └────────────────── Learn & Refine ←──────────────────┘
```

Each optimization cycle improves the next one based on results.
