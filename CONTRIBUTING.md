# Contributing to Lume.js

Thank you for your interest in contributing to Lume.js! We welcome contributions from the community.

Contributions can be anything from:
- 📝 **Documentation updates** (typos, new guides, better examples)
- 🐛 **Bug fixes**
- ✨ **New features or addons**
- 🎨 **New examples**
- 🧪 **Test improvements**

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lume-js.git
   cd lume-js
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Workflow

Lume.js uses standard JavaScript (ES Modules) and does not require a build step for development.

- **Source Code**: Located in `src/`
- **Examples**: Located in `examples/`
- **Tests**: Located in `tests/`
- **Docs**: Located in `docs/`

### Project Structure

```
lume-js/
├── dist/               # Build artifacts (minified files)
├── docs/               # Documentation
│   ├── api/            # API Reference
│   │   ├── core/       # Core API (state, bindDom, effect, handlers)
│   │   ├── addons/     # Addons (computed, repeat, watch)
│   │   └── handlers/   # Individual handler API docs
│   ├── design/         # Design decisions
│   ├── guides/         # Guides (forms, routing, handlers, etc.)
│   └── tutorials/      # Step-by-step tutorials
├── examples/           # Example projects
├── scripts/            # Build, size, complexity, and benchmark scripts
├── src/                # Source code
│   ├── addons/         # Addon source (computed, watch, repeat, debug)
│   ├── core/           # Core logic (state, effect, bindDom)
│   ├── handlers/       # Handler source (one file per handler)
│   ├── utils/          # Shared utilities (log, etc.)
│   ├── index.d.ts      # TypeScript definitions
│   └── index.js        # Main entry point
├── tests/              # Test suite
│   ├── addons/         # Addon tests
│   ├── core/           # Core tests
│   └── handlers/       # Handler tests
├── CONTRIBUTING.md     # Contribution guidelines
├── LICENSE             # MIT License
├── package.json        # NPM configuration
└── README.md           # Main entry point
```

To run the examples locally:
```bash
npm run dev
```
This will start a Vite server. Open `http://localhost:5173/examples/` to browse the examples.

## Running Tests

We use [Vitest](https://vitest.dev) for testing. Please ensure all tests pass before submitting a PR.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run coverage
```

## CI Gates

Every pull request must pass these automated checks:

| Check | Command | Requirement |
|-------|---------|-------------|
| Tests & Coverage | `npm run coverage` | 100% statements, branches, functions, lines |
| TypeScript | `npm run typecheck` | Zero type errors |
| Cognitive Complexity | `npm run lint` | All functions ≤ 15 (sonarjs/cognitive-complexity) |
| Cyclomatic & MI | `node scripts/complexity.js` | Max CC ≤ 10 per function, MI ≥ 50 per file |
| Docs Freshness | `npm run docs:check` | `docs/metrics.json`, marker regions, and `llms.txt`/`llms-full.txt` all match the docs tree |

Run everything locally before pushing:

```bash
npm run validate
```

This runs: build → size check → complexity → lint → typecheck → coverage → docs check.

## Contribution Guidelines

### 1. Code Style & Philosophy

Before writing code, please read [DESIGN_DECISIONS.md](docs/design/design-decisions.md).

- **Standards-Only**: Use `data-*` attributes and standard JS APIs. No custom syntax.
- **No Build Step**: Core library must run directly in the browser.
- **Minimal Size**: Keep the core bundle (`dist/index.mjs`) ≤ 3 KB gzipped. Run `npm run size` after any change to the source.
- **TypeScript**: We use JSDoc and `index.d.ts` for types. Do not write `.ts` source files for the core library. Update `index.d.ts` if you change the public API.

### 2. Documentation

Documentation is as important as code.
- If you add a feature, add a guide or API doc in `docs/`.
- If you fix a bug, check if the docs need clarification.
- Keep examples simple and copy-paste friendly.
- If your change touches a version number, bundle size, test count, browser floor, or the docs nav (`docs/manifest.json`), run `npm run docs:sync` and commit the result — it rewrites every `<!-- lume:* -->` marker region from `docs/metrics.json`/`docs/manifest.json` and regenerates the `llms.txt`/`llms-full.txt` bundles. `npm run docs:check` (part of `npm run validate`) fails the PR on drift.

### 3. Commit Messages

We follow the **Angular Commit Convention**. This allows us to generate changelogs automatically.

**Format:** `type(scope): subject`

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation

**Examples:**
- `feat(core): add support for nested state`
- `fix(bind): fix input cursor jumping issue`
- `docs(readme): update installation instructions`
- `test(repeat): add coverage for fallback subscription`

### 4. TypeScript

If you modify the public API, you **MUST** update `src/index.d.ts`.
- Ensure types are accurate.
- Add JSDoc comments for better IDE support.
- Run a test file that uses the types to verify they work (or rely on existing tests).

## Pull Request Process

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Make your changes.
3. Add tests for your changes.
4. Ensure all tests pass (`npm test`).
5. Commit your changes using the Angular convention.
6. Push to your fork and submit a Pull Request.

## Reporting Issues

If you find a bug or have a feature request, please open an issue on GitHub. Provide as much detail as possible, including a reproduction if applicable.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
