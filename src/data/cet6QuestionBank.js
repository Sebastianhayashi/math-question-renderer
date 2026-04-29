import rawBank from "./raw/2013-06-cet6-question-bank.json";
import { normalizeSchemaBank } from "./schemaQuestionAdapter.js";

function normalizeText(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Find a raw question by id for attaching English-specific fields that the
// generic math-oriented adapter does not expose.
function findRawQuestion(bank, id) {
  for (const chapter of bank.chapters) {
    for (const section of chapter.sections) {
      for (const set of section.sets) {
        const q = set.questions.find((question) => question.id === id);
        if (q) return q;
      }
    }
  }
  return null;
}

function normalizeOptions(options = []) {
  return options
    .map((option) => ({
      label: option.label,
      text: normalizeText(option.text),
    }))
    .filter((option) => option.label);
}

// Attach CET-6 fields from the raw JSON onto each question after the standard
// schema adapter runs.
function attachCet6Fields(pages) {
  return pages.map((page) => ({
    ...page,
    questions: page.questions.map((question) => {
      const rawQ = findRawQuestion(rawBank, question.id);
      return {
        ...question,
        stemMarkdown: normalizeText(rawQ?.stemMarkdown),
        options: normalizeOptions(rawQ?.options),
        materialMarkdown: normalizeText(rawQ?.materialMarkdown) || null,
        blankContextMarkdown: normalizeText(rawQ?.blankContextMarkdown) || null,
        ocrNotes: rawQ?.ocr?.notes || "",
      };
    }),
  }));
}

const rawPages = normalizeSchemaBank(rawBank);
const pages = attachCet6Fields(rawPages);

export const cet6QuestionBank = {
  subject: "english",
  title: rawBank.book.title,
  subtitle: "大学英语六级真题",
  pages,
};
