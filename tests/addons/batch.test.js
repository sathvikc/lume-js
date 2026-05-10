import { describe, it, expect, vi } from 'vitest';
import { state } from '../../src/core/state.js';
import { effect } from '../../src/core/effect.js';
import { batch } from '../../src/addons/batch.js';

describe('batch()', () => {
  it('throws if not passed a function', () => {
    expect(() => batch('not a function')).toThrow('batch() requires a function');
  });

  it('suppresses microtasks and flushes synchronously at the end', () => {
    const store = state({ count: 0 });
    let effectCount = 0;
    
    effect(() => {
      // eslint-disable-next-line no-unused-expressions
      store.count; // read to track
      effectCount++;
    });
    
    expect(effectCount).toBe(1); // initial run
    
    batch(() => {
      store.count++;
      expect(effectCount).toBe(1); // effect hasn't run yet
      
      store.count++;
      expect(effectCount).toBe(1); // still hasn't run
    });
    
    // Batch finished synchronously, so effect should have run exactly once more
    expect(effectCount).toBe(2);
    expect(store.count).toBe(2);
  });
  
  it('handles multiple stores independently within the batch', () => {
    const storeA = state({ a: 0 });
    const storeB = state({ b: 0 });
    
    let effectCount = 0;
    effect(() => {
      // eslint-disable-next-line no-unused-expressions
      storeA.a;
      // eslint-disable-next-line no-unused-expressions
      storeB.b;
      effectCount++;
    });
    
    expect(effectCount).toBe(1); // initial run
    
    batch(() => {
      storeA.a++;
      storeB.b++;
    });
    
    // Because Lume-JS uses per-state isolation, an effect depending on 2 changed states runs twice
    expect(effectCount).toBe(3); // 1 initial + 2 updates (one for storeA, one for storeB)
  });
  
  it('handles nested batches gracefully', () => {
    const store = state({ count: 0 });
    let effectCount = 0;
    
    effect(() => {
      // eslint-disable-next-line no-unused-expressions
      store.count;
      effectCount++;
    });
    
    expect(effectCount).toBe(1);
    
    batch(() => {
      store.count++;
      batch(() => {
        store.count++;
        expect(effectCount).toBe(1);
      });
      expect(effectCount).toBe(1); // Still hasn't run because outer batch isn't done
    });
    
    expect(effectCount).toBe(2);
    expect(store.count).toBe(2);
  });
  
  it('reverts scheduler if batch throws an error', () => {
    const store = state({ count: 0 });
    let effectCount = 0;
    
    effect(() => {
      // eslint-disable-next-line no-unused-expressions
      store.count;
      effectCount++;
    });
    
    expect(effectCount).toBe(1);
    
    try {
      batch(() => {
        store.count++;
        throw new Error('Test error');
      });
    } catch (e) {
      // Ignore
    }
    
    // The store should have still flushed synchronously in the finally block
    expect(effectCount).toBe(2);
    
    // Future updates should go back to microtasks
    store.count++;
    expect(effectCount).toBe(2); // Hasn't run synchronously
  });
});
