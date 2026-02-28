import { describe, it, expect, vi } from 'vitest';
import { state } from 'src/core/state.js';
import { bindDom } from 'src/core/bindDom.js';
import { show, boolAttr, ariaAttr, classToggle, stringAttr, formHandlers, a11yHandlers } from 'src/handlers/index.js';

function setupDOM(html) {
  document.body.innerHTML = html;
  return document.body;
}

describe('handlers module', () => {
  describe('show handler', () => {
    it('shows element when state is truthy', async () => {
      const root = setupDOM(`<div><span data-show="isVisible">Content</span></div>`);
      const store = state({ isVisible: true });

      const cleanup = bindDom(root, store, { handlers: [show] });
      const span = root.querySelector('span');

      expect(span.hidden).toBe(false);

      store.isVisible = false;
      await Promise.resolve();
      expect(span.hidden).toBe(true);

      store.isVisible = true;
      await Promise.resolve();
      expect(span.hidden).toBe(false);

      cleanup();
    });

    it('hides element when state is falsy', () => {
      const root = setupDOM(`<div><span data-show="isVisible">Content</span></div>`);
      const store = state({ isVisible: false });

      const cleanup = bindDom(root, store, { handlers: [show] });
      expect(root.querySelector('span').hidden).toBe(true);

      cleanup();
    });

    it('works alongside data-bind', async () => {
      const root = setupDOM(`
        <div>
          <input data-bind="name" />
          <span data-show="showName" data-bind="name"></span>
        </div>
      `);
      const store = state({ name: 'Alice', showName: true });

      const cleanup = bindDom(root, store, { handlers: [show] });
      const span = root.querySelector('span');

      expect(span.textContent).toBe('Alice');
      expect(span.hidden).toBe(false);

      store.showName = false;
      await Promise.resolve();
      expect(span.hidden).toBe(true);
      expect(span.textContent).toBe('Alice'); // text still bound

      cleanup();
    });
  });

  describe('classToggle factory', () => {
    it('toggles a single CSS class', async () => {
      const root = setupDOM(`<div><span data-class-active="isActive">Item</span></div>`);
      const store = state({ isActive: false });

      const cleanup = bindDom(root, store, { handlers: [classToggle('active')] });
      const span = root.querySelector('span');

      expect(span.classList.contains('active')).toBe(false);

      store.isActive = true;
      await Promise.resolve();
      expect(span.classList.contains('active')).toBe(true);

      store.isActive = false;
      await Promise.resolve();
      expect(span.classList.contains('active')).toBe(false);

      cleanup();
    });

    it('handles multiple class names', async () => {
      const root = setupDOM(`
        <div>
          <span data-class-active="isActive" data-class-loading="isLoading">Item</span>
        </div>
      `);
      const store = state({ isActive: true, isLoading: false });

      const cleanup = bindDom(root, store, { handlers: [classToggle('active', 'loading')] });
      const span = root.querySelector('span');

      expect(span.classList.contains('active')).toBe(true);
      expect(span.classList.contains('loading')).toBe(false);

      store.isLoading = true;
      await Promise.resolve();
      expect(span.classList.contains('active')).toBe(true);
      expect(span.classList.contains('loading')).toBe(true);

      cleanup();
    });

    it('does not affect other classes on the element', async () => {
      const root = setupDOM(`<div><span class="existing-class" data-class-active="isActive">Item</span></div>`);
      const store = state({ isActive: true });

      const cleanup = bindDom(root, store, { handlers: [classToggle('active')] });
      const span = root.querySelector('span');

      expect(span.classList.contains('existing-class')).toBe(true);
      expect(span.classList.contains('active')).toBe(true);

      store.isActive = false;
      await Promise.resolve();
      expect(span.classList.contains('existing-class')).toBe(true);
      expect(span.classList.contains('active')).toBe(false);

      cleanup();
    });
  });

  describe('boolAttr factory', () => {
    it('creates a handler for custom boolean attributes', async () => {
      const root = setupDOM(`<div><input data-readonly="isReadonly" /></div>`);
      const store = state({ isReadonly: true });

      const cleanup = bindDom(root, store, { handlers: [boolAttr('readonly')] });
      const input = root.querySelector('input');

      expect(input.hasAttribute('readonly')).toBe(true);

      store.isReadonly = false;
      await Promise.resolve();
      expect(input.hasAttribute('readonly')).toBe(false);

      cleanup();
    });

    it('can override built-in boolean handlers', async () => {
      // Create a custom hidden handler that uses style instead
      const customHidden = {
        attr: 'data-hidden',
        apply(el, val) { el.style.display = val ? 'none' : ''; }
      };

      const root = setupDOM(`<div><span data-hidden="isHidden">Content</span></div>`);
      const store = state({ isHidden: true });

      const cleanup = bindDom(root, store, { handlers: [customHidden] });
      const span = root.querySelector('span');

      expect(span.style.display).toBe('none');

      store.isHidden = false;
      await Promise.resolve();
      expect(span.style.display).toBe('');

      cleanup();
    });
  });

  describe('ariaAttr factory', () => {
    it('creates a handler for ARIA attributes with prefix', async () => {
      const root = setupDOM(`<div><button data-aria-pressed="isPressed">Toggle</button></div>`);
      const store = state({ isPressed: false });

      const cleanup = bindDom(root, store, { handlers: [ariaAttr('pressed')] });
      const button = root.querySelector('button');

      expect(button.getAttribute('aria-pressed')).toBe('false');

      store.isPressed = true;
      await Promise.resolve();
      expect(button.getAttribute('aria-pressed')).toBe('true');

      cleanup();
    });

    it('accepts full aria- prefixed name', async () => {
      const root = setupDOM(`<div><div data-aria-selected="isSelected">Item</div></div>`);
      const store = state({ isSelected: true });

      const cleanup = bindDom(root, store, { handlers: [ariaAttr('aria-selected')] });
      const div = root.querySelector('div > div');

      expect(div.getAttribute('aria-selected')).toBe('true');

      store.isSelected = false;
      await Promise.resolve();
      expect(div.getAttribute('aria-selected')).toBe('false');

      cleanup();
    });
  });

  describe('stringAttr factory', () => {
    it('sets href attribute reactively', async () => {
      const root = setupDOM(`<div><a data-href="url">Link</a></div>`);
      const store = state({ url: 'https://example.com' });

      const cleanup = bindDom(root, store, { handlers: [stringAttr('href')] });
      const link = root.querySelector('a');

      expect(link.getAttribute('href')).toBe('https://example.com');

      store.url = 'https://other.com';
      await Promise.resolve();
      expect(link.getAttribute('href')).toBe('https://other.com');

      cleanup();
    });

    it('sets src attribute reactively', async () => {
      const root = setupDOM(`<div><img data-src="imageUrl" /></div>`);
      const store = state({ imageUrl: '/img/photo.jpg' });

      const cleanup = bindDom(root, store, { handlers: [stringAttr('src')] });
      const img = root.querySelector('img');

      expect(img.getAttribute('src')).toBe('/img/photo.jpg');

      store.imageUrl = '/img/other.jpg';
      await Promise.resolve();
      expect(img.getAttribute('src')).toBe('/img/other.jpg');

      cleanup();
    });

    it('removes attribute when value is null', async () => {
      const root = setupDOM(`<div><a data-href="url">Link</a></div>`);
      const store = state({ url: 'https://example.com' });

      const cleanup = bindDom(root, store, { handlers: [stringAttr('href')] });
      const link = root.querySelector('a');

      expect(link.hasAttribute('href')).toBe(true);

      store.url = null;
      await Promise.resolve();
      expect(link.hasAttribute('href')).toBe(false);

      cleanup();
    });

    it('removes attribute when value is undefined', async () => {
      const root = setupDOM(`<div><a data-href="url">Link</a></div>`);
      const store = state({ url: 'https://example.com' });

      const cleanup = bindDom(root, store, { handlers: [stringAttr('href')] });
      const link = root.querySelector('a');

      store.url = undefined;
      await Promise.resolve();
      expect(link.hasAttribute('href')).toBe(false);

      cleanup();
    });

    it('converts non-string values to string', async () => {
      const root = setupDOM(`<div><span data-title="count">Text</span></div>`);
      const store = state({ count: 42 });

      const cleanup = bindDom(root, store, { handlers: [stringAttr('title')] });
      const span = root.querySelector('span');

      expect(span.getAttribute('title')).toBe('42');

      store.count = 0;
      await Promise.resolve();
      expect(span.getAttribute('title')).toBe('0');

      cleanup();
    });
  });

  describe('custom handlers', () => {
    it('accepts a plain object as handler', async () => {
      const tooltip = {
        attr: 'data-tooltip',
        apply(el, val) { el.title = val ?? ''; }
      };

      const root = setupDOM(`<div><span data-tooltip="tip">Hover me</span></div>`);
      const store = state({ tip: 'Hello!' });

      const cleanup = bindDom(root, store, { handlers: [tooltip] });
      const span = root.querySelector('span');

      expect(span.title).toBe('Hello!');

      store.tip = 'Updated!';
      await Promise.resolve();
      expect(span.title).toBe('Updated!');

      cleanup();
    });

    it('supports multiple custom handlers together', async () => {
      const bgColor = {
        attr: 'data-bg',
        apply(el, val) { el.style.backgroundColor = val ?? ''; }
      };
      const textColor = {
        attr: 'data-color',
        apply(el, val) { el.style.color = val ?? ''; }
      };

      const root = setupDOM(`<div><span data-bg="bg" data-color="fg">Styled</span></div>`);
      const store = state({ bg: 'red', fg: 'white' });

      const cleanup = bindDom(root, store, { handlers: [bgColor, textColor] });
      const span = root.querySelector('span');

      expect(span.style.backgroundColor).toBe('red');
      expect(span.style.color).toBe('white');

      store.bg = 'blue';
      await Promise.resolve();
      expect(span.style.backgroundColor).toBe('blue');

      cleanup();
    });
  });

  describe('handler composition', () => {
    it('combines multiple handler types in one bindDom call', async () => {
      const root = setupDOM(`
        <div>
          <input data-bind="name" />
          <span data-show="showName" data-class-highlight="isHighlighted" data-bind="name"></span>
          <a data-href="url">Link</a>
        </div>
      `);
      const store = state({
        name: 'Alice',
        showName: true,
        isHighlighted: false,
        url: 'https://example.com'
      });

      const cleanup = bindDom(root, store, {
        handlers: [show, classToggle('highlight'), stringAttr('href')]
      });

      const span = root.querySelector('span');
      const link = root.querySelector('a');

      expect(span.textContent).toBe('Alice');
      expect(span.hidden).toBe(false);
      expect(span.classList.contains('highlight')).toBe(false);
      expect(link.getAttribute('href')).toBe('https://example.com');

      store.isHighlighted = true;
      store.showName = false;
      store.url = 'https://other.com';
      await Promise.resolve();

      expect(span.hidden).toBe(true);
      expect(span.classList.contains('highlight')).toBe(true);
      expect(link.getAttribute('href')).toBe('https://other.com');

      cleanup();
    });

    it('handler array flattening works (classToggle returns array)', () => {
      const root = setupDOM(`
        <div>
          <span data-class-a="flagA" data-class-b="flagB">Item</span>
        </div>
      `);
      const store = state({ flagA: true, flagB: false });

      // classToggle returns array — passed directly, auto-flattened
      const cleanup = bindDom(root, store, {
        handlers: [classToggle('a', 'b')]
      });

      const span = root.querySelector('span');
      expect(span.classList.contains('a')).toBe(true);
      expect(span.classList.contains('b')).toBe(false);

      cleanup();
    });
  });

  describe('backwards compatibility', () => {
    it('works without handlers option (default behavior)', async () => {
      const root = setupDOM(`
        <div>
          <input data-bind="name" />
          <span data-hidden="isHidden">Hidden</span>
          <button data-disabled="isDisabled" data-aria-expanded="isOpen">Menu</button>
        </div>
      `);
      const store = state({
        name: 'Alice',
        isHidden: true,
        isDisabled: false,
        isOpen: false
      });

      const cleanup = bindDom(root, store);
      const input = root.querySelector('input');
      const span = root.querySelector('span');
      const button = root.querySelector('button');

      expect(input.value).toBe('Alice');
      expect(span.hidden).toBe(true);
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-expanded')).toBe('false');

      store.isHidden = false;
      store.isOpen = true;
      await Promise.resolve();

      expect(span.hidden).toBe(false);
      expect(button.getAttribute('aria-expanded')).toBe('true');

      cleanup();
    });

    it('empty handlers array has no effect', () => {
      const root = setupDOM(`<div><span data-bind="val">Text</span></div>`);
      const store = state({ val: 'hello' });

      const cleanup = bindDom(root, store, { handlers: [] });
      expect(root.querySelector('span').textContent).toBe('hello');

      cleanup();
    });
  });

  describe('handler override', () => {
    it('user handler overrides built-in with same attr', async () => {
      // Override data-hidden to use display instead of hidden property
      const customHidden = {
        attr: 'data-hidden',
        apply(el, val) {
          el.style.display = val ? 'none' : '';
        }
      };

      const root = setupDOM(`<div><span data-hidden="isHidden">Content</span></div>`);
      const store = state({ isHidden: true });

      const cleanup = bindDom(root, store, { handlers: [customHidden] });
      const span = root.querySelector('span');

      // Custom handler uses style.display, not el.hidden
      expect(span.style.display).toBe('none');

      store.isHidden = false;
      await Promise.resolve();
      expect(span.style.display).toBe('');

      cleanup();
    });
  });

  describe('presets', () => {
    it('formHandlers includes readonly', () => {
      expect(formHandlers).toHaveLength(1);
      expect(formHandlers[0].attr).toBe('data-readonly');
    });

    it('a11yHandlers includes pressed, selected, disabled', () => {
      expect(a11yHandlers).toHaveLength(3);
      const attrs = a11yHandlers.map(h => h.attr);
      expect(attrs).toContain('data-aria-pressed');
      expect(attrs).toContain('data-aria-selected');
      expect(attrs).toContain('data-aria-disabled');
    });

    it('formHandlers work with bindDom', async () => {
      const root = setupDOM(`<div><input data-readonly="isReadonly" /></div>`);
      const store = state({ isReadonly: true });

      const cleanup = bindDom(root, store, { handlers: formHandlers });
      const input = root.querySelector('input');

      expect(input.hasAttribute('readonly')).toBe(true);

      store.isReadonly = false;
      await Promise.resolve();
      expect(input.hasAttribute('readonly')).toBe(false);

      cleanup();
    });
  });

  describe('edge cases', () => {
    it('handler with invalid path warns gracefully', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const root = setupDOM(`<div><span data-show="nonexistent.deep.path">Content</span></div>`);
      const store = state({ other: 'value' });

      const cleanup = bindDom(root, store, { handlers: [show] });
      // should not crash
      cleanup();
      warnSpy.mockRestore();
    });

    it('cleanup removes all handler subscriptions', async () => {
      const root = setupDOM(`<div><span data-show="flag">Content</span></div>`);
      const store = state({ flag: true });

      const cleanup = bindDom(root, store, { handlers: [show] });
      const span = root.querySelector('span');

      expect(span.hidden).toBe(false);
      cleanup();

      store.flag = false;
      await Promise.resolve();
      // After cleanup, handler should not update element
      expect(span.hidden).toBe(false);
    });

    it('supports nested state paths in handlers', async () => {
      const userStore = state({ isActive: true });
      const root = setupDOM(`<div><span data-show="user.isActive">Content</span></div>`);
      const store = state({ user: userStore });

      const cleanup = bindDom(root, store, { handlers: [show] });
      const span = root.querySelector('span');

      expect(span.hidden).toBe(false);

      userStore.isActive = false;
      await Promise.resolve();
      expect(span.hidden).toBe(true);

      cleanup();
    });

    it('multiple elements with same handler', async () => {
      const root = setupDOM(`
        <div>
          <span data-show="flagA">A</span>
          <span data-show="flagB">B</span>
          <span data-show="flagA">A2</span>
        </div>
      `);
      const store = state({ flagA: true, flagB: false });

      const cleanup = bindDom(root, store, { handlers: [show] });
      const spans = root.querySelectorAll('span');

      expect(spans[0].hidden).toBe(false);
      expect(spans[1].hidden).toBe(true);
      expect(spans[2].hidden).toBe(false);

      store.flagA = false;
      await Promise.resolve();
      expect(spans[0].hidden).toBe(true);
      expect(spans[2].hidden).toBe(true);
      expect(spans[1].hidden).toBe(true); // unchanged

      cleanup();
    });

    it('handler on element with data-bind does not interfere', async () => {
      const root = setupDOM(`
        <div>
          <input data-bind="value" data-disabled="isDisabled" />
        </div>
      `);
      const store = state({ value: 'hello', isDisabled: false });

      const cleanup = bindDom(root, store);
      const input = root.querySelector('input');

      expect(input.value).toBe('hello');
      expect(input.disabled).toBe(false);

      // Two-way binding still works
      input.value = 'world';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(store.value).toBe('world');

      // Boolean handler still works
      store.isDisabled = true;
      await Promise.resolve();
      expect(input.disabled).toBe(true);

      cleanup();
    });
  });
});
