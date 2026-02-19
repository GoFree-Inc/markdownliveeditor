# MarkLiveEdit — Free Online Markdown Editor with Live Preview

**URL:** [md.useaxra.com](https://md.useaxra.com)

A fast, free, privacy-first markdown editor that runs entirely in your browser. No data is sent to any server.

## Features

### Editor
- **Live Preview** — instant side-by-side rendering as you type
- **Formatting Toolbar** — bold, italic, headings, lists, code, tables, links, images
- **Multiple Document Tabs** — work on up to 10 documents at once, with rename and reorder
- **Auto-pairing** — brackets, quotes, and markdown syntax auto-close; wraps selections
- **Paste Images** — paste screenshots from clipboard (converted to base64)
- **Find & Replace** — Ctrl+F to search, navigate matches, replace one or all
- **Vim/Emacs Keybindings** — cycle between Normal, Vim, and Emacs modes for power users
- **Resizable Panels** — drag the divider to resize editor/preview
- **Synchronized Scrolling** — editor and preview scroll in sync
- **Focus/Zen Mode** — distraction-free writing with just the editor (Esc to exit)

### Files & Export
- **Upload** — open any `.md`, `.markdown`, or `.txt` file
- **Drag & Drop** — drop files directly into the editor
- **Export PDF** — one-click PDF export with syntax-highlighted code
- **Copy HTML** — copy rendered HTML to clipboard
- **Download .md** — save your work as a markdown file
- **Share Link** — generate a compressed URL containing your document (no server needed)
- **Presentation Mode** — split your markdown by `---` and present as fullscreen slides

### Collaboration
- **Real-time Collaborative Editing** — create or join a room to edit together via WebRTC (PeerJS)
- **No server required** — peer-to-peer connection with automatic signaling

### Tools
- **Light/Dark Theme** — toggle with system preference detection, persists across sessions
- **Code Syntax Highlighting** — Prism.js with 200+ languages, theme-aware colors
- **Mermaid Diagrams** — render flowcharts, sequences, and more from fenced code blocks
- **Markdown Cheat Sheet** — slide-out quick reference panel
- **Table of Contents** — auto-generated from headings, click to navigate
- **Version History** — save and restore snapshots of your work
- **In-App User Guide** — click the Guide button for full documentation

### Core
- **Auto-Save** — content persists in localStorage
- **Responsive** — works on desktop and mobile
- **GFM Support** — tables, task lists, strikethrough, and more
- **Privacy-First** — 100% client-side, zero data sent to any server

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+K` | Insert link |
| `Ctrl+F` | Find & Replace |
| `Tab` | Indent (2 spaces) |
| `Esc` | Exit Zen mode / Close panels |

### Vim Mode
| Key | Action |
|-----|--------|
| `i` / `a` / `o` | Enter insert mode |
| `Esc` | Return to normal mode |
| `h` / `j` / `k` / `l` | Navigate left/down/up/right |
| `w` / `b` | Word forward/back |
| `dd` | Delete line |
| `yy` | Yank (copy) line |
| `p` | Paste |
| `v` | Enter visual mode |
| `gg` / `G` | Go to top/bottom |
| `/` | Open search |

### Emacs Mode
| Key | Action |
|-----|--------|
| `Ctrl+A` / `Ctrl+E` | Line start/end |
| `Ctrl+K` | Kill to end of line |
| `Ctrl+Y` | Yank (paste killed text) |
| `Ctrl+N` / `Ctrl+P` | Next/previous line |
| `Ctrl+F` / `Ctrl+B` | Forward/back one char |

## Quick Start

Serve the files with any static server:

```bash
npx serve .
```

Or open `index.html` directly in your browser.

## Files

| File | Description |
|------|-------------|
| `index.html` | Main page with SEO, Open Graph, and structured data |
| `styles.css` | Full themed stylesheet (light + dark) |
| `app.js` | Core editor logic, init, rendering, event binding |
| `modules/editor-ui.js` | Toast notifications, zen mode, pane resize, sync scroll |
| `modules/theme.js` | Theme toggle with localStorage persistence |
| `modules/share.js` | URL sharing with LZString compression |
| `modules/toolbar.js` | Toolbar button actions |
| `modules/find-replace.js` | Find bar, match navigation, replace |
| `modules/auto-pair.js` | Bracket/quote auto-pairing |
| `modules/panels.js` | TOC, mermaid rendering, guide modal, panel toggles |
| `modules/history.js` | Version history snapshots |
| `modules/file-ops.js` | Upload, drag-drop, download, copy HTML, clear, paste image |
| `modules/pdf-export.js` | PDF export with inline styles |
| `modules/tabs.js` | Multiple document tabs |
| `modules/presentation.js` | Presentation mode (slide view) |
| `modules/keybindings.js` | Vim/Emacs keybinding modes |
| `modules/collab.js` | Collaborative editing via PeerJS |
| `features.md` | Feature tracker with implementation status |
| `memory/` | Session logs for cross-session continuity |

## Tech Stack

- [marked](https://github.com/markedjs/marked) — Markdown parser
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitizer
- [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) — PDF export
- [Prism.js](https://prismjs.com/) — Code syntax highlighting
- [LZString](https://github.com/pieroxy/lz-string) — URL-safe compression for share links
- [Mermaid](https://mermaid.js.org/) — Diagram rendering from markdown
- [PeerJS](https://peerjs.com/) — WebRTC wrapper for collaborative editing
- Vanilla HTML/CSS/JS — no build step required
