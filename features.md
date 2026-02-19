# MarkLiveEdit — Feature Tracker

## Implemented

### High Impact, Low Effort
- [x] **2. Theme Toggle** — Light/dark mode with system preference detection, localStorage persistence, anti-flash script, animated sun/moon icons
- [x] **4. Shareable Links** — LZString-compressed URL hash encoding, clipboard copy, >8KB warning
- [x] **5. Paste Image Support** — Paste screenshots from clipboard, converted to base64 inline markdown

### Medium Effort, Strong Differentiation
- [x] **3. Markdown Cheat Sheet Panel** — Slide-out reference panel with syntax, shortcuts, and diagram examples
- [x] **6. Multiple Document Tabs** — Tab bar with create/switch/rename/close, max 10 tabs, localStorage persistence, auto-migration from single content
- [x] **7. Focus/Zen Mode** — Hides all chrome (topbar, toolbar, footer, preview), fullscreen centered editor, Esc to exit
- [x] **8. Find & Replace** — Ctrl+F triggered, case-insensitive search, match navigation, single/all replace
- [x] **9. Auto-pairing** — Auto-close `**`, `` ` ``, `[]`, `()`, `{}`, quotes; wrap selections; smart skip on closing char; backspace deletes pair
- [x] **10. Table of Contents** — Auto-generated from headings (H1-H4), collapsible sidebar, click to scroll
- [x] **11. Code Syntax Highlighting in Preview** — Prism.js with Tomorrow Night theme (dark) and GitHub-style (light), autoloader for 200+ languages, theme-aware PDF export

### High Effort, Premium Feel
- [x] **12. Collaborative Editing** — Real-time via PeerJS (WebRTC) with create/join rooms, full-content sync, peer count indicator, auto-cleanup on unload
- [x] **13. Vim/Emacs Keybindings** — Vim normal/insert/visual modes (hjkl, dd, yy, p, w, b, gg, G, /search), Emacs (Ctrl+A/E/K/Y/N/P/F/B), mode indicator, cycle button, localStorage persistence
- [x] **14. Mermaid Diagram Support** — Render flowcharts, sequence diagrams, etc. from fenced `mermaid` code blocks
- [x] **15. Presentation Mode** — Split by `---` horizontal rules into slides, fullscreen overlay, arrow key/touch navigation, slide counter, fade transitions, Prism + Mermaid rendering in slides
- [x] **16. Version History** — Save/restore named snapshots to localStorage, max 20, delete individual entries

## Not Yet Implemented

### High Impact
- [ ] **1. Syntax Highlighting in Editor** — Requires replacing textarea with CodeMirror/Monaco (major architectural change)
