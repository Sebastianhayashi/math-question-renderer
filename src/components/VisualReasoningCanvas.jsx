import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useVisualCanvas from "../hooks/useVisualCanvas.js";
import { QuestionBlocks } from "./QuestionBlocks.jsx";
import { RichText } from "./RichText.jsx";
import { CANVAS_ELEMENT_TYPES, ELEMENT_TYPE_META } from "../lib/canvasState.js";
import { cx } from "../lib/cx.js";

const TEXTLIKE_TYPES = new Set([
  CANVAS_ELEMENT_TYPES.NOTE,
  CANVAS_ELEMENT_TYPES.CONDITION,
  CANVAS_ELEMENT_TYPES.GOAL,
  CANVAS_ELEMENT_TYPES.DERIVATION,
  CANVAS_ELEMENT_TYPES.ANSWER,
  CANVAS_ELEMENT_TYPES.FORMULA,
  CANVAS_ELEMENT_TYPES.CHECKLIST,
]);

function getElementSize(type) {
  if (type === CANVAS_ELEMENT_TYPES.GROUP) return { width: 520, height: 300 };
  if (type === CANVAS_ELEMENT_TYPES.GRAPH_PLACEHOLDER) return { width: 360, height: 260 };
  if (type === CANVAS_ELEMENT_TYPES.TABLE_PLACEHOLDER) return { width: 320, height: 220 };
  if (type === CANVAS_ELEMENT_TYPES.MACHINE_VISUAL) return { width: 360, height: 170 };
  return { width: 240, height: 120 };
}

function getToolText(toolTag, selectedText) {
  if (selectedText?.trim()) return selectedText.trim();
  if (toolTag === "answer") return "点击编辑答案...";
  if (toolTag === "target") return "点击编辑目标...";
  if (toolTag === "known") return "点击编辑已知条件...";
  return "点击编辑...";
}

