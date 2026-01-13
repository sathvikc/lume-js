import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from 'src/core/state.js';
import { createDebugPlugin, debug } from 'src/addons/debug.js';

describe('debug addon', () => {
    let consoleSpy;

    beforeEach(() => {
        // Reset debug state before each test
        debug.enable();
        debug.filter(null);
        debug.resetStats();

        // Mock console methods
        consoleSpy = {
            log: vi.spyOn(console, 'log').mockImplementation(() => { }),
            group: vi.spyOn(console, 'group').mockImplementation(() => { }),
            groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => { })
        };
    });

    afterEach(() => {
        consoleSpy.log.mockRestore();
        consoleSpy.group.mockRestore();
        consoleSpy.groupEnd.mockRestore();
    });

    describe('createDebugPlugin', () => {
        it('returns a valid plugin object', () => {
            const plugin = createDebugPlugin();

            expect(plugin).toHaveProperty('name');
            expect(plugin).toHaveProperty('onInit');
            expect(plugin).toHaveProperty('onGet');
            expect(plugin).toHaveProperty('onSet');
            expect(plugin).toHaveProperty('onSubscribe');
            expect(plugin).toHaveProperty('onNotify');
            expect(typeof plugin.onInit).toBe('function');
            expect(typeof plugin.onGet).toBe('function');
            expect(typeof plugin.onSet).toBe('function');
        });

        it('uses default label when no options provided', () => {
            const plugin = createDebugPlugin();
            expect(plugin.name).toBe('debug:store');
        });

        it('uses custom label when provided', () => {
            const plugin = createDebugPlugin({ label: 'myStore' });
            expect(plugin.name).toBe('debug:myStore');
        });

        it('logs initialization when enabled', () => {
            const plugin = createDebugPlugin({ label: 'test' });
            plugin.onInit();

            expect(consoleSpy.log).toHaveBeenCalled();
            expect(consoleSpy.log.mock.calls[0].join(' ')).toContain('test');
            expect(consoleSpy.log.mock.calls[0].join(' ')).toContain('initialized');
        });

        it('logs SET operations by default', async () => {
            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin({ label: 'counter' })]
            });

            consoleSpy.log.mockClear();
            store.count = 5;

            expect(consoleSpy.log).toHaveBeenCalled();
            const logOutput = consoleSpy.log.mock.calls.map(c => c.join(' ')).join(' ');
            expect(logOutput).toContain('SET');
            expect(logOutput).toContain('count');
        });

        it('does NOT log GET operations by default', () => {
            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin({ label: 'counter' })]
            });

            consoleSpy.log.mockClear();
            const _ = store.count;

            // Should not log GET with default options
            const logOutput = consoleSpy.log.mock.calls.map(c => c.join(' ')).join(' ');
            expect(logOutput).not.toContain('GET');
        });

        it('logs GET operations when logGet: true', () => {
            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin({ label: 'counter', logGet: true })]
            });

            consoleSpy.log.mockClear();
            const _ = store.count;

            const logOutput = consoleSpy.log.mock.calls.map(c => c.join(' ')).join(' ');
            expect(logOutput).toContain('GET');
            expect(logOutput).toContain('count');
        });

        it('logs NOTIFY when subscribers are notified', async () => {
            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin({ label: 'counter' })]
            });

            store.$subscribe('count', () => { });
            consoleSpy.log.mockClear();

            store.count = 10;

            // Wait for microtask batch
            await new Promise(resolve => setTimeout(resolve, 0));

            const logOutput = consoleSpy.log.mock.calls.map(c => c.join(' ')).join(' ');
            expect(logOutput).toContain('NOTIFY');
            expect(logOutput).toContain('count');
        });

        it('skips internal $ properties', () => {
            const plugin = createDebugPlugin({ logGet: true });

            consoleSpy.log.mockClear();
            plugin.onGet('$subscribe', () => { });
            plugin.onSet('$internal', 'new', 'old');

            // Should not log $ prefixed keys
            expect(consoleSpy.log).not.toHaveBeenCalled();
        });

        it('shows stack trace when trace option is enabled', () => {
            const traceSpy = vi.spyOn(console, 'trace').mockImplementation(() => { });

            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin({ label: 'traced', trace: true })]
            });

            consoleSpy.log.mockClear();
            store.count = 5;

            expect(traceSpy).toHaveBeenCalled();
            const traceOutput = traceSpy.mock.calls[0].join(' ');
            expect(traceOutput).toContain('traced');
            expect(traceOutput).toContain('count');

            traceSpy.mockRestore();
        });
    });

    describe('debug global controls', () => {
        it('enable() turns on logging', () => {
            debug.disable();
            expect(debug.isEnabled()).toBe(false);

            debug.enable();
            expect(debug.isEnabled()).toBe(true);
        });

        it('disable() turns off logging', () => {
            debug.enable();
            expect(debug.isEnabled()).toBe(true);

            debug.disable();
            expect(debug.isEnabled()).toBe(false);
        });

        it('does not log when disabled', () => {
            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin()]
            });

            debug.disable();
            consoleSpy.log.mockClear();

            store.count = 5;

            // No logs when disabled (except the disable message itself)
            const setLogs = consoleSpy.log.mock.calls.filter(c =>
                c.join(' ').includes('SET')
            );
            expect(setLogs).toHaveLength(0);
        });
    });

    describe('debug.filter()', () => {
        it('filters by string pattern', () => {
            const store = state({ count: 0, name: 'test' }, {
                plugins: [createDebugPlugin()]
            });

            debug.filter('count');
            consoleSpy.log.mockClear();

            store.count = 5;
            store.name = 'updated';

            const logOutput = consoleSpy.log.mock.calls.map(c => c.join(' ')).join(' ');
            expect(logOutput).toContain('count');
            expect(logOutput).not.toContain('name');
        });

        it('filters by RegExp pattern', () => {
            const store = state({ userId: 1, userName: 'test', age: 25 }, {
                plugins: [createDebugPlugin()]
            });

            debug.filter(/^user/);
            consoleSpy.log.mockClear();

            store.userId = 2;
            store.userName = 'updated';
            store.age = 30;

            const logOutput = consoleSpy.log.mock.calls.map(c => c.join(' ')).join(' ');
            expect(logOutput).toContain('userId');
            expect(logOutput).toContain('userName');
            expect(logOutput).not.toContain('age');
        });

        it('clears filter with null', () => {
            debug.filter('count');
            expect(debug.getFilter()).toBe('count');

            debug.filter(null);
            expect(debug.getFilter()).toBeNull();
        });
    });

    describe('debug.stats()', () => {
        it('returns empty object when no stats collected', () => {
            debug.resetStats();
            const stats = debug.stats();
            expect(stats).toEqual({});
        });

        it('tracks get/set/notify counts', async () => {
            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin({ label: 'test', logGet: true })]
            });

            // Perform operations
            store.count = 1;
            store.count = 2;
            const _ = store.count;

            // Wait for notifications
            await new Promise(resolve => setTimeout(resolve, 0));

            const stats = debug.stats();

            expect(stats).toHaveProperty('test');
            expect(stats.test.sets.count).toBe(2);
            expect(stats.test.gets.count).toBeGreaterThanOrEqual(1);
        });

        it('tracks multiple stores separately', () => {
            const store1 = state({ a: 0 }, {
                plugins: [createDebugPlugin({ label: 'store1' })]
            });
            const store2 = state({ b: 0 }, {
                plugins: [createDebugPlugin({ label: 'store2' })]
            });

            store1.a = 1;
            store2.b = 2;

            const stats = debug.stats();

            expect(stats).toHaveProperty('store1');
            expect(stats).toHaveProperty('store2');
            expect(stats.store1.sets.a).toBe(1);
            expect(stats.store2.sets.b).toBe(1);
        });
    });

    describe('debug.resetStats()', () => {
        it('clears all collected statistics', () => {
            const store = state({ count: 0 }, {
                plugins: [createDebugPlugin({ label: 'test' })]
            });

            store.count = 1;

            let stats = debug.stats();
            expect(stats).toHaveProperty('test');

            debug.resetStats();

            stats = debug.stats();
            expect(stats).toEqual({});
        });
    });
});
