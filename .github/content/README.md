# Content Directory

This directory contains AI-generated content for promoting lume-js.

## Directory Structure

```
.github/content/
├── articles/          # Long-form articles (Dev.to, Medium, etc.)
├── social/            # Social media posts (Twitter, LinkedIn, Reddit)
├── benchmarks/        # Benchmark results and analysis
└── ARTICLE_TEMPLATE.md  # Template for generating articles
```

## AI Workflow

When AI generates content, it should:

1. **Research** - Check trending topics, competitor conten
2. **Generate** - Create article/post using ARTICLE_TEMPLATE.md
3. **Validate** - Ensure code examples work
4. **Organize** - Save to appropriate directory
5. **Track** - Add to content calendar

## Content Types

### Articles (`articles/`)
- Technical deep-dives
- Tutorials
- Comparisons
- Migration guides
- Case studies

**Naming:** `YYYY-MM-DD-slug-title.md`

### Social Media (`social/`)
- Twitter/X threads
- LinkedIn posts
- Reddit posts
- Code snippets

**Naming:** `week-NN-platform.md` or `YYYY-MM-DD-platform-topic.md`

### Benchmarks (`benchmarks/`)
- Performance comparisons
- Bundle size analysis
- Memory usage reports

**Naming:** `YYYY-MM-DD-vs-framework.md`

## Human Review

All content requires human review before publishing:
- [ ] Verify accuracy
- [ ] Check tone
- [ ] Test code examples
- [ ] Approve messaging
- [ ] Publish to platforms
- [ ] Track performance
