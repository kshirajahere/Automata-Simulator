/**
 * Reproducible evaluation on AutomataTutor/automatatutor-data,
 * regular-expression/regular-expression.csv, commit 4ce8bcb442428cd9d3642f2741bc64ff4c8efbcd.
 * Usage: npx tsx scripts/publicCorpusBenchmark.ts /path/to/regular-expression.csv
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { compareRegexes, convertRegex } from "../src/automata/pipeline.js";
import { compareDfaLanguages } from "../src/automata/analysis.js";
import { simulateDfa } from "../src/automata/simulate.js";

interface Row {
  shortdescription: string;
  regex: string;
  attemptregex: string;
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const path = process.argv[2];
if (!path) throw new Error("Expected path to the public CSV corpus");
const csv = csvRows(readFileSync(path, "utf8"));
const headers = csv.shift();
if (JSON.stringify(headers) !== JSON.stringify(["shortdescription", "regex", "attemptregex"])) {
  throw new Error("Unexpected corpus columns");
}
const rows: Row[] = csv.map(([shortdescription, regex, attemptregex]) => ({
  shortdescription,
  regex,
  attemptregex
}));
const safe = (expression: string): boolean =>
  expression.length > 0 && expression.length <= 25 && /^[01ab|()*+?]+$/.test(expression);
const compatible = rows.filter((row) => safe(row.regex) && safe(row.attemptregex));
const byTask = new Map<string, Row[]>();
for (const row of compatible) {
  const key = `${row.shortdescription}\0${row.regex}`;
  if (!byTask.has(key)) byTask.set(key, []);
  byTask.get(key)!.push(row);
}
const hash = (row: Row): string =>
  createHash("sha256").update(`${row.shortdescription}\0${row.regex}\0${row.attemptregex}`).digest("hex");
const selected: Row[] = [];
for (const task of [...byTask.keys()].sort()) {
  const deduplicated = new Map<string, Row>();
  for (const row of byTask.get(task)!) deduplicated.set(`${row.regex}\0${row.attemptregex}`, row);
  selected.push(...[...deduplicated.values()].sort((a, b) => hash(a).localeCompare(hash(b))).slice(0, 10));
}

let equivalent = 0;
const witnessLengths = new Map<number, number>();
let boundedChecks = 0;
let boundedDisagreements = 0;
let witnessOracleFailures = 0;
let completedMinimizedFailures = 0;
let subsetEvents = 0;
let refinementRounds = 0;
const encounteredExpressions = new Set<string>();
const converted = new Map<string, ReturnType<typeof convertRegex>>();
function conversion(pattern: string): ReturnType<typeof convertRegex> {
  let result = converted.get(pattern);
  if (!result) {
    result = convertRegex(pattern);
    converted.set(pattern, result);
    encounteredExpressions.add(pattern);
    subsetEvents += result.subsetConstruction.steps.length;
    refinementRounds += result.minimization.rounds.length;
    const same = compareDfaLanguages(result.dfa, result.minimizedDfa, pattern, pattern);
    if (!same.equivalent) completedMinimizedFailures++;
  }
  return result;
}

for (const row of selected) {
  const teacher = conversion(row.regex);
  const attempt = conversion(row.attemptregex);
  const comparison = compareRegexes(row.regex, row.attemptregex);
  if (comparison.equivalent) {
    equivalent++;
  } else {
    const witness = comparison.witness?.value ?? "";
    witnessLengths.set(witness.length, (witnessLengths.get(witness.length) ?? 0) + 1);
    const left = new RegExp(`^(?:${row.regex})$`).test(witness);
    const right = new RegExp(`^(?:${row.attemptregex})$`).test(witness);
    if (left === right || left !== comparison.leftAcceptsWitness || right !== comparison.rightAcceptsWitness) {
      witnessOracleFailures++;
    }
  }
  const alphabet = [...new Set([...teacher.dfa.alphabet, ...attempt.dfa.alphabet])].sort();
  let words = [""];
  for (let length = 0; length <= 4; length++) {
    for (const word of words) {
      for (const [pattern, result] of [[row.regex, teacher], [row.attemptregex, attempt]] as const) {
        boundedChecks++;
        if (simulateDfa(result.dfa, word).accepted !== new RegExp(`^(?:${pattern})$`).test(word)) {
          boundedDisagreements++;
        }
      }
    }
    words = words.flatMap((word) => alphabet.map((symbol) => word + symbol));
  }
}

console.log(JSON.stringify({
  corpusRows: rows.length,
  compatibleRows: compatible.length,
  compatibleTasks: byTask.size,
  selectedPairs: selected.length,
  uniqueExpressions: encounteredExpressions.size,
  equivalent,
  inequivalent: selected.length - equivalent,
  witnessLengths: Object.fromEntries([...witnessLengths].sort(([a], [b]) => a - b)),
  boundedChecks,
  boundedDisagreements,
  witnessOracleFailures,
  subsetEvents,
  refinementRounds,
  completedMinimizedFailures
}, null, 2));
