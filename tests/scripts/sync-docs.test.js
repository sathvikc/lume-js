import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createEngine } from '../../scripts/sync-docs.js';

const ROOT = '/fake-repo';

const METRICS = {
  version: '2.3.1',
  tests: 439,
  sizes: { state: '1.46', index: '2.66', handlers: '1.23', addons: '4.68', global: '7.44' },
  budgets: { state: '1.75', index: '3.00', handlers: '2.00', addons: '6.00' },
  browserFloor: { chrome: '80+', firefox: '74+', safari: '13.1+', edge: '80+' },
};

function fakeIo(files) {
  const abs = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));
  const map = new Map(Object.entries(files).map(([k, v]) => [abs(k), v]));
  return {
    readFileSync: (p) => {
      if (!map.has(p)) throw new Error(`ENOENT: ${p}`);
      return map.get(p);
    },
    existsSync: (p) => map.has(p),
  };
}

const THREE_PAGE_MANIFEST = {
  sections: [
    {
      title: 'Guides',
      entries: [
        { path: 'docs/guides/a.md', title: 'A', description: 'first' },
        { path: 'docs/guides/b.md', title: 'B', description: 'second' },
      ],
    },
    {
      title: 'API',
      entries: [
        { path: 'docs/api/c.md', title: 'C', description: 'third' },
      ],
    },
  ],
};

describe('createEngine — manifest path validation', () => {
  it('throws when a manifest entry points at a missing file', () => {
    const io = fakeIo({
      'docs/guides/a.md': 'content',
      // b.md intentionally missing
      'docs/api/c.md': 'content',
    });
    expect(() => createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io }))
      .toThrow('docs/manifest.json references a missing path: docs/guides/b.md');
  });
});

