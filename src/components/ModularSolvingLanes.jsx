/**
 * ModularSolvingLanes.jsx
 *
 * Renders inline within the quiz scroll area (not a bottom drawer).
 * Provides Reasoning Lane + Result Lane as a natural continuation
 * of the Source Lane (question / options above).
 *
 * ┌─────────────────────────────────────────────┐
 * │  Source Lane (question + options)   ← above │
 * ╞═════════════════════════════════════════════╡
 * │  ── 推理区 / Reasoning ──                   │  ← this component
 * │  [条件] [变量] [草稿] [推导] …               │
 * ├──────────────────────────┬──────────────────┤
 * │  workspace blocks       │  结果区 / Results │
 * │                         │  关键步骤          │
 * │                         │  候选答案          │
 * └──────────────────────────┴──────────────────┘
 */

import { useState } from "react";
import useModularScratchWorkbench from "../hooks/useModularScratchWorkbench.js";
import BlockCard from "./BlockCard.jsx";
import {
  BLOCK_TYPES,
  BLOCK_ZONES,
  BLOCK_TYPE_THEME,
} from "../lib/solvingBlocks.js";

// ─── Zone drop area ──────────────────────────────────────────────────────────

function ZoneDrop({ zone, onDropBlock, className = "", style = {}, children }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={className}
      style={{
        ...style,
        outline: over ? "1.5px dashed rgba(46,103,248,0.45)" : undefined,
        outlineOffset: over ? "-2px" : undefined,
        borderRadius: over ? 14 : undefined,
        transition: "outline 0.12s ease",
      }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropBlock(id, zone, Infinity);
      }}
    >
      {children}
    </div>
  );
}

// ─── Extraction toolbar ──────────────────────────────────────────────────────

