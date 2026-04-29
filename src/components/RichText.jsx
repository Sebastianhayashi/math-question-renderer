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
