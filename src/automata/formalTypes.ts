export class FormalDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormalDefinitionError";
  }
}

export interface FormalExample<TDefinition = string> {
  id: string;
  title: string;
  summary: string;
  input: string;
  definition: TDefinition;
}

export interface CfgSymbol {
  kind: "terminal" | "nonterminal";
  value: string;
}

export interface CfgProduction {
  id: string;
  head: string;
  body: CfgSymbol[];
  printable: string;
}

export interface CfgGrammar {
  source: string;
  startSymbol: string;
  nonterminals: string[];
  terminals: string[];
  productions: CfgProduction[];
}

export interface CfgParseTreeNode {
  id: string;
  symbol: string;
  kind: "nonterminal" | "terminal" | "epsilon";
  children: CfgParseTreeNode[];
  productionId?: string;
}

export interface CfgDerivationStep {
  step: number;
  sententialForm: string[];
  expandedSymbol: string | null;
  production: string | null;
}

export interface CfgParseResult {
  grammar: CfgGrammar;
  input: string;
  tokens: string[];
  accepted: boolean;
  ambiguous: boolean;
  parseCount: number;
  tree: CfgParseTreeNode | null;
  derivation: CfgDerivationStep[];
  leftmostDerivation: CfgDerivationStep[];
  rightmostDerivation: CfgDerivationStep[];
  notes: string[];
}

export interface PdaTransition {
  id: string;
  from: string;
  input: string | null;
  stackTop: string;
  to: string;
  push: string[];
}

export interface PdaDefinition {
  source: string;
  states: string[];
  startState: string;
  acceptStates: string[];
  stackStart: string;
  acceptMode: "final-state" | "empty-stack";
  transitions: PdaTransition[];
}

export interface PdaTraceStep {
  step: number;
  fromState: string;
  toState: string;
  consumedInput: string | null;
  remainingInput: string[];
  stackBefore: string[];
  stackAfter: string[];
  transitionId: string;
}

export interface PdaSimulationResult {
  machine: PdaDefinition;
  input: string;
  tokens: string[];
  accepted: boolean;
  finalState: string;
  finalStack: string[];
  consumed: number;
  steps: PdaTraceStep[];
  exploredConfigurations: number;
  notes: string[];
  reason: string;
}

export type TuringMove = "L" | "R" | "S";

export interface TuringTransition {
  id: string;
  from: string;
  read: string;
  to: string;
  write: string;
  move: TuringMove;
}

export interface TuringMachineDefinition {
  source: string;
  states: string[];
  startState: string;
  acceptStates: string[];
  rejectStates: string[];
  blank: string;
  transitions: TuringTransition[];
}

export interface TuringTapeCell {
  index: number;
  symbol: string;
  head: boolean;
}

export interface TuringTraceStep {
  step: number;
  fromState: string;
  toState: string;
  headBefore: number;
  headAfter: number;
  read: string;
  write: string;
  move: TuringMove;
  window: TuringTapeCell[];
}

export interface TuringSimulationResult {
  machine: TuringMachineDefinition;
  input: string;
  accepted: boolean;
  halted: boolean;
  finalState: string;
  head: number;
  tape: string;
  window: TuringTapeCell[];
  steps: TuringTraceStep[];
  notes: string[];
  reason: string;
  maxStepsReached: boolean;
}
