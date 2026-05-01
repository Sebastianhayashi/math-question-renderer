/**
 * useModularScratchWorkbench.js
 * React hook — manages SolvingBlocks for a single questionId.
 * Handles localStorage persistence, legacy migration, CRUD.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  createBlock,
  normalizeBlocks,
  updateBlock as _updateBlock,
  deleteBlock as _deleteBlock,
  migrateFromLegacy,
  BLOCK_ZONES,
} from "../lib/solvingBlocks.js";

const KEY_PREFIX    = "modular-scratch-workbench-v1:";
const LEGACY_PREFIX = "scratch-drawer-v1:";

function load(questionId) {
  if (!questionId) return null;
  try { const raw = localStorage.getItem(KEY_PREFIX + questionId); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function loadLegacy(questionId) {
  if (!questionId) return null;
  try { const raw = localStorage.getItem(LEGACY_PREFIX + questionId); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function save(questionId, data) {
  if (!questionId) return;
  try { localStorage.setItem(KEY_PREFIX + questionId, JSON.stringify(data)); } catch { /* full */ }
}

function init(questionId) {
  const empty = { questionId: questionId || "", blocks: [], updatedAt: Date.now() };
  if (!questionId) return empty;

  const existing = load(questionId);
  if (existing) return { ...empty, ...existing, blocks: normalizeBlocks(existing.blocks || []) };

  const legacy = loadLegacy(questionId);
  if (legacy) {
    const migrated = { ...empty, blocks: normalizeBlocks(migrateFromLegacy(legacy, questionId)) };
    save(questionId, migrated);
    return migrated;
  }
  return empty;
}

export default function useModularScratchWorkbench(questionId) {
  const [wb, setWb] = useState(() => init(questionId));
  const timerRef = useRef(null);

  useEffect(() => { setWb(init(questionId)); }, [questionId]);

  const persist = useCallback((data) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(data.questionId, { ...data, updatedAt: Date.now() }), 350);
  }, []);

  function mutate(fn) {
    setWb((prev) => {
      const next = fn(prev);
      const full = { ...next, questionId: questionId || prev.questionId };
      persist(full);
      return full;
    });
  }

  /** Compute next block placement (staggered). */
  function nextPos() {
    const n = wb.blocks.length;
    return { x: 20 + (n % 4) * 180, y: 16 + Math.floor(n / 4) * 90 };
  }

  function addBlock({ type, zone, content, source = "user", x, y }) {
    if (!questionId) return;
    const pos = (x !== undefined && y !== undefined) ? { x, y } : nextPos();
    mutate((prev) => ({
      ...prev,
      blocks: [...prev.blocks, createBlock({ questionId, type, zone: zone || BLOCK_ZONES.CANVAS, content, source, ...pos })],
    }));
  }

  function updateBlock(blockId, patch) {
    mutate((prev) => ({ ...prev, blocks: _updateBlock(prev.blocks, blockId, patch) }));
  }

  function deleteBlock(blockId) {
    mutate((prev) => ({ ...prev, blocks: _deleteBlock(prev.blocks, blockId) }));
  }

  function clearAll() {
    const empty = { questionId: questionId || "", blocks: [], updatedAt: Date.now() };
    setWb(empty);
    if (questionId) save(questionId, empty);
  }

  return { blocks: wb.blocks, addBlock, updateBlock, deleteBlock, clearAll };
}
