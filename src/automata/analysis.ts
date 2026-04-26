import { ensureCompleteDfa } from "./subset";
import type { ConversionInsights, Dfa, LanguageExample, RegexComparisonResult } from "./types";

interface SearchNode {
  state: string;
  value: string;
}

interface ProductNode {
  leftState: string;
  rightState: string;
  witness: string;
}

interface TransitionIndex {
  byKey: Map<string, string>;
  acceptByState: Map<string, boolean>;
}

export function buildConversionInsights(
  dfa: Dfa,
  options?: { maxLength?: number; sampleLimit?: number }
): ConversionInsights {
  const maxLength = options?.maxLength ?? 4;
  const sampleLimit = options?.sampleLimit ?? 8;
  const complete = ensureCompleteDfa({
    states: dfa.states.map((state) => ({ ...state })),
    transitions: dfa.transitions.map((transition) => ({ ...transition })),
    start: dfa.start,
    alphabet: [...dfa.alphabet]
  }).dfa;

  const shortestAccepted = findShortestExample(complete, true);
  const shortestRejected = findShortestExample(complete, false);

  return {
    shortestAccepted: shortestAccepted === null ? null : toLanguageExample(shortestAccepted),
    shortestRejected: shortestRejected === null ? null : toLanguageExample(shortestRejected),
    acceptedExamples: enumerateExamples(complete, true, maxLength, sampleLimit).map(toLanguageExample),
    rejectedExamples: enumerateExamples(complete, false, maxLength, sampleLimit).map(toLanguageExample)
  };
}

