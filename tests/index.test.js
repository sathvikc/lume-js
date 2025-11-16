import { describe, it, expect } from 'vitest';
import * as api from 'src/index.js';

describe('public API', () => {
  it('exposes state, bindDom, and effect', () => {
    expect(api).toHaveProperty('state');
    expect(typeof api.state).toBe('function');
    expect(api).toHaveProperty('bindDom');
    expect(typeof api.bindDom).toBe('function');
    expect(api).toHaveProperty('effect');
    expect(typeof api.effect).toBe('function');
  });

  it('handles automatic microtask batching', async () => {
    const element = document.createElement('div');
    element.innerHTML = '<input data-bind="value" />';
    const input = element.querySelector('input');
    
    const store = api.state({ value: 0 });
    const cleanup = api.bindDom(element, store);
    
    // Initial binding
    expect(input.value).toBe('0');

    // State changes should be batched
    store.value = 1;
    store.value = 2;
    
    // Before microtask, DOM should still show old value
    expect(input.value).toBe('0');
    
    // After microtask, DOM should show final value
    await Promise.resolve();
    expect(input.value).toBe('2');
    
    cleanup();
  });
});
