# 函数题库渲染器

这是一个本地 React 题库渲染引擎。题目数据和页面组件分开维护，后续可以把几百、几千道题追加到 `src/data/questionBank.js`，渲染层会按 `blocks` 自动展示题干、公式、选项和题图。

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5173/
```

生产构建：

```bash
npm run build
```

## 题库数据入口

当前入口：

```text
src/data/questionBank.js
```

原始批次文件放在：

```text
src/data/raw/
```

当前已接入：

```text
src/data/raw/01-pdf-batch1.json
src/data/raw/02-schema-batch.json
src/data/raw/03-schema-1.2-complete.json
src/data/raw/ch1-1.3-question-bank.json
src/data/raw/ch1-1.4-question-bank.json
src/data/raw/ch1-1.5-question-bank.json
src/data/raw/ch1-review-p26-p27-question-bank.json
src/data/raw/ch1-advanced-p28-p29-question-bank.json
```

旧 OCR 批次通过 `src/data/rawQuestionAdapter.js` 转换；新的 `edu-question-bank/v1` 批次通过 `src/data/schemaQuestionAdapter.js` 转换。后续新增批次时，优先保持原始 JSON 不改动，然后在 `src/data/questionBank.js` 中 import 并合并。

给上游 JSON 输出 agent 的推荐规范见：

```text
docs/json-output-requirements.md
```

转换后的顶层结构：

```js
export const questionBank = {
  title: "函数题库",
  subtitle: "3.1.1 函数的概念",
  pages: [
    {
      id: "p51",
      chapterTitle: "第一章 集合与常用逻辑用语",
      sectionTitle: "1.1 集合的概念",
      partTitle: "能力提升练",
      title: "能力提升练",
      questions: [
        {
          id: "p51-q1",
          no: "1",
          group: "题组一：函数的概念",
          title: "实际情境中的函数判断",
          source: "2025 江西南昌第二中学月考",
          tags: ["实际情境", "函数定义", "唯一对应"],
          blocks: [],
        },
      ],
    },
  ],
};
```

## 内容块格式

### 段落

```js
{
  type: "paragraph",
  content: [
    "下图是由两个高为 ",
    { var: "H" },
    " 的圆锥构成的玻璃容器。",
    { strong: "不能" },
  ],
}
```

### 公式盒

```js
{
  type: "math",
  content: ["A = { x | 0 ≤ x ≤ 4 }， B = { y | 0 ≤ y ≤ 2 }"],
}
```

### 选项

```js
{
  type: "options",
  options: [
    { label: "A", content: [{ var: "h" }, " 是 ", { var: "d" }, " 的函数"] },
    { label: "B", content: ["f: x ↦ y = 1/3 x"] },
  ],
}
```

### 作答区

```js
{ type: "answer-space", variant: "fill-in" }
{ type: "answer-space", variant: "short-answer" }
```

### OCR 备注 / 警示

```js
{
  type: "notice",
  content: ["A 选项左侧集合表达较密，建议复核原图。"],
}
```

```js
{
  type: "warning",
  content: ["当前题目跨页或正文缺失，暂作为待补全题目入库。"],
}
```

### 题图

```js
{
  type: "diagram",
  name: "cone-container",
}
```

题图组件注册在：

```text
src/components/QuestionBlocks.jsx
```

如果后续有新的专用题图，比如函数图像、几何图形、表格型题图，可以新增组件后加入 `diagramRegistry`。

## 当前支持的内联片段

```js
"普通文本"
{ var: "x" }
{ strong: "重点文字" }
{ math: "y = f(x)" }
```

## 数学公式渲染

公式由 KaTeX 渲染，支持两种来源：

```text
$x^2-5x-6=0$
\(x \in A\)
\[A=\{x\mid 0\le x\le 4\}\]
```

同时，适配器会自动识别 OCR 文本中常见的裸公式片段，例如：

```text
x^2=1
√3∈Q
A={x|2x-a<0}
{1,2,3}
```

后面如果需要矩阵、坐标系、可交互图像，可以继续扩展 `src/components/RichText.jsx` 和 `src/components/QuestionBlocks.jsx`。
