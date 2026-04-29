import { useMemo, useRef, useState } from "react";
import { QuestionBlocks } from "./components/QuestionBlocks.jsx";
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

function getInitialPage() {
  return questionBank.pages[0]?.id;
}

function getInitialCollapsedTopics() {
  const initialType = getTopicType(questionBank.pages[0]);
  return Object.fromEntries(TOPIC_ORDER.map((type) => [type, type !== initialType]));
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

function App() {
  const [view, setView] = useState("map"); // "map" or "quiz"
  const [pageId, setPageId] = useState(getInitialPage);
  const [questionId, setQuestionId] = useState(questionBank.pages[0]?.questions[0]?.id || "");
  const [keyword, setKeyword] = useState("");
  const [collapsedTopics, setCollapsedTopics] = useState(getInitialCollapsedTopics);
  const normalizedKeyword = keyword.trim();

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
  const { topics: solarTopics, canvasW: MAP_W, canvasH: CANVAS_H } = useMemo(
    () => computeSolarMap(questionBank.pages),
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

  return (
    <main className="flex h-screen overflow-hidden bg-background font-body text-text-main antialiased">
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
              {/* Learning Map button */}
              <button
                onClick={() => setView("map")}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
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

              {/* Topic groups — hidden in mini sidebar mode */}
              {view !== "quiz" &&
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
        {view === "map" ? (
          <div className="flex h-full flex-col">
            {/* Map Header */}
            <header className="flex shrink-0 items-center justify-between px-8 py-5 bg-surface border-b-2 border-background shadow-sm">
              <div className="min-w-0">
                <h2 className="font-display text-[28px] font-bold leading-tight">Learning Map</h2>
                <p className="mt-1 text-xs font-bold text-muted">
                  {questionBank.pages.length} 个练习路径 · {questionBank.pages.reduce((sum, page) => sum + page.questions.length, 0)} 道题
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
            <div className="flex-1 overflow-auto">
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

                  <div className="rounded-2xl bg-background p-8 pt-12 shadow-float">
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
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
