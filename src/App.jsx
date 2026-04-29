import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionBlocks } from "./components/QuestionBlocks.jsx";
import { RichText } from "./components/RichText.jsx";
import { questionBank } from "./data/questionBank.js";
import { cx } from "./lib/cx.js";
import topicFunctionIcon from "./assets/topic-function.png";
import topicInequalityIcon from "./assets/topic-inequality.png";
import topicSetsIcon from "./assets/topic-sets.png";

const TOPIC_ORDER = ["sets", "inequality", "function"];
const TOPIC_META = {
  sets: {
    title: "集合",
    subtitle: "集合与常用逻辑用语",
    accent: "#2E67F8",
    soft: "rgba(46,103,248,0.10)",
  },
  inequality: {
    title: "基本不等式",
    subtitle: "一元二次函数、方程和不等式",
    accent: "#2563EB",
    soft: "rgba(37,99,235,0.10)",
  },
  function: {
    title: "函数",
    subtitle: "函数的概念与表示",
    accent: "#1D4ED8",
    soft: "rgba(29,78,216,0.10)",
  },
};
const TOPIC_ICON_SRC = {
  sets: topicSetsIcon,
  inequality: topicInequalityIcon,
  function: topicFunctionIcon,
};
const SOLVING_RECORDS_KEY = "astro-math-solving-records-v1";
const NOTE_TAGS = [
  { id: "known", label: "已知", icon: "rule", hint: "记录题目已经给出的条件" },
  { id: "target", label: "目标", icon: "flag", hint: "记录这一步要证明或求什么" },
  { id: "assumption", label: "假设", icon: "psychology_alt", hint: "记录临时假设或默认共识" },
  { id: "translate", label: "转化", icon: "sync_alt", hint: "把题目翻译成数学语言" },
];
const MARK_TAGS = [
  { id: "unknown", label: "不知道", icon: "help" },
  { id: "unfamiliar", label: "不熟悉", icon: "priority_high" },
  { id: "focus", label: "重点", icon: "bookmark" },
];
const TOOL_MODULES_KEY = "astro-math-solving-tool-modules-v1";
const TOOL_MODULES = [
  { id: "notes", label: "条件", icon: "rule", locked: true },
  { id: "marks", label: "疑点", icon: "help" },
  { id: "review", label: "复盘", icon: "reviews" },
];
const DEFAULT_TOOL_MODULES = {
  notes: true,
  marks: false,
  review: false,
};

function getInitialPage() {
  return questionBank.pages[0]?.id;
}

function getInitialCollapsedTopics() {
  const initialType = getTopicType(questionBank.pages[0]);
  return Object.fromEntries(TOPIC_ORDER.map((type) => [type, type !== initialType]));
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyRecord(meta = {}) {
  return {
    meta,
    notes: [],
    marks: [],
    updatedAt: null,
  };
}

function loadSolvingRecords() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(SOLVING_RECORDS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSolvingRecords(records) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOLVING_RECORDS_KEY, JSON.stringify(records));
}

function loadToolModules() {
  if (typeof window === "undefined") return DEFAULT_TOOL_MODULES;

  try {
    return {
      ...DEFAULT_TOOL_MODULES,
      ...JSON.parse(window.localStorage.getItem(TOOL_MODULES_KEY) || "{}"),
      notes: true,
    };
  } catch {
    return DEFAULT_TOOL_MODULES;
  }
}

function saveToolModules(modules) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOOL_MODULES_KEY, JSON.stringify({ ...modules, notes: true }));
}

function applySoftSelectionHighlight(range) {
  if (typeof window === "undefined" || !range) return;

  try {
    if (window.CSS?.highlights && window.Highlight) {
      const ranges = window.__astroStudyHighlightRanges || [];
      ranges.push(range.cloneRange());
      window.__astroStudyHighlightRanges = ranges;
      window.CSS.highlights.set("study-mark", new window.Highlight(...ranges));
      return;
    }
  } catch {
    // Fall back to a DOM mark for older browsers.
  }

  try {
    const mark = document.createElement("mark");
    mark.className = "study-inline-highlight";
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
  } catch {
    // Highlighting is a visual affordance only; the saved mark still works.
  }
}

function isPointInsideRange(range, x, y) {
  if (!range) return false;
  return Array.from(range.getClientRects()).some(
    (rect) => x >= rect.left - 6 && x <= rect.right + 6 && y >= rect.top - 6 && y <= rect.bottom + 6
  );
}

function getReadableSelectionText(selection, range) {
  const fallback = selection.toString().replace(/\s+/g, " ").trim();

  try {
    const fragment = range.cloneContents();
    const latexItems = Array.from(
      fragment.querySelectorAll('annotation[encoding="application/x-tex"]')
    )
      .map((node) => node.textContent?.trim())
      .filter(Boolean);

    if (latexItems.length) {
      return latexItems.map((latex) => `$${latex}$`).join(" ");
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function isDisplayMathElement(element) {
  const wrapper = element.parentElement;
  return wrapper?.classList.contains("block") || wrapper?.classList.contains("katex-display");
}

function tableToMarkdown(table) {
  const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.children).map((cell) => serializeNodeToMarkdown(cell).replace(/\s+/g, " ").trim())
  );

  if (!rows.length) return "";
  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [...row, ...Array(Math.max(0, columnCount - row.length)).fill("")]);
  const [head, ...body] = normalizedRows;
  const separator = Array.from({ length: columnCount }, () => "---");

  return [head, separator, ...body]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");
}

function serializeNodeToMarkdown(node) {
  if (!node) return "";

  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    return Array.from(node.childNodes).map((child) => serializeNodeToMarkdown(child)).join("");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node;
  const tagName = element.tagName.toLowerCase();

  if (element.classList.contains("katex")) {
    const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
    const latex = annotation?.textContent?.trim();
    if (!latex) return element.textContent || "";
    return isDisplayMathElement(element) ? `\n$$${latex}$$\n` : `$${latex}$`;
  }

  if (element.closest(".katex")) return "";
  if (element.classList.contains("material-symbols-outlined")) return "";
  if (["script", "style", "svg"].includes(tagName)) return "";
  if (tagName === "br") return "\n";
  if (tagName === "table") return `\n${tableToMarkdown(element)}\n`;
  if (tagName === "input" || tagName === "textarea") return element.value || "";
  if (tagName === "img") return element.alt ? `![${element.alt}]` : "";

  const childText = Array.from(element.childNodes).map((child) => serializeNodeToMarkdown(child)).join("");

  if (tagName === "strong" || tagName === "b") return `**${childText.trim()}**`;
  if (tagName === "em" || tagName === "i") return `*${childText.trim()}*`;
  if (tagName === "li") return `- ${childText.trim()}\n`;

  if (["p", "div", "section", "article", "figure", "tr", "header", "footer"].includes(tagName)) {
    const trimmed = childText.trim();
    return trimmed ? `${trimmed}\n` : "";
  }

  return childText;
}

function normalizeMarkdownCopy(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function getSelectionMarkdown(selection) {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return "";

  const fragments = [];
  for (let index = 0; index < selection.rangeCount; index += 1) {
    const fragment = selection.getRangeAt(index).cloneContents();
    fragments.push(serializeNodeToMarkdown(fragment));
  }

  return normalizeMarkdownCopy(fragments.join("\n"));
}

function getTopicType(pageOrSection) {
  const text = [
    pageOrSection?.chapterTitle,
    pageOrSection?.sectionTitle,
    pageOrSection?.title,
    pageOrSection?.partTitle,
  ]
    .filter(Boolean)
    .join(" ");

  if (/不等式|二次函数|方程|第二章|2\./.test(text)) return "inequality";
  if (/函数|映射|3\.1/.test(text)) return "function";
  return "sets";
}

function getTopicMeta(type) {
  return TOPIC_META[type] || TOPIC_META.sets;
}

function TopicIcon({ type = "sets", size = 24, className }) {
  return (
    <img
      src={TOPIC_ICON_SRC[type] || TOPIC_ICON_SRC.sets}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cx("block rounded-[22%] object-cover", className)}
      style={{
        width: size,
        height: size,
        transform: "scale(1.28)",
      }}
    />
  );
}

