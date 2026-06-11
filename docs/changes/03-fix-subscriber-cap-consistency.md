# 03 — fix(core): subscriber cap now applies to effects too, and fails loudly

| | |
|---|---|
| **Type** | Bug fix (consistency + observability) |
| **Files changed** | `src/core/state.js` |
| **Tests** | `tests/core/state.test.js` → updated cap test + new effect-cap test |
| **Breaking?** | Console output changes from `warn` to `error` at the cap; effects now share the cap (see "Who could notice") |

## Background

v2.2.1 added subscriber DoS protection: each store key holds at most **1000**
listeners. But the cap had two problems.

### Problem 1 — it only applied to half the system

There are two ways to listen to a key, and they took different code paths:

```js
store.$subscribe('items', cb);     // capped at 1000 ✅
effect(() => { void store.items }); // NOT capped — unbounded growth ❌
```

`effect()` subscribes through an internal `registerEffect` path that simply
never checked the limit. The DoS protection could be bypassed by the
library's own primary primitive, and a leak of un-disposed effects (the most
common kind of leak) grew without bound while plain subscriptions were capped.

### Problem 2 — it failed silently

At the cap, `$subscribe` logged a **warning** and returned a no-op
unsubscribe. Subscriber #1001 simply never fired — no error, nothing thrown,
just a UI that stops updating. A protection mechanism that silently breaks the
1001st *legitimate* listener is indistinguishable from a bug in your app.

## The fix

Both paths now register through one shared `addListener(key, fn, kind)`
helper:

- **Same cap for both** — `$subscribe` callbacks and effect subscriptions
  count against the same per-key limit of 1000 and degrade the same way.
- **Loud failure** — at the cap, a `console.error` (not warn) explains
  exactly what was ignored and why it usually happens:

  ```text
  [Lume.js state] Subscriber limit (1000) reached for key "items".
  Effect subscription ignored — it will NOT receive updates.
  This usually means subscriptions are created in a loop without cleanup.
  ```

- **Less duplication** — the identical unsubscribe/splice logic that existed
  in both `registerEffect` and `$subscribe` now lives in one place.

An effect whose subscription is rejected still performs its initial run (it
just won't re-run for that key), and its cleanup function is a safe no-op.

## Who could notice

- Apps with >1000 live **effects reading the same key of the same store**
  previously "worked" (unboundedly); effect #1001 now gets no subscription and
  a console error. If you legitimately need that many listeners on one key,
  that's the signal to subscribe once and fan out yourself — or to file an
  issue about making the cap configurable per store, which is the natural
  follow-up if real apps hit this.
- Anything asserting on the old `console.warn` text.

## Example: the leak this makes visible

```js
// Classic leak: re-creating effects on every render-ish call without cleanup
function showPanel() {
  effect(() => {
    panel.textContent = store.status; // new subscription EVERY call
  });
}
// Called 1000+ times → before: silent unbounded growth.
// Now: console.error pinpointing the key, on the 1001st call.
```

## How to verify

```bash
npx vitest run tests/core/state.test.js -t 'subscriber cap'
npx vitest run tests/core/state.test.js -t 'maximum number of subscribers'
```