function CanvasConnectionsLayer({ elements, connections, height }) {
  const elementById = useMemo(() => new Map(elements.map((element) => [element.id, element])), [elements]);

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[2]"
      style={{ width: "100%", height }}
      overflow="visible"
      aria-hidden="true"
    >
      <defs>
        <marker id="canvas-arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(46,103,248,0.58)" />
        </marker>
      </defs>
      {connections.map((connection) => {
        const from = elementById.get(connection.fromId);
        const to = elementById.get(connection.toId);
        if (!from || !to) return null;
        const startX = from.x + from.width / 2;
        const startY = from.y + from.height / 2;
        const endX = to.x + to.width / 2;
        const endY = to.y + to.height / 2;
        const midX = (startX + endX) / 2;
        const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

        return (
          <g key={connection.id}>
            <path
              d={d}
              fill="none"
              stroke="rgba(46,103,248,0.42)"
              strokeWidth="2"
              strokeDasharray={connection.mode === "plain" ? "5 5" : undefined}
              markerEnd={connection.mode !== "plain" ? "url(#canvas-arrowhead)" : undefined}
            />
            {connection.label ? (
              <text x={midX} y={(startY + endY) / 2 - 8} textAnchor="middle" className="fill-primary text-[11px] font-black">
                {connection.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function useCanvasDrag({ viewportRef, surfaceRef, onMove, onExpand }) {
  const dragRef = useRef(null);

  useEffect(() => {
    function handleMove(event) {
      const drag = dragRef.current;
      const surface = surfaceRef.current;
      const viewport = viewportRef.current;
      if (!drag || !surface || !viewport) return;

      const surfaceRect = surface.getBoundingClientRect();
      const x = Math.max(0, event.clientX - surfaceRect.left - drag.offsetX);
      const y = Math.max(0, event.clientY - surfaceRect.top - drag.offsetY);
      const element = surface.querySelector(`[data-canvas-element-id="${drag.id}"]`);
      if (element) {
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      }

      const viewportRect = viewport.getBoundingClientRect();
      if (event.clientY > viewportRect.bottom - 84) viewport.scrollTop += 22;
      if (event.clientY < viewportRect.top + 56) viewport.scrollTop = Math.max(0, viewport.scrollTop - 18);
      if (y + drag.height > drag.canvasHeight - 300) onExpand(y + drag.height);

      drag.lastX = x;
      drag.lastY = y;
    }

    function handleUp() {
      const drag = dragRef.current;
      if (drag) onMove(drag.id, drag.lastX ?? drag.startX, drag.lastY ?? drag.startY);
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    }

    window.__visualCanvasDragHandlers = { handleMove, handleUp };
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      delete window.__visualCanvasDragHandlers;
    };
  }, [onExpand, onMove, surfaceRef, viewportRef]);

  return useCallback((event, element) => {
    if (event.button !== 0) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const surfaceRect = surface.getBoundingClientRect();
    dragRef.current = {
      id: element.id,
      startX: element.x,
      startY: element.y,
      lastX: element.x,
      lastY: element.y,
      offsetX: event.clientX - surfaceRect.left - element.x,
      offsetY: event.clientY - surfaceRect.top - element.y,
      width: element.width || 240,
      height: element.height || 120,
      canvasHeight: surface.offsetHeight,
    };
    event.preventDefault();
    window.addEventListener("pointermove", window.__visualCanvasDragHandlers.handleMove);
    window.addEventListener("pointerup", window.__visualCanvasDragHandlers.handleUp);
    window.addEventListener("pointercancel", window.__visualCanvasDragHandlers.handleUp);
  }, [surfaceRef]);
}

function ElementFrame({ element, label, color, children, onStartDrag, locked = false, actions = null, className = "" }) {
  return (
    <div
      data-canvas-element-id={element.id}
      className={cx("absolute z-[4]", className)}
      style={{ left: element.x, top: element.y, width: element.width, minHeight: element.height }}
    >
      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur">
        <div
          className={cx(
            "flex h-9 items-center gap-2 border-b border-slate-100 px-3 text-[11px] font-black select-none",
            locked ? "cursor-default" : "cursor-grab active:cursor-grabbing"
          )}
          onPointerDown={(event) => {
            if (!locked) onStartDrag(event, element);
          }}
          style={{ color, background: `${color}0E`, touchAction: "none" }}
        >
          <span className="material-symbols-outlined text-[15px] opacity-55">{locked ? "lock" : "drag_indicator"}</span>
          <span>{label}</span>
          <span className="flex-1" />
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}

function SourceCard({ element, question, onStartDrag }) {
  const meta = ELEMENT_TYPE_META.source;
  return (
    <ElementFrame element={element} label="题目源" color={meta.color} locked={element.locked} onStartDrag={onStartDrag}>
      <div className="select-text p-6">
        <QuestionBlocks blocks={element.content?.blocks || []} />
      </div>
    </ElementFrame>
  );
}

function OptionCard({ element, selectedAnswers, onSelectAnswer, onStartDrag }) {
  const selected = selectedAnswers.includes(element.content?.label);
  return (
    <ElementFrame
      element={element}
      label={`选项 ${element.content?.label || ""}`}
      color={selected ? "#2E67F8" : "#64748b"}
      onStartDrag={onStartDrag}
      actions={<span className={cx("rounded-full px-2 py-0.5 text-[10px]", selected ? "bg-primary text-white" : "bg-slate-100 text-slate-400")}>{selected ? "已选" : "可作答"}</span>}
    >
      <button
        className="flex w-full items-start gap-3 p-4 text-left"
        onClick={() => onSelectAnswer?.(element.content?.label)}
      >
        <span className={cx("grid size-9 shrink-0 place-items-center rounded-full font-black", selected ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
          {element.content?.label}
        </span>
        <span className={cx("min-w-0 pt-1 text-[15px] font-bold leading-relaxed", selected ? "text-primary" : "text-slate-700")}>
          <RichText content={element.content?.rawContent || [element.content?.text || ""]} />
        </span>
      </button>
    </ElementFrame>
  );
}

function TextBlock({ element, onStartDrag, onUpdate, onDelete }) {
  const meta = ELEMENT_TYPE_META[element.type] || ELEMENT_TYPE_META.note;
  const [editing, setEditing] = useState(!element.content?.text || element.content.text === "点击编辑...");
  const [draft, setDraft] = useState(element.content?.text || "");

  useEffect(() => {
    if (!editing) setDraft(element.content?.text || "");
  }, [editing, element.content?.text]);

  function commit() {
    onUpdate(element.id, { content: { ...element.content, text: draft.trim() } });
    setEditing(false);
  }

  return (
    <ElementFrame
      element={element}
      label={meta.label}
      color={meta.color}
      onStartDrag={onStartDrag}
      actions={
        <>
          <button className="grid size-6 place-items-center rounded-lg hover:bg-white/70" onPointerDown={(event) => event.stopPropagation()} onClick={() => onUpdate(element.id, { collapsed: !element.collapsed })}>
            <span className="material-symbols-outlined text-[14px]">{element.collapsed ? "unfold_more" : "unfold_less"}</span>
          </button>
          <button className="grid size-6 place-items-center rounded-lg hover:bg-white/70" onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(element.id)}>
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </>
      }
    >
      {!element.collapsed ? (
        <div className="p-3" style={{ background: meta.bg }}>
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") commit();
                if (event.key === "Escape") setEditing(false);
              }}
              className="min-h-[74px] w-full resize-none rounded-xl bg-white/80 px-3 py-2 text-[13px] font-bold leading-relaxed text-slate-700 outline-none ring-1 ring-white/80"
              placeholder="点击编辑..."
            />
          ) : (
            <button className="w-full text-left text-[14px] font-bold leading-relaxed text-slate-700" onClick={() => setEditing(true)}>
              <RichText content={[element.content?.text || "点击编辑..."]} />
            </button>
          )}
        </div>
      ) : null}
    </ElementFrame>
  );
}

function GraphPlaceholder({ element, onStartDrag, onDelete }) {
  const meta = ELEMENT_TYPE_META.graphPlaceholder;
  return (
    <ElementFrame element={element} label="函数图工具" color={meta.color} onStartDrag={onStartDrag} actions={<button onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(element.id)}><span className="material-symbols-outlined text-[14px]">close</span></button>}>
      <div className="grid h-[210px] place-items-center bg-teal-50/50">
        <div className="relative h-32 w-56 border-b-2 border-l-2 border-teal-300">
          <div className="absolute bottom-3 left-4 h-20 w-40 rounded-[50%] border-t-2 border-teal-400" />
          <p className="absolute bottom-4 right-2 text-[11px] font-black text-teal-500">函数图工具</p>
        </div>
      </div>
    </ElementFrame>
  );
}

function TablePlaceholder({ element, onStartDrag, onDelete }) {
  const meta = ELEMENT_TYPE_META.tablePlaceholder;
  return (
    <ElementFrame element={element} label="表格工具" color={meta.color} onStartDrag={onStartDrag} actions={<button onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(element.id)}><span className="material-symbols-outlined text-[14px]">close</span></button>}>
      <div className="bg-amber-50/50 p-4">
        <table className="w-full border-collapse rounded-xl bg-white text-center text-[13px] font-bold text-amber-800">
          <tbody>
            {["x", "y"].map((label) => (
              <tr key={label}>
                <th className="border border-amber-200 px-3 py-3">{label}</th>
                <td className="border border-amber-200 px-3 py-3">...</td>
                <td className="border border-amber-200 px-3 py-3">...</td>
                <td className="border border-amber-200 px-3 py-3">...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ElementFrame>
  );
}

function MachineVisual({ element, onStartDrag, onDelete }) {
  const meta = ELEMENT_TYPE_META.machineVisual;
  return (
    <ElementFrame element={element} label="输入-规则-输出" color={meta.color} onStartDrag={onStartDrag} actions={<button onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(element.id)}><span className="material-symbols-outlined text-[14px]">close</span></button>}>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 bg-violet-50/50 p-4 text-center text-[12px] font-black text-violet-700">
        <div className="rounded-xl bg-white p-3 shadow-inner">输入</div>
        <span className="material-symbols-outlined">arrow_forward</span>
        <div className="rounded-xl bg-white p-3 shadow-inner">规则</div>
        <span className="material-symbols-outlined">arrow_forward</span>
        <div className="rounded-xl bg-white p-3 shadow-inner">输出</div>
      </div>
    </ElementFrame>
  );
}

function GroupFrame({ element, onStartDrag, onDelete }) {
  const meta = ELEMENT_TYPE_META.group;
  return (
    <div
      data-canvas-element-id={element.id}
      className="absolute z-[1] rounded-3xl border-2 border-dashed bg-white/20 backdrop-blur-[1px]"
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, borderColor: meta.border }}
    >
      <div
        className="flex h-10 cursor-grab items-center gap-2 rounded-t-3xl px-4 text-[11px] font-black text-sky-700 active:cursor-grabbing"
        onPointerDown={(event) => onStartDrag(event, element)}
        style={{ background: "rgba(3,105,161,0.06)", touchAction: "none" }}
      >
        <span className="material-symbols-outlined text-[15px]">dashboard_customize</span>
        分组空间
        <span className="flex-1" />
        <button onPointerDown={(event) => event.stopPropagation()} onClick={() => onDelete(element.id)}>
          <span className="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    </div>
  );
}

function CanvasElementRenderer(props) {
  const { element } = props;
  if (element.type === CANVAS_ELEMENT_TYPES.SOURCE) return <SourceCard {...props} />;
  if (element.type === CANVAS_ELEMENT_TYPES.OPTION) return <OptionCard {...props} />;
  if (element.type === CANVAS_ELEMENT_TYPES.GRAPH_PLACEHOLDER) return <GraphPlaceholder {...props} />;
  if (element.type === CANVAS_ELEMENT_TYPES.TABLE_PLACEHOLDER) return <TablePlaceholder {...props} />;
  if (element.type === CANVAS_ELEMENT_TYPES.MACHINE_VISUAL) return <MachineVisual {...props} />;
  if (element.type === CANVAS_ELEMENT_TYPES.GROUP) return <GroupFrame {...props} />;
  if (TEXTLIKE_TYPES.has(element.type)) return <TextBlock {...props} />;
  return <TextBlock {...props} />;
}

export default function VisualReasoningCanvas({
  questionId,
  question,
  selectedAnswers,
  onSelectAnswer,
  oldNotes,
  onCanvasReady,
}) {
  const viewportRef = useRef(null);
  const surfaceRef = useRef(null);
  const {
    initialized,
    elements,
    connections,
    canvasHeight,
    addElement,
    updateElement,
    updateElementPosition,
    deleteElement,
    expandCanvas,
    arrangeUserElements,
  } = useVisualCanvas({ questionId, question, oldNotes });

  const startDrag = useCanvasDrag({
    viewportRef,
    surfaceRef,
    onMove: updateElementPosition,
    onExpand: expandCanvas,
  });

  const getPlacement = useCallback((placement = {}) => {
    const surface = surfaceRef.current;
    const viewport = viewportRef.current;
    const surfaceRect = surface?.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();
    const userCount = elements.filter((element) => element.type !== CANVAS_ELEMENT_TYPES.SOURCE && element.type !== CANVAS_ELEMENT_TYPES.OPTION).length;
    const offset = (userCount % 5) * 32;

    if (placement.clientX && placement.clientY && surfaceRect) {
      return {
        x: Math.max(24, placement.clientX - surfaceRect.left - 80 + offset),
        y: Math.max(24, placement.clientY - surfaceRect.top + 28 + offset),
      };
    }

    if (viewportRect && surfaceRect) {
      return {
        x: Math.max(80, viewportRect.left + viewportRect.width * 0.5 - surfaceRect.left - 120 + offset),
        y: Math.max(520, viewport.scrollTop + viewportRect.height * 0.58 + offset),
      };
    }

    return { x: 120 + offset, y: 560 + offset };
  }, [elements]);

  useEffect(() => {
    if (!initialized || !onCanvasReady) return;
    onCanvasReady({
      createFromTool(toolTag, selectedText, placement) {
        const typeMap = {
          known: CANVAS_ELEMENT_TYPES.CONDITION,
          unknown: CANVAS_ELEMENT_TYPES.NOTE,
          target: CANVAS_ELEMENT_TYPES.GOAL,
          assumption: CANVAS_ELEMENT_TYPES.NOTE,
          translate: CANVAS_ELEMENT_TYPES.DERIVATION,
          infer: CANVAS_ELEMENT_TYPES.DERIVATION,
          verify: CANVAS_ELEMENT_TYPES.CHECKLIST,
          answer: CANVAS_ELEMENT_TYPES.ANSWER,
        };
        const type = typeMap[toolTag] || CANVAS_ELEMENT_TYPES.NOTE;
        const size = getElementSize(type);
        addElement({
          type,
          content: { text: getToolText(toolTag, selectedText) },
          ...getPlacement(placement),
          ...size,
        });
      },
      createGroup(placement) {
        addElement({
          type: CANVAS_ELEMENT_TYPES.GROUP,
          content: { title: "分组空间" },
          ...getPlacement(placement),
          ...getElementSize(CANVAS_ELEMENT_TYPES.GROUP),
        });
      },
      arrange: arrangeUserElements,
    });
  }, [addElement, arrangeUserElements, getPlacement, initialized, onCanvasReady]);

  const userElements = elements.filter((element) => element.type !== CANVAS_ELEMENT_TYPES.SOURCE && element.type !== CANVAS_ELEMENT_TYPES.OPTION);

  if (!initialized) {
    return <div className="grid min-h-[60vh] place-items-center text-[12px] font-bold text-slate-300">正在加载画布...</div>;
  }

  return (
    <div ref={viewportRef} className="relative h-full overflow-auto bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)]">
      <div
        ref={surfaceRef}
        className="relative mx-auto min-h-[120vh] w-full max-w-[1280px]"
        style={{ height: canvasHeight }}
      >
        <CanvasConnectionsLayer elements={elements} connections={connections} height={canvasHeight} />
        {elements.map((element) => (
          <CanvasElementRenderer
            key={element.id}
            element={element}
            question={question}
            selectedAnswers={selectedAnswers}
            onSelectAnswer={onSelectAnswer}
            onStartDrag={startDrag}
            onUpdate={updateElement}
            onDelete={deleteElement}
          />
        ))}
        {userElements.length === 0 ? (
          <div className="pointer-events-none absolute left-[84px] top-[560px] text-[12px] font-bold text-slate-300">
            用下方工具或拖动内容来搭建你的解题空间
          </div>
        ) : null}
      </div>
    </div>
  );
}
