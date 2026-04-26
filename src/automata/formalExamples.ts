import type { FormalExample } from "./formalTypes";

export const cfgExamples: FormalExample[] = [
  {
    id: "cfg-balanced-parens",
    title: "Balanced parentheses",
    summary: "Classic CFG with epsilon and nested structure.",
    input: "(()())",
    definition: `start: S
S -> ( S ) S | ε`
  },
  {
    id: "cfg-expression",
    title: "Expression grammar",
    summary: "Factorized arithmetic grammar that produces a clear parse tree.",
    input: "id + id * id",
    definition: `start: E
E -> T E1
E1 -> + T E1 | ε
T -> F T1
T1 -> * F T1 | ε
F -> id | ( E )`
  },
  {
    id: "cfg-palindrome",
    title: "Odd/even palindromes",
    summary: "Symmetric grammar over {a, b} with nullable center.",
    input: "abba",
    definition: `start: S
S -> a S a | b S b | a | b | ε`
  }
];

export const pdaExamples: FormalExample<string>[] = [
  {
    id: "pda-anbn",
    title: "a^n b^n",
    summary: "Push one stack symbol per a, then pop one per b.",
    input: "aaabbb",
    definition: `{
  "states": ["push", "pop", "accept"],
  "startState": "push",
  "acceptStates": ["accept"],
  "stackStart": "Z",
  "acceptMode": "final-state",
  "transitions": [
    { "from": "push", "input": "a", "stackTop": "Z", "to": "push", "push": ["A", "Z"] },
    { "from": "push", "input": "a", "stackTop": "A", "to": "push", "push": ["A", "A"] },
    { "from": "push", "input": "b", "stackTop": "A", "to": "pop", "push": [] },
    { "from": "pop", "input": "b", "stackTop": "A", "to": "pop", "push": [] },
    { "from": "pop", "input": null, "stackTop": "Z", "to": "accept", "push": ["Z"] }
  ]
}`
  },
  {
    id: "pda-balanced-parens",
    title: "Balanced parentheses PDA",
    summary: "Deterministic stack discipline for well-formed parentheses.",
    input: "(()())",
    definition: `{
  "states": ["scan", "accept"],
  "startState": "scan",
  "acceptStates": ["accept"],
  "stackStart": "Z",
  "acceptMode": "final-state",
  "transitions": [
    { "from": "scan", "input": "(", "stackTop": "Z", "to": "scan", "push": ["(", "Z"] },
    { "from": "scan", "input": "(", "stackTop": "(", "to": "scan", "push": ["(", "("] },
    { "from": "scan", "input": ")", "stackTop": "(", "to": "scan", "push": [] },
    { "from": "scan", "input": null, "stackTop": "Z", "to": "accept", "push": ["Z"] }
  ]
}`
  },
  {
    id: "pda-equal-zero-one",
    title: "0^n 1^n with empty-stack acceptance",
    summary: "Same language as a^n b^n, accepted by exhausting the stack.",
    input: "0011",
    definition: `{
  "states": ["push", "pop"],
  "startState": "push",
  "acceptStates": [],
  "stackStart": "Z",
  "acceptMode": "empty-stack",
  "transitions": [
    { "from": "push", "input": "0", "stackTop": "Z", "to": "push", "push": ["X", "Z"] },
    { "from": "push", "input": "0", "stackTop": "X", "to": "push", "push": ["X", "X"] },
    { "from": "push", "input": "1", "stackTop": "X", "to": "pop", "push": [] },
    { "from": "pop", "input": "1", "stackTop": "X", "to": "pop", "push": [] },
    { "from": "pop", "input": null, "stackTop": "Z", "to": "pop", "push": [] }
  ]
}`
  }
];

export const turingExamples: FormalExample<string>[] = [
  {
    id: "tm-binary-increment",
    title: "Binary increment",
    summary: "Walk right to the blank, then propagate a carry back left.",
    input: "1011",
    definition: `{
  "states": ["scan", "carry", "accept"],
  "startState": "scan",
  "acceptStates": ["accept"],
  "rejectStates": [],
  "blank": "_",
  "transitions": [
    { "from": "scan", "read": "0", "to": "scan", "write": "0", "move": "R" },
    { "from": "scan", "read": "1", "to": "scan", "write": "1", "move": "R" },
    { "from": "scan", "read": "_", "to": "carry", "write": "_", "move": "L" },
    { "from": "carry", "read": "1", "to": "carry", "write": "0", "move": "L" },
    { "from": "carry", "read": "0", "to": "accept", "write": "1", "move": "S" },
    { "from": "carry", "read": "_", "to": "accept", "write": "1", "move": "S" }
  ]
}`
  },
  {
    id: "tm-even-parity",
    title: "Even number of 1s",
    summary: "Halts in accept for even parity and reject for odd parity.",
    input: "10110",
    definition: `{
  "states": ["even", "odd", "accept", "reject"],
  "startState": "even",
  "acceptStates": ["accept"],
  "rejectStates": ["reject"],
  "blank": "_",
  "transitions": [
    { "from": "even", "read": "0", "to": "even", "write": "0", "move": "R" },
    { "from": "even", "read": "1", "to": "odd", "write": "1", "move": "R" },
    { "from": "odd", "read": "0", "to": "odd", "write": "0", "move": "R" },
    { "from": "odd", "read": "1", "to": "even", "write": "1", "move": "R" },
    { "from": "even", "read": "_", "to": "accept", "write": "_", "move": "S" },
    { "from": "odd", "read": "_", "to": "reject", "write": "_", "move": "S" }
  ]
}`
  },
  {
    id: "tm-unary-increment",
    title: "Unary increment",
    summary: "Append one more tally mark at the end of a unary string.",
    input: "111",
    definition: `{
  "states": ["scan", "accept"],
  "startState": "scan",
  "acceptStates": ["accept"],
  "rejectStates": [],
  "blank": "_",
  "transitions": [
    { "from": "scan", "read": "1", "to": "scan", "write": "1", "move": "R" },
    { "from": "scan", "read": "_", "to": "accept", "write": "1", "move": "S" }
  ]
}`
  }
];
