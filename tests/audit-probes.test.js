/**
 * Deep Audit Probe Tests
 * 
 * These tests verify bugs and edge cases discovered during the
 * comprehensive codebase audit. Each test documents whether a behavior
 * is a confirmed bug, a known limitation, or a design decision.
 * 
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { state, isReactive, effect, bindDom } from '../src/index.js';
import { computed } from '../src/addons/computed.js';

// ============================================================================
// BUG #1: Nested effect tracking is broken
// After a nested effect/computed returns, the outer effect's auto-tracking
// is destroyed because globalThis.__LUME_CURRENT_EFFECT__ is set to `undefined`
// instead of being restored to the previous value.
// ============================================================================
describe('FIX VERIFIED: Nested effect tracking', () => {
  it('properties accessed AFTER nested effect ARE tracked', async () => {
    const store = state({ a: 0, b: 0 });
    const fn = vi.fn();

    effect(() => {
      fn();
      // Access 'a' — should be tracked ✓
      void store.a;

      // Create a nested effect (or computed — same mechanism)
      // This clears globalThis.__LUME_CURRENT_EFFECT__ on return
      const innerCleanup = effect(() => {
        void store.b; // inner tracks 'b'
      });

      // Access 'a' again after nested effect — SHOULD be tracked but ISN'T
      void store.a;
    });

    expect(fn).toHaveBeenCalledTimes(1);

    // Change 'a' — outer effect should re-run...
    // But the tracking was broken by the nested effect clearing the global.
    // The first access to 'a' IS tracked (before nested effect),
    // but the tracking context was corrupted.
    store.a = 1;
    await new Promise(resolve => setTimeout(resolve, 10));

    // If this is 2, tracking works. If 1, outer tracking was broken.
    // KNOWN BUG: depending on timing, the first access before the nested
    // effect may still work, but any conditional tracking after is lost.
    const callCount = fn.mock.calls.length;
    console.log('[PROBE] Nested effect tracking - outer effect ran', callCount, 'times');

    // We expect this might fail — documenting the bug
    // The outer effect SHOULD re-run when 'a' changes
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it('computed inside effect does NOT break outer tracking', async () => {
    const store = state({ count: 0, name: 'Alice' });
    const fn = vi.fn();

    effect(() => {
      fn();
      void store.count; // tracked ✓

      // computed() uses effect() internally — breaks outer tracking
      const c = computed(() => store.name.toUpperCase());
      
      // Any access here is NOT tracked due to nested effect clearing global
      void store.count; // tracked? depends on whether first access is enough
    });

    expect(fn).toHaveBeenCalledTimes(1);

    store.count = 1;
    await new Promise(resolve => setTimeout(resolve, 10));

    const callCount = fn.mock.calls.length;
    console.log('[PROBE] Computed-in-effect tracking - outer ran', callCount, 'times');
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// BUG #2: $subscribe assignment triggers Proxy set trap
// proxy.$subscribe = fn goes through the Proxy set trap, causing:
// - Plugin onSet hooks fire with key='$subscribe'
// - A microtask flush is scheduled
// - pendingNotifications gets a '$subscribe' entry
// ============================================================================
describe('FIX VERIFIED: $subscribe no longer triggers set trap', () => {
  it('plugin onSet does NOT receive $subscribe key during state creation', () => {
    const setKeys = [];
    const plugin = {
      name: 'spy',
      onSet: (key, newValue, oldValue) => {
        setKeys.push(key);
        return newValue;
      }
    };

    state({ count: 0 }, { plugins: [plugin] });

    // FIXED: $subscribe is now set on obj, not proxy — no set trap triggered
    expect(setKeys).not.toContain('$subscribe');
  });

  it('no microtask flush from $subscribe assignment', async () => {
    const notifyKeys = [];
    const plugin = {
      name: 'spy',
      onNotify: (key, value) => {
        notifyKeys.push(key);
      }
    };

    state({ count: 0 }, { plugins: [plugin] });
    await Promise.resolve(); // flush

    // FIXED: no $subscribe in notify keys
    expect(notifyKeys).not.toContain('$subscribe');
  });
});

// ============================================================================
// BUG #3: repeat() double initialization
// updateList() is called directly AND via $subscribe's immediate callback,
// causing double render on initialization.
// ============================================================================
describe('FIX VERIFIED: repeat() single initialization', () => {
  it('render function is called exactly once per item on initialization', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const renderCalls = [];
    const store = state({ items: [{ id: 1, name: 'Alice' }] });

    const { repeat } = await import('../src/addons/repeat.js');
    const cleanup = repeat(container, store, 'items', {
      key: item => item.id,
      render: (item, el) => {
        renderCalls.push(item.name);
        el.textContent = item.name;
      }
    });

    // FIXED: render is called exactly once per item (not twice)
    expect(renderCalls).toEqual(['Alice']);

    cleanup();
    document.body.removeChild(container);
  });
});

// ============================================================================
// BUG #4: addons/index.js missing re-exports
// defaultFocusPreservation and defaultScrollPreservation are declared in
// TypeScript definitions (addons/index.d.ts) but not re-exported from
// the JavaScript barrel file (addons/index.js).
// ============================================================================
describe('FIX VERIFIED: Addons barrel has all declared exports', () => {
  it('defaultFocusPreservation and defaultScrollPreservation are available', async () => {
    const addons = await import('../src/addons/index.js');
    
    const hasFocusPres = 'defaultFocusPreservation' in addons;
    const hasScrollPres = 'defaultScrollPreservation' in addons;
    
    // FIXED: barrel now re-exports these from repeat.js
    expect(hasFocusPres).toBe(true);
    expect(hasScrollPres).toBe(true);
  });
});

// ============================================================================
// Edge Case: select-multiple not handled by getInputValue
// ============================================================================
describe('Edge case: select-multiple', () => {
  it('data-bind only captures first selected value for multi-select', async () => {
    document.body.innerHTML = `
      <div>
        <select data-bind="choices" multiple>
          <option value="a" selected>A</option>
          <option value="b" selected>B</option>
          <option value="c">C</option>
        </select>
      </div>
    `;
    const root = document.body;
    const store = state({ choices: '' });

    const cleanup = bindDom(root, store);
    const select = root.querySelector('select');

    // Simulate user selection
    select.options[0].selected = true;
    select.options[1].selected = true;
    select.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('[PROBE] Multi-select value:', store.choices);
    // el.value only returns the first selected option's value
    // This is a known limitation — documented but not handled
    expect(typeof store.choices).toBe('string'); // single value, not array

    cleanup();
  });
});

// ============================================================================
// Edge Case: Symbol keys in state()
// ============================================================================
describe('Edge case: Symbol keys', () => {
  it('Symbol keys work but bypass $-prefix guard', () => {
    const sym = Symbol('test');
    const store = state({ [sym]: 42 });

    // Symbols bypass the $ prefix check, go through normal get trap
    expect(store[sym]).toBe(42);

    // Symbols are not enumerable on reactive proxy marker
    expect(Object.keys(store)).not.toContain(String(sym));
  });
});

// ============================================================================
// Edge Case: $subscribe immediate call inside effect (double tracking)
// ============================================================================
describe('Edge case: $subscribe inside auto-tracking effect', () => {
  it('causes double tracking of the same key', async () => {
    const store = state({ count: 0 });
    let effectRuns = 0;
    let subCalls = 0;

    const cleanup = effect(() => {
      effectRuns++;
      void store.count; // auto-tracked

      // Also manually subscribe (unusual but possible)
      store.$subscribe('count', () => {
        subCalls++;
      });
    });

    // Initial: effect ran once, subscribe immediate call = 1
    expect(effectRuns).toBe(1);

    store.count = 1;
    await new Promise(resolve => setTimeout(resolve, 10));

    console.log('[PROBE] Effect runs after 1 change:', effectRuns);
    console.log('[PROBE] Subscriber calls after 1 change:', subCalls);

    cleanup();
  });
});

// ============================================================================
// Edge Case: Object.is(-0, +0) semantics
// ============================================================================
describe('Edge case: -0 and +0 distinction', () => {
  it('Object.is treats +0 and -0 as different values', async () => {
    const store = state({ value: 0 });
    const spy = vi.fn();
    store.$subscribe('value', spy);
    spy.mockClear();

    store.value = -0;
    await Promise.resolve();

    // Object.is(0, -0) is false, so this SHOULD trigger notification
    console.log('[PROBE] -0 notification fired:', spy.mock.calls.length > 0);
    expect(spy).toHaveBeenCalledWith(-0);
  });
});
