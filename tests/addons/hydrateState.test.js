import { describe, it, expect } from 'vitest';
import { hydrateState } from 'src/addons/hydrateState.js';

describe('hydrateState', () => {
  it('returns an empty object when no element is found', () => {
    const result = hydrateState('#nonexistent-element');
    expect(result).toEqual({});
  });

  it('returns an empty object when the selector is not provided', () => {
    const result = hydrateState();
    expect(result).toEqual({});
  });

  it('returns an empty object for invalid JSON', () => {
    const el = document.createElement('script');
    el.id = '__TEST_INVALID__';
    el.type = 'application/json';
    el.textContent = 'not valid json {';
    document.body.appendChild(el);

    try {
      const result = hydrateState('#__TEST_INVALID__');
      expect(result).toEqual({});
    } finally {
      el.remove();
    }
  });

  it('parses valid JSON from a script element', () => {
    const el = document.createElement('script');
    el.id = '__TEST_VALID__';
    el.type = 'application/json';
    el.textContent = '{"title":"Welcome","count":42}';
    document.body.appendChild(el);

    try {
      const result = hydrateState('#__TEST_VALID__');
      expect(result).toEqual({ title: 'Welcome', count: 42 });
    } finally {
      el.remove();
    }
  });

  it('uses default selector #__LUME_DATA__ when called with no args', () => {
    const el = document.createElement('script');
    el.id = '__LUME_DATA__';
    el.type = 'application/json';
    el.textContent = '{"version":2}';
    document.body.appendChild(el);

    try {
      const result = hydrateState();
      expect(result).toEqual({ version: 2 });
    } finally {
      el.remove();
    }
  });
});
