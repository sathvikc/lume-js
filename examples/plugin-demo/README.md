# Plugin System Demo

This example demonstrates the plugin system in Lume.js 2.0, showing how to extend state with custom behaviors.

## Plugins Demonstrated

### 1. Debug Plugin
Logs all state operations (get, set, subscribe, notify) to help debug your application.

**Use case:** Development mode logging, troubleshooting reactive flows.

### 2. Validation Plugin
Validates data before it's set in state, preventing invalid values.

**Use case:** Form validation, data integrity, business rules enforcement.

### 3. History Plugin
Tracks state changes and enables undo/redo functionality.

**Use case:** User actions history, undo/redo, audit logging.

### 4. Transform Plugin
Transforms values on get/set operations (e.g., uppercase text, format numbers).

**Use case:** Data normalization, formatting, computed transforms.

## Running the Example

```bash
cd examples
npm run dev
```

Then navigate to `http://localhost:5173/plugin-demo/`

## Plugin Interface

All plugins follow the same interface:

```javascript
const myPlugin = {
  name: 'plugin-name',           // Required: unique identifier
  onInit: () => {},              // Called when state is created
  onGet: (key, value) => value,  // Called before returning value
  onSet: (key, newVal, oldVal) => newVal, // Called before setting value
  onSubscribe: (key) => {},      // Called when subscription added
  onNotify: (key, value) => {}   // Called before subscribers notified
};
```

## Creating Your Own Plugin

1. **Define the plugin object** with a unique name
2. **Implement hooks** you need (all are optional)
3. **Return transformed values** from onGet/onSet to modify behavior
4. **Pass to state()** via options

```javascript
const customPlugin = {
  name: 'custom',
  onSet: (key, newValue, oldValue) => {
    console.log(`Changed ${key}`);
    return newValue;
  }
};

const store = state(
  { count: 0 },
  { plugins: [customPlugin] }
);
```

## Performance Notes

- Plugins run synchronously during state operations
- Keep plugin logic lightweight for best performance
- Use plugin hooks sparingly in hot paths
- Multiple plugins execute in order they're registered

## See Also

- [Plugin API Documentation](../../docs/api/core/plugins.md)
- [Design Decisions](../../docs/design/design-decisions.md)
