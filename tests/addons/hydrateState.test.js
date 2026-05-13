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

  it('returns empty object when document is not defined (SSR/Node)', () => {
    const originalDoc = globalThis.document;
    // @ts-ignore
    globalThis.document = undefined;
    try {
      const result = hydrateState();
      expect(result).toEqual({});
    } finally {
      // @ts-ignore
      globalThis.document = originalDoc;
    }
  });

  it('rejects non-script elements (DOM clobbering mitigation)', () => {
    const el = document.createElement('div');
    el.id = '__TEST_CLOBBER__';
    document.body.appendChild(el);

    try {
      const result = hydrateState('#__TEST_CLOBBER__');
      expect(result).toEqual({});
    } finally {
      el.remove();
    }
  });

  it('rejects script elements with wrong type', () => {
    const el = document.createElement('script');
    el.id = '__TEST_WRONG_TYPE__';
    el.type = 'text/javascript';
    // No textContent — jsdom would try to execute it if it looked like JS.
    // The type check rejects before JSON.parse is reached.
    document.body.appendChild(el);

    try {
      const result = hydrateState('#__TEST_WRONG_TYPE__');
      expect(result).toEqual({});
    } finally {
      el.remove();
    }
  });

  it('accepts a validate function and rejects invalid data', () => {
    const el = document.createElement('script');
    el.id = '__TEST_VALIDATE__';
    el.type = 'application/json';
    el.textContent = '{"title":"Welcome","count":42}';
    document.body.appendChild(el);

    try {
      // Validator requires both title (string) and count (number)
      const validator = (d) => typeof d.title === 'string' && typeof d.count === 'number';

      const result = hydrateState('#__TEST_VALIDATE__', validator);
      expect(result).toEqual({ title: 'Welcome', count: 42 });

      // Invalid data rejected by validator
      const badEl = document.createElement('script');
      badEl.id = '__TEST_VALIDATE_BAD__';
      badEl.type = 'application/json';
      badEl.textContent = '{"isAdmin": true}';
      document.body.appendChild(badEl);

      const badResult = hydrateState('#__TEST_VALIDATE_BAD__', validator);
      expect(badResult).toEqual({});

      badEl.remove();
    } finally {
      el.remove();
    }
  });
});
