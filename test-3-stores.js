import { state } from './src/core/state.js';
import { effect } from './src/core/effect.js';
import { batch } from './src/addons/batch.js';

const store0 = state({ v0: 0 });
const store1 = state({ v1: 0 });
const store2 = state({ v2: 0 });

let runs = 0;
effect(() => {
  store0.v0;
  store1.v1;
  store2.v2;
  runs++;
});

console.log("Initial runs:", runs);
runs = 0;

batch(() => {
  store0.v0++;
  store1.v1++;
  store2.v2++;
}, { dedupe: false });

console.log("Runs after batch:", runs);
