/// <reference lib="webworker" />

interface WorkerInput {
  fractal: {
    transforms: Array<{
      m00: number; m01: number; m02: number;
      m10: number; m11: number; m12: number;
    }>;
  };
  iterations: number;
}

let stack: number[] = [];
let iterations = 0;
let fractalTransforms: any[] = [];
let numTransforms = 0;
let total = 0;
let completed = 0;
let inFlight = 0;
const BATCH_SIZE = 10000;
const MAX_IN_FLIGHT = 10; // Allow 10 batches of 10k transforms = 100k transforms in flight
let startTime = 0;
let lastProgressUpdate = 0;
let isFinished = false;

function runLoop() {
  if (isFinished || inFlight >= MAX_IN_FLIGHT) return;

  let batch = new Float32Array(BATCH_SIZE * 6);
  let batchIdx = 0;

  while (stack.length > 0) {
    const m12 = stack.pop()!;
    const m11 = stack.pop()!;
    const m10 = stack.pop()!;
    const m02 = stack.pop()!;
    const m01 = stack.pop()!;
    const m00 = stack.pop()!;
    const iteration = stack.pop()!;

    if (iteration === iterations) {
      batch[batchIdx++] = m00;
      batch[batchIdx++] = m01;
      batch[batchIdx++] = m02;
      batch[batchIdx++] = m10;
      batch[batchIdx++] = m11;
      batch[batchIdx++] = m12;
      completed++;

      if (batchIdx >= batch.length) {
        postMessage({ type: 'TRANSFORMS', transforms: batch }, [batch.buffer]);
        inFlight++;
        
        updateProgress();

        if (inFlight >= MAX_IN_FLIGHT) {
          return; // Pause and wait for ACKs
        }
        // Prepare next batch for the same loop execution
        batch = new Float32Array(BATCH_SIZE * 6);
        batchIdx = 0;
      }
      continue;
    }

    for (let i = numTransforms - 1; i >= 0; i--) {
      const trx = fractalTransforms[i];
      stack.push(iteration + 1);
      stack.push(m00 * trx.m00 + m01 * trx.m10);
      stack.push(m00 * trx.m01 + m01 * trx.m11);
      stack.push(m00 * trx.m02 + m01 * trx.m12 + m02);
      stack.push(m10 * trx.m00 + m11 * trx.m10);
      stack.push(m10 * trx.m01 + m11 * trx.m11);
      stack.push(m10 * trx.m02 + m11 * trx.m12 + m12);
    }
  }

  if (batchIdx > 0) {
    const finalBatch = batch.slice(0, batchIdx);
    postMessage({ type: 'TRANSFORMS', transforms: finalBatch }, [finalBatch.buffer]);
    inFlight++;
  }

  isFinished = true;
  checkCompletion();
}

function updateProgress() {
  const now = performance.now();
  if (now - lastProgressUpdate > 200) {
    const elapsed = (now - startTime) / 1000;
    const rate = completed / elapsed;
    const remaining = (total - completed) / rate;
    postMessage({
      type: 'PROGRESS',
      completed,
      total,
      progress: (completed / total) * 100,
      timeRemaining: remaining
    });
    lastProgressUpdate = now;
  }
}

function checkCompletion() {
  if (isFinished && inFlight === 0) {
    postMessage({
      type: 'PROGRESS',
      completed: total,
      total,
      progress: 100,
      timeRemaining: 0
    });
    postMessage({ type: 'DONE' });
  }
}

addEventListener('message', ({ data }) => {
  if (data.type === 'ACK') {
    inFlight--;
    if (inFlight < MAX_IN_FLIGHT) {
      runLoop();
    }
    checkCompletion();
    return;
  }

  // Initial START message
  const input = data as WorkerInput;
  if (!input.fractal || input.iterations < 0) return;

  iterations = input.iterations;
  fractalTransforms = input.fractal.transforms;
  numTransforms = fractalTransforms.length;
  total = Math.pow(numTransforms, iterations);
  
  if (total === 0) {
    postMessage({ type: 'DONE' });
    return;
  }

  stack = [0, 1, 0, 0, 0, 1, 0];
  completed = 0;
  inFlight = 0;
  startTime = performance.now();
  lastProgressUpdate = startTime;
  isFinished = false;

  runLoop();
});
