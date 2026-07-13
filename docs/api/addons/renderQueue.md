# renderQueue(options)

> **Experimental.** The scheduling model is validated by prototype, but the API surface (`schedule`/`flush`/`size`, the `data-priority` tiers) may change before it graduates to production. State semantics are never affected: only presentation is scheduled. Pin your version if you depend on the exact shape.

Makes *presentation* updates (DOM writes that mirror state) schedulable: budgeted per frame, priority-ordered, and preempted by pending input. State stays fully synchronous. Only the pixels are scheduled.

The problem it solves: when thousands of elements each repaint every frame, the browser runs one atomic long task per frame, and every keystroke, click, and scroll queues behind all of it. Low frame rate is tolerable; input waiting 200ms+ is what reads as "hung." `renderQueue` spreads those DOM writes across budgeted slices so input stays responsive while the backlog drains.

## Signature

```ts
function renderQueue(options?: { budgetMs?: number }): RenderQueue;

interface RenderQueue {
  schedule(entry: {
    el: Element;
    track: () => void;
    apply: () => void;
    priority?: 'high' | 'low' | 'idle';
  }): () => void;   // dispose
  flush(): void;
  readonly size: number;
}
```

Imported from `lume-js/addons`.

## Parameters

- `options.budgetMs` — Max milliseconds of `apply()` work per frame. Default `2`. A non-positive or non-finite value falls back to the default.

### `schedule(entry)`

- `entry.el` — **Required.** The anchor `Element`. Its viewport visibility and any `[data-priority]` ancestor decide when the entry drains.
- `entry.track` — **Required.** A function of tracked reads. It runs inside Lume's flush under a real `effect()`, so any state read here auto-arms a re-run. It only marks the entry dirty. Do not write DOM here.
- `entry.apply` — **Required.** The DOM write. It runs later, from the per-frame drain, untracked, reading current state.
- `entry.priority` — Optional explicit tier (`'high'`, `'low'`, `'idle'`) that overrides the inferred one.

Returns a dispose function that stops tracking, drops the entry from the backlog, and unobserves the element. Safe to call during a drain.

## The track/apply split

This is the load-bearing idea. `track()` and `apply()` are two halves of one binding, run at two different times:

```js
import { state } from 'lume-js';
import { renderQueue } from 'lume-js/addons';

const store = state({ hue: 0 });
const queue = renderQueue({ budgetMs: 2 });

const stop = queue.schedule({
  el: cell,
  track: () => store.hue,                                  // reads state, runs in the flush
  apply: () => { cell.style.setProperty('--h', String(store.hue)); }, // writes DOM, runs in the drain
});
```

`track()` runs inside the normal state flush, auto-tracked, so writing `store.hue` re-arms the entry the moment the value changes. It does no DOM work. `apply()` runs from the drain, untracked, and reads the current value when the browser is ready to paint. Coalescing is structural: dirty entries live in a `Set` keyed by entry, so N writes between two drains produce exactly one `apply()`, with the latest value.

State never waits on the queue. `$subscribe`, `batch()`, `computed`, and data-reading effects all stay synchronous and current. Only the entries you route through `schedule()` are deferred.

## Guarantees

- **Immediate first paint.** `schedule()` calls `apply()` once, synchronously, at registration. Nothing is queued (`size` stays `0`). This matches `effect()` running its body immediately and avoids a blank first frame.
- **One drain per frame, only while dirty.** The drain runs on `requestAnimationFrame` and is scheduled only while entries are dirty. There is no idle rAF loop, keeping the module free of import side effects.
- **Budgeted.** Each frame spends at most `budgetMs` on `apply()` calls. The budget is checked every 8 entries; work beyond it stays dirty and drains on the next frame. Nothing is lost.
- **Input-preemptible.** Where the platform supports `navigator.scheduling.isInputPending()`, the drain stops the moment a user input is waiting. Feature-detected: absent, the drain is budget-bounded only.
- **FIFO within a tier, no starvation.** The `Set` iterates in insertion order, and re-dirtying an entry moves it to the back. An entry cannot starve behind re-dirtied siblings.
- **Error-isolated.** An `apply()` that throws is logged via `logError` and dropped from that drain. It stays subscribed and re-queues on its next change. One bad entry cannot stall the queue.

## Drain order and `data-priority`

Each frame drains in tiers. `idle` entries run only if every other tier fit inside the budget.

| Tier | How an entry lands here |
|------|-------------------------|
| `high` | `priority: 'high'`, or a `[data-priority="high"]` ancestor |
| visible (auto) | inferred: `el` is in the viewport (IntersectionObserver) and no explicit tier |
| `low` / offscreen (auto) | `priority: 'low'`, a `[data-priority="low"]` ancestor, or inferred offscreen |
| `idle` | `priority: 'idle'`, or a `[data-priority="idle"]` ancestor |

Priority resolves in this order: the explicit `priority` option, then the nearest `[data-priority]` ancestor (read once, at `schedule()` time), then inferred by viewport visibility at drain time. The `data-priority` attribute is plain valid HTML, consistent with the rest of Lume's binding model:

```html
<section data-priority="high">
  <!-- entries anchored inside here always drain first -->
</section>
```

Focus-subtree and hover-subtree inference are planned for a later version. Today, inference is viewport visibility only.

## The backlog is honest — surface it

`queue.size` is the number of entries dirty and waiting to drain. Under sustained load that number is real: the work exists, it just has not painted yet. Pixels lag truth by a bounded amount, and that staleness is the product, so show it. A UI that degrades under load should read `queue.size` and tell the user (a "N cells behind" readout, a spinner, a dimmed state), the same way the repeat-grid demo displays its budget. Hiding the backlog turns a visible, recoverable lag into a silent one.

```js
effect(() => { counterEl.textContent = `${queue.size} behind`; });
```

The backlog converges: once writes stop, the drain empties `size` to `0` and the DOM settles to current state.

## `flush()`

`queue.flush()` applies every dirty entry synchronously, ignoring budget and priority. Use it for teardown and tests, where you want the DOM to match state immediately rather than on the next frame.

```js
queue.flush();          // apply everything now
queue.size;             // 0
```

## SSR and feature detection

The queue is safe to construct anywhere. `IntersectionObserver`, `requestAnimationFrame`, `performance.now`, and `navigator.scheduling.isInputPending` are each runtime-feature-detected:

- No `IntersectionObserver`: every entry is treated as visible (the auto tier collapses to "visible").
- No `requestAnimationFrame`: the drain falls back to `setTimeout(drain, 16)`, keeping "later" semantics without re-entering the flush.
- No `performance.now`: timing falls back to `Date.now()`.

There is no DOM write until you call `apply()`, so a server render that never drains produces no output. Register your entries after hydration.

## Interop

- **`batch()`** — N writes inside one `batch()` mark each affected entry dirty once; the next frame drains them together.
- **`computed`** — read a `computed` inside `track()`; the entry re-arms when the computed changes.
- **`effect()`** — the queue is built on `effect()`. Each entry owns one effect, disposed by the returned function.

## See also

- [batch()](../core/batch.md) — synchronous cross-store write grouping
- [effect()](../core/effect.md) — the auto-tracking primitive the queue builds on
- [Performance guide](../../guides/performance.md)

---

<!-- lume:nav -->
**← Previous: [isReactive()](isReactive.md)** | **Next: [Handlers API](../core/handlers.md) →**
<!-- /lume:nav -->
