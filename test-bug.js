import { state } from './src/core/state.js';
import { effect } from './src/core/effect.js';

const store0 = state({ value: 0 });
const store1 = state({ value: 0 });

let runs = 0;
effect(() => {
  store0.value;
  store1.value;
  runs++;
});

runs = 0;
store1.value++; // Mutate store1
setTimeout(() => {
  console.log("Runs after mutating store1:", runs); // SHOULD BE 1!
}, 100);
