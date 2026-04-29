# 缺失题图返工清单

用途：发回给 OCR / 制图 agent，要求重新抓图并输出可由前端代码渲染的结构化图形。

当前原则：

- 不要返回整页截图。
- 不要只返回“图 A / 图 B”文字。
- 必须按题目输出 `visuals` 数组。
- 每个图形同时给出 `diagramSpec` 和可直接嵌入前端的 `renderCode`。
- 优先输出 SVG/React 组件代码；Venn 图、电路图、数轴、坐标系都应使用代码绘制。
- 如果图形无法可靠识别，必须标记 `status: "needs-recrop"` 并说明需要重新裁哪一块。

## A. 必须补代码渲染图的题

| 优先级 | 题目 id | 目录 | 当前问题 | 需要 OCR/制图 agent 输出 |
|---|---|---|---|---|
| P0 | `1.2-basic-q2` | `1.2 集合间的基本关系 / 基础过关 / 第 2 题` | 选项只有“图 A/B/C/D”，缺 4 个 Venn 选项图。 | 四个 Venn 图选项。每个选项需描述 $M,N$ 的包含/相交关系，标注集合名，并给出 `renderCode`。 |
| P0 | `1.3-basic-q5` | `1.3 集合的基本运算 / 基础过关 / 第 5 题` | 题干说 Venn 图阴影部分，但图未入库。 | 一个 Venn 阴影图。需明确全集 $U$、集合 $M,N$、阴影区域具体是哪一块。 |
| P0 | `1.3-advanced-q2` | `1.3 集合的基本运算 / 能力提升练 / 第 2 题` | 题干“如图所示”，缺 $U,A,B$ 的阴影 Venn 图。 | 一个二集合 Venn 阴影图。需明确阴影区域与选项表达式的对应关系。 |
| P0 | `1.4-basic-q11` | `1.4 充分条件与必要条件 / 基础过关 / 第 11 题` | 题干要求四个电路图，图中开关连接方式缺失。 | 四个电路图，序号 ①②③④。需标出开关 $S$、灯泡 $L$、电源、导线连接方式，并给出每个图的 `renderCode`。 |
| P0 | `ch1-review-methods-q1` | `本章复习提升 / 思想方法练 / 第 1 题` | 题干“图中阴影部分”，缺三集合 Venn 阴影图。 | 一个三集合 Venn 阴影图。需标明全集 $U$，集合 $A,B,C$，阴影区域。 |

## B. 不是题图渲染，但需要重新 OCR / 裁图补全文本

| 优先级 | 题目 id | 目录 | 当前问题 | 需要返回 |
|---|---|---|---|---|
| P1 | `ch1-review-mistakes-q5` | `本章复习提升 / 易混易错练 / 第 5 题` | 集合 $B$ 的定义式末尾切边，题干不完整。 | 重新 OCR 完整题干，尤其是集合 $B$ 的完整定义式。 |
| P1 | `ch1-gaokao-5y-q7` | `综合拔高练 / 五年高考考练 / 第 7 题` | 当前写着“图中后半段选项未可靠辨清”，选项缺失。 | 重新 OCR 完整题干和选项；如果原题确实有图，也需要补 `visuals`。 |

## 要求输出格式

在对应 question 对象内增加：

```json
{
  "visuals": [
    {
      "id": "1.2-basic-q2-option-A",
      "kind": "venn",
      "placement": "option:A",
      "status": "complete",
      "alt": "Venn 图选项 A",
      "diagramSpec": {
        "universe": "U",
        "sets": [
          { "id": "M", "label": "M" },
          { "id": "N", "label": "N" }
        ],
        "relations": ["N subset M"],
        "shaded": []
      },
      "renderCode": {
        "type": "react-svg",
        "componentName": "VennOptionA",
        "code": "export function VennOptionA(){ return <svg viewBox='0 0 220 140'>...</svg>; }"
      }
    }
  ]
}
```

## Venn 图 `diagramSpec` 建议

二集合：

```json
{
  "kind": "venn",
  "universe": "U",
  "sets": [
    { "id": "A", "label": "A" },
    { "id": "B", "label": "B" }
  ],
  "relations": ["overlap"],
  "shaded": ["A_minus_B"]
}
```

三集合：

```json
{
  "kind": "venn",
  "universe": "U",
  "sets": [
    { "id": "A", "label": "A" },
    { "id": "B", "label": "B" },
    { "id": "C", "label": "C" }
  ],
  "relations": ["overlap"],
  "shaded": ["A_intersect_B", "B_intersect_C"]
}
```

常用 `shaded` 枚举：

```text
A
B
C
A_intersect_B
A_intersect_C
B_intersect_C
A_intersect_B_intersect_C
A_union_B
A_minus_B
B_minus_A
complement_A
complement_B
complement_A_union_B
outside_all_sets
```

## 电路图 `diagramSpec` 建议

```json
{
  "kind": "circuit",
  "components": [
    { "id": "battery", "type": "battery", "label": "电源" },
    { "id": "S", "type": "switch", "label": "S", "defaultState": "open" },
    { "id": "L", "type": "lamp", "label": "L" }
  ],
  "wires": [
    ["battery.positive", "S.in"],
    ["S.out", "L.in"],
    ["L.out", "battery.negative"]
  ],
  "logic": {
    "p": "S closed",
    "q": "L on",
    "relation": "p sufficient but not necessary for q"
  }
}
```

## 验收标准

- 前端不再出现“图 A / 图 B / 如图所示 / 图中阴影部分”但无图的情况。
- 所有 `visuals[].renderCode.code` 能直接被复制成 React SVG 组件。
- 每个图必须有 `alt` 和 `placement`。
- 选择题选项图必须按 `placement: "option:A"`、`option:B` 等标明归属。
- 题干图使用 `placement: "stem"`。
- 重新 OCR 的题必须把 `status` 从 `needs-review` 或 `incomplete` 更新为真实状态。
