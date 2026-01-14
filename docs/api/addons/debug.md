# createDebugPlugin(options)

Developer-friendly logging and inspection of reactive state operations.

## Import

```javascript
import { createDebugPlugin, debug } from 'lume-js/addons';
```

## createDebugPlugin(options)

Creates a debug plugin instance for a reactive state store.

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
import { createDebugPlugin } from 'lume-js/addons';

const store = state({ count: 0 }, { 
  plugins: [createDebugPlugin({ 
    label: 'counter',
    logGet: true,
    logSet: true,
    logNotify: true,
    trace: true  // Show stack traces for debugging
  })] 
});

store.count++;
// Console: [counter] SET count: 0 → 1
// Console: [counter] Stack trace for count (if trace: true)
```

### Dynamic Options

Options can use getters for runtime toggling:

```javascript
const config = { logGet: false };

const store = state({ count: 0 }, { 
  plugins: [createDebugPlugin({ 
    label: 'myStore',
    get logGet() { return config.logGet; }
  })]
});

// Toggle at runtime
config.logGet = true;  // Now GET operations will log
```

## debug (Global Controls)

Global debug object for controlling all debug plugins.

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

**← Previous: [watch()](watch.md)** | **Next: [Guides](../../guides/README.md) →**

> **Demo:** See the [Debug Demo](/examples/debug-demo/) for interactive usage.
