# Release Notes

## 2026-05-01

### Core Focus

- Reduced the quiz experience around the main goal: keep users immersed in answering questions.
- Removed unnecessary answer-selection friction so clicking an option card directly selects it.
- Minimized secondary UI weight so the question remains the primary surface.

### Thinking Workspace

- Added lightweight math thinking modules for known, unknown, target, assumption, transform, infer, verify, and answer states.
- Modules now default into a dedicated thinking zone instead of scattering across the page.
- Added a thinking zone that can collect, arrange, drag, resize, and focus module groups.
- Added a one-click organize action that gathers modules back into the thinking zone in reasoning order.
- Added box selection for selecting and moving multiple modules together.

### Module UX

- Simplified module visuals toward low-noise thinking blocks.
- Tag color now appears as subtle module styling rather than heavy foreground decoration.
- Modules can be dragged even when connection mode is active.
- Module content can be edited inline.
- Module content supports lightweight Markdown and math rendering, including `$...$`, `$$...$$`, bold text, inline code, line breaks, and simple lists.

### Connections

- Added single-direction, bidirectional, and plain connection modes.
- Connection lines use animated flow to communicate direction.
- Connection color now follows the source module type.
- Connection labels can be edited directly by the user.
- Connection creation now works from the module connection control without needing to pre-enable a mode.

### Tooling

- Added a collapsible bottom tool dock for creating modules and organizing the thinking workspace.
- Added Playwright as a dev dependency for browser-based interaction testing.

### Verification

- Verified production build with `npm run build`.
- Browser-tested option selection, module creation, dragging, zone collection, connection creation, connection labels, Markdown/math rendering, and tool dock behavior.
