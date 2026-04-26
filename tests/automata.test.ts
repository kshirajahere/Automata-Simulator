import { parseCfg } from "../src/automata/cfg";
import { FormalDefinitionError } from "../src/automata/formalTypes";
import { describe, expect, it } from "vitest";
import { compareRegexes, convertRegex, simulateRegex, simulateRegexBatch } from "../src/automata/pipeline";
import { RegexSyntaxError, parseRegex } from "../src/automata/parser";
import { simulatePda } from "../src/automata/pda";
import { simulateDfa } from "../src/automata/simulate";
import { simulateTuringMachine } from "../src/automata/turing";

describe("regex parser", () => {
  it("keeps union lower precedence than concatenation", () => {
    const ast = parseRegex("ab|c");

    expect(ast.type).toBe("union");
    if (ast.type !== "union") {
      return;
    }
    expect(ast.options[0]?.type).toBe("concat");
    expect(ast.options[1]?.type).toBe("literal");
  });

  it("supports escaped operators and character ranges", () => {
    const ast = parseRegex("(\\+|-)?[0-9]+");
    expect(ast.type).toBe("concat");
  });

  it("supports shorthand classes and rejects unsupported escapes", () => {
    expect(simulateRegex("\\d+", "1209").accepted).toBe(true);
    expect(simulateRegex("\\w+", "A_4").accepted).toBe(true);
    expect(simulateRegex("\\s+", "\t ").accepted).toBe(true);
    expect(simulateRegex("\\d+", "ddd").accepted).toBe(false);
    expect(() => parseRegex("\\q")).toThrow(RegexSyntaxError);
  });

  it("reports syntax positions for invalid input", () => {
    expect(() => parseRegex("*ab")).toThrow(RegexSyntaxError);
  });
});

describe("conversion pipeline", () => {
  it("builds a subset-construction trace with move and closure sets", () => {
    const result = convertRegex("(a|b)*abb");

    expect(result.nfa.states.length).toBeGreaterThan(0);
    expect(result.dfa.states.length).toBeGreaterThan(0);
    expect(result.subsetConstruction.startClosure.length).toBeGreaterThan(0);
    expect(result.subsetConstruction.steps[0]).toMatchObject({
      sourceStateId: "D0",
      symbol: "a"
    });
  });

  it("accepts and rejects using the completed DFA", () => {
    expect(simulateRegex("(a|b)*abb", "aaabb").accepted).toBe(true);
    expect(simulateRegex("(a|b)*abb", "aabab").accepted).toBe(false);
  });

  it("handles lexer-style regexes with character classes", () => {
    expect(simulateRegex("[a-zA-Z]([a-zA-Z]|[0-9])*", "x42").accepted).toBe(true);
    expect(simulateRegex("[a-zA-Z]([a-zA-Z]|[0-9])*", "4x").accepted).toBe(false);
  });

  it("minimizes while preserving sample behavior", () => {
    const result = convertRegex("(a|b)*abb");
    const samples = ["abb", "aabb", "babb", "abba", "", "ab"];

    expect(result.minimizedDfa.states.length).toBeLessThanOrEqual(result.dfa.states.length);
    for (const sample of samples) {
      expect(simulateDfa(result.minimizedDfa, sample).accepted).toBe(
        simulateDfa(result.dfa, sample).accepted
      );
    }
  });

  it("returns shortest language witnesses and bounded examples", () => {
    const result = convertRegex("(a|b)*abb");

    expect(result.insights.shortestAccepted?.value).toBe("abb");
    expect(result.insights.shortestRejected?.value).toBe("");
    expect(result.insights.acceptedExamples.length).toBeGreaterThan(0);
    expect(result.insights.rejectedExamples.length).toBeGreaterThan(0);
  });

  it("proves equivalence and emits counterexamples when not equivalent", () => {
    const equivalent = compareRegexes("(a|b)*abb", "(a|b)*abb");
    expect(equivalent.equivalent).toBe(true);
    expect(equivalent.witness).toBeNull();

    const different = compareRegexes("a*", "a+");
    expect(different.equivalent).toBe(false);
    expect(different.witness?.value).toBe("");
    expect(different.leftAcceptsWitness).toBe(true);
    expect(different.rightAcceptsWitness).toBe(false);
  });

  it("runs batch simulation with aggregate metrics", () => {
    const batch = simulateRegexBatch("(a|b)*abb", ["abb", "aabb", "abba", ""]);

    expect(batch.summary.total).toBe(4);
    expect(batch.summary.accepted).toBe(2);
    expect(batch.summary.rejected).toBe(2);
    expect(batch.summary.acceptanceRate).toBeCloseTo(0.5);
    expect(batch.cases[0]?.accepted).toBe(true);
    expect(batch.cases[2]?.accepted).toBe(false);
  });
});

