import { describe, expect, it } from "vitest";
import { compareDfaLanguages } from "../src/automata/analysis";
import { convertRegex } from "../src/automata/pipeline";
import { simulateDfa } from "../src/automata/simulate";
import type { Nfa } from "../src/automata/types";

function sorted<T extends string | number>(items: Iterable<T>): T[] {
  return [...items].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
}

function epsilonClosure(nfa: Nfa, states: number[]): number[] {
  const reached = new Set(states);
  const pending = [...states];
  while (pending.length > 0) {
    const state = pending.pop()!;
    for (const edge of nfa.transitions) {
      if (edge.from === state && edge.symbol === null && !reached.has(edge.to)) {
        reached.add(edge.to);
        pending.push(edge.to);
      }
    }
  }
  return sorted(reached);
}

describe("parameterized trace audit", () => {
  it("replays each subset event and each partition refinement", () => {
    let subsetEvents = 0;
    let refinementRounds = 0;

    for (let n = 0; n <= 6; n += 1) {
      const regex = `(a|b)*a${"(a|b)".repeat(n)}`;
      const result = convertRegex(regex);
      expect(sorted(result.subsetConstruction.startClosure)).toEqual(
        epsilonClosure(result.nfa, [result.nfa.start])
      );

      for (const event of result.subsetConstruction.steps) {
        subsetEvents += 1;
        const move = sorted(
          new Set(
            result.nfa.transitions
              .filter((edge) => event.sourceSet.includes(edge.from) && edge.symbol === event.symbol)
              .map((edge) => edge.to)
          )
        );
        const closure = epsilonClosure(result.nfa, move);
        expect(sorted(event.moveSet)).toEqual(move);
        expect(sorted(event.closureSet)).toEqual(closure);
        const target = result.dfa.states.find((state) => state.id === event.targetStateId);
        expect(target).toBeDefined();
        expect(sorted(target!.nfaStates)).toEqual(closure);
      }

      const stateIds = sorted(result.dfa.states.map((state) => state.id));
      expect(sorted(result.minimization.initialPartitions.flat())).toEqual(stateIds);
      for (const block of result.minimization.initialPartitions) {
        expect(new Set(block.map((id) => result.dfa.states.find((state) => state.id === id)?.isAccept)).size).toBe(1);
      }
      const transitions = new Map(
        result.dfa.transitions.map((edge) => [`${edge.from}\0${edge.symbol}`, edge.to])
      );
      for (const round of result.minimization.rounds) {
        refinementRounds += 1;
        expect(sorted(round.after.flat())).toEqual(stateIds);
        expect(new Set(round.after.flat()).size).toBe(stateIds.length);
        const priorBlock = new Map(
          round.before.flatMap((block, index) => block.map((state) => [state, index] as const))
        );
        for (const block of round.after) {
          expect(new Set(block.map((state) => priorBlock.get(state))).size).toBe(1);
          const signatures = block.map((state) =>
            result.dfa.alphabet
              .map((symbol) => priorBlock.get(transitions.get(`${state}\0${symbol}`)!))
              .join(",")
          );
          expect(new Set(signatures).size).toBe(1);
        }
      }
    }

    expect(subsetEvents).toBe(522);
    expect(refinementRounds).toBe(21);
  });

  it("checks bounded membership and exact minimization equivalence for the family", () => {
    let oracleComparisons = 0;
    for (let n = 0; n <= 6; n += 1) {
      const regex = `(a|b)*a${"(a|b)".repeat(n)}`;
      const result = convertRegex(regex);
      const oracle = new RegExp(`^${regex}$`);
      for (let length = 0; length <= 8; length += 1) {
        for (let value = 0; value < 2 ** length; value += 1) {
          const word = length === 0
            ? ""
            : value.toString(2).padStart(length, "0").replaceAll("0", "a").replaceAll("1", "b");
          expect(simulateDfa(result.dfa, word).accepted).toBe(oracle.test(word));
          oracleComparisons += 1;
        }
      }
      expect(compareDfaLanguages(result.dfa, result.minimizedDfa, regex, regex).equivalent).toBe(true);
    }
    expect(oracleComparisons).toBe(3577);
  });
});
