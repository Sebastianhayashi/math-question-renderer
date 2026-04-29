const DELIMITED_MATH = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
const MATHISH_RUN = /[A-Za-z0-9π√∈∉≤≥≠⊆⊂⊇⊃∪∩⊙∞{}()[\]|,+\-*/^=<>.]+/g;
const MATH_SIGNAL = /[=<>^/{}|∈∉≤≥≠⊆⊂⊇⊃∪∩⊙√π]|(?:\d+,\d+)/;

function stripDelimiters(value) {
  if (value.startsWith("$$") && value.endsWith("$$")) {
    return { latex: value.slice(2, -2), displayMode: true };
  }

  if (value.startsWith("$") && value.endsWith("$")) {
    return { latex: value.slice(1, -1), displayMode: false };
  }

  if (value.startsWith("\\(") && value.endsWith("\\)")) {
    return { latex: value.slice(2, -2), displayMode: false };
  }

  if (value.startsWith("\\[") && value.endsWith("\\]")) {
    return { latex: value.slice(2, -2), displayMode: true };
  }

  return { latex: value, displayMode: false };
}

function escapeAutoMathBraces(value) {
  return value.replace(/(?<!\\)\{/g, "\\{").replace(/(?<!\\)\}/g, "\\}");
}

function groupLongSuperscripts(value) {
  return value.replace(/\^(-?\d{2,})/g, "^{$1}");
}

function normalizeAutoLatex(value) {
  return groupLongSuperscripts(escapeAutoMathBraces(value))
    .replace(/√\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/√([A-Za-z0-9]+)/g, "\\sqrt{$1}")
    .replace(/π/g, "\\pi ")
    .replace(/∈/g, "\\in ")
    .replace(/∉/g, "\\notin ")
    .replace(/≤/g, "\\le ")
    .replace(/≥/g, "\\ge ")
    .replace(/≠/g, "\\ne ")
    .replace(/⊆/g, "\\subseteq ")
    .replace(/⊂/g, "\\subset ")
    .replace(/⊇/g, "\\supseteq ")
    .replace(/⊃/g, "\\supset ")
    .replace(/∪/g, "\\cup ")
    .replace(/∩/g, "\\cap ")
    .replace(/⊙/g, "\\odot ")
    .replace(/∞/g, "\\infty ")
    .replace(/△/g, "\\triangle ");
}

function isAutoMathCandidate(value) {
  return value.length > 1 && MATH_SIGNAL.test(value);
}

function splitPlainText(value) {
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(MATHISH_RUN)) {
    const text = match[0];
    const index = match.index || 0;

    if (index > lastIndex) {
      parts.push({ type: "text", value: value.slice(lastIndex, index) });
    }

    if (isAutoMathCandidate(text)) {
      parts.push({ type: "math", latex: normalizeAutoLatex(text), displayMode: false });
    } else {
      parts.push({ type: "text", value: text });
    }

    lastIndex = index + text.length;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", value: value.slice(lastIndex) });
  }

  return parts;
}

export function parseMathText(value) {
  const parts = [];
  let lastIndex = 0;

  for (const match of value.matchAll(DELIMITED_MATH)) {
    const text = match[0];
    const index = match.index || 0;

    if (index > lastIndex) {
      parts.push(...splitPlainText(value.slice(lastIndex, index)));
    }

    parts.push({ type: "math", ...stripDelimiters(text) });
    lastIndex = index + text.length;
  }

  if (lastIndex < value.length) {
    parts.push(...splitPlainText(value.slice(lastIndex)));
  }

  return parts;
}
