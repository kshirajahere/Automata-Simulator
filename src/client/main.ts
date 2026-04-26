import * as d3 from "d3";
import type {
  BatchSimulationResult,
  ConversionResult,
  Dfa,
  Nfa,
  RegexAst,
  RegexComparisonResult,
  SimulationResult,
  SubsetConstructionStep
} from "../automata/types";
import type {
  CfgParseResult,
  CfgParseTreeNode,
  FormalExample,
  PdaSimulationResult,
  TuringSimulationResult
} from "../automata/formalTypes";
import "./styles.css";

interface RenderableState {
  id: string | number;
  label: string;
  isStart: boolean;
  isAccept: boolean;
  isDead?: boolean;
}

interface RenderableTransition {
  id: string;
  from: string | number;
  to: string | number;
  label: string;
}

interface RenderableAutomaton {
  states: RenderableState[];
  transitions: RenderableTransition[];
}

type Automaton = Nfa | Dfa | RenderableAutomaton;
type TabId = "regex" | "cfg" | "pda" | "tm";

interface RegexExample {
  title: string;
  regex: string;
  input: string;
  why: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isStart: boolean;
  isAccept: boolean;
  isDead: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
}

interface TreeLayoutNode {
  node: CfgParseTreeNode;
  x: number;
  y: number;
  width: number;
  children: TreeLayoutNode[];
}

const EXPORT_STYLE_PROPERTIES = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "paint-order",
  "opacity",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing"
];

const regexInput = mustElement<HTMLInputElement>("regex-input");
const btnCompile = mustElement<HTMLButtonElement>("btn-compile");
const regexExampleList = mustElement<HTMLElement>("regex-example-list");
const simInput = mustElement<HTMLInputElement>("sim-input");
const btnSimStep = mustElement<HTMLButtonElement>("btn-sim-step");
const btnSimRun = mustElement<HTMLButtonElement>("btn-sim-run");
const simOutput = mustElement<HTMLElement>("sim-output");
const compareRegexInput = mustElement<HTMLInputElement>("compare-regex-input");
const btnCompare = mustElement<HTMLButtonElement>("btn-compare");
const compareOutput = mustElement<HTMLElement>("compare-output");
const compareOutputMirror = mustElement<HTMLElement>("compare-output-clone");
const batchInputs = mustElement<HTMLTextAreaElement>("batch-inputs");
const btnBatchRun = mustElement<HTMLButtonElement>("btn-batch-run");
const batchOutput = mustElement<HTMLElement>("batch-output");
const insightsView = mustElement<HTMLElement>("language-insights");
const astCanvas = mustElement<HTMLElement>("ast-canvas");
const nfaCanvas = mustElement<HTMLElement>("nfa-canvas");
const dfaCanvas = mustElement<HTMLElement>("dfa-canvas");
const minDfaCanvas = mustElement<HTMLElement>("min-dfa-canvas");
const dfaStepper = mustElement<HTMLElement>("dfa-stepper");
const dfaPartitions = mustElement<HTMLElement>("dfa-partitions");

const metricRegexAlphabet = mustElement<HTMLElement>("metric-regex-alphabet");
const metricNfaStates = mustElement<HTMLElement>("metric-nfa-states");
const metricDfaStates = mustElement<HTMLElement>("metric-dfa-states");
const metricMinStates = mustElement<HTMLElement>("metric-min-states");
const metricSubsetSteps = mustElement<HTMLElement>("metric-subset-steps");

const cfgInput = mustElement<HTMLInputElement>("cfg-input");
const cfgGrammar = mustElement<HTMLTextAreaElement>("cfg-grammar");
const btnCfgParse = mustElement<HTMLButtonElement>("btn-cfg-parse");
const cfgExampleList = mustElement<HTMLElement>("cfg-example-list");
const cfgStatusMetric = mustElement<HTMLElement>("cfg-status-metric");
const cfgAmbiguityMetric = mustElement<HTMLElement>("cfg-ambiguity-metric");
const cfgParseCountMetric = mustElement<HTMLElement>("cfg-parse-count-metric");
const cfgTokenCountMetric = mustElement<HTMLElement>("cfg-token-count-metric");
const cfgTreeCanvas = mustElement<HTMLElement>("cfg-tree-canvas");
const cfgLeftDerivation = mustElement<HTMLElement>("cfg-left-derivation");
const cfgRightDerivation = mustElement<HTMLElement>("cfg-right-derivation");
const cfgProductions = mustElement<HTMLElement>("cfg-productions");
const cfgNotes = mustElement<HTMLElement>("cfg-notes");

const pdaInput = mustElement<HTMLInputElement>("pda-input");
const pdaDefinition = mustElement<HTMLTextAreaElement>("pda-definition");
const btnPdaRun = mustElement<HTMLButtonElement>("btn-pda-run");
const pdaStepPrevBtn = mustElement<HTMLButtonElement>("pda-step-prev");
const pdaStepPlayBtn = mustElement<HTMLButtonElement>("pda-step-play");
const pdaStepNextBtn = mustElement<HTMLButtonElement>("pda-step-next");
const pdaStepLabel = mustElement<HTMLElement>("pda-step-label");
const pdaExampleList = mustElement<HTMLElement>("pda-example-list");
const pdaStatusMetric = mustElement<HTMLElement>("pda-status-metric");
const pdaConfigsMetric = mustElement<HTMLElement>("pda-configs-metric");
const pdaStepsMetric = mustElement<HTMLElement>("pda-steps-metric");
const pdaFinalMetric = mustElement<HTMLElement>("pda-final-metric");
const pdaGraph = mustElement<HTMLElement>("pda-graph");
const pdaTrace = mustElement<HTMLElement>("pda-trace");
const pdaTransitions = mustElement<HTMLElement>("pda-transitions");
const pdaSummary = mustElement<HTMLElement>("pda-summary");

const tmInput = mustElement<HTMLInputElement>("tm-input");
const tmDefinition = mustElement<HTMLTextAreaElement>("tm-definition");
const btnTmRun = mustElement<HTMLButtonElement>("btn-tm-run");
const tmStepPrevBtn = mustElement<HTMLButtonElement>("tm-step-prev");
const tmStepPlayBtn = mustElement<HTMLButtonElement>("tm-step-play");
const tmStepNextBtn = mustElement<HTMLButtonElement>("tm-step-next");
const tmStepResetBtn = mustElement<HTMLButtonElement>("tm-step-reset");
const tmExampleList = mustElement<HTMLElement>("tm-example-list");
const tmStatusMetric = mustElement<HTMLElement>("tm-status-metric");
const tmStepsMetric = mustElement<HTMLElement>("tm-steps-metric");
const tmHeadMetric = mustElement<HTMLElement>("tm-head-metric");
const tmFinalMetric = mustElement<HTMLElement>("tm-final-metric");
const tmGraph = mustElement<HTMLElement>("tm-graph");
const tmTape = mustElement<HTMLElement>("tm-tape");
const tmTransitions = mustElement<HTMLElement>("tm-transitions");
const tmSummary = mustElement<HTMLElement>("tm-summary");
const tmTrace = mustElement<HTMLElement>("tm-trace");
const tmStepSlider = mustElement<HTMLInputElement>("tm-step-slider");
const tmStepLabel = mustElement<HTMLElement>("tm-step-label");

const statusLine = mustElement<HTMLElement>("status-line");
const exportSvgBtn = mustElement<HTMLButtonElement>("export-svg");
const exportPngBtn = mustElement<HTMLButtonElement>("export-png");
const exportJsonBtn = mustElement<HTMLButtonElement>("export-json");
const copyReportBtn = mustElement<HTMLButtonElement>("copy-report");

const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab-btn"));
const labStages = Array.from(document.querySelectorAll<HTMLElement>(".lab-stage"));

const state = {
  activeTab: "regex" as TabId,
  regexExamples: [] as RegexExample[],
  cfgExamples: [] as FormalExample<string>[],
  pdaExamples: [] as FormalExample<string>[],
  tmExamples: [] as FormalExample<string>[],
  currentConversion: null as ConversionResult | null,
  currentSimulation: null as SimulationResult | null,
  currentSimStep: 0,
  currentSubsetStep: 0,
  currentCfgResult: null as CfgParseResult | null,
  currentCfgLeftStep: 0,
  currentCfgRightStep: 0,
  currentPdaResult: null as PdaSimulationResult | null,
  currentPdaStep: 0,
  pdaPlaybackTimer: null as number | null,
  currentTmResult: null as TuringSimulationResult | null,
  currentTmStep: 0,
  tmPlaybackTimer: null as number | null
};

bindEvents();
void initialize();

