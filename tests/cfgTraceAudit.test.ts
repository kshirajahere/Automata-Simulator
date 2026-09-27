import { describe, expect, it } from "vitest";
import { parseCfg } from "../src/automata/cfg";
import { cfgExamples } from "../src/automata/formalExamples";
import type { CfgParseTreeNode } from "../src/automata/formalTypes";

type FrontierEntry = { id: string; symbol: string; node: CfgParseTreeNode };

function replayDerivation(tree: CfgParseTreeNode, mode: "leftmost" | "rightmost"): string[][] {
  const frontier: FrontierEntry[] = [{ id: tree.id, symbol: tree.symbol, node: tree }];
  const forms = [frontier.map((entry) => entry.symbol)];

  while (frontier.some((entry) => entry.node.kind === "nonterminal")) {
    const candidates = frontier
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.node.kind === "nonterminal");
    const selected = mode === "leftmost" ? candidates[0] : candidates.at(-1);
    if (selected === undefined) {
      throw new Error("Expected a nonterminal in the derivation frontier.");
    }

    const { node } = selected.entry;
    const replacement =
      node.children.length === 1 && node.children[0]?.kind === "epsilon"
        ? [{ id: `${node.id}:epsilon`, symbol: "ε", node: node.children[0] }]
        : node.children.map((child) => ({ id: child.id, symbol: child.symbol, node: child }));
    frontier.splice(selected.index, 1, ...replacement);
    forms.push(frontier.map((entry) => entry.symbol));
  }

  return forms;
}

function terminalYield(node: CfgParseTreeNode): string[] {
  if (node.kind === "epsilon") return [];
  if (node.kind === "terminal") return [node.symbol];
  return node.children.flatMap(terminalYield);
}

describe("CFG derivation audit", () => {
  it("replays returned leftmost and rightmost derivations from the parse tree", () => {
    const example = cfgExamples.find((candidate) => candidate.id === "cfg-balanced-parens");
    if (example === undefined) throw new Error("Missing balanced-parentheses CFG example.");

    const result = parseCfg(example.definition, example.input);
    expect(result.accepted).toBe(true);
    if (result.tree === null) throw new Error("Expected an accepted parse tree.");

    expect(terminalYield(result.tree)).toEqual(result.tokens);
    expect(result.leftmostDerivation.map((step) => step.sententialForm)).toEqual(
      replayDerivation(result.tree, "leftmost")
    );
    expect(result.rightmostDerivation.map((step) => step.sententialForm)).toEqual(
      replayDerivation(result.tree, "rightmost")
    );
  });
});
