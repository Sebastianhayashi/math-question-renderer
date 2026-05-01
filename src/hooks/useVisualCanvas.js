/**
 * useVisualCanvas.js — React hook for Visual Reasoning Canvas state.
 * Manages elements, connections, canvas height, and persistence.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  loadCanvasState,
  saveCanvasState,
  createEmptyCanvasState,
  createCanvasElement,
  createCanvasConnection,
  buildInitialElements,
  migrateOldNotes,
  computeCanvasHeight,
  CANVAS_ELEMENT_TYPES,
  TOOL_TAG_TO_ELEMENT_TYPE,
} from "../lib/canvasState.js";

const SAVE_DEBOUNCE = 400; // ms

export default function useVisualCanvas({ questionId, question, oldNotes = [] }) {
  const [canvas, setCanvas] = useState(() => createEmptyCanvasState(questionId));
  const [initialized, setInitialized] = useState(false);
  const saveTimer = useRef(null);

  // ── Load / initialize when questionId changes ──────────────────────────────
  useEffect(() => {
    if (!questionId) return;
    setInitialized(false);

    const existing = loadCanvasState(questionId);
    if (existing && existing.elements.length > 0) {
      setCanvas(existing);
      setInitialized(true);
      return;
    }

    // First visit: build initial elements from question data
    const initial = createEmptyCanvasState(questionId);
    const qElements = buildInitialElements(question, questionId);

    // Migrate old notes if available
    const migrated = oldNotes.length > 0 ? migrateOldNotes(oldNotes, questionId) : [];

    initial.elements = [...qElements, ...migrated];
    initial.canvasHeight = computeCanvasHeight(initial.elements, initial.canvasHeight);
    saveCanvasState(initial);
    setCanvas(initial);
    setInitialized(true);
  }, [questionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced persistence ──────────────────────────────────────────────────
  const persist = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveCanvasState(next), SAVE_DEBOUNCE);
  }, []);

  function mutate(fn) {
    setCanvas(prev => {
      const next = fn(prev);
      // Recompute canvas height when elements change
      const recomputed = {
        ...next,
        canvasHeight: computeCanvasHeight(next.elements, next.canvasHeight),
        updatedAt: Date.now(),
      };
      persist(recomputed);
      return recomputed;
    });
  }

  // ── Expand canvas when element dragged near bottom ─────────────────────────
  function expandIfNeeded(elementBottom) {
    setCanvas(prev => {
      if (elementBottom < prev.canvasHeight - 280) return prev;
      const next = { ...prev, canvasHeight: prev.canvasHeight + 800 };
      persist(next);
      return next;
    });
  }

  const expandCanvas = useCallback((elementBottom) => {
    setCanvas(prev => {
      if (elementBottom < prev.canvasHeight - 300) return prev;
      const next = { ...prev, canvasHeight: prev.canvasHeight + 800, updatedAt: Date.now() };
      persist(next);
      return next;
    });
  }, [persist]);

  // ── CRUD operations ────────────────────────────────────────────────────────

  function addElement({ type, content, x, y, width, height }) {
    const el = createCanvasElement({
      questionId,
      type: type || CANVAS_ELEMENT_TYPES.NOTE,
      x: x ?? 80,
      y: y ?? 80,
      width: width ?? 240,
      height: height ?? 100,
      content: content || {},
    });
    mutate(prev => ({ ...prev, elements: [...prev.elements, el] }));
    return el.id;
  }

  function addElementFromTool(toolTag, selectedText) {
    const type = TOOL_TAG_TO_ELEMENT_TYPE[toolTag] || CANVAS_ELEMENT_TYPES.NOTE;
    const text = selectedText || "";

    // Position: stagger from last user-created element
    const userEls = canvas.elements.filter(e => e.type !== CANVAS_ELEMENT_TYPES.SOURCE && e.type !== CANVAS_ELEMENT_TYPES.OPTION);
    const n = userEls.length;
    const col = n % 3;
    const row = Math.floor(n / 3);

    // Base x/y: below the source+options area
    const sourceEl = canvas.elements.find(e => e.type === CANVAS_ELEMENT_TYPES.SOURCE);
    const optionEls = canvas.elements.filter(e => e.type === CANVAS_ELEMENT_TYPES.OPTION);
    const lowestOption = optionEls.reduce((m, e) => Math.max(m, e.y + e.height), sourceEl ? sourceEl.y + sourceEl.height : 300);
    const baseY = lowestOption + 60;
    const baseX = 60;

    const x = baseX + col * 260;
    const y = baseY + row * 120;

    return addElement({ type, content: { text }, x, y, width: 240, height: 100 });
  }

  function updateElement(id, patch) {
    mutate(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, ...patch, id: el.id, updatedAt: Date.now() } : el
      ),
    }));
  }

  function updateElementPosition(id, x, y) {
    mutate(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, x, y, updatedAt: Date.now() } : el
      ),
    }));
    expandIfNeeded(y + 120);
  }

  const arrangeUserElements = useCallback(() => {
    mutate(prev => {
      const sourceBottom = prev.elements.reduce((bottom, element) => {
        if (element.type === CANVAS_ELEMENT_TYPES.SOURCE || element.type === CANVAS_ELEMENT_TYPES.OPTION) {
          return Math.max(bottom, element.y + element.height);
        }
        return bottom;
      }, 420);
      const userElements = prev.elements
        .filter(element => element.type !== CANVAS_ELEMENT_TYPES.SOURCE && element.type !== CANVAS_ELEMENT_TYPES.OPTION)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const orderById = new Map(userElements.map((element, index) => [element.id, index]));

      return {
        ...prev,
        elements: prev.elements.map(element => {
          if (!orderById.has(element.id)) return element;
          const index = orderById.get(element.id);
          return {
            ...element,
            x: 80 + (index % 3) * 280,
            y: sourceBottom + 90 + Math.floor(index / 3) * 150,
            updatedAt: Date.now(),
          };
        }),
      };
    });
  }, []);

  function deleteElement(id) {
    mutate(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
      connections: prev.connections.filter(c => c.fromId !== id && c.toId !== id),
    }));
  }

  function addConnection({ fromId, toId, label, mode }) {
    const conn = createCanvasConnection({ questionId, fromId, toId, label, mode });
    mutate(prev => ({ ...prev, connections: [...prev.connections, conn] }));
  }

  function deleteConnection(id) {
    mutate(prev => ({ ...prev, connections: prev.connections.filter(c => c.id !== id) }));
  }

  function clearUserElements() {
    mutate(prev => ({
      ...prev,
      elements: prev.elements.filter(e =>
        e.type === CANVAS_ELEMENT_TYPES.SOURCE || e.type === CANVAS_ELEMENT_TYPES.OPTION
      ),
      connections: [],
    }));
  }

  return {
    canvas,
    initialized,
    elements: canvas.elements,
    connections: canvas.connections,
    canvasHeight: canvas.canvasHeight,
    addElement,
    addElementFromTool,
    updateElement,
    updateElementPosition,
    deleteElement,
    addConnection,
    deleteConnection,
    clearUserElements,
    expandCanvas,
    arrangeUserElements,
  };
}
