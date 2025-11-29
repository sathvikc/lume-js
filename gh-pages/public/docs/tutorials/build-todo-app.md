# Tutorial: Build a Todo App

In this tutorial, we will build a fully functional Todo App.

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
    import { state, bindDom } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
    import { repeat, computed } from 'https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js';

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

  // 2. Render Function (Creates the DOM element)
  render: (todo, el) => {
    el.className = 'todo-item';
    el.innerHTML = `
      <input type="checkbox" class="toggle">
      <span class="text"></span>
      <button class="delete">×</button>
    `;
    
    // Initial data population
    const checkbox = el.querySelector('.toggle');
    const span = el.querySelector('.text');
    
    checkbox.checked = todo.done;
    span.textContent = todo.text;
    if (todo.done) span.classList.add('done');
  },

  // 3. Update Function (Called when data changes)
  update: (todo, el) => {
    const checkbox = el.querySelector('.toggle');
    const span = el.querySelector('.text');
    
    checkbox.checked = todo.done;
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

Now let's make the checkboxes and delete buttons work. We'll add event listeners inside the `render` function of `repeat`.

Update your `render` function:

```javascript
render: (todo, el) => {
  // ... (previous innerHTML code) ...

  // Handle Toggle
  el.querySelector('.toggle').addEventListener('change', () => {
    // Immutable update: Map to a new array
    store.todos = store.todos.map(t => 
      t.id === todo.id ? { ...t, done: !t.done } : t
    );
  });

  // Handle Delete
  el.querySelector('.delete').addEventListener('click', () => {
    // Immutable update: Filter to a new array
    store.todos = store.todos.filter(t => t.id !== todo.id);
  });

  // ... (previous population code) ...
}
```

## Step 6: Computed Filtering

Let's add a feature to show only "Active" or "Completed" items.

First, add a filter to our state:

```javascript
const store = state({
  todos: [...],
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

Finally, update `repeat` to use `visibleTodos` instead of `store.todos`.

```javascript
// Change 'store' to 'visibleTodos' (computed objects work like stores!)
repeat(listContainer, visibleTodos, 'value', { 
  // ... same options ... 
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
    import { state, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
    import { repeat, computed } from 'https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js';

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
      render: (todo, el) => {
        el.className = 'todo-item';
        el.innerHTML = `
          <input type="checkbox" class="toggle">
          <span class="text"></span>
          <button class="delete">×</button>
        `;
        
        // Bind Events
        el.querySelector('.toggle').addEventListener('change', () => {
          store.todos = store.todos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t);
        });
        
        el.querySelector('.delete').addEventListener('click', () => {
          store.todos = store.todos.filter(t => t.id !== todo.id);
        });

        // Initial State
        el.querySelector('.toggle').checked = todo.done;
        el.querySelector('.text').textContent = todo.text;
        if (todo.done) el.querySelector('.text').classList.add('done');
      },
      update: (todo, el) => {
        el.querySelector('.toggle').checked = todo.done;
        el.querySelector('.text').classList.toggle('done', todo.done);
      }
    });
  </script>
</body>
</html>
```
</details>

---

**Next: [Working with Arrays](../tutorials/working-with-arrays.md) →**
