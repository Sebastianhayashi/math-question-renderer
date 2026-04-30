import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionBlocks } from "./components/QuestionBlocks.jsx";
import { EnglishQuestionViewer } from "./components/EnglishQuestionViewer.jsx";
import { RichText } from "./components/RichText.jsx";
import { questionBank } from "./data/questionBank.js";
import { cet6QuestionBank } from "./data/cet6QuestionBank.js";
import { cx } from "./lib/cx.js";
import topicFunctionIcon from "./assets/topic-function.png";
import topicInequalityIcon from "./assets/topic-inequality.png";
import topicSetsIcon from "./assets/topic-sets.png";
import englishListeningIcon from "./assets/english-listening.png";
import englishReadingIcon from "./assets/english-reading.png";
import englishTranslationIcon from "./assets/english-translation.png";
import englishWritingIcon from "./assets/english-writing.png";

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

// ── English CET-6 topic constants ──────────────────────────────────────────
const ENG_TOPIC_ORDER = ["writing", "listening", "reading", "translation"];
const ENG_TOPIC_META = {
  writing: {
    title: "Writing",
    subtitle: "Part I 写作",
    accent: "#7c3aed",
    soft: "rgba(124,58,237,0.10)",
  },
  listening: {
    title: "Listening",
    subtitle: "Part II 听力",
    accent: "#0891b2",
    soft: "rgba(8,145,178,0.10)",
  },
  reading: {
    title: "Reading",
    subtitle: "Part III 阅读",
    accent: "#059669",
    soft: "rgba(5,150,105,0.10)",
  },
  translation: {
    title: "Translation",
    subtitle: "Part IV 翻译",
    accent: "#d97706",
    soft: "rgba(217,119,6,0.10)",
  },
};
const ENG_TOPIC_ICON_SRC = {
  english: englishReadingIcon,
  writing: englishWritingIcon,
  listening: englishListeningIcon,
  reading: englishReadingIcon,
  translation: englishTranslationIcon,
};
const SUBJECT_CONFIG = {
  math: {
    appName: "Astro Math",
    appSubtitle: "Toybox Edition",
    homeTitle: "Homepage",
    homeSubtitle: "选择你的学习目标",
    courseTitle: "高中数学必修一",
    courseSubtitle: "集合 / 基本不等式 / 函数",
    topicPrefix: "高中数学",
    mainIcon: "function",
    searchPlaceholder: "搜索题库、章节、题型...",
    pathLabel: "练习路径",
    mapTitle: "Learning Map",
    mapSubtitle: "章节路径",
    continueFallback: "集合",
    notesTitle: "本题条件",
    notesEmpty: "先把题目翻译成一两条条件。",
    noteTags: [
      { id: "known", label: "已知", icon: "rule", hint: "记录题目已经给出的条件" },
      { id: "target", label: "目标", icon: "flag", hint: "记录这一步要证明或求什么" },
      { id: "assumption", label: "假设", icon: "psychology_alt", hint: "记录临时假设或默认共识" },
      { id: "translate", label: "转化", icon: "sync_alt", hint: "把题目翻译成数学语言" },
    ],
  },
  english: {
    appName: "Astro English",
    appSubtitle: "CET-6 Edition",
    homeTitle: "CET-6 Home",
    homeSubtitle: "选择真题套卷与题型",
    courseTitle: "大学英语六级真题",
    courseSubtitle: "写作 / 听力 / 阅读 / 翻译",
    topicPrefix: "英语六级",
    mainIcon: "english",
    searchPlaceholder: "搜索套卷、题型、关键词...",
    pathLabel: "真题路径",
    mapTitle: "CET-6 Map",
    mapSubtitle: "按题型组织",
    continueFallback: "真题练习",
    notesTitle: "本题笔记",
    notesEmpty: "记录生词、定位句或选项判断。",
    noteTags: [
      { id: "known", label: "生词", icon: "translate", hint: "记录不熟悉的词组或表达" },
      { id: "target", label: "定位", icon: "my_location", hint: "记录原文定位句或段落" },
      { id: "assumption", label: "推断", icon: "psychology_alt", hint: "记录推断依据或排除理由" },
      { id: "translate", label: "翻译", icon: "sync_alt", hint: "把英文句子翻译成中文" },
    ],
  },
};
const SOLVING_RECORDS_KEY = "astro-math-solving-records-v1";
const ANSWER_RECORDS_KEY = "astro-math-answer-records-v1";
const LAST_SESSION_KEY = "astro-math-last-session-v1";
const NOTE_TAGS = SUBJECT_CONFIG.math.noteTags;
const MATH_CHAIN_STAGES = [
  { id: "read", title: "读题", subtitle: "把题目拆成条件和目标", icon: "travel_explore" },
  { id: "reason", title: "推理", subtitle: "假设、转化、推出关系", icon: "account_tree" },
  { id: "answer", title: "作答", subtitle: "验证并落到答案", icon: "task_alt" },
];
const MATH_CHAIN_TAGS = [
  { id: "known", label: "已知", icon: "rule", hint: "题目直接给出的条件", stage: "read" },
  { id: "unknown", label: "未知", icon: "help", hint: "还没有理解的符号、条件或关系", stage: "read" },
  { id: "target", label: "目标", icon: "flag", hint: "要求证明或求出的内容", stage: "read" },
  { id: "assumption", label: "假设", icon: "psychology_alt", hint: "临时假设或分类讨论", stage: "reason" },
  { id: "translate", label: "转化", icon: "sync_alt", hint: "把题目翻译成数学语言", stage: "reason" },
  { id: "infer", label: "推出", icon: "fork_right", hint: "由前面得到的新结论", stage: "reason" },
  { id: "verify", label: "验证", icon: "fact_check", hint: "代回或检查条件", stage: "answer" },
  { id: "answer", label: "答案", icon: "check_circle", hint: "最终选择或结果", stage: "answer" },
];
const MATH_CHAIN_RELATION = {
  known: "给出",
  unknown: "待明",
  target: "要求",
  assumption: "假设",
  translate: "转化",
  infer: "所以",
  verify: "验证",
  answer: "得到",
};
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

function findPageForQuestion(bank, questionId) {
  return bank.pages.find((page) => page.questions.some((question) => question.id === questionId));
}

function findQuestionLocation(bank, questionId) {
  const page = findPageForQuestion(bank, questionId);
  const question = page?.questions.find((item) => item.id === questionId);
  return { page, question };
}

function getInitialStudyState() {
  const fallbackSubject = "math";
  const fallbackPage = questionBank.pages[0];
  const fallbackQuestion = fallbackPage?.questions[0];

  if (typeof window === "undefined") {
    return {
      subject: fallbackSubject,
      pageId: fallbackPage?.id || "",
      questionId: fallbackQuestion?.id || "",
    };
  }

  try {
    const saved = JSON.parse(window.localStorage.getItem(LAST_SESSION_KEY) || "{}");
    const subject = saved.subject === "english" ? "english" : "math";
    const bank = subject === "english" ? cet6QuestionBank : questionBank;
    const page = bank.pages.find((item) => item.id === saved.pageId) || findPageForQuestion(bank, saved.questionId) || bank.pages[0];
    const question = page?.questions.find((item) => item.id === saved.questionId) || page?.questions[0];

    return {
      subject,
      pageId: page?.id || "",
      questionId: question?.id || "",
    };
  } catch {
    return {
      subject: fallbackSubject,
      pageId: fallbackPage?.id || "",
      questionId: fallbackQuestion?.id || "",
    };
  }
}

