# createDebugPlugin(options)

`createDebugPlugin` logs every read, write, and notification on a store to the console. Use it during development to see exactly which state changes triggered which updates — and which keys are being read more than you expect.

## Import

```javascript
import { state } from 'lume-js';
import { withPlugins, createDebugPlugin, debug } from 'lume-js/addons';
```

## createDebugPlugin(options)

Creates a debug plugin object. Wrap it with `withPlugins()` to apply it to a store.

### Signature

```typescript
function createDebugPlugin(options?: DebugPluginOptions): Plugin;

interface DebugPluginOptions {
  label?: string;       // Label for log messages (default: 'store')
  logGet?: boolean;     // Log property reads (default: false)
  logSet?: boolean;     // Log property writes (default: true)
  logNotify?: boolean;  // Log subscriber notifications (default: true)
  trace?: boolean;      // Show stack trace for SET operations (default: false)
}
```

### Example

```javascript
import { state } from 'lume-js';
import { withPlugins, createDebugPlugin } from 'lume-js/addons';

const store = withPlugins(state({ count: 0 }), [
  createDebugPlugin({ 
    label: 'counter',
    logGet: true,
    logSet: true,
    logNotify: true,
    trace: true  // Show stack traces for debugging
  })
]);

store.count++;
// Console: [counter] SET count: 0 → 1
// Console: [counter] Stack trace for count (if trace: true)
```

### Dynamic Options

Options can use getters for runtime toggling:

```javascript
const config = { logGet: false };

const store = withPlugins(state({ count: 0 }), [
  createDebugPlugin({ 
    label: 'myStore',
    get logGet() { return config.logGet; }
  })
]);

// Toggle at runtime
config.logGet = true;  // Now GET operations will log
```

## debug (Global Controls)

`debug` is a global object that controls all active debug plugins at once. Use it to toggle logging, filter by key name, or inspect operation counts without touching each store individually.

### Methods

| Method | Description |
|--------|-------------|
| `debug.enable()` | Enable debug logging globally |
| `debug.disable()` | Disable debug logging globally |
| `debug.isEnabled()` | Check if logging is enabled |
| `debug.filter(pattern)` | Filter by key (string, RegExp, or null) |
| `debug.getFilter()` | Get current filter pattern |
| `debug.stats()` | Get statistics data (silent) |
| `debug.logStats()` | Log statistics to console with table |
| `debug.resetStats()` | Clear all statistics |

### Example

```javascript
import { debug } from 'lume-js/addons';

debug.enable();           // Turn on logging
debug.filter('count');    // Only log keys containing 'count'
debug.filter(/^user/);    // Only log keys starting with 'user'
debug.filter(null);       // Clear filter

const stats = debug.stats();  // Get stats data (silent)
debug.logStats();             // Log stats to console with formatting
debug.resetStats();           // Clear stats
```

## Statistics

The debug addon tracks operation counts for each store:

```javascript
const stats = debug.stats();
// {
//   counter: {
//     gets: { count: 5 },
//     sets: { count: 3 },
//     notifies: { count: 3 }
//   },
//   user: {
//     gets: { name: 2, age: 1 },
//     sets: { name: 1 },
//     notifies: { name: 1 }
//   }
// }
```

## Console Output

Debug logs use colored output:
- **GET** (green): Property reads
- **SET** (orange): Property writes  
- **NOTIFY** (pink): Subscriber notifications
- **SUBSCRIBE** (purple): New subscriptions

---

<!-- lume:nav -->
**← Previous: [hydrateState()](hydrateState.md)** | **Next: [withPlugins()](withPlugins.md) →**
<!-- /lume:nav -->
