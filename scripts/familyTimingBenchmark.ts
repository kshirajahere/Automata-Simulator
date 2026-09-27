import { performance } from "node:perf_hooks";
import { convertRegex } from "../src/automata/pipeline.js";

const REPEATS = 1_000;
const WARMUP = 100;

function familyRegex(n: number): string {
  return `(a|b)*a${Array.from({ length: n }, () => "(a|b)").join("")}`;
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.floor((sorted.length - 1) * p)];
}

console.log("n,median_ms,p95_ms");
for (let n = 0; n <= 6; n += 1) {
  const regex = familyRegex(n);
  for (let i = 0; i < WARMUP; i += 1) convertRegex(regex);

  const samples: number[] = [];
  for (let i = 0; i < REPEATS; i += 1) {
    const start = performance.now();
    convertRegex(regex);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(`${n},${percentile(samples, 0.5).toFixed(4)},${percentile(samples, 0.95).toFixed(4)}`);
}