function getInitialCollapsedTopics(subject = "math") {
  const order = subject === "english" ? ENG_TOPIC_ORDER : TOPIC_ORDER;
  const bank = subject === "english" ? cet6QuestionBank : questionBank;
  const initialType = getTopicType(bank.pages[0], subject);
  return Object.fromEntries(order.map((type) => [type, type !== initialType]));
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

function getMathChainTag(type) {
  return MATH_CHAIN_TAGS.find((tag) => tag.id === type) || MATH_CHAIN_TAGS[0];
}

function getMathChainStage(note) {
  if (note?.stage) return note.stage;
  return getMathChainTag(note?.type).stage || "read";
}

function getMathChainOrder(note, fallbackIndex) {
  return Number.isFinite(note?.order) ? note.order : fallbackIndex;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getWorkbenchBounds() {
  if (typeof window === "undefined") {
    return { minX: 76, maxX: 980, minY: 76, maxY: 620 };
  }

  return {
    minX: 76,
    maxX: Math.max(76, window.innerWidth - 290),
    minY: 76,
    maxY: Math.max(76, window.innerHeight - 178),
  };
}

function getPaletteRailBounds() {
  if (typeof window === "undefined") {
    return { minX: 88, maxX: 760, minY: 640, maxY: 640 };
  }

  return {
    minX: 88,
    maxX: Math.max(88, window.innerWidth - 700),
    minY: Math.max(320, window.innerHeight - 104),
    maxY: Math.max(320, window.innerHeight - 72),
  };
}

function getMetadataRailBounds(isMinimized = false) {
  if (typeof window === "undefined") {
    return { minX: 96, maxX: 760, minY: 82, maxY: 136 };
  }

  return {
    minX: 96,
    maxX: Math.max(96, window.innerWidth - (isMinimized ? 104 : 520)),
    minY: 76,
    maxY: 142,
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

function loadAnswerRecords() {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(window.localStorage.getItem(ANSWER_RECORDS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAnswerRecords(records) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANSWER_RECORDS_KEY, JSON.stringify(records));
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

function saveLastSession(session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
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

function getTopicType(pageOrSection, subject = "math") {
  const text = [
    pageOrSection?.chapterTitle,
    pageOrSection?.sectionTitle,
    pageOrSection?.title,
    pageOrSection?.partTitle,
  ]
    .filter(Boolean)
    .join(" ");

  if (subject === "english") {
    if (/Part\s+IV|Translation|翻译/.test(text)) return "translation";
    if (/Part\s+III|Reading|阅读|选词填空|长篇阅读|仔细阅读/.test(text)) return "reading";
    if (/Part\s+II|Listening|听力|听写|长对话|短对话|短文/.test(text)) return "listening";
    if (/Part\s+I(?![IVX])|Writing|写作/.test(text)) return "writing";
    return "reading"; // Part III Reading
  }

  if (/不等式|二次函数|方程|第二章|2\./.test(text)) return "inequality";
  if (/函数|映射|3\.1/.test(text)) return "function";
  return "sets";
}

function getTopicMeta(type) {
  return TOPIC_META[type] || TOPIC_META.sets;
}

function TopicIcon({ type = "sets", size = 24, className }) {
  const isEnglishIcon = Boolean(ENG_TOPIC_ICON_SRC[type]);
  const iconSrc =
    ENG_TOPIC_ICON_SRC[type] || TOPIC_ICON_SRC[type] || TOPIC_ICON_SRC.sets;
  return (
    <img
      src={iconSrc}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={cx(
        "block rounded-[22%]",
        isEnglishIcon ? "object-contain" : "object-cover",
        className
      )}
      style={{
        width: size,
        height: size,
        transform: isEnglishIcon ? "scale(1)" : "scale(1.28)",
      }}
    />
  );
}

function collectQuestionText(question) {
  const blockText = (question.blocks || [])
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
    question.stemMarkdown,
    question.materialMarkdown,
    question.blankContextMarkdown,
    ...(question.options || []).map((option) => `${option.label} ${option.text}`),
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

function isPlayableQuestion(question, subject = "math") {
  return subject !== "english" || question.status !== "incomplete";
}

function countPlayableQuestions(pages, subject = "math") {
  return pages.reduce(
    (sum, page) => sum + page.questions.filter((question) => isPlayableQuestion(question, subject)).length,
    0
  );
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

function groupSectionsByTopic(sections, subject = "math") {
  const order = subject === "english" ? ENG_TOPIC_ORDER : TOPIC_ORDER;
  const meta = subject === "english" ? ENG_TOPIC_META : TOPIC_META;

  const grouped = order.map((type) => ({
    type,
    ...(meta[type] || {}),
    sections: [],
    questionsCount: 0,
    playableQuestionsCount: 0,
  }));

  sections.forEach((section) => {
    const topicType = getTopicType(section, subject);
    const topic = grouped.find((item) => item.type === topicType) || grouped[0];
    const questionsCount = section.pages.reduce((sum, page) => sum + page.questions.length, 0);
    const playableQuestionsCount = countPlayableQuestions(section.pages, subject);
    topic.sections.push(section);
    topic.questionsCount += questionsCount;
    topic.playableQuestionsCount += playableQuestionsCount;
  });

  return grouped.filter((topic) => topic.sections.length > 0);
}

function computeSolarMap(pages, subject = "math") {
  const topics = groupSectionsByTopic(groupPagesBySection(pages), subject);
  const TOPIC_GAP = subject === "english" ? 920 : 700;
  const LEFT_PADDING = subject === "english" ? 420 : 360;
  const CANVAS_H = subject === "english" ? 820 : 760;
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
        playableQuestionsCount: countPlayableQuestions(section.pages, subject),
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

function MathReasoningBuilder({
  record,
  activeTag,
  onActiveTagChange,
  noteDraft,
  onNoteDraftChange,
  onAddNote,
  onRemoveNote,
  onMoveNote,
}) {
  const [draggingNoteId, setDraggingNoteId] = useState(null);
  const notes = record?.notes || [];
  const groupedNotes = Object.fromEntries(MATH_CHAIN_STAGES.map((stage) => [stage.id, []]));

  notes.forEach((note, index) => {
    const stage = getMathChainStage(note);
    const target = groupedNotes[stage] || groupedNotes.read;
    target.push({ ...note, fallbackOrder: index });
  });

  Object.values(groupedNotes).forEach((items) => {
    items.sort((a, b) => getMathChainOrder(a, a.fallbackOrder) - getMathChainOrder(b, b.fallbackOrder));
  });

  return (
    <div className="grid gap-4">
      <section className="rounded-[22px] border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-black text-slate-800">解题链 Builder</p>
            <p className="mt-0.5 text-[10px] font-bold text-muted">用短模块搭出推理顺序</p>
          </div>
          <span className="grid size-9 place-items-center rounded-2xl bg-white text-primary shadow-sm">
            <span className="material-symbols-outlined text-[20px]">account_tree</span>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {MATH_CHAIN_STAGES.map((stage, index) => (
            <div key={stage.id} className="rounded-2xl bg-white/80 px-2 py-2 text-center ring-1 ring-blue-100">
              <span className="mx-auto grid size-7 place-items-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[16px]">{stage.icon}</span>
              </span>
              <p className="mt-1 text-[10px] font-black text-slate-700">{stage.title}</p>
              {index < MATH_CHAIN_STAGES.length - 1 && (
                <span className="material-symbols-outlined absolute text-[0px]">arrow_forward</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-muted">模块标签</p>
          <p className="text-[10px] font-bold text-slate-400">点一下，写一句</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {MATH_CHAIN_TAGS.map((tag) => (
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
              {getMathChainTag(activeTag)?.icon || "edit_note"}
            </span>
          </span>
          <input
            value={noteDraft}
            onChange={(event) => onNoteDraftChange(event.target.value)}
            placeholder={`${getMathChainTag(activeTag)?.label || "模块"}：尽量写短`}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-slate-700 outline-none placeholder:text-slate-300"
          />
          <button
            type="submit"
            className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm transition-transform hover:-translate-y-0.5"
            aria-label="添加解题链模块"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
        </form>
      </section>

      <section className="grid gap-3">
        {MATH_CHAIN_STAGES.map((stage) => {
          const stageNotes = groupedNotes[stage.id] || [];
          return (
            <div
              key={stage.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const noteId = event.dataTransfer.getData("text/plain");
                if (noteId) onMoveNote(noteId, stage.id, stageNotes.length);
                setDraggingNoteId(null);
              }}
              className={cx(
                "rounded-[22px] border bg-white p-3 shadow-sm transition-all",
                draggingNoteId ? "border-blue-200 ring-4 ring-blue-50" : "border-slate-100"
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-slate-50 text-primary ring-1 ring-slate-100">
                    <span className="material-symbols-outlined text-[17px]">{stage.icon}</span>
                  </span>
                  <div>
                    <p className="text-[12px] font-black text-slate-800">{stage.title}</p>
                    <p className="text-[9px] font-bold text-muted">{stage.subtitle}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-muted">
                  {stageNotes.length}
                </span>
              </div>

              <div className="grid gap-2">
                {stageNotes.length ? (
                  stageNotes.map((note, index) => {
                    const tag = getMathChainTag(note.type);
                    return (
                      <div
                        key={note.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", note.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingNoteId(note.id);
                        }}
                        onDragEnd={() => setDraggingNoteId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const noteId = event.dataTransfer.getData("text/plain");
                          if (noteId) onMoveNote(noteId, stage.id, index);
                          setDraggingNoteId(null);
                        }}
                        className={cx(
                          "group rounded-2xl border bg-white p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md",
                          draggingNoteId === note.id ? "opacity-45" : "opacity-100"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[17px]">{tag.icon}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-1.5">
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">
                                {tag.label}
                              </span>
                              <span className="text-[9px] font-black text-slate-300">
                                {MATH_CHAIN_RELATION[note.type] || "连接"}
                              </span>
                            </div>
                            <p className="break-words text-[13px] font-bold leading-snug text-slate-700">
                              <RichText content={[note.text]} />
                            </p>
                          </div>
                          <span
                            className="mt-1 grid size-7 shrink-0 cursor-grab place-items-center rounded-lg text-slate-300 transition-colors group-hover:bg-slate-50 group-hover:text-slate-500"
                            title="拖动模块"
                          >
                            <span className="material-symbols-outlined text-[17px]">drag_indicator</span>
                          </span>
                          <button
                            onClick={() => onRemoveNote(note.id)}
                            className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100"
                            aria-label="删除模块"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center text-[11px] font-bold text-muted">
                    拖入模块，或点上方标签开始搭建。
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function MathPencilPalette({
  activeTag,
  onActiveTagChange,
  noteDraft,
  onNoteDraftChange,
  onAddBlock,
  onArrangeBlocks,
  layout,
  onStartDrag,
  onStartModuleDrag,
}) {
  const active = getMathChainTag(activeTag);

  return (
    <div
      className="fixed z-40 flex max-w-[calc(100vw-112px)] items-center gap-2 rounded-[28px] border border-white/80 bg-white/92 p-2 shadow-[0_18px_54px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 backdrop-blur-xl"
      style={{ left: layout.x, top: layout.y }}
    >
      <div
        onPointerDown={onStartDrag}
        className="flex cursor-grab items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 active:cursor-grabbing"
        title="拖动工具条"
      >
        <span className="grid size-8 place-items-center rounded-xl bg-primary text-white shadow-sm">
          <span className="material-symbols-outlined text-[18px]">draw</span>
        </span>
        <div className="hidden min-w-[72px] sm:block">
          <p className="text-[11px] font-black leading-none text-slate-800">构建工具</p>
          <p className="mt-1 text-[9px] font-bold leading-none text-muted">模块轨道</p>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        {MATH_CHAIN_TAGS.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onActiveTagChange(tag.id)}
            onPointerDown={(event) => onStartModuleDrag(event, tag.id)}
            title={tag.hint}
            className={cx(
              "relative flex h-12 w-12 shrink-0 cursor-grab flex-col items-center justify-center gap-0.5 rounded-2xl transition-all active:cursor-grabbing",
              activeTag === tag.id
                ? "bg-primary text-white shadow-md"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-primary"
            )}
          >
            <span className="material-symbols-outlined text-[19px]">{tag.icon}</span>
            <span className="text-[9px] font-black leading-none">{tag.label}</span>
            <span
              className={cx(
                "absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full ring-2 ring-white",
                activeTag === tag.id ? "bg-white/90" : "bg-slate-200"
              )}
            />
            <span
              className={cx(
                "absolute -bottom-1 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full ring-2 ring-white",
                activeTag === tag.id ? "bg-white/80" : "bg-slate-100"
              )}
            />
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAddBlock(activeTag);
        }}
        className="flex h-11 min-w-[210px] items-center gap-2 rounded-2xl bg-slate-50 px-2 ring-1 ring-slate-100"
      >
        <span className="hidden shrink-0 rounded-lg bg-white px-2 py-1 text-[10px] font-black text-primary shadow-sm sm:inline">
          {active.label}
        </span>
        <input
          value={noteDraft}
          onChange={(event) => onNoteDraftChange(event.target.value)}
          placeholder="写最少的字..."
          className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-slate-700 outline-none placeholder:text-slate-300"
        />
        <button
          type="submit"
          className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm transition-transform hover:-translate-y-0.5"
          aria-label="放到工作台"
          title="放到工作台"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
      </form>
      <button
        onClick={onArrangeBlocks}
        className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-blue-50 hover:text-primary"
        title="整理积木"
        aria-label="整理积木"
      >
        <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
      </button>
    </div>
  );
}

function QuizMetadataChip({
  source,
  sectionTitle,
  isMinimized,
  layout,
  onToggleMinimized,
  onStartDrag,
}) {
  return (
    <div
      className={cx(
        "fixed z-30 border border-white/85 bg-white/94 shadow-[0_14px_34px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/70 backdrop-blur-xl transition-all",
        isMinimized ? "rounded-2xl p-1.5" : "rounded-full p-1.5"
      )}
      style={{ left: layout.x, top: layout.y }}
    >
      <div className="flex items-center gap-1.5">
        <button
          onPointerDown={onStartDrag}
          className="grid size-8 cursor-grab place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 active:cursor-grabbing"
          title="拖动元数据"
          aria-label="拖动元数据"
        >
          <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
        </button>
        {isMinimized ? (
          <button
            onClick={onToggleMinimized}
            className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/15"
            title="展开题目信息"
            aria-label="展开题目信息"
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
          </button>
        ) : (
          <>
            <div className="holo-tag max-w-[220px] truncate rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-holographic">
              {source || "题库"}
            </div>
            <div className="max-w-[180px] truncate rounded-full bg-background px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {sectionTitle}
            </div>
            <button
              onClick={onToggleMinimized}
              className="grid size-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              title="最小化题目信息"
              aria-label="最小化题目信息"
            >
              <span className="material-symbols-outlined text-[17px]">remove</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MathWorkbenchBlock({ note, index, onPointerDown, onRemove }) {
  const tag = getMathChainTag(note.type);
  const stage = MATH_CHAIN_STAGES.find((item) => item.id === getMathChainStage(note)) || MATH_CHAIN_STAGES[0];
  const bounds = getWorkbenchBounds();
  const left = Number.isFinite(note.x)
    ? clampNumber(note.x, bounds.minX, bounds.maxX)
    : clampNumber(typeof window === "undefined" ? 720 : window.innerWidth - 390, bounds.minX, bounds.maxX);
  const top = Number.isFinite(note.y)
    ? clampNumber(note.y, bounds.minY, bounds.maxY)
    : clampNumber(118 + index * 72, bounds.minY, bounds.maxY);

  return (
    <div
      className="fixed z-30 w-[260px] rounded-[22px] border border-white/90 bg-white/94 p-3 shadow-[0_16px_42px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80 backdrop-blur-xl transition-transform hover:-translate-y-0.5"
      style={{ left, top }}
    >
      <span className="absolute -top-1.5 left-8 size-3 rounded-full bg-white ring-1 ring-slate-200" />
      <span className="absolute -bottom-1.5 left-8 size-3 rounded-full bg-slate-100 ring-1 ring-slate-200" />
      <div
        onPointerDown={(event) => onPointerDown(event, note)}
        className="flex cursor-grab items-start gap-2 active:cursor-grabbing"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">
              {tag.label}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
              {stage.title}
            </span>
            <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-300">
              {MATH_CHAIN_RELATION[note.type] || "连接"}
            </span>
          </div>
          <p className="line-clamp-4 break-words text-[13px] font-bold leading-snug text-slate-700">
            <RichText content={[note.text || tag.hint]} />
          </p>
        </div>
        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-300">
          <span className="material-symbols-outlined text-[17px]">drag_indicator</span>
        </span>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove(note.id)}
          className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
          aria-label="删除模块"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}

function MathMarkBlock({ mark, index, onPointerDown, onRemove }) {
  const tag = MARK_TAGS.find((item) => item.id === mark.type) || MARK_TAGS[0];
  const bounds = getWorkbenchBounds();
  const left = Number.isFinite(mark.x)
    ? clampNumber(mark.x, bounds.minX, bounds.maxX)
    : clampNumber(typeof window === "undefined" ? 520 : window.innerWidth - 350, bounds.minX, bounds.maxX);
  const top = Number.isFinite(mark.y)
    ? clampNumber(mark.y, bounds.minY, bounds.maxY)
    : clampNumber(250 + index * 70, bounds.minY, bounds.maxY);

  return (
    <div
      className="fixed z-30 w-[240px] rounded-[20px] border border-amber-100 bg-white/95 p-3 shadow-[0_16px_38px_rgba(15,23,42,0.13)] ring-1 ring-amber-100/80 backdrop-blur-xl"
      style={{ left, top }}
    >
      <div
        onPointerDown={(event) => onPointerDown(event, mark)}
        className="flex cursor-grab items-start gap-2 active:cursor-grabbing"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-600">
              {tag.label}
            </span>
            <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-300">
              疑点
            </span>
          </div>
          <p className="line-clamp-4 break-words text-[13px] font-bold leading-snug text-slate-700">
            <RichText content={[mark.text]} />
          </p>
        </div>
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove(mark.id)}
          className="mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
          aria-label="删除疑点"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}

function MathModuleDragPreview({ preview }) {
  if (!preview) return null;

  const tag = getMathChainTag(preview.type);
  const stage = MATH_CHAIN_STAGES.find((item) => item.id === tag.stage) || MATH_CHAIN_STAGES[0];

  return (
    <div
      className="pointer-events-none fixed z-[60] w-[230px] rounded-[22px] border border-primary/20 bg-white/90 p-3 shadow-[0_22px_56px_rgba(46,103,248,0.22)] ring-1 ring-white/90 backdrop-blur-xl"
      style={{ left: preview.x, top: preview.y, transform: "translate(-50%, -50%) rotate(-1deg)" }}
    >
      <span className="absolute -top-1.5 left-8 size-3 rounded-full bg-white ring-1 ring-primary/20" />
      <span className="absolute -bottom-1.5 left-8 size-3 rounded-full bg-blue-50 ring-1 ring-primary/15" />
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary text-white shadow-sm">
          <span className="material-symbols-outlined text-[18px]">{tag.icon}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">
              {tag.label}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
              {stage.title}
            </span>
          </div>
          <p className="line-clamp-2 text-[12px] font-bold leading-snug text-slate-600">
            {preview.text || tag.hint}
          </p>
        </div>
      </div>
    </div>
  );
}

function SolvingToolPanel({
  subject = "math",
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
  onMoveNote,
  noteTags = NOTE_TAGS,
  notesTitle = "本题条件",
  notesEmpty = "先把题目翻译成一两条条件。",
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
            <h3 className="truncate text-[15px] font-black text-slate-800">
              {subject === "math" ? "解题链" : "解题记录"}
            </h3>
            {!isFloating && (
              <p className="mt-0.5 text-[10px] font-bold text-muted">
                {subject === "math" ? "拖模块搭建思路" : "拖动标题栏可浮出"}
              </p>
            )}
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
                const moduleLabel = module.id === "notes" ? notesTitle.replace(/^本题/, "") : module.label;
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
                    title={module.locked ? "核心功能保持开启" : isActive ? `隐藏${moduleLabel}` : `添加${moduleLabel}`}
                    aria-pressed={isActive}
                  >
                    <span className="material-symbols-outlined text-[15px]">{module.icon}</span>
                    {moduleLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {subject === "math" ? (
          <MathReasoningBuilder
            record={record}
            activeTag={activeTag}
            onActiveTagChange={onActiveTagChange}
            noteDraft={noteDraft}
            onNoteDraftChange={onNoteDraftChange}
            onAddNote={onAddNote}
            onRemoveNote={onRemoveNote}
            onMoveNote={onMoveNote}
          />
        ) : (
          <>
        <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">快速标签</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {noteTags.map((tag) => (
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
                {noteTags.find((tag) => tag.id === activeTag)?.icon || "edit_note"}
              </span>
            </span>
            <input
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder={`${noteTags.find((tag) => tag.id === activeTag)?.label || "记录"}：写一句就好`}
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
            <p className="text-[11px] font-black uppercase tracking-wider text-muted">{notesTitle}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-muted">
              {record?.notes?.length || 0}
            </span>
          </div>
          <div className="grid gap-2">
            {record?.notes?.length ? (
              record.notes.map((note) => {
                const tag = noteTags.find((item) => item.id === note.type) || noteTags[0];
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
                {notesEmpty}
              </p>
            )}
          </div>
        </section>
          </>
        )}

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

function SelectionMarkMenu({ menu, subject = "math", onMark, onAddSelectionNote, onStartDragOut, onClose }) {
  if (!menu) return null;

  return (
    <div
      className="fixed z-50 flex max-w-[min(620px,calc(100vw-32px))] flex-wrap items-center gap-1 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-float backdrop-blur"
      style={{ left: menu.x, top: menu.y, transform: "translateX(-50%)" }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {subject === "math" &&
        MATH_CHAIN_TAGS.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onAddSelectionNote(tag.id)}
            className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-black text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary"
            title={`加入解题链：${tag.label}`}
          >
            <span className="material-symbols-outlined text-[16px]">{tag.icon}</span>
            {tag.label}
          </button>
        ))}
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
  subject,
  subjectConfig,
  currentPage,
  onContinue,
  onOpenMap,
  onSearch,
  keyword,
  onKeywordChange,
  topicStats,
  totalQuestions,
  playableTotalQuestions,
  reviewCount,
  progress,
  onDailyPractice,
  onReviewPractice,
  onRandomPractice,
}) {
  const config = subjectConfig || SUBJECT_CONFIG.math;
  const progressValue = Math.round(progress || 0);
  const courseCards = [
    {
      id: `${subject}-course`,
      title: config.courseTitle,
      subtitle: config.courseSubtitle,
      icon: config.mainIcon,
      count: totalQuestions,
      playableCount: playableTotalQuestions ?? totalQuestions,
      action: onContinue,
    },
    ...topicStats.map((topic) => ({
      id: topic.type,
      title: `${config.topicPrefix} · ${topic.title}`,
      subtitle: topic.subtitle,
      icon: topic.type,
      count: topic.questionsCount,
      playableCount: topic.playableQuestionsCount,
      action: () => onOpenMap(topic.type),
    })),
  ];
  const quickCards = [
    {
      title: "今日 10 题",
      subtitle: "每日精选，巩固提升",
      icon: "calendar_month",
      tone: "blue",
      action: onDailyPractice || onContinue,
    },
    {
      title: "错题复习",
      subtitle: reviewCount ? `${reviewCount} 道题需要回看` : "查漏补缺，复盘疑点",
      icon: "cancel",
      tone: "red",
      action: onReviewPractice || onContinue,
    },
    {
      title: "随机挑战",
      subtitle: "随机组题，挑战自我",
      icon: "casino",
      tone: "purple",
      action: onRandomPractice || onContinue,
    },
  ];

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="shrink-0 px-10 pb-5 pt-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="font-display text-[34px] font-bold leading-tight text-slate-900">{config.homeTitle}</h2>
            <p className="mt-2 text-sm font-bold text-muted">{config.homeSubtitle}</p>
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSearch();
              }
            }}
            placeholder={config.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm transition-transform hover:-translate-y-0.5"
            aria-label="搜索"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>
      </header>

      <div className="grid gap-7 px-10 pb-10">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-float">
          <h3 className="text-[18px] font-black text-slate-900">继续学习</h3>
          <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-center">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10">
              <TopicIcon type={getTopicType(currentPage, subject)} size={86} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[20px] font-black text-slate-900">
                {config.courseTitle} · {currentPage?.sectionTitle || config.continueFallback}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm font-bold text-muted">学习进度</span>
                <span className="text-sm font-black text-slate-500">{progressValue}%</span>
              </div>
              <div className="mt-2 h-2.5 max-w-[360px] overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressValue}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 xl:shrink-0">
              <button
                onClick={onContinue}
                className="node-button min-w-[148px] flex-1 rounded-xl bg-primary px-8 py-3 text-[14px] font-black text-white shadow-3d-node-primary xl:flex-none"
              >
                继续学习
              </button>
              <button
                onClick={() => onOpenMap()}
                className="node-button flex min-w-[132px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[14px] font-black text-slate-600 shadow-sm xl:flex-none"
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
                  {subject === "english" && card.playableCount !== card.count
                    ? `${card.playableCount}/${card.count} 可练`
                    : `${card.count} 题`}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={card.action}
                    className="node-button rounded-lg bg-primary px-3 py-2.5 text-[12px] font-black text-white shadow-3d-node-primary"
                  >
                    进入题库
                  </button>
                  <button
                    onClick={() => onOpenMap(card.id === `${subject}-course` ? undefined : card.id)}
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
  const [initialStudyState] = useState(getInitialStudyState);
  const [subject, setSubject] = useState(initialStudyState.subject); // "math" | "english"
  const [view, setView] = useState("home"); // "home", "map", or "quiz"
  const [pageId, setPageId] = useState(initialStudyState.pageId || getInitialPage);
  const [questionId, setQuestionId] = useState(initialStudyState.questionId || questionBank.pages[0]?.questions[0]?.id || "");
  const activeBank = subject === "english" ? cet6QuestionBank : questionBank;
  const subjectConfig = SUBJECT_CONFIG[subject] || SUBJECT_CONFIG.math;
  const [keyword, setKeyword] = useState("");
  const [collapsedTopics, setCollapsedTopics] = useState(() => getInitialCollapsedTopics(initialStudyState.subject));
  const [records, setRecords] = useState(loadSolvingRecords);
  const [answerRecords, setAnswerRecords] = useState(loadAnswerRecords);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesWindowMode, setNotesWindowMode] = useState("dock");
  const [notesWindowLayout, setNotesWindowLayout] = useState(() => ({
    x: typeof window === "undefined" ? 820 : Math.max(320, window.innerWidth - 392),
    y: 86,
    width: 340,
    height: typeof window === "undefined" ? 620 : Math.min(660, Math.max(460, window.innerHeight - 126)),
  }));
  const [mathPaletteLayout, setMathPaletteLayout] = useState(() => ({
    x: typeof window === "undefined" ? 240 : clampNumber(Math.round((window.innerWidth - 680) / 2), getPaletteRailBounds().minX, getPaletteRailBounds().maxX),
    y: typeof window === "undefined" ? 640 : getPaletteRailBounds().minY,
  }));
  const [metadataLayout, setMetadataLayout] = useState(() => ({
    x: typeof window === "undefined" ? 360 : clampNumber(Math.round(window.innerWidth / 2 - 245), getMetadataRailBounds(false).minX, getMetadataRailBounds(false).maxX),
    y: getMetadataRailBounds(false).minY,
  }));
  const [metadataMinimized, setMetadataMinimized] = useState(false);
  const [activeNoteTag, setActiveNoteTag] = useState("known");
  const [noteDraft, setNoteDraft] = useState("");
  const [selectionMenu, setSelectionMenu] = useState(null);
  const [moduleDragPreview, setModuleDragPreview] = useState(null);
  const [floatingCards, setFloatingCards] = useState([]);
  const [toolModules, setToolModules] = useState(loadToolModules);
  const normalizedKeyword = keyword.trim();
  const questionShellRef = useRef(null);
  const dragSessionRef = useRef(null);

  const filteredPages = useMemo(() => {
    return activeBank.pages
      .map((page) => ({
        ...page,
        questions: page.questions.filter((question) => matchesKeyword(page, question, normalizedKeyword)),
      }))
      .filter((page) => page.questions.length > 0);
  }, [normalizedKeyword, activeBank]);
  const directory = useMemo(() => groupPagesBySection(filteredPages), [filteredPages]);
  const topicDirectory = useMemo(() => groupSectionsByTopic(directory, subject), [directory, subject]);
  const topicStats = useMemo(() => groupSectionsByTopic(groupPagesBySection(activeBank.pages), subject), [activeBank, subject]);
  const { topics: solarTopics, canvasW: MAP_W, canvasH: CANVAS_H } = useMemo(
    () => computeSolarMap(activeBank.pages, subject),
    [activeBank, subject]
  );
  const totalQuestions = useMemo(
    () => activeBank.pages.reduce((sum, page) => sum + page.questions.length, 0),
    [activeBank]
  );
  const playableTotalQuestions = useMemo(
    () => countPlayableQuestions(activeBank.pages, subject),
    [activeBank, subject]
  );

  const activePage =
    filteredPages.find((page) => page.id === pageId) ||
    filteredPages[0] ||
    (!normalizedKeyword ? activeBank.pages.find((page) => page.id === pageId) : null) ||
    (!normalizedKeyword ? activeBank.pages[0] : null);

  const visibleQuestions = activePage?.questions || [];
  const activeQuestion =
    visibleQuestions.find((question) => question.id === questionId) ||
    visibleQuestions[0] ||
    activePage?.questions?.[0];

  const activeQuestionIndex = visibleQuestions.findIndex((q) => q.id === activeQuestion?.id);
  const activeQuestionId = activeQuestion?.id || "";
  const activeRecord = records[activeQuestionId] || createEmptyRecord();
  const activeAnswerRecord = answerRecords[activeQuestionId] || {};
  const activeAnswer = activeAnswerRecord.selected || [];
  const activeAnswerText = activeAnswerRecord.text || "";
  const answeredCount = useMemo(() => {
    const ids = new Set(activeBank.pages.flatMap((page) => page.questions.map((question) => question.id)));
    return Object.entries(answerRecords).filter(([questionId, record]) => {
      if (!ids.has(questionId)) return false;
      return (record.selected || []).length > 0 || Boolean(record.text?.trim());
    }).length;
  }, [answerRecords, activeBank]);
  const studyProgress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const reviewRecords = useMemo(
    () =>
      Object.entries(records)
        .filter(([, record]) => (record.notes?.length || 0) + (record.marks?.length || 0) > 0)
        .sort((a, b) => String(b[1].updatedAt || "").localeCompare(String(a[1].updatedAt || ""))),
    [records]
  );

  useEffect(() => {
    if (!activePage?.id || !activeQuestionId) return;
    saveLastSession({
      subject,
      pageId: activePage.id,
      questionId: activeQuestionId,
      updatedAt: new Date().toISOString(),
    });
  }, [subject, activePage?.id, activeQuestionId]);

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

      if (session.type === "chain-note-move") {
        const bounds = getWorkbenchBounds();
        const nextX = clampNumber(session.startX + event.clientX - session.pointerX, bounds.minX, bounds.maxX);
        const nextY = clampNumber(session.startY + event.clientY - session.pointerY, bounds.minY, bounds.maxY);
        setRecords((previous) => {
          const current = previous[session.questionId];
          if (!current) return previous;
          const nextRecord = {
            ...current,
            notes: (current.notes || []).map((note) =>
              note.id === session.noteId ? { ...note, x: nextX, y: nextY } : note
            ),
            updatedAt: new Date().toISOString(),
          };
          const next = { ...previous, [session.questionId]: nextRecord };
          saveSolvingRecords(next);
          return next;
        });
      }

      if (session.type === "mark-move") {
        const bounds = getWorkbenchBounds();
        const nextX = clampNumber(session.startX + event.clientX - session.pointerX, bounds.minX, bounds.maxX);
        const nextY = clampNumber(session.startY + event.clientY - session.pointerY, bounds.minY, bounds.maxY);
        setRecords((previous) => {
          const current = previous[session.questionId];
          if (!current) return previous;
          const nextRecord = {
            ...current,
            marks: (current.marks || []).map((mark) =>
              mark.id === session.markId ? { ...mark, x: nextX, y: nextY } : mark
            ),
            updatedAt: new Date().toISOString(),
          };
          const next = { ...previous, [session.questionId]: nextRecord };
          saveSolvingRecords(next);
          return next;
        });
      }

      if (session.type === "palette-move") {
        const bounds = getPaletteRailBounds();
        setMathPaletteLayout({
          x: clampNumber(session.startX + event.clientX - session.pointerX, bounds.minX, bounds.maxX),
          y: clampNumber(session.startY + event.clientY - session.pointerY, bounds.minY, bounds.maxY),
        });
      }

      if (session.type === "metadata-move") {
        const bounds = getMetadataRailBounds(metadataMinimized);
        setMetadataLayout({
          x: clampNumber(session.startX + event.clientX - session.pointerX, bounds.minX, bounds.maxX),
          y: clampNumber(session.startY + event.clientY - session.pointerY, bounds.minY, bounds.maxY),
        });
      }

      if (session.type === "module-pickup") {
        const deltaX = event.clientX - session.pointerX;
        const deltaY = event.clientY - session.pointerY;
        if (!session.isDragging && Math.hypot(deltaX, deltaY) > 8) {
          session.isDragging = true;
        }

        if (session.isDragging) {
          const bounds = getWorkbenchBounds();
          setModuleDragPreview({
            type: session.blockType,
            text: session.text,
            x: clampNumber(event.clientX, bounds.minX + 120, bounds.maxX + 120),
            y: clampNumber(event.clientY, bounds.minY + 34, bounds.maxY + 34),
          });
        }
      }
    }

    function handlePointerUp(event) {
      const session = dragSessionRef.current;
      if (session?.type === "module-pickup" && session.isDragging && session.questionId) {
        const tag = getMathChainTag(session.blockType);
        const bounds = getWorkbenchBounds();
        const nextX = clampNumber(event.clientX - 120, bounds.minX, bounds.maxX);
        const nextY = clampNumber(event.clientY - 34, bounds.minY, bounds.maxY);
        const text = session.text || tag.hint;

        setRecords((previous) => {
          const current = previous[session.questionId] || createEmptyRecord();
          const nextRecord = {
            ...current,
            meta: session.meta,
            notes: [
              ...(current.notes || []),
              {
                id: createId("note"),
                type: session.blockType,
                stage: tag.stage,
                order: current.notes?.length || 0,
                x: nextX,
                y: nextY,
                text,
                createdAt: new Date().toISOString(),
              },
            ],
            updatedAt: new Date().toISOString(),
          };
          const next = { ...previous, [session.questionId]: nextRecord };
          saveSolvingRecords(next);
          return next;
        });
        setActiveNoteTag(session.blockType);
        if (session.text) setNoteDraft("");
      }

      setModuleDragPreview(null);
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
  }, [metadataMinimized]);

  function openQuestion(page, question) {
    if (!page || !question) return;
    setPageId(page.id);
    setQuestionId(question.id || "");
    setKeyword("");
    setCollapsedTopics((previous) => ({
      ...previous,
      [getTopicType(page, subject)]: false,
    }));
    setView("quiz");
  }

  function startQuiz(page) {
    const firstQuestion =
      subject === "english"
        ? page.questions.find((question) => isPlayableQuestion(question, subject)) || page.questions[0]
        : page.questions[0];
    openQuestion(page, firstQuestion);
  }

  function continueStudy() {
    const { page, question } = findQuestionLocation(activeBank, questionId);
    if (page && question) {
      openQuestion(page, question);
      return;
    }
    startQuiz(activeBank.pages[0]);
  }

  function startDailyPractice() {
    const unanswered = activeBank.pages
      .flatMap((page) => page.questions.map((question) => ({ page, question })))
      .find(({ question }) => {
        if (subject === "english" && !isPlayableQuestion(question, subject)) return false;
        const record = answerRecords[question.id] || {};
        return !(record.selected || []).length && !record.text?.trim();
      });

    if (unanswered) {
      openQuestion(unanswered.page, unanswered.question);
      return;
    }
    continueStudy();
  }

  function startReviewPractice() {
    const reviewEntry = reviewRecords.find(([questionId]) => findQuestionLocation(activeBank, questionId).page);
    if (reviewEntry) {
      const { page, question } = findQuestionLocation(activeBank, reviewEntry[0]);
      openQuestion(page, question);
      return;
    }
    openMap();
  }

  function startRandomPractice() {
    const playable = activeBank.pages.flatMap((page) =>
      page.questions
        .filter((question) => subject !== "english" || isPlayableQuestion(question, subject))
        .map((question) => ({ page, question }))
    );
    const item = playable[Math.floor(Math.random() * playable.length)];
    if (item) openQuestion(item.page, item.question);
  }

  function switchSubject(nextSubject) {
    const nextBank = nextSubject === "english" ? cet6QuestionBank : questionBank;
    setSubject(nextSubject);
    setPageId(nextBank.pages[0]?.id || "");
    setQuestionId(nextBank.pages[0]?.questions[0]?.id || "");
    setKeyword("");
    setCollapsedTopics(getInitialCollapsedTopics(nextSubject));
    setActiveNoteTag("known");
    setSelectionMenu(null);
    setFloatingCards([]);
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
          stage: subject === "math" ? getMathChainTag(activeNoteTag).stage : undefined,
          order: record.notes?.length || 0,
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setNoteDraft("");
    setNotesOpen(true);
  }

  function addSelectionNote(type) {
    if (!selectionMenu?.text) return;
    const tag = getMathChainTag(type);
    const bounds = getWorkbenchBounds();
    updateActiveRecord((record) => ({
      ...record,
      notes: [
        ...(record.notes || []),
        {
          id: createId("note"),
          type,
          stage: tag.stage,
          order: record.notes?.length || 0,
          x: clampNumber(selectionMenu.x - 130, bounds.minX, bounds.maxX),
          y: clampNumber(selectionMenu.y + 46, bounds.minY, bounds.maxY),
          text: selectionMenu.text,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    applySoftSelectionHighlight(selectionMenu.range);
    window.getSelection?.()?.removeAllRanges();
    setSelectionMenu(null);
    setNotesOpen(true);
  }

  function addWorkbenchBlock(type = activeNoteTag) {
    const tag = getMathChainTag(type);
    const text = noteDraft.trim() || tag.hint;
    const count = activeRecord.notes?.length || 0;
    const bounds = getWorkbenchBounds();

    updateActiveRecord((record) => ({
      ...record,
      notes: [
        ...(record.notes || []),
        {
          id: createId("note"),
          type,
          stage: tag.stage,
          order: record.notes?.length || 0,
          x: clampNumber(typeof window === "undefined" ? 720 : window.innerWidth - 390, bounds.minX, bounds.maxX),
          y: clampNumber(118 + count * 18, bounds.minY, bounds.maxY),
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setNoteDraft("");
  }

  function arrangeWorkbenchBlocks() {
    const bounds = getWorkbenchBounds();
    const stageAnchors = {
      read: { x: bounds.minX + 18, y: 104 },
      reason: { x: Math.min(bounds.maxX, bounds.minX + 300), y: 156 },
      answer: { x: Math.min(bounds.maxX, bounds.minX + 600), y: 208 },
    };

    updateActiveRecord((record) => {
      const grouped = Object.fromEntries(MATH_CHAIN_STAGES.map((stage) => [stage.id, []]));
      (record.notes || []).forEach((note, index) => {
        const stage = getMathChainStage(note);
        (grouped[stage] || grouped.read).push({ ...note, fallbackOrder: index });
      });
      Object.values(grouped).forEach((items) => {
        items.sort((a, b) => getMathChainOrder(a, a.fallbackOrder) - getMathChainOrder(b, b.fallbackOrder));
      });

      const nextNotes = MATH_CHAIN_STAGES.flatMap((stage) =>
        (grouped[stage.id] || []).map((note, index) => {
          const anchor = stageAnchors[stage.id] || stageAnchors.read;
          return {
            ...note,
            stage: stage.id,
            order: index,
            x: clampNumber(anchor.x, bounds.minX, bounds.maxX),
            y: clampNumber(anchor.y + index * 92, bounds.minY, bounds.maxY),
          };
        })
      );

      return { ...record, notes: nextNotes };
    });
  }

  function moveNote(noteId, targetStage, targetIndex) {
    updateActiveRecord((record) => {
      const movingNote = (record.notes || []).find((note) => note.id === noteId);
      if (!movingNote) return record;

      const remaining = (record.notes || []).filter((note) => note.id !== noteId);
      const grouped = Object.fromEntries(MATH_CHAIN_STAGES.map((stage) => [stage.id, []]));
      remaining.forEach((note, index) => {
        const stage = getMathChainStage(note);
        (grouped[stage] || grouped.read).push({ ...note, fallbackOrder: index });
      });
      Object.values(grouped).forEach((items) => {
        items.sort((a, b) => getMathChainOrder(a, a.fallbackOrder) - getMathChainOrder(b, b.fallbackOrder));
      });

      const target = grouped[targetStage] || grouped.read;
      const boundedIndex = Math.min(Math.max(targetIndex, 0), target.length);
      target.splice(boundedIndex, 0, {
        ...movingNote,
        stage: targetStage,
      });

      const nextNotes = MATH_CHAIN_STAGES.flatMap((stage) =>
        (grouped[stage.id] || []).map((note, index) => ({
          ...note,
          stage: stage.id,
          order: index,
        }))
      );

      return {
        ...record,
        notes: nextNotes,
      };
    });
  }

  function selectAnswer(label) {
    if (!activeQuestionId || !label) return;
    const isMultiple = activeQuestion?.type === "multiple-choice";

    setAnswerRecords((previous) => {
      const selected = previous[activeQuestionId]?.selected || [];
      const currentText = previous[activeQuestionId]?.text || "";
      const nextSelected = isMultiple
        ? selected.includes(label)
          ? selected.filter((item) => item !== label)
          : [...selected, label]
        : selected.includes(label)
          ? []
          : [label];
      const next = {
        ...previous,
        [activeQuestionId]: {
          selected: nextSelected,
          text: currentText,
          updatedAt: new Date().toISOString(),
          questionId: activeQuestionId,
          subject,
          pageId: activePage?.id,
          questionNo: activeQuestion?.no ?? activeQuestionIndex + 1,
        },
      };
      saveAnswerRecords(next);
      return next;
    });
  }

  function updateTextAnswer(text) {
    if (!activeQuestionId) return;

    setAnswerRecords((previous) => {
      const current = previous[activeQuestionId] || {};
      const next = {
        ...previous,
        [activeQuestionId]: {
          selected: current.selected || [],
          text,
          updatedAt: new Date().toISOString(),
          questionId: activeQuestionId,
          subject,
          pageId: activePage?.id,
          questionNo: activeQuestion?.no ?? activeQuestionIndex + 1,
        },
      };
      saveAnswerRecords(next);
      return next;
    });
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
    const bounds = getWorkbenchBounds();
    updateActiveRecord((record) => ({
      ...record,
      marks: [
        ...(record.marks || []),
        {
          id: createId("mark"),
          type,
          text: selectionMenu.text,
          x: subject === "math" ? clampNumber(selectionMenu.x - 118, bounds.minX, bounds.maxX) : undefined,
          y: subject === "math" ? clampNumber(selectionMenu.y + 46, bounds.minY, bounds.maxY) : undefined,
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

    if (subject === "math") {
      const bounds = getWorkbenchBounds();
      const markX = clampNumber(x, bounds.minX, bounds.maxX);
      const markY = clampNumber(y, bounds.minY, bounds.maxY);
      updateActiveRecord((record) => ({
        ...record,
        marks: [
          ...(record.marks || []),
          {
            id,
            type,
            text: selectionMenu.text,
            x: markX,
            y: markY,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      applySoftSelectionHighlight(selectionMenu.range);
      dragSessionRef.current = {
        type: "mark-move",
        questionId: activeQuestionId,
        markId: id,
        pointerX: event.clientX,
        pointerY: event.clientY,
        startX: markX,
        startY: markY,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      window.getSelection?.()?.removeAllRanges();
      setSelectionMenu(null);
      return;
    }

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

  function startChainNoteDrag(event, note) {
    if (event.button !== 0) return;
    const bounds = getWorkbenchBounds();
    const left = Number.isFinite(note.x)
      ? clampNumber(note.x, bounds.minX, bounds.maxX)
      : clampNumber(typeof window === "undefined" ? 720 : window.innerWidth - 390, bounds.minX, bounds.maxX);
    const top = Number.isFinite(note.y) ? clampNumber(note.y, bounds.minY, bounds.maxY) : 118;
    dragSessionRef.current = {
      type: "chain-note-move",
      questionId: activeQuestionId,
      noteId: note.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: left,
      startY: top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startMarkDrag(event, mark) {
    if (event.button !== 0) return;
    const bounds = getWorkbenchBounds();
    const left = Number.isFinite(mark.x)
      ? clampNumber(mark.x, bounds.minX, bounds.maxX)
      : clampNumber(typeof window === "undefined" ? 520 : window.innerWidth - 350, bounds.minX, bounds.maxX);
    const top = Number.isFinite(mark.y) ? clampNumber(mark.y, bounds.minY, bounds.maxY) : 250;
    dragSessionRef.current = {
      type: "mark-move",
      questionId: activeQuestionId,
      markId: mark.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: left,
      startY: top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startPaletteDrag(event) {
    if (event.button !== 0) return;
    dragSessionRef.current = {
      type: "palette-move",
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: mathPaletteLayout.x,
      startY: mathPaletteLayout.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startPaletteModuleDrag(event, blockType) {
    if (event.button !== 0) return;
    dragSessionRef.current = {
      type: "module-pickup",
      blockType,
      questionId: activeQuestionId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      text: noteDraft.trim(),
      meta: {
        pageTitle: activePage?.partTitle,
        sectionTitle: activePage?.sectionTitle,
        questionNo: activeQuestion?.no ?? activeQuestionIndex + 1,
      },
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startMetadataDrag(event) {
    if (event.button !== 0) return;
    dragSessionRef.current = {
      type: "metadata-move",
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: metadataLayout.x,
      startY: metadataLayout.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function toggleMetadataMinimized() {
    setMetadataMinimized((value) => {
      const nextValue = !value;
      const bounds = getMetadataRailBounds(nextValue);
      setMetadataLayout((layout) => ({
        x: clampNumber(layout.x, bounds.minX, bounds.maxX),
        y: clampNumber(layout.y, bounds.minY, bounds.maxY),
      }));
      return nextValue;
    });
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
              <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <TopicIcon type={subjectConfig.mainIcon} size={42} />
              </div>
              {view !== "quiz" && (
                <div className="flex flex-col min-w-0">
                  <h1 className="font-display text-[17px] font-bold leading-tight truncate">{subjectConfig.appName}</h1>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted truncate">{subjectConfig.appSubtitle}</p>
                </div>
              )}
            </div>

            <nav className="flex flex-col gap-0 px-2">
              {/* Subject switcher */}
              {view !== "quiz" && (
                <div className="mb-3 flex rounded-xl bg-background p-1">
                  <button
                    onClick={() => switchSubject("math")}
                    className={cx(
                      "flex-1 rounded-lg py-2 text-[12px] font-black transition-all",
                      subject === "math" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-text-main"
                    )}
                  >
                    数学
                  </button>
                  <button
                    onClick={() => switchSubject("english")}
                    className={cx(
                      "flex-1 rounded-lg py-2 text-[12px] font-black transition-all",
                      subject === "english" ? "bg-white text-blue-600 shadow-sm" : "text-muted hover:text-text-main"
                    )}
                  >
                    英语六级
                  </button>
                </div>
              )}

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
                    onClick={startReviewPractice}
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
                          {subject === "english" && topic.playableQuestionsCount !== topic.questionsCount
                            ? `${topic.playableQuestionsCount}/${topic.questionsCount}`
                            : topic.questionsCount}
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
                                    const pagePlayableCount = countPlayableQuestions([page], subject);
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
                                          {subject === "english" && pagePlayableCount !== page.questions.length
                                            ? `${pagePlayableCount}/${page.questions.length}`
                                            : page.questions.length}
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
                  <TopicIcon type={getTopicType(activePage, subject)} size={28} />
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
            subject={subject}
            subjectConfig={subjectConfig}
            currentPage={activePage || activeBank.pages[0]}
            onContinue={continueStudy}
            onOpenMap={openMap}
            onSearch={submitHomeSearch}
            keyword={keyword}
            onKeywordChange={setKeyword}
            topicStats={topicStats}
            totalQuestions={totalQuestions}
            playableTotalQuestions={playableTotalQuestions}
            reviewCount={reviewRecords.length}
            progress={studyProgress}
            onDailyPractice={startDailyPractice}
            onReviewPractice={startReviewPractice}
            onRandomPractice={startRandomPractice}
          />
        ) : view === "map" ? (
          <div className="flex h-full flex-col">
            {/* Map Header */}
            <header className="flex shrink-0 items-center justify-between px-8 py-5 bg-surface border-b-2 border-background shadow-sm">
              <div className="min-w-0">
                <h2 className="font-display text-[28px] font-bold leading-tight">{subjectConfig.mapTitle}</h2>
                <p className="mt-1 text-xs font-bold text-muted">
                  {activeBank.pages.length} 个{subjectConfig.pathLabel} ·{" "}
                  {subject === "english" && playableTotalQuestions !== totalQuestions
                    ? `${playableTotalQuestions}/${totalQuestions} 道可练`
                    : `${totalQuestions} 道题`}{" "}
                  · {subjectConfig.mapSubtitle}
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
                          const firstPlayableSatellite =
                            topic.satellites.find((satellite) => satellite.playableQuestionsCount > 0) ||
                            topic.satellites[0];
                          const firstPage = firstPlayableSatellite?.page;
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
                          {topic.sections.length} 个章节 ·{" "}
                          {subject === "english" && topic.playableQuestionsCount !== topic.questionsCount
                            ? `${topic.playableQuestionsCount}/${topic.questionsCount} 可练`
                            : `${topic.questionsCount} 题`}
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
                                {satellite.pagesCount} 组 ·{" "}
                                {subject === "english" && satellite.playableQuestionsCount !== satellite.questionsCount
                                  ? `${satellite.playableQuestionsCount}/${satellite.questionsCount} 可练`
                                  : `${satellite.questionsCount} 题`}
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
              <QuizMetadataChip
                source={activeQuestion?.source || "题库"}
                sectionTitle={activePage?.sectionTitle}
                isMinimized={metadataMinimized}
                layout={metadataLayout}
                onToggleMinimized={toggleMetadataMinimized}
                onStartDrag={startMetadataDrag}
              />
              <div className="grid h-full grid-cols-[minmax(0,1fr)_auto]">
                <div className="overflow-auto">
                  <div className="mx-auto max-w-3xl px-6 pb-8 pt-10">
                    {/* Question card with floating tag */}
                    <div className="relative mb-8">
                      <div
                        ref={questionShellRef}
                        onPointerDown={handleQuestionPointerDown}
                        onMouseUp={handleQuestionSelection}
                        onKeyUp={handleQuestionSelection}
                        className="rounded-2xl bg-background p-8 shadow-float"
                      >
                        {subject === "english" ? (
                          <EnglishQuestionViewer
                            question={activeQuestion}
                            selectedAnswers={activeAnswer}
                            onSelectAnswer={selectAnswer}
                            textAnswer={activeAnswerText}
                            onTextAnswerChange={updateTextAnswer}
                          />
                        ) : (
                          <QuestionBlocks
                            blocks={activeQuestion?.blocks || []}
                            selectedAnswers={activeAnswer}
                            onSelectAnswer={selectAnswer}
                            textAnswer={activeAnswerText}
                            onTextAnswerChange={updateTextAnswer}
                          />
                        )}
                      </div>
                    </div>

                    {/* Footer: question dots + next button */}
                    <div className="flex flex-col gap-4">
                      {/* Question dots */}
                      <div className="flex flex-wrap gap-2">
                        {visibleQuestions.map((q, idx) => {
                          const record = answerRecords[q.id] || {};
                          const selected = record.selected || [];
                          const hasAnswer = selected.length > 0 || Boolean(record.text?.trim());
                          const answerTitle = selected.length > 0 ? `已选择 ${selected.join("、")}` : "已填写答案";
                          return (
                            <button
                              key={q.id}
                              onClick={() => setQuestionId(q.id)}
                              title={hasAnswer ? answerTitle : undefined}
                              className={cx(
                                "relative size-9 rounded-full text-sm font-bold transition-all",
                                q.id === activeQuestion?.id
                                  ? "bg-primary text-white shadow-md scale-110"
                                  : hasAnswer
                                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                                    : "bg-white text-muted hover:bg-slate-100"
                              )}
                              style={
                                q.id === activeQuestion?.id
                                  ? { background: "var(--color-primary)", color: "#fff" }
                                  : {}
                              }
                            >
                              {q.no ?? idx + 1}
                              {hasAnswer && q.id !== activeQuestion?.id && (
                                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
                              )}
                            </button>
                          );
                        })}
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

                {subject !== "math" && (
                  <SolvingToolPanel
                    subject={subject}
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
                    onMoveNote={moveNote}
                    noteTags={subjectConfig.noteTags}
                    notesTitle={subjectConfig.notesTitle}
                    notesEmpty={subjectConfig.notesEmpty}
                    toolModules={toolModules}
                    onToggleToolModule={updateToolModule}
                    record={activeRecord}
                    reviewRecords={reviewRecords}
                  />
                )}
              </div>
              {subject === "math" && (
                <>
                  <MathPencilPalette
                    activeTag={activeNoteTag}
                    onActiveTagChange={setActiveNoteTag}
                    noteDraft={noteDraft}
                    onNoteDraftChange={setNoteDraft}
                    onAddBlock={addWorkbenchBlock}
                    onArrangeBlocks={arrangeWorkbenchBlocks}
                    layout={mathPaletteLayout}
                    onStartDrag={startPaletteDrag}
                    onStartModuleDrag={startPaletteModuleDrag}
                  />
                  {(activeRecord.notes || []).map((note, index) => (
                    <MathWorkbenchBlock
                      key={note.id}
                      note={note}
                      index={index}
                      onPointerDown={startChainNoteDrag}
                      onRemove={removeNote}
                    />
                  ))}
                  {(activeRecord.marks || []).map((mark, index) => (
                    <MathMarkBlock
                      key={mark.id}
                      mark={mark}
                      index={index}
                      onPointerDown={startMarkDrag}
                      onRemove={removeMark}
                    />
                  ))}
                  <MathModuleDragPreview preview={moduleDragPreview} />
                </>
              )}
              <SelectionMarkMenu
                menu={selectionMenu}
                subject={subject}
                onMark={addSelectionMark}
                onAddSelectionNote={addSelectionNote}
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
