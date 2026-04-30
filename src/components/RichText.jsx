import { Fragment } from "react";
import katex from "katex";
import { parseMathText } from "../lib/mathText.js";
import "katex/dist/katex.min.css";

export function Var({ children }) {
  return (
    <span className="mx-1 inline-flex min-w-8 items-center justify-center rounded-md bg-blue-50 px-2 py-1 font-black text-blue-700">
      {children}
    </span>
  );
}

function MathSpan({ latex, displayMode = false }) {
  const html = katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false,
  });

  return (
    <span
      className={displayMode ? "my-3 block overflow-x-auto" : "inline-block align-baseline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TextWithMath({ value }) {
  const normalizedValue = String(value || "").replace(/\\n(?![A-Za-z])/g, "\n");
  const parts = parseMathText(normalizedValue);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "math") {
          return <MathSpan key={index} latex={part.latex} displayMode={part.displayMode} />;
        }

        return (
          <Fragment key={index}>
            {part.value.split("\n").map((line, lineIndex, lines) => (
              <Fragment key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </>
  );
}

function InlineMarkdown({ value }) {
  const parts = parseMathText(String(value || ""));

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "math") {
          return <MathSpan key={index} latex={part.latex} displayMode={part.displayMode} />;
        }

        const textParts = part.value.split(/(\*\*[^*]+?\*\*|`[^`]+?`)/g).filter(Boolean);
        return (
          <Fragment key={index}>
            {textParts.map((textPart, textIndex) => {
              if (textPart.startsWith("**") && textPart.endsWith("**")) {
                return <strong key={textIndex}>{textPart.slice(2, -2)}</strong>;
              }
              if (textPart.startsWith("`") && textPart.endsWith("`")) {
                return (
                  <code key={textIndex} className="rounded-md bg-slate-100 px-1 py-0.5 text-[0.92em] font-bold text-slate-600">
                    {textPart.slice(1, -1)}
                  </code>
                );
              }
              return <Fragment key={textIndex}>{textPart}</Fragment>;
            })}
          </Fragment>
        );
      })}
    </>
  );
}

export function MarkdownRichText({ value }) {
  const lines = String(value || "").replace(/\\n(?![A-Za-z])/g, "\n").split("\n");
  const blocks = [];
  let listItems = [];

  function flushList() {
    if (!listItems.length) return;
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  }

  lines.forEach((line) => {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();
    blocks.push({ type: "line", value: line });
  });
  flushList();

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-0.5 pl-4">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineMarkdown value={item} />
                </li>
              ))}
            </ul>
          );
        }

        if (!block.value.trim()) {
          return <div key={index} className="h-2" />;
        }

        return (
          <div key={index}>
            <InlineMarkdown value={block.value} />
          </div>
        );
      })}
    </div>
  );
}

export function RichText({ content }) {
  return (
    <>
      {content.map((item, index) => {
        if (typeof item === "string") return <TextWithMath key={index} value={item} />;
        if (item.var) return <Var key={index}>{item.var}</Var>;
        if (item.strong) return <strong key={index}>{item.strong}</strong>;
        if (item.math) return <MathSpan key={index} latex={item.math} />;
        return null;
      })}
    </>
  );
}