function bindEvents(): void {
  btnCompile.addEventListener("click", () => {
    void compileRegex();
  });

  regexInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void compileRegex();
    }
  });

  simInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      void runSimulation();
    }
  });

  btnSimStep.addEventListener("click", () => {
    if (state.currentSimulation === null) {
      void runSimulation().then(() => renderNextSimStep());
      return;
    }

    renderNextSimStep();
  });

  btnSimRun.addEventListener("click", () => {
    void runSimulation().then(() => {
      if (state.currentSimulation !== null) {
        state.currentSimStep = state.currentSimulation.path.length;
        renderCurrentSimStep();
      }
    });
  });

  btnCompare.addEventListener("click", () => {
    void compareLanguages();
  });

  btnBatchRun.addEventListener("click", () => {
    void runBatchEvaluation();
  });

  btnCfgParse.addEventListener("click", () => {
    void runCfgParse();
  });

  btnPdaRun.addEventListener("click", () => {
    void runPdaSimulation();
  });

  pdaStepPrevBtn.addEventListener("click", () => {
    stopPdaPlayback();
    if (state.currentPdaStep > 0) {
      state.currentPdaStep -= 1;
      renderPdaStepView();
    }
  });

  pdaStepPlayBtn.addEventListener("click", () => {
    togglePdaPlayback();
  });

  pdaStepNextBtn.addEventListener("click", () => {
    stopPdaPlayback();
    if (state.currentPdaResult !== null && state.currentPdaStep < state.currentPdaResult.steps.length) {
      state.currentPdaStep += 1;
      renderPdaStepView();
    }
  });

  btnTmRun.addEventListener("click", () => {
    void runTuringSimulation();
  });

  cfgGrammar.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      void runCfgParse();
    }
  });

  pdaDefinition.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      void runPdaSimulation();
    }
  });

  tmDefinition.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      void runTuringSimulation();
    }
  });

  tmStepSlider.addEventListener("input", () => {
    stopTmPlayback();
    state.currentTmStep = Number(tmStepSlider.value);
    renderTmStepView();
  });

  tmStepPrevBtn.addEventListener("click", () => {
    stopTmPlayback();
    if (state.currentTmStep > 0) {
      state.currentTmStep -= 1;
      tmStepSlider.value = String(state.currentTmStep);
      renderTmStepView();
    }
  });

  tmStepPlayBtn.addEventListener("click", () => {
    toggleTmPlayback();
  });

  tmStepNextBtn.addEventListener("click", () => {
    stopTmPlayback();
    if (state.currentTmResult !== null && state.currentTmStep < state.currentTmResult.steps.length) {
      state.currentTmStep += 1;
      tmStepSlider.value = String(state.currentTmStep);
      renderTmStepView();
    }
  });

  tmStepResetBtn.addEventListener("click", () => {
    stopTmPlayback();
    state.currentTmStep = 0;
    tmStepSlider.value = "0";
    renderTmStepView();
  });

  exportSvgBtn.addEventListener("click", () => {
    void exportCurrentSvgs();
  });

  exportPngBtn.addEventListener("click", () => {
    void exportCurrentPngs();
  });

  exportJsonBtn.addEventListener("click", () => {
    exportCurrentJson();
  });

  copyReportBtn.addEventListener("click", () => {
    void copyCurrentReport();
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      if (target === "regex" || target === "cfg" || target === "pda" || target === "tm") {
        activateTab(target);
      }
    });
  });
}

async function initialize(): Promise<void> {
  setStatus("Loading lab presets...");

  try {
    await loadExamples();
    await compileRegex();
    await runCfgParse();
    await runPdaSimulation();
    await runTuringSimulation();
    setStatus("Ready.");
  } catch (error) {
    setStatus(errorMessage(error));
  }
}

async function loadExamples(): Promise<void> {
  const [regexPayload, cfgPayload, pdaPayload, tmPayload] = await Promise.all([
    fetchJson<{ examples: RegexExample[] }>("/api/examples"),
    fetchJson<{ examples: FormalExample<string>[] }>("/api/cfg/examples"),
    fetchJson<{ examples: FormalExample<string>[] }>("/api/pda/examples"),
    fetchJson<{ examples: FormalExample<string>[] }>("/api/turing/examples")
  ]);

  state.regexExamples = regexPayload.examples;
  state.cfgExamples = cfgPayload.examples;
  state.pdaExamples = pdaPayload.examples;
  state.tmExamples = tmPayload.examples;

  renderRegexExamples();
  renderFormalExamples(cfgExampleList, state.cfgExamples, (example) => {
    cfgGrammar.value = example.definition;
    cfgInput.value = example.input;
    void runCfgParse();
  });
  renderFormalExamples(pdaExampleList, state.pdaExamples, (example) => {
    pdaDefinition.value = example.definition;
    pdaInput.value = example.input;
    void runPdaSimulation();
  });
  renderFormalExamples(tmExampleList, state.tmExamples, (example) => {
    tmDefinition.value = example.definition;
    tmInput.value = example.input;
    void runTuringSimulation();
  });

  const defaultCfg = state.cfgExamples[0];
  if (defaultCfg !== undefined) {
    cfgGrammar.value = defaultCfg.definition;
    cfgInput.value = defaultCfg.input;
  }

  const defaultPda = state.pdaExamples[0];
  if (defaultPda !== undefined) {
    pdaDefinition.value = defaultPda.definition;
    pdaInput.value = defaultPda.input;
  }

  const defaultTm = state.tmExamples[0];
  if (defaultTm !== undefined) {
    tmDefinition.value = defaultTm.definition;
    tmInput.value = defaultTm.input;
  }
}

function activateTab(tab: TabId): void {
  stopPdaPlayback();
  stopTmPlayback();
  state.activeTab = tab;
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  labStages.forEach((stage) => {
    stage.classList.toggle("active", stage.dataset.stage === tab);
  });
  setStatus(`Switched to ${tabLabel(tab)}.`);
}

async function compileRegex(): Promise<void> {
  const regex = regexInput.value.trim();
  if (regex.length === 0) {
    setStatus("Regex is required.");
    return;
  }

  setStatus("Compiling regex...");

  try {
    const payload = await postJson<ConversionResult>("/api/convert", { regex });
    state.currentConversion = payload;
    state.currentSimulation = null;
    state.currentSimStep = 0;
    state.currentSubsetStep = 0;
    renderConversion(payload);
    renderSimulationIdle();
    setStatus(payload.notes.join(" "));
  } catch (error) {
    setStatus(errorMessage(error));
    simOutput.innerHTML = `<div class="note-card">${escapeHtml(errorMessage(error))}</div>`;
  }
}

async function runSimulation(): Promise<void> {
  const regex = regexInput.value.trim();
  if (regex.length === 0) {
    setStatus("Compile a regex first.");
    return;
  }

  setStatus("Running DFA simulation...");

  try {
    const payload = await postJson<SimulationResult>("/api/simulate", {
      regex,
      input: simInput.value
    });
    state.currentSimulation = payload;
    state.currentSimStep = 0;
    renderCurrentSimStep();
    setStatus(payload.reason);
  } catch (error) {
    setStatus(errorMessage(error));
    simOutput.innerHTML = `<div class="note-card">${escapeHtml(errorMessage(error))}</div>`;
  }
}

async function compareLanguages(): Promise<void> {
  const leftRegex = regexInput.value.trim();
  const rightRegex = compareRegexInput.value.trim();
  if (leftRegex.length === 0 || rightRegex.length === 0) {
    setStatus("Both regex fields are required for comparison.");
    return;
  }

  setStatus("Comparing languages...");

  try {
    const payload = await postJson<RegexComparisonResult>("/api/compare", {
      leftRegex,
      rightRegex
    });
    renderComparison(payload);
    setStatus(payload.explanation);
  } catch (error) {
    const message = errorMessage(error);
    setStatus(message);
    renderComparisonError(message);
  }
}

async function runBatchEvaluation(): Promise<void> {
  const regex = regexInput.value.trim();
  if (regex.length === 0) {
    setStatus("Compile a regex before running a batch.");
    return;
  }

  const inputs = batchInputs.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line === "<epsilon>" ? "" : line));

  if (inputs.length === 0) {
    setStatus("Add at least one batch input.");
    return;
  }

  setStatus("Running batch evaluation...");

  try {
    const payload = await postJson<BatchSimulationResult>("/api/simulate-batch", {
      regex,
      inputs
    });
    renderBatchResult(payload);
    setStatus("Batch evaluation complete.");
  } catch (error) {
    const message = errorMessage(error);
    setStatus(message);
    batchOutput.innerHTML = `<div class="note-card">${escapeHtml(message)}</div>`;
  }
}

async function runCfgParse(): Promise<void> {
  const grammar = cfgGrammar.value.trim();
  setStatus("Parsing CFG...");

  try {
    const payload = await postJson<CfgParseResult>("/api/cfg/parse", {
      grammar,
      input: cfgInput.value
    });
    state.currentCfgResult = payload;
    state.currentCfgLeftStep = 0;
    state.currentCfgRightStep = 0;
    renderCfgResult(payload);
    setStatus(payload.notes.join(" "));
  } catch (error) {
    const message = errorMessage(error);
    state.currentCfgResult = null;
    renderCfgError(message);
    setStatus(message);
  }
}

