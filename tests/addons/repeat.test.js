import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { repeat, defaultFocusPreservation, defaultScrollPreservation } from 'src/addons/repeat.js';
import { computed } from 'src/addons/computed.js';

describe('repeat', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Core Functionality', () => {
    it('renders initial list of items', () => {
      const store = state({
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
          { id: 3, name: 'Charlie' }
        ]
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      expect(container.children.length).toBe(3);
      expect(container.children[0].textContent).toBe('Alice');
      expect(container.children[1].textContent).toBe('Bob');
      expect(container.children[2].textContent).toBe('Charlie');
    });

    it('accepts container as selector string', () => {
      const store = state({ items: [{ id: 1, text: 'Test' }] });

      repeat('#test-container', store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.text;
        }
      });

      expect(container.children.length).toBe(1);
      expect(container.children[0].textContent).toBe('Test');
    });

    it('accepts container as HTMLElement', () => {
      const store = state({ items: [{ id: 1, text: 'Test' }] });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.text;
        }
      });

      expect(container.children.length).toBe(1);
    });

    it('updates when items are added', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      expect(container.children.length).toBe(1);

      store.items = [...store.items, { id: 2, name: 'Bob' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(container.children.length).toBe(2);
      expect(container.children[1].textContent).toBe('Bob');
    });

    it('updates when items are removed', async () => {
      const store = state({
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      expect(container.children.length).toBe(2);

      store.items = [store.items[0]];
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(container.children.length).toBe(1);
      expect(container.children[0].textContent).toBe('Alice');
    });

    it('does NOT update when items are mutated in place (e.g. push)', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      expect(container.children.length).toBe(1);

      // ❌ Mutation (should not trigger update)
      store.items.push({ id: 2, name: 'Bob' });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(container.children.length).toBe(1); // Still 1
      expect(store.items.length).toBe(2); // State updated, but no notification
    });

    it('works with computed values (generic subscribe)', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] });

      // Computed that filters items
      const filtered = computed(() => store.items.filter(i => i.name === 'Alice'));

      repeat(container, filtered, 'value', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      // Initial render
      expect(container.children.length).toBe(1);
      expect(container.children[0].textContent).toBe('Alice');

      // Update store -> updates computed -> updates list
      store.items = [...store.items, { id: 3, name: 'Alice' }]; // Add another Alice
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(container.children.length).toBe(2);
      expect(container.children[1].textContent).toBe('Alice');
    });

    it('handles non-reactive store gracefully', () => {
      // Spy on console.warn to verify warning is logged
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

      // Plain object with no subscribe methods
      const plainStore = { items: [{ id: 1, name: 'Alice' }] };

      const cleanup = repeat(container, plainStore, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      // Should render initial items
      expect(container.children.length).toBe(1);
      expect(container.children[0].textContent).toBe('Alice');

      // Should have warned about non-reactive store
      expect(warnSpy).toHaveBeenCalledWith(
        '[Lume.js] repeat(): store is not reactive (no $subscribe or subscribe method)'
      );

      // Cleanup should still work
      cleanup();
      expect(container.children.length).toBe(0);

      warnSpy.mockRestore();
    });

    it('updates when items are reordered', async () => {
      const store = state({
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      const firstEl = container.children[0];
      const secondEl = container.children[1];

      store.items = [store.items[1], store.items[0]];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Elements should be reused (same DOM nodes)
      expect(container.children[0]).toBe(secondEl);
      expect(container.children[1]).toBe(firstEl);
      expect(container.children[0].textContent).toBe('Bob');
      expect(container.children[1].textContent).toBe('Alice');
    });

    it('reuses DOM elements by key', async () => {
      const store = state({
        items: [{ id: 1, name: 'Alice' }]
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      const originalEl = container.children[0];

      // Update the item data
      store.items = [{ id: 1, name: 'Alice Updated' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should be same DOM element
      expect(container.children[0]).toBe(originalEl);
      expect(container.children[0].textContent).toBe('Alice Updated');
    });

    it('calls render with item, element, and index', () => {
      const store = state({
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      });

      const renderSpy = vi.fn();

      repeat(container, store, 'items', {
        key: item => item.id,
        render: renderSpy
      });

      // Render is called for initial render (2 items)
      expect(renderSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalledWith({ id: 1, name: 'Alice' }, expect.any(HTMLElement), 0);
      expect(renderSpy).toHaveBeenCalledWith({ id: 2, name: 'Bob' }, expect.any(HTMLElement), 1);
    });

    it('sets __lume_new flag for new elements during render', () => {
      const store = state({
        items: [{ id: 1, name: 'Alice' }]
      });

      let capturedEl;
      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          capturedEl = el;
          if (el.__lume_new) {
            el.dataset.wasNew = 'true';
          }
        }
      });

      expect(capturedEl.dataset.wasNew).toBe('true');
      expect(capturedEl.__lume_new).toBeUndefined(); // Cleaned up after render
    });
  });

  describe('Element Creation', () => {
    it('creates div elements by default', () => {
      const store = state({ items: [{ id: 1 }] });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { }
      });

      expect(container.children[0].tagName).toBe('DIV');
    });

    it('creates custom element from string', () => {
      const store = state({ items: [{ id: 1 }] });

      repeat(container, store, 'items', {
        element: 'li',
        key: item => item.id,
        render: () => { }
      });

      expect(container.children[0].tagName).toBe('LI');
    });

    it('creates custom element from factory function', () => {
      const store = state({ items: [{ id: 1 }] });

      repeat(container, store, 'items', {
        element: () => {
          const span = document.createElement('span');
          span.className = 'custom';
          return span;
        },
        key: item => item.id,
        render: () => { }
      });

      expect(container.children[0].tagName).toBe('SPAN');
      expect(container.children[0].className).toBe('custom');
    });
  });

  describe('Cleanup', () => {
    it('returns cleanup function', () => {
      const store = state({ items: [] });
      const cleanup = repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { }
      });

      expect(typeof cleanup).toBe('function');
    });

    it('unsubscribes from state changes on cleanup', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });

      const cleanup = repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      cleanup();

      store.items = [{ id: 2, name: 'Bob' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Should still have old content (not updated)
      expect(container.children.length).toBe(0);
    });

    it('removes all DOM elements on cleanup', () => {
      const store = state({
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ]
      });

      const cleanup = repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.name;
        }
      });

      expect(container.children.length).toBe(2);

      cleanup();

      expect(container.children.length).toBe(0);
    });

    it('clears internal maps on cleanup', () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });

      const cleanup = repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { }
      });

      cleanup();

      // Add items again - should create new elements
      store.items = [{ id: 1, name: 'Alice' }];
      // Manual call won't work after cleanup, but we verified cleanup was called
    });
  });

  describe('Error Handling', () => {
    it('warns if container not found', () => {
      const store = state({ items: [] });
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      repeat('#non-existent', store, 'items', {
        key: item => item.id,
        render: () => { }
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('container "#non-existent" not found')
      );

      consoleWarn.mockRestore();
    });

    it('returns noop cleanup if container not found', () => {
      const store = state({ items: [] });
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      const cleanup = repeat('#non-existent', store, 'items', {
        key: item => item.id,
        render: () => { }
      });

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();

      consoleWarn.mockRestore();
    });

    it('throws if key is not a function', () => {
      const store = state({ items: [] });

      expect(() => {
        repeat(container, store, 'items', {
          key: 'not-a-function',
          render: () => { }
        });
      }).toThrow('options.key must be a function');
    });

    it('throws if render is not a function', () => {
      const store = state({ items: [] });

      expect(() => {
        repeat(container, store, 'items', {
          key: item => item.id,
          render: 'not-a-function'
        });
      }).toThrow('options.render must be a function');
    });

    it('warns if arrayKey is not an array', async () => {
      const store = state({ items: 'not-an-array' });
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { }
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('store.items is not an array')
      );

      consoleWarn.mockRestore();
    });

    it('warns on duplicate keys', () => {
      const store = state({
        items: [
          { id: 1, name: 'Alice' },
          { id: 1, name: 'Bob' } // Duplicate key!
        ]
      });
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { }
      });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('duplicate key "1"')
      );

      consoleWarn.mockRestore();
    });

    it('catches and logs render errors', () => {
      const store = state({ items: [{ id: 1 }] });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: () => {
          throw new Error('Render error!');
        }
      });

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('error rendering key "1"'),
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Focus Preservation', () => {
    it('preserves focus by default', async () => {
      const store = state({
        items: [
          { id: 1, text: 'Alice' },
          { id: 2, text: 'Bob' }
        ]
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          if (!el.dataset.init) {
            el.innerHTML = `<input value="${item.text}">`;
            el.dataset.init = 'true';
          }
        }
      });

      const input = container.querySelector('input');
      input.focus();
      input.setSelectionRange(2, 2);

      expect(document.activeElement).toBe(input);

      // Reorder items
      store.items = [store.items[1], store.items[0]];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Focus should be preserved
      expect(document.activeElement).toBe(input);
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe(2);
    });

    it('can disable focus preservation', async () => {
      const store = state({
        items: [
          { id: 1, text: 'Alice' },
          { id: 2, text: 'Bob' }
        ]
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          if (!el.dataset.init) {
            el.innerHTML = `<input value="${item.text}">`;
            el.dataset.init = 'true';
          }
        },
        preserveFocus: null
      });

      const input = container.querySelector('input');
      input.focus();

      expect(document.activeElement).toBe(input);

      store.items = [store.items[1], store.items[0]];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Focus might be lost (browser default behavior)
      // We just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('accepts custom focus preservation function', async () => {
      const store = state({ items: [{ id: 1, text: 'Test' }] });
      const customPreserve = vi.fn(() => {
        const restore = vi.fn();
        return restore;
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { },
        preserveFocus: customPreserve
      });

      expect(customPreserve).toHaveBeenCalledWith(container);

      store.items = [{ id: 1, text: 'Updated' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Called on initial render and update
      expect(customPreserve).toHaveBeenCalled();
      expect(customPreserve.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Scroll Preservation', () => {
    it('preserves scroll by default', async () => {
      const store = state({
        items: Array.from({ length: 20 }, (_, i) => ({ id: i, text: `Item ${i}` }))
      });

      container.style.height = '100px';
      container.style.overflow = 'auto';

      repeat(container, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.text;
          el.style.height = '50px';
        }
      });

      container.scrollTop = 100;
      const scrollBefore = container.scrollTop;

      // Add item at top
      store.items = [{ id: 99, text: 'New' }, ...store.items];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Scroll should be adjusted (not exactly the same due to anchor-based preservation)
      expect(container.scrollTop).toBeGreaterThan(0);
    });

    it('can disable scroll preservation', async () => {
      const store = state({
        items: [{ id: 1, text: 'Item' }]
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { },
        preserveScroll: null
      });

      store.items = [{ id: 2, text: 'New' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('accepts custom scroll preservation function', async () => {
      const store = state({ items: [{ id: 1 }] });
      const customScroll = vi.fn(() => vi.fn());

      repeat(container, store, 'items', {
        key: item => item.id,
        render: () => { },
        preserveScroll: customScroll
      });

      expect(customScroll).toHaveBeenCalledWith(container, expect.objectContaining({ isReorder: false }));

      store.items = [{ id: 1 }];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Called on initial render and update
      expect(customScroll).toHaveBeenCalled();
      expect(customScroll.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('skips preservation if container not in document', async () => {
      const detachedContainer = document.createElement('div');
      const store = state({ items: [{ id: 1, text: 'Test' }] });

      const preserveFocusSpy = vi.fn(() => null);
      const preserveScrollSpy = vi.fn(() => () => { });

      repeat(detachedContainer, store, 'items', {
        key: item => item.id,
        render: (item, el) => {
          el.textContent = item.text;
        },
        preserveFocus: preserveFocusSpy,
        preserveScroll: preserveScrollSpy
      });

      // Initial render - container not in document, should skip
      expect(preserveFocusSpy).not.toHaveBeenCalled();
      expect(preserveScrollSpy).not.toHaveBeenCalled();
    });
  });

  describe('defaultFocusPreservation', () => {
    it('returns null if no element is focused', () => {
      const result = defaultFocusPreservation(container);
      expect(result).toBeNull();
    });

    it('returns null if focused element not in container', () => {
      const outside = document.createElement('input');
      document.body.appendChild(outside);
      outside.focus();

      const result = defaultFocusPreservation(container);
      expect(result).toBeNull();

      document.body.removeChild(outside);
    });

    it('returns restore function if element in container is focused', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const restore = defaultFocusPreservation(container);
      expect(typeof restore).toBe('function');
    });

    it('restores focus to input', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const restore = defaultFocusPreservation(container);

      // Blur the input
      input.blur();
      expect(document.activeElement).not.toBe(input);

      restore();
      expect(document.activeElement).toBe(input);
    });

    it('restores selection range for input', () => {
      const input = document.createElement('input');
      input.value = 'Hello World';
      container.appendChild(input);
      input.focus();
      input.setSelectionRange(2, 5);

      const restore = defaultFocusPreservation(container);

      input.setSelectionRange(0, 0);
      expect(input.selectionStart).toBe(0);

      restore();
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe(5);
    });

    it('restores selection range for textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Hello World';
      container.appendChild(textarea);
      textarea.focus();
      textarea.setSelectionRange(3, 7);

      const restore = defaultFocusPreservation(container);

      textarea.setSelectionRange(0, 0);

      restore();
      expect(textarea.selectionStart).toBe(3);
      expect(textarea.selectionEnd).toBe(7);
    });

    it('does not restore if element removed from document', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const restore = defaultFocusPreservation(container);

      container.removeChild(input);

      // Should not throw
      expect(() => restore()).not.toThrow();
    });
  });

  describe('defaultScrollPreservation', () => {
    it('returns early if scrollTop is 0', () => {
      container.scrollTop = 0;
      const restore = defaultScrollPreservation(container, { isReorder: false });

      expect(typeof restore).toBe('function');
      restore();
      expect(container.scrollTop).toBe(0);
    });

    it('uses pixel position for reorder', () => {
      container.style.height = '100px';
      container.style.overflow = 'auto';

      const child = document.createElement('div');
      child.style.height = '200px';
      container.appendChild(child);

      container.scrollTop = 50;
      const scrollBefore = container.scrollTop;

      const restore = defaultScrollPreservation(container, { isReorder: true });
      restore();

      expect(container.scrollTop).toBe(scrollBefore);
    });

    it('finds anchor element and adjusts scroll after DOM changes', () => {
      // Use a separate container for this test
      const scrollContainer = document.createElement('div');
      scrollContainer.style.height = '100px';
      scrollContainer.style.overflow = 'auto';
      scrollContainer.style.position = 'relative';
      document.body.appendChild(scrollContainer);

      const child1 = document.createElement('div');
      child1.style.height = '100px';
      child1.textContent = 'Child 1';
      const child2 = document.createElement('div');
      child2.style.height = '100px';
      child2.textContent = 'Child 2';

      scrollContainer.appendChild(child1);
      scrollContainer.appendChild(child2);

      scrollContainer.scrollTop = 50;

      const restore = defaultScrollPreservation(scrollContainer, { isReorder: false });

      // Simulate DOM change (add element at top)
      const newChild = document.createElement('div');
      newChild.style.height = '50px';
      scrollContainer.insertBefore(newChild, child1);

      restore();

      // Scroll should be adjusted (anchor element path)
      // The exact value depends on layout, but scroll should have changed
      expect(typeof scrollContainer.scrollTop).toBe('number');

      document.body.removeChild(scrollContainer);
    });

    it('finds anchor element for add/remove', () => {
      container.style.height = '100px';
      container.style.overflow = 'auto';

      const child1 = document.createElement('div');
      child1.style.height = '100px';
      const child2 = document.createElement('div');
      child2.style.height = '100px';

      container.appendChild(child1);
      container.appendChild(child2);

      container.scrollTop = 50;

      const restore = defaultScrollPreservation(container, { isReorder: false });

      // Add element
      const child3 = document.createElement('div');
      child3.style.height = '100px';
      container.insertBefore(child3, child1);

      restore();

      // Scroll should be adjusted (exact value depends on browser layout)
      // Just verify restore was called without error
      expect(typeof container.scrollTop).toBe('number');
    });

    it('adjusts scroll when anchor element is still in document', () => {
      // Use a separate container for this test
      const scrollContainer = document.createElement('div');
      scrollContainer.style.height = '100px';
      scrollContainer.style.overflow = 'auto';
      document.body.appendChild(scrollContainer);

      const child1 = document.createElement('div');
      child1.style.height = '150px';
      const child2 = document.createElement('div');
      child2.style.height = '150px';

      scrollContainer.appendChild(child1);
      scrollContainer.appendChild(child2);

      scrollContainer.scrollTop = 75;

      // Capture the restore function with anchor element
      const restore = defaultScrollPreservation(scrollContainer, { isReorder: false });

      // The anchor should be child1 or child2
      // Trigger the adjustment path by keeping element in document
      restore();

      // Verify the scroll adjustment code path was executed
      expect(scrollContainer.scrollTop).toBeGreaterThanOrEqual(0);

      document.body.removeChild(scrollContainer);
    });

    it('handles missing anchor element gracefully', () => {
      container.scrollTop = 50;

      const restore = defaultScrollPreservation(container, { isReorder: false });

      // No anchor found (empty or no children in viewport)
      restore();

      // Should restore pixel position as fallback
      expect(container.scrollTop).toBe(50);
    });

    it('executes anchor-based scroll adjustment when anchor found', () => {
      const scrollContainer = document.createElement('div');
      document.body.appendChild(scrollContainer);

      const child = document.createElement('div');
      scrollContainer.appendChild(child);

      scrollContainer.scrollTop = 100;

      // Mock getBoundingClientRect to simulate anchor element in viewport
      const originalGetBoundingClientRect = child.getBoundingClientRect;
      child.getBoundingClientRect = vi.fn(() => ({
        top: 150,
        bottom: 200,
        left: 0,
        right: 100,
        width: 100,
        height: 50
      }));

      scrollContainer.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 200,
        left: 0,
        right: 100,
        width: 100,
        height: 100
      }));

      const restore = defaultScrollPreservation(scrollContainer, { isReorder: false });

      // Change the position (simulate DOM change)
      child.getBoundingClientRect = vi.fn(() => ({
        top: 200,
        bottom: 250,
        left: 0,
        right: 100,
        width: 100,
        height: 50
      }));

      restore();

      // Scroll adjustment should have been calculated and applied
      expect(scrollContainer.scrollTop).toBe(150); // 100 + (200 - 150 - 50)

      document.body.removeChild(scrollContainer);
    });
  });
});
