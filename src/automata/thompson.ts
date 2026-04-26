import type { Nfa, NfaTransition, RegexAst, TransitionSymbol } from "./types";

interface Fragment {
  start: number;
  accept: number;
}

export function buildThompsonNfa(ast: RegexAst): Nfa {
  const builder = new ThompsonBuilder();
  return builder.build(ast);
}

class ThompsonBuilder {
  private nextState = 0;
  private readonly transitions: NfaTransition[] = [];

  build(ast: RegexAst): Nfa {
    const fragment = this.emit(ast);
    const alphabet = [...new Set(this.transitions.flatMap((edge) => edge.symbol ?? []))].sort();
    const states = Array.from({ length: this.nextState }, (_, id) => ({
      id,
      label: `q${id}`,
      isStart: id === fragment.start,
      isAccept: id === fragment.accept
    }));

    return {
      states,
      transitions: this.transitions,
      start: fragment.start,
      accept: fragment.accept,
      alphabet
    };
  }

  private emit(ast: RegexAst): Fragment {
    switch (ast.type) {
      case "empty":
        return this.empty();
      case "epsilon":
        return this.epsilon();
      case "literal":
        return this.symbol(ast.value);
      case "charset":
        return this.charSet(ast.chars);
      case "concat":
        return this.concat(ast.terms);
      case "union":
        return this.union(ast.options);
      case "star":
        return this.star(ast.expr);
      case "plus":
        return this.plus(ast.expr);
      case "optional":
        return this.optional(ast.expr);
    }
  }

  private empty(): Fragment {
    return { start: this.state(), accept: this.state() };
  }

  private epsilon(): Fragment {
    const start = this.state();
    const accept = this.state();
    this.edge(start, accept, null);
    return { start, accept };
  }

  private symbol(symbol: string): Fragment {
    const start = this.state();
    const accept = this.state();
    this.edge(start, accept, symbol);
    return { start, accept };
  }

  private charSet(chars: string[]): Fragment {
    const start = this.state();
    const accept = this.state();
    for (const char of chars) {
      this.edge(start, accept, char);
    }
    return { start, accept };
  }

  private concat(terms: RegexAst[]): Fragment {
    const first = this.emit(terms[0]!);
    let current = first;

    for (const term of terms.slice(1)) {
      const next = this.emit(term);
      this.edge(current.accept, next.start, null);
      current = { start: current.start, accept: next.accept };
    }

    return current;
  }

  private union(options: RegexAst[]): Fragment {
    const start = this.state();
    const accept = this.state();

    for (const option of options) {
      const fragment = this.emit(option);
      this.edge(start, fragment.start, null);
      this.edge(fragment.accept, accept, null);
    }

    return { start, accept };
  }

  private star(expr: RegexAst): Fragment {
    const start = this.state();
    const accept = this.state();
    const fragment = this.emit(expr);

    this.edge(start, fragment.start, null);
    this.edge(start, accept, null);
    this.edge(fragment.accept, fragment.start, null);
    this.edge(fragment.accept, accept, null);

    return { start, accept };
  }

  private plus(expr: RegexAst): Fragment {
    const start = this.state();
    const accept = this.state();
    const fragment = this.emit(expr);

    this.edge(start, fragment.start, null);
    this.edge(fragment.accept, fragment.start, null);
    this.edge(fragment.accept, accept, null);

    return { start, accept };
  }

  private optional(expr: RegexAst): Fragment {
    const start = this.state();
    const accept = this.state();
    const fragment = this.emit(expr);

    this.edge(start, fragment.start, null);
    this.edge(start, accept, null);
    this.edge(fragment.accept, accept, null);

    return { start, accept };
  }

  private state(): number {
    const id = this.nextState;
    this.nextState += 1;
    return id;
  }

  private edge(from: number, to: number, symbol: TransitionSymbol): void {
    this.transitions.push({
      id: `e${this.transitions.length}`,
      from,
      to,
      symbol,
      label: symbol ?? "ε"
    });
  }
}
