/**
 * @vitest-environment jsdom
 *
 * Integration tests — validate real-world usage patterns where
 * multiple Lume.js modules work together.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { state, effect, bindDom } from 'src/index.js';
import { computed, watch } from 'src/addons/index.js';
import { show, classToggle, stringAttr, boolAttr } from 'src/handlers/index.js';
import { repeat } from 'src/addons/repeat.js';

function setupDOM(html) {
  document.body.innerHTML = html;
  return document.body;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('integration: state + effect + bindDom', () => {
  it('effect updates DOM through state changes', async () => {
    const root = setupDOM(`
      <div>
        <span data-bind="total"></span>
        <input data-bind="price" type="number" />
        <input data-bind="qty" type="number" />
      </div>
    `);
    const store = state({ price: 10, qty: 2, total: 20 });

    effect(() => {
      store.total = store.price * store.qty;
    });

    const cleanup = bindDom(root, store);
    expect(root.querySelector('span').textContent).toBe('20');

    store.price = 15;
    await new Promise(r => setTimeout(r, 10));
    expect(root.querySelector('span').textContent).toBe('30');

    cleanup();
  });

  it('computed + bindDom shows derived values', async () => {
    const store = state({ firstName: 'John', lastName: 'Doe' });
    const fullName = computed(() => `${store.firstName} ${store.lastName}`);

    const root = setupDOM(`<div><span id="full"></span></div>`);
    const span = root.querySelector('#full');

    const unsub = fullName.subscribe(val => {
      span.textContent = val;
    });

    expect(span.textContent).toBe('John Doe');

    store.firstName = 'Jane';
    await new Promise(r => setTimeout(r, 10));
    expect(span.textContent).toBe('Jane Doe');

    unsub();
  });

  it('watch triggers side effects on state changes', async () => {
    const store = state({ theme: 'light' });
    const themeChanges = [];

    const unwatch = watch(store, 'theme', val => {
      themeChanges.push(val);
    });

    expect(themeChanges).toEqual(['light']); // immediate

    store.theme = 'dark';
    await Promise.resolve();
    expect(themeChanges).toEqual(['light', 'dark']);

    unwatch();

    store.theme = 'system';
    await Promise.resolve();
    expect(themeChanges).toEqual(['light', 'dark']); // no more
  });
});

describe('integration: full app-like scenario', () => {
  it('todo app: add, toggle, filter, count', async () => {
    const store = state({
      items: [
        { id: 1, text: 'Buy milk', done: false },
        { id: 2, text: 'Write tests', done: true },
      ],
      filter: 'all',
      nextId: 3,
    });

    const activeCount = computed(() =>
      store.items.filter(i => !i.done).length
    );

    // Simulate adding a todo
    store.items = [...store.items, { id: store.nextId, text: 'New task', done: false }];
    store.nextId = store.nextId + 1;
    await new Promise(r => setTimeout(r, 10));

    expect(store.items.length).toBe(3);
    expect(activeCount.value).toBe(2);

    // Toggle a todo
    store.items = store.items.map(i =>
      i.id === 1 ? { ...i, done: true } : i
    );
    await new Promise(r => setTimeout(r, 10));
    expect(activeCount.value).toBe(1);

    // Filter
    const filtered = computed(() => {
      if (store.filter === 'active') return store.items.filter(i => !i.done);
      if (store.filter === 'done') return store.items.filter(i => i.done);
      return store.items;
    });

    expect(filtered.value).toHaveLength(3);

    store.filter = 'done';
    await new Promise(r => setTimeout(r, 10));
    expect(filtered.value).toHaveLength(2);

    store.filter = 'active';
    await new Promise(r => setTimeout(r, 10));
    expect(filtered.value).toHaveLength(1);

    activeCount.dispose();
    filtered.dispose();
  });

  it('form with validation, disabled submit, and aria feedback', async () => {
    const root = setupDOM(`
      <form>
        <input data-bind="email" type="text" />
        <span data-bind="emailError" data-show="hasError" data-class-error="hasError"></span>
        <button data-disabled="isInvalid" data-aria-expanded="showHelp">Submit</button>
      </form>
    `);

    const store = state({
      email: '',
      emailError: '',
      hasError: false,
      isInvalid: true,
      showHelp: false,
    });

    effect(() => {
      const email = store.email;
      if (!email) {
        store.hasError = false;
        store.emailError = '';
        store.isInvalid = true;
      } else if (!email.includes('@')) {
        store.hasError = true;
        store.emailError = 'Invalid email';
        store.isInvalid = true;
      } else {
        store.hasError = false;
        store.emailError = '';
        store.isInvalid = false;
      }
    });

    const cleanup = bindDom(root, store, {
      handlers: [show, classToggle('error')],
    });

    const input = root.querySelector('input');
    const span = root.querySelector('span');
    const button = root.querySelector('button');

    // Initial: empty → invalid but no error shown
    expect(button.disabled).toBe(true);
    expect(span.hidden).toBe(true);

    // Type invalid email
    input.value = 'bad';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));

    expect(store.hasError).toBe(true);
    expect(span.hidden).toBe(false);
    expect(span.classList.contains('error')).toBe(true);
    expect(button.disabled).toBe(true);

    // Type valid email
    input.value = 'user@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));

    expect(store.hasError).toBe(false);
    expect(button.disabled).toBe(false);

    cleanup();
  });
});

describe('integration: repeat + bindDom + handlers', () => {
  it('renders a list with handler-enhanced items', async () => {
    const container = document.createElement('ul');
    document.body.appendChild(container);

    const store = state({
      items: [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
      ],
    });

    repeat(container, store, 'items', {
      key: item => item.id,
      element: 'li',
      render: (item, el) => {
        el.textContent = item.name;
        el.dataset.active = String(item.active);
      },
    });

    expect(container.children.length).toBe(2);
    expect(container.children[0].tagName).toBe('LI');
    expect(container.children[0].textContent).toBe('Alice');
  });
});

describe('integration: state + plugins + debug', () => {
  it('plugin transforms flow through to bindDom', async () => {
    const clampPlugin = {
      name: 'clamp',
      onSet: (key, val) => {
        if (key === 'volume') return Math.max(0, Math.min(100, val));
        return val;
      },
    };

    const store = state({ volume: 50 }, { plugins: [clampPlugin] });

    const root = setupDOM(`<div><input type="range" data-bind="volume" min="0" max="100" /></div>`);
    const cleanup = bindDom(root, store);

    store.volume = 200;
    expect(store.volume).toBe(100); // clamped

    store.volume = -10;
    expect(store.volume).toBe(0); // clamped

    await Promise.resolve();
    expect(root.querySelector('input').value).toBe('0');

    cleanup();
  });
});

describe('integration: cleanup lifecycle', () => {
  it('all cleanup functions work correctly together', async () => {
    const store = state({ count: 0, visible: true });
    const doubleCount = computed(() => store.count * 2);

    const root = setupDOM(`
      <div>
        <span data-bind="count"></span>
        <div data-show="visible">Content</div>
      </div>
    `);

    const cleanupBind = bindDom(root, store, { handlers: [show] });
    const cleanupEffect = effect(() => { void store.count; });
    const cleanupWatch = watch(store, 'count', () => {});

    // Everything works
    store.count = 5;
    await Promise.resolve();
    expect(root.querySelector('span').textContent).toBe('5');

    // Cleanup everything
    cleanupBind();
    cleanupEffect();
    cleanupWatch();
    doubleCount.dispose();

    // State changes shouldn't affect DOM or throw
    store.count = 10;
    await Promise.resolve();
    expect(root.querySelector('span').textContent).toBe('5'); // unchanged
  });

  it('multiple bindDom calls to same root do not conflict', async () => {
    const root = setupDOM(`<div><span data-bind="val"></span></div>`);
    const store = state({ val: 'first' });

    const cleanup1 = bindDom(root, store);
    expect(root.querySelector('span').textContent).toBe('first');

    cleanup1();

    // Re-bind with new state
    const store2 = state({ val: 'second' });
    const cleanup2 = bindDom(root, store2);
    expect(root.querySelector('span').textContent).toBe('second');

    cleanup2();
  });
});

describe('integration: edge cases', () => {
  it('rapid state changes settle to correct final value', async () => {
    const store = state({ count: 0 });
    const root = setupDOM(`<div><span data-bind="count"></span></div>`);
    const cleanup = bindDom(root, store);

    // Rapid fire
    for (let i = 1; i <= 100; i++) {
      store.count = i;
    }

    await Promise.resolve();
    expect(root.querySelector('span').textContent).toBe('100');

    cleanup();
  });

  it('computed values derived from same store update independently', async () => {
    const store = state({ price: 10, qty: 3 });
    const total = computed(() => store.price * store.qty);
    const label = computed(() => `${store.qty}x $${store.price}`);

    expect(total.value).toBe(30);
    expect(label.value).toBe('3x $10');

    store.price = 20;
    await new Promise(r => setTimeout(r, 10));

    expect(total.value).toBe(60);
    expect(label.value).toBe('3x $20');

    store.qty = 5;
    await new Promise(r => setTimeout(r, 10));

    expect(total.value).toBe(100);
    expect(label.value).toBe('5x $20');

    total.dispose();
    label.dispose();
  });

  it('concurrent watches on different keys', async () => {
    const store = state({ a: 0, b: 0 });
    const aChanges = [];
    const bChanges = [];

    const unwatchA = watch(store, 'a', v => aChanges.push(v));
    const unwatchB = watch(store, 'b', v => bChanges.push(v));

    store.a = 1;
    store.b = 2;
    await Promise.resolve();

    expect(aChanges).toEqual([0, 1]);
    expect(bChanges).toEqual([0, 2]);

    unwatchA();
    unwatchB();
  });
});
