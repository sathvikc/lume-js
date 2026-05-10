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
  console.log('--- Benchmarking Lume-JS Batching Strategies ---');
  
  const NUM_STORES = 50;
  const NUM_UPDATES = 1000;
  
  // Setup stores
  let stores = Array.from({ length: NUM_STORES }, (_, i) => state({ value: 0 }));
  
  // Scenario 1: Default Per-State Microtasks
  let effectRuns1 = 0;
  let effect1 = effect(() => {
    let sum = 0;
    for (let i = 0; i < NUM_STORES; i++) sum += stores[i].value;
    effectRuns1++;
  });
  
  const time1 = await runBenchmark('Default (No Batch)', async () => {
    for (let i = 0; i < NUM_UPDATES; i++) {
      for (let s = 0; s < NUM_STORES; s++) {
        stores[s].value++;
      }
      // Wait for all microtasks to flush
      await Promise.resolve();
    }
  });

  // Reset stores
  stores = Array.from({ length: NUM_STORES }, (_, i) => state({ value: 0 }));
  
  // Scenario 2: Batch without Dedupe
  let effectRuns2 = 0;
  let effect2 = effect(() => {
    let sum = 0;
    for (let i = 0; i < NUM_STORES; i++) sum += stores[i].value;
    effectRuns2++;
  });
  const time2 = await runBenchmark('Batch (dedupe: false)', async () => {
    for (let i = 0; i < NUM_UPDATES; i++) {
      batch(() => {
        for (let s = 0; s < NUM_STORES; s++) {
          stores[s].value++;
        }
      }, { dedupe: false });
    }
  });

  // Reset stores
  stores = Array.from({ length: NUM_STORES }, (_, i) => state({ value: 0 }));
  
  // Scenario 3: Batch with Dedupe
  let effectRuns3 = 0;
  let effect3 = effect(() => {
    let sum = 0;
    for (let i = 0; i < NUM_STORES; i++) sum += stores[i].value;
    effectRuns3++;
  });
  
  const time3 = await runBenchmark('Batch (dedupe: true)', async () => {
    for (let i = 0; i < NUM_UPDATES; i++) {
      batch(() => {
        for (let s = 0; s < NUM_STORES; s++) {
          stores[s].value++;
        }
      }, { dedupe: true });
    }
  });

  console.log(`\nResults for ${NUM_UPDATES} updates across ${NUM_STORES} stores:\n`);
  console.log('| Strategy | Time (ms) | Effect Executions |');
  console.log('|----------|-----------|-------------------|');
  console.log(`| No Batch (Microtasks) | ${time1} ms | ${effectRuns1} |`);
  console.log(`| Batch (dedupe: false) | ${time2} ms | ${effectRuns2} |`);
  console.log(`| Batch (dedupe: true)  | ${time3} ms | ${effectRuns3} |`);
}

run().catch(console.error);
