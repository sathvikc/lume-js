import { performance } from 'perf_hooks';
import { state } from '../src/core/state.js';
import { effect } from '../src/core/effect.js';
import { batch } from '../src/addons/batch.js';

async function runBenchmark(name, fn) {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return (end - start).toFixed(2);
}

async function run() {
  const NUM_STORES = 50;
  const NUM_UPDATES = 1000;
  
  let stores = Array.from({ length: NUM_STORES }, (_, i) => state({ value: 0 }));
  
  let effectRuns1 = 0;
  let effect1 = effect(() => {
    let sum = 0;
    for (let i = 0; i < NUM_STORES; i++) sum += stores[i].value;
    effectRuns1++;
  });
  effectRuns1 = 0;
  
  const time1 = await runBenchmark('Default', async () => {
    for (let i = 0; i < NUM_UPDATES; i++) {
      for (let s = 0; s < NUM_STORES; s++) stores[s].value++;
      await Promise.resolve();
    }
  });

  stores = Array.from({ length: NUM_STORES }, (_, i) => state({ value: 0 }));
  let effectRuns2 = 0;
  let effect2 = effect(() => {
    let sum = 0;
    for (let i = 0; i < NUM_STORES; i++) sum += stores[i].value;
    effectRuns2++;
  });
  effectRuns2 = 0;
  
  const time2 = await runBenchmark('Batch (dedupe: false)', async () => {
    for (let i = 0; i < NUM_UPDATES; i++) {
      batch(() => {
        for (let s = 0; s < NUM_STORES; s++) stores[s].value++;
      }, { dedupe: false });
    }
  });

  stores = Array.from({ length: NUM_STORES }, (_, i) => state({ value: 0 }));
  let effectRuns3 = 0;
  let effect3 = effect(() => {
    let sum = 0;
    for (let i = 0; i < NUM_STORES; i++) sum += stores[i].value;
    effectRuns3++;
  });
  effectRuns3 = 0;
  
  const time3 = await runBenchmark('Batch (dedupe: true)', async () => {
    for (let i = 0; i < NUM_UPDATES; i++) {
      batch(() => {
        for (let s = 0; s < NUM_STORES; s++) stores[s].value++;
      }, { dedupe: true });
    }
  });

  console.log(`\n| Strategy | Time (ms) | Effect Executions |`);
  console.log(`| No Batch (Microtasks) | ${time1} ms | ${effectRuns1} |`);
  console.log(`| Batch (dedupe: false) | ${time2} ms | ${effectRuns2} |`);
  console.log(`| Batch (dedupe: true)  | ${time3} ms | ${effectRuns3} |`);
}

run().catch(console.error);
