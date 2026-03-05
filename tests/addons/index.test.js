import { describe, it, expect } from 'vitest';
import * as addons from 'src/addons/index.js';

describe('addons public API', () => {
  it('exposes computed and watch', () => {
    expect(addons).toHaveProperty('computed');
    expect(typeof addons.computed).toBe('function');
    expect(addons).toHaveProperty('watch');
    expect(typeof addons.watch).toBe('function');
  });

  it('exposes repeat and preservation utilities', () => {
    expect(addons).toHaveProperty('repeat');
    expect(typeof addons.repeat).toBe('function');
    expect(addons).toHaveProperty('defaultFocusPreservation');
    expect(typeof addons.defaultFocusPreservation).toBe('function');
    expect(addons).toHaveProperty('defaultScrollPreservation');
    expect(typeof addons.defaultScrollPreservation).toBe('function');
  });

  it('exposes debug utilities', () => {
    expect(addons).toHaveProperty('createDebugPlugin');
    expect(typeof addons.createDebugPlugin).toBe('function');
    expect(addons).toHaveProperty('debug');
    expect(typeof addons.debug).toBe('object');
  });
});
