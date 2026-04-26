import { Buffer } from "node:buffer";
import type { IncomingMessage, ServerResponse } from "node:http";

type ApiRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
};

type JsonObject = Record<string, unknown>;

type AutomataRuntime = Awaited<ReturnType<typeof loadAutomataRuntime>>;

export async function handleExamples(_request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const runtime = await loadAutomataRuntime();
    sendJson(response, 200, { examples: runtime.examples });
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleCfgExamples(_request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const runtime = await loadAutomataRuntime();
    sendJson(response, 200, { examples: runtime.cfgExamples });
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handlePdaExamples(_request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const runtime = await loadAutomataRuntime();
    sendJson(response, 200, { examples: runtime.pdaExamples });
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleTuringExamples(_request: ApiRequest, response: ServerResponse): Promise<void> {
  try {
    const runtime = await loadAutomataRuntime();
    sendJson(response, 200, { examples: runtime.turingExamples });
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleConvert(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (!ensureMethod(request, response, "POST")) {
    return;
  }

  try {
    const runtime = await loadAutomataRuntime();
    const body = await readJsonBody(request);
    const regex = body.regex;

    if (typeof regex !== "string" || regex.length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named regex." });
      return;
    }

    if (regex.length > 300) {
      sendJson(response, 400, { error: "Regex is too long for interactive visualization." });
      return;
    }

    sendJson(response, 200, runtime.convertRegex(regex));
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleSimulate(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (!ensureMethod(request, response, "POST")) {
    return;
  }

  try {
    const runtime = await loadAutomataRuntime();
    const body = await readJsonBody(request);
    const regex = body.regex;
    const input = body.input;

    if (typeof regex !== "string" || regex.length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named regex." });
      return;
    }

    if (typeof input !== "string") {
      sendJson(response, 400, { error: "Body must include a string field named input." });
      return;
    }

    if (regex.length > 300 || input.length > 300) {
      sendJson(response, 400, { error: "Regex and input must be 300 characters or less." });
      return;
    }

    sendJson(response, 200, runtime.simulateRegex(regex, input));
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleSimulateBatch(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (!ensureMethod(request, response, "POST")) {
    return;
  }

  try {
    const runtime = await loadAutomataRuntime();
    const body = await readJsonBody(request);
    const regex = body.regex;
    const inputs = body.inputs;

    if (typeof regex !== "string" || regex.length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named regex." });
      return;
    }

    if (!Array.isArray(inputs) || !inputs.every((value) => typeof value === "string")) {
      sendJson(response, 400, { error: "Body must include a string array field named inputs." });
      return;
    }

    if (regex.length > 300) {
      sendJson(response, 400, { error: "Regex must be 300 characters or less." });
      return;
    }

    if (inputs.length > 200) {
      sendJson(response, 400, { error: "Batch size must be 200 inputs or fewer." });
      return;
    }

    if (inputs.some((value) => value.length > 300)) {
      sendJson(response, 400, { error: "Each input string must be 300 characters or less." });
      return;
    }

    sendJson(response, 200, runtime.simulateRegexBatch(regex, inputs));
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleCompare(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (!ensureMethod(request, response, "POST")) {
    return;
  }

  try {
    const runtime = await loadAutomataRuntime();
    const body = await readJsonBody(request);
    const leftRegex = body.leftRegex;
    const rightRegex = body.rightRegex;

    if (typeof leftRegex !== "string" || leftRegex.length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named leftRegex." });
      return;
    }

    if (typeof rightRegex !== "string" || rightRegex.length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named rightRegex." });
      return;
    }

    if (leftRegex.length > 300 || rightRegex.length > 300) {
      sendJson(response, 400, { error: "Both regex strings must be 300 characters or less." });
      return;
    }

    sendJson(response, 200, runtime.compareRegexes(leftRegex, rightRegex));
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleCfgParse(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (!ensureMethod(request, response, "POST")) {
    return;
  }

  try {
    const runtime = await loadAutomataRuntime();
    const body = await readJsonBody(request);
    const grammar = body.grammar;
    const input = body.input;

    if (typeof grammar !== "string" || grammar.trim().length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named grammar." });
      return;
    }

    if (typeof input !== "string") {
      sendJson(response, 400, { error: "Body must include a string field named input." });
      return;
    }

    if (grammar.length > 6000 || input.length > 300) {
      sendJson(response, 400, { error: "Grammar must be <= 6000 chars and input must be <= 300 chars." });
      return;
    }

    sendJson(response, 200, runtime.parseCfgInput(grammar, input));
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handlePdaSimulate(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (!ensureMethod(request, response, "POST")) {
    return;
  }

  try {
    const runtime = await loadAutomataRuntime();
    const body = await readJsonBody(request);
    const definition = body.definition;
    const input = body.input;

    if (typeof definition !== "string" || definition.trim().length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named definition." });
      return;
    }

    if (typeof input !== "string") {
      sendJson(response, 400, { error: "Body must include a string field named input." });
      return;
    }

    if (definition.length > 12000 || input.length > 300) {
      sendJson(response, 400, { error: "PDA definition must be <= 12000 chars and input must be <= 300 chars." });
      return;
    }

    sendJson(response, 200, runtime.simulatePdaInput(definition, input));
  } catch (error) {
    sendApiError(response, error);
  }
}

export async function handleTuringSimulate(request: ApiRequest, response: ServerResponse): Promise<void> {
  if (!ensureMethod(request, response, "POST")) {
    return;
  }

  try {
    const runtime = await loadAutomataRuntime();
    const body = await readJsonBody(request);
    const definition = body.definition;
    const input = body.input;

    if (typeof definition !== "string" || definition.trim().length === 0) {
      sendJson(response, 400, { error: "Body must include a non-empty string field named definition." });
      return;
    }

    if (typeof input !== "string") {
      sendJson(response, 400, { error: "Body must include a string field named input." });
      return;
    }

    if (definition.length > 12000 || input.length > 300) {
      sendJson(response, 400, {
        error: "Turing machine definition must be <= 12000 chars and input must be <= 300 chars."
      });
      return;
    }

    sendJson(response, 200, runtime.simulateTuringInput(definition, input));
  } catch (error) {
    sendApiError(response, error);
  }
}

function ensureMethod(request: ApiRequest, response: ServerResponse, method: string): boolean {
  if (request.method === method) {
    return true;
  }

  sendJson(response, 405, { error: `Method ${request.method ?? "UNKNOWN"} not allowed.` });
  return false;
}

async function readJsonBody(request: ApiRequest): Promise<JsonObject> {
  const parsed = request.body === undefined ? JSON.parse(await readRawBody(request)) : normalizeBody(request.body);
  if (!isJsonObject(parsed)) {
    throw new Error("Body must be a JSON object.");
  }
  return parsed;
}

async function readRawBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) {
    return "{}";
  }

  return raw;
}

function normalizeBody(body: unknown): unknown {
  if (typeof body === "string") {
    return JSON.parse(body);
  }

  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString("utf8"));
  }

  return body;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadAutomataRuntime() {
  const [pipelineModule, parserModule, formalTypesModule] = await Promise.all([
    import("../src/automata/pipeline"),
    import("../src/automata/parser"),
    import("../src/automata/formalTypes")
  ]);

  return {
    examples: pipelineModule.examples,
    cfgExamples: pipelineModule.cfgExamples,
    pdaExamples: pipelineModule.pdaExamples,
    turingExamples: pipelineModule.turingExamples,
    convertRegex: pipelineModule.convertRegex,
    simulateRegex: pipelineModule.simulateRegex,
    simulateRegexBatch: pipelineModule.simulateRegexBatch,
    compareRegexes: pipelineModule.compareRegexes,
    parseCfgInput: pipelineModule.parseCfgInput,
    simulatePdaInput: pipelineModule.simulatePdaInput,
    simulateTuringInput: pipelineModule.simulateTuringInput,
    RegexSyntaxError: parserModule.RegexSyntaxError,
    FormalDefinitionError: formalTypesModule.FormalDefinitionError
  };
}

function sendApiError(response: ServerResponse, error: unknown, runtime?: Pick<AutomataRuntime, "RegexSyntaxError" | "FormalDefinitionError">): void {
  if (error instanceof SyntaxError) {
    sendJson(response, 400, { error: "Request body must be valid JSON." });
    return;
  }

  if (runtime !== undefined && error instanceof runtime.RegexSyntaxError) {
    sendJson(response, 400, {
      error: error.message,
      position: error.position
    });
    return;
  }

  if (runtime !== undefined && error instanceof runtime.FormalDefinitionError) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  sendJson(response, 500, {
    error: "Internal conversion error.",
    detail: message
  });
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}
