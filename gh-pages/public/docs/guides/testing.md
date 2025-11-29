# Testing

Since Lume.js uses standard JavaScript objects and DOM, testing is straightforward.

## Unit Testing State

You can test your state logic without any DOM.

```javascript
import { state } from 'lume-js';
import { test, expect } from 'vitest';

test('increment count', () => {
  const store = state({ count: 0 });
  store.count++;
  expect(store.count).toBe(1);
});
```

## Testing DOM Updates

You can use `jsdom` (included in Vitest) to test DOM updates.

```javascript
import { state, bindDom } from 'lume-js';
import { test, expect } from 'vitest';

test('updates DOM', async () => {
  document.body.innerHTML = '<span data-bind="text"></span>';
  const store = state({ text: 'Hello' });
  bindDom(document.body, store);

  // Initial render
  expect(document.querySelector('span').textContent).toBe('Hello');

  // Update
  store.text = 'World';
  
  // Wait for microtask (Lume updates are async)
  await new Promise(resolve => setTimeout(resolve, 0));
  
  expect(document.querySelector('span').textContent).toBe('World');
});
```

---

**← Previous: [Animations](animations.md)** | **Next: [Performance](performance.md) →**
