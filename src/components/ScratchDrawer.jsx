/**
 * ScratchDrawer v2.1 — Modular scratch workbench.
 *
 * Layout (half / focus):
 *   ┌──────────────────────────────────────────┐
 *   │ Header: title · count · save · 专注 · ↓  │
 *   ├──────────────────────────────────────────┤
 *   │ Materials (chip bar) — 加入选中           │
 *   ├─────────────────────────┬────────────────┤
 *   │ Workspace (70%)         │ Results (30%)  │
 *   │ scratch / derivation /  │ 关键步骤        │
 *   │ question / other        ├────────────────┤
 *   │                         │ 候选答案        │
 *   └─────────────────────────┴────────────────┘
 */

import { useState } from "react";
import useModularScratchWorkbench from "../hooks/useModularScratchWorkbench.js";
import BlockCard from "./BlockCard.jsx";
import {
  BLOCK_TYPES,
  BLOCK_ZONES,
} from "../lib/solvingBlocks.js";

// ─── Heights ──────────────────────────────────────────────────────────────────

function getDrawerHeight(state) {
  if (typeof window === "undefined") {
    return state === "collapsed" ? 52 : state === "focus" ? 480 : 300;
  }
  if (state === "collapsed") return 52;
  if (state === "focus") return Math.round(window.innerHeight * 0.58);
  // half — compact: show workbench without covering the question
  return Math.min(340, Math.round(window.innerHeight * 0.35));
}

// ─── Zone drop wrapper ────────────────────────────────────────────────────────

function ZoneDrop({ zone, onDropBlock, className = "", style = {}, children }) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={className}
      style={{
        ...style,
        outline: over ? "1.5px dashed rgba(46,103,248,0.5)" : undefined,
        outlineOffset: over ? "-2px" : undefined,
        borderRadius: over ? 12 : undefined,
        transition: "outline 0.12s ease",
      }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropBlock(id, zone, Infinity);
      }}
    >
      {children}
    </div>
  );
}

// ─── Materials chip bar ───────────────────────────────────────────────────────

function MaterialsZone({ blocks, onAdd, onUpdate, onDelete, onMove, onDropBlock }) {
  const [hint, setHint] = useState("");

  function handleAddFromSelection() {
    const sel = window.getSelection?.()?.toString()?.trim();
    if (!sel) {
      setHint("请先选中题目文字");
      setTimeout(() => setHint(""), 2200);
      return;
    }
    onAdd({ type: BLOCK_TYPES.OTHER, zone: BLOCK_ZONES.MATERIALS, content: sel.slice(0, 120), source: "problem" });
    window.getSelection?.()?.removeAllRanges();
  }

  function handleDropOnCard(e, targetBlockId) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetBlockId) return;
    const idx = blocks.findIndex((b) => b.id === targetBlockId);
    onDropBlock(draggedId, BLOCK_ZONES.MATERIALS, idx >= 0 ? idx : Infinity);
  }

  return (
    <ZoneDrop
      zone={BLOCK_ZONES.MATERIALS}
      onDropBlock={onDropBlock}
      className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2"
    >
      {/* Add button */}
      <button
        onClick={handleAddFromSelection}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-400 whitespace-nowrap transition-colors hover:border-primary hover:text-primary"
        title="选中题目文字后点击，把它加入素材区"
      >
        <span className="material-symbols-outlined text-[12px]">add</span>
        加入选中
      </button>

      {/* Chips */}
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto min-w-0" style={{ scrollbarWidth: "none" }}>
        {hint && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
            {hint}
          </span>
        )}
        {!hint && blocks.length === 0 && (
          <span className="text-[11px] text-slate-300 select-none whitespace-nowrap">
            选中题目文字后点「加入选中」
          </span>
        )}
        {blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            compact
            onUpdate={onUpdate}
            onDelete={onDelete}
            onMove={onMove}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDrop={(e) => handleDropOnCard(e, block.id)}
          />
        ))}
      </div>
    </ZoneDrop>
  );
}

// ─── Workspace zone (left 70%) ────────────────────────────────────────────────

function WorkspaceZone({ blocks, onAddBlock, onUpdate, onDelete, onMove, onDropBlock }) {
  function handleDropOnCard(e, targetBlockId) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === targetBlockId) return;
    const idx = blocks.findIndex((b) => b.id === targetBlockId);
    onDropBlock(id, BLOCK_ZONES.WORKSPACE, idx >= 0 ? idx : Infinity);
  }

  return (
    <ZoneDrop
      zone={BLOCK_ZONES.WORKSPACE}
      onDropBlock={onDropBlock}
      className="flex flex-1 flex-col overflow-hidden border-r border-slate-100"
    >
      {/* Zone label + add */}
      <div className="flex shrink-0 items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">工作区</span>
        <button
          onClick={() => onAddBlock({ type: BLOCK_TYPES.SCRATCH, zone: BLOCK_ZONES.WORKSPACE, content: "", source: "user" })}
          className="flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10"
        >
          <span className="material-symbols-outlined text-[12px]">add</span>
          新增草稿
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-2">
        {blocks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center text-[11px] text-slate-300">
            写推导、计算、疑问，或把素材拖进来继续加工。
          </p>
        ) : (
          blocks.map((block) => (
            <BlockCard
              key={block.id}
              block={block}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
              onDragStart={() => {}}
              onDragOver={() => {}}
              onDrop={(e) => handleDropOnCard(e, block.id)}
            />
          ))
        )}
      </div>
    </ZoneDrop>
  );
}

