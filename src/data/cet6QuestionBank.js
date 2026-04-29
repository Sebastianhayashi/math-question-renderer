import rawBank from "./raw/2013-06-cet6-question-bank.json";
import { normalizeSchemaBank } from "./schemaQuestionAdapter.js";

// Find a raw question by id for attaching English-specific extra fields.
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

// Attach materialMarkdown and blankContextMarkdown from the raw JSON
// onto each question after the standard schema adapter runs.
function attachCet6Fields(pages) {
  return pages.map((page) => ({
    ...page,
    questions: page.questions.map((question) => {
      const rawQ = findRawQuestion(rawBank, question.id);
      return {
        ...question,
        materialMarkdown: rawQ?.materialMarkdown ?? null,
        blankContextMarkdown: rawQ?.blankContextMarkdown ?? null,
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
