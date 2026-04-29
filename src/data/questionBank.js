import pdfBatch1 from "./raw/01-pdf-batch1.json";
import schemaBatch from "./raw/02-schema-batch.json";
import schemaBatch12 from "./raw/03-schema-1.2-complete.json";
import ch13Bank from "./raw/ch1-1.3-question-bank.json";
import ch14Bank from "./raw/ch1-1.4-question-bank.json";
import ch15Bank from "./raw/ch1-1.5-question-bank.json";
import ch1ReviewBank from "./raw/ch1-review-p26-p27-question-bank.json";
import ch1AdvancedBank from "./raw/ch1-advanced-p28-p29-question-bank.json";
import ch22Bank from "./raw/ch2-2.2-p32-p33-question-bank.json";
import ch22Batch3436 from "./raw/2.2-batch-34-36.json";
import ch22Batch3738 from "./raw/2.2-batch-37-38.json";
import ch22Batch39 from "./raw/2.2-batch-39.json";
import ch23Batch4041 from "./raw/2.3-batch-40-41.json";
import ch23Batch4243 from "./raw/2.3-batch-42-43.json";
import ch23Batch44 from "./raw/2.3-batch-44.json";
import ch2ReviewBank from "./raw/ch2-review-batch-45-46.json";
import ch2AdvancedBank from "./raw/ch2-batch-47-49.json";
import ch311Bank from "./raw/ch3-3.1.1-batch-50-51-v2.json";
import ch312Bank from "./raw/ch3-3.1.2-question-bank.json";
import ch313Bank from "./raw/ch3-3.1.3-batch-55.json";
import { normalizeQuestionPages } from "./rawQuestionAdapter.js";
import { mergePages, normalizeSchemaBank } from "./schemaQuestionAdapter.js";

const basePages = normalizeQuestionPages(pdfBatch1);
const legacySchemaPages = schemaBatch
  .flatMap(normalizeSchemaBank)
  .filter((page) => page.sectionTitle !== "1.2 集合间的基本关系");
const schemaPages = [
  ...legacySchemaPages,
  ...normalizeSchemaBank(schemaBatch12),
  ...normalizeSchemaBank(ch13Bank),
  ...normalizeSchemaBank(ch14Bank),
  ...normalizeSchemaBank(ch15Bank),
  ...normalizeSchemaBank(ch1ReviewBank),
  ...normalizeSchemaBank(ch1AdvancedBank),
  ...normalizeSchemaBank(ch22Bank),
  ...normalizeSchemaBank(ch22Batch3436),
  ...normalizeSchemaBank(ch22Batch3738),
  ...normalizeSchemaBank(ch22Batch39),
  ...normalizeSchemaBank(ch23Batch4041),
  ...normalizeSchemaBank(ch23Batch4243),
  ...normalizeSchemaBank(ch23Batch44),
  ...normalizeSchemaBank(ch2ReviewBank),
  ...normalizeSchemaBank(ch2AdvancedBank),
  ...normalizeSchemaBank(ch311Bank),
  ...normalizeSchemaBank(ch312Bank),
  ...normalizeSchemaBank(ch313Bank),
];
const pages = mergePages(basePages, schemaPages);

export const questionBank = {
  title: "数学题库",
  subtitle: pages[0]?.sectionTitle || "题库渲染引擎",
  pages,
};