// ─── Results + Answer zone (right 30%) ───────────────────────────────────────

function ResultsAnswerZone({ resultBlocks, answerBlocks, onAddBlock, onUpdate, onDelete, onMove, onDropBlock }) {
  function dropOnCard(e, targetId, zone, list) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === targetId) return;
    const idx = list.findIndex((b) => b.id === targetId);
    onDropBlock(id, zone, idx >= 0 ? idx : Infinity);
  }

  return (
    <div className="flex w-[190px] shrink-0 flex-col overflow-hidden">
      {/* Results */}
      <ZoneDrop
        zone={BLOCK_ZONES.RESULTS}
        onDropBlock={onDropBlock}
        className="flex flex-1 flex-col overflow-hidden border-b border-slate-100"
      >
        <div className="flex shrink-0 items-center justify-between px-2.5 pt-2 pb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">关键步骤</span>
          <button
            onClick={() => onAddBlock({ type: BLOCK_TYPES.KEY_STEP, zone: BLOCK_ZONES.RESULTS, content: "", source: "user" })}
            className="flex items-center gap-0.5 rounded-lg px-1 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-[12px]">add</span>
            添加
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2.5 pb-1">
          {resultBlocks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-2 py-3 text-center text-[10px] text-slate-300">
              拖入或点添加
            </p>
          ) : (
            resultBlocks.map((b) => (
              <BlockCard
                key={b.id}
                block={b}
                compact
                onUpdate={onUpdate}
                onDelete={onDelete}
                onMove={onMove}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDrop={(e) => dropOnCard(e, b.id, BLOCK_ZONES.RESULTS, resultBlocks)}
              />
            ))
          )}
        </div>
      </ZoneDrop>

      {/* Answer */}
      <ZoneDrop
        zone={BLOCK_ZONES.ANSWER}
        onDropBlock={onDropBlock}
        className="flex shrink-0 flex-col"
        style={{ maxHeight: "40%" }}
      >
        <div className="flex shrink-0 items-center justify-between px-2.5 pt-2 pb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">候选答案</span>
          {answerBlocks.length === 0 && (
            <button
              onClick={() => onAddBlock({ type: BLOCK_TYPES.ANSWER, zone: BLOCK_ZONES.ANSWER, content: "", source: "user" })}
              className="flex items-center gap-0.5 rounded-lg px-1 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10"
            >
              <span className="material-symbols-outlined text-[12px]">add</span>
              添加
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1 overflow-y-auto px-2.5 pb-2">
          {answerBlocks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-2 py-2 text-center text-[10px] text-slate-300">
              拖入或点添加
            </p>
          ) : (
            answerBlocks.map((b) => (
              <BlockCard
                key={b.id}
                block={b}
                compact
                onUpdate={onUpdate}
                onDelete={onDelete}
                onMove={onMove}
                onDragStart={() => {}}
                onDragOver={() => {}}
                onDrop={(e) => dropOnCard(e, b.id, BLOCK_ZONES.ANSWER, answerBlocks)}
              />
            ))
          )}
        </div>
      </ZoneDrop>
    </div>
  );
}

// ─── Drawer handle (collapsed) ────────────────────────────────────────────────

function DrawerHandle({ totalBlocks, materialCount, resultCount, answerBlocks, onClick }) {
  const answerBlock = answerBlocks[0];
  return (
    <button
      onClick={onClick}
      className="flex h-full w-full items-center gap-3 px-4 text-left transition-colors hover:bg-slate-50/80"
      aria-label="展开模块化工作台"
    >
      <span className="flex items-center gap-1.5 shrink-0">
        <span
          className="grid size-6 place-items-center rounded-lg text-white"
          style={{ background: "var(--color-primary)" }}
        >
          <span className="material-symbols-outlined text-[14px]">edit_note</span>
        </span>
        <span className="text-[12px] font-black text-slate-600">工作台</span>
      </span>

      <span className="h-4 w-px bg-slate-200 shrink-0" />

      <span className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
        {totalBlocks > 0 ? (
          <>
            {materialCount > 0 && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                素材 {materialCount}
              </span>
            )}
            {resultCount > 0 && (
              <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700">
                步骤 {resultCount}
              </span>
            )}
            {answerBlock?.content && (
              <span className="shrink-0 max-w-[140px] truncate rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">
                答案：{answerBlock.content}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] text-slate-300">点击展开工作台，整理解题思路…</span>
        )}
      </span>

      <span className="material-symbols-outlined shrink-0 text-[18px] text-slate-400">
        keyboard_arrow_up
      </span>
    </button>
  );
}

// ─── Drawer header (half / focus) ─────────────────────────────────────────────

