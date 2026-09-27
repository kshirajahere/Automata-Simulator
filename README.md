# Trace-Oriented Automata Laboratory

A browser-based Theory of Computation laboratory for inspectable executions of regular expressions and finite automata, context-free grammars, pushdown automata, and Turing machines.

**Live demonstration:** https://simulating-automata.vercel.app

![Regex conversion workspace](regex-trace-ui.png)

## Capabilities

- Parses a formal regular-expression dialect and constructs an epsilon-NFA using Thompson's construction.
- Executes subset construction step by step, completes the DFA, and minimizes it by partition refinement.
- Simulates DFA inputs, enumerates bounded language samples, and compares two DFAs exactly, returning a shortest separating witness when their languages differ.
- Parses CFGs and returns derivation and parse-tree artifacts.
- Simulates PDAs with explicit stack traces and Turing machines with tape-step traces.
- Serves formal artifacts through JSON endpoints consumed by a D3 browser interface.

## Reproducibility and evaluation

The test suite contains the baseline functional checks plus independent audits of the conversion trace and a shipped PDA accepting trace:

```bash
npm test
npm run typecheck
npm run benchmark:family
```

`tests/traceAudit.test.ts` independently recomputes epsilon closures, subset-construction events, and partition-refinement signatures for a parameterized regular-language family. It also checks bounded behavior against JavaScript `RegExp` and exact equivalence between completed and minimized DFAs.

`tests/pdaTraceAudit.test.ts` replays the shipped $a^n b^n$ accepting branch from its declared transition relation, checking input consumption, stack updates, and final acceptance.

`scripts/familyTimingBenchmark.ts` runs the parameterized timing study. `scripts/publicCorpusBenchmark.ts` reproduces the public-corpus analysis from a local copy of AutomataTutor's `regular-expression.csv` pinned to the commit stated in the paper. The corpus itself is not redistributed here.

## Run locally

```bash
npm install
npm run dev
```

Then open the frontend at `http://127.0.0.1:5173`.

## Commands

```bash
npm test
npm run typecheck
npm run build
npm run benchmark:family
npx tsx scripts/publicCorpusBenchmark.ts /path/to/regular-expression.csv
```

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/convert` | Regex to AST, NFA, DFA, construction trace, minimized DFA, and language samples. |
| `POST /api/simulate` | DFA execution for one input. |
| `POST /api/simulate-batch` | Batch DFA execution and aggregate metrics. |
| `POST /api/compare` | Exact regular-language comparison with a shortest witness if inequivalent. |
| `POST /api/cfg/parse` | CFG parsing with derivation and parse tree. |
| `POST /api/pda/simulate` | PDA execution with stack trace. |
| `POST /api/turing/simulate` | Turing-machine execution with tape trace. |

## Project structure

```text
src/automata/parser.ts       recursive-descent regex parser
src/automata/thompson.ts     Thompson epsilon-NFA builder
src/automata/subset.ts       epsilon-closure subset construction
src/automata/minimize.ts     DFA partition refinement
src/automata/analysis.ts     exact DFA-language comparison and witnesses
src/automata/cfg.ts          CFG parsing and derivation artifacts
src/automata/pda.ts          PDA simulation and stack traces
src/automata/turing.ts       Turing-machine simulation and tape traces
src/client/main.ts           D3 browser interface
tests/automata.test.ts       functional correctness checks
tests/traceAudit.test.ts     independent conversion-trace audit
tests/pdaTraceAudit.test.ts  independent PDA-trace audit
scripts/                     reproducible evaluation scripts
```
