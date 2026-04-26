import type { Dfa, SimulationResult } from "./types";

export function simulateDfa(dfa: Dfa, input: string): SimulationResult {
  let current = dfa.start;
  const path: SimulationResult["path"] = [];

  for (let index = 0; index < input.length; index += 1) {
    const symbol = input[index]!;
    const edge = dfa.transitions.find((candidate) => candidate.from === current && candidate.symbol === symbol);

    if (edge === undefined) {
      return {
        input,
        accepted: false,
        path: [...path, { index, symbol, from: current, to: null }],
        finalState: current,
        reason: `No transition from ${current} on '${symbol}'.`
      };
    }

    path.push({ index, symbol, from: current, to: edge.to });
    current = edge.to;
  }

  const finalState = dfa.states.find((state) => state.id === current);
  if (finalState === undefined) {
    throw new Error(`Internal error: missing DFA state ${current}`);
  }

  return {
    input,
    accepted: finalState.isAccept,
    path,
    finalState: current,
    reason: finalState.isAccept ? "Input ended in an accepting state." : "Input ended in a rejecting state."
  };
}
