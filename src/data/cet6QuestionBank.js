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

const CHAPTER_RANK = {
  第一套: 1,
  第二套: 2,
  第三套: 3,
};

function getChapterRank(title = "") {
  return CHAPTER_RANK[title] || 99;
}

function getSectionRank(title = "") {
  if (/Writing|写作/.test(title)) return 1;
  if (/Listening|听力/.test(title)) return 2;
  if (/Reading|阅读/.test(title)) return 3;
  if (/Translation|翻译/.test(title)) return 4;
  return 99;
}

function getPartRank(title = "") {
  if (/写作|Writing/.test(title)) return 1;
  if (/Section A|短对话|长对话|选词填空/.test(title)) return 2;
  if (/Section B|短文听力|长篇阅读/.test(title)) return 3;
  if (/Section C|听写|仔细阅读 Passage One/.test(title)) return 4;
  if (/Passage Two/.test(title)) return 5;
  if (/翻译|Translation/.test(title)) return 6;
  return 99;
}

function sortCet6Pages(pages) {
  return [...pages].sort((a, b) => {
    const chapterDiff = getChapterRank(a.chapterTitle) - getChapterRank(b.chapterTitle);
    if (chapterDiff) return chapterDiff;

    const sectionDiff = getSectionRank(a.sectionTitle) - getSectionRank(b.sectionTitle);
    if (sectionDiff) return sectionDiff;

    const partDiff = getPartRank(a.partTitle || a.title) - getPartRank(b.partTitle || b.title);
    if (partDiff) return partDiff;

    return String(a.id).localeCompare(String(b.id));
  });
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
const pages = sortCet6Pages(attachCet6Fields(rawPages));

export const cet6QuestionBank = {
  subject: "english",
  title: rawBank.book.title,
  subtitle: "大学英语六级真题",
  pages,
};
