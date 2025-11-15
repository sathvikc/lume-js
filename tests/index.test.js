import { describe, it, expect } from 'vitest';
import * as api from 'src/index.js';

describe('public API', () => {
  it('exposes state and bindDom', () => {
    expect(api).toHaveProperty('state');
    expect(typeof api.state).toBe('function');
    expect(api).toHaveProperty('bindDom');
    expect(typeof api.bindDom).toBe('function');
  });
});
