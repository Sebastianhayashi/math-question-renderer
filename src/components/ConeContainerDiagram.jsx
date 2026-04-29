export function ConeContainerDiagram() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-black text-slate-950">题图：双圆锥玻璃容器示意</h3>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
          示意图，非精确比例
        </span>
      </div>
      <svg
        viewBox="0 0 560 360"
        className="w-full"
        role="img"
        aria-label="两个高为 H 的圆锥构成的玻璃容器示意图"
      >
        <defs>
          <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        <rect x="20" y="20" width="520" height="320" rx="20" fill="#f8fafc" />
        <path
          d="M280 42 L140 174 L280 306 L420 174 Z"
          fill="white"
          stroke="#334155"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M140 174 C178 148 382 148 420 174" fill="none" stroke="#334155" strokeWidth="5" />
        <path
          d="M170 196 C210 178 350 178 390 196 L280 302 Z"
          fill="url(#water)"
          stroke="#2563eb"
          strokeWidth="3"
        />
        <path
          d="M170 196 C210 176 350 176 390 196 C350 216 210 216 170 196Z"
          fill="#bfdbfe"
          stroke="#2563eb"
          strokeWidth="3"
        />

        <line x1="446" y1="42" x2="446" y2="174" stroke="#64748b" strokeWidth="4" />
        <line x1="436" y1="42" x2="456" y2="42" stroke="#64748b" strokeWidth="4" />
        <line x1="436" y1="174" x2="456" y2="174" stroke="#64748b" strokeWidth="4" />
        <text x="466" y="112" fill="#1d4ed8" fontSize="28" fontWeight="800">
          H
        </text>

        <line x1="446" y1="174" x2="446" y2="306" stroke="#64748b" strokeWidth="4" />
        <line x1="436" y1="306" x2="456" y2="306" stroke="#64748b" strokeWidth="4" />
        <text x="466" y="248" fill="#1d4ed8" fontSize="28" fontWeight="800">
          H
        </text>

        <line
          x1="280"
          y1="306"
          x2="280"
          y2="196"
          stroke="#0f766e"
          strokeWidth="4"
          strokeDasharray="8 8"
        />
        <text x="292" y="258" fill="#0f766e" fontSize="28" fontWeight="800">
          h
        </text>

        <line x1="170" y1="196" x2="390" y2="196" stroke="#7c3aed" strokeWidth="4" />
        <text x="270" y="188" fill="#7c3aed" fontSize="28" fontWeight="800">
          d
        </text>
      </svg>
    </div>
  );
}
