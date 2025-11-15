import { state, bindDom } from 'lume-js';
import { computed } from 'lume-js/addons';

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

const store = state({
  history: [{ squares: initialSquares, move: 'Game start' }],
  currentMove: 0,
});

// Bind static fields
const cleanup = bindDom(document.body, store);

// Computed current game state
const currentSquares = computed(() => store.history[store.currentMove].squares);
const xIsNext = computed(() => store.currentMove % 2 === 0);
const winner = computed(() => calculateWinner(currentSquares.value));
const gameStatus = computed(() => {
  const w = winner.value;
  if (w) return `Winner: ${w}`;
  if (isBoardFull(currentSquares.value)) return 'Draw!';
  return `Next player: ${xIsNext.value ? 'X' : 'O'}`;
});

// Update derived state
function updateDerived() {
  currentSquares.recompute();
  xIsNext.recompute();
  winner.recompute();
  gameStatus.recompute();
}

// Render board
const boardEl = document.getElementById('board');

function renderBoard() {
  const squares = currentSquares.value;
  const gameOver = winner.value || isBoardFull(squares);
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
  const w = winner.value;
  const isDraw = !w && isBoardFull(squares);
  
  if (w || isDraw) {
    const overlay = document.createElement('div');
    overlay.className = 'winner-overlay';
    
    if (w) {
      overlay.classList.add(`winner-${w.toLowerCase()}`);
      const text = document.createElement('div');
      text.className = `winner-text ${w.toLowerCase()}`;
      text.textContent = `${w} Wins!`;
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
  if (winner.value || currentSquares.value[index]) return;
  
  // Store the clicked cell index to restore focus
  const clickedIndex = index;
  
  // Create new board state
  const newSquares = [...currentSquares.value];
  newSquares[index] = xIsNext.value ? 'X' : 'O';
  
  // Truncate history if we're not at the end (time travel then make new move)
  const newHistory = store.history.slice(0, store.currentMove + 1);
  const moveNum = newHistory.length;
  const player = xIsNext.value ? 'X' : 'O';
  const row = Math.floor(index / 3) + 1;
  const col = (index % 3) + 1;
  
  newHistory.push({
    squares: newSquares,
    move: `Move #${moveNum}: ${player} → (${row}, ${col})`
  });
  
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

// Render history
const historyListEl = document.getElementById('history-list');

function renderHistory() {
  const historyItems = store.history;
  historyListEl.innerHTML = '';
  
  if (historyItems.length === 1) {
    const empty = document.createElement('div');
    empty.className = 'empty-history';
    empty.textContent = 'No moves yet. Make your first move!';
    historyListEl.appendChild(empty);
    return;
  }
  
  for (let i = 0; i < historyItems.length; i++) {
    const item = historyItems[i];
    const btn = document.createElement('div');
    btn.className = 'history-item';
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('role', 'button');
    
    if (i === store.currentMove) {
      btn.classList.add('current');
    }
    
    btn.textContent = item.move;
    btn.dataset.moveIndex = i;
    
    btn.addEventListener('click', () => jumpToMove(i));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        jumpToMove(i);
      }
    });
    
    historyListEl.appendChild(btn);
  }
}

// Time travel
function jumpToMove(moveIndex) {
  store.currentMove = moveIndex;
}

// Reset game
function resetGame() {
  // Create fresh history with new array reference
  const newHistory = [{ squares: Array(9).fill(null), move: 'Game start' }];
  
  // Update both to trigger re-renders
  store.currentMove = 0;
  store.history = newHistory;
}

document.getElementById('reset').addEventListener('click', resetGame);

// Subscriptions
store.$subscribe('history', () => {
  updateDerived();
  renderBoard();
  renderHistory();
});

store.$subscribe('currentMove', () => {
  updateDerived();
  renderBoard();
  renderHistory();
});

// Initial render
updateDerived();
renderBoard();
renderHistory();

// Cleanup
window.addEventListener('beforeunload', () => cleanup());
