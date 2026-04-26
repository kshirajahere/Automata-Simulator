import type {
  CfgDerivationStep,
  CfgGrammar,
  CfgParseResult,
  CfgParseTreeNode,
  CfgProduction,
  CfgSymbol
} from "./formalTypes";
import { FormalDefinitionError } from "./formalTypes";

interface RawProduction {
  head: string;
  bodies: string[][];
}

interface SequenceParseResult {
  nextIndex: number;
  children: CfgParseTreeNode[];
}

interface NonterminalParseResult {
  nextIndex: number;
  node: CfgParseTreeNode;
}

const EPSILON_TOKENS = new Set(["ε", "epsilon", "<epsilon>"]);
const NONTERMINAL_PATTERN = /^[A-Z][A-Za-z0-9_]*$/;
const MAX_RESULT_COUNT = 4;

export function parseCfg(definition: string, input: string): CfgParseResult {
  const grammar = parseGrammar(definition);
  const tokens = tokenizeInput(input);
  const leftRecursive = findLeftRecursiveSymbols(grammar);

  if (leftRecursive.length > 0) {
    throw new FormalDefinitionError(
      `Left recursion is not supported in the interactive CFG lab. Rewrite: ${leftRecursive.join(", ")}.`
    );
  }

  const productionsByHead = new Map<string, CfgProduction[]>();
  const productionTextById = new Map<string, string>();
  for (const production of grammar.productions) {
    const list = productionsByHead.get(production.head) ?? [];
    list.push(production);
    productionsByHead.set(production.head, list);
    productionTextById.set(production.id, `${production.head} -> ${production.printable}`);
  }

  const memo = new Map<string, NonterminalParseResult[]>();
  const active = new Set<string>();
  let nodeCounter = 0;
  let truncated = false;

  function nextNodeId(): string {
    nodeCounter += 1;
    return `cfg-node-${nodeCounter}`;
  }

  function parseNonterminal(symbol: string, position: number): NonterminalParseResult[] {
    const key = `${symbol}@${position}`;
    const cached = memo.get(key);
    if (cached !== undefined) {
      return cached;
    }

    if (active.has(key)) {
      return [];
    }

    active.add(key);
    const results: NonterminalParseResult[] = [];
    const productions = productionsByHead.get(symbol) ?? [];

    for (const production of productions) {
      const sequenceResults = parseSequence(production.body, position);
      for (const sequenceResult of sequenceResults) {
        const epsilonChild: CfgParseTreeNode = {
          id: nextNodeId(),
          symbol: "ε",
          kind: "epsilon",
          children: []
        };
        const children = production.body.length === 0 ? [epsilonChild] : sequenceResult.children;

        results.push({
          nextIndex: sequenceResult.nextIndex,
          node: {
            id: nextNodeId(),
            symbol,
            kind: "nonterminal",
            children,
            productionId: production.id
          }
        });

        if (results.length >= MAX_RESULT_COUNT) {
          truncated = true;
          break;
        }
      }

      if (results.length >= MAX_RESULT_COUNT) {
        break;
      }
    }

    active.delete(key);
    memo.set(key, results);
    return results;
  }

  function parseSequence(body: CfgSymbol[], position: number): SequenceParseResult[] {
    if (body.length === 0) {
      return [{ nextIndex: position, children: [] }];
    }

    const first = body[0]!;
    const rest = body.slice(1);
    const headResults = parseSymbol(first, position);
    const combined: SequenceParseResult[] = [];

    for (const headResult of headResults) {
      const tailResults = parseSequence(rest, headResult.nextIndex);
      for (const tailResult of tailResults) {
        combined.push({
          nextIndex: tailResult.nextIndex,
          children: [headResult.node, ...tailResult.children]
        });

        if (combined.length >= MAX_RESULT_COUNT) {
          truncated = true;
          return combined;
        }
      }
    }

    return combined;
  }

  function parseSymbol(symbol: CfgSymbol, position: number): NonterminalParseResult[] {
    if (symbol.kind === "terminal") {
      const token = tokens[position];
      if (token !== symbol.value) {
        return [];
      }

      return [
        {
          nextIndex: position + 1,
          node: {
            id: nextNodeId(),
            symbol: symbol.value,
            kind: "terminal",
            children: []
          }
        }
      ];
    }

    return parseNonterminal(symbol.value, position);
  }

  const acceptedTrees = parseNonterminal(grammar.startSymbol, 0).filter(
    (result) => result.nextIndex === tokens.length
  );
  const tree = acceptedTrees[0]?.node ?? null;
  const accepted = tree !== null;
  const notes = [
    tokens.length === 0
      ? "Input was treated as epsilon."
      : input.trim().includes(" ")
        ? "Input was tokenized by whitespace."
        : "Input was tokenized as single characters.",
    accepted
      ? "A parse tree was constructed by bounded top-down search."
      : "No derivation matched the full input.",
    truncated ? "Search results were capped to keep the parse tree explorer responsive." : ""
  ].filter((note) => note.length > 0);

  return {
    grammar,
    input,
    tokens,
    accepted,
    ambiguous: acceptedTrees.length > 1,
    parseCount: acceptedTrees.length,
    tree,
    derivation: tree === null ? [] : buildDerivation(tree, productionTextById, "leftmost"),
    leftmostDerivation: tree === null ? [] : buildDerivation(tree, productionTextById, "leftmost"),
    rightmostDerivation: tree === null ? [] : buildDerivation(tree, productionTextById, "rightmost"),
    notes
  };
}

