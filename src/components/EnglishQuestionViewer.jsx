import { useState } from "react";
import { RichText } from "./RichText.jsx";
import { cx } from "../lib/cx.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeText(value) {
  if (!value) return "";
  return String(value)
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const STATUS_BADGE = {
  complete: { label: "完整", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  incomplete: { label: "待补全", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  "needs-review": { label: "待复核", color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

const TYPE_LABEL = {
  "single-choice": "单选",
  "multiple-choice": "多选",
  "fill-in": "填空",
  "short-answer": "简答",
  unknown: "待定",
};

// ─── Passage / Material block ────────────────────────────────────────────────

function PassageBlock({ text, label = "Passage" }) {
  const [expanded, setExpanded] = useState(false);
  const normalized = normalizeText(text);
  const paragraphs = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const PREVIEW_LINES = 6;
  const PREVIEW_CHARS = 980;
  const isLongSingleBlock = paragraphs.length <= 2 && normalized.length > PREVIEW_CHARS;
  const needsToggle = paragraphs.length > PREVIEW_LINES || isLongSingleBlock;
  const displayed =
    !expanded && needsToggle
      ? isLongSingleBlock
        ? [`${normalized.slice(0, PREVIEW_CHARS).trim()}...`]
        : paragraphs.slice(0, PREVIEW_LINES)
      : paragraphs;

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-inner">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid size-6 place-items-center rounded-lg text-white"
          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
            <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-9ZM4 5a.5.5 0 0 0 0 1h8a.5.5 0 0 0 0-1H4Zm0 2.5a.5.5 0 0 0 0 1h8a.5.5 0 0 0 0-1H4Zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1H4Z" />
          </svg>
        </span>
        <span className="text-[11px] font-black uppercase tracking-widest text-blue-700">
          {label}
        </span>
      </div>
      <div className="space-y-2">
        {displayed.map((line, i) => (
          <p key={i} className="font-body text-[14px] leading-relaxed text-slate-700">
            <RichText content={[line]} />
          </p>
        ))}
      </div>
      {needsToggle && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-[12px] font-black text-blue-600 transition-opacity hover:opacity-70"
        >
          <span className="material-symbols-outlined text-[15px]">
            {expanded ? "unfold_less" : "unfold_more"}
          </span>
          {expanded ? "收起原文" : "展开全文"}
        </button>
      )}
    </div>
  );
}

// ─── Blank context highlight ──────────────────────────────────────────────────

function BlankContextBlock({ text }) {
  if (!text) return null;
  const normalized = normalizeText(text);
  const parts = normalized.split(/(___\d+___)/);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-bold leading-relaxed text-slate-600">
      <span className="mr-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        上下文
      </span>
      {parts.map((part, i) =>
        /^___\d+___$/.test(part) ? (
          <span
            key={i}
            className="mx-1 inline-block rounded-md bg-amber-200/80 px-2 py-0.5 font-black text-amber-800 ring-1 ring-amber-300"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

// ─── Word bank options (Section A: A–O word list) ────────────────────────────

function SelectionSummary({ selectedAnswers }) {
  if (!selectedAnswers?.length) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-[13px] font-black text-blue-700">
      <span className="material-symbols-outlined text-[18px]">check_circle</span>
      已选择 {selectedAnswers.join("、")}
    </div>
  );
}

function TextAnswerBox({ value = "", onChange, variant = "short", title = "我的答案" }) {
  const isLong = variant === "long";

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <span className="material-symbols-outlined text-[18px]">
              {isLong ? "edit_note" : "stylus_note"}
            </span>
          </span>
          <div>
            <p className="text-[13px] font-black text-slate-800">{title}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              自动保留
            </p>
          </div>
        </div>
        {value?.trim() && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600">
            已记录
          </span>
        )}
      </div>
      {isLong ? (
        <textarea
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          rows={7}
          placeholder="在这里写提纲、译文或完整答案..."
          className="min-h-[168px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold leading-relaxed text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder="填写这一空的答案..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[15px] font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
        />
      )}
    </div>
  );
}

function OptionBank({
  options,
  label = "Word Bank",
  compact = false,
  selectedAnswers = [],
  onSelectAnswer,
}) {
  if (!options?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <span className="text-[10px] font-black text-blue-500">点击保留选择</span>
      </div>
      <div className={cx("gap-2", compact ? "grid sm:grid-cols-2" : "flex flex-wrap")}>
        {options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onSelectAnswer?.(opt.label)}
            className={cx(
              "inline-flex gap-1.5 rounded-lg border px-3 py-1.5 text-left text-[13px] font-bold transition-all",
              compact ? "items-start" : "items-center",
              selectedAnswers.includes(opt.label)
                ? "border-blue-300 bg-blue-50 text-blue-800 shadow-sm"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
            )}
          >
            <span
              className={cx(
                "min-w-[14px] text-[11px] font-black",
                selectedAnswers.includes(opt.label) ? "text-blue-600" : "text-slate-400"
              )}
            >
              {opt.label}.
            </span>
            <span className={compact ? "line-clamp-3 leading-relaxed" : ""}>{opt.text || "待补录"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LetterPicker({ options, selectedAnswers = [], onSelectAnswer }) {
  if (!options?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          选择匹配段落
        </p>
        <span className="text-[10px] font-black text-blue-500">只保留段落字母</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {options.map((opt) => {
          const isSelected = selectedAnswers.includes(opt.label);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSelectAnswer?.(opt.label)}
              title={opt.text || opt.label}
              className={cx(
                "grid h-11 place-items-center rounded-xl border text-[14px] font-black transition-all",
                isSelected
                  ? "border-blue-300 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Choice options (single / multiple choice) ────────────────────────────────

function ChoiceOption({ label, text, isSelected = false, onSelect }) {
  return (
    <button
      onClick={() => onSelect?.(label)}
      className={cx(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14px] font-bold transition-all",
        isSelected
          ? "border-blue-300 bg-blue-50 text-blue-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40"
      )}
    >
      <span
        className={cx(
          "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-black transition-colors",
          isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
        )}
      >
        {label}
      </span>
      <RichText content={[text]} />
    </button>
  );
}

function ChoiceBlock({ options, selectedAnswers = [], onSelectAnswer }) {
  const normalizedOptions = options.filter((option) => option.text?.trim());

  if (normalizedOptions.length < options.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-[13px] font-bold leading-relaxed text-amber-800">
          当前选项文本还没有完全拆开，先保留题面与原文；建议后续补录原始 A-D 选项。
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {normalizedOptions.map((opt) => (
        <ChoiceOption
          key={opt.label}
          label={opt.label}
          text={opt.text}
          isSelected={selectedAnswers.includes(opt.label)}
          onSelect={onSelectAnswer}
        />
      ))}
    </div>
  );
}

// ─── Answer + Solution reveal ─────────────────────────────────────────────────

function SolutionReveal({ answer, analysis, solution }) {
  const [open, setOpen] = useState(false);
  const hasContent = answer || analysis || solution;
  if (!hasContent) return null;

  return (
    <div className="mt-8 flex flex-col items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex items-center gap-2 rounded-full px-8 py-3 text-[13px] font-black uppercase tracking-wider transition-all",
          open
            ? "bg-slate-200 text-slate-500 translate-y-1 shadow-none"
            : "bg-white text-blue-700 shadow-[0_4px_0_rgba(203,213,225,0.9),0_4px_16px_rgba(0,0,0,0.06)] hover:bg-blue-50"
        )}
      >
        <span className="material-symbols-outlined text-[18px]">
          {open ? "visibility_off" : "visibility"}
        </span>
        {open ? "Hide Answer" : "Reveal Answer"}
      </button>

      {open && (
        <div className="mt-8 w-full space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {answer && (
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-green-700">
                Answer
              </p>
              <p className="text-[18px] font-black text-green-800">
                {Array.isArray(answer) ? answer.join("、") : answer}
              </p>
            </div>
          )}
          {(analysis || solution) && (
            <div className="rounded-xl bg-slate-50 p-5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Analysis
              </p>
              <div className="space-y-3 text-[14px] font-bold leading-relaxed text-slate-600">
                {analysis && (
                  <p className="whitespace-pre-line">
                    <RichText content={[analysis]} />
                  </p>
                )}
                {solution && (
                  <p className="whitespace-pre-line">
                    <RichText content={[solution]} />
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stem ─────────────────────────────────────────────────────────────────────

const LISTENING_PLACEHOLDER =
  "根据录音内容作答。当前文档未能稳定拆出该题的完整听力题面与选项，需结合音频、原题扫描页或更稳定文本再补录。";

function StemBlock({ text, fallback }) {
  const content = normalizeText(text) || normalizeText(fallback);
  if (!content || content === LISTENING_PLACEHOLDER) return null;
  return (
    <p className="text-[17px] font-bold leading-relaxed text-slate-800">
      <RichText content={[content]} />
    </p>
  );
}

function TaskCard({ question }) {
  const isTranslation = /翻译|Translation/i.test(question.group || question.title || "");
  if (!question.stemMarkdown || question.materialMarkdown) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <span className="material-symbols-outlined text-[18px]">{isTranslation ? "translate" : "edit"}</span>
        </span>
        <div>
          <p className="text-[12px] font-black text-slate-800">{isTranslation ? "Translation Task" : "Writing Task"}</p>
          <p className="text-[10px] font-bold text-slate-400">{question.source}</p>
        </div>
      </div>
      <p className="whitespace-pre-line text-[16px] font-bold leading-relaxed text-slate-800">
        <RichText content={[normalizeText(question.stemMarkdown)]} />
      </p>
    </div>
  );
}

// ─── Incomplete warning ───────────────────────────────────────────────────────

function IncompleteWarning() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-amber-600">
        warning
      </span>
      <p className="text-[13px] font-bold text-amber-800">
        该题为听力题，音频文本暂未补全，需结合音频资源使用。
      </p>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function EnglishQuestionViewer({
  question,
  selectedAnswers = [],
  onSelectAnswer,
  textAnswer = "",
  onTextAnswerChange,
}) {
  if (!question) return null;

  const status = STATUS_BADGE[question.status] || STATUS_BADGE.incomplete;
  const typeLabel = TYPE_LABEL[question.type] || question.type;
  const isMatching = /长篇阅读匹配/.test(question.group || "");
  const isWordBank = /选词填空|听写填空|复合式听写/.test(question.group || "") && question.options?.length >= 10;
  const isChoice = question.options?.length > 0 && !isWordBank && !isMatching;
  const isIncomplete = question.status === "incomplete";
  const isTask = question.type === "short-answer" && !question.materialMarkdown;
  const needsTextAnswer =
    !isIncomplete &&
    (isTask ||
      (question.type === "fill-in" && !question.options?.length) ||
      /Translation|翻译|Writing|写作/i.test(question.group || ""));
  const passageLabel = isMatching ? "Article" : /听写|Listening/i.test(question.group || "") ? "Script" : "Passage";

  return (
    <div className="grid gap-5">
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600">
          {typeLabel}
        </span>
        {question.tags?.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500"
          >
            {tag}
          </span>
        ))}
      </div>

      {isMatching && !isIncomplete && (
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
            当前题目
          </p>
          <StemBlock text={question.stemMarkdown} fallback={question.title} />
        </div>
      )}

      {isMatching && (
        <LetterPicker
          options={question.options}
          selectedAnswers={selectedAnswers}
          onSelectAnswer={onSelectAnswer}
        />
      )}

      {/* Passage */}
      {question.materialMarkdown && (
        <PassageBlock text={question.materialMarkdown} label={passageLabel} />
      )}

      {/* Stem or warning */}
      {isIncomplete ? (
        <IncompleteWarning />
      ) : isTask ? (
        <TaskCard question={question} />
      ) : !isMatching ? (
        <StemBlock text={question.stemMarkdown} fallback={question.title} />
      ) : null}

      {/* Blank context */}
      {question.blankContextMarkdown && !isIncomplete && (
        <BlankContextBlock text={question.blankContextMarkdown} />
      )}

      <SelectionSummary selectedAnswers={selectedAnswers} />

      {/* Word bank */}
      {isWordBank && (
        <OptionBank
          options={question.options}
          label="Word Bank"
          selectedAnswers={selectedAnswers}
          onSelectAnswer={onSelectAnswer}
        />
      )}

      {/* Choice options */}
      {isChoice && !isIncomplete && (
        <ChoiceBlock
          options={question.options}
          selectedAnswers={selectedAnswers}
          onSelectAnswer={onSelectAnswer}
        />
      )}

      {needsTextAnswer && (
        <TextAnswerBox
          value={textAnswer}
          onChange={onTextAnswerChange}
          variant={isTask || /Translation|翻译|Writing|写作/i.test(question.group || "") ? "long" : "short"}
          title={isTask || /Translation|翻译|Writing|写作/i.test(question.group || "") ? "我的草稿" : "我的答案"}
        />
      )}

      {/* Answer reveal */}
      {!isIncomplete && (
        <SolutionReveal
          answer={question.answer}
          analysis={question.analysisMarkdown}
          solution={question.solutionMarkdown}
        />
      )}
    </div>
  );
}
