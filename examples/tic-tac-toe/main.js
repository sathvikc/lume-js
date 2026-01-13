import { bindDom, effect, state } from 'lume-js';
import { computed, repeat } from 'lume-js/addons';

// Game logic
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

function isBoardFull(squares) {
  return squares.every(sq => sq !== null);
}

// Initial state
const initialSquares = Array(9).fill(null);

let historyId = 0;

const store = state({
  history: [{ id: historyId++, squares: initialSquares, move: 'Game start' }],
  currentMove: 0,
});

// Bind static fields
const cleanup = bindDom(document.body, store);

// Computed current game state with automatic dependency tracking
const currentSquares = computed(() => store.history[store.currentMove].squares);
const xIsNext = computed(() => store.currentMove % 2 === 0);
const winner = computed(() => {
  const squares = store.history[store.currentMove].squares;
  return calculateWinner(squares);
});
const gameStatus = computed(() => {
  const squares = store.history[store.currentMove].squares;
  const w = calculateWinner(squares);

  if (w) return `Winner: ${w}`;
  if (isBoardFull(squares)) return 'Draw!';

  const isX = store.currentMove % 2 === 0;

  return `Next player: ${isX ? 'X' : 'O'}`;
});

// Get DOM elements first (before effect)
const boardEl = document.getElementById('board');
const historyListEl = document.getElementById('history-list');

// Use repeat for history list with element reuse
const repeatCleanup = repeat(historyListEl, store, 'history', {
  element: 'div',
  key: item => item.id,
  create: (item, btn) => {
    // Called ONCE - set up DOM structure and event listeners
    btn.className = 'history-item';
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('role', 'button');

    // Use stable ID lookup instead of captured index (index can become stale on reorder)
    const handleJump = () => {
      const moveId = Number(btn.dataset.moveId);
      const idx = store.history.findIndex(entry => entry.id === moveId);
      if (idx !== -1) jumpToMove(idx);
    };

    btn.addEventListener('click', handleJump);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleJump();
      }
    });
  },
  update: (item, btn, index) => {
    // Called on every update - bind data
    btn.dataset.moveId = String(item.id);  // Keep stable ID for event handlers
    btn.textContent = item.move;
    btn.classList.toggle('current', index === store.currentMove);
  }
});

// Use effect to automatically handle all updates when state changes
const effectCleanup = effect(() => {
  // Track the complete game state - this will trigger when either property changes
  // but we only need to track once since they represent the same logical state change
  const gameState = `${store.currentMove}-${store.history.length}`;

  // Update game status in document title
  const status = gameStatus.value;
  console.log('Game status updated:', status);
  document.title = `Tic-Tac-Toe - ${status}`;

  // Update status element if it exists
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = status;
  }

  // Render the board
  renderBoard();
});

// Render board
function renderBoard() {
  const squares = currentSquares.value;
  const currentWinner = winner.value;
  const gameOver = currentWinner || isBoardFull(squares);
  boardEl.innerHTML = '';

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';

    const value = squares[i];
    if (value) {
      cell.textContent = value;
      cell.classList.add('filled', value.toLowerCase());
      cell.setAttribute('aria-label', `Cell ${i + 1}: ${value}`);
    } else if (!gameOver) {
      // Only make empty cells interactive if game is not over
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('role', 'button');
      cell.setAttribute('aria-label', `Cell ${i + 1}`);
      cell.dataset.index = i;
      cell.addEventListener('click', () => handleClick(i));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(i);
        }
      });
    } else {
      // Game over - make non-interactive
      cell.setAttribute('aria-label', `Cell ${i + 1}`);
    }

    boardEl.appendChild(cell);
  }

  // Add winner overlay if game is over
  const overlayWinner = winner.value;
  const isDraw = !overlayWinner && isBoardFull(squares);

  if (overlayWinner || isDraw) {
    const overlay = document.createElement('div');
    overlay.className = 'winner-overlay';

    if (overlayWinner) {
      overlay.classList.add(`winner-${overlayWinner.toLowerCase()}`);
      const text = document.createElement('div');
      text.className = `winner-text ${overlayWinner.toLowerCase()}`;
      text.textContent = `${overlayWinner} Wins!`;
      overlay.appendChild(text);

      const sub = document.createElement('div');
      sub.className = 'winner-subtext';
      sub.textContent = 'Click "New Game" to play again';
      overlay.appendChild(sub);
    } else {
      overlay.classList.add('draw');
      const text = document.createElement('div');
      text.className = 'winner-text';
      text.textContent = "It's a Draw!";
      overlay.appendChild(text);

      const sub = document.createElement('div');
      sub.className = 'winner-subtext';
      sub.textContent = 'Click "New Game" to play again';
      overlay.appendChild(sub);
    }

    boardEl.appendChild(overlay);
  }
}

// Handle cell click
function handleClick(index) {
  const squares = currentSquares.value;
  const currentWinner = winner.value;
  if (currentWinner || squares[index]) return;

  // Store the clicked cell index to restore focus
  const clickedIndex = index;

  // Create new board state (Immutable update)
  // See: docs/tutorials/working-with-arrays.md
  const newSquares = [...squares];
  newSquares[index] = xIsNext.value ? 'X' : 'O';

  // Truncate history if we're not at the end (time travel then make new move)
  const newHistory = store.history.slice(0, store.currentMove + 1);
  const moveNum = newHistory.length;
  const player = xIsNext.value ? 'X' : 'O';
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;

  newHistory.push({
    id: historyId++,
    squares: newSquares,
    move: `Move #${moveNum}: ${player} → (${row}, ${col})`
  });

  // Update both properties to trigger re-renders
  store.history = newHistory;
  store.currentMove = newHistory.length - 1;

  // Restore focus to the same cell after re-render
  setTimeout(() => {
    const cells = boardEl.querySelectorAll('.cell');
    if (cells[clickedIndex]) {
      cells[clickedIndex].focus();
    }
  }, 0);
}

// Time travel
function jumpToMove(moveIndex) {
  store.currentMove = moveIndex;
}

// Reset game
function resetGame() {
  // Create fresh history with new array reference
  const newHistory = [{ squares: Array(9).fill(null), move: 'Game start' }];

  // Update both properties to trigger re-renders
  store.currentMove = 0;
  store.history = newHistory;
}

document.getElementById('reset').addEventListener('click', resetGame);

// Cleanup
window.addEventListener('beforeunload', () => {
  cleanup();
  effectCleanup();
  repeatCleanup();
});
