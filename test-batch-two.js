import { state } from './src/core/state.js';
import { effect } from './src/core/effect.js';
import { batch } from './src/addons/batch.js';

const storeA = state({ a: 0 });
const storeB = state({ b: 0 });

let effectRuns2 = 0;
let effect2 = effect(() => {
  storeA.a;
  storeB.b;
  console.log("evaluated");
  effectRuns2++;
});

effectRuns2 = 0;

batch(() => {
  storeA.a++;
  storeB.b++;
}, { dedupe: false });

console.log("After 1 update (dedupe: false):", effectRuns2);
