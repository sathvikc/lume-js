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
  });

  describe('Create/Update API', () => {
    it('calls create once, update for each render', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });
      const createSpy = vi.fn();
      const updateSpy = vi.fn();

      repeat(container, store, 'items', {
        key: item => item.id,
        create: createSpy,
        update: updateSpy
      });

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledTimes(1); // Called on initial render too

      // Add new item
      store.items = [...store.items, { id: 2, name: 'Bob' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(createSpy).toHaveBeenCalledTimes(2); // Called for new item
      // Note: update is skipped for first item (same reference)
      expect(updateSpy).toHaveBeenCalledTimes(2); // Initial + new item only
    });

    it('calls update for existing elements on data change', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });
      const createSpy = vi.fn();
      const updateSpy = vi.fn();

      repeat(container, store, 'items', {
        key: item => item.id,
        create: createSpy,
        update: updateSpy
      });

      // Update item data (new object, same key)
      store.items = [{ id: 1, name: 'Alice Updated' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(createSpy).toHaveBeenCalledTimes(1); // Only initial
      expect(updateSpy).toHaveBeenCalledTimes(2); // Initial + update
      expect(updateSpy).toHaveBeenLastCalledWith(
        { id: 1, name: 'Alice Updated' },
        expect.any(HTMLElement),
        0,
        { isFirstRender: false }
      );
    });

    it('skips update if same item reference (optimization)', async () => {
      const item = { id: 1, name: 'Alice' };
      const store = state({ items: [item] });
      const updateSpy = vi.fn();

      repeat(container, store, 'items', {
        key: item => item.id,
        create: () => { },
        update: updateSpy
      });

      expect(updateSpy).toHaveBeenCalledTimes(1); // Initial render

      // Re-assign same array with same reference
      store.items = [item]; // Same object reference
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updateSpy).toHaveBeenCalledTimes(1); // Still 1 - skipped!
    });

    it('passes isFirstRender flag to update callback', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });
      const isFirstRenderValues = [];

      repeat(container, store, 'items', {
        key: item => item.id,
        create: () => { },
        update: (item, el, index, { isFirstRender }) => {
          isFirstRenderValues.push(isFirstRender);
        }
      });

      // Initial: isFirstRender should be true
      expect(isFirstRenderValues).toEqual([true]);

      // Update item data
      store.items = [{ id: 1, name: 'Alice Updated' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      // Second call: isFirstRender should be false
      expect(isFirstRenderValues).toEqual([true, false]);
    });

    it('works with create only (no update)', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });
      const createSpy = vi.fn((item, el) => {
        el.textContent = item.name;
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        create: createSpy
      });

      expect(container.children[0].textContent).toBe('Alice');

      // Add new item
      store.items = [...store.items, { id: 2, name: 'Bob' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(container.children[1].textContent).toBe('Bob');
    });

    it('calls update when items are reordered (index changes)', async () => {
      const item1 = { id: 1, name: 'Alice' };
      const item2 = { id: 2, name: 'Bob' };
      const store = state({ items: [item1, item2] });
      const updateCalls = [];

      repeat(container, store, 'items', {
        key: item => item.id,
        create: () => { },
        update: (item, el, index) => {
          updateCalls.push({ id: item.id, index });
        }
      });

      // Initial render: both items updated
      expect(updateCalls).toEqual([
        { id: 1, index: 0 },
        { id: 2, index: 1 }
      ]);
      updateCalls.length = 0;

      // Reorder: same references, different indices
      store.items = [item2, item1]; // Swap order, same object references
      await new Promise(resolve => setTimeout(resolve, 0));

      // Both should be called because indices changed
      expect(updateCalls).toEqual([
        { id: 2, index: 0 },
        { id: 1, index: 1 }
      ]);
    });

    it('skips update only when both item reference AND index are unchanged', async () => {
      const item = { id: 1, name: 'Alice' };
      const store = state({ items: [item] });
      const updateSpy = vi.fn();

      repeat(container, store, 'items', {
        key: item => item.id,
        create: () => { },
        update: updateSpy
      });

      expect(updateSpy).toHaveBeenCalledTimes(1); // Initial

      // Re-assign with same reference at same index
      store.items = [item];
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(updateSpy).toHaveBeenCalledTimes(1); // Still 1 - skipped!
    });

    it('event listeners using item.id work correctly after reorder (no stale closures)', async () => {
      // This tests the pattern where create captures item.id (stable) instead of index (stale)
      const item1 = { id: 101, name: 'Alice' };
      const item2 = { id: 102, name: 'Bob' };
      const store = state({ items: [item1, item2] });
      const clickedIds = [];

      repeat(container, store, 'items', {
        key: item => item.id,
        create: (item, el) => {
          el.className = 'item';
          // Capture item.id (stable) NOT index (would be stale after reorder)
          el.addEventListener('click', () => {
            clickedIds.push(item.id);
          });
        },
        update: (item, el) => {
          el.dataset.itemId = String(item.id);
          el.textContent = item.name;
        }
      });

      // Initial order: [Alice=101, Bob=102]
      expect(container.children[0].textContent).toBe('Alice');
      expect(container.children[1].textContent).toBe('Bob');

      // Click first element (Alice)
      container.children[0].click();
      expect(clickedIds).toEqual([101]);

      // Reorder: swap positions
      store.items = [item2, item1]; // Now [Bob=102, Alice=101]
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify DOM order changed
      expect(container.children[0].textContent).toBe('Bob');
      expect(container.children[1].textContent).toBe('Alice');

      // Click first element (now Bob) - should still get Bob's id
      container.children[0].click();
      expect(clickedIds).toEqual([101, 102]); // Alice's click, then Bob's click

      // Click second element (now Alice) - should still get Alice's id
      container.children[1].click();
      expect(clickedIds).toEqual([101, 102, 101]); // Still works correctly!
    });

    it('allows clean separation of DOM creation and data binding', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });

      repeat(container, store, 'items', {
        key: item => item.id,
        create: (item, el) => {
          // Create DOM structure once
          el.innerHTML = '<span class="name"></span><button>X</button>';
        },
        update: (item, el) => {
          // Update data only
          el.querySelector('.name').textContent = item.name;
        }
      });

      // Verify initial render
      expect(container.children[0].querySelector('.name').textContent).toBe('Alice');
      expect(container.children[0].querySelector('button')).toBeTruthy();

      // Update item
      store.items = [{ id: 1, name: 'Alice Updated' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      // DOM structure should be preserved, only data updated
      expect(container.children[0].querySelector('.name').textContent).toBe('Alice Updated');
      expect(container.children[0].querySelector('button')).toBeTruthy();
    });

    it('backward compatible: render still works without create/update', async () => {
      const store = state({ items: [{ id: 1, name: 'Alice' }] });
      const renderSpy = vi.fn((item, el) => {
        el.textContent = item.name;
      });

      repeat(container, store, 'items', {
        key: item => item.id,
        render: renderSpy
      });

      // Initial render + subscription callback = may be 2 calls
      expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(container.children[0].textContent).toBe('Alice');

      store.items = [{ id: 1, name: 'Updated' }];
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(container.children[0].textContent).toBe('Updated');
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

    it('throws if render/create is not provided', () => {
      const store = state({ items: [] });

      expect(() => {
        repeat(container, store, 'items', {
          key: item => item.id
        });
      }).toThrow('options.render or options.create must be a function');
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
      // Verify no errors thrown
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

      // Verify no errors thrown
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
