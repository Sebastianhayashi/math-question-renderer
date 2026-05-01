/**
 * canvasState.js — Visual Reasoning Canvas data model & localStorage helpers.
 * Pure functions, no React, no DOM.
 */

export const CANVAS_STORAGE_KEY_PREFIX = "visual-reasoning-canvas-v1:";
export const CANVAS_ELEMENT_TYPES = {
  SOURCE: "source",
  OPTION: "option",
  NOTE: "note",
  CONDITION: "condition",
  GOAL: "goal",
  DERIVATION: "derivation",
  ANSWER: "answer",
  FORMULA: "formula",
  GRAPH_PLACEHOLDER: "graphPlaceholder",
  TABLE_PLACEHOLDER: "tablePlaceholder",
  MACHINE_VISUAL: "machineVisual",
  CHECKLIST: "checklist",
  GROUP: "group",
};

export const ELEMENT_TYPE_META = {
  source:           { label: "题目", color: "#2563eb", bg: "rgba(37,99,235,0.06)",  border: "rgba(37,99,235,0.18)" },
  option:           { label: "选项", color: "#475569", bg: "rgba(71,85,105,0.05)",  border: "rgba(71,85,105,0.15)" },
  note:             { label: "草稿", color: "#64748b", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.18)" },
  condition:        { label: "已知", color: "#1d4ed8", bg: "rgba(29,78,216,0.08)",  border: "rgba(29,78,216,0.22)" },
  goal:             { label: "目标", color: "#047857", bg: "rgba(4,120,87,0.08)",   border: "rgba(4,120,87,0.22)" },
  derivation:       { label: "推导", color: "#0369a1", bg: "rgba(3,105,161,0.08)",  border: "rgba(3,105,161,0.22)" },
  answer:           { label: "答案", color: "#b91c1c", bg: "rgba(185,28,28,0.08)",  border: "rgba(185,28,28,0.22)" },
  formula:          { label: "公式", color: "#7e22ce", bg: "rgba(126,34,206,0.08)", border: "rgba(126,34,206,0.22)" },
  graphPlaceholder: { label: "图形", color: "#0f766e", bg: "rgba(15,118,110,0.07)", border: "rgba(15,118,110,0.20)" },
  tablePlaceholder: { label: "表格", color: "#92400e", bg: "rgba(146,64,14,0.07)",  border: "rgba(146,64,14,0.20)" },
  machineVisual:    { label: "机器", color: "#6d28d9", bg: "rgba(109,40,217,0.07)", border: "rgba(109,40,217,0.20)" },
  checklist:        { label: "步骤", color: "#15803d", bg: "rgba(21,128,61,0.08)",  border: "rgba(21,128,61,0.22)" },
  group:            { label: "分组", color: "#0369a1", bg: "rgba(3,105,161,0.04)",  border: "rgba(3,105,161,0.14)" },
};

// Tool tag → element type mapping
export const TOOL_TAG_TO_ELEMENT_TYPE = {
  known:       "condition",
  unknown:     "note",
  target:      "goal",
  assumption:  "note",
  translate:   "derivation",
  infer:       "derivation",
  verify:      "checklist",
  answer:      "answer",
};

function _genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Element factory ──────────────────────────────────────────────────────────

export function createCanvasElement({ questionId = "", type, x = 0, y = 0, width = 240, height = 100, content = {}, locked = false }) {
  const now = Date.now();
  return {
    id: _genId(),
    questionId,
    type: type || CANVAS_ELEMENT_TYPES.NOTE,
    x, y, width, height,
    content: typeof content === "string" ? { text: content } : content,
    locked,
    collapsed: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createCanvasConnection({ questionId = "", fromId, toId, label = "", mode = "directed" }) {
  return {
    id: _genId(),
    questionId,
    fromId,
    toId,
    label,
    mode,
    createdAt: Date.now(),
  };
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function createEmptyCanvasState(questionId) {
  return {
    questionId: questionId || "",
    elements: [],
    connections: [],
    canvasHeight: typeof window !== "undefined" ? Math.max(window.innerHeight * 1.2, 900) : 900,
    updatedAt: Date.now(),
  };
}

// ─── localStorage ─────────────────────────────────────────────────────────────

export function loadCanvasState(questionId) {
  if (!questionId) return null;
  try {
    const raw = window.localStorage.getItem(CANVAS_STORAGE_KEY_PREFIX + questionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...createEmptyCanvasState(questionId),
      ...parsed,
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
    };
  } catch {
    return null;
  }
}

export function saveCanvasState(state) {
  if (!state?.questionId) return;
  try {
    window.localStorage.setItem(
      CANVAS_STORAGE_KEY_PREFIX + state.questionId,
      JSON.stringify({ ...state, updatedAt: Date.now() })
    );
  } catch { /* storage full */ }
}

// ─── Canvas height calculation ─────────────────────────────────────────────────

export function computeCanvasHeight(elements, currentHeight) {
  const maxBottom = elements.reduce(
    (m, el) => Math.max(m, (el.y || 0) + (el.height || 100)),
    0
  );
  const viewH = typeof window !== "undefined" ? window.innerHeight : 900;
  return Math.max(currentHeight || 0, maxBottom + 600, viewH * 1.2);
}

// ─── Migrate from old records[questionId].notes ───────────────────────────────

export function migrateOldNotes(notes = [], questionId) {
  return notes
    .filter(n => n && n.id)
    .map((n, i) => createCanvasElement({
      questionId,
      type: TOOL_TAG_TO_ELEMENT_TYPE[n.type] || CANVAS_ELEMENT_TYPES.NOTE,
      x: typeof n.x === "number" ? n.x : 80 + (i % 3) * 260,
      y: typeof n.y === "number" ? n.y : 700 + Math.floor(i / 3) * 130,
      width: 240,
      height: 100,
      content: { text: n.text || "" },
    }));
}

function stringifyContent(content = []) {
  return content.map((item) => (typeof item === "string" ? item : Object.values(item).join(""))).join("");
}

// ─── Build initial elements from question data ─────────────────────────────────

export function buildInitialElements(question, questionId) {
  if (!question) return [];
  const elements = [];

  // 1. Source card — the question stem (non-option blocks)
  const stemBlocks = (question.blocks || []).filter(b => b.type !== "options" && b.type !== "solution");
  const stemText = stemBlocks
    .map(b => {
      if (b.type === "paragraph") return (b.content || []).map(c => typeof c === "string" ? c : Object.values(c).join("")).join("");
      if (b.type === "math") return (b.content || []).map(c => typeof c === "string" ? c : Object.values(c).join("")).join("");
      return "";
    })
    .filter(Boolean)
    .join("\n");

  elements.push(createCanvasElement({
    questionId,
    type: CANVAS_ELEMENT_TYPES.SOURCE,
    x: 80,
    y: 80,
    width: 720,
    height: 210,
    content: { text: stemText, blocks: stemBlocks },
    locked: true,
  }));

  // 2. Option cards
  const optionsBlock = (question.blocks || []).find(b => b.type === "options");
  if (optionsBlock?.options) {
    optionsBlock.options.forEach((opt, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      elements.push(createCanvasElement({
        questionId,
        type: CANVAS_ELEMENT_TYPES.OPTION,
        x: 80 + col * 360,
        y: 330 + row * 104,
        width: 320,
        height: 90,
        content: { label: opt.label, text: stringifyContent(opt.content || []), rawContent: opt.content || [] },
        locked: false,
      }));
    });
  }

  return elements;
}
