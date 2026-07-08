# Kickoff prompt — lume-js entry for js-framework-benchmark

The credibility play: get lume-js onto the industry-standard benchmark
chart at <https://github.com/krausest/js-framework-benchmark>.

**How to use:**

1. Fork `krausest/js-framework-benchmark` on GitHub.
2. Open a Claude Code session on your fork (clone it locally or use
   claude.ai/code).
3. Paste the prompt below.
4. Review the resulting branch, then open the PR from your fork to
   `krausest/js-framework-benchmark`.

> Note: the benchmark installs frameworks from npm, so the published
> `lume-js` version is what gets benchmarked. If the implementation
> surfaces performance issues you fix in Lume, publish the fix first, then
> bump the version in the benchmark entry.

---

```text
Add a "lume-js" implementation to this js-framework-benchmark fork,
producing a branch that is ready to open as a PR to
krausest/js-framework-benchmark.

## Ground rules

- FIRST read this repo's CONTRIBUTING.md and the root README section on
  adding new implementations. Those documents are authoritative — where
  anything in this prompt conflicts with them, the repo docs win.
- Study 2–3 existing KEYED implementations before writing code: start
  with frameworks/keyed/vanillajs (the perf ceiling) and one small
  reactive library of a similar philosophy (e.g. solid, reagent-style, or
  alpine if present) to copy structure, package.json metadata, and build
  scripts from.
- The entry must be KEYED: frameworks/keyed/lume-js/. Keyed means row DOM
  nodes are tied to row data identity — "swap rows" must move/recreate
  the two row nodes, never just rewrite text in place. The repo has a
  keyed-ness checker; run it.

## About lume-js (the library you are integrating)

- npm package: lume-js (latest). ES modules.
- Full agent documentation — read before writing the implementation:
  https://raw.githubusercontent.com/sathvikc/lume-js/main/AGENT_GUIDE.md
  (complete API reference if needed:
  https://raw.githubusercontent.com/sathvikc/lume-js/main/llms-full.txt)
- Essence: `state(obj)` returns a Proxy store; `effect(fn)` auto-tracks
  reads and re-runs; writes are microtask-batched per store; `batch(fn)`
  groups cross-store writes into one synchronous flush; the `repeat`
  addon (import from 'lume-js/addons') renders keyed lists with element
  reuse: repeat(container, store, 'items', { key: r => r.id, create,
  update }).
- Critical rule: arrays are updated by REPLACEMENT, never mutation —
  store.rows = [...store.rows, x], .filter(), .map(); change detection is
  reference equality. Selection state should be its own store key.

## The implementation

Implement the standard benchmark app (Run = create 1,000 rows, Runlots =
10,000, Add = append 1,000, Update = mutate every 10th label, Clear,
Swap Rows = swap 2nd and 999th, Select = highlight clicked row, Delete =
remove clicked row) using idiomatic lume-js:

- One store, e.g. state({ rows: [], selected: 0 }); all row-set
  operations are immutable array replacements.
- Rows rendered via the repeat addon keyed by row id, with create/update
  callbacks (create builds the <tr> structure once; update syncs label
  text and the danger/selected class).
- Use event delegation on the tbody for select/delete (one listener, read
  the row id from the DOM), matching what other implementations do.
- Wire the benchmark's required 'danger' class on the selected row.
- Keep it honest: no vanilla-JS bypass of the library for the hot path —
  the point of the entry is to measure lume-js, not hand-written DOM
  code. Using the documented repeat() addon and batch() is idiomatic;
  bypassing the store to mutate the table directly is not.
- package.json must follow the repo's schema for benchmark entries,
  including the js-framework-benchmark metadata block
  (frameworkVersionFromPackage: "lume-js", keyed flag per the schema
  used by neighbors) and the same build-dev/build-prod scripts pattern
  the reference implementations use (a minimal rollup or vite build that
  bundles lume-js from node_modules is fine — the BENCHMARK build may use
  a bundler even though lume itself needs none).

## Verify before declaring done (all per the repo's own docs)

1. npm ci / build steps as CONTRIBUTING.md prescribes for a new
   implementation; the entry must build with build-prod.
2. Serve the repo and load /frameworks/keyed/lume-js/index.html — click
   through EVERY operation manually and confirm correct behavior
   (especially: select highlights exactly one row; swap visibly swaps;
   delete removes the right row while scrolled).
3. Run the repo's keyed-ness check for keyed/lume-js and make it pass.
4. If the environment allows, run the actual bench suite for just this
   framework per the repo docs and sanity-check no operation times out.
   If the environment cannot run Chrome/webdriver, say so explicitly in
   your summary instead of skipping silently.

## Deliverable

A single tidy branch (e.g. add-lume-js-keyed) with the new
frameworks/keyed/lume-js/ directory and any required registry/list file
updates the repo docs mention, commit message "add lume-js (keyed)
implementation", plus a summary I can paste into the PR description:
what the implementation uses, verification performed, and results of the
keyed check. Do not open the PR yourself unless you have permission to —
prepare everything so opening it is one click.
```
