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

function normalizeMarkdownText(content) {
  return content.map((item) => (typeof item === "string" ? item : Object.values(item).join(""))).join("");
}

function parseMarkdownRows(lines) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
    );
}

function isTableSeparator(line) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function MarkdownTable({ lines }) {
  const rows = parseMarkdownRows(lines.filter((line) => !isTableSeparator(line)));
  const [head, ...body] = rows;

  if (!head?.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-inner">
      <table className="w-full border-collapse text-center text-sm font-bold sm:text-base">
        <thead className="bg-slate-50 text-muted">
          <tr>
            {head.map((cell, index) => (
              <th key={index} className="border-b border-slate-200 px-2 py-3 sm:px-4">
                <RichText content={[cell]} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-t border-slate-100 px-2 py-3 text-text-main sm:px-4">
                  <RichText content={[cell]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownContent({ content }) {
  const text = normalizeMarkdownText(content).replace(/\\n(?![A-Za-z])/g, "\n");
  const lines = text.split("\n");
  const blocks = [];
  let paragraph = [];
  let index = 0;

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join("\n").trim() });
    paragraph = [];
  }

  while (index < lines.length) {
    const line = lines[index];
    const nextLine = lines[index + 1];

    if (line.trim().startsWith("|") && nextLine && isTableSeparator(nextLine)) {
      flushParagraph();
      const tableLines = [line, nextLine];
      index += 2;

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }

      blocks.push({ type: "table", lines: tableLines });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();

  return (
    <div className="grid gap-5">
      {blocks.map((block, blockIndex) => {
        if (block.type === "table") return <MarkdownTable key={blockIndex} lines={block.lines} />;

        return (
          <p key={blockIndex} className="font-body text-xl font-bold leading-relaxed text-text-main">
            <RichText content={[block.text]} />
          </p>
        );
      })}
    </div>
  );
}

function QuestionParagraph({ content }) {
  return (
    <div className="py-2">
      <MarkdownContent content={content} />
    </div>
  );
}

function Option({ label, content, visuals = [], isSelected = false, onSelect }) {
  const textValue = content.map((item) => (typeof item === "string" ? item : Object.values(item).join(""))).join("");
  const isVisualLabelOnly = visuals.length > 0 && /^(?:见)?图[象像]\s*[A-Z]$/i.test(textValue.trim());

  const handleClick = () => {
    onSelect?.(label);
  };

  return (
    <div
      className="node-button group relative flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left outline-none transition-all"
      style={{
        minHeight: 72,
        background: isSelected ? "rgba(46,103,248,0.08)" : "#fff",
        border: isSelected ? "1.5px solid rgba(46,103,248,0.45)" : "1.5px solid rgba(203,213,225,0.6)",
        boxShadow: isSelected
          ? "0 3px 0 rgba(46,103,248,0.28), 0 8px 18px rgba(46,103,248,0.08)"
          : "0 3px 0 rgba(203,213,225,0.9), 0 4px 12px rgba(0,0,0,0.04)",
        transform: isSelected ? "translateY(1px)" : "translateY(0)",
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex size-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold transition-colors"
        style={{
          background: isSelected ? "var(--color-primary)" : "var(--color-background)",
          color: isSelected ? "#fff" : "var(--color-muted)",
        }}
        aria-label={`选择 ${label}`}
      >
        {label}
      </button>
      <div
        className="grid flex-1 select-text gap-3 font-body text-base font-semibold leading-snug transition-colors"
        style={{
          color: isSelected ? "var(--color-primary)" : "var(--color-text-main)",
        }}
      >
        {!isVisualLabelOnly ? (
          <div>
            <RichText content={content} />
          </div>
        ) : null}
        {visuals.length ? (
          <div className="grid gap-2">
            {visuals.map((visual) => (
              <VisualBlock key={visual.id} visual={visual} compact />
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleClick}
        className={cx(
          "hidden shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition-colors sm:block",
          isSelected ? "bg-primary text-white" : "bg-slate-50 text-slate-400 hover:bg-primary/10 hover:text-primary"
        )}
        aria-label={`切换选择 ${label}`}
      >
        {isSelected ? "已选" : "选择"}
      </button>
    </div>
  );
}

function OptionsBlock({ options, selectedAnswers = [], onSelectAnswer }) {
  return (
    <div className="grid gap-4">
      {selectedAnswers.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-[13px] font-black text-primary">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          已选择 {selectedAnswers.join("、")}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {options.map((option) => (
          <Option
            key={option.label}
            {...option}
            isSelected={selectedAnswers.includes(option.label)}
            onSelect={onSelectAnswer}
          />
        ))}
      </div>
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

function VisualBlock({ visual, compact = false }) {
  if (!visual?.svg) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="font-bold">题图待补：{visual?.alt || visual?.id || "未命名图形"}</p>
      </div>
    );
  }

  return (
    <figure
      className={cx(
        "question-visual flex justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-inner",
        compact ? "question-visual--compact p-3" : "my-4 p-5"
      )}
      aria-label={visual.alt}
      dangerouslySetInnerHTML={{ __html: visual.svg }}
    />
  );
}

function AnswerSpace({ variant, value = "", onChange }) {
  const rows = variant === "short-answer" ? 6 : 1;
  const isShortAnswer = variant === "short-answer";

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-6 shadow-float transition-colors focus-within:border-primary">
      <div className="mb-4 flex items-center gap-3 font-bold text-muted">
        <span className="material-symbols-outlined text-[20px]">edit_square</span>
        <span className="text-xs uppercase tracking-widest">{isShortAnswer ? "Solution Draft" : "Fill the Void"}</span>
      </div>
      {isShortAnswer ? (
        <textarea
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          rows={rows}
          placeholder="写下关键步骤或最终结果..."
          className="min-h-[190px] w-full resize-y rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-[15px] font-bold leading-relaxed text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-primary focus:bg-white"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder="输入答案..."
          className="h-13 w-full rounded-xl border border-slate-100 bg-slate-50/70 px-4 text-[17px] font-black text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-primary focus:bg-white"
        />
      )}
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

export function QuestionBlocks({
  blocks,
  selectedAnswers = [],
  onSelectAnswer,
  textAnswer = "",
  onTextAnswerChange,
}) {
  return (
    <div className="grid gap-5">
      {blocks.map((block, index) => {
        if (block.type === "paragraph") return <QuestionParagraph key={index} content={block.content} />;
        if (block.type === "math") return <MathBox key={index} content={block.content} />;
        if (block.type === "options") {
          return (
            <OptionsBlock
              key={index}
              options={block.options}
              selectedAnswers={selectedAnswers}
              onSelectAnswer={onSelectAnswer}
            />
          );
        }
        if (block.type === "diagram") return <DiagramBlock key={index} name={block.name} />;
        if (block.type === "visual") return <VisualBlock key={index} visual={block.visual} />;
        if (block.type === "answer-space") {
          return (
            <AnswerSpace
              key={index}
              variant={block.variant}
              value={textAnswer}
              onChange={onTextAnswerChange}
            />
          );
        }
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
