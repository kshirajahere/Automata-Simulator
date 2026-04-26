# Regex to NFA to DFA Visualizer

Master-level Theory of Computation project that exposes the full conversion pipeline instead of only simulating a finished DFA.

## What It Does

- Parses a formal regex dialect into an AST.
- Builds an epsilon-NFA with Thompson's construction.
- Runs subset construction step by step.
- Completes the DFA with a dead state when needed.
- Minimizes the DFA with partition refinement.
- Simulates input strings against the generated DFA.
- Computes shortest accepted/rejected witnesses and bounded language samples.
- Compares two regexes for language equivalence and returns a concrete counterexample when they differ.
- Evaluates many candidate strings in one request with acceptance-rate summaries.
- Serves conversion and simulation through a clean JSON API for a D3 frontend.

## Regex Dialect

Supported:

- Literals: `a`, `b`, `1`, `_`
- Escaped literals: `\+`, `\*`, `\|`, `\(`, `\)`
- Shorthand classes: `\d`, `\w`, `\s`
- Grouping: `(ab|cd)`
- Union: `a|b`
- Concatenation: implicit, as in `ab`
- Postfix operators: `a*`, `a+`, `a?`
- Character classes and ranges: `[abc]`, `[a-zA-Z0-9]`
- Epsilon: `ε`
- Empty language: `∅`

Intentionally unsupported:

- Backreferences
- Lookahead/lookbehind
- Negated character classes
- Negated shorthand classes (`\D`, `\W`, `\S`)
- JavaScript-specific regex flags

Those features are not regular-language core constructs and would make the academic conversion less clear.

## Run Locally

```bash
npm install
npm run dev
```

Then open:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001/api/health`

## Useful Commands

```bash
npm test
npm run typecheck
npm run build
```

## API

### `POST /api/convert`

Request:

```json
{ "regex": "(a|b)*abb" }
```

Returns:

- `ast`
- `nfa`
- `dfa`
- `subsetConstruction.steps`
- `minimizedDfa`
- `minimization.rounds`
- `insights.shortestAccepted`, `insights.shortestRejected`
- `insights.acceptedExamples`, `insights.rejectedExamples`

### `POST /api/simulate`

Request:

```json
{ "regex": "(a|b)*abb", "input": "aaabb" }
```

Returns acceptance, final state, and the state path.

### `POST /api/simulate-batch`

Request:

```json
{ "regex": "(a|b)*abb", "inputs": ["abb", "aabb", "abba", ""] }
```

Returns one row per input plus aggregate totals and acceptance rate.

### `POST /api/compare`

Request:

```json
{ "leftRegex": "a*", "rightRegex": "a+" }
```

Returns:

- `equivalent`: boolean
- `checkedAlphabet`: combined alphabet used for formal comparison
- `witness`: shortest counterexample if non-equivalent
- `leftAcceptsWitness` / `rightAcceptsWitness`

## Project Structure

```text
src/automata/parser.ts      recursive-descent regex parser
src/automata/thompson.ts    Thompson epsilon-NFA builder
src/automata/subset.ts      epsilon-closure subset construction
src/automata/minimize.ts    DFA partition refinement
src/automata/simulate.ts    DFA simulator
src/automata/pipeline.ts    end-to-end conversion API
src/server.ts               Express API server
src/client/main.ts          lightweight D3 frontend shell
tests/automata.test.ts      correctness checks
```
