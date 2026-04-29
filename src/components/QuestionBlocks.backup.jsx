import { AlertTriangle, FilePenLine, Info, ChevronDown } from "lucide-react";
import { useState } from "react";
import { ConeContainerDiagram } from "./ConeContainerDiagram.jsx";
import { RichText } from "./RichText.jsx";
import { cx } from "../lib/cx.js";

const diagramRegistry = {
  "cone-container": ConeContainerDiagram,
};

function MathBox({ content }) {
  return (
    <div className="my-8 rounded-md bg-background p-8 text-center text-2xl font-bold text-primary shadow-inner">
      <RichText content={content} />
    </div>
  );
}

function QuestionParagraph({ content }) {
  return (
    <div className="py-2">
      <p className="font-body text-xl font-bold leading-relaxed text-text-main">
        <RichText content={content} />
      </p>
    </div>
  );
}

function Option({ label, content }) {
  const [status, setStatus] = useState("idle"); // idle, selected, success

  const handleClick = () => {
    if (status === "idle") {
      setStatus("selected");
      setTimeout(() => setStatus("success"), 600);
    } else {
      setStatus("idle");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="node-button group relative flex w-full items-center gap-4 rounded-xl px-5 py-4 text-left outline-none transition-all border"
      style={{
        minHeight: 72,
        background: status === "idle" ? "#fff"
          : status === "selected" ? "rgba(46,103,248,0.06)"
          : "var(--color-success)",
        border: status === "idle" ? "1.5px solid rgba(203,213,225,0.6)"
          : status === "selected" ? "1.5px solid rgba(46,103,248,0.4)"
          : "1.5px solid transparent",
        boxShadow: status === "idle"
          ? "0 3px 0 rgba(203,213,225,0.9), 0 4px 12px rgba(0,0,0,0.04)"
          : status === "selected" ? "none"
          : "var(--shadow-3d-success)",
        transform: status === "selected" ? "translateY(2px)" : "translateY(0)",
      }}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold transition-colors"
        style={{
          background: status === "idle" ? "var(--color-background)"
            : status === "selected" ? "var(--color-primary)"
            : "rgba(255,255,255,0.25)",
          color: status === "idle" ? "var(--color-muted)"
            : "#fff",
        }}
      >
        {label}
      </div>
      <span
        className="font-body text-base font-semibold leading-snug transition-colors"
        style={{
          color: status === "idle" ? "var(--color-text-main)"
            : status === "selected" ? "var(--color-primary)"
            : "#fff",
        }}
      >
        <RichText content={content} />
      </span>
    </button>
  );
}

function OptionsBlock({ options }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {options.map((option) => (
        <Option key={option.label} {...option} />
      ))}
    </div>
  );
}

function DiagramBlock({ name }) {
  const Diagram = diagramRegistry[name];

  if (!Diagram) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="font-bold">未注册题图：{name}</p>
      </div>
    );
  }

  return <Diagram />;
}

function AnswerSpace({ variant }) {
  const rows = variant === "short-answer" ? 6 : 1;

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 shadow-float transition-colors focus-within:border-primary">
      <div className="mb-4 flex items-center gap-3 font-bold text-muted">
        <span className="material-symbols-outlined text-[20px]">edit_square</span>
        <span className="text-xs uppercase tracking-widest">{variant === "short-answer" ? "Solution Draft" : "Fill the Void"}</span>
      </div>
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-10 border-b-2 border-slate-100" />
        ))}
      </div>
    </div>
  );
}

function NoticeBlock({ content, tone = "info" }) {
  const isWarning = tone === "warning";
  const icon = isWarning ? "warning" : "info";

  return (
    <div
      className={cx(
        "flex items-start gap-5 rounded-xl border border-slate-100 p-8 shadow-float",
        isWarning ? "bg-amber-50/50" : "bg-blue-50/50"
      )}
    >
      <div className={cx(
        "flex size-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg",
        isWarning ? "bg-amber-500" : "bg-primary"
      )}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="grid gap-2 text-lg font-bold leading-relaxed text-text-main">
        {content.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}

function MarkdownText({ value }) {
  if (!value) return null;
  const text = Array.isArray(value) ? value.join("、") : String(value);

  return (
    <div className="grid gap-4">
      {text.split(/\n{2,}/).map((paragraph) => (
        <p key={paragraph} className="whitespace-pre-line leading-relaxed">
          <RichText content={[paragraph]} />
        </p>
      ))}
    </div>
  );
}

function SolutionBlock({ answer, analysis, solution }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-12 flex flex-col items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cx(
          "node-button group flex items-center gap-3 rounded-full px-10 py-4 font-bold uppercase tracking-wider transition-all",
          isOpen 
            ? "bg-slate-200 text-muted translate-y-1.5 shadow-none" 
            : "bg-surface text-primary shadow-3d-node hover:bg-slate-50 active:bg-slate-100"
        )}
      >
        <span className="material-symbols-outlined">{isOpen ? "visibility_off" : "visibility"}</span>
        <span>{isOpen ? "Hide Intel" : "Reveal Intel"}</span>
      </button>

      {isOpen && (
        <div className="mt-12 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {answer ? (
            <section className="rounded-xl border-2 border-success/30 bg-success/5 p-10 shadow-float">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-success">
                Confirmed Answer
              </p>
              <div className="text-2xl font-bold text-text-main">
                <MarkdownText value={answer} />
              </div>
            </section>
          ) : null}
          
          {(analysis || solution) && (
            <section className="rounded-xl bg-surface p-10 shadow-float">
              <p className="mb-6 text-xs font-bold uppercase tracking-widest text-muted">
                Tactical Breakdown
              </p>
              <div className="space-y-6 text-lg font-bold leading-relaxed text-muted">
                {analysis && <MarkdownText value={analysis} />}
                {solution && <MarkdownText value={solution} />}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export function QuestionBlocks({ blocks }) {
  return (
    <div className="grid gap-5">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") return <QuestionParagraph key={index} content={block.content} />;
        if (block.type === "math") return <MathBox key={index} content={block.content} />;
        if (block.type === "options") return <OptionsBlock key={index} options={block.options} />;
        if (block.type === "diagram") return <DiagramBlock key={index} name={block.name} />;
        if (block.type === "answer-space") return <AnswerSpace key={index} variant={block.variant} />;
        if (block.type === "notice") return <NoticeBlock key={index} content={block.content} />;
        if (block.type === "warning") return <NoticeBlock key={index} content={block.content} tone="warning" />;
        if (block.type === "solution") {
          return (
            <SolutionBlock
              key={index}
              answer={block.answer}
              analysis={block.analysis}
              solution={block.solution}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
