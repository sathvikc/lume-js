/**
 * @vitest-environment node
 *
 * The universal entry must work without any DOM — this suite runs in plain
 * Node to prove it.
 */
import { describe, it, expect } from 'vitest';
import { state, batch, withReadObserver } from 'src/state.js';

describe('lume-js/state universal entry', () => {
  it('exposes exactly the DOM-free kernel API', () => {
    expect(typeof state).toBe('function');
    expect(typeof batch).toBe('function');
    expect(typeof withReadObserver).toBe('function');
  });

  it('state + subscribe work without a DOM', async () => {
    const store = state({ count: 0 });
    const seen = [];
    const unsub = store.$subscribe('count', v => seen.push(v));

    store.count = 1;
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(seen).toEqual([0, 1]);
    unsub();
  });

  it('batch works without a DOM (synchronous flush)', () => {
    const a = state({ v: 1 });
    const b = state({ v: 2 });
    const seen = [];

    a.$subscribe('v', v => seen.push(`a:${v}`));
    b.$subscribe('v', v => seen.push(`b:${v}`));
    seen.length = 0;

    batch(() => {
      a.v = 10;
      b.v = 20;
    });

    // Flushed synchronously — no microtask wait needed
    expect(seen).toEqual(['a:10', 'b:20']);
  });

  it('withReadObserver observes reads without a DOM', () => {
    const store = state({ x: 5 });
    const reads = [];

    withReadObserver((_proxy, key) => reads.push(key), () => {
      void store.x;
    });

    expect(reads).toEqual(['x']);
  });

  it('there is no document in this environment (proves DOM-free)', () => {
    expect(typeof document).toBe('undefined');
  });
});
