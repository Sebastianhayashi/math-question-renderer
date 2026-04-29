const TYPE_LABELS = {
  "single-choice": "单选题",
  "multiple-choice": "多选题",
  "fill-in": "填空题",
  "short-answer": "解答题",
  unknown: "未补全",
};

const CONFIDENCE_LABELS = {
  high: "OCR 高置信",
  medium: "OCR 中置信",
  low: "OCR 低置信",
};

function splitOption(option, index) {
  const match = option.match(/^([A-Z])\.\s*(.*)$/);

  if (!match) {
    return {
      label: String.fromCharCode(65 + index),
      content: [option],
    };
  }

  return {
    label: match[1],
    content: [match[2]],
  };
}

function splitChapter(chapter = "") {
  const parts = chapter.split("/").map((item) => item.trim()).filter(Boolean);

  return {
    chapterTitle: parts[0] || "",
    sectionTitle: parts[1] || parts[0] || "",
  };
}

function buildQuestionBlocks(rawQuestion) {
  const blocks = [
    {
      type: "paragraph",
      content: [rawQuestion.stem || "题干暂未识别。"],
    },
  ];

  if (rawQuestion.options?.length) {
    blocks.push({
      type: "options",
      options: rawQuestion.options.map(splitOption),
    });
  }

  if (rawQuestion.type === "fill-in") {
    blocks.push({ type: "answer-space", variant: "fill-in" });
  }

  if (rawQuestion.type === "short-answer") {
    blocks.push({ type: "answer-space", variant: "short-answer" });
  }

  if (rawQuestion.type === "unknown") {
    blocks.push({
      type: "warning",
      content: ["当前题目跨页或正文缺失，暂作为待补全题目入库。"],
    });
  }

  return blocks;
}

export function normalizeQuestionPages(batch) {
  return batch.questionPages.map((page) => {
    const { chapterTitle, sectionTitle } = splitChapter(page.chapter);

    return {
      id: page.id,
      label: page.title,
      title: page.title,
      partTitle: page.title,
      chapter: page.chapter,
      chapterTitle,
      sectionTitle,
      questions: page.questions.map((question) => {
      const typeLabel = TYPE_LABELS[question.type] || question.type;
      const confidenceLabel = CONFIDENCE_LABELS[question.confidence] || "";

      return {
        id: question.id,
        no: question.no,
        group: question.group,
        title: question.title,
        source: question.source,
        tags: [...(question.tags || []), typeLabel, confidenceLabel].filter(Boolean),
        type: question.type,
        typeLabel,
        confidence: question.confidence,
        confidenceNotes: question.confidenceNotes,
        notes: question.notes,
        blocks: buildQuestionBlocks(question),
      };
      }),
    };
  });
}