async function runPdaSimulation(): Promise<void> {
  stopPdaPlayback();
  setStatus("Running PDA simulation...");

  try {
    const payload = await postJson<PdaSimulationResult>("/api/pda/simulate", {
      definition: pdaDefinition.value,
      input: pdaInput.value
    });
    state.currentPdaResult = payload;
    state.currentPdaStep = 0;
    renderPdaResult(payload);
    setStatus(payload.reason);
  } catch (error) {
    const message = errorMessage(error);
    state.currentPdaResult = null;
    renderPdaError(message);
    setStatus(message);
  }
}

async function runTuringSimulation(): Promise<void> {
  stopTmPlayback();
  setStatus("Running Turing machine...");

  try {
    const payload = await postJson<TuringSimulationResult>("/api/turing/simulate", {
      definition: tmDefinition.value,
      input: tmInput.value
    });
    state.currentTmResult = payload;
    state.currentTmStep = 0;
    renderTuringResult(payload);
    setStatus(payload.reason);
  } catch (error) {
    const message = errorMessage(error);
    state.currentTmResult = null;
    renderTmError(message);
    setStatus(message);
  }
}

function renderRegexExamples(): void {
  regexExampleList.innerHTML = state.regexExamples
    .map(
      (example, index) => `
        <div class="example-card">
          <strong>${escapeHtml(example.title)}</strong>
          <span class="example-meta">${escapeHtml(example.regex)}</span>
          <p>${escapeHtml(example.why)}</p>
          <button type="button" data-regex-example="${index}">Load Example</button>
        </div>
      `
    )
    .join("");

  Array.from(regexExampleList.querySelectorAll<HTMLButtonElement>("[data-regex-example]")).forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.regexExample);
      const example = state.regexExamples[index];
      if (example === undefined) {
        return;
      }
      regexInput.value = example.regex;
      simInput.value = example.input;
      compareRegexInput.value = example.regex;
      void compileRegex();
    });
  });
}

function renderFormalExamples(
  container: HTMLElement,
  examples: FormalExample<string>[],
  onSelect: (example: FormalExample<string>) => void
): void {
  container.innerHTML = examples
    .map(
      (example, index) => `
        <div class="example-card">
          <strong>${escapeHtml(example.title)}</strong>
          <span class="example-meta">Input: ${escapeHtml(example.input || "<epsilon>")}</span>
          <p>${escapeHtml(example.summary)}</p>
          <button type="button" data-formal-example="${index}">Load Example</button>
        </div>
      `
    )
    .join("");

  Array.from(container.querySelectorAll<HTMLButtonElement>("[data-formal-example]")).forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.formalExample);
      const example = examples[index];
      if (example !== undefined) {
        onSelect(example);
      }
    });
  });
}

function renderConversion(conversion: ConversionResult): void {
  renderRegexMetrics(conversion);
  renderAst(conversion.ast);
  renderAutomaton(nfaCanvas, conversion.nfa);
  renderAutomaton(dfaCanvas, conversion.dfa);
  renderAutomaton(minDfaCanvas, conversion.minimizedDfa);
  renderInsights(conversion);
  renderDfaStepper();
  renderPartitions();
  updateDfaGraphHighlights();
}

function renderRegexMetrics(conversion: ConversionResult): void {
  metricRegexAlphabet.textContent =
    conversion.dfa.alphabet.length === 0 ? "empty" : conversion.dfa.alphabet.join(", ");
  metricNfaStates.textContent = String(conversion.nfa.states.length);
  metricDfaStates.textContent = String(conversion.dfa.states.length);
  metricMinStates.textContent = String(conversion.minimizedDfa.states.length);
  metricSubsetSteps.textContent = String(conversion.subsetConstruction.steps.length);
}

function renderAst(ast: RegexAst): void {
  astCanvas.innerHTML = "";
  astCanvas.appendChild(buildAstNode(ast));
}

function buildAstNode(ast: RegexAst): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "ast-node";

  const header = document.createElement("div");
  header.className = "ast-node-header";

  const label = document.createElement("span");
  label.textContent = regexAstTitle(ast);
  header.appendChild(label);

  const detail = regexAstDetail(ast);
  if (detail !== null) {
    const detailEl = document.createElement("span");
    detailEl.className = "ast-detail";
    detailEl.textContent = detail;
    header.appendChild(detailEl);
  }

  wrapper.appendChild(header);

  const children = regexAstChildren(ast);
  if (children.length > 0) {
    const childWrap = document.createElement("div");
    childWrap.className = "ast-children";
    children.forEach((child) => {
      childWrap.appendChild(buildAstNode(child));
    });
    wrapper.appendChild(childWrap);
  }

  return wrapper;
}

function regexAstTitle(ast: RegexAst): string {
  switch (ast.type) {
    case "concat":
      return "Concat";
    case "union":
      return "Union";
    case "star":
      return "Star";
    case "plus":
      return "Plus";
    case "optional":
      return "Optional";
    case "charset":
      return "Charset";
    case "literal":
      return "Literal";
    case "epsilon":
      return "Epsilon";
    case "empty":
      return "Empty";
  }
}

function regexAstDetail(ast: RegexAst): string | null {
  switch (ast.type) {
    case "literal":
      return `'${ast.value}'`;
    case "charset":
      return `[${ast.chars.join("")}]`;
    default:
      return null;
  }
}

function regexAstChildren(ast: RegexAst): RegexAst[] {
  switch (ast.type) {
    case "concat":
      return ast.terms;
    case "union":
      return ast.options;
    case "star":
    case "plus":
    case "optional":
      return [ast.expr];
    default:
      return [];
  }
}

function renderSimulationIdle(): void {
  simOutput.innerHTML = `
    <div class="summary-shell">
      <div class="note-card">Simulation is ready. Step through the DFA or run the whole input.</div>
    </div>
  `;
  updateDfaGraphHighlights();
}

function renderNextSimStep(): void {
  if (state.currentSimulation === null) {
    return;
  }

  if (state.currentSimStep < state.currentSimulation.path.length) {
    state.currentSimStep += 1;
  }

  renderCurrentSimStep();
}

function renderCurrentSimStep(): void {
  if (state.currentSimulation === null) {
    renderSimulationIdle();
    return;
  }

  const path = state.currentSimulation.path.slice(0, state.currentSimStep);
  const isDone = state.currentSimStep >= state.currentSimulation.path.length;

  const pathHtml =
    path.length === 0
      ? `<div class="note-card">Start in <span class="mono-inline">${escapeHtml(
          state.currentConversion?.dfa.start ?? ""
        )}</span>.</div>`
      : `<div class="highlight-row">${path
          .map(
            (step) => `
              <span class="badge">${escapeHtml(step.from)} -- ${escapeHtml(step.symbol)} -> ${escapeHtml(
                step.to ?? "error"
              )}</span>
            `
          )
          .join("")}</div>`;

  simOutput.innerHTML = `
    <div class="summary-shell">
      <div class="detail-grid">
        <div class="detail-card">
          <strong>Progress</strong>
          <span class="mono-inline">${state.currentSimStep} / ${state.currentSimulation.path.length}</span>
        </div>
        <div class="detail-card">
          <strong>Status</strong>
          <span class="badge ${state.currentSimulation.accepted && isDone ? "accept" : "reject"}">
            ${escapeHtml(isDone ? (state.currentSimulation.accepted ? "Accepted" : "Rejected") : "In progress")}
          </span>
        </div>
      </div>
      ${pathHtml}
      <div class="note-card">${escapeHtml(state.currentSimulation.reason)}</div>
    </div>
  `;

  updateDfaGraphHighlights();
}

function updateDfaGraphHighlights(): void {
  const highlighted = new Set<string>();
  if (state.currentConversion !== null && state.currentSubsetStep > 0) {
    const step = state.currentConversion.subsetConstruction.steps[state.currentSubsetStep - 1];
    if (step !== undefined) {
      highlighted.add(step.sourceStateId);
      if (step.targetStateId !== null) {
        highlighted.add(step.targetStateId);
      }
    }
  }

  const activeState = currentSimulationStateId();
  d3.select(dfaCanvas)
    .selectAll<SVGGElement, GraphNode>(".node")
    .classed("highlight", (node) => highlighted.has(node.id))
    .classed("active", (node) => node.id === activeState);
}

function currentSimulationStateId(): string | null {
  if (state.currentSimulation === null || state.currentConversion === null) {
    return null;
  }

  if (state.currentSimStep === 0) {
    return state.currentConversion.dfa.start;
  }

  const step = state.currentSimulation.path[state.currentSimStep - 1];
  if (step === undefined) {
    return state.currentSimulation.finalState;
  }

  return step.to ?? step.from;
}

