const TYPE_LABELS = {
  "single-choice": "单选题",
  "multiple-choice": "多选题",
  "fill-in": "填空题",
  "short-answer": "解答题",
  unknown: "待复核",
};

const STATUS_LABELS = {
  complete: "已完成",
  incomplete: "未补全",
  "needs-review": "待复核",
};

const CONFIDENCE_LABELS = {
  high: "OCR 高置信",
  medium: "OCR 中置信",
  low: "OCR 低置信",
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\\n(?![A-Za-z])/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toTextContent(value) {
  return [normalizeText(value)];
}

function extractSvgMarkup(code) {
  const match = String(code || "").match(/<svg[\s\S]*?<\/svg>/);

  if (!match) return "";

  return match[0]
    .replace(/\bstrokeWidth=/g, "stroke-width=")
    .replace(/\bfillOpacity=/g, "fill-opacity=")
    .replace(/\bfontSize=/g, "font-size=")
    .replace(/\bstrokeDasharray=/g, "stroke-dasharray=")
    .replace(/\bclassName=/g, "class=")
    .replace(/<svg\b(?![^>]*\brole=)/, '<svg role="img"')
    .replace(/<svg\b(?![^>]*\bfocusable=)/, '<svg focusable="false"')
    .replace(/<svg\b(?![^>]*\baria-hidden=)/, '<svg aria-hidden="true"');
}

function normalizeVisual(visual) {
  return {
    id: visual.id,
    kind: visual.kind,
    placement: visual.placement,
    status: visual.status,
    alt: visual.alt,
    svg: extractSvgMarkup(visual.renderCode?.code),
  };
}

function normalizeQuestionVisuals(question) {
  return (question.visuals || []).map(normalizeVisual);
}

function buildQuestionBlocks(question) {
  const visuals = normalizeQuestionVisuals(question);
  const stemVisuals = visuals.filter((visual) => !visual.placement?.startsWith("option:"));
  const blocks = [
    {
      type: "paragraph",
      content: toTextContent(question.stemMarkdown || "题干暂未识别。"),
    },
  ];

  for (const visual of stemVisuals) {
    blocks.push({
      type: "visual",
      visual,
    });
  }

  if (question.options?.length) {
    blocks.push({
      type: "options",
      options: question.options.map((option) => ({
        label: option.label,
        content: toTextContent(option.text),
        visuals: visuals.filter((visual) => visual.placement === `option:${option.label}`),
      })),
    });
  }

  if (question.type === "fill-in") {
    blocks.push({ type: "answer-space", variant: "fill-in" });
  }

  if (question.type === "short-answer") {
    blocks.push({ type: "answer-space", variant: "short-answer" });
  }

  if (question.status === "incomplete") {
    blocks.push({
      type: "warning",
      content: ["当前题目尚未补全。"],
    });
  }

  if (question.answer || question.analysisMarkdown || question.solutionMarkdown) {
    blocks.push({
      type: "solution",
      answer: typeof question.answer === "string" ? normalizeText(question.answer) : question.answer,
      analysis: normalizeText(question.analysisMarkdown),
      solution: normalizeText(question.solutionMarkdown),
    });
  }

  return blocks;
}

export function normalizeSchemaBank(bank) {
  return bank.chapters.flatMap((chapter) =>
    chapter.sections.flatMap((section) =>
      section.sets.map((set) => ({
        id: set.id,
        label: set.title,
        title: set.title,
        partTitle: set.title,
        chapter: `${chapter.title} / ${section.title}`,
        chapterTitle: chapter.title,
        sectionTitle: section.title,
        questions: set.questions.map((question) => {
          const typeLabel = TYPE_LABELS[question.type] || question.type;
          const statusLabel = STATUS_LABELS[question.status] || question.status;
          const confidenceLabel = CONFIDENCE_LABELS[question.ocr?.confidence] || "";
          const visuals = normalizeQuestionVisuals(question);

          return {
            id: question.id,
            no: question.no,
            group: question.group,
            title: question.title,
            source: question.source,
            tags: [...(question.tags || []), typeLabel, statusLabel, confidenceLabel].filter(Boolean),
            type: question.type,
            typeLabel,
            status: question.status,
            answer: typeof question.answer === "string" ? normalizeText(question.answer) : question.answer,
            analysisMarkdown: normalizeText(question.analysisMarkdown),
            solutionMarkdown: normalizeText(question.solutionMarkdown),
            confidence: question.ocr?.confidence,
            visuals,
            blocks: buildQuestionBlocks(question),
          };
        }),
      }))
    )
  );
}

export function mergePages(basePages, incomingPages) {
  const pages = basePages.map((page) => ({
    ...page,
    questions: [...page.questions],
  }));

  for (const incomingPage of incomingPages) {
    const page = pages.find(
      (item) =>
        item.chapterTitle === incomingPage.chapterTitle &&
        item.sectionTitle === incomingPage.sectionTitle &&
        item.partTitle === incomingPage.partTitle
    );

    if (!page) {
      pages.push(incomingPage);
      continue;
    }

    for (const incomingQuestion of incomingPage.questions) {
      const existingIndex = page.questions.findIndex((question) => question.no === incomingQuestion.no);

      if (existingIndex >= 0) {
        page.questions[existingIndex] = incomingQuestion;
      } else {
        page.questions.push(incomingQuestion);
      }
    }

    page.questions.sort((a, b) => Number(a.no) - Number(b.no));
  }

  return pages;
}