export function compareDfaLanguages(
  left: Dfa,
  right: Dfa,
  leftRegex: string,
  rightRegex: string
): RegexComparisonResult {
  const checkedAlphabet = [...new Set([...left.alphabet, ...right.alphabet])].sort();
  const completeLeft = completeForAlphabet(left, checkedAlphabet);
  const completeRight = completeForAlphabet(right, checkedAlphabet);
  const leftIndex = createTransitionIndex(completeLeft);
  const rightIndex = createTransitionIndex(completeRight);

  const queue: ProductNode[] = [
    {
      leftState: completeLeft.start,
      rightState: completeRight.start,
      witness: ""
    }
  ];
  const visited = new Set<string>([pairKey(completeLeft.start, completeRight.start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const leftAccepts = leftIndex.acceptByState.get(current.leftState);
    const rightAccepts = rightIndex.acceptByState.get(current.rightState);

    if (leftAccepts === undefined || rightAccepts === undefined) {
      throw new Error("Internal error: missing state while comparing DFA languages");
    }

    if (leftAccepts !== rightAccepts) {
      const witness = toLanguageExample(current.witness);
      return {
        leftRegex,
        rightRegex,
        equivalent: false,
        checkedAlphabet,
        witness,
        leftAcceptsWitness: leftAccepts,
        rightAcceptsWitness: rightAccepts,
        explanation:
          "The regexes differ. The witness string is accepted by one DFA and rejected by the other."
      };
    }

    for (const symbol of checkedAlphabet) {
      const leftTarget = transitionTarget(leftIndex.byKey, current.leftState, symbol);
      const rightTarget = transitionTarget(rightIndex.byKey, current.rightState, symbol);
      const key = pairKey(leftTarget, rightTarget);

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push({
        leftState: leftTarget,
        rightState: rightTarget,
        witness: `${current.witness}${symbol}`
      });
    }
  }

  return {
    leftRegex,
    rightRegex,
    equivalent: true,
    checkedAlphabet,
    witness: null,
    leftAcceptsWitness: null,
    rightAcceptsWitness: null,
    explanation: "The regexes are equivalent over their combined observable alphabet."
  };
}

function findShortestExample(dfa: Dfa, targetAccepted: boolean): string | null {
  const index = createTransitionIndex(dfa);
  const startAccepted = index.acceptByState.get(dfa.start);

  if (startAccepted === undefined) {
    throw new Error(`Internal error: missing DFA start state ${dfa.start}`);
  }

  if (startAccepted === targetAccepted) {
    return "";
  }

  const queue: SearchNode[] = [{ state: dfa.start, value: "" }];
  const visited = new Set<string>([dfa.start]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const symbol of dfa.alphabet) {
      const target = transitionTarget(index.byKey, current.state, symbol);
      if (visited.has(target)) {
        continue;
      }

      const candidate = `${current.value}${symbol}`;
      const accepted = index.acceptByState.get(target);
      if (accepted === undefined) {
        throw new Error(`Internal error: missing DFA state ${target}`);
      }

      if (accepted === targetAccepted) {
        return candidate;
      }

      visited.add(target);
      queue.push({ state: target, value: candidate });
    }
  }

  return null;
}

function enumerateExamples(
  dfa: Dfa,
  targetAccepted: boolean,
  maxLength: number,
  limit: number
): string[] {
  const boundedLength = Math.max(0, Math.min(maxLength, 8));
  const boundedLimit = Math.max(1, Math.min(limit, 20));
  const maxExploredNodes = 8000;
  const index = createTransitionIndex(dfa);
  const queue: SearchNode[] = [{ state: dfa.start, value: "" }];
  const results: string[] = [];
  const seenValues = new Set<string>();
  let exploredNodes = 0;

  while (queue.length > 0 && results.length < boundedLimit && exploredNodes < maxExploredNodes) {
    const current = queue.shift()!;
    exploredNodes += 1;
    const accepted = index.acceptByState.get(current.state);

    if (accepted === undefined) {
      throw new Error(`Internal error: missing DFA state ${current.state}`);
    }

    if (accepted === targetAccepted && !seenValues.has(current.value)) {
      results.push(current.value);
      seenValues.add(current.value);
      if (results.length >= boundedLimit) {
        break;
      }
    }

    if (current.value.length >= boundedLength) {
      continue;
    }

    for (const symbol of dfa.alphabet) {
      if (queue.length + exploredNodes >= maxExploredNodes) {
        break;
      }
      queue.push({
        state: transitionTarget(index.byKey, current.state, symbol),
        value: `${current.value}${symbol}`
      });
    }
  }

  return results;
}

function completeForAlphabet(dfa: Dfa, alphabet: string[]): Dfa {
  return ensureCompleteDfa({
    states: dfa.states.map((state) => ({ ...state })),
    transitions: dfa.transitions.map((transition) => ({ ...transition })),
    start: dfa.start,
    alphabet: [...alphabet]
  }).dfa;
}

function createTransitionIndex(dfa: Dfa): TransitionIndex {
  const byKey = new Map<string, string>();
  const acceptByState = new Map<string, boolean>();

  for (const state of dfa.states) {
    acceptByState.set(state.id, state.isAccept);
  }

  for (const transition of dfa.transitions) {
    byKey.set(transitionKey(transition.from, transition.symbol), transition.to);
  }

  return { byKey, acceptByState };
}

function transitionTarget(byKey: Map<string, string>, from: string, symbol: string): string {
  const target = byKey.get(transitionKey(from, symbol));
  if (target === undefined) {
    throw new Error(`Internal error: missing DFA transition from ${from} on '${printableChar(symbol)}'`);
  }
  return target;
}

function pairKey(leftState: string, rightState: string): string {
  return `${leftState}\0${rightState}`;
}

function transitionKey(from: string, symbol: string): string {
  return `${from}\0${symbol}`;
}

function toLanguageExample(value: string): LanguageExample {
  return {
    value,
    printable: printableString(value),
    length: value.length
  };
}

function printableString(value: string): string {
  if (value.length === 0) {
    return "<epsilon>";
  }

  return [...value].map(printableChar).join("");
}

function printableChar(symbol: string): string {
  if (symbol === "\n") {
    return "\\n";
  }
  if (symbol === "\r") {
    return "\\r";
  }
  if (symbol === "\t") {
    return "\\t";
  }
  if (symbol === " ") {
    return "\\s";
  }
  return symbol;
}
