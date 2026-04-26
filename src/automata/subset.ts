import type {
  Dfa,
  DfaState,
  DfaTransition,
  Nfa,
  SubsetConstructionStep,
  SubsetConstructionTrace
} from "./types";

export function buildDfaFromNfa(nfa: Nfa): { dfa: Dfa; trace: SubsetConstructionTrace } {
  const states: DfaState[] = [];
  const transitions: DfaTransition[] = [];
  const bySet = new Map<string, string>();
  const queue: string[] = [];
  const steps: SubsetConstructionStep[] = [];

  const startClosure = epsilonClosure(nfa, [nfa.start]);
  const startId = getOrCreateState(startClosure, true);

  while (queue.length > 0) {
    const sourceId = queue.shift()!;
    const source = stateById(states, sourceId);

    for (const symbol of nfa.alphabet) {
      const moveSet = move(nfa, source.nfaStates, symbol);
      const closureSet = epsilonClosure(nfa, moveSet);
      const beforeCount = states.length;
      const targetId = closureSet.length > 0 ? getOrCreateState(closureSet, false) : null;

      if (targetId !== null) {
        transitions.push({
          id: `d${transitions.length}`,
          from: sourceId,
          to: targetId,
          symbol,
          label: printableSymbol(symbol)
        });
      }

      steps.push({
        step: steps.length + 1,
        sourceStateId: sourceId,
        sourceSet: source.nfaStates,
        symbol,
        moveSet,
        closureSet,
        targetStateId: targetId,
        createdTarget: targetId !== null && states.length > beforeCount,
        explanation: describeSubsetStep(sourceId, source.nfaStates, symbol, moveSet, closureSet, targetId)
      });
    }
  }

  return {
    dfa: {
      states,
      transitions,
      start: startId,
      alphabet: [...nfa.alphabet]
    },
    trace: {
      startClosure,
      steps
    }
  };

  function getOrCreateState(nfaStates: number[], isStart: boolean): string {
    const normalized = normalizeSet(nfaStates);
    const key = setKey(normalized);
    const existing = bySet.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const id = `D${states.length}`;
    bySet.set(key, id);
    states.push({
      id,
      label: setLabel(normalized),
      nfaStates: normalized,
      isStart,
      isAccept: normalized.includes(nfa.accept)
    });
    queue.push(id);
    return id;
  }
}

export function ensureCompleteDfa(dfa: Dfa): { dfa: Dfa; addedDeadState: boolean } {
  const states = dfa.states.map((state) => ({ ...state }));
  const transitions = dfa.transitions.map((transition) => ({ ...transition }));
  const transitionKeys = new Set(transitions.map((edge) => `${edge.from}\0${edge.symbol}`));
  let deadStateId: string | null = null;

  for (const state of [...states]) {
    for (const symbol of dfa.alphabet) {
      const key = `${state.id}\0${symbol}`;
      if (!transitionKeys.has(key)) {
        if (deadStateId === null) {
          deadStateId = `D${states.length}`;
          states.push({
            id: deadStateId,
            label: "∅",
            nfaStates: [],
            isStart: false,
            isAccept: false,
            isDead: true
          });
        }

        transitions.push({
          id: `d${transitions.length}`,
          from: state.id,
          to: deadStateId,
          symbol,
          label: printableSymbol(symbol)
        });
        transitionKeys.add(key);
      }
    }
  }

  if (deadStateId !== null) {
    for (const symbol of dfa.alphabet) {
      transitions.push({
        id: `d${transitions.length}`,
        from: deadStateId,
        to: deadStateId,
        symbol,
        label: printableSymbol(symbol)
      });
    }
  }

  return {
    dfa: {
      states,
      transitions,
      start: dfa.start,
      alphabet: [...dfa.alphabet]
    },
    addedDeadState: deadStateId !== null
  };
}

export function epsilonClosure(nfa: Nfa, inputStates: number[]): number[] {
  const closure = new Set(inputStates);
  const stack = [...inputStates];

  while (stack.length > 0) {
    const state = stack.pop()!;
    for (const edge of nfa.transitions) {
      if (edge.from === state && edge.symbol === null && !closure.has(edge.to)) {
        closure.add(edge.to);
        stack.push(edge.to);
      }
    }
  }

  return normalizeSet([...closure]);
}

export function move(nfa: Nfa, states: number[], symbol: string): number[] {
  const reached = new Set<number>();

  for (const state of states) {
    for (const edge of nfa.transitions) {
      if (edge.from === state && edge.symbol === symbol) {
        reached.add(edge.to);
      }
    }
  }

  return normalizeSet([...reached]);
}

export function normalizeSet(states: number[]): number[] {
  return [...new Set(states)].sort((a, b) => a - b);
}

export function setKey(states: number[]): string {
  return normalizeSet(states).join(",");
}

export function setLabel(states: number[]): string {
  return states.length === 0 ? "∅" : `{${states.join(", ")}}`;
}

function stateById(states: DfaState[], id: string): DfaState {
  const state = states.find((candidate) => candidate.id === id);
  if (state === undefined) {
    throw new Error(`Internal error: missing DFA state ${id}`);
  }
  return state;
}

function describeSubsetStep(
  sourceId: string,
  sourceSet: number[],
  symbol: string,
  moveSet: number[],
  closureSet: number[],
  targetId: string | null
): string {
  const moveLabel = setLabel(moveSet);
  const closureLabel = setLabel(closureSet);
  const targetLabel = targetId ?? "no DFA state";
  return `From ${sourceId}=${setLabel(sourceSet)}, move on '${printableSymbol(symbol)}' gives ${moveLabel}; epsilon-closure gives ${closureLabel}, so transition goes to ${targetLabel}.`;
}

function printableSymbol(symbol: string): string {
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
    return "space";
  }
  return symbol;
}