describe('createEngine — inline value markers', () => {
  it('replaces an inline lume:version marker with the current metrics value', () => {
    const io = fakeIo({
      'docs/guides/a.md': 'v<!-- lume:version -->OLD<!-- /lume:version --> is current.',
      'docs/guides/b.md': 'no markers here',
      'docs/api/c.md': 'no markers here',
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    const { updated, changed } = engine.syncFile('docs/guides/a.md');
    expect(changed).toBe(true);
    expect(updated).toBe('v<!-- lume:version -->2.3.1<!-- /lume:version --> is current.');
  });

  it('resolves every documented VALUES key from metrics.json', () => {
    const io = fakeIo({
      'docs/guides/a.md': 'content',
      'docs/guides/b.md': 'content',
      'docs/api/c.md': 'content',
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    expect(engine.VALUES['lume:version']).toBe('2.3.1');
    expect(engine.VALUES['lume:tests']).toBe('439');
    expect(engine.VALUES['lume:size-state']).toBe('1.46');
    expect(engine.VALUES['lume:budget-index']).toBe('3.00');
    expect(engine.VALUES['lume:browser-safari']).toBe('13.1+');
  });
});

describe('createEngine — whole-line markers', () => {
  it('regenerates a badge line from surrounding markers', () => {
    const io = fakeIo({
      'docs/guides/a.md': [
        'before',
        '<!-- lume:badge-version -->',
        '    <a href="package.json"><img src="https://img.shields.io/badge/version-OLD-orange.svg" alt="vOLD"></a>',
        '<!-- /lume:badge-version -->',
        'after',
      ].join('\n'),
      'docs/guides/b.md': 'content',
      'docs/api/c.md': 'content',
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    const { updated } = engine.syncFile('docs/guides/a.md');
    expect(updated).toContain('badge/version-2.3.1-orange.svg');
    expect(updated).toContain('alt="v2.3.1"');
    expect(updated.startsWith('before\n<!-- lume:badge-version -->')).toBe(true);
    expect(updated.endsWith('<!-- /lume:badge-version -->\nafter')).toBe(true);
  });
});

describe('createEngine — unknown and malformed markers', () => {
  it('throws on an unrecognized marker key', () => {
    const io = fakeIo({
      'docs/guides/a.md': '<!-- lume:not-a-real-key -->x<!-- /lume:not-a-real-key -->',
      'docs/guides/b.md': 'content',
      'docs/api/c.md': 'content',
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    expect(() => engine.syncFile('docs/guides/a.md')).toThrow("Unknown marker 'lume:not-a-real-key'");
  });

  it('throws on an unbalanced open/close pair', () => {
    const io = fakeIo({
      'docs/guides/a.md': '<!-- lume:version -->2.3.1 with no closing tag',
      'docs/guides/b.md': 'content',
      'docs/api/c.md': 'content',
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    expect(() => engine.syncFile('docs/guides/a.md')).toThrow("Malformed marker 'lume:version'");
  });
});

describe('createEngine — idempotency', () => {
  it('reports no change on a second sync pass', () => {
    const io = fakeIo({
      'docs/guides/a.md': 'v<!-- lume:version -->OLD<!-- /lume:version -->',
      'docs/guides/b.md': 'content',
      'docs/api/c.md': 'content',
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    const first = engine.syncFile('docs/guides/a.md');
    expect(first.changed).toBe(true);

    // Second pass reads the already-updated content.
    const io2 = fakeIo({
      'docs/guides/a.md': first.updated,
      'docs/guides/b.md': 'content',
      'docs/api/c.md': 'content',
    });
    const engine2 = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io2 });
    const second = engine2.syncFile('docs/guides/a.md');
    expect(second.changed).toBe(false);
    expect(second.updated).toBe(first.updated);
  });
});

describe('createEngine — nav footer spine', () => {
  const withNav = (title) => `# ${title}\n<!-- lume:nav -->\nplaceholder\n<!-- /lume:nav -->\n`;

  it('gives the first spine entry only a Next link', () => {
    const io = fakeIo({
      'docs/README.md': withNav('Index'),
      'docs/guides/a.md': withNav('A'),
      'docs/guides/b.md': withNav('B'),
      'docs/api/c.md': withNav('C'),
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    const footer = engine.navFooter('docs/README.md');
    expect(footer).toContain('Next: [A](guides/a.md)');
    expect(footer).not.toContain('Previous');
  });

  it('gives the last spine entry only a Previous link', () => {
    const io = fakeIo({
      'docs/README.md': withNav('Index'),
      'docs/guides/a.md': withNav('A'),
      'docs/guides/b.md': withNav('B'),
      'docs/api/c.md': withNav('C'),
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    const footer = engine.navFooter('docs/api/c.md');
    expect(footer).toContain('Previous: [B]');
    expect(footer).not.toContain('Next');
  });

  it('computes correct relative paths across directories for a middle entry', () => {
    const io = fakeIo({
      'docs/README.md': withNav('Index'),
      'docs/guides/a.md': withNav('A'),
      'docs/guides/b.md': withNav('B'),
      'docs/api/c.md': withNav('C'),
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    const footer = engine.navFooter('docs/guides/b.md');
    expect(footer).toContain('Previous: [A](a.md)');
    expect(footer).toContain('Next: [C](../api/c.md)');
  });

  it('excludes entries without a lume:nav marker from the spine (e.g. historical docs)', () => {
    const io = fakeIo({
      'docs/README.md': withNav('Index'),
      'docs/guides/a.md': withNav('A'),
      'docs/guides/b.md': 'no nav marker here — like design-decisions.md',
      'docs/api/c.md': withNav('C'),
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    // b.md is skipped, so a.md's next neighbor is c.md, not b.md.
    const footer = engine.navFooter('docs/guides/a.md');
    expect(footer).toContain('Next: [C](../api/c.md)');
  });

  it('throws if asked for the footer of a file outside the spine', () => {
    const io = fakeIo({
      'docs/README.md': withNav('Index'),
      'docs/guides/a.md': withNav('A'),
      'docs/guides/b.md': 'no nav marker',
      'docs/api/c.md': withNav('C'),
    });
    const engine = createEngine(METRICS, THREE_PAGE_MANIFEST, { root: ROOT, ...io });
    expect(() => engine.navFooter('docs/guides/b.md')).toThrow('not in the nav spine');
  });
});

describe('createEngine — docs/README index block', () => {
  it('renders one heading and bullet list per docIndex-eligible section, in manifest order', () => {
    const manifestWithHiddenSection = {
      sections: [
        {
          title: 'Start here',
          docIndex: false,
          entries: [{ path: 'AGENT_GUIDE.md', title: 'Agent guide', description: 'x' }],
        },
        ...THREE_PAGE_MANIFEST.sections,
      ],
    };
    const io = fakeIo({
      'AGENT_GUIDE.md': 'content',
      'docs/guides/a.md': 'content',
      'docs/guides/b.md': 'content',
      'docs/api/c.md': 'content',
    });
    const engine = createEngine(METRICS, manifestWithHiddenSection, { root: ROOT, ...io });
    const block = engine.docIndexBlock();
    expect(block).not.toContain('Start here');
    expect(block).not.toContain('Agent guide');
    expect(block).toContain('### Guides\n- [A](guides/a.md)\n- [B](guides/b.md)');
    expect(block).toContain('### API\n- [C](api/c.md)');
  });
});
