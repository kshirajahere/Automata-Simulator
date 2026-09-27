import { describe, expect, it } from "vitest";
import { pdaExamples } from "../src/automata/formalExamples";
import { simulatePda } from "../src/automata/pda";

describe("PDA trace audit", () => {
  it("replays the shipped a^n b^n accepting trace from its transition relation", () => {
    const example = pdaExamples.find((candidate) => candidate.title === "a^n b^n");
    expect(example).toBeDefined();
    const result = simulatePda(example!.definition, example!.input);
    expect(result.accepted).toBe(true);

    let state = result.machine.startState;
    let consumed = 0;
    let stack = [result.machine.stackStart];
    for (const step of result.steps) {
      const transition = result.machine.transitions.find((candidate) => candidate.id === step.transitionId);
      expect(transition).toBeDefined();
      expect(step.fromState).toBe(state);
      expect(step.stackBefore).toEqual(stack);
      expect(transition!.from).toBe(state);
      expect(transition!.stackTop).toBe(stack.at(-1));
      expect(step.consumedInput).toBe(transition!.input);
      if (transition!.input !== null) {
        expect(result.tokens[consumed]).toBe(transition!.input);
        consumed += 1;
      }
      stack = [...stack.slice(0, -1), ...[...transition!.push].reverse()];
      expect(step.stackAfter).toEqual(stack);
      expect(step.remainingInput).toEqual(result.tokens.slice(consumed));
      state = transition!.to;
      expect(step.toState).toBe(state);
    }

    expect(consumed).toBe(result.tokens.length);
    expect(state).toBe(result.finalState);
    expect(stack).toEqual(result.finalStack);
    expect(result.machine.acceptStates).toContain(state);
  });
});