describe("cfg lab", () => {
  it("builds a parse tree and derivation for a balanced-parentheses grammar", () => {
    const result = parseCfg(
      `start: S
S -> ( S ) S | ε`,
      "(()())"
    );

    expect(result.accepted).toBe(true);
    expect(result.tree?.symbol).toBe("S");
    expect(result.derivation.length).toBeGreaterThan(1);
  });

  it("supports whitespace-token grammars", () => {
    const result = parseCfg(
      `start: E
E -> T E1
E1 -> + T E1 | ε
T -> F T1
T1 -> * F T1 | ε
F -> id | ( E )`,
      "id + id * id"
    );

    expect(result.accepted).toBe(true);
    expect(result.tokens).toEqual(["id", "+", "id", "*", "id"]);
    expect(result.leftmostDerivation.length).toBeGreaterThan(1);
    expect(result.rightmostDerivation.length).toBeGreaterThan(1);
    expect(result.leftmostDerivation[1]?.sententialForm.join(" ")).toBe("T E1");
    expect(result.rightmostDerivation[2]?.sententialForm.join(" ")).not.toBe(
      result.leftmostDerivation[2]?.sententialForm.join(" ")
    );
  });

  it("rejects left-recursive grammars", () => {
    expect(() =>
      parseCfg(
        `start: S
S -> S a | a`,
        "aa"
      )
    ).toThrow(FormalDefinitionError);
  });
});

describe("pda lab", () => {
  it("accepts a^n b^n with a stack trace", () => {
    const result = simulatePda(
      `{
  "states": ["push", "pop", "accept"],
  "startState": "push",
  "acceptStates": ["accept"],
  "stackStart": "Z",
  "acceptMode": "final-state",
  "transitions": [
    { "from": "push", "input": "a", "stackTop": "Z", "to": "push", "push": ["A", "Z"] },
    { "from": "push", "input": "a", "stackTop": "A", "to": "push", "push": ["A", "A"] },
    { "from": "push", "input": "b", "stackTop": "A", "to": "pop", "push": [] },
    { "from": "pop", "input": "b", "stackTop": "A", "to": "pop", "push": [] },
    { "from": "pop", "input": null, "stackTop": "Z", "to": "accept", "push": ["Z"] }
  ]
}`,
      "aaabbb"
    );

    expect(result.accepted).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.finalState).toBe("accept");
  });

  it("rejects mismatched parentheses", () => {
    const result = simulatePda(
      `{
  "states": ["scan", "accept"],
  "startState": "scan",
  "acceptStates": ["accept"],
  "stackStart": "Z",
  "acceptMode": "final-state",
  "transitions": [
    { "from": "scan", "input": "(", "stackTop": "Z", "to": "scan", "push": ["(", "Z"] },
    { "from": "scan", "input": "(", "stackTop": "(", "to": "scan", "push": ["(", "("] },
    { "from": "scan", "input": ")", "stackTop": "(", "to": "scan", "push": [] },
    { "from": "scan", "input": null, "stackTop": "Z", "to": "accept", "push": ["Z"] }
  ]
}`,
      "(()"
    );

    expect(result.accepted).toBe(false);
  });
});

describe("turing machine lab", () => {
  it("increments a binary number", () => {
    const result = simulateTuringMachine(
      `{
  "states": ["scan", "carry", "accept"],
  "startState": "scan",
  "acceptStates": ["accept"],
  "rejectStates": [],
  "blank": "_",
  "transitions": [
    { "from": "scan", "read": "0", "to": "scan", "write": "0", "move": "R" },
    { "from": "scan", "read": "1", "to": "scan", "write": "1", "move": "R" },
    { "from": "scan", "read": "_", "to": "carry", "write": "_", "move": "L" },
    { "from": "carry", "read": "1", "to": "carry", "write": "0", "move": "L" },
    { "from": "carry", "read": "0", "to": "accept", "write": "1", "move": "S" },
    { "from": "carry", "read": "_", "to": "accept", "write": "1", "move": "S" }
  ]
}`,
      "1011"
    );

    expect(result.accepted).toBe(true);
    expect(result.tape).toBe("1100");
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("can halt in a reject state", () => {
    const result = simulateTuringMachine(
      `{
  "states": ["even", "odd", "accept", "reject"],
  "startState": "even",
  "acceptStates": ["accept"],
  "rejectStates": ["reject"],
  "blank": "_",
  "transitions": [
    { "from": "even", "read": "0", "to": "even", "write": "0", "move": "R" },
    { "from": "even", "read": "1", "to": "odd", "write": "1", "move": "R" },
    { "from": "odd", "read": "0", "to": "odd", "write": "0", "move": "R" },
    { "from": "odd", "read": "1", "to": "even", "write": "1", "move": "R" },
    { "from": "even", "read": "_", "to": "accept", "write": "_", "move": "S" },
    { "from": "odd", "read": "_", "to": "reject", "write": "_", "move": "S" }
  ]
}`,
      "1010"
    );

    expect(result.accepted).toBe(true);

    const oddParity = simulateTuringMachine(
      `{
  "states": ["even", "odd", "accept", "reject"],
  "startState": "even",
  "acceptStates": ["accept"],
  "rejectStates": ["reject"],
  "blank": "_",
  "transitions": [
    { "from": "even", "read": "0", "to": "even", "write": "0", "move": "R" },
    { "from": "even", "read": "1", "to": "odd", "write": "1", "move": "R" },
    { "from": "odd", "read": "0", "to": "odd", "write": "0", "move": "R" },
    { "from": "odd", "read": "1", "to": "even", "write": "1", "move": "R" },
    { "from": "even", "read": "_", "to": "accept", "write": "_", "move": "S" },
    { "from": "odd", "read": "_", "to": "reject", "write": "_", "move": "S" }
  ]
}`,
      "1011"
    );

    expect(oddParity.accepted).toBe(false);
    expect(oddParity.finalState).toBe("reject");
  });
});
