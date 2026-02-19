/* =========================================================
   Markdown Live Editor — modules/panels.js
   TOC, mermaid, guide modal, panel toggles
   ========================================================= */

(function () {
  "use strict";

  // --- Table of Contents ---
  function buildToc() {
    var preview = document.getElementById("preview");
    var tocList = document.getElementById("toc-list");
    var tocEmpty = document.getElementById("toc-empty");
    var headings = preview.querySelectorAll("h1, h2, h3, h4");
    tocList.innerHTML = "";

    if (headings.length === 0) {
      tocEmpty.hidden = false;
      return;
    }

    tocEmpty.hidden = true;
    headings.forEach(function (h) {
      var level = parseInt(h.tagName[1]);
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.textContent = h.textContent;
      a.href = "#";
      a.className = "toc-h" + level;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        h.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.appendChild(a);
      tocList.appendChild(li);
    });
  }

  // --- Mermaid Diagram Support ---
  function renderMermaidBlocks() {
    if (typeof mermaid === "undefined") return;

    var preview = document.getElementById("preview");
    var codeBlocks = preview.querySelectorAll("code.language-mermaid");
    codeBlocks.forEach(function (code, i) {
      var pre = code.parentElement;
      if (!pre || pre.tagName !== "PRE") return;

      var graphDef = code.textContent;
      var container = document.createElement("div");
      container.className = "mermaid-container";
      var id = "mermaid-" + Date.now() + "-" + i;

      try {
        mermaid.render(id, graphDef).then(function (result) {
          container.innerHTML = result.svg;
          pre.parentNode.replaceChild(container, pre);
        }).catch(function () {});
      } catch (_) {}
    });
  }

  // --- Guide Modal ---
  var guideLoaded = false;
  var GUIDE_CONTENT = '# Markdown Live Editor User Guide\n\n' +
    '**URL:** [markdown.useaxra.com](https://markdown.useaxra.com)\n\n' +
    'A fast, free, privacy-first markdown editor that runs entirely in your browser. No data is sent to any server.\n\n' +
    '---\n\n' +
    '## Getting Started\n\n' +
    '1. **Type markdown** in the left editor pane\n' +
    '2. **See live preview** rendered instantly on the right\n' +
    '3. **Export** your work as PDF, HTML, or download as `.md`\n\n' +
    '---\n\n' +
    '## Features\n\n' +
    '### Editor\n' +
    '- **Live Preview** \u2014 instant side-by-side rendering as you type\n' +
    '- **Formatting Toolbar** \u2014 bold, italic, headings, lists, code, tables, links, images\n' +
    '- **Auto-pairing** \u2014 brackets, quotes, and markdown syntax auto-close\n' +
    '- **Paste Images** \u2014 paste screenshots from clipboard (converted to base64)\n' +
    '- **Find & Replace** \u2014 Ctrl+F to search, with replace support\n' +
    '- **Resizable Panels** \u2014 drag the divider to resize editor/preview\n' +
    '- **Synchronized Scrolling** \u2014 editor and preview scroll in sync\n' +
    '- **Focus/Zen Mode** \u2014 distraction-free writing, just the editor\n' +
    '- **Multiple Tabs** \u2014 work on several documents at once\n' +
    '- **Vim/Emacs Keybindings** \u2014 power-user keyboard modes\n\n' +
    '### Files & Export\n' +
    '- **Upload** \u2014 open any `.md`, `.markdown`, or `.txt` file\n' +
    '- **Drag & Drop** \u2014 drop files directly into the editor\n' +
    '- **Export PDF** \u2014 one-click PDF export with syntax highlighting\n' +
    '- **Copy HTML** \u2014 copy rendered HTML to clipboard\n' +
    '- **Download .md** \u2014 save your work as a markdown file\n' +
    '- **Share Link** \u2014 generate a URL that contains your document (no server needed)\n' +
    '- **Presentation Mode** \u2014 split by `---` and present as slides\n\n' +
    '### Tools\n' +
    '- **Theme Toggle** \u2014 switch between light and dark mode\n' +
    '- **Markdown Cheat Sheet** \u2014 quick reference panel\n' +
    '- **Table of Contents** \u2014 auto-generated from your headings\n' +
    '- **Version History** \u2014 save and restore snapshots of your work\n' +
    '- **Mermaid Diagrams** \u2014 render flowcharts and diagrams from code blocks\n' +
    '- **Code Syntax Highlighting** \u2014 Prism.js powered highlighting in preview\n' +
    '- **Collaborative Editing** \u2014 real-time editing via WebRTC\n\n' +
    '---\n\n' +
    '## Keyboard Shortcuts\n\n' +
    '| Shortcut | Action |\n' +
    '|----------|--------|\n' +
    '| `Ctrl+B` | Bold |\n' +
    '| `Ctrl+I` | Italic |\n' +
    '| `Ctrl+K` | Insert link |\n' +
    '| `Ctrl+F` | Find & Replace |\n' +
    '| `Tab` | Indent (2 spaces) |\n' +
    '| `Esc` | Exit Zen mode / Close panels |\n\n' +
    '---\n\n' +
    '## Privacy\n\n' +
    'Everything runs 100% in your browser. No data is ever sent to any server. Your content is saved to `localStorage` on your device.\n\n' +
    '---\n\n' +
    'Built with love by [Axra](https://useaxra.com).\n';

  function openGuide() {
    var guideModal = document.getElementById("guide-modal");
    var guideContent = document.getElementById("guide-content");
    guideModal.hidden = false;
    if (!guideLoaded && typeof marked !== "undefined") {
      var html = marked.parse(GUIDE_CONTENT);
      if (typeof DOMPurify !== "undefined") {
        html = DOMPurify.sanitize(html);
      }
      guideContent.innerHTML = html;
      if (typeof Prism !== "undefined") {
        Prism.highlightAllUnder(guideContent);
      }
      guideLoaded = true;
    }
  }

  function closeGuide() {
    document.getElementById("guide-modal").hidden = true;
  }

  // --- Panel toggles ---
  function togglePanel(panel) {
    var cheatsheetPanel = document.getElementById("cheatsheet-panel");
    var tocPanel = document.getElementById("toc-panel");
    var historyPanel = document.getElementById("history-panel");
    var collabPanel = document.getElementById("collab-panel");

    var panels = [cheatsheetPanel, tocPanel, historyPanel];
    if (collabPanel) panels.push(collabPanel);

    panels.forEach(function (p) {
      if (p && p !== panel) p.hidden = true;
    });
    panel.hidden = !panel.hidden;

    if (panel === tocPanel && !panel.hidden) {
      buildToc();
    }
    if (panel === historyPanel && !panel.hidden) {
      MLE.renderHistoryList();
    }
  }

  function bindPanels() {
    var cheatsheetBtn = document.getElementById("cheatsheet-btn");
    var cheatsheetPanel = document.getElementById("cheatsheet-panel");
    var cheatsheetClose = document.getElementById("cheatsheet-close");
    var tocBtn = document.getElementById("toc-btn");
    var tocPanel = document.getElementById("toc-panel");
    var tocClose = document.getElementById("toc-close");
    var guideBtn = document.getElementById("guide-btn");
    var guideModal = document.getElementById("guide-modal");
    var guideClose = document.getElementById("guide-close");

    if (cheatsheetBtn) {
      cheatsheetBtn.addEventListener("click", function () { togglePanel(cheatsheetPanel); });
    }
    if (cheatsheetClose) {
      cheatsheetClose.addEventListener("click", function () { cheatsheetPanel.hidden = true; });
    }
    if (tocBtn) {
      tocBtn.addEventListener("click", function () { togglePanel(tocPanel); });
    }
    if (tocClose) {
      tocClose.addEventListener("click", function () { tocPanel.hidden = true; });
    }
    if (guideBtn) {
      guideBtn.addEventListener("click", openGuide);
    }
    if (guideClose) {
      guideClose.addEventListener("click", closeGuide);
    }
    if (guideModal) {
      guideModal.addEventListener("click", function (e) {
        if (e.target === guideModal) closeGuide();
      });
    }
  }

  window.MLE = window.MLE || {};
  window.MLE.buildToc = buildToc;
  window.MLE.renderMermaidBlocks = renderMermaidBlocks;
  window.MLE.openGuide = openGuide;
  window.MLE.closeGuide = closeGuide;
  window.MLE.togglePanel = togglePanel;
  window.MLE.bindPanels = bindPanels;
})();
