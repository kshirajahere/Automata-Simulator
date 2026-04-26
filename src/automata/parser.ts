import type { RegexAst, Span } from "./types";

type EscapedToken =
  | { kind: "literal"; value: string }
  | { kind: "charset"; chars: string[] };

interface ClassUnit {
  chars: string[];
  rangeChar: string | null;
}

const DIGIT_CHARS = codePointRange("0", "9");
const LOWERCASE_CHARS = codePointRange("a", "z");
const UPPERCASE_CHARS = codePointRange("A", "Z");
const WORD_CHARS = [...UPPERCASE_CHARS, ...LOWERCASE_CHARS, ...DIGIT_CHARS, "_"];
const WHITESPACE_CHARS = [" ", "\t", "\n", "\r"];

export class RegexSyntaxError extends Error {
  readonly position: number;
  readonly source: string;

  constructor(message: string, source: string, position: number) {
    super(`${message} at position ${position}`);
    this.name = "RegexSyntaxError";
    this.position = position;
    this.source = source;
  }
}

export function parseRegex(source: string): RegexAst {
  const parser = new RegexParser(source);
  return parser.parse();
}

class RegexParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): RegexAst {
    const ast = this.parseUnion();
    if (!this.atEnd()) {
      this.fail(`Unexpected token '${this.peek()}'`);
    }
    return ast;
  }

  private parseUnion(): RegexAst {
    const options: RegexAst[] = [this.parseConcat()];

    while (this.peek() === "|") {
      this.consume();
      options.push(this.parseConcat());
    }

    if (options.length === 1) {
      return options[0]!;
    }

    return {
      type: "union",
      options,
      span: joinSpan(options[0]!.span, options[options.length - 1]!.span)
    };
  }

  private parseConcat(): RegexAst {
    const terms: RegexAst[] = [];
    const start = this.index;

    while (!this.atEnd() && this.peek() !== ")" && this.peek() !== "|") {
      terms.push(this.parsePostfix());
    }

    if (terms.length === 0) {
      return { type: "epsilon", span: { start, end: start } };
    }

    if (terms.length === 1) {
      return terms[0]!;
    }

    return {
      type: "concat",
      terms,
      span: joinSpan(terms[0]!.span, terms[terms.length - 1]!.span)
    };
  }

  private parsePostfix(): RegexAst {
    let expr = this.parseAtom();

    while (this.peek() === "*" || this.peek() === "+" || this.peek() === "?") {
      const operator = this.consume()!;
      const span = joinSpan(expr.span, { start: this.index - 1, end: this.index });

      if (operator === "*") {
        expr = { type: "star", expr, span };
      } else if (operator === "+") {
        expr = { type: "plus", expr, span };
      } else {
        expr = { type: "optional", expr, span };
      }
    }

    return expr;
  }

  private parseAtom(): RegexAst {
    const start = this.index;
    const ch = this.peek();

    if (ch === undefined) {
      this.fail("Expected an atom");
    }

    if (ch === "(") {
      this.consume();
      const expr = this.parseUnion();
      if (this.peek() !== ")") {
        this.fail("Expected ')'");
      }
      this.consume();
      return withSpan(expr, { start, end: this.index });
    }

    if (ch === "[") {
      return this.parseCharSet();
    }

    if (ch === "\\") {
      const token = this.parseEscapeToken();
      if (token.kind === "literal") {
        return { type: "literal", value: token.value, span: { start, end: this.index } };
      }
      return {
        type: "charset",
        chars: sortChars(token.chars),
        span: { start, end: this.index }
      };
    }

    if (ch === "ε") {
      this.consume();
      return { type: "epsilon", span: { start, end: this.index } };
    }

    if (ch === "∅") {
      this.consume();
      return { type: "empty", span: { start, end: this.index } };
    }

    if (")|*+?".includes(ch)) {
      this.fail(`Unexpected operator '${ch}'`);
    }

    this.consume();
    return { type: "literal", value: ch, span: { start, end: this.index } };
  }

  private parseCharSet(): RegexAst {
    const start = this.index;
    this.expect("[");

    if (this.peek() === "^") {
      this.fail("Negated character classes are intentionally unsupported");
    }

    const chars = new Set<string>();

    while (!this.atEnd() && this.peek() !== "]") {
      const rangeStart = this.parseClassUnit();

      if (this.peek() === "-" && this.source[this.index + 1] !== "]") {
        if (rangeStart.rangeChar === null) {
          this.fail("Shorthand classes cannot be used as range endpoints inside character classes");
        }
        this.consume();
        const rangeEnd = this.parseClassUnit();
        if (rangeEnd.rangeChar === null) {
          this.fail("Shorthand classes cannot be used as range endpoints inside character classes");
        }
        addRange(chars, rangeStart.rangeChar, rangeEnd.rangeChar, this.source, this.index);
      } else {
        for (const char of rangeStart.chars) {
          chars.add(char);
        }
      }
    }

    if (this.peek() !== "]") {
      this.fail("Expected ']'");
    }
    this.consume();

    const sorted = [...chars].sort((a, b) => a.localeCompare(b));
    if (sorted.length === 0) {
      this.fail("Character class cannot be empty", start);
    }

    return { type: "charset", chars: sorted, span: { start, end: this.index } };
  }

  private parseClassUnit(): ClassUnit {
    if (this.atEnd()) {
      this.fail("Unexpected end inside character class");
    }

    if (this.peek() === "\\") {
      const token = this.parseEscapeToken();
      if (token.kind === "literal") {
        return { chars: [token.value], rangeChar: token.value };
      }
      return { chars: token.chars, rangeChar: null };
    }

    const ch = this.consume();
    if (ch === undefined || ch === "]") {
      this.fail("Expected character inside class");
    }
    return { chars: [ch], rangeChar: ch };
  }

  private parseEscapeToken(): EscapedToken {
    const start = this.index;
    this.expect("\\");
    const escaped = this.consume();

    if (escaped === undefined) {
      this.fail("Dangling escape", start);
    }

    switch (escaped) {
      case "n":
        return { kind: "literal", value: "\n" };
      case "r":
        return { kind: "literal", value: "\r" };
      case "t":
        return { kind: "literal", value: "\t" };
      case "d":
        return { kind: "charset", chars: DIGIT_CHARS };
      case "w":
        return { kind: "charset", chars: WORD_CHARS };
      case "s":
        return { kind: "charset", chars: WHITESPACE_CHARS };
      case "D":
      case "W":
      case "S":
        this.fail(`Negated shorthand class '\\${escaped}' is intentionally unsupported`, start);
      default:
        if (isAsciiLetter(escaped)) {
          this.fail(`Unsupported escape '\\${escaped}'`, start);
        }
        return { kind: "literal", value: escaped };
    }
  }

  private expect(expected: string): void {
    if (this.peek() !== expected) {
      this.fail(`Expected '${expected}'`);
    }
    this.consume();
  }

  private consume(): string | undefined {
    const ch = this.source[this.index];
    if (ch !== undefined) {
      this.index += 1;
    }
    return ch;
  }

  private peek(): string | undefined {
    return this.source[this.index];
  }

  private atEnd(): boolean {
    return this.index >= this.source.length;
  }

  private fail(message: string, position = this.index): never {
    throw new RegexSyntaxError(message, this.source, position);
  }
}

function addRange(
  chars: Set<string>,
  start: string,
  end: string,
  source: string,
  position: number
): void {
  const first = start.codePointAt(0);
  const last = end.codePointAt(0);

  if (first === undefined || last === undefined || first > last) {
    throw new RegexSyntaxError(`Invalid range '${start}-${end}'`, source, position);
  }

  for (let code = first; code <= last; code += 1) {
    chars.add(String.fromCodePoint(code));
  }
}

function joinSpan(left: Span, right: Span): Span {
  return { start: left.start, end: right.end };
}

function withSpan(ast: RegexAst, span: Span): RegexAst {
  return { ...ast, span } as RegexAst;
}

function sortChars(chars: string[]): string[] {
  return [...chars].sort((a, b) => a.localeCompare(b));
}

function codePointRange(start: string, end: string): string[] {
  const first = start.codePointAt(0);
  const last = end.codePointAt(0);

  if (first === undefined || last === undefined || first > last) {
    return [];
  }

  const chars: string[] = [];
  for (let code = first; code <= last; code += 1) {
    chars.push(String.fromCodePoint(code));
  }
  return chars;
}

function isAsciiLetter(value: string): boolean {
  return /^[A-Za-z]$/.test(value);
}
