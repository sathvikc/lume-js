import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { bindDom } from 'src/core/bindDom.js';

function setupDOM(html) {
  document.body.innerHTML = html;
  return document.body;
}

describe('bindDom', () => {
  it('binds text content for non-input elements', async () => {
    const root = setupDOM(`<div><span data-bind="count"></span></div>`);
    const store = state({ count: 1 });

    const cleanup = bindDom(root, store);
    expect(root.querySelector('span').textContent).toBe('1');

    store.count = 2;
    await Promise.resolve(); // Wait for microtask batch
    expect(root.querySelector('span').textContent).toBe('2');

    cleanup();
  });

  it('supports two-way binding for input value', async () => {
    const root = setupDOM(`<div><input data-bind="name" /></div>`);
    const store = state({ name: 'Alice' });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input');

    // initial value reflected to input
    expect(input.value).toBe('Alice');

    // programmatic state change updates input
    store.name = 'Bob';
    await Promise.resolve(); // Wait for microtask batch
    expect(input.value).toBe('Bob');

    // nullish values map to empty string via ??
    store.name = null;
    await Promise.resolve(); // Wait for microtask batch
    expect(input.value).toBe('');
    store.name = undefined;
    await Promise.resolve(); // Wait for microtask batch
    expect(input.value).toBe('');

    // user typing updates state
    input.value = 'Carol';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.name).toBe('Carol');

    cleanup();
  });

  it('handles checkbox binding', async () => {
    const root = setupDOM(`<div><input type="checkbox" data-bind="done" /></div>`);
    const store = state({ done: false });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="checkbox"]');

    expect(input.checked).toBe(false);
    store.done = true;
    await Promise.resolve(); // Wait for microtask batch
    expect(input.checked).toBe(true);

    input.checked = false;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.done).toBe(false);

    cleanup();
  });

  it('ignores invalid paths gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const root = setupDOM(`<div><span data-bind="user.address.city"></span></div>`);
    const store = state({ user: null });

    const cleanup = bindDom(root, store);
    // no crash and no binding applied
    expect(root.querySelector('span').textContent).toBe('');
    cleanup();
    warnSpy.mockRestore();
  });

  it('binds select dropdown value', async () => {
    const root = setupDOM(`
      <div>
        <select data-bind="theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    `);
    const store = state({ theme: 'dark' });

    const cleanup = bindDom(root, store);
    const select = root.querySelector('select');

    expect(select.value).toBe('dark');

    store.theme = 'light';
    await Promise.resolve(); // Wait for microtask batch
    expect(select.value).toBe('light');

    // nullish selects become empty string via ??
    store.theme = undefined;
    await Promise.resolve(); // Wait for microtask batch
    expect(select.value).toBe('');

    select.value = 'dark';
    select.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.theme).toBe('dark');

    cleanup();
  });

  it('binds radio buttons', async () => {
    const root = setupDOM(`
      <div>
        <input type="radio" name="size" value="small" data-bind="size" />
        <input type="radio" name="size" value="large" data-bind="size" />
      </div>
    `);
    const store = state({ size: 'large' });

    const cleanup = bindDom(root, store);
    const radios = root.querySelectorAll('input[type="radio"]');

    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);

    store.size = 'small';
    await Promise.resolve(); // Wait for microtask batch
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);

    cleanup();
  });

  it('binds number inputs with valueAsNumber', async () => {
    const root = setupDOM(`<div><input type="number" data-bind="age" /></div>`);
    const store = state({ age: 25 });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="number"]');

    expect(input.value).toBe('25');

    store.age = 30;
    await Promise.resolve(); // Wait for microtask batch
    expect(input.value).toBe('30');

    input.value = '35';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.age).toBe(35);

    cleanup();
  });

  it('binds textarea elements', async () => {
    const root = setupDOM(`<div><textarea data-bind="bio"></textarea></div>`);
    const store = state({ bio: 'Hello world' });

    const cleanup = bindDom(root, store);
    const textarea = root.querySelector('textarea');

    expect(textarea.value).toBe('Hello world');

    store.bio = 'Updated bio';
    await Promise.resolve(); // Wait for microtask batch
    expect(textarea.value).toBe('Updated bio');

    // nullish values map to empty string via ??
    store.bio = null;
    await Promise.resolve(); // Wait for microtask batch
    expect(textarea.value).toBe('');
    store.bio = undefined;
    await Promise.resolve(); // Wait for microtask batch
    expect(textarea.value).toBe('');

    textarea.value = 'User typed';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.bio).toBe('User typed');

    cleanup();
  });

  it('handles nested state paths', async () => {
    const root = setupDOM(`<div><span data-bind="user.name"></span></div>`);
    const userStore = state({ name: 'Alice' });
    const store = state({ user: userStore });

    const cleanup = bindDom(root, store);
    const span = root.querySelector('span');

    expect(span.textContent).toBe('Alice');

    userStore.name = 'Bob';
    await Promise.resolve(); // Wait for microtask batch
    expect(span.textContent).toBe('Bob');

    cleanup();
  });

  it('handles empty or null values gracefully', async () => {
    const root = setupDOM(`<div><span data-bind="value"></span></div>`);
    const store = state({ value: null });

    const cleanup = bindDom(root, store);
    const span = root.querySelector('span');

    expect(span.textContent).toBe('');

    store.value = undefined;
    await Promise.resolve(); // Wait for microtask batch
    expect(span.textContent).toBe('');

    store.value = 'text';
    await Promise.resolve(); // Wait for microtask batch
    expect(span.textContent).toBe('text');

    cleanup();
  });

  it('skips elements with empty data-bind attribute', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const root = setupDOM(`<div><span data-bind=""></span></div>`);
    const store = state({ count: 1 });

    const cleanup = bindDom(root, store);
    // should not crash
    cleanup();
    warnSpy.mockRestore();
  });

  it('throws error for invalid root element', () => {
    const store = state({ count: 1 });
    expect(() => bindDom(null, store)).toThrow('bindDom() requires a valid HTMLElement as root');
    expect(() => bindDom({}, store)).toThrow('bindDom() requires a valid HTMLElement as root');
  });

  it('throws error for invalid store', () => {
    const root = setupDOM(`<div><span data-bind="count"></span></div>`);
    expect(() => bindDom(root, null)).toThrow('bindDom() requires a reactive state object');
    expect(() => bindDom(root, 123)).toThrow('bindDom() requires a reactive state object');
  });

  it('warns for non-reactive nested targets', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
    const root = setupDOM(`<div><span data-bind="user.name"></span></div>`);
    const store = state({ user: { name: 'plain object' } });

    const cleanup = bindDom(root, store);
    // should warn but not crash
    cleanup();
    warnSpy.mockRestore();
  });

  it('updates multiple nodes bound to the same key', async () => {
    const root = setupDOM(`
      <div>
        <span data-bind="count"></span>
        <span data-bind="count"></span>
        <input data-bind="count" />
      </div>
    `);
    const store = state({ count: 1 });

    const cleanup = bindDom(root, store);
    const spans = root.querySelectorAll('span');
    const input = root.querySelector('input');

    expect(spans[0].textContent).toBe('1');
    expect(spans[1].textContent).toBe('1');
    expect(input.value).toBe('1');

    store.count = 5;
    await Promise.resolve(); // Wait for microtask batch
    expect(spans[0].textContent).toBe('5');
    expect(spans[1].textContent).toBe('5');
    expect(input.value).toBe('5');

    input.value = '6';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.count).toBe('6');
    await Promise.resolve(); // Wait for microtask batch
    expect(spans[0].textContent).toBe('6');
    expect(spans[1].textContent).toBe('6');

    cleanup();
  });

  it('radio user interaction updates state', () => {
    const root = setupDOM(`
      <div>
        <input type="radio" name="opt" value="a" data-bind="opt" />
        <input type="radio" name="opt" value="b" data-bind="opt" />
      </div>
    `);
    const store = state({ opt: 'a' });

    const cleanup = bindDom(root, store);
    const radios = root.querySelectorAll('input[type="radio"]');

    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);

    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.opt).toBe('b');

    cleanup();
  });

  it('number input sets NaN for non-numeric', () => {
    const root = setupDOM(`<div><input type="number" data-bind="age" /></div>`);
    const store = state({ age: 0 });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="number"]');

    input.value = 'not-a-number';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(Number.isNaN(store.age)).toBe(true);

    cleanup();
  });

  it('range input uses valueAsNumber (right side of OR)', async () => {
    const root = setupDOM(`<div><input type="range" min="0" max="10" data-bind="level" /></div>`);
    const store = state({ level: 0 });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="range"]');

    // programmatic state updates UI
    store.level = 7;
    await Promise.resolve(); // Wait for microtask batch
    expect(input.value).toBe('7');

    // user input updates state via valueAsNumber (right-hand branch)
    input.value = '9';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.level).toBe(9);

    cleanup();
  });

  it('cleanup stops DOM updates from subsequent state changes', () => {
    const root = setupDOM(`<div><span data-bind="val"></span></div>`);
    const store = state({ val: 'x' });

    const cleanup = bindDom(root, store);
    const span = root.querySelector('span');
    expect(span.textContent).toBe('x');

    cleanup();
    store.val = 'y';
    // After cleanup, DOM should not update further
    expect(span.textContent).toBe('x');
  });

  describe('auto-ready functionality', () => {
    it('binds immediately when document is already ready', async () => {
      // Simulate document already loaded (default state in tests)
      const root = setupDOM(`<div><span data-bind="count"></span></div>`);
      const store = state({ count: 42 });

      const cleanup = bindDom(root, store);

      // Should bind immediately since document.readyState !== 'loading'
      expect(root.querySelector('span').textContent).toBe('42');

      cleanup();
    });

    it('binds immediately with immediate option set to true', async () => {
      const root = setupDOM(`<div><span data-bind="count"></span></div>`);
      const store = state({ count: 99 });

      const cleanup = bindDom(root, store, { immediate: true });

      // Should bind immediately with immediate flag
      expect(root.querySelector('span').textContent).toBe('99');

      cleanup();
    });

    it('waits for DOMContentLoaded when document is loading', async () => {
      const root = setupDOM(`<div><span data-bind="count"></span></div>`);
      const store = state({ count: 123 });

      // Mock document.readyState as 'loading'
      const readyStateGetter = vi.fn(() => 'loading');
      Object.defineProperty(document, 'readyState', {
        get: readyStateGetter,
        configurable: true
      });

      let domContentLoadedListener = null;
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = vi.fn((event, listener, options) => {
        if (event === 'DOMContentLoaded') {
          domContentLoadedListener = listener;
        }
        return originalAddEventListener.call(document, event, listener, options);
      });

      const cleanup = bindDom(root, store);

      // Should not bind yet - DOM is 'loading'
      expect(root.querySelector('span').textContent).toBe('');
      expect(document.addEventListener).toHaveBeenCalledWith(
        'DOMContentLoaded',
        expect.any(Function),
        { once: true }
      );

      // Simulate DOMContentLoaded event
      if (domContentLoadedListener) {
        domContentLoadedListener();
      }

      // Now should be bound
      expect(root.querySelector('span').textContent).toBe('123');

      // Restore original state
      Object.defineProperty(document, 'readyState', {
        get: () => 'complete',
        configurable: true
      });
      document.addEventListener = originalAddEventListener;

      cleanup();
    });

    it('cleanup before DOMContentLoaded removes event listener', async () => {
      const root = setupDOM(`<div><span data-bind="count"></span></div>`);
      const store = state({ count: 456 });

      // Mock document.readyState as 'loading'
      const readyStateGetter = vi.fn(() => 'loading');
      Object.defineProperty(document, 'readyState', {
        get: readyStateGetter,
        configurable: true
      });

      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const cleanup = bindDom(root, store);

      // Call cleanup before DOMContentLoaded fires
      cleanup();

      // Should have removed the event listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'DOMContentLoaded',
        expect.any(Function)
      );

      // Restore original state
      Object.defineProperty(document, 'readyState', {
        get: () => 'complete',
        configurable: true
      });

      removeEventListenerSpy.mockRestore();
    });

    it('immediate option bypasses auto-wait even when loading', async () => {
      const root = setupDOM(`<div><span data-bind="count"></span></div>`);
      const store = state({ count: 789 });

      // Mock document.readyState as 'loading'
      const readyStateGetter = vi.fn(() => 'loading');
      Object.defineProperty(document, 'readyState', {
        get: readyStateGetter,
        configurable: true
      });

      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const cleanup = bindDom(root, store, { immediate: true });

      // Should bind immediately, not wait for DOMContentLoaded
      expect(root.querySelector('span').textContent).toBe('789');

      // Should NOT have added event listener
      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'DOMContentLoaded',
        expect.any(Function),
        expect.any(Object)
      );

      // Restore original state
      Object.defineProperty(document, 'readyState', {
        get: () => 'complete',
        configurable: true
      });

      addEventListenerSpy.mockRestore();
      cleanup();
    });
  });

  describe('event delegation', () => {
    it('handles input events from deeply nested elements', () => {
      const root = setupDOM(`
        <div>
          <section>
            <form>
              <div class="form-group">
                <input data-bind="value" />
              </div>
            </form>
          </section>
        </div>
      `);
      const store = state({ value: '' });
      const cleanup = bindDom(root, store);

      const input = root.querySelector('input');
      input.value = 'deeply-nested-value';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      expect(store.value).toBe('deeply-nested-value');
      cleanup();
    });

    it('ignores input events from elements without data-bind', () => {
      const root = setupDOM(`
        <div>
          <input id="bound" data-bind="value" />
          <input id="unbound" />
        </div>
      `);
      const store = state({ value: 'initial' });
      const cleanup = bindDom(root, store);

      // Unbound input should not affect state
      const unbound = root.querySelector('#unbound');
      unbound.value = 'should-be-ignored';
      unbound.dispatchEvent(new Event('input', { bubbles: true }));

      expect(store.value).toBe('initial');
      cleanup();
    });

    it('handles multiple different input types with single delegated listener', () => {
      const root = setupDOM(`
        <div>
          <input type="text" data-bind="text" />
          <input type="checkbox" data-bind="checked" />
          <input type="number" data-bind="num" />
          <textarea data-bind="area"></textarea>
          <select data-bind="sel">
            <option value="a">A</option>
            <option value="b">B</option>
          </select>
        </div>
      `);
      const store = state({ text: '', checked: false, num: 0, area: '', sel: 'a' });
      const cleanup = bindDom(root, store);

      // Text input
      const textInput = root.querySelector('input[type="text"]');
      textInput.value = 'hello';
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.text).toBe('hello');

      // Checkbox
      const checkbox = root.querySelector('input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.checked).toBe(true);

      // Number input
      const numberInput = root.querySelector('input[type="number"]');
      numberInput.value = '42';
      numberInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.num).toBe(42);

      // Textarea
      const textarea = root.querySelector('textarea');
      textarea.value = 'multiline';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.area).toBe('multiline');

      // Select
      const select = root.querySelector('select');
      select.value = 'b';
      select.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.sel).toBe('b');

      cleanup();
    });

    it('stops responding to events after cleanup', () => {
      const root = setupDOM(`<div><input data-bind="value" /></div>`);
      const store = state({ value: 'before' });
      const cleanup = bindDom(root, store);

      const input = root.querySelector('input');

      // Before cleanup - should update
      input.value = 'during';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.value).toBe('during');

      // Cleanup
      cleanup();

      // After cleanup - should NOT update (delegated listener removed)
      input.value = 'after';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.value).toBe('during'); // Still the old value
    });

    it('handles events from inputs added to DOM before bindDom was called', () => {
      // This verifies the standard case - inputs exist when bindDom runs
      const root = setupDOM(`
        <div>
          <input id="first" data-bind="first" />
          <input id="second" data-bind="second" />
        </div>
      `);
      const store = state({ first: '', second: '' });
      const cleanup = bindDom(root, store);

      const first = root.querySelector('#first');
      const second = root.querySelector('#second');

      first.value = 'one';
      first.dispatchEvent(new Event('input', { bubbles: true }));

      second.value = 'two';
      second.dispatchEvent(new Event('input', { bubbles: true }));

      expect(store.first).toBe('one');
      expect(store.second).toBe('two');

      cleanup();
    });
  });

  describe('data-{attr} reactive attributes', () => {
    describe('data-hidden', () => {
      it('adds hidden attribute when state is truthy', async () => {
        const root = setupDOM(`<div><span data-hidden="isHidden">Content</span></div>`);
        const store = state({ isHidden: true });

        const cleanup = bindDom(root, store);
        const span = root.querySelector('span');

        expect(span.hasAttribute('hidden')).toBe(true);

        store.isHidden = false;
        await Promise.resolve();
        expect(span.hasAttribute('hidden')).toBe(false);

        cleanup();
      });

      it('removes hidden attribute when state is falsy', async () => {
        const root = setupDOM(`<div><span data-hidden="isHidden">Content</span></div>`);
        const store = state({ isHidden: false });

        const cleanup = bindDom(root, store);
        const span = root.querySelector('span');

        expect(span.hasAttribute('hidden')).toBe(false);

        store.isHidden = true;
        await Promise.resolve();
        expect(span.hasAttribute('hidden')).toBe(true);

        cleanup();
      });
    });

    describe('data-disabled', () => {
      it('toggles disabled attribute on inputs', async () => {
        const root = setupDOM(`<div><input data-disabled="isDisabled" /></div>`);
        const store = state({ isDisabled: true });

        const cleanup = bindDom(root, store);
        const input = root.querySelector('input');

        expect(input.hasAttribute('disabled')).toBe(true);

        store.isDisabled = false;
        await Promise.resolve();
        expect(input.hasAttribute('disabled')).toBe(false);

        cleanup();
      });
    });

    describe('data-aria-expanded', () => {
      it('sets aria-expanded to "true" when state is truthy', async () => {
        const root = setupDOM(`<div><button data-aria-expanded="isOpen">Menu</button></div>`);
        const store = state({ isOpen: true });

        const cleanup = bindDom(root, store);
        const button = root.querySelector('button');

        expect(button.getAttribute('aria-expanded')).toBe('true');

        store.isOpen = false;
        await Promise.resolve();
        expect(button.getAttribute('aria-expanded')).toBe('false');

        cleanup();
      });

      it('sets aria-expanded to "false" when state is falsy', async () => {
        const root = setupDOM(`<div><button data-aria-expanded="menuOpen">Menu</button></div>`);
        const store = state({ menuOpen: false });

        const cleanup = bindDom(root, store);
        const button = root.querySelector('button');

        expect(button.getAttribute('aria-expanded')).toBe('false');

        store.menuOpen = true;
        await Promise.resolve();
        expect(button.getAttribute('aria-expanded')).toBe('true');

        cleanup();
      });
    });

    describe('combined usage', () => {
      it('supports multiple reactive attributes on same element', async () => {
        const root = setupDOM(`
          <div>
            <button 
              data-disabled="isDisabled" 
              data-aria-expanded="isOpen"
            >Menu</button>
          </div>
        `);
        const store = state({
          isDisabled: false,
          isOpen: false
        });

        const cleanup = bindDom(root, store);
        const button = root.querySelector('button');

        expect(button.hasAttribute('disabled')).toBe(false);
        expect(button.getAttribute('aria-expanded')).toBe('false');

        store.isDisabled = true;
        store.isOpen = true;
        await Promise.resolve();

        expect(button.hasAttribute('disabled')).toBe(true);
        expect(button.getAttribute('aria-expanded')).toBe('true');

        cleanup();
      });

      it('coexists with data-bind', async () => {
        const root = setupDOM(`
          <div>
            <input data-bind="name" />
            <div data-hidden="isHidden">Hidden</div>
          </div>
        `);
        const store = state({ name: 'Alice', isHidden: true });

        const cleanup = bindDom(root, store);
        const input = root.querySelector('input');
        const div = root.querySelector('div > div');

        expect(input.value).toBe('Alice');
        expect(div.hasAttribute('hidden')).toBe(true);

        cleanup();
      });
    });
  });

  describe('data-bind-scope boundaries', () => {
    const typeInto = (input, value) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    it('keeps an outer bindDom out of a nested island', async () => {
      const root = setupDOM(`
        <div id="page">
          <h1 data-bind="title"></h1>
          <div id="island" data-bind-scope><input data-bind="query" /></div>
        </div>`);
      const outer = state({ title: 'Page' });
      const inner = state({ query: 'b0' });

      const stopOuter = bindDom(root.querySelector('#page'), outer);
      const stopInner = bindDom(root.querySelector('#island'), inner);
      const input = root.querySelector('input');

      expect(root.querySelector('h1').textContent).toBe('Page');
      expect(input.value).toBe('b0');

      typeInto(input, 'typed');
      await Promise.resolve();
      expect(inner.query).toBe('typed');
      expect('query' in outer).toBe(false); // no stray key written to the outer store

      inner.query = 'fromInner';
      await Promise.resolve();
      expect(input.value).toBe('fromInner');

      stopOuter();
      stopInner();
    });

    it('skips handler attributes inside the scope too, regardless of bind order', async () => {
      const root = setupDOM(`
        <div id="page">
          <div id="island" data-bind-scope><p data-hidden="closed">hi</p></div>
        </div>`);
      const outer = state({ closed: true });
      const inner = state({ closed: false });

      // Inner first, then outer: the outer must still not take the <p> over
      const stopInner = bindDom(root.querySelector('#island'), inner);
      const stopOuter = bindDom(root.querySelector('#page'), outer);
      expect(root.querySelector('p').hidden).toBe(false);

      outer.closed = false;
      inner.closed = true;
      await Promise.resolve();
      expect(root.querySelector('p').hidden).toBe(true);

      stopOuter();
      stopInner();
    });

    it("still binds the scope element's own attributes from the outer store", async () => {
      const root = setupDOM(`
        <div id="page"><div id="island" data-bind-scope data-hidden="widgetOff"></div></div>`);
      const outer = state({ widgetOff: false });

      const cleanup = bindDom(root.querySelector('#page'), outer);
      const island = root.querySelector('#island');
      expect(island.hidden).toBe(false);

      outer.widgetOff = true;
      await Promise.resolve();
      expect(island.hidden).toBe(true);

      cleanup();
    });

    it('lets each level of deeply nested scopes bind only its own region', () => {
      const root = setupDOM(`
        <div id="a"><span data-bind="v"></span>
          <div id="b" data-bind-scope><span data-bind="v"></span>
            <section><div id="c" data-bind-scope><span data-bind="v"></span></div></section>
          </div>
        </div>`);
      // Outermost last, so an outer binding would win if it reached inside
      const stops = ['c', 'b', 'a'].map(id => bindDom(root.querySelector('#' + id), state({ v: id })));

      expect([...root.querySelectorAll('span')].map(s => s.textContent)).toEqual(['a', 'b', 'c']);
      stops.forEach(stop => stop());
    });

    it('binds normally when the root itself sits inside a scope', () => {
      const root = setupDOM(`
        <div data-bind-scope><div id="inner"><span data-bind="v"></span></div></div>`);
      const cleanup = bindDom(root.querySelector('#inner'), state({ v: 'ok' }));

      expect(root.querySelector('span').textContent).toBe('ok');
      cleanup();
    });
  });

  describe('path resolution', () => {
    it('binds flat key (no path splitting)', async () => {
      const root = setupDOM(`<div><span data-bind="count"></span></div>`);
      const store = state({ count: 42 });
      const cleanup = bindDom(root, store);
      expect(root.querySelector('span').textContent).toBe('42');
      cleanup();
    });

    it('stays quiet for a null intermediate and activates when it is assigned', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="profile.name">static</span></div>`);
      const store = state({ profile: null });
      const cleanup = bindDom(root, store);
      const span = root.querySelector('span');

      expect(warnSpy).not.toHaveBeenCalled(); // null is normal async state
      expect(span.textContent).toBe('');

      store.profile = state({ name: 'Ada' });
      await Promise.resolve();
      expect(span.textContent).toBe('Ada');

      store.profile.name = 'Grace';
      await Promise.resolve();
      expect(span.textContent).toBe('Grace');

      store.profile = null;
      await Promise.resolve();
      expect(span.textContent).toBe('');
      expect(warnSpy).not.toHaveBeenCalled();

      cleanup();
    });

    it('follows a replaced intermediate state and drops the old one', async () => {
      const root = setupDOM(`<div><span data-bind="user.name"></span></div>`);
      const oldUser = state({ name: 'Alex' });
      const store = state({ user: oldUser });
      const cleanup = bindDom(root, store);
      const span = root.querySelector('span');
      expect(span.textContent).toBe('Alex');

      store.user = state({ name: 'Sam' });
      await Promise.resolve();
      expect(span.textContent).toBe('Sam');

      oldUser.name = 'Ghost'; // the replaced object no longer drives the DOM
      await Promise.resolve();
      expect(span.textContent).toBe('Sam');

      cleanup();
    });

    it('writes typed input to the current object after replacement', async () => {
      const root = setupDOM(`<div><input data-bind="user.name" /></div>`);
      const oldUser = state({ name: 'Alex' });
      const store = state({ user: oldUser });
      const cleanup = bindDom(root, store);
      const input = root.querySelector('input');

      const newUser = state({ name: 'Sam' });
      store.user = newUser;
      await Promise.resolve();
      expect(input.value).toBe('Sam');

      input.value = 'Samuel';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(newUser.name).toBe('Samuel');
      expect(oldUser.name).toBe('Alex');

      // A broken chain has no target: typing writes nowhere
      store.user = null;
      await Promise.resolve();
      input.value = 'lost';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(newUser.name).toBe('Samuel');
      expect(store.user).toBe(null);

      cleanup();
    });

    it('re-links deep paths when a middle object is replaced', async () => {
      const root = setupDOM(`<div><span data-bind="user.address.city"></span></div>`);
      const store = state({ user: state({ address: state({ city: 'Oslo' }) }) });
      const cleanup = bindDom(root, store);
      const span = root.querySelector('span');
      expect(span.textContent).toBe('Oslo');

      store.user.address = state({ city: 'Lima' });
      await Promise.resolve();
      expect(span.textContent).toBe('Lima');

      store.user = state({ address: state({ city: 'Pune' }) });
      await Promise.resolve();
      expect(span.textContent).toBe('Pune');

      cleanup();
    });

    it('applies the same path semantics to handler attributes', async () => {
      const root = setupDOM(`<div><p data-hidden="user.banned">hi</p></div>`);
      const store = state({ user: null });
      const cleanup = bindDom(root, store);
      const p = root.querySelector('p');
      expect(p.hidden).toBe(false);

      store.user = state({ banned: true });
      await Promise.resolve();
      expect(p.hidden).toBe(true);

      store.user = state({ banned: false });
      await Promise.resolve();
      expect(p.hidden).toBe(false);

      cleanup();
    });

    it('leaves zero subscriptions after cleanup, across every link', async () => {
      let live = 0;
      const counted = (s) => new Proxy(s, {
        get(target, key, receiver) {
          if (key !== '$subscribe') return Reflect.get(target, key, receiver);
          return (k, fn) => {
            live++;
            const unsub = target.$subscribe(k, fn);
            let done = false;
            return () => { if (!done) { done = true; live--; } unsub(); };
          };
        }
      });
      const root = setupDOM(`<div><input data-bind="user.address.city" /><p data-hidden="user.banned"></p></div>`);
      const store = counted(state({ user: counted(state({ banned: false, address: counted(state({ city: 'Oslo' })) })) }));

      const cleanup = bindDom(root, store);
      expect(live).toBe(5); // user + address + city, user + banned

      store.user = counted(state({ banned: true, address: counted(state({ city: 'Lima' })) }));
      await Promise.resolve();
      expect(live).toBe(5); // old links released, new ones made

      cleanup();
      expect(live).toBe(0);
      cleanup(); // idempotent
      expect(live).toBe(0);
    });

    it('warns when an intermediate is later replaced by a plain object', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="user.name"></span></div>`);
      const store = state({ user: state({ name: 'A' }) });
      const cleanup = bindDom(root, store);

      store.user = { name: 'plain' };
      await Promise.resolve();
      expect(root.querySelector('span').textContent).toBe('');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"user.name" is not reactive at "name"'));
      cleanup();
    });

    it('steps through plain objects and arrays to reactive state, as before', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="list.0.name"></span><input data-bind="cfg.user.name" /></div>`);
      const item = state({ name: 'zero' });
      const user = state({ name: 'x' });
      const store = state({ list: [item], cfg: { user } });
      const cleanup = bindDom(root, store);
      const [span, input] = [root.querySelector('span'), root.querySelector('input')];
      expect([span.textContent, input.value]).toEqual(['zero', 'x']);

      item.name = 'one';
      user.name = 'y';
      await Promise.resolve();
      expect([span.textContent, input.value]).toEqual(['one', 'y']);

      input.value = 'typed';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(user.name).toBe('typed');

      // Replacing the reactive key above a plain step still re-links
      const next = state({ name: 'z' });
      store.cfg = { user: next };
      await Promise.resolve();
      expect(input.value).toBe('z');

      expect(warnSpy).not.toHaveBeenCalled();
      cleanup();
    });

    it('leaves a null reached through a plain object quiet and unbound, as before', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="cfg.user.name">Loading</span></div>`);
      const cleanup = bindDom(root, state({ cfg: { user: null } }));
      expect(warnSpy).not.toHaveBeenCalled();
      cleanup();
    });

    it('warns when a path steps into a primitive', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="count.value"></span></div>`);
      const cleanup = bindDom(root, state({ count: 5 }));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not reactive at "value"'));
      cleanup();
    });

    it('warns when an intermediate key does not exist (likely a typo)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="usr.name"></span></div>`);
      const cleanup = bindDom(root, state({ user: null }));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"usr.name"'));
      cleanup();
    });

    it('warns and skips when the root store is not reactive', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="count">0</span></div>`);
      const cleanup = bindDom(root, { count: 5 });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not reactive'));
      expect(root.querySelector('span').textContent).toBe('0');
      cleanup();
    });

    it('warns and skips when property does not exist in path', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const root = setupDOM(`<div><span data-bind="user.age"></span></div>`);
      const store = state({ user: { name: 'A' } });
      const cleanup = bindDom(root, store);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Lume.js]'));
      cleanup();
      warnSpy.mockRestore();
    });

    it('propagates unexpected errors instead of swallowing them', () => {
      const root = setupDOM(`<div><span data-bind="user.name"></span></div>`);
      const store = state({
        get user() { throw new Error('getter boom'); }
      });
      expect(() => bindDom(root, store)).toThrow('getter boom');
    });
  });

  describe('edge cases', () => {
    it('select-multiple only captures first selected value', async () => {
      const root = setupDOM(`
        <div>
          <select data-bind="choices" multiple>
            <option value="a" selected>A</option>
            <option value="b" selected>B</option>
            <option value="c">C</option>
          </select>
        </div>
      `);
      const store = state({ choices: '' });

      const cleanup = bindDom(root, store);
      const select = root.querySelector('select');

      select.options[0].selected = true;
      select.options[1].selected = true;
      select.dispatchEvent(new Event('input', { bubbles: true }));

      // el.value returns only the first selected option
      expect(typeof store.choices).toBe('string');

      cleanup();
    });
  });
});
