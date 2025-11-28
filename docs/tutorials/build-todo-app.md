# Tutorial: Build a Todo App

In this tutorial, we will build a fully functional Todo application from scratch using Lume.js.

We won't just paste code; we'll build it step-by-step to understand **how** Lume works. We'll start with a naive implementation and improve it as we go, learning about:

1.  **State**: How to store data.
2.  **DOM Binding**: How to display data.
3.  **Immutability**: Why we update arrays in a specific way.
4.  **Effects**: How to run code when data changes.
5.  **Addons**: Using `repeat` for efficient lists and `computed` for derived data.

## Prerequisites

- A text editor.
- A web browser.
- Basic knowledge of HTML, CSS, and JavaScript.

## Step 1: The Setup

Create a new folder for your project. Inside, create an `index.html` file. We'll use a simple HTML structure and some basic CSS.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lume Todo</title>
  <style>
    body { font-family: sans-serif; max-width: 500px; margin: 2rem auto; padding: 0 1rem; }
    .todo-input { width: 100%; padding: 0.5rem; font-size: 1.2rem; margin-bottom: 1rem; }
    .todo-list { list-style: none; padding: 0; }
    .todo-item { display: flex; align-items: center; padding: 0.5rem; border-bottom: 1px solid #eee; }
    .todo-item.completed span { text-decoration: line-through; color: #888; }
    .todo-item span { flex-grow: 1; margin-left: 0.5rem; }
    .filters { margin-top: 1rem; display: flex; gap: 0.5rem; }
    button { cursor: pointer; }
  </style>
</head>
<body>
  <h1>Todos</h1>
  
  <input type="text" id="new-todo" class="todo-input" placeholder="What needs to be done?">
  
  <ul id="todo-list" class="todo-list">
    <!-- Todos will appear here -->
  </ul>

  <div id="footer" style="display: none;">
    <span id="count"></span> items left
    <div class="filters">
      <button id="btn-all">All</button>
      <button id="btn-active">Active</button>
      <button id="btn-completed">Completed</button>
    </div>
  </div>

  <script type="module">
    import { state, bindDom, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';

    // We'll write our code here!
  </script>
</body>
</html>
```

## Step 2: Creating State

In Lume.js, all your application data lives in a **State** object. It's just a JavaScript object, but Lume watches it for changes.

Add this inside your `<script>` tag:

```javascript
// 1. Define our state
const store = state({
  todos: [
    { id: 1, text: 'Learn Lume.js', completed: false },
    { id: 2, text: 'Build a cool app', completed: false }
  ],
  filter: 'all'
});
```

Nothing happens yet because we haven't connected this state to the HTML.

## Step 3: Rendering the List (The Naive Way)

Let's display our todos. The simplest way is to listen for changes and update the `innerHTML` of our list.

We use `effect()` for this. An effect is a function that runs automatically whenever the data it uses changes.

```javascript
const listEl = document.getElementById('todo-list');

// 2. Render the list
effect(() => {
  console.log('Rendering list...');
  
  // Create HTML for each todo
  const html = store.todos.map(todo => `
    <li class="todo-item ${todo.completed ? 'completed' : ''}">
      <input type="checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}">
      <span>${todo.text}</span>
      <button data-delete="${todo.id}">×</button>
    </li>
  `).join('');

  listEl.innerHTML = html;
});
```

Open your `index.html` in a browser. You should see the two initial todos!

**How it works:**
1. `effect()` runs the function immediately.
2. It sees that we accessed `store.todos`.
3. It records `store.todos` as a dependency.
4. Whenever `store.todos` changes later, this function will run again.

## Step 4: Adding Items (Understanding Immutability)

Now let's make the input work.

```javascript
const inputEl = document.getElementById('new-todo');

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    const newTodo = {
      id: Date.now(),
      text: e.target.value.trim(),
      completed: false
    };

    // ⚠️ CRITICAL: Immutable Update
    store.todos = [...store.todos, newTodo];
    
    e.target.value = ''; // Clear input
  }
});
```

### 🛑 Stop! Why `[...store.todos, newTodo]`?

You might be tempted to write:
```javascript
// ❌ WRONG
store.todos.push(newTodo);
```

**Why is this wrong?**
Lume.js uses **reference equality** to detect changes.
- `push()` modifies the *existing* array. The array is still the same object in memory, so Lume thinks nothing changed.
- `[...store.todos, newTodo]` creates a **new array** containing the old items plus the new one. Lume sees a new object and triggers the update.

This is a common pattern in modern frameworks (like React) because it makes change detection extremely fast.

## Step 5: Handling Clicks (Toggle & Delete)

Since we are re-creating the HTML string every time, we can't easily attach event listeners to each button directly in the loop. Instead, we'll use **Event Delegation**. We attach one listener to the parent list.

```javascript
listEl.addEventListener('click', (e) => {
  // Handle Checkbox Toggle
  if (e.target.type === 'checkbox') {
    const id = Number(e.target.dataset.id);
    
    // Immutable update: Map to a new array
    store.todos = store.todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
  }

  // Handle Delete Button
  if (e.target.hasAttribute('data-delete')) {
    const id = Number(e.target.dataset.delete);
    
    // Immutable update: Filter to a new array
    store.todos = store.todos.filter(t => t.id !== id);
  }
});
```

Try it out! You can now add, toggle, and delete items.

## Step 6: Refactoring to `repeat` (The Better Way)

Our current approach works, but it has a flaw: every time we change *anything*, we re-render the *entire* list string. This is fine for 10 items, but slow for 1000.

Lume provides a `repeat` addon that handles lists efficiently. It only updates the DOM elements that actually changed.

First, update your import:
```javascript
import { state, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
import { repeat } from 'https://cdn.jsdelivr.net/npm/lume-js/src/addons/repeat.js'; // Add this
```

Now, replace our `effect()` rendering logic with `repeat()`:

```javascript
// REPLACE the previous effect() with this:

repeat(listEl, store, 'todos', {
  // Unique ID for each item (critical for tracking)
  key: todo => todo.id,
  
  // Function to create a new DOM element for an item
  render: (todo, el) => {
    el.className = 'todo-item';
    el.innerHTML = `
      <input type="checkbox">
      <span></span>
      <button>×</button>
    `;
    
    // We can attach listeners directly here! No event delegation needed.
    const checkbox = el.querySelector('input');
    checkbox.addEventListener('change', () => {
      store.todos = store.todos.map(t => 
        t.id === todo.id ? { ...t, completed: !t.completed } : t
      );
    });

    el.querySelector('button').addEventListener('click', () => {
      store.todos = store.todos.filter(t => t.id !== todo.id);
    });
  },

  // Function to update an existing element when data changes
  update: (todo, el) => {
    el.classList.toggle('completed', todo.completed);
    el.querySelector('input').checked = todo.completed;
    el.querySelector('span').textContent = todo.text;
  }
});
```

**Why is this better?**
- If you toggle one item, `repeat` only runs the `update` function for that one item.
- If you add an item, it only runs `render` for the new item.
- It's much faster and cleaner.

## Step 7: Computed Values (Counts & Filtering)

We want to show how many items are left. We *could* calculate this manually inside an effect, but Lume has a helper called `computed`.

Update imports:
```javascript
import { computed } from 'https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js';
```

Add this code:

```javascript
// Define a computed value
const activeCount = computed(() => {
  return store.todos.filter(t => !t.completed).length;
});

// Use it in an effect
effect(() => {
  document.getElementById('count').textContent = activeCount.value;
  
  // Show footer only if we have todos
  document.getElementById('footer').style.display = 
    store.todos.length ? 'block' : 'none';
});
```

`computed` values are smart—they cache their result and only re-calculate when `store.todos` changes.

## Step 8: Bonus - LocalStorage Persistence

Finally, let's make sure we don't lose our todos when we refresh. This is where `effect` shines again.

Add this at the end of your script:

```javascript
// 1. Load saved data on startup
const saved = localStorage.getItem('lume-todos');
if (saved) {
  store.todos = JSON.parse(saved);
}

// 2. Save whenever todos change
effect(() => {
  // This runs automatically whenever store.todos changes!
  localStorage.setItem('lume-todos', JSON.stringify(store.todos));
});
```

Because `effect` automatically tracks dependencies, we don't need to manually call a save function in our add/delete/toggle handlers. It just works.

## Summary

You've built a complete reactive application!

**Recap of what we learned:**
1.  **`state()`**: Creates reactive objects.
2.  **`effect()`**: Runs code automatically when state changes.
3.  **Immutability**: We use `[...array]` and `filter/map` to update arrays so Lume can detect changes efficiently.
4.  **`repeat()`**: Efficiently renders lists by updating only what changed.
5.  **`computed()`**: Derives new data from state automatically.

## Next Steps

- Try adding a "Clear Completed" button.
- Read the **[Working with Arrays](working-with-arrays.md)** guide for a deeper dive into data patterns.
