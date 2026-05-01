/**
 * solvingBlocks.js — Unified SolvingBlock data model.
 * Pure functions — no React, no DOM, no localStorage.
 *
 * Blocks live on a free canvas with x/y coordinates.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const BLOCK_TYPES = {
  CONDITION:  "condition",
  GOAL:       "goal",
  VARIABLE:   "variable",
  SCRATCH:    "scratch",
  DERIVATION: "derivation",
  KEY_STEP:   "keyStep",
  ANSWER:     "answer",
  QUESTION:   "question",
  EVIDENCE:   "evidence",
  OTHER:      "other",
};

export const BLOCK_ZONES = {
  SOURCE:   "source",
  CANVAS:   "canvas",
  RESULT:   "result",
  ARCHIVE:  "archive",
};

export const BLOCK_TYPE_LABELS = {
  condition:  "条件",
  goal:       "目标",
  variable:   "变量",
  scratch:    "草稿",
  derivation: "推导",
  keyStep:    "关键步骤",
  answer:     "答案",
  question:   "疑问",
  evidence:   "证据",
  other:      "其他",
};

export const BLOCK_TYPE_ORDER = [
  "condition", "goal", "variable", "evidence",
  "derivation", "scratch", "question",
  "keyStep", "answer", "other",
];

export const BLOCK_TYPE_THEME = {
  condition:  { bg: "rgba(46,103,248,0.09)",  border: "rgba(46,103,248,0.22)", text: "#1d4ed8" },
  goal:       { bg: "rgba(20,216,109,0.09)",  border: "rgba(20,216,109,0.24)", text: "#047857" },
  variable:   { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.26)", text: "#92400e" },
  scratch:    { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.20)", text: "#475569" },
  derivation: { bg: "rgba(14,165,233,0.09)",  border: "rgba(14,165,233,0.24)", text: "#0369a1" },
  keyStep:    { bg: "rgba(168,85,247,0.09)",  border: "rgba(168,85,247,0.22)", text: "#7e22ce" },
  answer:     { bg: "rgba(239,68,68,0.09)",   border: "rgba(239,68,68,0.22)",  text: "#b91c1c" },
  question:   { bg: "rgba(251,146,60,0.10)",  border: "rgba(251,146,60,0.24)", text: "#c2410c" },
  evidence:   { bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.24)",  text: "#15803d" },
  other:      { bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.24)", text: "#475569" },
};

// ─── ID generator ────────────────────────────────────────────────────────────

function _genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `sb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Block factory ────────────────────────────────────────────────────────────

export function createBlock({
  questionId = "", type, zone, content = "",
  source = "user", sourceAnchor,
  x = 0, y = 0, collapsed = false,
}) {
  const now = Date.now();
  return {
    id:           _genId(),
    questionId,
    type:         type || BLOCK_TYPES.OTHER,
    zone:         zone || BLOCK_ZONES.CANVAS,
    content,
    source,
    sourceAnchor: sourceAnchor || undefined,
    x, y,
    collapsed,
    createdAt:    now,
    updatedAt:    now,
  };
}

// ─── Normalization ────────────────────────────────────────────────────────────

export function normalizeBlocks(rawBlocks) {
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks
    .filter((b) => b && typeof b === "object" && b.id)
    .map((b) => ({
      id:           b.id,
      questionId:   b.questionId || "",
      type:         BLOCK_TYPE_LABELS[b.type] !== undefined ? b.type : BLOCK_TYPES.OTHER,
      zone:         b.zone || BLOCK_ZONES.CANVAS,
      content:      typeof b.content === "string" ? b.content : "",
      source:       ["problem", "user", "scratch", "system"].includes(b.source) ? b.source : "user",
      sourceAnchor: b.sourceAnchor || undefined,
      x:            typeof b.x === "number" ? b.x : 0,
      y:            typeof b.y === "number" ? b.y : 0,
      collapsed:    Boolean(b.collapsed),
      createdAt:    typeof b.createdAt === "number" ? b.createdAt : Date.now(),
      updatedAt:    typeof b.updatedAt === "number" ? b.updatedAt : Date.now(),
    }));
}

// ─── Mutations (immutable — return new array) ─────────────────────────────────

export function updateBlock(blocks, blockId, patch) {
  return blocks.map((b) =>
    b.id === blockId ? { ...b, ...patch, id: b.id, updatedAt: Date.now() } : b
  );
}

export function deleteBlock(blocks, blockId) {
  return blocks.filter((b) => b.id !== blockId);
}

// ─── Legacy migration ─────────────────────────────────────────────────────────

const LEGACY_TYPE_MAP = {
  condition: BLOCK_TYPES.CONDITION,
  goal:      BLOCK_TYPES.GOAL,
  variable:  BLOCK_TYPES.VARIABLE,
};

export function migrateFromLegacy(legacy, questionId) {
  if (!legacy || typeof legacy !== "object") return [];
  const blocks = [];
  let idx = 0;

  if (Array.isArray(legacy.materials)) {
    for (const mat of legacy.materials) {
      if (!mat || !mat.content) continue;
      blocks.push(createBlock({
        questionId, type: LEGACY_TYPE_MAP[mat.type] || BLOCK_TYPES.OTHER,
        zone: BLOCK_ZONES.CANVAS, content: mat.content, source: "problem",
        x: 20 + (idx % 3) * 200, y: 20 + Math.floor(idx / 3) * 80,
      }));
      idx++;
    }
  }

  if (legacy.scratchText && legacy.scratchText.trim()) {
    blocks.push(createBlock({
      questionId, type: BLOCK_TYPES.SCRATCH, zone: BLOCK_ZONES.CANVAS,
      content: legacy.scratchText.trim(), source: "scratch",
      x: 20, y: 20 + Math.ceil(idx / 3) * 80 + 20,
    }));
    idx++;
  }

  if (Array.isArray(legacy.keySteps)) {
    for (const step of legacy.keySteps) {
      if (!step || !step.content) continue;
      blocks.push(createBlock({
        questionId, type: BLOCK_TYPES.KEY_STEP, zone: BLOCK_ZONES.CANVAS,
        content: step.content, source: "user",
        x: 420 + (idx % 2) * 200, y: 20 + Math.floor(idx / 2) * 80,
      }));
      idx++;
    }
  }

  if (legacy.answerDraft && legacy.answerDraft.trim()) {
    blocks.push(createBlock({
      questionId, type: BLOCK_TYPES.ANSWER, zone: BLOCK_ZONES.CANVAS,
      content: legacy.answerDraft.trim(), source: "user",
      x: 420, y: 20 + Math.ceil(idx / 2) * 80 + 20,
    }));
  }

  return blocks;
}
