import type {
  PdaDefinition,
  PdaSimulationResult,
  PdaTraceStep,
  PdaTransition
} from "./formalTypes";
import { FormalDefinitionError } from "./formalTypes";

interface PdaQueueItem {
  state: string;
  index: number;
  stack: string[];
  steps: PdaTraceStep[];
}

const MAX_PDA_STEPS = 160;
const MAX_PDA_CONFIGURATIONS = 6000;

export function simulatePda(definitionSource: string, input: string): PdaSimulationResult {
  const machine = parsePdaDefinition(definitionSource);
  const tokens = tokenizeInput(input);
  const queue: PdaQueueItem[] = [
    {
      state: machine.startState,
      index: 0,
      stack: [machine.stackStart],
      steps: []
    }
  ];
  const visited = new Set<string>([configurationKey(machine.startState, 0, [machine.stackStart])]);
  let exploredConfigurations = 0;
  let best = queue[0]!;

  while (queue.length > 0 && exploredConfigurations < MAX_PDA_CONFIGURATIONS) {
    const current = queue.shift()!;
    exploredConfigurations += 1;

    if (isAccepted(machine, current, tokens.length)) {
      return buildAcceptedResult(machine, input, tokens, current, exploredConfigurations);
    }

    if (isBetterProgress(current, best)) {
      best = current;
    }

    if (current.steps.length >= MAX_PDA_STEPS) {
      continue;
    }

    const stackTop = current.stack.at(-1);
    if (stackTop === undefined) {
      continue;
    }

    const nextToken = tokens[current.index] ?? null;
    const transitions = machine.transitions.filter((transition) => {
      if (transition.from !== current.state || transition.stackTop !== stackTop) {
        return false;
      }

      return transition.input === null || transition.input === nextToken;
    });

    for (const transition of transitions) {
      const nextStack = applyStackTransition(current.stack, transition.push);
      const consumedInput = transition.input;
      const nextIndex = current.index + (consumedInput === null ? 0 : 1);
      const nextSteps = [
        ...current.steps,
        {
          step: current.steps.length + 1,
          fromState: current.state,
          toState: transition.to,
          consumedInput,
          remainingInput: tokens.slice(nextIndex),
          stackBefore: [...current.stack],
          stackAfter: [...nextStack],
          transitionId: transition.id
        }
      ];
      const key = configurationKey(transition.to, nextIndex, nextStack);
      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      queue.push({
        state: transition.to,
        index: nextIndex,
        stack: nextStack,
        steps: nextSteps
      });
    }
  }

  return {
    machine,
    input,
    tokens,
    accepted: false,
    finalState: best.state,
    finalStack: [...best.stack],
    consumed: best.index,
    steps: best.steps,
    exploredConfigurations,
    notes: [
      tokens.length === 0
        ? "Input was treated as epsilon."
        : input.trim().includes(" ")
          ? "Input was tokenized by whitespace."
          : "Input was tokenized as single characters.",
      "Simulation uses breadth-first search across PDA configurations.",
      queue.length > 0 || exploredConfigurations >= MAX_PDA_CONFIGURATIONS
        ? "The search hit an interactive limit before finding an accepting branch."
        : "No accepting branch was found."
    ],
    reason:
      queue.length > 0 || exploredConfigurations >= MAX_PDA_CONFIGURATIONS
        ? "Search limit reached before acceptance."
        : "Machine halted without reaching an accepting configuration."
  };
}

