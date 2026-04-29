# 给 JSON 输出 Agent 的要求

目标：输出可以直接进入题库渲染器的数据。不要围绕 PDF 页码组织数据，要围绕教材目录组织数据。

## 总原则

- 不要输出 PDF 页码作为展示字段。
- 不要输出 `pageLabel`、`sourceImage`、`sourceImageNote`、`PDF页xx整页原图`、`定位建议` 这类原题核对字段。
- 目录层级必须是：章 -> 节 -> 练习栏目 -> 题目。
- 数学公式必须尽量输出为 LaTeX markdown：行内 `$...$`，块级 `$$...$$`。
- 题目文本不要把选项混在题干里，选项必须单独放在 `options`。
- 选择题选项不要写成 `"A. xxx"` 字符串，必须拆成 `{ "label": "A", "text": "xxx" }`。
- 如果 OCR 不确定，不要把备注写进题干。使用 `ocr` 字段记录置信度和备注。
- 跨页题必须补全后再输出；无法补全时 `status` 设为 `"incomplete"`，并说明缺失原因。

## 推荐 JSON 结构

```json
{
  "schemaVersion": "edu-question-bank/v1",
  "book": {
    "subject": "数学",
    "title": "高中数学必修第一册"
  },
  "chapters": [
    {
      "id": "ch1",
      "title": "第一章 集合与常用逻辑用语",
      "sections": [
        {
          "id": "1.1",
          "title": "1.1 集合的概念",
          "sets": [
            {
              "id": "1.1-basic",
              "title": "基础过关",
              "questions": [
                {
                  "id": "1.1-basic-q1",
                  "no": "1",
                  "status": "complete",
                  "type": "single-choice",
                  "group": "题组一 集合的概念与元素的特性",
                  "title": "能构成集合的对象判断",
                  "source": "教材习题改编",
                  "tags": ["集合概念", "集合确定性"],
                  "stemMarkdown": "下面给出的四类对象中，能构成集合的是（ ）",
                  "options": [
                    { "label": "A", "text": "某班视力较好的同学" },
                    { "label": "B", "text": "某小区长寿的人" },
                    { "label": "C", "text": "$\\pi$ 的近似值" },
                    { "label": "D", "text": "方程 $x^2=1$ 的实数根" }
                  ],
                  "answer": null,
                  "analysisMarkdown": null,
                  "solutionMarkdown": null,
                  "ocr": {
                    "confidence": "high",
                    "notes": ""
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## 字段说明

`type` 只能使用：

```text
single-choice
multiple-choice
fill-in
short-answer
unknown
```

`status` 只能使用：

```text
complete
incomplete
needs-review
```

`ocr.confidence` 只能使用：

```text
high
medium
low
```

## 数学公式要求

正确：

```json
{
  "stemMarkdown": "若以方程 $x^2-5x-6=0$ 和 $x^2-x-2=0$ 的解为元素组成集合 $M$，则 $M$ 中元素的个数为（ ）"
}
```

不要这样：

```json
{
  "stem": "若以方程 x^2-5x-6=0 和 x^2-x-2=0 的解为元素组成集合 M，则 M 中元素的个数为（ ）"
}
```

常见符号映射：

```text
π -> \pi
√3 -> \sqrt{3}
∈ -> \in
∉ -> \notin
≤ -> \le
≥ -> \ge
≠ -> \ne
⊆ -> \subseteq
∪ -> \cup
∩ -> \cap
```

## 质量要求

- 每道题必须有稳定唯一的 `id`。
- `id` 不要包含 PDF 页码，推荐使用章节和题号，例如 `1.1-basic-q1`。
- `no` 保留教材里的题号。
- `group` 保留题组名称。
- `title` 用 8 到 20 个中文字符概括题型或考点。
- `tags` 控制在 2 到 5 个。
- 多小问解答题在 `stemMarkdown` 中用 `（1）`、`（2）`、`（3）` 保留结构。
- 不要输出截图位置、二维码说明、整页原图说明。

## 题图 / 图形输出要求

如果题目出现 Venn 图、阴影图、数轴、坐标系、电路图、表格、图 A/B/C/D 等，必须输出 `visuals` 数组。不要只写“图 A”。

```json
{
  "visuals": [
    {
      "id": "question-id-visual-1",
      "kind": "venn",
      "placement": "stem",
      "status": "complete",
      "alt": "二集合 Venn 阴影图",
      "diagramSpec": {},
      "renderCode": {
        "type": "react-svg",
        "componentName": "QuestionVisual",
        "code": "export function QuestionVisual(){ return <svg viewBox='0 0 220 140'>...</svg>; }"
      }
    }
  ]
}
```

`placement` 可用：

```text
stem
option:A
option:B
option:C
option:D
analysis
```

当前缺图返工清单见：

```text
docs/missing-visuals-for-ocr.md
```
