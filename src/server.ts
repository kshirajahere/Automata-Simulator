import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { FormalDefinitionError } from "./automata/formalTypes";
import {
  cfgExamples,
  compareRegexes,
  convertRegex,
  examples,
  parseCfgInput,
  pdaExamples,
  simulatePdaInput,
  simulateRegex,
  simulateRegexBatch,
  simulateTuringInput,
  turingExamples
} from "./automata/pipeline";
import { RegexSyntaxError } from "./automata/parser";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "regex-automata-visualizer" });
});

app.get("/api/examples", (_request, response) => {
  response.json({ examples });
});

app.get("/api/cfg/examples", (_request, response) => {
  response.json({ examples: cfgExamples });
});

app.get("/api/pda/examples", (_request, response) => {
  response.json({ examples: pdaExamples });
});

app.get("/api/turing/examples", (_request, response) => {
  response.json({ examples: turingExamples });
});

app.post("/api/convert", (request, response) => {
  const regex = request.body?.regex;

  if (typeof regex !== "string" || regex.length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named regex." });
    return;
  }

  if (regex.length > 300) {
    response.status(400).json({ error: "Regex is too long for interactive visualization." });
    return;
  }

  try {
    response.json(convertRegex(regex));
  } catch (error) {
    sendConversionError(response, error);
  }
});

app.post("/api/simulate", (request, response) => {
  const regex = request.body?.regex;
  const input = request.body?.input;

  if (typeof regex !== "string" || regex.length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named regex." });
    return;
  }

  if (typeof input !== "string") {
    response.status(400).json({ error: "Body must include a string field named input." });
    return;
  }

  if (regex.length > 300 || input.length > 300) {
    response.status(400).json({ error: "Regex and input must be 300 characters or less." });
    return;
  }

  try {
    response.json(simulateRegex(regex, input));
  } catch (error) {
    sendConversionError(response, error);
  }
});

app.post("/api/simulate-batch", (request, response) => {
  const regex = request.body?.regex;
  const inputs = request.body?.inputs;

  if (typeof regex !== "string" || regex.length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named regex." });
    return;
  }

  if (!Array.isArray(inputs) || !inputs.every((value) => typeof value === "string")) {
    response.status(400).json({ error: "Body must include a string array field named inputs." });
    return;
  }

  if (regex.length > 300) {
    response.status(400).json({ error: "Regex must be 300 characters or less." });
    return;
  }

  if (inputs.length > 200) {
    response.status(400).json({ error: "Batch size must be 200 inputs or fewer." });
    return;
  }

  if (inputs.some((value) => value.length > 300)) {
    response.status(400).json({ error: "Each input string must be 300 characters or less." });
    return;
  }

  try {
    response.json(simulateRegexBatch(regex, inputs));
  } catch (error) {
    sendConversionError(response, error);
  }
});

app.post("/api/compare", (request, response) => {
  const leftRegex = request.body?.leftRegex;
  const rightRegex = request.body?.rightRegex;

  if (typeof leftRegex !== "string" || leftRegex.length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named leftRegex." });
    return;
  }

  if (typeof rightRegex !== "string" || rightRegex.length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named rightRegex." });
    return;
  }

  if (leftRegex.length > 300 || rightRegex.length > 300) {
    response.status(400).json({ error: "Both regex strings must be 300 characters or less." });
    return;
  }

  try {
    response.json(compareRegexes(leftRegex, rightRegex));
  } catch (error) {
    sendConversionError(response, error);
  }
});

app.post("/api/cfg/parse", (request, response) => {
  const grammar = request.body?.grammar;
  const input = request.body?.input;

  if (typeof grammar !== "string" || grammar.trim().length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named grammar." });
    return;
  }

  if (typeof input !== "string") {
    response.status(400).json({ error: "Body must include a string field named input." });
    return;
  }

  if (grammar.length > 6000 || input.length > 300) {
    response.status(400).json({ error: "Grammar must be <= 6000 chars and input must be <= 300 chars." });
    return;
  }

  try {
    response.json(parseCfgInput(grammar, input));
  } catch (error) {
    sendConversionError(response, error);
  }
});

app.post("/api/pda/simulate", (request, response) => {
  const definition = request.body?.definition;
  const input = request.body?.input;

  if (typeof definition !== "string" || definition.trim().length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named definition." });
    return;
  }

  if (typeof input !== "string") {
    response.status(400).json({ error: "Body must include a string field named input." });
    return;
  }

  if (definition.length > 12000 || input.length > 300) {
    response.status(400).json({ error: "PDA definition must be <= 12000 chars and input must be <= 300 chars." });
    return;
  }

  try {
    response.json(simulatePdaInput(definition, input));
  } catch (error) {
    sendConversionError(response, error);
  }
});

app.post("/api/turing/simulate", (request, response) => {
  const definition = request.body?.definition;
  const input = request.body?.input;

  if (typeof definition !== "string" || definition.trim().length === 0) {
    response.status(400).json({ error: "Body must include a non-empty string field named definition." });
    return;
  }

  if (typeof input !== "string") {
    response.status(400).json({ error: "Body must include a string field named input." });
    return;
  }

  if (definition.length > 12000 || input.length > 300) {
    response.status(400).json({
      error: "Turing machine definition must be <= 12000 chars and input must be <= 300 chars."
    });
    return;
  }

  try {
    response.json(simulateTuringInput(definition, input));
  } catch (error) {
    sendConversionError(response, error);
  }
});

export default app;

if (isDirectExecution()) {
  app.listen(port, "127.0.0.1", () => {
    console.log(`Regex automata API listening on http://127.0.0.1:${port}`);
  });
}

function sendConversionError(response: express.Response, error: unknown): void {
  if (error instanceof RegexSyntaxError) {
    response.status(400).json({
      error: error.message,
      position: error.position
    });
    return;
  }

  if (error instanceof FormalDefinitionError) {
    response.status(400).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Internal conversion error." });
}

function isDirectExecution(): boolean {
  return process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