function renderDfaStepper(): void {
  const conversion = state.currentConversion;
  if (conversion === null) {
    dfaStepper.innerHTML = "";
    return;
  }

  const stepsCount = conversion.subsetConstruction.steps.length;
  const currentStep =
    state.currentSubsetStep === 0 ? null : conversion.subsetConstruction.steps[state.currentSubsetStep - 1] ?? null;

  dfaStepper.innerHTML = `
    <div class="stepper-shell">
      <div class="stepper-toolbar">
        <span class="badge">Step ${state.currentSubsetStep} / ${stepsCount}</span>
        <div class="stepper-buttons">
          <button id="subset-prev" type="button" ${state.currentSubsetStep === 0 ? "disabled" : ""}>Previous</button>
          <button id="subset-next" type="button" ${
            state.currentSubsetStep >= stepsCount ? "disabled" : ""
          }>Next</button>
        </div>
      </div>
      ${
        currentStep === null
          ? `
            <div class="detail-card">
              <strong>Initial closure</strong>
              <span class="mono-inline">{ ${conversion.subsetConstruction.startClosure.join(", ")} }</span>
            </div>
          `
          : renderSubsetStep(currentStep)
      }
    </div>
  `;

  mustElement<HTMLButtonElement>("subset-prev").addEventListener("click", () => {
    if (state.currentSubsetStep > 0) {
      state.currentSubsetStep -= 1;
      renderDfaStepper();
      updateDfaGraphHighlights();
    }
  });

  mustElement<HTMLButtonElement>("subset-next").addEventListener("click", () => {
    if (state.currentConversion !== null && state.currentSubsetStep < state.currentConversion.subsetConstruction.steps.length) {
      state.currentSubsetStep += 1;
      renderDfaStepper();
      updateDfaGraphHighlights();
    }
  });
}

function renderSubsetStep(step: SubsetConstructionStep): string {
  return `
    <div class="detail-grid">
      <div class="detail-card">
        <strong>Source state</strong>
        <span class="mono-inline">${escapeHtml(step.sourceStateId)}</span>
      </div>
      <div class="detail-card">
        <strong>Input symbol</strong>
        <span class="mono-inline">${escapeHtml(step.symbol)}</span>
      </div>
      <div class="detail-card">
        <strong>Move set</strong>
        <span class="mono-inline">${escapeHtml(setText(step.moveSet))}</span>
      </div>
      <div class="detail-card">
        <strong>Epsilon-closure</strong>
        <span class="mono-inline">${escapeHtml(setText(step.closureSet))}</span>
      </div>
      <div class="detail-card">
        <strong>Target</strong>
        <span class="mono-inline">${escapeHtml(step.targetStateId ?? "none")}</span>
      </div>
      <div class="detail-card">
        <strong>State creation</strong>
        <span class="badge ${step.createdTarget ? "accept" : ""}">${
          step.createdTarget ? "New DFA state" : "Existing DFA state"
        }</span>
      </div>
    </div>
    <div class="note-card">${escapeHtml(step.explanation)}</div>
  `;
}

function renderPartitions(): void {
  const conversion = state.currentConversion;
  if (conversion === null) {
    dfaPartitions.innerHTML = "";
    return;
  }

  dfaPartitions.innerHTML = `
    <div class="partition-shell">
      <div class="partition-card">
        <strong>Initial partitions</strong>
        <span class="mono-inline">${escapeHtml(formatPartitionGroups(conversion.minimization.initialPartitions))}</span>
      </div>
      ${conversion.minimization.rounds
        .map(
          (round) => `
            <div class="partition-card">
              <strong>Round ${round.round}</strong>
              <div><span class="muted">Before</span> <span class="mono-inline">${escapeHtml(
                formatPartitionGroups(round.before)
              )}</span></div>
              <div><span class="muted">After</span> <span class="mono-inline">${escapeHtml(
                formatPartitionGroups(round.after)
              )}</span></div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderInsights(conversion: ConversionResult): void {
  const accepted = conversion.insights.acceptedExamples
    .map((example) => `<span class="chip accept">${escapeHtml(example.printable)}</span>`)
    .join("");
  const rejected = conversion.insights.rejectedExamples
    .map((example) => `<span class="chip reject">${escapeHtml(example.printable)}</span>`)
    .join("");

  insightsView.innerHTML = `
    <div class="summary-shell">
      <div class="detail-card">
        <strong>Shortest accepted</strong>
        ${formatExample(conversion.insights.shortestAccepted)}
      </div>
      <div class="detail-card">
        <strong>Shortest rejected</strong>
        ${formatExample(conversion.insights.shortestRejected)}
      </div>
      <div class="detail-card">
        <strong>Accepted samples</strong>
        <div class="chip-row">${accepted || '<span class="muted">none</span>'}</div>
      </div>
      <div class="detail-card">
        <strong>Rejected samples</strong>
        <div class="chip-row">${rejected || '<span class="muted">none</span>'}</div>
      </div>
    </div>
  `;
}

function renderComparison(result: RegexComparisonResult): void {
  const html = result.equivalent
    ? `
        <div class="summary-shell">
          <div class="cmp-eq">Equivalent languages.</div>
          <div class="note-card">${escapeHtml(result.explanation)}</div>
          <div class="detail-card">
            <strong>Checked alphabet</strong>
            <span class="mono-inline">${escapeHtml(
              result.checkedAlphabet.length === 0 ? "(empty)" : result.checkedAlphabet.join(", ")
            )}</span>
          </div>
        </div>
      `
    : `
        <div class="summary-shell">
          <div class="cmp-neq">Not equivalent.</div>
          <div class="note-card">${escapeHtml(result.explanation)}</div>
          <div class="detail-card">
            <strong>Counterexample</strong>
            ${formatExample(result.witness)}
          </div>
          <div class="detail-card">
            <strong>Witness verdicts</strong>
            <div class="chip-row">
              <span class="chip ${result.leftAcceptsWitness ? "accept" : "reject"}">Left: ${String(
                result.leftAcceptsWitness
              )}</span>
              <span class="chip ${result.rightAcceptsWitness ? "accept" : "reject"}">Right: ${String(
                result.rightAcceptsWitness
              )}</span>
            </div>
          </div>
        </div>
      `;

  compareOutput.innerHTML = html;
  compareOutputMirror.innerHTML = html;
}

function renderComparisonError(message: string): void {
  const html = `<div class="note-card">${escapeHtml(message)}</div>`;
  compareOutput.innerHTML = html;
  compareOutputMirror.innerHTML = html;
}

function renderBatchResult(result: BatchSimulationResult): void {
  const rows = result.cases
    .map(
      (row) => `
        <tr>
          <td><code>${escapeHtml(printableInput(row.input))}</code></td>
          <td class="${row.accepted ? "ok" : "no"}">${row.accepted ? "accept" : "reject"}</td>
          <td>${escapeHtml(row.finalState)}</td>
          <td>${row.pathLength}</td>
        </tr>
      `
    )
    .join("");

  batchOutput.innerHTML = `
    <div class="batch-summary">
      <span class="badge">Total ${result.summary.total}</span>
      <span class="badge accept">Accepted ${result.summary.accepted}</span>
      <span class="badge reject">Rejected ${result.summary.rejected}</span>
      <span class="badge">${(result.summary.acceptanceRate * 100).toFixed(1)}%</span>
    </div>
    <table class="trace-table">
      <thead>
        <tr>
          <th>Input</th>
          <th>Verdict</th>
          <th>Final state</th>
          <th>Steps</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderCfgResult(result: CfgParseResult): void {
  cfgStatusMetric.textContent = result.accepted ? "accept" : "reject";
  cfgAmbiguityMetric.textContent = result.ambiguous ? "ambiguous" : "single";
  cfgParseCountMetric.textContent = String(result.parseCount);
  cfgTokenCountMetric.textContent = String(result.tokens.length);

  if (result.tree === null) {
    cfgTreeCanvas.innerHTML = `<div class="note-card">No parse tree was found for the input.</div>`;
  } else {
    cfgTreeCanvas.innerHTML = renderParseTreeSvg(result.tree);
  }

  renderCfgDerivationPanel(cfgLeftDerivation, "cfg-left", result.leftmostDerivation, state.currentCfgLeftStep);
  renderCfgDerivationPanel(cfgRightDerivation, "cfg-right", result.rightmostDerivation, state.currentCfgRightStep);

  cfgProductions.innerHTML = `
    <div class="summary-shell">
      <div class="detail-card">
        <strong>Start symbol</strong>
        <span class="mono-inline">${escapeHtml(result.grammar.startSymbol)}</span>
      </div>
      <div class="detail-card">
        <strong>Tokens</strong>
        <div class="cfg-token-row">
          ${
            result.tokens.length === 0
              ? '<span class="chip">epsilon</span>'
              : result.tokens.map((token) => `<span class="chip">${escapeHtml(token)}</span>`).join("")
          }
        </div>
      </div>
      <div class="production-list">
        ${result.grammar.productions
          .map(
            (production) => `
              <div class="production-row">
                <span class="mono-inline">${escapeHtml(production.head)}</span>
                <span class="mono-inline">${escapeHtml(production.printable)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  cfgNotes.innerHTML = `
    <div class="note-list">
      ${result.notes.map((note) => `<div class="note-card">${escapeHtml(note)}</div>`).join("")}
    </div>
  `;
}

function renderCfgError(message: string): void {
  cfgStatusMetric.textContent = "error";
  cfgAmbiguityMetric.textContent = "-";
  cfgParseCountMetric.textContent = "-";
  cfgTokenCountMetric.textContent = "-";
  cfgTreeCanvas.innerHTML = `<div class="note-card">${escapeHtml(message)}</div>`;
  cfgLeftDerivation.innerHTML = "";
  cfgRightDerivation.innerHTML = "";
  cfgProductions.innerHTML = "";
  cfgNotes.innerHTML = `<div class="note-card">${escapeHtml(message)}</div>`;
}

function renderCfgDerivationPanel(
  container: HTMLElement,
  prefix: "cfg-left" | "cfg-right",
  derivation: CfgParseResult["leftmostDerivation"],
  currentStep: number
): void {
  if (derivation.length === 0) {
    container.innerHTML = `<div class="note-card">No derivation is available because the input was rejected.</div>`;
    return;
  }

  const boundedStep = Math.min(currentStep, derivation.length - 1);
  const step = derivation[boundedStep]!;

  container.innerHTML = `
    <div class="stepper-shell">
      <div class="stepper-toolbar">
        <span class="badge">Step ${boundedStep} / ${derivation.length - 1}</span>
        <div class="stepper-buttons">
          <button id="${prefix}-prev" type="button" ${boundedStep === 0 ? "disabled" : ""}>Prev</button>
          <button id="${prefix}-next" type="button" ${
            boundedStep >= derivation.length - 1 ? "disabled" : ""
          }>Next</button>
        </div>
      </div>
      <div class="derivation-card active-derivation">
        <strong>${boundedStep === 0 ? "Start symbol" : `Expansion ${boundedStep}`}</strong>
        ${
          step.production === null
            ? `<span class="muted">Initial sentential form</span>`
            : `<span class="muted">${escapeHtml(step.production)}</span>`
        }
        <span class="sentential">${escapeHtml(step.sententialForm.length === 0 ? "ε" : step.sententialForm.join(" "))}</span>
      </div>
      <div class="derivation-shell compact">
        ${derivation
          .map(
            (entry, index) => `
              <button
                type="button"
                class="derivation-jump ${index === boundedStep ? "active" : ""}"
                data-derivation-index="${index}"
              >
                <span class="badge">#${index}</span>
                <span>${escapeHtml(entry.sententialForm.length === 0 ? "ε" : entry.sententialForm.join(" "))}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  const prev = mustDescendant<HTMLButtonElement>(container, `#${prefix}-prev`);
  const next = mustDescendant<HTMLButtonElement>(container, `#${prefix}-next`);

  prev.addEventListener("click", () => {
    if (prefix === "cfg-left") {
      state.currentCfgLeftStep = Math.max(0, boundedStep - 1);
    } else {
      state.currentCfgRightStep = Math.max(0, boundedStep - 1);
    }
    if (state.currentCfgResult !== null) {
      renderCfgResult(state.currentCfgResult);
    }
  });

  next.addEventListener("click", () => {
    if (prefix === "cfg-left") {
      state.currentCfgLeftStep = Math.min(derivation.length - 1, boundedStep + 1);
    } else {
      state.currentCfgRightStep = Math.min(derivation.length - 1, boundedStep + 1);
    }
    if (state.currentCfgResult !== null) {
      renderCfgResult(state.currentCfgResult);
    }
  });

  Array.from(container.querySelectorAll<HTMLButtonElement>("[data-derivation-index]")).forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.derivationIndex);
      if (prefix === "cfg-left") {
        state.currentCfgLeftStep = index;
      } else {
        state.currentCfgRightStep = index;
      }
      if (state.currentCfgResult !== null) {
        renderCfgResult(state.currentCfgResult);
      }
    });
  });
}

