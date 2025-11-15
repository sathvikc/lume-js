import { describe, it, expect } from 'vitest';
import * as addons from 'src/addons/index.js';

describe('addons public API', () => {
  it('exposes computed and watch', () => {
    expect(addons).toHaveProperty('computed');
    expect(typeof addons.computed).toBe('function');
    expect(addons).toHaveProperty('watch');
    expect(typeof addons.watch).toBe('function');
  });
});
