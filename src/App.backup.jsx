import { useMemo, useState } from "react";
import { QuestionBlocks } from "./components/QuestionBlocks.jsx";
import { questionBank } from "./data/questionBank.js";
import { cx } from "./lib/cx.js";

function getInitialPage() {
  return questionBank.pages[0]?.id;
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
    const existing = sections.find((section) => section.title === sectionTitle);

    if (existing) {
      existing.pages.push(page);
    } else {
      sections.push({
        title: sectionTitle,
        chapterTitle: page.chapterTitle,
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
                directory.map((section, sIdx) => (
                  <div key={section.title} className="mt-2 first:mt-0">
                    {/* Section header badge */}
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md bg-primary/10 px-1.5 text-[10px] font-black text-primary">
                        {sIdx + 1}
                      </span>
                      <p className="text-[11px] font-bold text-text-main leading-tight">
                        {section.title}
                      </p>
                    </div>
                    <div className="ml-2 border-l-2 border-background pl-2 flex flex-col gap-0.5">
                      {section.pages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => startQuiz(page)}
                          className={cx(
                            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-all",
                            page.id === activePage?.id
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-muted hover:bg-background hover:text-text-main"
                          )}
                        >
                          <span className="material-symbols-outlined text-[15px] shrink-0">
                            {page.questions.length > 5 ? "article" : "assignment_turned_in"}
                          </span>
                          <span className="truncate text-[12px] font-semibold">{page.partTitle}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              {/* In mini mode: show current active page icon */}
              {view === "quiz" && activePage && (
                <button
                  onClick={() => setView("map")}
                  title={activePage.partTitle}
                  className="flex justify-center rounded-xl px-3 py-3 text-primary bg-primary/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {activePage.questions.length > 5 ? "article" : "assignment_turned_in"}
                  </span>
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
              <h2 className="font-display text-[28px] font-bold">Set Theory Map</h2>
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
            <div className="flex-1 overflow-auto">
              <div
                className="relative"
                style={{ width: MAP_W, height: CANVAS_H + 160, minWidth: MAP_W }}
              >
                {/* Dashed path */}
                <svg
                  className="absolute left-0 top-0 pointer-events-none z-0"
                  style={{ width: MAP_W, height: CANVAS_H + 160, overflow: "visible" }}
                >
                  <path
                    d={mapPath}
                    fill="none"
                    stroke="#CBD5E1"
                    strokeDasharray="14 14"
                    strokeLinecap="round"
                    strokeWidth="7"
                  />
                </svg>

                {/* Section banners: label first node of each new section */}
                {mapNodes.reduce((acc, { x, y, page }, idx) => {
                  const prevSection = idx > 0 ? mapNodes[idx - 1].page.sectionTitle : null;
                  if (page.sectionTitle !== prevSection) {
                    acc.push(
                      <div
                        key={`section-banner-${idx}`}
                        className="absolute z-20 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 shadow-md"
                        style={{ left: x, top: y - 60, transform: "translateX(-50%)" }}
                      >
                        <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>label</span>
                        <span className="text-[11px] font-black text-white whitespace-nowrap tracking-wide">{page.sectionTitle}</span>
                      </div>
                    );
                  }
                  return acc;
                }, [])}

                {mapNodes.map(({ x, y, page }) => {
                  const isCurrent = page.id === activePage?.id;

                  return (
                    <div
                      key={page.id}
                      style={{ left: x, top: y + 40 }}
                      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3"
                    >
                      {isCurrent && (
                        <div className="absolute -top-14 animate-bounce">
                          <span
                            className="material-symbols-outlined text-primary text-[30px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            arrow_drop_down
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => startQuiz(page)}
                        className={cx(
                          "node-button flex items-center justify-center rounded-full bg-surface transition-all",
                          isCurrent
                            ? "size-20 border-4 border-primary shadow-3d-node-primary"
                            : "size-16 border-2 border-transparent shadow-3d-node"
                        )}
                      >
                        <span
                          className={cx(
                            "material-symbols-outlined",
                            isCurrent ? "text-[40px] text-primary" : "text-[32px] text-success"
                          )}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {isCurrent ? "play_arrow" : "check_circle"}
                        </span>
                      </button>
                      <div
                        className={cx(
                          "w-[130px] rounded-2xl px-3 py-2 shadow-sm text-center",
                          isCurrent ? "bg-primary text-white" : "bg-white text-text-main"
                        )}
                      >
                        <p className={cx(
                          "text-[10px] font-bold leading-tight mb-0.5 truncate",
                          isCurrent ? "text-white/70" : "text-muted"
                        )}>
                          {page.sectionTitle}
                        </p>
                        <p className="text-xs font-bold leading-tight">{page.partTitle}</p>
                      </div>
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

