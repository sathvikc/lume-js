import { describe, it, expect, vi } from 'vitest';
import { state } from '../../src/core/state.js';
import { bindDom } from '../../src/core/bindDom.js';

function setupDOM(html) {
  document.body.innerHTML = html;
  return document.body;
}

describe('bindDom', () => {
  it('binds text content for non-input elements', () => {
    const root = setupDOM(`<div><span data-bind="count"></span></div>`);
    const store = state({ count: 1 });

    const cleanup = bindDom(root, store);
    expect(root.querySelector('span').textContent).toBe('1');

    store.count = 2;
    expect(root.querySelector('span').textContent).toBe('2');

    cleanup();
  });

  it('supports two-way binding for input value', () => {
    const root = setupDOM(`<div><input data-bind="name" /></div>`);
    const store = state({ name: 'Alice' });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input');

    // initial value reflected to input
    expect(input.value).toBe('Alice');

    // programmatic state change updates input
    store.name = 'Bob';
    expect(input.value).toBe('Bob');

    // nullish values map to empty string via ??
    store.name = null;
    expect(input.value).toBe('');
    store.name = undefined;
    expect(input.value).toBe('');

    // user typing updates state
    input.value = 'Carol';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.name).toBe('Carol');

    cleanup();
  });

  it('handles checkbox binding', () => {
    const root = setupDOM(`<div><input type="checkbox" data-bind="done" /></div>`);
    const store = state({ done: false });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="checkbox"]');

    expect(input.checked).toBe(false);
    store.done = true;
    expect(input.checked).toBe(true);

    input.checked = false;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.done).toBe(false);

    cleanup();
  });

  it('ignores invalid paths gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = setupDOM(`<div><span data-bind="user.address.city"></span></div>`);
    const store = state({ user: null });

    const cleanup = bindDom(root, store);
    // no crash and no binding applied
    expect(root.querySelector('span').textContent).toBe('');
    cleanup();
    warnSpy.mockRestore();
  });

  it('binds select dropdown value', () => {
    const root = setupDOM(`
      <div>
        <select data-bind="theme">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    `);
    const store = state({ theme: 'dark' });

    const cleanup = bindDom(root, store);
    const select = root.querySelector('select');

    expect(select.value).toBe('dark');

    store.theme = 'light';
    expect(select.value).toBe('light');

    // nullish selects become empty string via ??
    store.theme = undefined;
    expect(select.value).toBe('');

    select.value = 'dark';
    select.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.theme).toBe('dark');

    cleanup();
  });

  it('binds radio buttons', () => {
    const root = setupDOM(`
      <div>
        <input type="radio" name="size" value="small" data-bind="size" />
        <input type="radio" name="size" value="large" data-bind="size" />
      </div>
    `);
    const store = state({ size: 'large' });

    const cleanup = bindDom(root, store);
    const radios = root.querySelectorAll('input[type="radio"]');

    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);

    store.size = 'small';
    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);

    cleanup();
  });

  it('binds number inputs with valueAsNumber', () => {
    const root = setupDOM(`<div><input type="number" data-bind="age" /></div>`);
    const store = state({ age: 25 });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="number"]');

    expect(input.value).toBe('25');

    store.age = 30;
    expect(input.value).toBe('30');

    input.value = '35';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.age).toBe(35);

    cleanup();
  });

  it('binds textarea elements', () => {
    const root = setupDOM(`<div><textarea data-bind="bio"></textarea></div>`);
    const store = state({ bio: 'Hello world' });

    const cleanup = bindDom(root, store);
    const textarea = root.querySelector('textarea');

    expect(textarea.value).toBe('Hello world');

    store.bio = 'Updated bio';
    expect(textarea.value).toBe('Updated bio');

    // nullish values map to empty string via ??
    store.bio = null;
    expect(textarea.value).toBe('');
    store.bio = undefined;
    expect(textarea.value).toBe('');

    textarea.value = 'User typed';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.bio).toBe('User typed');

    cleanup();
  });

  it('handles nested state paths', () => {
    const root = setupDOM(`<div><span data-bind="user.name"></span></div>`);
    const userStore = state({ name: 'Alice' });
    const store = state({ user: userStore });

    const cleanup = bindDom(root, store);
    const span = root.querySelector('span');

    expect(span.textContent).toBe('Alice');

    userStore.name = 'Bob';
    expect(span.textContent).toBe('Bob');

    cleanup();
  });

  it('handles empty or null values gracefully', () => {
    const root = setupDOM(`<div><span data-bind="value"></span></div>`);
    const store = state({ value: null });

    const cleanup = bindDom(root, store);
    const span = root.querySelector('span');

    expect(span.textContent).toBe('');

    store.value = undefined;
    expect(span.textContent).toBe('');

    store.value = 'text';
    expect(span.textContent).toBe('text');

    cleanup();
  });

  it('skips elements with empty data-bind attribute', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = setupDOM(`<div><span data-bind=""></span></div>`);
    const store = state({ count: 1 });

    const cleanup = bindDom(root, store);
    // should not crash
    cleanup();
    warnSpy.mockRestore();
  });

  it('throws error for invalid root element', () => {
    const store = state({ count: 1 });
    expect(() => bindDom(null, store)).toThrow('bindDom() requires a valid HTMLElement as root');
    expect(() => bindDom({}, store)).toThrow('bindDom() requires a valid HTMLElement as root');
  });

  it('throws error for invalid store', () => {
    const root = setupDOM(`<div><span data-bind="count"></span></div>`);
    expect(() => bindDom(root, null)).toThrow('bindDom() requires a reactive state object');
    expect(() => bindDom(root, 123)).toThrow('bindDom() requires a reactive state object');
  });

  it('warns for non-reactive nested targets', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const root = setupDOM(`<div><span data-bind="user.name"></span></div>`);
    const store = state({ user: { name: 'plain object' } });

    const cleanup = bindDom(root, store);
    // should warn but not crash
    cleanup();
    warnSpy.mockRestore();
  });

  it('updates multiple nodes bound to the same key', () => {
    const root = setupDOM(`
      <div>
        <span data-bind="count"></span>
        <span data-bind="count"></span>
        <input data-bind="count" />
      </div>
    `);
    const store = state({ count: 1 });

    const cleanup = bindDom(root, store);
    const spans = root.querySelectorAll('span');
    const input = root.querySelector('input');

    expect(spans[0].textContent).toBe('1');
    expect(spans[1].textContent).toBe('1');
    expect(input.value).toBe('1');

    store.count = 5;
    expect(spans[0].textContent).toBe('5');
    expect(spans[1].textContent).toBe('5');
    expect(input.value).toBe('5');

    input.value = '6';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.count).toBe('6');
    expect(spans[0].textContent).toBe('6');
    expect(spans[1].textContent).toBe('6');

    cleanup();
  });

  it('radio user interaction updates state', () => {
    const root = setupDOM(`
      <div>
        <input type="radio" name="opt" value="a" data-bind="opt" />
        <input type="radio" name="opt" value="b" data-bind="opt" />
      </div>
    `);
    const store = state({ opt: 'a' });

    const cleanup = bindDom(root, store);
    const radios = root.querySelectorAll('input[type="radio"]');

    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);

    radios[1].checked = true;
    radios[1].dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.opt).toBe('b');

    cleanup();
  });

  it('number input sets NaN for non-numeric', () => {
    const root = setupDOM(`<div><input type="number" data-bind="age" /></div>`);
    const store = state({ age: 0 });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="number"]');

    input.value = 'not-a-number';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(Number.isNaN(store.age)).toBe(true);

    cleanup();
  });

  it('range input uses valueAsNumber (right side of OR)', () => {
    const root = setupDOM(`<div><input type="range" min="0" max="10" data-bind="level" /></div>`);
    const store = state({ level: 0 });

    const cleanup = bindDom(root, store);
    const input = root.querySelector('input[type="range"]');

    // programmatic state updates UI
    store.level = 7;
    expect(input.value).toBe('7');

    // user input updates state via valueAsNumber (right-hand branch)
    input.value = '9';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.level).toBe(9);

    cleanup();
  });

  it('cleanup stops DOM updates from subsequent state changes', () => {
    const root = setupDOM(`<div><span data-bind="val"></span></div>`);
    const store = state({ val: 'x' });

    const cleanup = bindDom(root, store);
    const span = root.querySelector('span');
    expect(span.textContent).toBe('x');

    cleanup();
    store.val = 'y';
    // After cleanup, DOM should not update further
    expect(span.textContent).toBe('x');
  });
});