function renderPdaResult(result: PdaSimulationResult): void {
  pdaStatusMetric.textContent = result.accepted ? "accept" : "reject";
  pdaConfigsMetric.textContent = String(result.exploredConfigurations);
  pdaStepsMetric.textContent = String(result.steps.length);
  pdaFinalMetric.textContent = result.finalState;
  pdaStepLabel.textContent = `${state.currentPdaStep} / ${result.steps.length}`;
  pdaStepPlayBtn.textContent = state.pdaPlaybackTimer === null ? "Play" : "Pause";

  pdaSummary.innerHTML = `
    <div class="summary-shell">
      <div class="detail-card">
        <strong>Reason</strong>
        <div>${escapeHtml(result.reason)}</div>
      </div>
      <div class="detail-card">
        <strong>Consumed input</strong>
        <span class="mono-inline">${result.consumed} / ${result.tokens.length}</span>
      </div>
      <div class="detail-card">
        <strong>Final stack</strong>
        <div class="chip-row">
          ${
            result.finalStack.length === 0
              ? '<span class="chip">empty</span>'
              : result.finalStack
                  .slice()
                  .reverse()
                  .map((symbol) => `<span class="stack-pill">${escapeHtml(symbol)}</span>`)
                  .join("")
          }
        </div>
      </div>
      ${result.notes.map((note) => `<div class="note-card">${escapeHtml(note)}</div>`).join("")}
    </div>
  `;

  renderAutomaton(pdaGraph, buildPdaGraph(result));

  pdaTransitions.innerHTML = `
    <table class="trace-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>From</th>
          <th>Read</th>
          <th>Top</th>
          <th>To</th>
          <th>Push</th>
        </tr>
      </thead>
      <tbody>
        ${result.machine.transitions
          .map(
            (transition) => `
              <tr>
                <td>${escapeHtml(transition.id)}</td>
                <td>${escapeHtml(transition.from)}</td>
                <td>${escapeHtml(transition.input ?? "ε")}</td>
                <td>${escapeHtml(transition.stackTop)}</td>
                <td>${escapeHtml(transition.to)}</td>
                <td>${escapeHtml(transition.push.length === 0 ? "ε" : transition.push.join(" "))}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
  renderPdaStepView();
}

function renderPdaError(message: string): void {
  stopPdaPlayback();
  pdaStatusMetric.textContent = "error";
  pdaConfigsMetric.textContent = "-";
  pdaStepsMetric.textContent = "-";
  pdaFinalMetric.textContent = "-";
  pdaStepLabel.textContent = "0 / 0";
  pdaStepPrevBtn.disabled = true;
  pdaStepPlayBtn.disabled = true;
  pdaStepNextBtn.disabled = true;
  pdaSummary.innerHTML = `<div class="note-card">${escapeHtml(message)}</div>`;
  pdaGraph.innerHTML = "";
  pdaTransitions.innerHTML = "";
  pdaTrace.innerHTML = "";
}

