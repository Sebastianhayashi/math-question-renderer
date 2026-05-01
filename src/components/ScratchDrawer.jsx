/**
 * ScratchDrawer v1 — Bottom scratch drawer for math quiz page.
 *
 * Structure:
 *   ScratchDrawer (root, manages state + localStorage)
 *   ├─ DrawerHandle (collapsed bar)
 *   ├─ DrawerHeader (half/focus header bar)
 *   ├─ MaterialStrip (horizontal chip row)
 *   ├─ ScratchEditor (text draft area)
 *   ├─ KeySteps (key step list)
 *   └─ AnswerSlot (candidate answer input)
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SCRATCH_KEY_PREFIX = "scratch-drawer-v1:";

const MATERIAL_TYPES = [
  { id: "condition", label: "条件", color: "rgba(46,103,248,0.10)", border: "rgba(46,103,248,0.28)", text: "#1d4ed8" },
  { id: "goal",      label: "目标",  color: "rgba(20,216,109,0.10)", border: "rgba(20,216,109,0.30)", text: "#047857" },
  { id: "variable",  label: "变量",  color: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.30)", text: "#92400e" },
  { id: "other",     label: "其他",  color: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.30)", text: "#475569" },
];

const HEIGHTS = {
  collapsed: 52,
  half: Math.round(window?.innerHeight * 0.33 || 320),
  focus: Math.round(window?.innerHeight * 0.60 || 520),
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function createScratchId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyScratch(questionId) {
  return {
    questionId: questionId || "",
    materials: [],
    scratchText: "",
    keySteps: [],
    answerDraft: "",
    updatedAt: Date.now(),
  };
}

function loadScratch(questionId) {
  if (!questionId || typeof window === "undefined") return createEmptyScratch(questionId);
  try {
    const raw = window.localStorage.getItem(SCRATCH_KEY_PREFIX + questionId);
    if (!raw) return createEmptyScratch(questionId);
    const parsed = JSON.parse(raw);
    return {
      ...createEmptyScratch(questionId),
      ...parsed,
    };
  } catch {
    return createEmptyScratch(questionId);
  }
}

function saveScratch(data) {
  if (!data?.questionId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SCRATCH_KEY_PREFIX + data.questionId,
      JSON.stringify({ ...data, updatedAt: Date.now() })
    );
  } catch {
    // storage full — ignore
  }
}

function getMaterialType(id) {
  return MATERIAL_TYPES.find((t) => t.id === id) || MATERIAL_TYPES[3];
}

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Material chip */
function MaterialChip({ material, onRemove, onTypeChange }) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const mtype = getMaterialType(material.type);

  return (
    <span
      className="relative inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none"
      style={{ background: mtype.color, borderColor: mtype.border, color: mtype.text }}
    >
      {/* Type label button */}
      <button
        onClick={() => setShowTypeMenu((v) => !v)}
        className="font-black opacity-80 hover:opacity-100 transition-opacity"
        title="切换类型"
        aria-label="切换类型"
      >
        {mtype.label}
      </button>

      {/* Type dropdown */}
      {showTypeMenu && (
        <span
          className="absolute bottom-full left-0 mb-1 z-50 flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          style={{ minWidth: 72 }}
        >
          {MATERIAL_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onTypeChange(material.id, t.id);
                setShowTypeMenu(false);
              }}
              className="rounded-lg px-2 py-1 text-left text-[11px] font-bold transition-colors hover:bg-slate-50"
              style={{ color: t.text }}
            >
              {t.label}
            </button>
          ))}
        </span>
      )}

      {/* Content */}
      <span className="max-w-[160px] truncate opacity-90" title={material.content}>
        {material.content}
      </span>

      {/* Delete */}
      <button
        onClick={() => onRemove(material.id)}
        className="ml-0.5 grid size-3.5 shrink-0 place-items-center rounded-full opacity-50 hover:opacity-100 hover:bg-black/10 transition-opacity"
        aria-label="删除素材"
      >
        <span className="material-symbols-outlined text-[11px]">close</span>
      </button>
    </span>
  );
}

