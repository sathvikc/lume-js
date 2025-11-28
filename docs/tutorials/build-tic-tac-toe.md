# Tutorial: Tic-Tac-Toe

This tutorial will guide you through building a complete Tic-Tac-Toe game with "Time Travel".

**What you will learn:**
- Creating reactive state
- Rendering lists
- Handling clicks
- Computed values
- Implementing "Undo" (Time Travel)

## Step 1: The Setup

Create an `index.html` file. We'll put everything in here.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lume Tic-Tac-Toe</title>
  <style>
    /* Basic CSS to make it look decent */
    body { font-family: sans-serif; margin: 20px; }
    .board-row { display: flex; }
    .square { 
      width: 60px; height: 60px; 
      background: #fff; border: 1px solid #999;
      font-size: 24px; font-weight: bold;
      margin: -1px -1px 0 0; padding: 0;
      cursor: pointer;
    }
    .square:focus { background: #ddd; }
    .game { display: flex; gap: 20px; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    import { state, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
    import { computed } from 'https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js';

    const root = document.getElementById('root');

    // We will write our code here...
  </script>
</body>
</html>
```

## Step 2: Define the State

We need a place to store the game state. For a simple board, we need an array of 9 squares.

```javascript
// 1. Create the state
const store = state({
  squares: Array(9).fill(null), // [null, null, null, ...]
  xIsNext: true                 // 'X' starts first
});
```

## Step 3: Render the Board

Now let's display the board. We'll use `effect()` to render the HTML whenever the state changes.

```javascript
// 2. Render the board
effect(() => {
  const status = `Next player: ${store.xIsNext ? 'X' : 'O'}`;

  root.innerHTML = `
    <div class="status">${status}</div>
    <div class="board">
      ${[0, 1, 2].map(row => `
        <div class="board-row">
          ${[0, 1, 2].map(col => {
            const i = row * 3 + col;
            return `<button class="square" data-index="${i}">${store.squares[i] || ''}</button>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
  `;
});
```

Open `index.html` in your browser. You should see the empty grid.

## Step 4: Handle Clicks

We need to update the state when a user clicks a square. We'll use **Event Delegation** (attaching one listener to the root) for better performance.

```javascript
// 3. Handle clicks
root.addEventListener('click', (e) => {
  // Only care if a .square was clicked
  if (!e.target.matches('.square')) return;
  
  const i = parseInt(e.target.dataset.index);
  
  // If square is already filled, ignore
  if (store.squares[i]) return;

  // IMPORTANT: Create a COPY of the array (Immutability)
  const nextSquares = [...store.squares];
  
  // Update the copy
  nextSquares[i] = store.xIsNext ? 'X' : 'O';
  
  // Save back to state
  store.squares = nextSquares;
  store.xIsNext = !store.xIsNext;
});
```

Try clicking the squares now. They should fill with X and O!

## Step 5: Determine a Winner

We need a helper function to check for a winner.

```javascript
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}
```

Now, let's use `computed()` to automatically track the winner.

```javascript
// 4. Computed values
const winner = computed(() => calculateWinner(store.squares));

// Update our effect to show the winner
effect(() => {
  let statusText;
  if (winner.value) {
    statusText = `Winner: ${winner.value}`;
  } else {
    statusText = `Next player: ${store.xIsNext ? 'X' : 'O'}`;
  }

  // ... rest of render code ...
});
```

And update the click handler to stop the game if someone won:

```javascript
root.addEventListener('click', (e) => {
  // ...
  // Check if winner exists
  if (store.squares[i] || winner.value) return;
  // ...
});
```

## Step 6: Adding Time Travel (History)

To support "Undo", we need to store the entire history of the game, not just the current squares.

Let's change our state structure:

```javascript
const store = state({
  history: [
    { squares: Array(9).fill(null) }
  ],
  stepNumber: 0,
  xIsNext: true
});
```

## Step 7: Updating Computed Values

Now that we have history, "current" squares depends on which step we are viewing.

```javascript
const current = computed(() => store.history[store.stepNumber]);
const currentSquares = computed(() => current.value.squares);
const winner = computed(() => calculateWinner(currentSquares.value));
```

## Step 8: Updating the Click Handler for History

When clicking, we now add to history instead of just replacing `squares`.

```javascript
root.addEventListener('click', (e) => {
  if (!e.target.matches('.square')) return;
  const i = parseInt(e.target.dataset.index);

  // If we went back in time, discard "future" history
  const history = store.history.slice(0, store.stepNumber + 1);
  const current = history[history.length - 1];
  const squares = current.squares;

  if (calculateWinner(squares) || squares[i]) return;

  const nextSquares = [...squares];
  nextSquares[i] = store.xIsNext ? 'X' : 'O';

  store.history = [...history, { squares: nextSquares }];
  store.stepNumber = history.length;
  store.xIsNext = !store.xIsNext;
});
```

## Step 9: Rendering the History List

Finally, let's render the list of past moves.

```javascript
// Helper to jump to a step
window.jumpTo = (step) => {
  store.stepNumber = step;
  store.xIsNext = (step % 2) === 0;
};

effect(() => {
  // ... render board ...

  // Render History
  const moves = store.history.map((step, move) => {
    const desc = move ? `Go to move #${move}` : 'Go to game start';
    const isCurrent = move === store.stepNumber;
    
    return `
      <li>
        <button onclick="jumpTo(${move})" style="${isCurrent ? 'font-weight: bold' : ''}">
          ${desc}
        </button>
      </li>
    `;
  }).join('');
  
  // Inject into DOM (assuming you added a container for it)
});
```

## Final Code

<details>
<summary>Click to see the full working code</summary>

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lume Tic-Tac-Toe</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    .game { display: flex; gap: 20px; }
    .board-row { display: flex; }
    .square { 
      width: 60px; height: 60px; 
      background: #fff; border: 1px solid #999;
      font-size: 24px; font-weight: bold;
      margin: -1px -1px 0 0; padding: 0;
      cursor: pointer;
    }
    .square:focus { background: #ddd; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    import { state, effect } from 'https://cdn.jsdelivr.net/npm/lume-js/src/index.js';
    import { computed } from 'https://cdn.jsdelivr.net/npm/lume-js/src/addons/index.js';

    // --- Logic ---
    function calculateWinner(squares) {
      const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      for (let line of lines) {
        const [a, b, c] = line;
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
          return squares[a];
        }
      }
      return null;
    }

    // --- State ---
    const store = state({
      history: [{ squares: Array(9).fill(null) }],
      stepNumber: 0,
      xIsNext: true
    });

    // --- Computed ---
    const currentSquares = computed(() => store.history[store.stepNumber].squares);
    const winner = computed(() => calculateWinner(currentSquares.value));
    const status = computed(() => {
      if (winner.value) return `Winner: ${winner.value}`;
      return `Next player: ${store.xIsNext ? 'X' : 'O'}`;
    });

    // --- Actions ---
    window.jumpTo = (step) => {
      store.stepNumber = step;
      store.xIsNext = (step % 2) === 0;
    };

    const root = document.getElementById('root');

    root.addEventListener('click', (e) => {
      if (!e.target.matches('.square')) return;
      
      const i = parseInt(e.target.dataset.index);
      const history = store.history.slice(0, store.stepNumber + 1);
      const current = history[history.length - 1];
      const squares = current.squares;

      if (calculateWinner(squares) || squares[i]) return;

      const nextSquares = [...squares];
      nextSquares[i] = store.xIsNext ? 'X' : 'O';

      store.history = [...history, { squares: nextSquares }];
      store.stepNumber = history.length;
      store.xIsNext = !store.xIsNext;
    });

    // --- Render ---
    effect(() => {
      const squares = currentSquares.value;
      
      const moves = store.history.map((step, move) => {
        const desc = move ? `Go to move #${move}` : 'Go to game start';
        const isCurrent = move === store.stepNumber;
        return `
          <li>
            <button onclick="jumpTo(${move})" style="${isCurrent ? 'font-weight: bold' : ''}">
              ${desc}
            </button>
          </li>
        `;
      }).join('');

      root.innerHTML = `
        <div class="game">
          <div class="game-board">
            <div class="status">${status.value}</div>
            <div class="board">
              ${[0, 1, 2].map(row => `
                <div class="board-row">
                  ${[0, 1, 2].map(col => {
                    const i = row * 3 + col;
                    return \`<button class="square" data-index="\${i}">\${squares[i] || ''}</button>\`;
                  }).join('')}
                </div>
              `).join('')}
            </div>
          </div>
          <div class="game-info">
            <ol>\${moves}</ol>
          </div>
        </div>
      `;
    });
  </script>
</body>
</html>
```
</details>

---

**← Previous: [Working with Arrays](../tutorials/working-with-arrays.md)** | **Next: [API Reference: State](../api/core/state.md) →**
