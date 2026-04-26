import type { Dfa, DfaState, DfaTransition, MinimizationRound, MinimizationTrace } from "./types";

export function minimizeDfa(dfa: Dfa): { dfa: Dfa; trace: MinimizationTrace } {
  let partitions = initialPartitions(dfa);
  const trace: MinimizationTrace = {
    initialPartitions: clonePartitions(partitions),
    rounds: []
  };
  let round = 1;

  while (true) {
    const before = clonePartitions(partitions);
    const next = refinePartitions(dfa, partitions);
    const after = clonePartitions(next);

    if (samePartitions(partitions, next)) {
      break;
    }

    trace.rounds.push({ round, before, after });
    partitions = next;
    round += 1;
  }

  partitions = orderPartitions(dfa, partitions);
  return { dfa: buildMinimizedDfa(dfa, partitions), trace };
}

function initialPartitions(dfa: Dfa): string[][] {
  const accepting = dfa.states.filter((state) => state.isAccept).map((state) => state.id);
  const rejecting = dfa.states.filter((state) => !state.isAccept).map((state) => state.id);
  return [accepting, rejecting].filter((group) => group.length > 0);
}

function refinePartitions(dfa: Dfa, partitions: string[][]): string[][] {
  const partitionByState = partitionIndex(partitions);
  const refined: string[][] = [];

  for (const group of partitions) {
    const buckets = new Map<string, string[]>();

    for (const stateId of group) {
      const signature = dfa.alphabet
        .map((symbol) => {
          const target = transitionTarget(dfa, stateId, symbol);
          return `${symbol}->${partitionByState.get(target) ?? "missing"}`;
        })
        .join("|");
      const bucket = buckets.get(signature) ?? [];
      bucket.push(stateId);
      buckets.set(signature, bucket);
    }

    refined.push(...[...buckets.values()]);
  }

  return refined;
}

function buildMinimizedDfa(dfa: Dfa, partitions: string[][]): Dfa {
  const oldToNew = new Map<string, string>();
  const states: DfaState[] = [];
  const transitions: DfaTransition[] = [];

  partitions.forEach((group, index) => {
    const id = `M${index}`;
    for (const oldState of group) {
      oldToNew.set(oldState, id);
    }

    const members = group.map((stateId) => stateById(dfa, stateId));
    states.push({
      id,
      label: `{${group.join(", ")}}`,
      nfaStates: [...new Set(members.flatMap((state) => state.nfaStates))].sort((a, b) => a - b),
      isStart: group.includes(dfa.start),
      isAccept: members.some((state) => state.isAccept),
      isDead: members.every((state) => state.isDead === true),
      mergedFrom: group
    });
  });

  for (const partition of partitions) {
    const representative = partition[0]!;
    const from = oldToNew.get(representative)!;

    for (const symbol of dfa.alphabet) {
      const target = transitionTarget(dfa, representative, symbol);
      const to = oldToNew.get(target);

      if (to !== undefined) {
        transitions.push({
          id: `m${transitions.length}`,
          from,
          to,
          symbol,
          label: printableSymbol(symbol)
        });
      }
    }
  }

  const start = oldToNew.get(dfa.start);
  if (start === undefined) {
    throw new Error("Internal error: minimized DFA lost its start state");
  }

  return {
    states,
    transitions,
    start,
    alphabet: [...dfa.alphabet]
  };
}

function transitionTarget(dfa: Dfa, from: string, symbol: string): string {
  const edge = dfa.transitions.find((candidate) => candidate.from === from && candidate.symbol === symbol);
  if (edge === undefined) {
    return "__missing__";
  }
  return edge.to;
}

function orderPartitions(dfa: Dfa, partitions: string[][]): string[][] {
  return [...partitions].sort((a, b) => {
    const rank = partitionRank(dfa, a) - partitionRank(dfa, b);
    if (rank !== 0) {
      return rank;
    }

    const left = [...a].sort().join(",");
    const right = [...b].sort().join(",");
    return left.localeCompare(right);
  });
}

function partitionRank(dfa: Dfa, partition: string[]): number {
  if (partition.includes(dfa.start)) {
    return -2;
  }
  if (partition.some((id) => stateById(dfa, id).isAccept)) {
    return -1;
  }
  return 0;
}

function partitionIndex(partitions: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  partitions.forEach((group, index) => {
    for (const state of group) {
      map.set(state, index);
    }
  });
  return map;
}

function samePartitions(left: string[][], right: string[][]): boolean {
  return JSON.stringify(normalizePartitions(left)) === JSON.stringify(normalizePartitions(right));
}

function normalizePartitions(partitions: string[][]): string[][] {
  return partitions.map((group) => [...group].sort()).sort((a, b) => a.join(",").localeCompare(b.join(",")));
}

function clonePartitions(partitions: string[][]): string[][] {
  return partitions.map((group) => [...group]);
}

function stateById(dfa: Dfa, id: string): DfaState {
  const state = dfa.states.find((candidate) => candidate.id === id);
  if (state === undefined) {
    throw new Error(`Internal error: missing DFA state ${id}`);
  }
  return state;
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
