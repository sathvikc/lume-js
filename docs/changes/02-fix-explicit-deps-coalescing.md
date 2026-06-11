# 02 — fix(core): explicit-deps effects run once per tick, not once per changed key

| | |
|---|---|
| **Type** | Bug fix (behavior consistency) |
| **Files changed** | `src/core/effect.js` |
| **Tests** | `tests/core/effect.test.js` → 4 new tests in `describe('explicit deps mode')` |
| **Breaking?** | Behavioral: re-runs now happen one microtask later and are deduplicated. No API change. |

## The bug

`effect()` has two modes that silently disagreed about how often the effect runs.

```js
const store = state({ a: 0, b: 0, c: 0 });

// AUTO-TRACKING MODE — runs ONCE when a, b, c change together ✅
effect(() => {
  render(store.a, store.b, store.c);
});

// EXPLICIT-DEPS MODE — ran THREE times for the same change ❌
effect(() => {
  render(store.a, store.b, store.c);
}, [[store, 'a', 'b', 'c']]);

store.a = 1;
store.b = 2;
store.c = 3;
```

Auto-tracked effects go through the store's internal effect queue, which is a
`Set` — multiple changed keys collapse into one run per flush. Explicit deps
subscribed each key with a raw `$subscribe` callback that called the effect
**directly**, so N changed keys meant N runs. For a `render`-style effect that
touches the DOM, that's N− 1 wasted renders on every multi-key update — and a
subtle trap: the *recommended* "no magic" mode quietly performed worse than the
magic one.

## The fix

Explicit-deps subscriptions no longer run the effect directly. They schedule a
single coalesced run via `queueMicrotask`, guarded by a `scheduled` flag:

```js
let scheduled = false;
const scheduleExecute = () => {
  if (scheduled) return;          // a run is already queued — coalesce
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    if (disposed) return;         // see "Disposal safety" below
    try { execute(); } catch { /* logged inside execute() */ }
  });
};
```

Any number of tracked keys changing in the same tick — across **any number of
stores** — produces exactly one re-run:

```js
effect(() => {
  fn(storeA.x, storeB.y);
}, [[storeA, 'x'], [storeB, 'y']]);

storeA.x = 1;
storeB.y = 2;
// before: fn re-ran twice — after: fn re-runs once, seeing (1, 2)
```

## Disposal safety

Coalescing introduces a window between "notification received" and "effect
runs" (one microtask). If the effect is cleaned up inside that window, the
pending run must not fire. A `disposed` flag is set by the cleanup function
and checked before executing — there is a regression test for exactly this
sequence (mutate → flush → cleanup → microtask).

## Error containment

Previously a throwing re-run propagated into the store's subscriber loop,
where `state.js` caught and logged it. The scheduled run now catches the
re-thrown error itself (it's already logged by `execute()`), so a throwing
effect doesn't surface as an uncaught microtask error. The effect stays
subscribed and keeps working on subsequent changes — covered by a test.

## What you might notice (timing)

Re-runs now happen **one microtask later** than before — after the store's
flush completes rather than during subscriber notification. Anything awaiting
`setTimeout(0)`, `await Promise.resolve()` twice, or just the next frame sees
no difference. Synchronous code inspecting side effects *between* two
microtasks could observe the shift; no realistic usage pattern does this, and
the test suite (374 tests) needed zero timing changes besides the new tests.

## Relationship to `batch()` (change 05)

This change gives explicit-deps effects per-tick dedupe *unconditionally*.
Auto-tracked effects reading multiple stores still run once **per store** by
design (per-state isolation) — `batch()` is the opt-in way to coalesce those.
The two are complementary: this fixes an inconsistency inside one mode;
`batch()` adds cross-store grouping for whole code paths.

## How to verify

```bash
npx vitest run tests/core/effect.test.js -t 'coalesce'
```