function renderPdaStepView(): void {
  const result = state.currentPdaResult;
  if (result === null) {
    return;
  }

  const currentStep = Math.min(state.currentPdaStep, result.steps.length);
  pdaStepLabel.textContent = `${currentStep} / ${result.steps.length}`;
  pdaStepPlayBtn.textContent = state.pdaPlaybackTimer === null ? "Play" : "Pause";
  pdaStepPrevBtn.disabled = currentStep === 0;
  pdaStepNextBtn.disabled = currentStep >= result.steps.length;
  pdaStepPlayBtn.disabled = result.steps.length === 0;

  const step = currentStep === 0 ? null : result.steps[currentStep - 1] ?? null;
  const currentState = step === null ? result.machine.startState : step.toState;
  highlightGraphState(pdaGraph, currentState);

  pdaTrace.innerHTML =
    result.steps.length === 0
      ? `<div class="note-card">No transitions executed.</div>`
      : `
          <div class="summary-shell">
            <div class="detail-grid">
              <div class="detail-card">
                <strong>Current state</strong>
                <span class="mono-inline">${escapeHtml(currentState)}</span>
              </div>
              <div class="detail-card">
                <strong>Phase</strong>
                <span class="mono-inline">${currentStep === 0 ? "initial" : `step ${currentStep}`}</span>
              </div>
            </div>
            ${
              step === null
                ? `<div class="note-card">Initial configuration with stack ${escapeHtml(
                    formatStack([result.machine.stackStart])
                  )} and input ${escapeHtml(result.tokens.join(" ") || "ε")}.</div>`
                : `
                    <div class="detail-grid">
                      <div class="detail-card">
                        <strong>Consumed symbol</strong>
                        <span class="mono-inline">${escapeHtml(step.consumedInput ?? "ε")}</span>
                      </div>
                      <div class="detail-card">
                        <strong>Transition</strong>
                        <span class="mono-inline">${escapeHtml(step.transitionId)}</span>
                      </div>
                      <div class="detail-card">
                        <strong>Remaining input</strong>
                        <span class="mono-inline">${escapeHtml(step.remainingInput.join(" ") || "ε")}</span>
                      </div>
                      <div class="detail-card">
                        <strong>Stack after</strong>
                        <span class="mono-inline">${escapeHtml(formatStack(step.stackAfter))}</span>
                      </div>
                    </div>
                  `
            }
            <table class="trace-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Transition</th>
                  <th>Move</th>
                  <th>Remaining input</th>
                  <th>Stack before</th>
                  <th>Stack after</th>
                </tr>
              </thead>
              <tbody>
                ${result.steps
                  .map(
                    (entry) => `
                      <tr class="${entry.step === currentStep ? "tm-trace-row selected" : ""}" data-pda-step="${entry.step}">
                        <td>${entry.step}</td>
                        <td>${escapeHtml(entry.transitionId)}</td>
                        <td>${escapeHtml(entry.fromState)} -> ${escapeHtml(entry.toState)} on ${escapeHtml(
                          entry.consumedInput ?? "ε"
                        )}</td>
                        <td>${escapeHtml(entry.remainingInput.join(" ") || "ε")}</td>
                        <td>${escapeHtml(formatStack(entry.stackBefore))}</td>
                        <td>${escapeHtml(formatStack(entry.stackAfter))}</td>
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `;

  Array.from(pdaTrace.querySelectorAll<HTMLElement>("[data-pda-step]")).forEach((row) => {
    row.addEventListener("click", () => {
      stopPdaPlayback();
      state.currentPdaStep = Number(row.dataset.pdaStep);
      renderPdaStepView();
    });
  });
}

function togglePdaPlayback(): void {
  if (state.currentPdaResult === null) {
    return;
  }

  if (state.pdaPlaybackTimer !== null) {
    stopPdaPlayback();
    renderPdaStepView();
    return;
  }

  if (state.currentPdaStep >= state.currentPdaResult.steps.length) {
    state.currentPdaStep = 0;
  }

  state.pdaPlaybackTimer = window.setInterval(() => {
    if (state.currentPdaResult === null) {
      stopPdaPlayback();
      return;
    }

    if (state.currentPdaStep >= state.currentPdaResult.steps.length) {
      stopPdaPlayback();
      renderPdaStepView();
      return;
    }

    state.currentPdaStep += 1;
    renderPdaStepView();
  }, 700);

  renderPdaStepView();
}

function stopPdaPlayback(): void {
  if (state.pdaPlaybackTimer !== null) {
    window.clearInterval(state.pdaPlaybackTimer);
    state.pdaPlaybackTimer = null;
  }
  pdaStepPlayBtn.textContent = "Play";
}

function buildPdaGraph(result: PdaSimulationResult): RenderableAutomaton {
  return {
    states: result.machine.states.map((stateId) => ({
      id: stateId,
      label: stateId,
      isStart: stateId === result.machine.startState,
      isAccept: result.machine.acceptStates.includes(stateId)
    })),
    transitions: result.machine.transitions.map((transition) => ({
      id: transition.id,
      from: transition.from,
      to: transition.to,
      label: `${transition.input ?? "ε"}, ${transition.stackTop} -> ${
        transition.push.length === 0 ? "ε" : transition.push.join("")
      }`
    }))
  };
}

function renderTuringResult(result: TuringSimulationResult): void {
  tmStatusMetric.textContent = result.accepted ? "accept" : result.maxStepsReached ? "limit" : "reject";
  tmStepsMetric.textContent = String(result.steps.length);
  tmHeadMetric.textContent = String(result.head);
  tmFinalMetric.textContent = result.finalState;

  tmStepSlider.max = String(result.steps.length);
  tmStepSlider.value = String(state.currentTmStep);
  tmStepLabel.textContent = `${state.currentTmStep} / ${result.steps.length}`;
  tmStepPlayBtn.textContent = state.tmPlaybackTimer === null ? "Play" : "Pause";

  tmSummary.innerHTML = `
    <div class="summary-grid two">
      <div class="detail-card">
        <strong>Reason</strong>
        <div>${escapeHtml(result.reason)}</div>
      </div>
      <div class="detail-card">
        <strong>Final tape</strong>
        <span class="mono-inline">${escapeHtml(result.tape)}</span>
      </div>
      ${result.notes.map((note) => `<div class="note-card">${escapeHtml(note)}</div>`).join("")}
    </div>
  `;

  renderAutomaton(tmGraph, buildTuringGraph(result));

  tmTransitions.innerHTML = `
    <table class="trace-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>From</th>
          <th>Read</th>
          <th>Write</th>
          <th>Move</th>
          <th>To</th>
        </tr>
      </thead>
      <tbody>
        ${result.machine.transitions
          .map(
            (transition) => `
              <tr>
                <td>${escapeHtml(transition.id)}</td>
                <td>${escapeHtml(transition.from)}</td>
                <td>${escapeHtml(transition.read)}</td>
                <td>${escapeHtml(transition.write)}</td>
                <td>${escapeHtml(transition.move)}</td>
                <td>${escapeHtml(transition.to)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  renderTmStepView();
}

function renderTmStepView(): void {
  const result = state.currentTmResult;
  if (result === null) {
    return;
  }

  tmStepLabel.textContent = `${state.currentTmStep} / ${result.steps.length}`;
  const selectedStep = state.currentTmStep === 0 ? null : result.steps[state.currentTmStep - 1] ?? null;
  const windowCells = selectedStep === null ? buildInitialTapeWindow(result) : selectedStep.window;
  const stateLabel = selectedStep === null ? result.machine.startState : selectedStep.toState;
  const headLabel = selectedStep === null ? 0 : selectedStep.headAfter;
  tmStepPlayBtn.textContent = state.tmPlaybackTimer === null ? "Play" : "Pause";
  tmStepPrevBtn.disabled = state.currentTmStep === 0;
  tmStepNextBtn.disabled = state.currentTmStep >= result.steps.length;
  tmStepPlayBtn.disabled = result.steps.length === 0;
  tmStepResetBtn.disabled = state.currentTmStep === 0;
  const stepNote =
    selectedStep === null
      ? "Initial configuration."
      : `${selectedStep.fromState} -- ${selectedStep.read}/${selectedStep.write}, ${selectedStep.move} -> ${selectedStep.toState}`;

  highlightGraphState(tmGraph, stateLabel);

  tmTape.innerHTML = `
    <div class="summary-shell">
      <div class="detail-grid">
        <div class="detail-card">
          <strong>Current state</strong>
          <span class="mono-inline">${escapeHtml(stateLabel)}</span>
        </div>
        <div class="detail-card">
          <strong>Head index</strong>
          <span class="mono-inline">${headLabel}</span>
        </div>
      </div>
      <div class="tape-track">
        ${windowCells
          .map(
            (cell) => `
              <div class="tape-cell ${cell.head ? "head" : ""}">
                <strong>${escapeHtml(cell.symbol)}</strong>
                <span>${cell.index}</span>
              </div>
            `
          )
          .join("")}
      </div>
      <div class="note-card">${escapeHtml(stepNote)}</div>
    </div>
  `;

  tmTrace.innerHTML = `
    <table class="trace-table">
      <thead>
        <tr>
          <th>Step</th>
          <th>Transition</th>
          <th>Head</th>
          <th>Window center</th>
        </tr>
      </thead>
      <tbody>
        ${result.steps
          .map(
            (step) => `
              <tr class="tm-trace-row ${step.step === state.currentTmStep ? "selected" : ""}" data-step="${step.step}">
                <td>${step.step}</td>
                <td>${escapeHtml(step.fromState)} -- ${escapeHtml(step.read)}/${escapeHtml(
                  step.write
                )}, ${escapeHtml(step.move)} -> ${escapeHtml(step.toState)}</td>
                <td>${step.headAfter}</td>
                <td>${escapeHtml(step.window.find((cell) => cell.head)?.symbol ?? result.machine.blank)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  Array.from(tmTrace.querySelectorAll<HTMLElement>("[data-step]")).forEach((row) => {
    row.addEventListener("click", () => {
      const value = Number(row.dataset.step);
      state.currentTmStep = value;
      tmStepSlider.value = String(value);
      renderTmStepView();
    });
  });
}

function renderTmError(message: string): void {
  stopTmPlayback();
  tmStatusMetric.textContent = "error";
  tmStepsMetric.textContent = "-";
  tmHeadMetric.textContent = "-";
  tmFinalMetric.textContent = "-";
  tmStepLabel.textContent = "0 / 0";
  tmStepPrevBtn.disabled = true;
  tmStepPlayBtn.disabled = true;
  tmStepNextBtn.disabled = true;
  tmStepResetBtn.disabled = true;
  tmTape.innerHTML = `<div class="note-card">${escapeHtml(message)}</div>`;
  tmGraph.innerHTML = "";
  tmTransitions.innerHTML = "";
  tmSummary.innerHTML = "";
  tmTrace.innerHTML = "";
}

function toggleTmPlayback(): void {
  if (state.currentTmResult === null) {
    return;
  }

  if (state.tmPlaybackTimer !== null) {
    stopTmPlayback();
    renderTmStepView();
    return;
  }

  if (state.currentTmStep >= state.currentTmResult.steps.length) {
    state.currentTmStep = 0;
    tmStepSlider.value = "0";
  }

  state.tmPlaybackTimer = window.setInterval(() => {
    if (state.currentTmResult === null) {
      stopTmPlayback();
      return;
    }

    if (state.currentTmStep >= state.currentTmResult.steps.length) {
      stopTmPlayback();
      renderTmStepView();
      return;
    }

    state.currentTmStep += 1;
    tmStepSlider.value = String(state.currentTmStep);
    renderTmStepView();
  }, 700);

  renderTmStepView();
}

function stopTmPlayback(): void {
  if (state.tmPlaybackTimer !== null) {
    window.clearInterval(state.tmPlaybackTimer);
    state.tmPlaybackTimer = null;
  }
  tmStepPlayBtn.textContent = "Play";
}

function buildTuringGraph(result: TuringSimulationResult): RenderableAutomaton {
  return {
    states: result.machine.states.map((stateId) => ({
      id: stateId,
      label: stateId,
      isStart: stateId === result.machine.startState,
      isAccept: result.machine.acceptStates.includes(stateId)
    })),
    transitions: result.machine.transitions.map((transition) => ({
      id: transition.id,
      from: transition.from,
      to: transition.to,
      label: `${transition.read}/${transition.write}, ${transition.move}`
    }))
  };
}

function renderAutomaton(container: HTMLElement, automaton: Automaton): void {
  container.innerHTML = "";
  const width = 760;
  const height = 380;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const rootGroup = svg.append("g");
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => {
      rootGroup.attr("transform", event.transform);
    });

  svg.call(zoom);

  const nodes: GraphNode[] = automaton.states.map((stateNode) => ({
    id: String(stateNode.id),
    label: stateNode.label,
    isStart: stateNode.isStart,
    isAccept: stateNode.isAccept,
    isDead: "isDead" in stateNode && stateNode.isDead === true
  }));

  const links: GraphLink[] = automaton.transitions.map((transition) => ({
    id: transition.id,
    source: String(transition.from),
    target: String(transition.to),
    label: transition.label
  }));

  const markerId = `arrow-${Math.random().toString(36).slice(2)}`;

  svg
    .append("defs")
    .append("marker")
    .attr("id", markerId)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 24)
    .attr("refY", 0)
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#4e5f74");

  const link = rootGroup
    .append("g")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", "edge")
    .attr("marker-end", `url(#${markerId})`);

  const edgeLabel = rootGroup
    .append("g")
    .selectAll("text")
    .data(links)
    .join("text")
    .attr("class", "edge-label")
    .text((edge) => edge.label);

  const node = rootGroup
    .append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("class", (stateNode) => `node${stateNode.isAccept ? " accept" : ""}${stateNode.isDead ? " dead" : ""}`)
    .attr("data-state-id", (stateNode) => stateNode.id);

  node.append("circle").attr("r", 22);
  node
    .filter((stateNode) => stateNode.isAccept)
    .append("circle")
    .attr("r", 16)
    .attr("class", "accept-ring");
  node.append("text").attr("dy", "0.35em").text((stateNode) => stateNode.id);
  node.append("title").text((stateNode) => stateNode.label);

  const startLinks = rootGroup
    .append("g")
    .selectAll("line")
    .data(nodes.filter((stateNode) => stateNode.isStart))
    .join("line")
    .attr("class", "start-arrow")
    .attr("marker-end", `url(#${markerId})`);

  const drag = d3
    .drag<SVGGElement, GraphNode>()
    .on("start", (event, datum) => {
      if (!event.active) {
        simulation.alphaTarget(0.25).restart();
      }
      datum.fx = datum.x;
      datum.fy = datum.y;
    })
    .on("drag", (event, datum) => {
      datum.fx = event.x;
      datum.fy = event.y;
    })
    .on("end", (event, datum) => {
      if (!event.active) {
        simulation.alphaTarget(0);
      }
      datum.fx = null;
      datum.fy = null;
    });

  node.call(drag as any);

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink<GraphNode, GraphLink>(links).id((item) => item.id).distance(122))
    .force("charge", d3.forceManyBody().strength(-860))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide(48))
    .on("tick", () => {
      link.attr("d", edgePath);
      edgeLabel.attr("x", edgeLabelX).attr("y", edgeLabelY);
      node.attr("transform", (stateNode) => `translate(${stateNode.x ?? width / 2},${stateNode.y ?? height / 2})`);
      startLinks
        .attr("x1", (stateNode) => (stateNode.x ?? 0) - 56)
        .attr("y1", (stateNode) => stateNode.y ?? 0)
        .attr("x2", (stateNode) => (stateNode.x ?? 0) - 30)
        .attr("y2", (stateNode) => stateNode.y ?? 0);
    });

  setTimeout(() => simulation.stop(), 2200);
}

function highlightGraphState(container: HTMLElement, stateId: string | null): void {
  d3.select(container)
    .selectAll<SVGGElement, GraphNode>(".node")
    .classed("active", (node) => stateId !== null && node.id === stateId)
    .classed("highlight", false);
}

function edgePath(edge: GraphLink): string {
  const source = edge.source as GraphNode;
  const target = edge.target as GraphNode;
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;

  if (source.id === target.id) {
    return `M${sx},${sy - 24} C${sx + 48},${sy - 84} ${sx + 96},${sy - 8} ${sx + 24},${sy}`;
  }

  const dx = tx - sx;
  const dy = ty - sy;
  const radius = Math.sqrt(dx * dx + dy * dy) * 1.35;
  return `M${sx},${sy} A${radius},${radius} 0 0,1 ${tx},${ty}`;
}

function edgeLabelX(edge: GraphLink): number {
  const source = edge.source as GraphNode;
  const target = edge.target as GraphNode;
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;

  if (source.id === target.id) {
    return sx + 60;
  }

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) {
    return sx;
  }

  const midX = (sx + tx) / 2;
  const radius = dist * 1.35;
  const hump = radius - Math.sqrt(radius * radius - (dist / 2) * (dist / 2));
  const normalX = -dy / dist;

  return midX + normalX * hump;
}

function edgeLabelY(edge: GraphLink): number {
  const source = edge.source as GraphNode;
  const target = edge.target as GraphNode;
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;

  if (source.id === target.id) {
    return sy - 60;
  }

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) {
    return sy;
  }

  const midY = (sy + ty) / 2;
  const radius = dist * 1.35;
  const hump = radius - Math.sqrt(radius * radius - (dist / 2) * (dist / 2));
  const normalY = dx / dist;

  return midY + normalY * hump - 4;
}

function renderParseTreeSvg(tree: CfgParseTreeNode): string {
  const layout = buildTreeLayout(tree);
  const depth = maxTreeDepth(layout);
  const width = Math.max(760, layout.width * 120 + 120);
  const height = Math.max(300, (depth + 1) * 110 + 80);
  const edges: string[] = [];
  const nodes: string[] = [];

  walkTreeLayout(layout, (nodeLayout) => {
    const px = nodeLayout.x * 120 + 60;
    const py = nodeLayout.y * 110 + 44;
    for (const child of nodeLayout.children) {
      const cx = child.x * 120 + 60;
      const cy = child.y * 110 + 44;
      edges.push(`<line class="tree-edge" x1="${px}" y1="${py}" x2="${cx}" y2="${cy}" />`);
    }

    const labelWidth = Math.max(72, nodeLayout.node.symbol.length * 12 + 24);
    nodes.push(`
      <g class="tree-node ${escapeHtml(nodeLayout.node.kind)}" transform="translate(${px}, ${py})">
        <rect x="${-labelWidth / 2}" y="-18" width="${labelWidth}" height="36" rx="12" ry="12"></rect>
        <text x="0" y="1">${escapeHtml(nodeLayout.node.symbol)}</text>
      </g>
    `);
  });

  return `
    <div class="tree-wrapper">
      <svg class="tree-svg" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <g>
          ${edges.join("")}
          ${nodes.join("")}
        </g>
      </svg>
    </div>
  `;
}

function buildTreeLayout(node: CfgParseTreeNode, depth = 0, start = 0): TreeLayoutNode {
  if (node.children.length === 0) {
    return {
      node,
      x: start + 0.5,
      y: depth,
      width: 1,
      children: []
    };
  }

  let cursor = start;
  const children = node.children.map((child) => {
    const childLayout = buildTreeLayout(child, depth + 1, cursor);
    cursor += childLayout.width;
    return childLayout;
  });

  const width = children.reduce((sum, child) => sum + child.width, 0);
  const x = (children[0]!.x + children[children.length - 1]!.x) / 2;

  return {
    node,
    x,
    y: depth,
    width,
    children
  };
}

function walkTreeLayout(node: TreeLayoutNode, visit: (node: TreeLayoutNode) => void): void {
  visit(node);
  node.children.forEach((child) => {
    walkTreeLayout(child, visit);
  });
}

function maxTreeDepth(node: TreeLayoutNode): number {
  if (node.children.length === 0) {
    return node.y;
  }

  return Math.max(...node.children.map((child) => maxTreeDepth(child)));
}

async function exportCurrentSvgs(): Promise<void> {
  const targets = currentSvgTargets();
  if (targets.length === 0) {
    setStatus("No SVG export is available for the current tab.");
    return;
  }

  for (const target of targets) {
    downloadSvg(target.svg, target.fileName);
  }

  setStatus(`Exported ${targets.length} SVG file${targets.length === 1 ? "" : "s"}.`);
}

async function exportCurrentPngs(): Promise<void> {
  const targets = currentSvgTargets();
  if (targets.length === 0) {
    setStatus("No PNG export is available for the current tab.");
    return;
  }

  await document.fonts.ready;
  for (const target of targets) {
    await downloadPng(target.svg, target.fileName.replace(/\.svg$/i, ".png"));
  }

  setStatus(`Exported ${targets.length} PNG file${targets.length === 1 ? "" : "s"}.`);
}

function exportCurrentJson(): void {
  const payload = currentJsonPayload();
  if (payload === null) {
    setStatus("No JSON payload is available for the current tab.");
    return;
  }

  const blob = new Blob([JSON.stringify(payload.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${payload.fileName}.`);
}

async function copyCurrentReport(): Promise<void> {
  const report = buildReport();
  await navigator.clipboard.writeText(report);
  setStatus("Copied report summary.");
}

function currentJsonPayload(): { fileName: string; data: unknown } | null {
  switch (state.activeTab) {
    case "regex":
      return state.currentConversion === null ? null : { fileName: "regex-lab.json", data: state.currentConversion };
    case "cfg":
      return state.currentCfgResult === null ? null : { fileName: "cfg-lab.json", data: state.currentCfgResult };
    case "pda":
      return state.currentPdaResult === null ? null : { fileName: "pda-lab.json", data: state.currentPdaResult };
    case "tm":
      return state.currentTmResult === null ? null : { fileName: "turing-lab.json", data: state.currentTmResult };
  }
}

function currentSvgTargets(): { svg: SVGSVGElement; fileName: string }[] {
  if (state.activeTab === "regex") {
    return [
      { container: nfaCanvas, fileName: "automata-nfa.svg" },
      { container: dfaCanvas, fileName: "automata-dfa.svg" },
      { container: minDfaCanvas, fileName: "automata-min-dfa.svg" }
    ]
      .map((target) => ({ svg: target.container.querySelector("svg"), fileName: target.fileName }))
      .filter((target): target is { svg: SVGSVGElement; fileName: string } => target.svg instanceof SVGSVGElement);
  }

  if (state.activeTab === "cfg") {
    const svg = cfgTreeCanvas.querySelector("svg");
    return svg instanceof SVGSVGElement ? [{ svg, fileName: "cfg-parse-tree.svg" }] : [];
  }

  if (state.activeTab === "pda") {
    const svg = pdaGraph.querySelector("svg");
    return svg instanceof SVGSVGElement ? [{ svg, fileName: "pda-machine.svg" }] : [];
  }

  if (state.activeTab === "tm") {
    const svg = tmGraph.querySelector("svg");
    return svg instanceof SVGSVGElement ? [{ svg, fileName: "turing-machine.svg" }] : [];
  }

  return [];
}

function buildReport(): string {
  switch (state.activeTab) {
    case "regex":
      return buildRegexReport();
    case "cfg":
      return buildCfgReport();
    case "pda":
      return buildPdaReport();
    case "tm":
      return buildTmReport();
  }
}

function buildRegexReport(): string {
  if (state.currentConversion === null) {
    return "Regex lab: no compiled conversion.";
  }

  const lines = [
    `Regex lab`,
    `Regex: ${state.currentConversion.regex}`,
    `Alphabet: ${state.currentConversion.dfa.alphabet.join(", ") || "(empty)"}`,
    `NFA states: ${state.currentConversion.nfa.states.length}`,
    `DFA states: ${state.currentConversion.dfa.states.length}`,
    `Minimized states: ${state.currentConversion.minimizedDfa.states.length}`,
    `Subset steps: ${state.currentConversion.subsetConstruction.steps.length}`
  ];

  if (state.currentSimulation !== null) {
    lines.push(`Latest simulation: ${state.currentSimulation.accepted ? "accept" : "reject"} on '${state.currentSimulation.input}'`);
  }

  return lines.join("\n");
}

function buildCfgReport(): string {
  if (state.currentCfgResult === null) {
    return "CFG lab: no parse result.";
  }

  return [
    "CFG lab",
    `Input: ${state.currentCfgResult.input || "<epsilon>"}`,
    `Accepted: ${state.currentCfgResult.accepted}`,
    `Ambiguous: ${state.currentCfgResult.ambiguous}`,
    `Parses found: ${state.currentCfgResult.parseCount}`,
    `Start symbol: ${state.currentCfgResult.grammar.startSymbol}`
  ].join("\n");
}

function buildPdaReport(): string {
  if (state.currentPdaResult === null) {
    return "PDA lab: no simulation result.";
  }

  return [
    "PDA lab",
    `Input: ${state.currentPdaResult.input || "<epsilon>"}`,
    `Accepted: ${state.currentPdaResult.accepted}`,
    `Final state: ${state.currentPdaResult.finalState}`,
    `Explored configurations: ${state.currentPdaResult.exploredConfigurations}`,
    `Reason: ${state.currentPdaResult.reason}`
  ].join("\n");
}

function buildTmReport(): string {
  if (state.currentTmResult === null) {
    return "Turing machine lab: no simulation result.";
  }

  return [
    "Turing machine lab",
    `Input: ${state.currentTmResult.input || "<epsilon>"}`,
    `Accepted: ${state.currentTmResult.accepted}`,
    `Final state: ${state.currentTmResult.finalState}`,
    `Head: ${state.currentTmResult.head}`,
    `Final tape: ${state.currentTmResult.tape}`
  ].join("\n");
}

function downloadSvg(svg: SVGSVGElement, fileName: string): void {
  const clone = inlineStyledSvg(svg);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function downloadPng(svg: SVGSVGElement, fileName: string): Promise<void> {
  const clone = inlineStyledSvg(svg);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const rect = svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const scale = Math.max(2, window.devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("PNG export failed: canvas context unavailable.");
    }
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    const pngUrl = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = pngUrl;
    anchor.download = fileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function inlineStyledSvg(svg: SVGSVGElement): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sourceNodes = [svg, ...Array.from(svg.querySelectorAll<SVGElement>("*"))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<SVGElement>("*"))];

  sourceNodes.forEach((sourceNode, index) => {
    const cloneNode = cloneNodes[index];
    if (cloneNode === undefined) {
      return;
    }

    const computed = getComputedStyle(sourceNode);
    const inline = EXPORT_STYLE_PROPERTIES.map((property) => {
      const value = computed.getPropertyValue(property);
      return value.length > 0 ? `${property}:${value};` : "";
    }).join("");

    const existing = cloneNode.getAttribute("style") ?? "";
    cloneNode.setAttribute("style", `${existing}${inline}`);
  });

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  if (!clone.hasAttribute("viewBox")) {
    const rect = svg.getBoundingClientRect();
    clone.setAttribute("viewBox", `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
  }

  const viewBox = clone.getAttribute("viewBox");
  if (viewBox !== null) {
    const numbers = viewBox.split(/\s+/).map((value) => Number(value));
    if (numbers.length === 4) {
      clone.setAttribute("width", String(numbers[2]));
      clone.setAttribute("height", String(numbers[3]));
    }
  }

  const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", "#fffdf9");

  const defs = clone.querySelector("defs");
  if (defs === null) {
    clone.insertBefore(background, clone.firstChild);
  } else {
    clone.insertBefore(background, defs.nextSibling);
  }

  return clone;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await readApiPayload<T>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }
  return payload;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await readApiPayload<T>(response);
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return payload;
}

async function readApiPayload<T>(response: Response): Promise<T & { error?: string }> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T & { error?: string };
  }

  const message = (await response.text()).trim();
  if (message.length > 0) {
    throw new Error(message);
  }

  throw new Error(`API returned ${contentType || "a non-JSON response"} instead of JSON.`);
}

