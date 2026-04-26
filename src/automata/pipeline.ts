import { buildConversionInsights, compareDfaLanguages } from "./analysis.js";
import { parseCfg } from "./cfg.js";
import { cfgExamples, pdaExamples, turingExamples } from "./formalExamples.js";
import { minimizeDfa } from "./minimize.js";
import { parseRegex } from "./parser.js";
import { simulatePda } from "./pda.js";
import { simulateDfa } from "./simulate.js";
import { buildDfaFromNfa, ensureCompleteDfa } from "./subset.js";
import { buildThompsonNfa } from "./thompson.js";
import { simulateTuringMachine } from "./turing.js";
import type { CfgParseResult, PdaSimulationResult, TuringSimulationResult } from "./formalTypes";
import type {
  BatchSimulationResult,
  ConversionResult,
  RegexComparisonResult,
  SimulationResult
} from "./types";

export function convertRegex(regex: string): ConversionResult {
  const ast = parseRegex(regex);
  const nfa = buildThompsonNfa(ast);
  const subset = buildDfaFromNfa(nfa);
  const completed = ensureCompleteDfa(subset.dfa);
  const minimized = minimizeDfa(completed.dfa);
  const insights = buildConversionInsights(completed.dfa);

  const notes = [
    "NFA is built with Thompson's construction.",
    "DFA states are epsilon-closures of NFA state subsets.",
    completed.addedDeadState
      ? "A dead state was added so the DFA transition function is total."
      : "The DFA was already complete for its alphabet.",
    "Minimization uses partition refinement after DFA completion.",
    "Language insights include shortest witnesses and bounded accepted/rejected examples."
  ];

  return {
    regex,
    ast,
    nfa,
    dfa: completed.dfa,
    subsetConstruction: subset.trace,
    minimizedDfa: minimized.dfa,
    minimization: minimized.trace,
    insights,
    notes
  };
}

export function compareRegexes(leftRegex: string, rightRegex: string): RegexComparisonResult {
  const left = convertRegex(leftRegex);
  const right = convertRegex(rightRegex);
  return compareDfaLanguages(left.dfa, right.dfa, leftRegex, rightRegex);
}

export function simulateRegex(regex: string, input: string): SimulationResult {
  const conversion = convertRegex(regex);
  return simulateDfa(conversion.dfa, input);
}

export function simulateRegexBatch(regex: string, inputs: string[]): BatchSimulationResult {
  const conversion = convertRegex(regex);
  const cases = inputs.map((input) => {
    const simulation = simulateDfa(conversion.dfa, input);
    return {
      input,
      accepted: simulation.accepted,
      finalState: simulation.finalState,
      reason: simulation.reason,
      pathLength: simulation.path.length
    };
  });

  const accepted = cases.filter((row) => row.accepted).length;
  const rejected = cases.length - accepted;

  return {
    regex,
    cases,
    summary: {
      total: cases.length,
      accepted,
      rejected,
      acceptanceRate: cases.length === 0 ? 0 : accepted / cases.length
    }
  };
}

export function parseCfgInput(grammar: string, input: string): CfgParseResult {
  return parseCfg(grammar, input);
}

export function simulatePdaInput(definition: string, input: string): PdaSimulationResult {
  return simulatePda(definition, input);
}

export function simulateTuringInput(definition: string, input: string): TuringSimulationResult {
  return simulateTuringMachine(definition, input);
}

export const examples = [
  {
    title: "Ends with abb",
    regex: "(a|b)*abb",
    input: "aaabb",
    why: "Classic subset-construction example with meaningful minimization."
  },
  {
    title: "Identifier-like token",
    regex: "[a-zA-Z]([a-zA-Z]|[0-9])*",
    input: "x42",
    why: "Shows character classes and long-lived accepting DFA states."
  },
  {
    title: "Optional sign and digits",
    regex: "(\\+|-)?[0-9]+",
    input: "-120",
    why: "Uses optional and plus operators in a lexer-style pattern."
  },
  {
    title: "Contains ab or ba",
    regex: "(a|b)*(ab|ba)(a|b)*",
    input: "baba",
    why: "Creates a larger NFA and a useful subset trace."
  }
];

export { cfgExamples, pdaExamples, turingExamples };