function parseGrammar(source: string): CfgGrammar {
  const trimmed = source.trim();
  if (trimmed.length === 0) {
    throw new FormalDefinitionError("CFG definition is empty.");
  }

  let startSymbol: string | null = null;
  const rawProductions: RawProduction[] = [];

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const startMatch = line.match(/^start\s*:\s*([A-Z][A-Za-z0-9_]*)$/i);
    if (startMatch?.[1] !== undefined) {
      startSymbol = startMatch[1];
      continue;
    }

    const parts = line.split("->");
    if (parts.length !== 2) {
      throw new FormalDefinitionError(`Invalid CFG line: '${line}'. Expected 'A -> ...'.`);
    }

    const head = parts[0]?.trim() ?? "";
    if (!NONTERMINAL_PATTERN.test(head)) {
      throw new FormalDefinitionError(`Invalid nonterminal '${head}'. Use names like S, Expr, or Term.`);
    }

    const rightHandSide = parts[1]?.trim() ?? "";
    if (rightHandSide.length === 0) {
      throw new FormalDefinitionError(`Production '${head} ->' has an empty right-hand side.`);
    }

    const bodies = rightHandSide.split("|").map((segment) => tokenizeBody(segment.trim()));
    rawProductions.push({ head, bodies });
  }

  if (rawProductions.length === 0) {
    throw new FormalDefinitionError("CFG definition did not contain any productions.");
  }

  const nonterminalSet = new Set(rawProductions.map((production) => production.head));
  const start = startSymbol ?? rawProductions[0]?.head ?? null;
  if (start === null || !nonterminalSet.has(start)) {
    throw new FormalDefinitionError(`Start symbol '${start ?? ""}' is not defined by any production.`);
  }

  const productions: CfgProduction[] = [];
  const terminalSet = new Set<string>();
  let counter = 0;

  for (const rawProduction of rawProductions) {
    for (const bodyTokens of rawProduction.bodies) {
      const body: CfgSymbol[] = [];

      for (const token of bodyTokens) {
        if (EPSILON_TOKENS.has(token)) {
          continue;
        }

        const normalized = unquoteToken(token);
        if (nonterminalSet.has(normalized)) {
          body.push({ kind: "nonterminal", value: normalized });
          continue;
        }

        terminalSet.add(normalized);
        body.push({ kind: "terminal", value: normalized });
      }

      counter += 1;
      productions.push({
        id: `p${counter}`,
        head: rawProduction.head,
        body,
        printable: body.length === 0 ? "ε" : body.map((symbol) => symbol.value).join(" ")
      });
    }
  }

  return {
    source,
    startSymbol: start,
    nonterminals: [...nonterminalSet],
    terminals: [...terminalSet],
    productions
  };
}

function tokenizeBody(source: string): string[] {
  if (source.length === 0) {
    return ["ε"];
  }

  const matches = source.match(/"[^"]*"|'[^']*'|\S+/g);
  return matches ?? [];
}

function unquoteToken(token: string): string {
  if (
    (token.startsWith("'") && token.endsWith("'")) ||
    (token.startsWith("\"") && token.endsWith("\""))
  ) {
    return token.slice(1, -1);
  }

  return token;
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

function buildDerivation(
  tree: CfgParseTreeNode,
  productionTextById: Map<string, string>,
  mode: "leftmost" | "rightmost"
): CfgDerivationStep[] {
  const steps: CfgDerivationStep[] = [
    {
      step: 0,
      sententialForm: [tree.symbol],
      expandedSymbol: null,
      production: null
    }
  ];
  const frontier = [{ id: tree.id, symbol: tree.symbol, node: tree }];

  function expand(node: CfgParseTreeNode): void {
    if (node.kind !== "nonterminal") {
      return;
    }

    const position = frontier.findIndex((entry) => entry.id === node.id);
    if (position === -1) {
      return;
    }

    const replacement =
      node.children.length === 1 && node.children[0]?.kind === "epsilon"
        ? [{ id: `${node.id}:epsilon`, symbol: "ε", node: node.children[0] }]
        : node.children.map((child) => ({ id: child.id, symbol: child.symbol, node: child }));

    frontier.splice(position, 1, ...replacement);
    steps.push({
      step: steps.length,
      sententialForm: frontier.map((entry) => entry.symbol),
      expandedSymbol: node.symbol,
      production: productionTextById.get(node.productionId ?? "") ?? null
    });

    const traversalChildren = mode === "leftmost" ? node.children : [...node.children].reverse();
    for (const child of traversalChildren) {
      expand(child);
    }
  }

  expand(tree);
  return steps;
}

function findLeftRecursiveSymbols(grammar: CfgGrammar): string[] {
  const nullable = computeNullableNonterminals(grammar);
  const graph = new Map<string, Set<string>>();

  for (const symbol of grammar.nonterminals) {
    graph.set(symbol, new Set<string>());
  }

  for (const production of grammar.productions) {
    const targets = graph.get(production.head);
    if (targets === undefined) {
      continue;
    }

    for (const symbol of production.body) {
      if (symbol.kind === "terminal") {
        break;
      }

      targets.add(symbol.value);
      if (!nullable.has(symbol.value)) {
        break;
      }
    }
  }

  const leftRecursive = new Set<string>();

  for (const start of grammar.nonterminals) {
    const stack = [...(graph.get(start) ?? [])];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === start) {
        leftRecursive.add(start);
        break;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      for (const next of graph.get(current) ?? []) {
        stack.push(next);
      }
    }
  }

  return [...leftRecursive];
}

function computeNullableNonterminals(grammar: CfgGrammar): Set<string> {
  const nullable = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const production of grammar.productions) {
      if (
        production.body.length === 0 ||
        production.body.every((symbol) => symbol.kind === "nonterminal" && nullable.has(symbol.value))
      ) {
        if (!nullable.has(production.head)) {
          nullable.add(production.head);
          changed = true;
        }
      }
    }
  }

  return nullable;
}