function collectQuestionText(question) {
  const blockText = question.blocks
    .flatMap((block) => {
      if (block.content) return block.content;
      if (block.options) return block.options.flatMap((option) => option.content);
      return [];
    })
    .map((item) => (typeof item === "string" ? item : Object.values(item).join(" ")))
    .join(" ");

  return [
    question.no,
    question.title,
    question.group,
    question.source,
    question.typeLabel,
    ...question.tags,
    blockText,
  ]
    .filter(Boolean)
    .join(" ");
}

function matchesKeyword(page, question, keyword) {
  if (!keyword) return true;
  const haystack = [page.chapterTitle, page.sectionTitle, page.title, collectQuestionText(question)]
    .join(" ")
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function groupPagesBySection(pages) {
  return pages.reduce((sections, page) => {
    const sectionTitle = page.sectionTitle || "未分章节";
    const chapterTitle = page.chapterTitle || "未分章";
    const existing = sections.find(
      (section) => section.title === sectionTitle && section.chapterTitle === chapterTitle
    );

    if (existing) {
      existing.pages.push(page);
    } else {
      sections.push({
        title: sectionTitle,
        chapterTitle,
        pages: [page],
      });
    }

    return sections;
  }, []);
}

function groupSectionsByTopic(sections) {
  const grouped = TOPIC_ORDER.map((type) => ({
    type,
    ...getTopicMeta(type),
    sections: [],
    questionsCount: 0,
  }));

  sections.forEach((section) => {
    const topic = grouped.find((item) => item.type === getTopicType(section)) || grouped[0];
    const questionsCount = section.pages.reduce((sum, page) => sum + page.questions.length, 0);
    topic.sections.push(section);
    topic.questionsCount += questionsCount;
  });

  return grouped.filter((topic) => topic.sections.length > 0);
}

function computeSolarMap(pages) {
  const topics = groupSectionsByTopic(groupPagesBySection(pages));
  const TOPIC_GAP = 700;
  const LEFT_PADDING = 360;
  const CANVAS_H = 760;
  const CANVAS_W = Math.max(980, LEFT_PADDING * 2 + TOPIC_GAP * Math.max(0, topics.length - 1));

  const solarTopics = topics.map((topic, topicIndex) => {
    const cx = LEFT_PADDING + topicIndex * TOPIC_GAP;
    const cy = 380;
    const firstRingCount = Math.min(topic.sections.length, 8);
    const secondRingCount = Math.max(0, topic.sections.length - 8);
    const satellites = topic.sections.map((section, index) => {
      const isSecondRing = index >= 8;
      const ringIndex = isSecondRing ? index - 8 : index;
      const ringCount = isSecondRing ? secondRingCount : firstRingCount;
      const angleOffset = isSecondRing ? -Math.PI / 2 + Math.PI / Math.max(1, ringCount) : -Math.PI / 2;
      const angle = angleOffset + (2 * Math.PI * ringIndex) / Math.max(1, ringCount);
      const rx = isSecondRing ? 320 : 245;
      const ry = isSecondRing ? 245 : 175;

      return {
        section,
        page: section.pages[0],
        pagesCount: section.pages.length,
        questionsCount: section.pages.reduce((sum, page) => sum + page.questions.length, 0),
        x: Math.round(cx + Math.cos(angle) * rx),
        y: Math.round(cy + Math.sin(angle) * ry),
        angle,
        isSecondRing,
      };
    });

    return { ...topic, x: cx, y: cy, satellites };
  });

  return { topics: solarTopics, canvasW: CANVAS_W, canvasH: CANVAS_H };
}

function SolvingToolPanel({
  isOpen,
  onToggle,
  windowMode,
  windowLayout,
  onDock,
  onFloat,
  onZoomIn,
  onZoomOut,
  onStartWindowDrag,
  onStartWindowResize,
  activeTag,
  onActiveTagChange,
  noteDraft,
  onNoteDraftChange,
  onAddNote,
  onRemoveNote,
  onRemoveMark,
  toolModules,
  onToggleToolModule,
  record,
  reviewRecords,
}) {
  const totalCount = (record?.notes?.length || 0) + (record?.marks?.length || 0);
  const isFloating = windowMode === "float";

  if (!isOpen) {
    return (
      <aside className="flex w-[64px] shrink-0 items-start justify-center border-l border-slate-200 bg-white/80 pt-5 shadow-sm backdrop-blur">
        <button
          onClick={onToggle}
          className="relative grid size-11 place-items-center rounded-2xl bg-primary text-white shadow-md transition-transform hover:-translate-y-0.5"
          title="解题记录"
          aria-label="打开解题记录"
        >
          <span className="material-symbols-outlined text-[22px]">edit_note</span>
          {totalCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-primary shadow-sm">
              {totalCount}
            </span>
          )}
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={cx(
        "flex shrink-0 flex-col bg-white shadow-float backdrop-blur-xl",
        isFloating
          ? "fixed z-40 overflow-hidden rounded-[28px] border border-white/90 ring-1 ring-slate-200/90"
          : "w-[312px] border-l border-slate-200"
      )}
      style={
        isFloating
          ? {
              left: windowLayout.x,
              top: windowLayout.y,
              width: windowLayout.width,
              height: windowLayout.height,
              background: "rgba(255,255,255,0.96)",
              boxShadow: "0 24px 70px rgba(15,23,42,0.18), 0 0 0 1px rgba(255,255,255,0.88)",
            }
          : undefined
      }
    >
      <header
        onPointerDown={onStartWindowDrag}
        className={cx(
          "flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4",
          "cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2" onPointerDown={(event) => event.stopPropagation()}>
            <button
              onClick={onToggle}
              className="size-3 rounded-full bg-red-300 ring-1 ring-red-400/25 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-300"
              aria-label="关闭解题记录"
              title="关闭"
            />
            <button
              onClick={onDock}
              className="size-3 rounded-full bg-amber-300 ring-1 ring-amber-400/25 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300"
              aria-label="停靠解题记录"
              title="停靠"
            />
            <button
              onClick={onFloat}
              className="size-3 rounded-full bg-emerald-300 ring-1 ring-emerald-400/25 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              aria-label="拖出解题记录"
              title="拖出"
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-black text-slate-800">解题记录</h3>
            {!isFloating && <p className="mt-0.5 text-[10px] font-bold text-muted">拖动标题栏可浮出</p>}
          </div>
        </div>
        {isFloating && (
          <div className="flex shrink-0 items-center gap-1" onPointerDown={(event) => event.stopPropagation()}>
            <button
              onClick={onZoomOut}
              className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="缩小解题记录"
              title="缩小"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <button
              onClick={onZoomIn}
              className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="放大解题记录"
              title="放大"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto px-4 py-4">
        <section className="mb-3 rounded-2xl border border-slate-100 bg-white/85 p-2 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="px-1 text-[10px] font-black uppercase tracking-wider text-muted">工具</span>
            <div className="flex items-center gap-1">
              {TOOL_MODULES.map((module) => {
                const isActive = toolModules?.[module.id];
                return (
                  <button
                    key={module.id}
                    onClick={() => !module.locked && onToggleToolModule(module.id)}
                    disabled={module.locked}
                    className={cx(
                      "flex items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-black transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                      module.locked && "cursor-default"
                    )}
                    title={module.locked ? "核心功能保持开启" : isActive ? `隐藏${module.label}` : `添加${module.label}`}
                    aria-pressed={isActive}
                  >
                    <span className="material-symbols-outlined text-[15px]">{module.icon}</span>
                    {module.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">快速标签</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {NOTE_TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onActiveTagChange(tag.id)}
                title={tag.hint}
                aria-label={tag.label}
                className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center transition-all"
                style={{
                  background: activeTag === tag.id ? "rgba(46,103,248,0.12)" : "#fff",
                  color: activeTag === tag.id ? "var(--color-primary)" : "var(--color-muted)",
                  boxShadow: activeTag === tag.id ? "inset 0 0 0 1px rgba(46,103,248,0.22)" : "inset 0 0 0 1px #e2e8f0",
                }}
              >
                <span className="material-symbols-outlined text-[19px]">{tag.icon}</span>
                <span className="text-[10px] font-black leading-none">{tag.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={onAddNote} className="mt-3 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-inner">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[18px]">
                {NOTE_TAGS.find((tag) => tag.id === activeTag)?.icon || "edit_note"}
              </span>
            </span>
            <input
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder={`${NOTE_TAGS.find((tag) => tag.id === activeTag)?.label || "记录"}：写一句就好`}
              className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-slate-700 outline-none placeholder:text-slate-300"
            />
            <button
              type="submit"
              className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm transition-transform hover:-translate-y-0.5"
              aria-label="添加记录"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
          </form>
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">本题条件</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-muted">
              {record?.notes?.length || 0}
            </span>
          </div>
          <div className="grid gap-2">
            {record?.notes?.length ? (
              record.notes.map((note) => {
                const tag = NOTE_TAGS.find((item) => item.id === note.type) || NOTE_TAGS[0];
                return (
                  <div key={note.id} className="group flex gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[17px]">{tag.icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[10px] font-black text-primary">[{tag.label}]</p>
                      <p className="break-words text-[13px] font-bold leading-snug text-slate-700">
                        <RichText content={[note.text]} />
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveNote(note.id)}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100"
                      aria-label="删除记录"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-5 text-center text-[12px] font-bold text-muted">
                先把题目翻译成一两条条件。
              </p>
            )}
          </div>
        </section>

        {toolModules?.marks && (
        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">标记疑点</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-muted">
              {record?.marks?.length || 0}
            </span>
          </div>
          <div className="grid gap-2">
            {record?.marks?.length ? (
              record.marks.map((mark) => {
                const tag = MARK_TAGS.find((item) => item.id === mark.type) || MARK_TAGS[0];
                return (
                  <div key={mark.id} className="group flex gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                      <span className="material-symbols-outlined text-[17px]">{tag.icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[10px] font-black text-amber-600">[{tag.label}]</p>
                      <p className="break-words text-[13px] font-bold leading-snug text-slate-700">
                        <RichText content={[mark.text]} />
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveMark(mark.id)}
                      className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100"
                      aria-label="删除标记"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-3 py-5 text-center text-[12px] font-bold text-muted">
                选中题目文字后，可标为不知道、不熟悉或重点。
              </p>
            )}
          </div>
        </section>
        )}

        {toolModules?.review && (
        <details className="mt-5 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-[12px] font-black text-slate-700">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[17px] text-primary">reviews</span>
              复盘队列
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-muted">
              {reviewRecords.length}
            </span>
          </summary>
          <div className="mt-3 grid gap-2">
            {reviewRecords.length ? (
              reviewRecords.slice(0, 8).map(([questionId, item]) => (
                <div key={questionId} className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="truncate text-[11px] font-black text-slate-700">
                    {item.meta?.sectionTitle || "练习"} · 第 {item.meta?.questionNo || "?"} 题
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-muted">
                    {item.notes?.length || 0} 条条件 · {item.marks?.length || 0} 个疑点
                  </p>
                </div>
              ))
            ) : (
              <p className="py-3 text-center text-[11px] font-bold text-muted">还没有需要复盘的题目。</p>
            )}
          </div>
        </details>
        )}
      </div>
      {isFloating && (
        <button
          onPointerDown={onStartWindowResize}
          className="absolute bottom-2 right-2 grid size-8 cursor-nwse-resize place-items-center rounded-xl text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
          aria-label="调整解题记录窗口大小"
          title="拖动调整大小"
        >
          <span className="material-symbols-outlined rotate-90 text-[18px]">drag_handle</span>
        </button>
      )}
    </aside>
  );
}

function SelectionMarkMenu({ menu, onMark, onStartDragOut, onClose }) {
  if (!menu) return null;

  return (
    <div
      className="fixed z-50 flex items-center gap-1 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-float backdrop-blur"
      style={{ left: menu.x, top: menu.y, transform: "translateX(-50%)" }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {MARK_TAGS.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onMark(tag.id)}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
          title={tag.label}
        >
          <span className="material-symbols-outlined text-[16px]">{tag.icon}</span>
          {tag.label}
        </button>
      ))}
      <button
        onPointerDown={onStartDragOut}
        className="flex cursor-grab items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary active:cursor-grabbing"
        title="拖出为条件卡片"
      >
        <span className="material-symbols-outlined text-[16px]">drag_pan</span>
        拖出
      </button>
      <button
        onClick={onClose}
        className="grid size-8 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
        aria-label="关闭标记菜单"
      >
        <span className="material-symbols-outlined text-[16px]">close</span>
      </button>
    </div>
  );
}

function FloatingConditionCard({ card, onPointerDown, onRemove }) {
  const tag = MARK_TAGS.find((item) => item.id === card.type) || { label: "条件", icon: "drag_pan" };

  return (
    <div
      className="fixed z-30 max-w-[260px] rounded-2xl border border-white/80 bg-white/92 p-3 shadow-float ring-1 ring-slate-200/80 backdrop-blur"
      style={{ left: card.x, top: card.y }}
    >
      <div
        onPointerDown={(event) => onPointerDown(event, card.id)}
        className="flex cursor-grab items-center gap-2 active:cursor-grabbing"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[17px]">{tag.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-primary">[{tag.label}]</p>
          <p className="line-clamp-3 break-words text-[13px] font-bold leading-snug text-slate-700">
            <RichText content={[card.text]} />
          </p>
        </div>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove(card.id)}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
          aria-label="删除条件卡片"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}

function HomePage({
  currentPage,
  onContinue,
  onOpenMap,
  onSearch,
  keyword,
  onKeywordChange,
  topicStats,
  totalQuestions,
  reviewCount,
}) {
  const progress = 42;
  const courseCards = [
    {
      id: "math-required-1",
      title: "高中数学必修一",
      subtitle: "集合 / 函数 / 指数",
      icon: "function",
      count: totalQuestions,
      action: onContinue,
    },
    ...topicStats.map((topic) => ({
      id: topic.type,
      title: `高中数学 · ${topic.title}`,
      subtitle: topic.subtitle,
      icon: topic.type,
      count: topic.questionsCount,
      action: () => onOpenMap(topic.type),
    })),
  ];
  const quickCards = [
    {
      title: "今日 10 题",
      subtitle: "每日精选，巩固提升",
      icon: "calendar_month",
      tone: "blue",
      action: onContinue,
    },
    {
      title: "错题复习",
      subtitle: reviewCount ? `${reviewCount} 道题需要回看` : "查漏补缺，复盘疑点",
      icon: "cancel",
      tone: "red",
      action: onContinue,
    },
    {
      title: "随机挑战",
      subtitle: "随机组题，挑战自我",
      icon: "casino",
      tone: "purple",
      action: onContinue,
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="shrink-0 px-10 pb-5 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="font-display text-[34px] font-bold leading-tight text-slate-900">Homepage</h2>
            <p className="mt-2 text-sm font-bold text-muted">选择你的学习目标</p>
          </div>
          <div className="flex items-center gap-3 rounded-full border-b-[4px] border-[#CBD5E1] bg-surface p-2 pr-5 shadow-float">
            <div className="flex items-center gap-2 rounded-full border-2 border-background bg-background px-3 py-1">
              <span
                className="material-symbols-outlined text-gold text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                stars
              </span>
              <span className="font-display text-sm font-bold">1,250</span>
            </div>
            <div className="size-8 rounded-full bg-slate-200" />
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
          className="mt-7 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm transition-all focus-within:border-primary focus-within:shadow-float"
        >
          <span className="material-symbols-outlined shrink-0 text-[24px] text-muted">search</span>
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索题库、章节、题型..."
            className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-slate-700 outline-none placeholder:text-slate-400"
          />
        </form>
      </header>

      <div className="grid gap-7 px-10 pb-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-float">
          <h3 className="text-[18px] font-black text-slate-900">继续学习</h3>
          <div className="mt-5 flex items-center gap-6">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10">
              <TopicIcon type={getTopicType(currentPage)} size={86} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] font-black text-slate-900">高中数学必修一 · {currentPage?.sectionTitle || "集合"}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm font-bold text-muted">学习进度</span>
                <span className="text-sm font-black text-slate-500">{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 max-w-[360px] overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="flex shrink-0 gap-3">
              <button
                onClick={onContinue}
                className="node-button rounded-xl bg-primary px-8 py-3 text-[14px] font-black text-white shadow-3d-node-primary"
              >
                继续学习
              </button>
              <button
                onClick={() => onOpenMap()}
                className="node-button flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">map</span>
                查看地图
              </button>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[18px] font-black text-slate-900">题库中心</h3>
          <div className="mt-4 grid gap-4 xl:grid-cols-4 lg:grid-cols-2">
            {courseCards.map((card, index) => (
              <article key={card.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-float">
                <div className="flex items-start gap-4">
                  <div
                    className={cx(
                      "grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl",
                      index === 0 ? "bg-primary/10" : "bg-slate-50"
                    )}
                  >
                    <TopicIcon type={card.icon} size={58} />
                  </div>
                  <div className="min-w-0 pt-1">
                    <h4 className="truncate text-[16px] font-black text-slate-900">{card.title}</h4>
                    <p className="mt-1 truncate text-[12px] font-bold text-muted">{card.subtitle}</p>
                  </div>
                </div>
                <div className="mt-8 flex items-center gap-2 text-[12px] font-bold text-muted">
                  <span className="material-symbols-outlined text-[17px]">article</span>
                  {card.count} 题
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={card.action}
                    className="node-button rounded-lg bg-primary px-3 py-2.5 text-[12px] font-black text-white shadow-3d-node-primary"
                  >
                    进入题库
                  </button>
                  <button
                    onClick={() => onOpenMap(card.id === "math-required-1" ? undefined : card.id)}
                    className="node-button flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-black text-slate-600 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">map</span>
                    学习地图
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[18px] font-black text-slate-900">快速练习</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {quickCards.map((card) => (
              <button
                key={card.title}
                onClick={card.action}
                className="node-button flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-float"
              >
                <span
                  className={cx(
                    "grid size-16 shrink-0 place-items-center rounded-2xl",
                    card.tone === "red" && "bg-red-50 text-red-500",
                    card.tone === "purple" && "bg-purple-50 text-purple-500",
                    card.tone === "blue" && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="material-symbols-outlined text-[34px]">{card.icon}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-black text-slate-900">{card.title}</span>
                  <span className="mt-1 block truncate text-[12px] font-bold text-muted">{card.subtitle}</span>
                </span>
                <span className="grid size-9 place-items-center rounded-full border border-slate-200 text-muted">
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState("home"); // "home", "map", or "quiz"
  const [pageId, setPageId] = useState(getInitialPage);
  const [questionId, setQuestionId] = useState(questionBank.pages[0]?.questions[0]?.id || "");
  const [keyword, setKeyword] = useState("");
  const [collapsedTopics, setCollapsedTopics] = useState(getInitialCollapsedTopics);
  const [records, setRecords] = useState(loadSolvingRecords);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesWindowMode, setNotesWindowMode] = useState("dock");
  const [notesWindowLayout, setNotesWindowLayout] = useState(() => ({
    x: typeof window === "undefined" ? 820 : Math.max(320, window.innerWidth - 392),
    y: 86,
    width: 340,
    height: typeof window === "undefined" ? 620 : Math.min(660, Math.max(460, window.innerHeight - 126)),
  }));
  const [activeNoteTag, setActiveNoteTag] = useState("known");
  const [noteDraft, setNoteDraft] = useState("");
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [floatingCards, setFloatingCards] = useState([]);
  const [toolModules, setToolModules] = useState(loadToolModules);
  const normalizedKeyword = keyword.trim();
  const questionShellRef = useRef(null);
  const dragSessionRef = useRef(null);

  const filteredPages = useMemo(() => {
    return questionBank.pages
      .map((page) => ({
        ...page,
        questions: page.questions.filter((question) => matchesKeyword(page, question, normalizedKeyword)),
      }))
      .filter((page) => page.questions.length > 0);
  }, [normalizedKeyword]);
  const directory = useMemo(() => groupPagesBySection(filteredPages), [filteredPages]);
  const topicDirectory = useMemo(() => groupSectionsByTopic(directory), [directory]);
  const topicStats = useMemo(() => groupSectionsByTopic(groupPagesBySection(questionBank.pages)), []);
  const { topics: solarTopics, canvasW: MAP_W, canvasH: CANVAS_H } = useMemo(
    () => computeSolarMap(questionBank.pages),
    []
  );
  const totalQuestions = useMemo(
    () => questionBank.pages.reduce((sum, page) => sum + page.questions.length, 0),
    []
  );

  const activePage =
    filteredPages.find((page) => page.id === pageId) ||
    filteredPages[0] ||
    (!normalizedKeyword ? questionBank.pages.find((page) => page.id === pageId) : null) ||
    (!normalizedKeyword ? questionBank.pages[0] : null);

  const visibleQuestions = activePage?.questions || [];
  const activeQuestion =
    visibleQuestions.find((question) => question.id === questionId) ||
    visibleQuestions[0] ||
    activePage?.questions?.[0];

  const activeQuestionIndex = visibleQuestions.findIndex((q) => q.id === activeQuestion?.id);
  const activeQuestionId = activeQuestion?.id || "";
  const activeRecord = records[activeQuestionId] || createEmptyRecord();
  const reviewRecords = useMemo(
    () =>
      Object.entries(records)
        .filter(([, record]) => (record.notes?.length || 0) + (record.marks?.length || 0) > 0)
        .sort((a, b) => String(b[1].updatedAt || "").localeCompare(String(a[1].updatedAt || ""))),
    [records]
  );

  useEffect(() => {
    setSelectionMenu(null);
    if (typeof window !== "undefined" && window.CSS?.highlights) {
      window.__astroStudyHighlightRanges = [];
      window.CSS.highlights.delete("study-mark");
    }
  }, [activeQuestionId]);

  useEffect(() => {
    function handlePointerMove(event) {
      const session = dragSessionRef.current;
      if (!session) return;

      if (session.type === "notes-move") {
        const nextX = session.startX + event.clientX - session.pointerX;
        const nextY = session.startY + event.clientY - session.pointerY;
        setNotesWindowLayout((layout) => ({
          ...layout,
          x: Math.min(window.innerWidth - 80, Math.max(84, nextX)),
          y: Math.min(window.innerHeight - 64, Math.max(16, nextY)),
        }));
      }

      if (session.type === "notes-resize") {
        setNotesWindowLayout((layout) => ({
          ...layout,
          width: Math.min(560, Math.max(280, session.startWidth + event.clientX - session.pointerX)),
          height: Math.min(window.innerHeight - 32, Math.max(300, session.startHeight + event.clientY - session.pointerY)),
        }));
      }

      if (session.type === "card-move") {
        setFloatingCards((cards) =>
          cards.map((card) =>
            card.id === session.cardId
              ? {
                  ...card,
                  x: Math.min(window.innerWidth - 90, Math.max(76, session.startX + event.clientX - session.pointerX)),
                  y: Math.min(window.innerHeight - 60, Math.max(76, session.startY + event.clientY - session.pointerY)),
                }
              : card
          )
        );
      }
    }

    function handlePointerUp() {
      dragSessionRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  function startQuiz(page) {
    setPageId(page.id);
    setQuestionId(page.questions[0]?.id || "");
    setCollapsedTopics((previous) => ({
      ...previous,
      [getTopicType(page)]: false,
    }));
    setView("quiz");
  }

  function goNextQuestion() {
    const nextIdx = activeQuestionIndex + 1;
    if (nextIdx < visibleQuestions.length) {
      setQuestionId(visibleQuestions[nextIdx].id);
    } else {
      setView("map");
    }
  }

  const progress =
    visibleQuestions.length > 0
      ? ((activeQuestionIndex + 1) / visibleQuestions.length) * 100
      : 0;

  const isLastQuestion = activeQuestionIndex === visibleQuestions.length - 1;

  // Map canvas scroll ref
  const mapScrollRef = useRef(null);

  function toggleTopic(type) {
    setCollapsedTopics((previous) => ({
      ...previous,
      [type]: !previous[type],
    }));
  }

  function scrollToSection(section) {
    const topic = solarTopics.find((item) =>
      item.satellites.some(
        ({ page }) => page.sectionTitle === section.title && page.chapterTitle === section.chapterTitle
      )
    );
    const firstNode = topic?.satellites.find(
      ({ page }) => page.sectionTitle === section.title && page.chapterTitle === section.chapterTitle
    );
    const target = firstNode || topic;
    if (!target || !mapScrollRef.current) return;
    const containerW = mapScrollRef.current.offsetWidth;
    const targetX = Math.max(0, target.x - containerW / 2);
    mapScrollRef.current.scrollTo({ left: targetX, behavior: "smooth" });
  }

  function openMap(topicType) {
    setView("map");
    if (topicType) {
      setCollapsedTopics((previous) => ({
        ...previous,
        [topicType]: false,
      }));
      window.setTimeout(() => {
        const topic = solarTopics.find((item) => item.type === topicType);
        if (!topic || !mapScrollRef.current) return;
        const containerW = mapScrollRef.current.offsetWidth;
        mapScrollRef.current.scrollTo({
          left: Math.max(0, topic.x - containerW / 2),
          behavior: "smooth",
        });
      }, 0);
    }
  }

  function submitHomeSearch() {
    setView("map");
  }

  function updateActiveRecord(mutator) {
    if (!activeQuestionId) return;

    setRecords((previous) => {
      const current = previous[activeQuestionId] || createEmptyRecord();
      const nextRecord = {
        ...mutator(current),
        meta: {
          pageTitle: activePage?.partTitle,
          sectionTitle: activePage?.sectionTitle,
          questionNo: activeQuestion?.no ?? activeQuestionIndex + 1,
        },
        updatedAt: new Date().toISOString(),
      };
      const next = { ...previous, [activeQuestionId]: nextRecord };
      saveSolvingRecords(next);
      return next;
    });
  }

  function addNote(event) {
    event.preventDefault();
    const text = noteDraft.trim();
    if (!text) return;

    updateActiveRecord((record) => ({
      ...record,
      notes: [
        ...(record.notes || []),
        {
          id: createId("note"),
          type: activeNoteTag,
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setNoteDraft("");
    setNotesOpen(true);
  }

  function removeNote(noteId) {
    updateActiveRecord((record) => ({
      ...record,
      notes: (record.notes || []).filter((note) => note.id !== noteId),
    }));
  }

  function removeMark(markId) {
    updateActiveRecord((record) => ({
      ...record,
      marks: (record.marks || []).filter((mark) => mark.id !== markId),
    }));
  }

  function handleQuestionSelection() {
    window.setTimeout(() => {
      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionMenu(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const shell = questionShellRef.current;
      if (!shell || !shell.contains(range.commonAncestorContainer)) {
        setSelectionMenu(null);
        return;
      }

      const text = getReadableSelectionText(selection, range);
      if (!text) {
        setSelectionMenu(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setSelectionMenu({
        text: text.slice(0, 120),
        range: range.cloneRange(),
        x: Math.min(window.innerWidth - 180, Math.max(180, rect.left + rect.width / 2)),
        y: Math.max(76, rect.top - 54),
      });
    }, 0);
  }

  function addSelectionMark(type) {
    if (!selectionMenu?.text) return;
    updateActiveRecord((record) => ({
      ...record,
      marks: [
        ...(record.marks || []),
        {
          id: createId("mark"),
          type,
          text: selectionMenu.text,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    updateToolModule("marks", true);
    applySoftSelectionHighlight(selectionMenu.range);
    window.getSelection?.()?.removeAllRanges();
    setSelectionMenu(null);
    setNotesOpen(true);
  }

  function updateToolModule(moduleId, forcedValue) {
    setToolModules((previous) => {
      const next = {
        ...previous,
        [moduleId]: typeof forcedValue === "boolean" ? forcedValue : !previous[moduleId],
        notes: true,
      };
      saveToolModules(next);
      return next;
    });
  }

  function floatNotesWindow() {
    setNotesOpen(true);
    setNotesWindowMode("float");
    setNotesWindowLayout((layout) => ({
      ...layout,
      x: Math.min(window.innerWidth - layout.width - 18, Math.max(92, layout.x)),
      y: Math.min(window.innerHeight - layout.height - 18, Math.max(72, layout.y)),
    }));
  }

  function dockNotesWindow() {
    setNotesWindowMode("dock");
  }

  function startNotesWindowDrag(event) {
    if (event.button !== 0) return;
    if (notesWindowMode !== "float") {
      floatNotesWindow();
    }
    dragSessionRef.current = {
      type: "notes-move",
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: notesWindowLayout.x,
      startY: notesWindowLayout.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startNotesWindowResize(event) {
    if (event.button !== 0) return;
    event.stopPropagation();
    dragSessionRef.current = {
      type: "notes-resize",
      pointerX: event.clientX,
      pointerY: event.clientY,
      startWidth: notesWindowLayout.width,
      startHeight: notesWindowLayout.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function zoomNotesWindow(delta) {
    setNotesOpen(true);
    setNotesWindowMode("float");
    setNotesWindowLayout((layout) => ({
      ...layout,
      width: Math.min(560, Math.max(280, layout.width + delta)),
      height: Math.min(window.innerHeight - 32, Math.max(300, layout.height + Math.round(delta * 0.8))),
      x: Math.min(window.innerWidth - 96, Math.max(24, layout.x)),
      y: Math.min(window.innerHeight - 80, Math.max(16, layout.y)),
    }));
  }

  function startSelectionDragOut(event, type = "focus") {
    if (!selectionMenu?.text) return;
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const id = createId("card");
    const x = Math.min(window.innerWidth - 300, Math.max(76, event.clientX - 118));
    const y = Math.min(window.innerHeight - 180, Math.max(76, event.clientY - 34));
    setFloatingCards((cards) => [
      ...cards,
      {
        id,
        type,
        text: selectionMenu.text,
        x,
        y,
      },
    ]);
    applySoftSelectionHighlight(selectionMenu.range);
    dragSessionRef.current = {
      type: "card-move",
      cardId: id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: x,
      startY: y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.getSelection?.()?.removeAllRanges();
    setSelectionMenu(null);
  }

  function handleQuestionPointerDown(event) {
    if (!selectionMenu?.range || event.button !== 0) return;
    if (event.target?.closest?.("button, input, textarea, [contenteditable='true']")) return;
    if (!isPointInsideRange(selectionMenu.range, event.clientX, event.clientY)) return;
    startSelectionDragOut(event, "focus");
  }

  function startFloatingCardDrag(event, cardId) {
    if (event.button !== 0) return;
    const card = floatingCards.find((item) => item.id === cardId);
    if (!card) return;
    dragSessionRef.current = {
      type: "card-move",
      cardId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: card.x,
      startY: card.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function removeFloatingCard(cardId) {
    setFloatingCards((cards) => cards.filter((card) => card.id !== cardId));
  }

  function handleMarkdownCopy(event) {
    const target = event.target;
    if (target?.closest?.("input, textarea, [contenteditable='true']")) return;

    const markdown = getSelectionMarkdown(window.getSelection?.());
    if (!markdown || !event.clipboardData) return;

    event.clipboardData.setData("text/plain", markdown);
    event.clipboardData.setData("text/markdown", markdown);
    event.preventDefault();
  }

  return (
    <main
      onCopy={handleMarkdownCopy}
      className="flex h-screen overflow-hidden bg-background font-body text-text-main antialiased"
    >
      {/* Sidebar */}
      <aside
        className={cx(
          "relative flex h-full flex-col bg-surface shadow-float z-10 transition-all duration-300",
          view === "quiz" ? "w-[68px]" : "w-[260px]"
        )}
      >
        <div className="flex h-full flex-col justify-between overflow-hidden">
          {/* Logo */}
          <div className="flex flex-col gap-0 overflow-y-auto">
            <div
              className={cx(
                "flex items-center gap-3 px-3 py-5 shrink-0",
                view === "quiz" && "justify-center px-0"
              )}
            >
              <div className="size-10 shrink-0 rounded-full border-2 border-background bg-primary shadow-sm" />
              {view !== "quiz" && (
                <div className="flex flex-col min-w-0">
                  <h1 className="font-display text-[17px] font-bold leading-tight truncate">Astro Math</h1>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted truncate">Toybox Edition</p>
                </div>
              )}
            </div>

            <nav className="flex flex-col gap-0 px-2">
              {/* Home button */}
              <button
                onClick={() => setView("home")}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                  view === "quiz" && "justify-center",
                  view === "home" ? "bg-primary text-white shadow-md" : "text-text-main hover:bg-background"
                )}
              >
                <span
                  className="material-symbols-outlined shrink-0 text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  home
                </span>
                {view !== "quiz" && (
                  <span className="text-[15px] font-bold leading-none truncate">Home</span>
                )}
              </button>

              {/* Learning Map button */}
              <button
                onClick={() => openMap()}
                className={cx(
                  "mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                  view === "quiz" && "justify-center",
                  view === "map" ? "bg-primary text-white shadow-md" : "text-text-main hover:bg-background"
                )}
              >
                <span
                  className="material-symbols-outlined shrink-0 text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  map
                </span>
                {view !== "quiz" && (
                  <span className="text-[15px] font-bold leading-none truncate">Learning Map</span>
                )}
              </button>

              {view !== "quiz" && (
                <>
                  <button
                    onClick={() => {
                      setKeyword("");
                      openMap();
                    }}
                    className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-600 transition-all hover:bg-background hover:text-text-main"
                  >
                    <span className="material-symbols-outlined shrink-0 text-[22px]">database</span>
                    <span className="text-[15px] font-bold leading-none truncate">Question Bank</span>
                  </button>
                  <button
                    onClick={() => setView("home")}
                    className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-600 transition-all hover:bg-background hover:text-text-main"
                  >
                    <span className="material-symbols-outlined shrink-0 text-[22px]">cancel</span>
                    <span className="text-[15px] font-bold leading-none truncate">Mistakes</span>
                  </button>
                </>
              )}

              {/* Topic groups — hidden in mini sidebar mode */}
              {view === "map" &&
                topicDirectory.map((topic) => {
                  const isTopicActive = topic.sections.some((section) =>
                    section.pages.some((page) => page.id === activePage?.id)
                  );
                  const isCollapsed = collapsedTopics[topic.type] ?? false;

                  return (
                    <div key={topic.type} className="mt-3 first:mt-2 rounded-2xl">
                      <button
                        onClick={() => toggleTopic(topic.type)}
                        className={cx(
                          "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
                          isTopicActive ? "border-primary/30 bg-primary/10 shadow-sm" : "border-slate-100 bg-white hover:bg-background"
                        )}
                      >
                        <span
                          className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white bg-white shadow-sm"
                          style={{ boxShadow: isTopicActive ? "0 8px 22px rgba(46,103,248,0.16)" : undefined }}
                        >
                          <TopicIcon type={topic.type} size={42} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[14px] font-black leading-tight"
                            style={{ color: isTopicActive ? "var(--color-primary)" : "#1e293b" }}
                          >
                            {topic.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] font-bold leading-tight text-muted">
                            {topic.subtitle}
                          </span>
                        </span>
                        <span
                          className="rounded-full px-2 py-1 text-[10px] font-black leading-none"
                          style={{
                            background: isTopicActive ? "#fff" : "#f1f5f9",
                            color: isTopicActive ? "var(--color-primary)" : "#94a3b8",
                          }}
                        >
                          {topic.questionsCount}
                        </span>
                        <span
                          className="material-symbols-outlined shrink-0 text-[18px] text-muted transition-transform"
                          style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                        >
                          expand_more
                        </span>
                      </button>

                      {!isCollapsed && (
                        <div className="ml-5 mt-2 border-l-2 border-slate-200 pl-3">
                          {topic.sections.map((section) => {
                            const isCurrentSection = section.pages.some((page) => page.id === activePage?.id);
                            return (
                              <div key={`${section.chapterTitle}-${section.title}`} className="pb-2">
                                <button
                                  onClick={() => scrollToSection(section)}
                                  className={cx(
                                    "group relative flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-all",
                                    isCurrentSection ? "bg-white shadow-sm" : "hover:bg-white/70"
                                  )}
                                >
                                  <span
                                    className="absolute -left-[19px] size-3 rounded-full ring-4 ring-white"
                                    style={{ background: isCurrentSection ? "var(--color-primary)" : "#E2E8F0" }}
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span
                                      className="block truncate text-[12px] font-black leading-tight"
                                      style={{ color: isCurrentSection ? "var(--color-primary)" : "#475569" }}
                                    >
                                      {section.title}
                                    </span>
                                    <span className="block truncate text-[9px] font-bold leading-tight text-muted">
                                      {section.chapterTitle}
                                    </span>
                                  </span>
                                  <span className="material-symbols-outlined text-[13px] text-muted opacity-0 transition-opacity group-hover:opacity-70">
                                    my_location
                                  </span>
                                </button>

                                <div className="ml-2 mt-1 flex flex-col gap-1">
                                  {section.pages.map((page) => {
                                    const isActive = page.id === activePage?.id;
                                    return (
                                      <button
                                        key={page.id}
                                        onClick={() => startQuiz(page)}
                                        className={cx(
                                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all",
                                          isActive ? "bg-white shadow-sm" : "hover:bg-white/70"
                                        )}
                                      >
                                        <span
                                          className="size-1.5 shrink-0 rounded-full"
                                          style={{ background: isActive ? "var(--color-primary)" : "#cbd5e1" }}
                                        />
                                        <span
                                          className="min-w-0 flex-1 truncate text-[12px] font-bold"
                                          style={{ color: isActive ? "var(--color-primary)" : "#64748b" }}
                                        >
                                          {page.partTitle}
                                        </span>
                                        <span
                                          className="rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none"
                                          style={{
                                            background: isActive ? "rgba(46,103,248,0.12)" : "#f1f5f9",
                                            color: isActive ? "var(--color-primary)" : "#94a3b8",
                                          }}
                                        >
                                          {page.questions.length}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* In mini mode: show current active page icon */}
              {view === "quiz" && activePage && (
                <button
                  onClick={() => setView("map")}
                  title={activePage.partTitle}
                  className="flex justify-center rounded-xl px-3 py-3 text-primary bg-primary/10 transition-all"
                >
                  <TopicIcon type={getTopicType(activePage)} size={28} />
                </button>
              )}
            </nav>
          </div>

          {/* Bottom settings */}
          <div className="shrink-0 border-t border-background p-2">
            <button
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-left text-muted hover:bg-background hover:text-text-main transition-all w-full",
                view === "quiz" && "justify-center"
              )}
            >
              <span className="material-symbols-outlined text-[22px] shrink-0">settings</span>
              {view !== "quiz" && <span className="text-[15px] font-bold leading-none">Settings</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="relative flex-1 overflow-hidden min-w-0">
        {view === "home" ? (
          <HomePage
            currentPage={activePage || questionBank.pages[0]}
            onContinue={() => startQuiz(activePage || questionBank.pages[0])}
            onOpenMap={openMap}
            onSearch={submitHomeSearch}
            keyword={keyword}
            onKeywordChange={setKeyword}
            topicStats={topicStats}
            totalQuestions={totalQuestions}
            reviewCount={reviewRecords.length}
          />
        ) : view === "map" ? (
          <div className="flex h-full flex-col">
            {/* Map Header */}
            <header className="flex shrink-0 items-center justify-between px-8 py-5 bg-surface border-b-2 border-background shadow-sm">
              <div className="min-w-0">
                <h2 className="font-display text-[28px] font-bold leading-tight">Learning Map</h2>
                <p className="mt-1 text-xs font-bold text-muted">
                  {questionBank.pages.length} 个练习路径 · {totalQuestions} 道题
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-full border-b-[4px] border-[#CBD5E1] bg-surface p-2 pr-5 shadow-float">
                <div className="flex items-center gap-2 rounded-full border-2 border-background bg-background px-3 py-1">
                  <span
                    className="material-symbols-outlined text-gold text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    stars
                  </span>
                  <span className="font-display font-bold text-sm">1,250</span>
                </div>
                <div className="size-8 rounded-full bg-slate-200" />
              </div>
            </header>

            {/* Map Canvas */}
            <div ref={mapScrollRef} className="flex-1 overflow-auto relative">

              {/* ── Background layers (fixed behind scroll) ── */}
              {/* Grid */}
              <div className="absolute inset-0 pointer-events-none z-0" style={{
                backgroundImage: "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
                backgroundSize: "60px 60px", opacity: 0.45,
              }}>
                <div className="absolute inset-0" style={{
                  backgroundImage: "linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)",
                  backgroundSize: "15px 15px",
                }} />
              </div>
              {/* Blue radial glow — top-left */}
              <div className="absolute pointer-events-none z-0" style={{ top: "-10%", left: "10%", width: 700, height: 700, background: "radial-gradient(circle, rgba(46,103,248,0.10) 0%, transparent 70%)", filter: "blur(40px)" }} />
              {/* Cyan radial glow — bottom-right */}
              <div className="absolute pointer-events-none z-0" style={{ bottom: "-20%", right: "0", width: 500, height: 500, background: "radial-gradient(circle, rgba(0,240,255,0.10) 0%, transparent 70%)", filter: "blur(40px)" }} />
              {/* Floating debris */}
              <div className="absolute pointer-events-none z-0" style={{ top: "30%", left: "18%", width: 28, height: 28, border: "2px solid rgba(46,103,248,0.18)", borderRadius: 4, transform: "rotate(45deg)", animation: "bounce 8s infinite" }} />
              <div className="absolute pointer-events-none z-0" style={{ bottom: "25%", left: "48%", width: 14, height: 14, border: "1px solid rgba(0,240,255,0.25)", borderRadius: 3, transform: "rotate(-12deg)", animation: "pulse 4s infinite" }} />
              <div className="absolute pointer-events-none z-0" style={{ top: "60%", right: "22%", width: 20, height: 20, border: "2px solid rgba(148,163,184,0.3)", borderRadius: "50%", animation: "bounce 6s infinite reverse" }} />
              <div className="absolute pointer-events-none z-0" style={{ top: "15%", right: "30%", width: 40, height: 40, border: "3px solid rgba(46,103,248,0.08)", borderRadius: "50%", animation: "spin 15s linear infinite" }} />

              {/* ── Scrollable canvas ── */}
              <div className="relative z-10" style={{ width: MAP_W, height: CANVAS_H, minWidth: MAP_W }}>
                <svg
                  className="absolute left-0 top-0 pointer-events-none z-0"
                  style={{ width: MAP_W, height: CANVAS_H, overflow: "visible" }}
                >
                  <defs>
                    <linearGradient id="orbitLine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2E67F8" stopOpacity="0.26" />
                      <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.18" />
                    </linearGradient>
                    <filter id="planetGlow">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {solarTopics.slice(1).map((topic, index) => {
                    const previousTopic = solarTopics[index];
                    return (
                      <line
                        key={`bridge-${topic.type}`}
                        x1={previousTopic.x + 110}
                        y1={previousTopic.y}
                        x2={topic.x - 110}
                        y2={topic.y}
                        stroke="url(#orbitLine)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="10 14"
                      />
                    );
                  })}
                  {solarTopics.map((topic) => (
                    <g key={`orbit-${topic.type}`}>
                      <ellipse
                        cx={topic.x}
                        cy={topic.y}
                        rx="190"
                        ry="140"
                        fill="none"
                        stroke="url(#orbitLine)"
                        strokeWidth="3"
                        strokeDasharray="10 12"
                      />
                      {topic.satellites.length > 8 && (
                        <ellipse
                          cx={topic.x}
                          cy={topic.y}
                          rx="250"
                          ry="190"
                          fill="none"
                          stroke="#CBD5E1"
                          strokeWidth="2"
                          strokeDasharray="7 12"
                          opacity="0.55"
                        />
                      )}
                      {topic.satellites.map((satellite) => (
                        <line
                          key={`ray-${satellite.section.chapterTitle}-${satellite.section.title}`}
                          x1={topic.x}
                          y1={topic.y}
                          x2={satellite.x}
                          y2={satellite.y}
                          stroke="#CBD5E1"
                          strokeWidth="1.5"
                          strokeDasharray="4 10"
                          opacity="0.42"
                        />
                      ))}
                    </g>
                  ))}
                </svg>

                {solarTopics.map((topic) => {
                  const isTopicActive = topic.satellites.some(({ section }) =>
                    section.pages.some((page) => page.id === activePage?.id)
                  );
                  return (
                    <div key={topic.type}>
                      <button
                        onClick={() => {
                          const firstPage = topic.satellites[0]?.page;
                          if (firstPage) startQuiz(firstPage);
                        }}
                        className="node-button absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-[32px] border border-white bg-white px-5 py-5 text-center shadow-float"
                        style={{
                          left: topic.x,
                          top: topic.y,
                          width: 178,
                          boxShadow: isTopicActive
                            ? "0 18px 40px rgba(46,103,248,0.20), 0 0 0 8px rgba(46,103,248,0.08)"
                            : "0 16px 36px rgba(15,23,42,0.10)",
                        }}
                      >
                        <span className="grid size-20 place-items-center overflow-hidden rounded-[26px] bg-white">
                          <TopicIcon type={topic.type} size={78} />
                        </span>
                        <span className="mt-1 text-[18px] font-black leading-tight text-slate-800">{topic.title}</span>
                        <span className="max-w-[132px] text-[10px] font-bold leading-tight text-muted">{topic.subtitle}</span>
                        <span
                          className="mt-1 rounded-full px-2.5 py-1 text-[10px] font-black leading-none"
                          style={{ background: topic.soft, color: topic.accent }}
                        >
                          {topic.sections.length} 个章节 · {topic.questionsCount} 题
                        </span>
                      </button>

                      {topic.satellites.map((satellite) => {
                        const isCurrent = satellite.section.pages.some((page) => page.id === activePage?.id);
                        return (
                          <button
                            key={`${satellite.section.chapterTitle}-${satellite.section.title}`}
                            onClick={() => startQuiz(satellite.page)}
                            className={cx(
                              "node-button absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 text-left transition-all",
                              isCurrent ? "border-primary/30 shadow-float" : "border-slate-100 shadow-sm"
                            )}
                            style={{
                              left: satellite.x,
                              top: satellite.y,
                              width: 172,
                              minHeight: 70,
                              borderBottom: isCurrent ? "5px solid var(--color-primary)" : "5px solid #CBD5E1",
                            }}
                          >
                            <span
                              className="grid size-9 shrink-0 place-items-center rounded-xl"
                              style={{ background: isCurrent ? "rgba(46,103,248,0.10)" : "#f8fafc" }}
                            >
                              <span
                                className="size-3 rounded-full"
                                style={{ background: isCurrent ? "var(--color-primary)" : "#cbd5e1" }}
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="block truncate text-[12px] font-black leading-tight"
                                style={{ color: isCurrent ? "var(--color-primary)" : "#334155" }}
                              >
                                {satellite.section.title}
                              </span>
                              <span className="mt-1 block truncate text-[10px] font-bold leading-none text-muted">
                                {satellite.pagesCount} 组 · {satellite.questionsCount} 题
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ── Quiz View ── */
          <div className="flex h-full flex-col">
            {/* Quiz Header */}
            <header className="flex h-[64px] shrink-0 items-center gap-4 border-b-2 border-background bg-surface px-6 shadow-sm">
              <button
                onClick={() => setView("map")}
                className="flex shrink-0 items-center gap-2 font-bold text-muted transition-colors hover:text-text-main"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                <span className="text-sm hidden sm:inline">Map</span>
              </button>

              {/* Progress bar */}
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <div className="h-3 flex-1 rounded-full bg-background overflow-hidden">
                  <div
                    className="glass-tube h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-bold text-muted">
                  {activeQuestionIndex + 1} / {visibleQuestions.length}
                </span>
              </div>

              {/* Stars */}
              <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-background px-3 py-1.5 font-bold">
                <span
                  className="material-symbols-outlined text-gold text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  stars
                </span>
                <span className="text-sm">1,250</span>
              </div>
            </header>

            {/* Quiz Body */}
            <div className="relative flex-1 overflow-hidden">
              <div className="grid h-full grid-cols-[minmax(0,1fr)_auto]">
                <div className="overflow-auto">
                  <div className="mx-auto max-w-3xl px-6 pb-8 pt-10">
                    {/* Question card with floating tag */}
                    <div className="relative mb-8">
                      <div className="absolute -top-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-100 bg-white px-5 py-2 shadow-lg whitespace-nowrap">
                        <div className="holo-tag rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-holographic">
                          {activeQuestion?.source || "题库"}
                        </div>
                        <div className="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                          {activePage?.sectionTitle}
                        </div>
                      </div>

                      <div
                        ref={questionShellRef}
                        onPointerDown={handleQuestionPointerDown}
                        onMouseUp={handleQuestionSelection}
                        onKeyUp={handleQuestionSelection}
                        className="rounded-2xl bg-background p-8 pt-12 shadow-float"
                      >
                        <QuestionBlocks blocks={activeQuestion?.blocks || []} />
                      </div>
                    </div>

                    {/* Footer: question dots + next button */}
                    <div className="flex flex-col gap-4">
                      {/* Question dots */}
                      <div className="flex flex-wrap gap-2">
                        {visibleQuestions.map((q, idx) => (
                          <button
                            key={q.id}
                            onClick={() => setQuestionId(q.id)}
                            className={cx(
                              "size-9 rounded-full text-sm font-bold transition-all",
                              q.id === activeQuestion?.id
                                ? "bg-primary text-white shadow-md scale-110"
                                : "bg-white text-muted hover:bg-slate-100"
                            )}
                            style={
                              q.id === activeQuestion?.id
                                ? { background: "var(--color-primary)", color: "#fff" }
                                : {}
                            }
                          >
                            {q.no ?? idx + 1}
                          </button>
                        ))}
                      </div>

                      {/* Next Mission button */}
                      <div className="flex justify-end">
                        <button
                          onClick={goNextQuestion}
                          className="node-button flex items-center gap-3 rounded-full px-8 py-3.5 font-display text-base font-bold uppercase tracking-wider text-white shadow-3d-node-primary"
                          style={{ background: "var(--color-primary)" }}
                        >
                          <span>{isLastQuestion ? "完成练习" : "Next Mission"}</span>
                          <span className="material-symbols-outlined text-[20px]">
                            {isLastQuestion ? "check_circle" : "arrow_forward"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <SolvingToolPanel
                  isOpen={notesOpen}
                  onToggle={() => setNotesOpen((value) => !value)}
                  windowMode={notesWindowMode}
                  windowLayout={notesWindowLayout}
                  onDock={dockNotesWindow}
                  onFloat={floatNotesWindow}
                  onZoomIn={() => zoomNotesWindow(56)}
                  onZoomOut={() => zoomNotesWindow(-56)}
                  onStartWindowDrag={startNotesWindowDrag}
                  onStartWindowResize={startNotesWindowResize}
                  activeTag={activeNoteTag}
                  onActiveTagChange={setActiveNoteTag}
                  noteDraft={noteDraft}
                  onNoteDraftChange={setNoteDraft}
                  onAddNote={addNote}
                  onRemoveNote={removeNote}
                  onRemoveMark={removeMark}
                  toolModules={toolModules}
                  onToggleToolModule={updateToolModule}
                  record={activeRecord}
                  reviewRecords={reviewRecords}
                />
              </div>
              <SelectionMarkMenu
                menu={selectionMenu}
                onMark={addSelectionMark}
                onStartDragOut={startSelectionDragOut}
                onClose={() => setSelectionMenu(null)}
              />
              {floatingCards.map((card) => (
                <FloatingConditionCard
                  key={card.id}
                  card={card}
                  onPointerDown={startFloatingCardDrag}
                  onRemove={removeFloatingCard}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
