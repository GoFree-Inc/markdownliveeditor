# MarkLiveEdit — Free Online Markdown Editor with Live Preview

**URL:** [md.useaxra.com](https://md.useaxra.com)

A fast, free, privacy-first markdown editor that runs entirely in your browser. No data is sent to any server.

## Features

- **Live Preview** — instant side-by-side rendering as you type
- **Upload** — open any `.md`, `.markdown`, or `.txt` file
- **Drag & Drop** — drop files directly into the editor
- **Formatting Toolbar** — bold, italic, headings, lists, code, tables, links, images
- **Keyboard Shortcuts** — Ctrl+B (bold), Ctrl+I (italic), Ctrl+K (link), Tab (indent)
- **Export PDF** — one-click PDF export via html2pdf.js
- **Copy HTML** — copy rendered HTML to clipboard
- **Download .md** — save your work as a markdown file
- **Resizable Panels** — drag the divider to resize editor/preview
- **Synchronized Scrolling** — editor and preview scroll in sync
- **Auto-Save** — content persists in localStorage
- **Dark Theme** — modern dark UI
- **Responsive** — works on desktop and mobile
- **GFM Support** — tables, task lists, strikethrough, and more

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
| `styles.css` | Full dark-theme stylesheet |
| `app.js` | Editor logic, toolbar, export, drag & drop, sync scroll |

## Scripts (PDF pipeline)

The `scripts/` directory contains a separate Node.js Markdown-to-PDF pipeline:

```bash
npm run build     # Convert sample.md to PDF
npm run preview   # Live preview server on localhost:4173
```

## Tech Stack

- [marked](https://github.com/markedjs/marked) — Markdown parser
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitizer
- [html2pdf.js](https://github.com/eKoopmans/html2pdf.js) — PDF export
- Vanilla HTML/CSS/JS — no build step required
