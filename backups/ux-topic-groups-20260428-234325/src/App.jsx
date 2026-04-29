import { useMemo, useRef, useState } from "react";
import { QuestionBlocks } from "./components/QuestionBlocks.jsx";
import { questionBank } from "./data/questionBank.js";
import { cx } from "./lib/cx.js";
import topicSetsIcon from "./assets/topic-sets.png";

function getInitialPage() {
  return questionBank.pages[0]?.id;
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

  if (/函数|映射|3\.1/.test(text)) return "function";
  if (/不等式|二次函数|方程|第二章|2\./.test(text)) return "inequality";
  return "sets";
}

function TopicIcon({ type = "sets", size = 24, className }) {
  if (type === "sets") {
    return (
      <img
        src={topicSetsIcon}
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

  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true,
  };

  if (type === "inequality") {
    return (
      <svg {...commonProps}>
        <path d="M12 45h40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.22" />
        <path d="M32 14v28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 5" opacity="0.35" />
        <path d="M18 25l-10 6 10 6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M46 25l10 6-10 6" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 44h18M38 44h18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M32 43l-8 12h16l-8-12Z" fill="currentColor" opacity="0.22" />
      </svg>
    );
  }

  if (type === "function") {
    return (
      <svg {...commonProps}>
        <path d="M13 52V12M12 52h40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        <path d="M13 12l-4 7M13 12l4 7M52 52l-7-4M52 52l-7 4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
        <path d="M14 38c6-8 12-3 17 4 8 12 15 4 22-18" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 28h29M25 46h29M40 16v38" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 6" opacity="0.25" />
        <circle cx="53" cy="24" r="4" stroke="currentColor" strokeWidth="4" fill="white" />
      </svg>
    );
  }

  return null;
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

// Build an S-curve path through n nodes placed across the canvas
function buildMapPath(nodes) {
  if (nodes.length < 2) return "";
  const pts = nodes.map((n) => `${n.x},${n.y}`);
  // Simple polyline with bezier curves
  let d = `M ${pts[0]}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const cx1 = prev.x + (curr.x - prev.x) * 0.5;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) * 0.5;
    const cy2 = curr.y;
    d += ` C ${cx1},${cy1} ${cx2},${cy2} ${curr.x},${curr.y}`;
  }
  return d;
}

function computeNodePositions(pages) {
  // At least 130px per node, so all nodes are visible without crowding
  const PER_NODE = 130;
  const PADDING_X = 70;
  const n = pages.length;
  const CANVAS_W = Math.max(900, PADDING_X * 2 + PER_NODE * (n - 1));
  const CANVAS_H = 480;

  const positions = pages.map((page, idx) => {
    const t = n <= 1 ? 0.5 : idx / (n - 1);
    const x = PADDING_X + t * (CANVAS_W - PADDING_X * 2);
    const wavePhase = idx * (Math.PI / 2.5);
    const y = CANVAS_H / 2 + Math.sin(wavePhase) * (CANVAS_H * 0.3);
    return { x: Math.round(x), y: Math.round(y), page };
  });

  return { positions, canvasW: CANVAS_W, canvasH: CANVAS_H };
}

function App() {
  const [view, setView] = useState("map"); // "map" or "quiz"
  const [pageId, setPageId] = useState(getInitialPage);
  const [questionId, setQuestionId] = useState(questionBank.pages[0]?.questions[0]?.id || "");
  const [keyword, setKeyword] = useState("");
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

  // Scroll map to the first node of a given sectionTitle
  function scrollToSection(section) {
    const firstNode = mapNodes.find(
      (n) => n.page.sectionTitle === section.title && n.page.chapterTitle === section.chapterTitle
    );
    if (!firstNode || !mapScrollRef.current) return;
    // Center the node in the viewport
    const containerW = mapScrollRef.current.offsetWidth;
    const targetX = Math.max(0, firstNode.x - containerW / 2);
    mapScrollRef.current.scrollTo({ left: targetX, behavior: "smooth" });
  }

  // Map nodes
  const { positions: mapNodes, canvasW: MAP_W, canvasH: CANVAS_H } = computeNodePositions(questionBank.pages);
  const mapPath = buildMapPath(mapNodes);

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

              {/* Section list — hidden in mini sidebar mode */}
              {view !== "quiz" &&
                directory.map((section) => {
                  const isCurrentSection = section.pages.some(p => p.id === activePage?.id);
                  return (
                    <div key={`${section.chapterTitle}-${section.title}`} className="mt-2 first:mt-0 px-2 py-1">
                      {/* Section header — click to jump */}
                      <button
                        onClick={() => scrollToSection(section)}
                        className={cx(
                          "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-all group",
                          isCurrentSection ? "bg-primary/10" : "hover:bg-background"
                        )}
                      >
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-xl"
                          style={{
                            background: isCurrentSection ? "rgba(46,103,248,0.10)" : "rgba(148,163,184,0.10)",
                            color: isCurrentSection ? "var(--color-primary)" : "#94a3b8",
                          }}
                        >
                          <TopicIcon type={getTopicType(section)} size={24} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[12px] font-black leading-snug"
                            style={{ color: isCurrentSection ? "var(--color-primary)" : "#334155" }}
                          >
                            {section.title}
                          </span>
                          <span className="block truncate text-[10px] font-bold leading-snug text-muted">
                            {section.chapterTitle}
                          </span>
                        </span>
                        <span className="material-symbols-outlined text-[12px] text-muted opacity-0 group-hover:opacity-60 transition-opacity shrink-0">
                          my_location
                        </span>
                      </button>
                      {/* Items with dot indicators + left border */}
                      <div
                        className="ml-6 mt-1 mb-1 border-l-2 pl-3 flex flex-col gap-1"
                        style={{ borderColor: isCurrentSection ? "rgba(46,103,248,0.35)" : "#e2e8f0" }}
                      >
                        {section.pages.map((page) => {
                          const isActive = page.id === activePage?.id;
                          return (
                            <button
                              key={page.id}
                              onClick={() => startQuiz(page)}
                              className={cx(
                                "relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all",
                                isActive ? "bg-white shadow-sm" : "hover:bg-white/70"
                              )}
                            >
                              {/* Dot */}
                              <div
                                className="absolute -left-[20px] w-3 h-3 rounded-full ring-2 ring-white shrink-0"
                                style={{ background: isActive ? "var(--color-primary)" : "#E2E8F0" }}
                              />
                              <span
                                className="min-w-0 flex-1 truncate text-[12px] font-bold"
                                style={{ color: isActive ? "var(--color-primary)" : "#64748b" }}
                              >{page.partTitle}</span>
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
              <div className="relative z-10" style={{ width: MAP_W, height: CANVAS_H + 160, minWidth: MAP_W }}>

                {/* Glow + dashed path */}
                <svg className="absolute left-0 top-0 pointer-events-none z-0" style={{ width: MAP_W, height: CANVAS_H + 160, overflow: "visible" }}>
                  <defs>
                    <linearGradient id="pathGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2E67F8" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.35" />
                    </linearGradient>
                    <filter id="glowBlur">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  {/* Glow layer */}
                  <path d={mapPath} fill="none" stroke="url(#pathGlow)" strokeWidth="6" strokeLinecap="round" filter="url(#glowBlur)" opacity="0.55" />
                  {/* Dashed overlay */}
                  <path d={mapPath} fill="none" stroke="#CBD5E1" strokeDasharray="14 14" strokeLinecap="round" strokeWidth="4" opacity="0.6" />
                </svg>

                {/* Section banners */}
                {mapNodes.reduce((acc, { x, y, page }, idx) => {
                  const prevSection = idx > 0 ? mapNodes[idx - 1].page.sectionTitle : null;
                  if (page.sectionTitle !== prevSection) {
                    acc.push(
                      <div key={`banner-${idx}`}
                        className="absolute z-20 flex items-center gap-1.5 rounded-full px-3 py-1"
                        style={{ left: x, top: y - 60, transform: "translateX(-50%)", background: "rgba(46,103,248,0.9)", boxShadow: "0 4px 12px rgba(46,103,248,0.3), 0 0 20px rgba(0,240,255,0.15)" }}
                      >
                        <span className="grid size-6 place-items-center rounded-full bg-white/15 text-white">
                          <TopicIcon type={getTopicType(page)} size={18} />
                        </span>
                        <span className="text-[11px] font-black text-white whitespace-nowrap tracking-wide">{page.sectionTitle}</span>
                      </div>
                    );
                  }
                  return acc;
                }, [])}

                {/* Nodes */}
                {mapNodes.map(({ x, y, page }) => {
                  const isCurrent = page.id === activePage?.id;
                  return (
                    <div key={page.id}
                      style={{ left: x, top: y + 40 }}
                      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    >
                      {isCurrent ? (
                        /* ── Active: large orbital circle (reference central node style) ── */
                        <div className="relative flex flex-col items-center gap-3">
                          {/* Bounce arrow */}
                          <div className="absolute -top-16 animate-bounce z-10">
                            <span className="material-symbols-outlined text-primary text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_drop_down</span>
                          </div>
                          <button onClick={() => startQuiz(page)} className="node-button relative">
                            {/* Main circle */}
                            <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
                              style={{ background: "#fff", boxShadow: "0 12px 24px rgba(0,0,0,0.12), inset 0 -6px 12px rgba(0,0,0,0.05)", borderBottom: "8px solid #e2e8f0" }}>
                              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(176,198,255,0.45)", boxShadow: "inset 0 4px 8px rgba(255,255,255,0.8), inset 0 -4px 8px rgba(0,0,0,0.08)" }}>
                                <TopicIcon type={getTopicType(page)} size={50} className="text-primary" />
                              </div>
                            </div>
                            {/* Orbital ring 1 */}
                            <div className="absolute rounded-full border-2 border-dashed pointer-events-none"
                              style={{ inset: -14, borderColor: "rgba(46,103,248,0.35)", animation: "spin 20s linear infinite" }} />
                            {/* Orbital ring 2 */}
                            <div className="absolute rounded-full border pointer-events-none"
                              style={{ inset: -26, borderColor: "rgba(0,240,255,0.25)", animation: "spin 30s linear infinite reverse" }} />
                            {/* Blue glow dot */}
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
                              style={{ background: "#2E67F8", boxShadow: "0 0 8px rgba(46,103,248,1)" }} />
                          </button>
                          {/* Label */}
                          <div className="text-center mt-2 max-w-[150px]">
                            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-primary)" }}>当前练习</p>
                            <p className="truncate text-[13px] font-black" style={{ color: "var(--color-primary)" }}>{page.partTitle}</p>
                            <p className="text-[10px] font-bold text-muted">{page.questions.length} 道题</p>
                          </div>
                        </div>
                      ) : (
                        /* ── Other nodes: horizontal card (reference orbital node style) ── */
                        <div className="flex flex-col items-center gap-2">
                          <button onClick={() => startQuiz(page)}
                            className="node-button relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all"
                            style={{ width: 168, background: "#fff", borderBottom: "5px solid #22C55E", boxShadow: "0 6px 16px rgba(0,0,0,0.08)" }}
                          >
                            {/* Green glow dot */}
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full"
                              style={{ background: "#22C55E", boxShadow: "0 0 6px rgba(34,197,94,0.9)" }} />
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: "rgba(34,197,94,0.12)" }}>
                              <TopicIcon type={getTopicType(page)} size={28} className="text-success" />
                            </div>
                            <div className="flex min-w-0 flex-col text-left">
                              <span className="truncate text-[12px] font-bold text-slate-700 leading-tight">{page.partTitle}</span>
                              <span className="text-[10px] font-black uppercase tracking-wider mt-0.5" style={{ color: "var(--color-success)" }}>{page.questions.length} Questions</span>
                            </div>
                          </button>
                        </div>
                      )}
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
