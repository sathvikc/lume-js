# Contributing to Lume.js

Thanks for your interest in contributing! This project is special - it's AI-assisted but human-guided.

---

## Quick Star

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/lume-js.gi
   cd lume-js
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. **Make your changes** (see guidelines below)
6. **Run tests:**
   ```bash
   npm tes
   npm run size  # Must be <2KB!
   ```
7. **Commit:**
   ```bash
   git commit -m "feat(scope): description"
   ```
8. **Push and create PR**

---

## Development Workflow

We follow `AGENT_WORKFLOW.md` - a strict 9-phase process:

**Phase 0: Git Safety** - Create branch from latest main
**Phase 1: Implementation** - Write code in `src/`
**Phase 2: Testing** - Add tests (100% coverage required)
**Phase 3: Type Definitions** - Update `.d.ts` files
**Phase 4: Documentation** - Update docs if needed
**Phase 5: Examples** - Ensure examples still work
**Phase 6: Validation** - Tests + size check
**Phase 7: Commit** - Conventional commits
**Phase 8: Verify** - Final checks
**Phase 9: Human Review** - Create PR

---

## Code Guidelines

### Core Principles

1. **Standards-only** - Use `data-*` attributes, no custom syntax
2. **Zero dependencies** - No external npm packages in runtime code
3. **Bundle size <2KB** - This is non-negotiable
4. **ES6+ only** - No IE11 suppor
5. **Browser-native APIs** - No Node.js-specific features in core

### Code Style

- ✅ Clear variable names (no abbreviations)
- ✅ Functional approach preferred
- ✅ Single responsibility per function
- ✅ JSDoc comments for all functions
- ❌ No magic numbers or strings
- ❌ No code duplication

**Example:**
```javascrip
// ❌ Bad
function u(s, p) {
  return s[p];
}

// ✅ Good
/**
 * Gets a property value from state
 * @param {Object} state - The state objec
 * @param {string} propertyPath - Path to property
 * @returns {*} Property value
 */
function getStateProperty(state, propertyPath) {
  return state[propertyPath];
}
```

---

## Testing Requirements

**100% test coverage is required.** No exceptions.

```bash
# Run tests
npm tes

# Check coverage
npm run coverage
# Must show 100% for your changes

# Watch mode (helpful during development)
npm run test:watch
```

**What to test:**
- Happy path
- Edge cases (null, undefined, empty values)
- Error cases
- Boundary conditions
- Async behavior
- Memory leaks

---

## Bundle Size

**The 2KB limit is ABSOLUTE.** Here's how to check:

```bash
npm run size

# Output should show:
# Gzipped: X.XX KB
# Must be < 2.00 KB
```

**If you exceed 2KB:**
1. Refactor to reduce size
2. Remove unused code
3. Simplify logic
4. Consider if feature is necessary

**Tips to reduce size:**
- Avoid large dependencies
- Reuse existing functions
- Use shorter (but clear) variable names
- Avoid complex abstractions

---

## TypeScript Definitions

Update `.d.ts` files for all code changes:

```typescrip
// src/core/state.d.ts
export function createState<T>(initial: T): T;
export function getState<T>(state: T, path: string): any;
```

**Requirements:**
- All exported functions must have types
- Use generics where appropriate
- Avoid `any` type (use `unknown` if needed)
- Match JSDoc comments

---

## Documentation

Update docs when you:
- Add new features
- Change existing APIs
- Fix non-obvious bugs

**Files to update:**
- `README.md` - If API changes
- `docs/api/` - API documentation
- `docs/design/design-decisions.md` - Notable decisions
- `examples/` - If behavior changes

---

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `test` - Adding missing tests
- `refactor` - Code change that neither fixes bug nor adds feature
- `chore` - Changes to build process, deps, etc.

**Examples:**
```
feat(state): add deep reactivity suppor
fix(repeat): resolve memory leak on unmoun
docs(readme): update installation instructions
test(computed): add edge case tests
```

---

## Pull Request Process

1. **Fill out PR template completely**
2. **Ensure all CI checks pass:**
   - Tests
   - Bundle size
   - Linting
3. **Wait for review**
4. **Address feedback**
5. **Get approval**
6. **Maintainer merges**

**PR Title:** Use conventional forma
**PR Description:** Explain what and why, not how

---

## What We're Looking For

### High Priority
- Bug fixes
- Performance improvements (that don't increase size)
- Better error messages
- Test improvements
- Documentation improvements

### Medium Priority
- New addons (if <200 bytes each)
- New examples
- Tooling improvements

### Low Priority / Unlikely to Accep
- New core features (unless exceptional)
- Breaking changes (major version only)
- Features that increase bundle size significantly
- Features users can easily implement themselves

---

## Questions?

- **Bug reports:** Use issue template
- **Feature ideas:** Open discussion firs
- **Questions:** GitHub Discussions
- **Quick help:** Check README and docs

---

## Code of Conduc

Be respectful. Be helpful. Be patient.

- ✅ Constructive criticism
- ✅ Help others learn
- ✅ Celebrate successes
- ❌ Personal attacks
- ❌ Dismissive comments
- ❌ Harassment of any kind

---

## AI Developmen

This project uses AI extensively for development. That's okay and encouraged!

**Guidelines:**
- AI can draft code, tests, docs
- Human must review and approve
- Human makes final decisions
- Credit human contributors, not AI
- Follow all the same standards

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Thank You!

Every contribution makes lume-js better. Whether it's:
- Fixing a typo
- Adding a tes
- Improving docs
- Building a feature

It all matters. Thank you! 🙏