function DrawerHeader({ drawerState, totalBlocks, saveStatus, onCollapse, onToggleFocus, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const saveLabel =
    saveStatus === "saving" ? "保存中" :
    saveStatus === "saved"  ? "已保存" :
    saveStatus === "error"  ? "保存失败" : "";

  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="grid size-6 place-items-center rounded-lg text-white"
          style={{ background: "var(--color-primary)" }}
        >
          <span className="material-symbols-outlined text-[14px]">edit_note</span>
        </span>
        <span className="text-[13px] font-black text-slate-700">工作台</span>
        {totalBlocks > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
            {totalBlocks}
          </span>
        )}
        {saveLabel && (
          <span className="text-[10px] text-slate-400">{saveLabel}</span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleFocus}
          className="flex items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary"
        >
          <span className="material-symbols-outlined text-[15px]">
            {drawerState === "focus" ? "unfold_less" : "unfold_more"}
          </span>
          {drawerState === "focus" ? "退出专注" : "专注"}
        </button>

        <button
          onClick={() => {
            if (!confirmClear) { setConfirmClear(true); return; }
            onClear(); setConfirmClear(false);
          }}
          onBlur={() => setConfirmClear(false)}
          className={`flex items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-bold transition-colors ${
            confirmClear ? "bg-red-50 text-red-500" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          }`}
          title="清空本题工作台"
        >
          <span className="material-symbols-outlined text-[14px]">
            {confirmClear ? "warning" : "delete_sweep"}
          </span>
          {confirmClear ? "确认" : "清空"}
        </button>

        <button
          onClick={onCollapse}
          className="grid size-7 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50"
          aria-label="收起工作台"
          title="收起"
        >
          <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main ScratchDrawer ───────────────────────────────────────────────────────

export default function ScratchDrawer({ questionId, subject, onLayoutChange }) {
  // Only render for math subject
  if (subject !== "math") return null;

  const {
    blocks,
    drawerState,
    saveStatus,
    setDrawerState,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlockToZone,
    reorderBlockInZone,
    clearWorkbench,
    getBlocksByZone,
  } = useModularScratchWorkbench(questionId);

  const materialBlocks  = getBlocksByZone(BLOCK_ZONES.MATERIALS);
  const workspaceBlocks = getBlocksByZone(BLOCK_ZONES.WORKSPACE);
  const resultBlocks    = getBlocksByZone(BLOCK_ZONES.RESULTS);
  const answerBlocks    = getBlocksByZone(BLOCK_ZONES.ANSWER);
  const totalBlocks     = blocks.length;
  const drawerHeight    = getDrawerHeight(drawerState);

  function changeState(newState) {
    setDrawerState(newState);
    onLayoutChange?.({ state: newState, height: getDrawerHeight(newState) });
  }

  function handleMove(blockId, targetZone, targetType) {
    moveBlockToZone(blockId, targetZone, Infinity);
    if (targetType) updateBlock(blockId, { type: targetType });
  }

  function handleDrop(blockId, targetZone, targetIndex) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    if (block.zone === targetZone) {
      reorderBlockInZone(blockId, targetIndex);
    } else {
      moveBlockToZone(blockId, targetZone, targetIndex);
    }
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden border-t border-slate-100 bg-white/95 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur-xl"
      style={{
        height: drawerHeight,
        transition: "height 0.26s cubic-bezier(0.4,0,0.2,1)",
      }}
      aria-label="模块化草稿工作台"
    >
      {/* ── COLLAPSED ─────────────────────────────────────── */}
      {drawerState === "collapsed" && (
        <DrawerHandle
          totalBlocks={totalBlocks}
          materialCount={materialBlocks.length}
          resultCount={resultBlocks.length}
          answerBlocks={answerBlocks}
          onClick={() => changeState("half")}
        />
      )}

      {/* ── HALF / FOCUS ──────────────────────────────────── */}
      {drawerState !== "collapsed" && (
        <div className="flex h-full flex-col">
          {/* Header */}
          <DrawerHeader
            drawerState={drawerState}
            totalBlocks={totalBlocks}
            saveStatus={saveStatus}
            onCollapse={() => changeState(drawerState === "focus" ? "half" : "collapsed")}
            onToggleFocus={() => changeState(drawerState === "focus" ? "half" : "focus")}
            onClear={clearWorkbench}
          />

          {/* Materials bar */}
          <MaterialsZone
            blocks={materialBlocks}
            onAdd={addBlock}
            onUpdate={updateBlock}
            onDelete={deleteBlock}
            onMove={handleMove}
            onDropBlock={handleDrop}
          />

          {/* Body: Workspace (70%) + Results+Answer (30%) */}
          <div className="flex flex-1 overflow-hidden">
            <WorkspaceZone
              blocks={workspaceBlocks}
              onAddBlock={addBlock}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
              onMove={handleMove}
              onDropBlock={handleDrop}
            />
            <ResultsAnswerZone
              resultBlocks={resultBlocks}
              answerBlocks={answerBlocks}
              onAddBlock={addBlock}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
              onMove={handleMove}
              onDropBlock={handleDrop}
            />
          </div>
        </div>
      )}
    </div>
  );
}
