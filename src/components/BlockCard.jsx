/**
 * BlockCard.jsx — Individual solving block card for the modular workbench.
 */

import { useState, useRef, useEffect } from "react";
import {
  BLOCK_TYPE_LABELS,
  BLOCK_TYPE_THEME,
  BLOCK_TYPE_ORDER,
  BLOCK_ZONES,
  BLOCK_TYPES,
} from "../lib/solvingBlocks.js";

function getQuickActions(zone) {
  switch (zone) {
    case BLOCK_ZONES.MATERIALS:
      return [
        { label: "移到工作区", zone: BLOCK_ZONES.WORKSPACE, icon: "input" },
        { label: "提为关键步骤", zone: BLOCK_ZONES.RESULTS, icon: "arrow_upward", type: BLOCK_TYPES.KEY_STEP },
        { label: "设为答案", zone: BLOCK_ZONES.ANSWER, icon: "check_circle", type: BLOCK_TYPES.ANSWER },
      ];
    case BLOCK_ZONES.WORKSPACE:
      return [
        { label: "提为关键步骤", zone: BLOCK_ZONES.RESULTS, icon: "arrow_upward", type: BLOCK_TYPES.KEY_STEP },
        { label: "设为答案", zone: BLOCK_ZONES.ANSWER, icon: "check_circle", type: BLOCK_TYPES.ANSWER },
        { label: "退回素材", zone: BLOCK_ZONES.MATERIALS, icon: "arrow_back" },
      ];
    case BLOCK_ZONES.RESULTS:
      return [
        { label: "移到工作区", zone: BLOCK_ZONES.WORKSPACE, icon: "input" },
        { label: "设为答案", zone: BLOCK_ZONES.ANSWER, icon: "check_circle", type: BLOCK_TYPES.ANSWER },
      ];
    case BLOCK_ZONES.ANSWER:
      return [{ label: "移到工作区", zone: BLOCK_ZONES.WORKSPACE, icon: "input" }];
    default:
      return [];
  }
}

export default function BlockCard({
  block,
  onUpdate,
  onDelete,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  compact = false,
}) {
  const theme     = BLOCK_TYPE_THEME[block.type] || BLOCK_TYPE_THEME.other;
  const typeLabel = BLOCK_TYPE_LABELS[block.type] || "其他";

  const [isEditing,    setIsEditing]    = useState(false);
  const [draft,        setDraft]        = useState(block.content);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showActions,  setShowActions]  = useState(false);
  const [isDragOver,   setIsDragOver]   = useState(false);
  const [isHovered,    setIsHovered]    = useState(false);
  const [deleteArmed,  setDeleteArmed]  = useState(false);

  const textareaRef = useRef(null);

  useEffect(() => { if (!isEditing) setDraft(block.content); }, [block.content, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  function commitEdit() {
    const t = draft.trim();
    if (t !== block.content) onUpdate(block.id, { content: t || block.content });
    setIsEditing(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") { setDraft(block.content); setIsEditing(false); }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); commitEdit(); }
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (!deleteArmed) {
      setDeleteArmed(true);
      setTimeout(() => setDeleteArmed(false), 2500);
      return;
    }
    onDelete(block.id);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    setShowTypeMenu(false);
    setShowActions(false);
    setDeleteArmed(false);
  }

  const quickActions = getQuickActions(block.zone);

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", block.id);
        onDragStart?.(e, block.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
        onDragOver?.(e, block.id);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop?.(e, block.id); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {/* Drop indicator line */}
      {isDragOver && (
        <div
          className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 rounded-full"
          style={{ background: "var(--color-primary)" }}
        />
      )}

      <div
        className="relative flex flex-col gap-1 rounded-xl border px-2.5 py-1.5"
        style={{
          background:  theme.bg,
          borderColor: isDragOver ? "var(--color-primary)" : theme.border,
          boxShadow:   isDragOver ? "0 0 0 2px rgba(46,103,248,0.12)" : "none",
          transition:  "border-color 0.12s, box-shadow 0.12s",
        }}
      >
        {/* Top row: drag · type · move · delete */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Drag handle */}
          <span
            className="shrink-0 cursor-grab"
            style={{ opacity: isHovered ? 0.55 : 0.2, transition: "opacity 0.15s", color: theme.text }}
          >
            <span className="material-symbols-outlined text-[13px]">drag_indicator</span>
          </span>

          {/* Type label */}
          <button
            onClick={() => setShowTypeMenu((v) => !v)}
            className="shrink-0 rounded px-1 py-0.5 text-[10px] font-black leading-none"
            style={{ background: theme.border, color: theme.text }}
            title="切换类型"
          >
            {typeLabel}
          </button>

          <span className="flex-1" />

          {/* Move button */}
          {quickActions.length > 0 && (
            <button
              onClick={() => setShowActions((v) => !v)}
              title="移动到其他区域"
              style={{
                opacity: isHovered ? 0.6 : 0,
                transition: "opacity 0.15s",
                color: theme.text,
                pointerEvents: isHovered ? "auto" : "none",
              }}
              className="shrink-0 rounded p-0.5"
            >
              <span className="material-symbols-outlined text-[13px]">open_with</span>
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            title={deleteArmed ? "再次点击确认删除" : "删除"}
            style={{
              opacity: isHovered ? (deleteArmed ? 1 : 0.5) : 0,
              transition: "opacity 0.15s",
              color: deleteArmed ? "#ef4444" : theme.text,
              pointerEvents: isHovered ? "auto" : "none",
            }}
            className="shrink-0 rounded p-0.5"
            aria-label="删除模块"
          >
            <span className="material-symbols-outlined text-[13px]">{deleteArmed ? "warning" : "close"}</span>
          </button>
        </div>

        {/* Type picker dropdown */}
        {showTypeMenu && (
          <div
            className="absolute left-0 top-full z-50 mt-1 grid grid-cols-2 gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            style={{ minWidth: 144 }}
            onMouseDown={(e) => e.stopPropagation()}
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

        {/* Quick actions dropdown */}
        {showActions && (
          <div
            className="absolute right-0 top-full z-50 mt-1 flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            style={{ minWidth: 128 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {quickActions.map((action) => (
              <button
                key={action.zone + (action.type || "")}
                onClick={() => { onMove(block.id, action.zone, action.type); setShowActions(false); }}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[13px]">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            rows={compact ? 2 : 3}
            className="w-full resize-none bg-transparent text-[12px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
            placeholder="写内容…"
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => { setDraft(block.content); setIsEditing(true); }}
            className={`w-full text-left text-[12px] leading-relaxed text-slate-700 ${compact ? "line-clamp-2" : "line-clamp-4"}`}
            title="点击编辑"
          >
            {block.content || <span className="italic text-slate-300">点击编辑…</span>}
          </button>
        )}
      </div>
    </div>
  );
}