/** Material strip — horizontal scrollable chip row */
function MaterialStrip({ materials, onAddFromSelection, onRemove, onTypeChange }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
      {/* Add from selection button */}
      <button
        onClick={onAddFromSelection}
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:border-primary hover:text-primary"
        title="把选中的文字加入素材条"
      >
        <span className="material-symbols-outlined text-[13px]">add</span>
        加入选中
      </button>

      {/* Chips */}
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {materials.length === 0 && (
          <span className="text-[11px] text-slate-300 select-none">选中题目文字后点「加入选中」</span>
        )}
        {materials.map((m) => (
          <MaterialChip
            key={m.id}
            material={m}
            onRemove={onRemove}
            onTypeChange={onTypeChange}
          />
        ))}
      </div>
    </div>
  );
}

/** Key steps list */
function KeySteps({ steps, onAdd, onRemove }) {
  const [inputVisible, setInputVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  function handleAdd() {
    // Try to use selected text first
    const sel = typeof window !== "undefined" ? window.getSelection?.()?.toString().trim() : "";
    if (sel) {
      onAdd(sel);
      window.getSelection?.()?.removeAllRanges();
    } else {
      setInputVisible(true);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }

  function commitDraft() {
    const t = draft.trim();
    if (t) onAdd(t);
    setDraft("");
    setInputVisible(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          关键步骤 {steps.length > 0 ? `(${steps.length})` : ""}
        </span>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10"
        >
          <span className="material-symbols-outlined text-[13px]">add</span>
          添加步骤
        </button>
      </div>

      {inputVisible && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitDraft(); }
              if (e.key === "Escape") { setDraft(""); setInputVisible(false); }
            }}
            placeholder="输入关键步骤…"
            className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-[12px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <button
            onClick={commitDraft}
            className="rounded-xl bg-primary px-3 py-1.5 text-[11px] font-black text-white"
          >
            添加
          </button>
          <button
            onClick={() => { setDraft(""); setInputVisible(false); }}
            className="rounded-xl px-2 py-1.5 text-[11px] text-slate-400 hover:bg-slate-50"
          >
            取消
          </button>
        </div>
      )}

      {steps.map((step, i) => (
        <div
          key={step.id}
          className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white/80 px-3 py-2"
        >
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
            {i + 1}
          </span>
          <span className="flex-1 text-[12px] leading-relaxed text-slate-700">{step.content}</span>
          <button
            onClick={() => onRemove(step.id)}
            className="grid size-5 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
            aria-label="删除步骤"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}

/** Answer slot */
function AnswerSlot({ value, onChange }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-2.5">
      <span className="shrink-0 text-[11px] font-black text-slate-400 uppercase tracking-wider">候选答案</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例如：A / D / x > 1/3 / 定义域为…"
        className="flex-1 bg-transparent text-[13px] font-bold text-slate-700 outline-none placeholder:text-slate-300"
      />
    </div>
  );
}

// ─── DrawerHeader ─────────────────────────────────────────────────────────────

function DrawerHeader({ state, materials, keySteps, onCollapse, onToggleFocus, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    onClear();
    setConfirmClear(false);
  }

  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4">
      {/* Left info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="grid size-6 place-items-center rounded-lg text-white"
            style={{ background: "var(--color-primary)" }}
          >
            <span className="material-symbols-outlined text-[14px]">edit_note</span>
          </span>
          <span className="text-[13px] font-black text-slate-700">草稿</span>
        </div>
        {materials.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
            素材 {materials.length}
          </span>
        )}
        {keySteps.length > 0 && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
            步骤 {keySteps.length}
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        {/* Focus toggle */}
        <button
          onClick={onToggleFocus}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary"
          title={state === "focus" ? "退出专注" : "专注模式"}
        >
          <span className="material-symbols-outlined text-[15px]">
            {state === "focus" ? "unfold_less" : "unfold_more"}
          </span>
          {state === "focus" ? "退出专注" : "专注"}
        </button>

        {/* Clear */}
        <button
          onClick={handleClear}
          className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-colors ${
            confirmClear
              ? "bg-red-50 text-red-500 hover:bg-red-100"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          }`}
          title="清空本题草稿"
          onBlur={() => setConfirmClear(false)}
        >
          <span className="material-symbols-outlined text-[15px]">
            {confirmClear ? "warning" : "delete_sweep"}
          </span>
          {confirmClear ? "确认清空" : "清空"}
        </button>

        {/* Collapse */}
        <button
          onClick={onCollapse}
          className="grid size-7 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          title="收起"
          aria-label="收起草稿区"
        >
          <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
        </button>
      </div>
    </div>
  );
}

// ─── DrawerHandle (collapsed bar) ─────────────────────────────────────────────

function DrawerHandle({ materials, keySteps, answerDraft, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex h-full w-full items-center gap-3 px-4 text-left transition-colors hover:bg-slate-50/80"
      aria-label="展开草稿区"
    >
      {/* Icon + label */}
      <span className="flex items-center gap-1.5 shrink-0">
        <span
          className="grid size-6 place-items-center rounded-lg text-white"
          style={{ background: "var(--color-primary)" }}
        >
          <span className="material-symbols-outlined text-[14px]">edit_note</span>
        </span>
        <span className="text-[12px] font-black text-slate-600">草稿</span>
      </span>

      {/* Divider */}
      <span className="h-4 w-px bg-slate-200 shrink-0" />

      {/* Summary chips */}
      <span className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
        {materials.length > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
            素材 {materials.length}
          </span>
        )}
        {keySteps.length > 0 && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
            步骤 {keySteps.length}
          </span>
        )}
        {answerDraft && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 max-w-[120px] truncate">
            答案：{answerDraft}
          </span>
        )}
        {!materials.length && !keySteps.length && !answerDraft && (
          <span className="text-[11px] text-slate-300">点击展开草稿…</span>
        )}
      </span>

      {/* Expand icon */}
      <span className="material-symbols-outlined shrink-0 text-[18px] text-slate-400">
        keyboard_arrow_up
      </span>
    </button>
  );
}

// ─── Main ScratchDrawer ───────────────────────────────────────────────────────

export default function ScratchDrawer({ questionId, subject }) {
  // Only show for math for now (can extend later)
  const isActive = subject === "math";

  const [drawerState, setDrawerState] = useState("collapsed"); // "collapsed" | "half" | "focus"
  const [scratch, setScratch] = useState(() => loadScratch(questionId));
  const [savedAt, setSavedAt] = useState(null);

  // Reload scratch data when questionId changes
  useEffect(() => {
    setScratch(loadScratch(questionId));
  }, [questionId]);

  // Debounced save
  const debouncedSave = useDebounce((data) => {
    saveScratch(data);
    setSavedAt(Date.now());
  }, 400);

  function updateScratch(updater) {
    setScratch((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      const withId = { ...next, questionId };
      debouncedSave(withId);
      return withId;
    });
  }

  // ── Drawer state transitions ────────────────────────────────────
  function expandToHalf() { setDrawerState("half"); }
  function collapseDrawer() {
    setDrawerState((s) => (s === "focus" ? "half" : "collapsed"));
  }
  function toggleFocus() {
    setDrawerState((s) => (s === "focus" ? "half" : "focus"));
  }

  // ── Materials ───────────────────────────────────────────────────
  function addMaterialFromSelection() {
    const sel = typeof window !== "undefined" ? window.getSelection?.()?.toString().trim() : "";
    if (!sel) {
      // visual hint — briefly flash the button (handled by CSS)
      return;
    }
    const newMaterial = {
      id: createScratchId(),
      questionId,
      type: "other",
      content: sel.slice(0, 80),
      createdAt: Date.now(),
    };
    updateScratch((prev) => ({ ...prev, materials: [...prev.materials, newMaterial] }));
    window.getSelection?.()?.removeAllRanges();
    if (drawerState === "collapsed") setDrawerState("half");
  }

  function removeMaterial(id) {
    updateScratch((prev) => ({ ...prev, materials: prev.materials.filter((m) => m.id !== id) }));
  }

  function changeMaterialType(id, newType) {
    updateScratch((prev) => ({
      ...prev,
      materials: prev.materials.map((m) => (m.id === id ? { ...m, type: newType } : m)),
    }));
  }

  // ── Scratch text ────────────────────────────────────────────────
  function updateScratchText(text) {
    updateScratch((prev) => ({ ...prev, scratchText: text }));
  }

  // ── Key steps ───────────────────────────────────────────────────
  function addKeyStep(content) {
    if (!content.trim()) return;
    const step = { id: createScratchId(), questionId, content: content.trim(), createdAt: Date.now() };
    updateScratch((prev) => ({ ...prev, keySteps: [...prev.keySteps, step] }));
  }

  function removeKeyStep(id) {
    updateScratch((prev) => ({ ...prev, keySteps: prev.keySteps.filter((s) => s.id !== id) }));
  }

  // ── Answer draft ────────────────────────────────────────────────
  function updateAnswer(text) {
    updateScratch((prev) => ({ ...prev, answerDraft: text }));
  }

  // ── Clear ───────────────────────────────────────────────────────
  function clearScratch() {
    const empty = createEmptyScratch(questionId);
    setScratch(empty);
    saveScratch(empty);
  }

  // ── Heights ─────────────────────────────────────────────────────
  const drawerHeight =
    drawerState === "collapsed"
      ? HEIGHTS.collapsed
      : drawerState === "focus"
        ? Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.60)
        : Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.33);

  if (!isActive) return null;

  return (
    <div
      className="relative shrink-0 overflow-hidden border-t border-slate-100 bg-white/92 shadow-[0_-8px_32px_rgba(15,23,42,0.07)] backdrop-blur-xl"
      style={{
        height: drawerHeight,
        transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}
      aria-label="草稿区"
    >
      {/* ── COLLAPSED ─────────────────────────────────────────── */}
      {drawerState === "collapsed" && (
        <DrawerHandle
          materials={scratch.materials}
          keySteps={scratch.keySteps}
          answerDraft={scratch.answerDraft}
          onClick={expandToHalf}
        />
      )}

      {/* ── HALF / FOCUS ──────────────────────────────────────── */}
      {drawerState !== "collapsed" && (
        <div className="flex h-full flex-col">
          {/* Header */}
          <DrawerHeader
            state={drawerState}
            materials={scratch.materials}
            keySteps={scratch.keySteps}
            onCollapse={collapseDrawer}
            onToggleFocus={toggleFocus}
            onClear={clearScratch}
          />

          {/* Material strip */}
          <MaterialStrip
            materials={scratch.materials}
            onAddFromSelection={addMaterialFromSelection}
            onRemove={removeMaterial}
            onTypeChange={changeMaterialType}
          />

          {/* Body: editor + steps + answer */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: scratch editor */}
            <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-100">
              <textarea
                value={scratch.scratchText}
                onChange={(e) => updateScratchText(e.target.value)}
                placeholder={"写下你的推导、计算、疑问……\n\n例如：\n设 f(x) 的定义域为 (-3,4)\n∴ -3 < x+2 < 4\n∴ -5 < x < 2"}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-[13px] leading-relaxed text-slate-700 placeholder:text-slate-300 outline-none"
                spellCheck={false}
                style={{ fontFamily: "inherit" }}
              />
            </div>

            {/* Right: steps + answer */}
            <div className="flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto px-4 py-3">
              <KeySteps
                steps={scratch.keySteps}
                onAdd={addKeyStep}
                onRemove={removeKeyStep}
              />
              <AnswerSlot
                value={scratch.answerDraft}
                onChange={updateAnswer}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