function buildInitialTapeWindow(result: TuringSimulationResult) {
  const cells = [];
  const inputChars = Array.from(result.input);

  for (let index = -5; index <= 5; index += 1) {
    cells.push({
      index,
      symbol: index >= 0 && index < inputChars.length ? inputChars[index]! : result.machine.blank,
      head: index === 0
    });
  }

  return cells;
}

function formatExample(example: { printable: string; length: number } | null): string {
  if (example === null) {
    return '<span class="muted">none</span>';
  }

  return `<span class="mono-inline">${escapeHtml(example.printable)}</span> <span class="muted">len=${example.length}</span>`;
}

function formatStack(stack: string[]): string {
  return stack.length === 0 ? "empty" : `top [ ${stack.slice().reverse().join(" ")} ]`;
}

function formatPartitionGroups(groups: string[][]): string {
  return groups.map((group) => `{${group.join(", ")}}`).join(" ; ");
}

function printableInput(value: string): string {
  if (value.length === 0) {
    return "<epsilon>";
  }

  return value
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
    .replaceAll(" ", "\\s");
}

function setText(values: number[]): string {
  return values.length === 0 ? "{}" : `{${values.join(", ")}}`;
}

function tabLabel(tab: TabId): string {
  switch (tab) {
    case "regex":
      return "Regex Automata";
    case "cfg":
      return "CFG Parse Trees";
    case "pda":
      return "Pushdown Automata";
    case "tm":
      return "Turing Machine";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function setStatus(message: string): void {
  statusLine.textContent = message;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mustElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing element #${id}`);
  }

  return element as T;
}

function mustDescendant<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing descendant ${selector}`);
  }

  return element as T;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load SVG export image."));
    image.src = url;
  });
}
