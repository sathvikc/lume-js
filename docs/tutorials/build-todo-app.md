# Tutorial: Build a Todo App

Build a fully functional todo app — add, toggle, delete, filter, and persist — using nothing but a single HTML file and a CDN import. No build step required.

**What you will learn:**
- Handling form inputs
- Rendering lists with `repeat` (for performance)
- Filtering data with `computed`
- Persisting data to `localStorage`

## Step 1: The Setup

Create an `index.html` file.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lume Todo</title>
  <style>
    body { font-family: sans-serif; max-width: 500px; margin: 2rem auto; }
    .todo-list { list-style: none; padding: 0; }
    .todo-item { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #eee; }
    .done { text-decoration: line-through; color: #888; }
  </style>
</head>
<body>
  <h1>Todo App</h1>
  
  <!-- Input Form -->
  <form id="todo-form">
    <input id="new-todo" placeholder="What needs to be done?" autocomplete="off">
    <button>Add</button>
  </form>

  <!-- List Container -->
  <ul id="todo-list" class="todo-list"></ul>

  <script type="module">
    import { state, bindDom } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs';
    import { repeat, computed } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/addons.min.mjs';

    // Code goes here...
  </script>
</body>
</html>
```

## Step 2: Define the State

We need a list of todos. Each todo will be an object with an `id`, `text`, and `done` status.

```javascript
const store = state({
  todos: [
    { id: 1, text: 'Learn Lume.js', done: false },
    { id: 2, text: 'Build something cool', done: false }
  ]
});
```

## Step 3: Render the List

We *could* use `innerHTML` like in the Tic-Tac-Toe tutorial. But for lists that change often, Lume provides a helper called `repeat`. It's much faster because it reuses DOM elements.

```javascript
const listContainer = document.getElementById('todo-list');

repeat(listContainer, store, 'todos', {
  // 1. Unique Key (Critical for performance!)
  key: todo => todo.id,

  // 2. Create Function (DOM structure - called once per element)
  create: (todo, el) => {
    el.className = 'todo-item';
    el.innerHTML = `
      <input type="checkbox" class="toggle">
      <span class="text"></span>
      <button class="delete">×</button>
    `;
  },

  // 3. Update Function (Data binding - called on every update)
  update: (todo, el) => {
    const checkbox = el.querySelector('.toggle');
    const span = el.querySelector('.text');
    
    checkbox.checked = todo.done;
    span.textContent = todo.text;
    span.classList.toggle('done', todo.done);
  }
});
```

Open `index.html`. You should see the two initial todos.

## Step 4: Adding Todos

Let's handle the form submission.

```javascript
const form = document.getElementById('todo-form');
const input = document.getElementById('new-todo');

form.addEventListener('submit', (e) => {
  e.preventDefault(); // Prevent page reload
  
  const text = input.value.trim();
  if (!text) return;

  // Create new todo object
  const newTodo = {
    id: Date.now(), // Simple ID generator
    text: text,
    done: false
  };

  // IMPORTANT: Immutable Update!
  // We create a NEW array with the new item at the end.
  store.todos = [...store.todos, newTodo];

  // Clear input
  input.value = '';
});
```

Try adding a few items. They should appear instantly!

## Step 5: Toggling and Deleting

Event listeners belong in `create` — it runs once per DOM element, so you won't accidentally attach duplicate listeners on every update.

Replace your `create` function with this complete version:

```javascript
create: (todo, el) => {
  el.className = 'todo-item';
  el.innerHTML = `
    <input type="checkbox" class="toggle">
    <span class="text"></span>
    <button class="delete">×</button>
  `;

  el.querySelector('.toggle').addEventListener('change', () => {
    store.todos = store.todos.map(t =>
      t.id === todo.id ? { ...t, done: !t.done } : t
    );
  });

  el.querySelector('.delete').addEventListener('click', () => {
    store.todos = store.todos.filter(t => t.id !== todo.id);
  });
}
```

Notice the pattern: `create` sets up structure and listeners, `update` (from the previous step) handles data. They don't overlap.

## Step 6: Computed Filtering

Let's add a feature to show only "Active" or "Completed" items.

First, add a `filter` key to the store. Update your `state()` call to include it:

```javascript
const store = state({
  todos: [
    { id: 1, text: 'Learn Lume.js', done: false },
    { id: 2, text: 'Build something cool', done: false }
  ],
  filter: 'all' // 'all', 'active', 'completed'
});
```

Then, create a `computed` value for the visible todos:

```javascript
const visibleTodos = computed(() => {
  if (store.filter === 'active') {
    return store.todos.filter(t => !t.done);
  }
  if (store.filter === 'completed') {
    return store.todos.filter(t => t.done);
  }
  return store.todos;
});
```

Finally, update `repeat` to read from `visibleTodos` instead of `store` directly. Computed objects work as stores — just use `'value'` as the key:

```javascript
repeat(listContainer, visibleTodos, 'value', {
  key: todo => todo.id,
  create: (todo, el) => { /* same as before */ },
  update: (todo, el) => { /* same as before */ }
});
```

And add some buttons to change the filter:

```html
<div>
  <button onclick="setFilter('all')">All</button>
  <button onclick="setFilter('active')">Active</button>
  <button onclick="setFilter('completed')">Completed</button>
</div>

<script>
  // ...
  window.setFilter = (f) => store.filter = f;
</script>
```

## Step 7: LocalStorage Persistence

We want our todos to survive a page refresh. We can use `effect()` to automatically save whenever `store.todos` changes.

```javascript
// 1. Load initial state
const saved = localStorage.getItem('lume-todos');
const initialTodos = saved ? JSON.parse(saved) : [];

const store = state({
  todos: initialTodos,
  filter: 'all'
});

// 2. Auto-save
effect(() => {
  localStorage.setItem('lume-todos', JSON.stringify(store.todos));
});
```

Now refresh the page. Your todos are still there!

## Final Code

<details>
<summary>Click to see the full working code</summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lume Todo</title>
  <style>
    body { font-family: sans-serif; max-width: 500px; margin: 2rem auto; }
    .todo-list { list-style: none; padding: 0; }
    .todo-item { display: flex; gap: 10px; padding: 5px 0; border-bottom: 1px solid #eee; }
    .done { text-decoration: line-through; color: #888; }
    .filters { margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>Todo App</h1>
  
  <form id="todo-form">
    <input id="new-todo" placeholder="What needs to be done?" autocomplete="off">
    <button>Add</button>
  </form>

  <ul id="todo-list" class="todo-list"></ul>

  <div class="filters">
    <button onclick="setFilter('all')">All</button>
    <button onclick="setFilter('active')">Active</button>
    <button onclick="setFilter('completed')">Completed</button>
  </div>

  <script type="module">
    import { state, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/index.min.mjs';
    import { repeat, computed } from 'https://cdn.jsdelivr.net/npm/lume-js/dist/addons.min.mjs';

    // --- State ---
    const saved = localStorage.getItem('lume-todos');
    const store = state({
      todos: saved ? JSON.parse(saved) : [],
      filter: 'all'
    });

    // --- Persistence ---
    effect(() => {
      localStorage.setItem('lume-todos', JSON.stringify(store.todos));
    });

    // --- Computed ---
    const visibleTodos = computed(() => {
      if (store.filter === 'active') return store.todos.filter(t => !t.done);
      if (store.filter === 'completed') return store.todos.filter(t => t.done);
      return store.todos;
    });

    // --- Actions ---
    window.setFilter = (f) => store.filter = f;

    const form = document.getElementById('todo-form');
    const input = document.getElementById('new-todo');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      store.todos = [...store.todos, { id: Date.now(), text, done: false }];
      input.value = '';
    });

    // --- Render ---
    const listContainer = document.getElementById('todo-list');

    repeat(listContainer, visibleTodos, 'value', {
      key: todo => todo.id,
      create: (todo, el) => {
        el.className = 'todo-item';
        el.innerHTML = `
          <input type="checkbox" class="toggle">
          <span class="text"></span>
          <button class="delete">×</button>
        `;
        
        // Bind Events (once)
        el.querySelector('.toggle').addEventListener('change', () => {
          store.todos = store.todos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t);
        });
        
        el.querySelector('.delete').addEventListener('click', () => {
          store.todos = store.todos.filter(t => t.id !== todo.id);
        });
      },
      update: (todo, el) => {
        el.querySelector('.toggle').checked = todo.done;
        el.querySelector('.text').textContent = todo.text;
        el.querySelector('.text').classList.toggle('done', todo.done);
      }
    });
  </script>
</body>
</html>
```
</details>

---

<!-- lume:nav -->
**← Previous: [htmlAttrs](../api/handlers/htmlAttrs.md)** | **Next: [Build Tic-Tac-Toe](build-tic-tac-toe.md) →**
<!-- /lume:nav -->
