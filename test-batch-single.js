import { state } from './src/core/state.js';
import { effect } from './src/core/effect.js';

const store = state({ count: 0, name: 'Alice' });

let effectRunCount = 0;
effect(() => {
  const c = store.count;
  const n = store.name;
  effectRunCount++;
  console.log(`Effect run #${effectRunCount}: count=${c}, name=${n}`);
});

console.log('--- Test Start ---');
const startRunCount = effectRunCount;

// Mutate same store synchronously
store.count++;
store.name = 'Bob';
store.count++;
store.name = 'Charlie';

console.log('Mutations done (synchronous). Effect has not run yet.');

setTimeout(() => {
  console.log(`setTimeout: Effect ran ${effectRunCount - startRunCount} times during test.`);
}, 10);
