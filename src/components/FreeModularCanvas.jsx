/**
 * FreeModularCanvas.jsx
 *
 * Free-form canvas where SolvingBlocks can be freely positioned and dragged.
 * Renders inline below the question card (not a drawer or overlay).
 * Includes an embedded palette for creating new blocks.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import useModularScratchWorkbench from "../hooks/useModularScratchWorkbench.js";
import {
  BLOCK_TYPES,
  BLOCK_ZONES,
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_THEME,
  BLOCK_TYPE_ORDER,
} from "../lib/solvingBlocks.js";

// ─── Canvas block ─────────────────────────────────────────────────────────────

function CanvasBlock({ block, onUpdate, onDelete, onDragStart }) {
  const theme = BLOCK_TYPE_THEME[block.type] || BLOCK_TYPE_THEME.other;
  const typeLabel = BLOCK_TYPE_LABELS[block.type] || "其他";

  const [isEditing, setIsEditing]       = useState(false);
  const [draft, setDraft]               = useState(block.content);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isHovered, setIsHovered]       = useState(false);
  const [deleteArmed, setDeleteArmed]   = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => { if (!isEditing) setDraft(block.content); }, [block.content, isEditing]);
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(9999, 9999);
    }
  }, [isEditing]);

  function commit() {
    const t = draft.trim();
    if (t !== block.content) onUpdate(block.id, { content: t || block.content });
    setIsEditing(false);
  }

  function handleKey(e) {
    if (e.key === "Escape") { setDraft(block.content); setIsEditing(false); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); commit(); }
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (!deleteArmed) { setDeleteArmed(true); setTimeout(() => setDeleteArmed(false), 2500); return; }
    onDelete(block.id);
  }

  function handleToggleCollapse() {
    onUpdate(block.id, { collapsed: !block.collapsed });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: block.x,
        top: block.y,
        width: block.collapsed ? 120 : 200,
        zIndex: isEditing ? 20 : isHovered ? 10 : 1,
        userSelect: isEditing ? "text" : "none",
        transition: "width 0.15s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowTypeMenu(false); setDeleteArmed(false); }}
    >
      <div
        className="rounded-xl border"
        style={{
          background: theme.bg,
          borderColor: theme.border,
          boxShadow: isHovered
            ? "0 4px 16px rgba(0,0,0,0.08)"
            : "0 1px 4px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.15s ease",
        }}
      >
        {/* Header: drag handle + type + collapse + delete */}
        <div
          className="flex items-center gap-1 px-2 py-1.5 cursor-grab select-none"
          onPointerDown={(e) => {
            if (isEditing) return;
            e.preventDefault();
            onDragStart(e, block.id);
          }}
          style={{ touchAction: "none" }}
        >
          <span className="material-symbols-outlined text-[13px]" style={{ color: theme.text, opacity: 0.4 }}>
            drag_indicator
          </span>

          <button
            onClick={(e) => { e.stopPropagation(); setShowTypeMenu((v) => !v); }}
            className="rounded px-1 py-0.5 text-[10px] font-black leading-none"
            style={{ background: theme.border, color: theme.text }}
            title="切换类型"
          >
            {typeLabel}
          </button>

          <span className="flex-1" />

          {/* Collapse toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleCollapse(); }}
            style={{ opacity: isHovered ? 0.5 : 0, transition: "opacity 0.15s", color: theme.text }}
            className="shrink-0 p-0.5"
            title={block.collapsed ? "展开" : "折叠"}
          >
            <span className="material-symbols-outlined text-[13px]">
              {block.collapsed ? "unfold_more" : "unfold_less"}
            </span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            style={{
              opacity: isHovered ? (deleteArmed ? 1 : 0.4) : 0,
              transition: "opacity 0.15s",
              color: deleteArmed ? "#ef4444" : theme.text,
            }}
            className="shrink-0 p-0.5"
            title={deleteArmed ? "确认删除" : "删除"}
          >
            <span className="material-symbols-outlined text-[13px]">
              {deleteArmed ? "warning" : "close"}
            </span>
          </button>
        </div>

        {/* Type picker dropdown */}
        {showTypeMenu && (
          <div
            className="absolute left-0 top-full z-50 mt-1 grid grid-cols-2 gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            style={{ minWidth: 140 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {BLOCK_TYPE_ORDER.map((t) => {
              const th = BLOCK_TYPE_THEME[t];
              return (
                <button
                  key={t}
                  onClick={() => { onUpdate(block.id, { type: t }); setShowTypeMenu(false); }}
                  className="rounded-lg px-2 py-1 text-left text-[10px] font-bold"
                  style={{ background: th.bg, color: th.text, border: `1px solid ${th.border}` }}
                >
                  {BLOCK_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {!block.collapsed && (
          <div className="px-2 pb-2">
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKey}
                rows={3}
                className="w-full resize-none rounded-lg bg-white/60 px-2 py-1.5 text-[12px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
                placeholder="写内容…"
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                onClick={() => { setDraft(block.content); setIsEditing(true); }}
                className="w-full text-left text-[12px] leading-relaxed text-slate-700 line-clamp-5"
                title="点击编辑"
              >
                {block.content || <span className="italic text-slate-300">点击编辑…</span>}
              </button>
            )}
          </div>
        )}

        {/* Collapsed preview */}
        {block.collapsed && block.content && (
          <div className="px-2 pb-1.5">
            <span className="text-[10px] text-slate-400 line-clamp-1">{block.content}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Palette tags ─────────────────────────────────────────────────────────────

const PALETTE_TAGS = [
  { type: BLOCK_TYPES.CONDITION,  label: "已知",  icon: "lightbulb" },
  { type: BLOCK_TYPES.GOAL,       label: "目标",  icon: "flag" },
  { type: BLOCK_TYPES.DERIVATION, label: "推导",  icon: "trending_flat" },
  { type: BLOCK_TYPES.SCRATCH,    label: "草稿",  icon: "edit" },
  { type: BLOCK_TYPES.KEY_STEP,   label: "步骤",  icon: "checklist" },
  { type: BLOCK_TYPES.ANSWER,     label: "答案",  icon: "task_alt" },
  { type: BLOCK_TYPES.QUESTION,   label: "疑问",  icon: "help" },
];

// ─── Main canvas ─────────────────────────────────────────────────────────────

export default function FreeModularCanvas({ questionId, subject }) {
  if (subject !== "math") return null;

  const { blocks, addBlock, updateBlock, deleteBlock, clearAll } = useModularScratchWorkbench(questionId);

  const canvasRef = useRef(null);
  const dragRef   = useRef(null); // { blockId, startX, startY, origX, origY, pointerId }

  // ── Compute canvas height from block positions ──
  const minH = 260;
  const maxBottom = blocks.reduce((max, b) => Math.max(max, b.y + (b.collapsed ? 50 : 110)), 0);
  const canvasHeight = Math.max(minH, maxBottom + 60);

  // ── Drag handlers (pointer events) ──

  const handleDragStart = useCallback((e, blockId) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.target.setPointerCapture(e.pointerId);
    dragRef.current = {
      blockId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: block.x,
      origY: block.y,
    };
  }, [blocks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function onPointerMove(e) {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const newX = Math.max(0, d.origX + dx);
      const newY = Math.max(0, d.origY + dy);
      // Direct DOM update for performance — will persist on pointerup
      const el = canvas.querySelector(`[data-block-id="${d.blockId}"]`);
      if (el) {
        el.style.left = newX + "px";
        el.style.top  = newY + "px";
      }
      d._lastX = newX;
      d._lastY = newY;
    }

    function onPointerUp(e) {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d._lastX !== undefined) {
        // Persist final position
        updateBlock(d.blockId, { x: d._lastX, y: d._lastY });
      }
      dragRef.current = null;
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup",   onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup",   onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [updateBlock]);

  // ── Palette: add block ──

  function handlePaletteAdd(type) {
    const sel = window.getSelection?.()?.toString()?.trim();
    const content = sel ? sel.slice(0, 200) : "";
    const source = sel ? "problem" : "user";
    if (sel) window.getSelection?.()?.removeAllRanges();
    addBlock({ type, zone: BLOCK_ZONES.CANVAS, content, source });
  }

  // ── Double-click canvas to add block at position ──

  function handleCanvasDoubleClick(e) {
    if (e.target !== canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addBlock({ type: BLOCK_TYPES.SCRATCH, zone: BLOCK_ZONES.CANVAS, content: "", source: "user", x, y });
  }

  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <section className="mt-4 mb-6">
      {/* ── Section divider ──────────────────────────── */}
      <div className="mb-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">推理画布</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        {blocks.length > 0 && (
          <button
            onClick={() => {
              if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
              clearAll(); setConfirmClear(false);
            }}
            className={`text-[10px] font-bold ${confirmClear ? "text-red-400" : "text-slate-300 hover:text-slate-400"}`}
          >
            {confirmClear ? "确认清空" : "清空"}
          </button>
        )}
      </div>

      {/* ── Palette (block generator) ────────────────── */}
      <div className="mb-3 flex items-center gap-1.5 flex-wrap">
        {PALETTE_TAGS.map((tag) => {
          const th = BLOCK_TYPE_THEME[tag.type];
          return (
            <button
              key={tag.type}
              onClick={() => handlePaletteAdd(tag.type)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black transition-all hover:scale-105 hover:shadow-sm active:scale-95"
              style={{ background: th.bg, color: th.text, border: `1px solid ${th.border}` }}
              title={`选中文字后点击，或直接点击创建空${tag.label}模块`}
            >
              <span className="material-symbols-outlined text-[13px]">{tag.icon}</span>
              {tag.label}
            </button>
          );
        })}
        <span className="text-[10px] text-slate-300 ml-1">
          选中题目文字后点击 | 双击画布空白处新建
        </span>
      </div>

      {/* ── Canvas ───────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="relative w-full rounded-2xl border border-dashed border-slate-150 bg-slate-50/30"
        style={{
          height: canvasHeight,
          minHeight: minH,
          borderColor: blocks.length === 0 ? "rgba(203,213,225,0.3)" : "rgba(203,213,225,0.15)",
          transition: "height 0.2s ease, border-color 0.2s ease",
          touchAction: "none",
        }}
        onDoubleClick={handleCanvasDoubleClick}
      >
        {/* Empty state — very subtle */}
        {blocks.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[12px] text-slate-250" style={{ color: "rgba(148,163,184,0.35)" }}>
              双击创建模块 · 或使用上方工具
            </span>
          </div>
        )}

        {/* Blocks */}
        {blocks.map((block) => (
          <div key={block.id} data-block-id={block.id} style={{ position: "absolute", left: block.x, top: block.y }}>
            <CanvasBlock
              block={block}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
              onDragStart={handleDragStart}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
