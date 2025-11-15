import { describe, it, expect } from 'vitest';
import { resolvePath } from 'src/core/utils.js';

describe('resolvePath', () => {
  it('returns the object when path is empty', () => {
    const obj = { a: 1 };
    expect(resolvePath(obj, [])).toBe(obj);
    expect(resolvePath(obj, undefined)).toBe(obj);
  });

  it('resolves nested paths', () => {
    const obj = { user: { address: { city: 'NYC' } } };
    expect(resolvePath(obj, ['user', 'address'])).toBe(obj.user.address);
    expect(resolvePath(obj, ['user', 'address', 'city'])).toBe('NYC');
  });

  it('throws for null/undefined in the chain', () => {
    const obj = { user: null };
    expect(() => resolvePath(obj, ['user', 'address'])).toThrow(
      'Cannot access property "address" of null at path: user.address'
    );
  });

  it('throws when property missing', () => {
    const obj = { user: { name: 'A' } };
    expect(() => resolvePath(obj, ['user', 'age'])).toThrow(
      'Property "age" does not exist at path: user.age'
    );
  });
});
