import type {
  TuringMachineDefinition,
  TuringSimulationResult,
  TuringTapeCell,
  TuringTransition
} from "./formalTypes.js";
import { FormalDefinitionError } from "./formalTypes.js";

const MAX_TURING_STEPS = 180;
const WINDOW_RADIUS = 5;

export function simulateTuringMachine(definitionSource: string, input: string): TuringSimulationResult {
  const machine = parseTuringMachineDefinition(definitionSource);
  const tape = new Map<number, string>();

  for (const [index, symbol] of Array.from(input).entries()) {
    tape.set(index, symbol);
  }

  let state = machine.startState;
  let head = 0;
  const steps: TuringSimulationResult["steps"] = [];
  let halted = false;
  let accepted = false;
  let reason = "Machine stopped without accepting.";
  let maxStepsReached = false;

  for (let stepNumber = 1; stepNumber <= MAX_TURING_STEPS; stepNumber += 1) {
    if (machine.acceptStates.includes(state)) {
      halted = true;
      accepted = true;
      reason = "Machine entered an accepting state.";
      break;
    }

    if (machine.rejectStates.includes(state)) {
      halted = true;
      accepted = false;
      reason = "Machine entered a rejecting state.";
      break;
    }

    const read = tape.get(head) ?? machine.blank;
    const transition = machine.transitions.find(
      (candidate) => candidate.from === state && candidate.read === read
    );

    if (transition === undefined) {
      halted = true;
      accepted = false;
      reason = `No transition from ${state} on '${read}'.`;
      break;
    }

    tape.set(head, transition.write);
    const headBefore = head;
    if (transition.move === "L") {
      head -= 1;
    } else if (transition.move === "R") {
      head += 1;
    }

    const nextState = transition.to;
    steps.push({
      step: stepNumber,
      fromState: state,
      toState: nextState,
      headBefore,
      headAfter: head,
      read,
      write: transition.write,
      move: transition.move,
      window: buildTapeWindow(tape, head, machine.blank)
    });
    state = nextState;
  }

  if (!halted && !accepted) {
    maxStepsReached = true;
    reason = `Maximum step budget (${MAX_TURING_STEPS}) reached.`;
  }

  if (machine.acceptStates.includes(state)) {
    accepted = true;
    halted = true;
    reason = "Machine entered an accepting state.";
  } else if (machine.rejectStates.includes(state)) {
    accepted = false;
    halted = true;
    reason = "Machine entered a rejecting state.";
  }

  return {
    machine,
    input,
    accepted,
    halted,
    finalState: state,
    head,
    tape: stringifyTape(tape, machine.blank),
    window: buildTapeWindow(tape, head, machine.blank),
    steps,
    notes: [
      "Simulation uses a single deterministic tape.",
      maxStepsReached
        ? "The interactive step budget was reached before the machine halted."
        : "The trace records each executed transition and a local tape window."
    ],
    reason,
    maxStepsReached
  };
}

export function parseTuringMachineDefinition(source: string): TuringMachineDefinition {
  const parsed = parseJsonObject(source, "Turing machine");
  const states = readStringArray(parsed.states, "states");
  const startState = readString(parsed.startState, "startState");
  const acceptStates = readStringArray(parsed.acceptStates ?? [], "acceptStates");
  const rejectStates = readStringArray(parsed.rejectStates ?? [], "rejectStates");
  const blank = readString(parsed.blank, "blank");
  const rawTransitions = parsed.transitions;

  if (states.length === 0) {
    throw new FormalDefinitionError("Turing machine must declare at least one state.");
  }

  if (!states.includes(startState)) {
    throw new FormalDefinitionError(`Turing machine startState '${startState}' is not listed in states.`);
  }

  if (!Array.isArray(rawTransitions) || rawTransitions.length === 0) {
    throw new FormalDefinitionError("Turing machine must include a non-empty transitions array.");
  }

  for (const state of [...acceptStates, ...rejectStates]) {
    if (!states.includes(state)) {
      throw new FormalDefinitionError(`Turing machine terminal state '${state}' is not listed in states.`);
    }
  }

  const transitions = rawTransitions.map((transition, index) =>
    parseTuringTransition(transition, index, states)
  );

  return {
    source,
    states,
    startState,
    acceptStates,
    rejectStates,
    blank,
    transitions
  };
}

function parseTuringTransition(value: unknown, index: number, states: string[]): TuringTransition {
  if (typeof value !== "object" || value === null) {
    throw new FormalDefinitionError(`Turing transition ${index + 1} must be an object.`);
  }

  const record = value as Record<string, unknown>;
  const from = readString(record.from, `transitions[${index}].from`);
  const to = readString(record.to, `transitions[${index}].to`);
  const read = readString(record.read, `transitions[${index}].read`);
  const write = readString(record.write, `transitions[${index}].write`);
  const move = record.move;

  if (!states.includes(from) || !states.includes(to)) {
    throw new FormalDefinitionError(`Turing transition ${index + 1} references an unknown state.`);
  }

  if (move !== "L" && move !== "R" && move !== "S") {
    throw new FormalDefinitionError(`Turing transition ${index + 1} must use move L, R, or S.`);
  }

  return {
    id: `τ${index + 1}`,
    from,
    read,
    to,
    write,
    move
  };
}

function buildTapeWindow(tape: Map<number, string>, head: number, blank: string): TuringTapeCell[] {
  const cells: TuringTapeCell[] = [];
  for (let index = head - WINDOW_RADIUS; index <= head + WINDOW_RADIUS; index += 1) {
    cells.push({
      index,
      symbol: tape.get(index) ?? blank,
      head: index === head
    });
  }
  return cells;
}

function stringifyTape(tape: Map<number, string>, blank: string): string {
  const occupied = [...tape.entries()]
    .filter((entry) => entry[1] !== blank)
    .map((entry) => entry[0]);

  if (occupied.length === 0) {
    return blank;
  }

  const left = Math.min(...occupied);
  const right = Math.max(...occupied);
  let result = "";
  for (let index = left; index <= right; index += 1) {
    result += tape.get(index) ?? blank;
  }
  return result;
}

function parseJsonObject(source: string, label: string): Record<string, unknown> {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    throw new FormalDefinitionError(`${label} definition is empty.`);
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new FormalDefinitionError(`${label} definition must be a JSON object.`);
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof FormalDefinitionError) {
      throw error;
    }
    throw new FormalDefinitionError(`${label} definition is not valid JSON.`);
  }
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new FormalDefinitionError(`Field '${field}' must be a non-empty string.`);
  }
  return value;
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new FormalDefinitionError(`Field '${field}' must be an array of strings.`);
  }

  const result = value.map((entry) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new FormalDefinitionError(`Field '${field}' must contain only non-empty strings.`);
    }
    return entry;
  });

  return result;
}
