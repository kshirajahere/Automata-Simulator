export type RegexAst =
  | { type: "empty"; span: Span }
  | { type: "epsilon"; span: Span }
  | { type: "literal"; value: string; span: Span }
  | { type: "charset"; chars: string[]; span: Span }
  | { type: "concat"; terms: RegexAst[]; span: Span }
  | { type: "union"; options: RegexAst[]; span: Span }
  | { type: "star"; expr: RegexAst; span: Span }
  | { type: "plus"; expr: RegexAst; span: Span }
  | { type: "optional"; expr: RegexAst; span: Span };

export interface Span {
  start: number;
  end: number;
}

export type TransitionSymbol = string | null;

export interface NfaState {
  id: number;
  label: string;
  isStart: boolean;
  isAccept: boolean;
}

export interface NfaTransition {
  id: string;
  from: number;
  to: number;
  symbol: TransitionSymbol;
  label: string;
}

export interface Nfa {
  states: NfaState[];
  transitions: NfaTransition[];
  start: number;
  accept: number;
  alphabet: string[];
}

export interface DfaState {
  id: string;
  label: string;
  nfaStates: number[];
  isStart: boolean;
  isAccept: boolean;
  isDead?: boolean;
  mergedFrom?: string[];
}

export interface DfaTransition {
  id: string;
  from: string;
  to: string;
  symbol: string;
  label: string;
}

export interface Dfa {
  states: DfaState[];
  transitions: DfaTransition[];
  start: string;
  alphabet: string[];
}

export interface SubsetConstructionStep {
  step: number;
  sourceStateId: string;
  sourceSet: number[];
  symbol: string;
  moveSet: number[];
  closureSet: number[];
  targetStateId: string | null;
  createdTarget: boolean;
  explanation: string;
}

export interface SubsetConstructionTrace {
  startClosure: number[];
  steps: SubsetConstructionStep[];
}

export interface MinimizationRound {
  round: number;
  before: string[][];
  after: string[][];
}

export interface MinimizationTrace {
  initialPartitions: string[][];
  rounds: MinimizationRound[];
}

export interface LanguageExample {
  value: string;
  printable: string;
  length: number;
}

export interface ConversionInsights {
  shortestAccepted: LanguageExample | null;
  shortestRejected: LanguageExample | null;
  acceptedExamples: LanguageExample[];
  rejectedExamples: LanguageExample[];
}

export interface RegexComparisonResult {
  leftRegex: string;
  rightRegex: string;
  equivalent: boolean;
  checkedAlphabet: string[];
  witness: LanguageExample | null;
  leftAcceptsWitness: boolean | null;
  rightAcceptsWitness: boolean | null;
  explanation: string;
}

export interface EquivalenceCertificateTransition {
  symbol: string;
  leftTo: string;
  rightTo: string;
  discovered: boolean;
}

export interface EquivalenceCertificateStep {
  step: number;
  pairId: string;
  leftState: string;
  rightState: string;
  witness: string;
  leftAccept: boolean;
  rightAccept: boolean;
  mismatch: boolean;
  transitions: EquivalenceCertificateTransition[];
}

export interface EquivalenceCertificate {
  version: "1.0";
  algorithm: "product-dfa-bfs-v1";
  certificateHash: string;
  generatedAt: string;
  leftRegex: string;
  rightRegex: string;
  checkedAlphabet: string[];
  equivalent: boolean;
  mismatchWitness: LanguageExample | null;
  visitedPairs: string[];
  trace: EquivalenceCertificateStep[];
  notes: string[];
}

export interface EquivalenceCertificateBundle {
  comparison: RegexComparisonResult;
  certificate: EquivalenceCertificate;
}

export interface CertificateVerificationResult {
  valid: boolean;
  reason: string;
  expectedHash: string;
  receivedHash: string;
  equivalent: boolean;
  witness: LanguageExample | null;
}

export interface LanguageDifferenceSample extends LanguageExample {
  leftAccepts: boolean;
  rightAccepts: boolean;
  classLabel: string;
}

export interface LanguageDifferenceLengthGroup {
  length: number;
  samples: LanguageDifferenceSample[];
}

export interface LanguageDifferenceClassGroup {
  classLabel: string;
  samples: LanguageDifferenceSample[];
}

export interface LanguageDifferenceResult {
  leftRegex: string;
  rightRegex: string;
  equivalent: boolean;
  checkedAlphabet: string[];
  shortestWitness: LanguageExample | null;
  samples: LanguageDifferenceSample[];
  byLength: LanguageDifferenceLengthGroup[];
  byClass: LanguageDifferenceClassGroup[];
  notes: string[];
}

export interface ExperimentRunMetrics {
  parseMs: number;
  thompsonMs: number;
  subsetMs: number;
  minimizeMs: number;
  totalMs: number;
  alphabetSize: number;
  nfaStates: number;
  dfaStates: number;
  minimizedStates: number;
  subsetSteps: number;
}

export interface ExperimentRun {
  family: string;
  size: number;
  regex: string;
  metrics: ExperimentRunMetrics;
}

export interface ExperimentSeriesPoint {
  size: number;
  totalMs: number;
  nfaStates: number;
  dfaStates: number;
  minimizedStates: number;
  subsetSteps: number;
}

export interface ExperimentSeries {
  family: string;
  points: ExperimentSeriesPoint[];
}

export interface ExperimentSummary {
  totalRuns: number;
  maxTimeMs: number;
  maxDfaStates: number;
  maxMinimizedStates: number;
}

export interface ExperimentSuiteResult {
  generatedAt: string;
  maxSize: number;
  repetitions: number;
  runs: ExperimentRun[];
  series: ExperimentSeries[];
  summary: ExperimentSummary;
}

export interface ConversionResult {
  regex: string;
  ast: RegexAst;
  nfa: Nfa;
  dfa: Dfa;
  subsetConstruction: SubsetConstructionTrace;
  minimizedDfa: Dfa;
  minimization: MinimizationTrace;
  insights: ConversionInsights;
  notes: string[];
}

export interface SimulationStep {
  index: number;
  symbol: string;
  from: string;
  to: string | null;
}

export interface SimulationResult {
  input: string;
  accepted: boolean;
  path: SimulationStep[];
  finalState: string;
  reason: string;
}

export interface AdvancedSimulationResult {
  regex: string;
  input: string;
  fullDfa: SimulationResult;
  minimizedDfa: SimulationResult;
  consistent: boolean;
  explanation: string;
}

export interface BatchSimulationCase {
  input: string;
  accepted: boolean;
  finalState: string;
  reason: string;
  pathLength: number;
}

export interface BatchSimulationSummary {
  total: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
}

export interface BatchSimulationResult {
  regex: string;
  cases: BatchSimulationCase[];
  summary: BatchSimulationSummary;
}