export function parsePdaDefinition(source: string): PdaDefinition {
  const parsed = parseJsonObject(source, "PDA");
  const states = readStringArray(parsed.states, "states");
  const startState = readString(parsed.startState, "startState");
  const acceptStates = readStringArray(parsed.acceptStates ?? [], "acceptStates");
  const stackStart = readString(parsed.stackStart, "stackStart");
  const acceptMode = parsed.acceptMode;
  const rawTransitions = parsed.transitions;

  if (states.length === 0) {
    throw new FormalDefinitionError("PDA must declare at least one state.");
  }

  if (!states.includes(startState)) {
    throw new FormalDefinitionError(`PDA startState '${startState}' is not listed in states.`);
  }

  for (const state of acceptStates) {
    if (!states.includes(state)) {
      throw new FormalDefinitionError(`PDA accept state '${state}' is not listed in states.`);
    }
  }

  if (acceptMode !== "final-state" && acceptMode !== "empty-stack") {
    throw new FormalDefinitionError("PDA acceptMode must be 'final-state' or 'empty-stack'.");
  }

  if (!Array.isArray(rawTransitions) || rawTransitions.length === 0) {
    throw new FormalDefinitionError("PDA must include a non-empty transitions array.");
  }

  const transitions = rawTransitions.map((transition, index) =>
    parsePdaTransition(transition, index, states)
  );

  return {
    source,
    states,
    startState,
    acceptStates,
    stackStart,
    acceptMode,
    transitions
  };
}

function parsePdaTransition(value: unknown, index: number, states: string[]): PdaTransition {
  if (typeof value !== "object" || value === null) {
    throw new FormalDefinitionError(`PDA transition ${index + 1} must be an object.`);
  }

  const record = value as Record<string, unknown>;
  const from = readString(record.from, `transitions[${index}].from`);
  const to = readString(record.to, `transitions[${index}].to`);
  const stackTop = readString(record.stackTop, `transitions[${index}].stackTop`);
  const input = readNullableString(record.input, `transitions[${index}].input`);
  const push = readStringArray(record.push, `transitions[${index}].push`);

  if (!states.includes(from)) {
    throw new FormalDefinitionError(`PDA transition ${index + 1} references unknown state '${from}'.`);
  }

  if (!states.includes(to)) {
    throw new FormalDefinitionError(`PDA transition ${index + 1} references unknown state '${to}'.`);
  }

  return {
    id: `δ${index + 1}`,
    from,
    input,
    stackTop,
    to,
    push
  };
}

function buildAcceptedResult(
  machine: PdaDefinition,
  input: string,
  tokens: string[],
  configuration: PdaQueueItem,
  exploredConfigurations: number
): PdaSimulationResult {
  return {
    machine,
    input,
    tokens,
    accepted: true,
    finalState: configuration.state,
    finalStack: [...configuration.stack],
    consumed: configuration.index,
    steps: configuration.steps,
    exploredConfigurations,
    notes: [
      tokens.length === 0
        ? "Input was treated as epsilon."
        : input.trim().includes(" ")
          ? "Input was tokenized by whitespace."
          : "Input was tokenized as single characters.",
      "Simulation uses breadth-first search across PDA configurations.",
      `Accepted by ${machine.acceptMode === "final-state" ? "final state" : "empty stack"}.`
    ],
    reason:
      machine.acceptMode === "final-state"
        ? "Machine consumed the input and reached an accepting state."
        : "Machine consumed the input and emptied the stack."
  };
}

function isAccepted(machine: PdaDefinition, configuration: PdaQueueItem, inputLength: number): boolean {
  if (configuration.index !== inputLength) {
    return false;
  }

  if (machine.acceptMode === "final-state") {
    return machine.acceptStates.includes(configuration.state);
  }

  return configuration.stack.length === 0;
}

function applyStackTransition(stack: string[], push: string[]): string[] {
  const next = stack.slice(0, -1);
  for (let index = push.length - 1; index >= 0; index -= 1) {
    const symbol = push[index];
    if (symbol !== undefined) {
      next.push(symbol);
    }
  }
  return next;
}

function configurationKey(state: string, index: number, stack: string[]): string {
  return `${state}\0${index}\0${stack.join("\u0001")}`;
}

function isBetterProgress(candidate: PdaQueueItem, currentBest: PdaQueueItem): boolean {
  if (candidate.index !== currentBest.index) {
    return candidate.index > currentBest.index;
  }

  if (candidate.steps.length !== currentBest.steps.length) {
    return candidate.steps.length > currentBest.steps.length;
  }

  return candidate.stack.length < currentBest.stack.length;
}

function tokenizeInput(input: string): string[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (/\s/.test(trimmed)) {
    return trimmed.split(/\s+/);
  }

  return Array.from(trimmed);
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

function readNullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  throw new FormalDefinitionError(`Field '${field}' must be a string or null.`);
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
