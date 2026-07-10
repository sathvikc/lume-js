# Testing

Lume uses standard JavaScript objects and the standard DOM, so testing requires no special setup. Unit tests run without a DOM, and DOM tests work with any environment that provides one (Vitest ships with jsdom).

## Unit testing state

State logic is plain JavaScript — test it directly without touching the DOM.

```javascript
import { state } from 'lume-js';
import { test, expect } from 'vitest';

test('increment count', () => {
  const store = state({ count: 0 });
  store.count++;
  expect(store.count).toBe(1);
});
```

## Testing DOM updates

Lume batches DOM updates via `queueMicrotask`, so after writing to the store you need to yield to the microtask queue before asserting. A zero-millisecond `setTimeout` is the simplest way to do this.

```javascript
import { state, bindDom } from 'lume-js';
import { test, expect } from 'vitest';

test('updates DOM', async () => {
  document.body.innerHTML = '<span data-bind="text"></span>';
  const store = state({ text: 'Hello' });
  bindDom(document.body, store);

  expect(document.querySelector('span').textContent).toBe('Hello');

  store.text = 'World';

  // Wait for the microtask flush
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(document.querySelector('span').textContent).toBe('World');
});
```

---

<!-- lume:nav -->
**← Previous: [Animations](animations.md)** | **Next: [Performance](performance.md) →**
<!-- /lume:nav -->