function ExtractionBar({ onAdd }) {
  const [hint, setHint] = useState("");

  function handleExtract(type) {
    const sel = window.getSelection?.()?.toString()?.trim();
    if (!sel) {
      setHint("请先选中题目文字");
      setTimeout(() => setHint(""), 2200);
      return;
    }
    onAdd({ type, zone: BLOCK_ZONES.MATERIALS, content: sel.slice(0, 160), source: "problem" });
    window.getSelection?.()?.removeAllRanges();
  }

  const tags = [
    { type: BLOCK_TYPES.CONDITION, label: "条件" },
    { type: BLOCK_TYPES.GOAL,      label: "目标" },
    { type: BLOCK_TYPES.VARIABLE,  label: "变量" },
    { type: BLOCK_TYPES.EVIDENCE,  label: "证据" },
    { type: BLOCK_TYPES.OTHER,     label: "提取" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">选中并提取</span>
      {tags.map((t) => {
        const th = BLOCK_TYPE_THEME[t.type];
        return (
          <button
            key={t.type}
            onClick={() => handleExtract(t.type)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black transition-colors hover:opacity-80"
            style={{ background: th.bg, color: th.text, border: `1px solid ${th.border}` }}
          >
            <span className="material-symbols-outlined text-[12px]">add</span>
            {t.label}
          </button>
        );
      })}
      {hint && <span className="text-[10px] text-amber-500 font-bold">{hint}</span>}
    </div>
  );
}

// ─── Lane section wrapper ────────────────────────────────────────────────────

function LaneSection({ label, icon, count, actionLabel, onAction, children, className = "" }) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px] text-slate-400">{icon}</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</span>
          {count > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-500">{count}</span>
          )}
        </div>
        {actionLabel && (
          <button
            onClick={onAction}
            className="flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10"
          >
            <span className="material-symbols-outlined text-[12px]">add</span>
            {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Block list renderer ─────────────────────────────────────────────────────

function BlockList({ blocks, zone, onUpdate, onDelete, onMove, onDropBlock, compact = false, emptyText }) {
  function handleDropOnCard(e, targetBlockId) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || id === targetBlockId) return;
    const idx = blocks.findIndex((b) => b.id === targetBlockId);
    onDropBlock(id, zone, idx >= 0 ? idx : Infinity);
  }

  return (
    <ZoneDrop zone={zone} onDropBlock={onDropBlock} className="flex flex-col gap-1.5 min-h-[40px]">
      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-3 text-center text-[11px] text-slate-300">
          {emptyText}
        </p>
      ) : (
        blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            compact={compact}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onMove={onMove}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDrop={(e) => handleDropOnCard(e, block.id)}
          />
        ))
      )}
    </ZoneDrop>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ModularSolvingLanes({ questionId, subject }) {
  if (subject !== "math") return null;

  const {
    blocks,
    saveStatus,
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

  const [confirmClear, setConfirmClear] = useState(false);

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

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
    clearWorkbench();
    setConfirmClear(false);
  }

  const saveLabel =
    saveStatus === "saving" ? "保存中…" :
    saveStatus === "saved"  ? "已保存" :
    saveStatus === "error"  ? "保存失败" : "";

  return (
    <section className="mt-4">
      {/* ── Divider + header ────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="flex items-center gap-2">
          <span
            className="grid size-6 place-items-center rounded-lg text-white"
            style={{ background: "var(--color-primary)" }}
          >
            <span className="material-symbols-outlined text-[14px]">psychology</span>
          </span>
          <span className="text-[13px] font-black text-slate-600">解题推理</span>
          {totalBlocks > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
              {totalBlocks}
            </span>
          )}
          {saveLabel && <span className="text-[10px] text-slate-400">{saveLabel}</span>}
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        {totalBlocks > 0 && (
          <button
            onClick={handleClear}
            className={`text-[10px] font-bold transition-colors ${
              confirmClear ? "text-red-500" : "text-slate-300 hover:text-slate-500"
            }`}
          >
            {confirmClear ? "确认清空" : "清空"}
          </button>
        )}
      </div>

      {/* ── Extraction toolbar ──────────────────────────────── */}
      <div className="mb-4 rounded-xl border border-slate-100 bg-white/80 px-4 py-2.5">
        <ExtractionBar onAdd={addBlock} />
      </div>

      {/* ── Materials (conditions, goals, variables) ─────────── */}
      {materialBlocks.length > 0 && (
        <div className="mb-4">
          <LaneSection
            label="素材"
            icon="inventory_2"
            count={materialBlocks.length}
          >
            <div className="flex flex-wrap gap-1.5">
              {materialBlocks.map((block) => (
                <div key={block.id} className="max-w-[280px]">
                  <BlockCard
                    block={block}
                    compact
                    onUpdate={updateBlock}
                    onDelete={deleteBlock}
                    onMove={handleMove}
                    onDragStart={() => {}}
                    onDragOver={() => {}}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain");
                      if (id && id !== block.id) {
                        const idx = materialBlocks.findIndex((b) => b.id === block.id);
                        handleDrop(id, BLOCK_ZONES.MATERIALS, idx >= 0 ? idx : Infinity);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </LaneSection>
        </div>
      )}

      {/* ── Main body: Workspace + Results ──────────────────── */}
      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        {/* Left: Workspace */}
        <LaneSection
          label="工作区"
          icon="edit_note"
          count={workspaceBlocks.length}
          actionLabel="新增草稿"
          onAction={() => addBlock({ type: BLOCK_TYPES.SCRATCH, zone: BLOCK_ZONES.WORKSPACE, content: "", source: "user" })}
        >
          <BlockList
            blocks={workspaceBlocks}
            zone={BLOCK_ZONES.WORKSPACE}
            onUpdate={updateBlock}
            onDelete={deleteBlock}
            onMove={handleMove}
            onDropBlock={handleDrop}
            emptyText="在这里写推导、计算、疑问。从素材拖入或点新增。"
          />
        </LaneSection>

        {/* Right: Results + Answer */}
        <div className="flex flex-col gap-4">
          <LaneSection
            label="关键步骤"
            icon="checklist"
            count={resultBlocks.length}
            actionLabel="添加步骤"
            onAction={() => addBlock({ type: BLOCK_TYPES.KEY_STEP, zone: BLOCK_ZONES.RESULTS, content: "", source: "user" })}
          >
            <BlockList
              blocks={resultBlocks}
              zone={BLOCK_ZONES.RESULTS}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
              onMove={handleMove}
              onDropBlock={handleDrop}
              compact
              emptyText="拖入或点添加"
            />
          </LaneSection>

          <LaneSection
            label="候选答案"
            icon="task_alt"
            count={answerBlocks.length}
            actionLabel={answerBlocks.length === 0 ? "添加答案" : undefined}
            onAction={() => addBlock({ type: BLOCK_TYPES.ANSWER, zone: BLOCK_ZONES.ANSWER, content: "", source: "user" })}
          >
            <BlockList
              blocks={answerBlocks}
              zone={BLOCK_ZONES.ANSWER}
              onUpdate={updateBlock}
              onDelete={deleteBlock}
              onMove={handleMove}
              onDropBlock={handleDrop}
              compact
              emptyText="从工作区提升或直接添加"
            />
          </LaneSection>
        </div>
      </div>
    </section>
  );
}
