import { state } from './src/core/state.js';
import { effect } from './src/core/effect.js';

const store1 = state({ count: 0 });
const store2 = state({ name: 'Alice' });

let effectRunCount = 0;
effect(() => {
  const c = store1.count;
  const n = store2.name;
  effectRunCount++;
  console.log(`Effect run #${effectRunCount}: count=${c}, name=${n}`);
});

console.log('--- Test Start ---');
const startRunCount = effectRunCount;

// Mutate multiple DIFFERENT stores synchronously
store1.count++;
store2.name = 'Bob';

console.log('Mutations done (synchronous). Effect has not run yet.');

// Let microtasks flush
queueMicrotask(() => {
  console.log(`queueMicrotask: Effect ran ${effectRunCount - startRunCount} times during test.`);
});

setTimeout(() => {
  console.log(`setTimeout: Effect ran ${effectRunCount - startRunCount} times during test.`);
}, 10);
