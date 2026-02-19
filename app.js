/* =========================================================
   MarkLiveEdit — app.js
   Free Online Markdown Editor with Live Preview
   ========================================================= */

(function () {
  "use strict";

  // --- DOM refs ---
  const editor = document.getElementById("editor");
  const preview = document.getElementById("preview");
  const charCount = document.getElementById("char-count");
  const wordCount = document.getElementById("word-count");
  const lineInfo = document.getElementById("line-info");
  const status = document.getElementById("status");
  const exportBtn = document.getElementById("export-btn");
  const clearBtn = document.getElementById("clear-btn");
  const uploadBtn = document.getElementById("upload-btn");
  const fileInput = document.getElementById("file-input");
  const copyHtmlBtn = document.getElementById("copy-html-btn");
  const downloadMdBtn = document.getElementById("download-md-btn");
  const dropOverlay = document.getElementById("drop-overlay");
  const toastEl = document.getElementById("toast");
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const actionsNav = document.querySelector(".actions");
  const paneDivider = document.getElementById("pane-divider");
  const editorPane = document.getElementById("editor-pane");
  const previewPane = document.getElementById("preview-pane");
  const themeToggle = document.getElementById("theme-toggle");
  const shareBtn = document.getElementById("share-btn");
  const zenBtn = document.getElementById("zen-btn");
  const findBtn = document.getElementById("find-btn");
  const findBar = document.getElementById("find-bar");
  const findInput = document.getElementById("find-input");
  const findCount = document.getElementById("find-count");
  const findPrev = document.getElementById("find-prev");
  const findNext = document.getElementById("find-next");
  const findToggleReplace = document.getElementById("find-toggle-replace");
  const findClose = document.getElementById("find-close");
  const replaceRow = document.getElementById("replace-row");
  const replaceInput = document.getElementById("replace-input");
  const replaceOne = document.getElementById("replace-one");
  const replaceAllBtn = document.getElementById("replace-all-btn");
  const cheatsheetBtn = document.getElementById("cheatsheet-btn");
  const cheatsheetPanel = document.getElementById("cheatsheet-panel");
  const cheatsheetClose = document.getElementById("cheatsheet-close");
  const tocBtn = document.getElementById("toc-btn");
  const tocPanel = document.getElementById("toc-panel");
  const tocClose = document.getElementById("toc-close");
  const tocList = document.getElementById("toc-list");
  const tocEmpty = document.getElementById("toc-empty");
  const guideBtn = document.getElementById("guide-btn");
  const guideModal = document.getElementById("guide-modal");
  const guideClose = document.getElementById("guide-close");
  const guideContent = document.getElementById("guide-content");
  const historyBtn = document.getElementById("history-btn");
  const historyPanel = document.getElementById("history-panel");
  const historyClose = document.getElementById("history-close");
  const historySave = document.getElementById("history-save");
  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");

  // --- Marked config ---
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  // --- State ---
  const STORAGE_KEY = "marklivedit_content";
  let renderTimer = null;
  let uploadedFileName = "";

  // Derive a document name from: uploaded filename > first heading > fallback
  function getDocumentName() {
    if (uploadedFileName) {
      return uploadedFileName.replace(/\.(md|markdown|mdown|mkd|txt)$/i, "");
    }
    var text = editor.value;
    var match = text.match(/^#{1,6}\s+(.+)/m);
    if (match) {
      return match[1].trim().replace(/[\\/:*?"<>|]/g, "").substring(0, 80);
    }
    return "document";
  }

  // --- Theme ---
  var THEME_KEY = "marklivedit_theme";

  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved;
    } catch (_) {}
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", theme === "light" ? "#f8f9fb" : "#0a0a0b");
    }
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  // --- Share URL ---
  function shareAsUrl() {
    var content = editor.value;
    if (!content.trim()) {
      showToast("Nothing to share", "error");
      return;
    }

    if (typeof LZString === "undefined") {
      showToast("Share library loading...", "error");
      return;
    }

    var compressed = LZString.compressToEncodedURIComponent(content);
    var hash = "#doc=" + compressed;
    var fullUrl = window.location.origin + window.location.pathname + hash;

    if (fullUrl.length > 8000) {
      showToast("Content may be too large for URL sharing (>8KB)", "warning");
    }

    window.history.replaceState(null, "", hash);
    navigator.clipboard.writeText(fullUrl).then(function () {
      showToast("Share link copied to clipboard", "success");
    }).catch(function () {
      showToast("URL updated — copy it from the address bar", "success");
    });
  }

  function loadFromHash() {
    var hash = window.location.hash;
    if (!hash || !hash.startsWith("#doc=")) return false;

    if (typeof LZString === "undefined") return false;

    try {
      var compressed = hash.substring(5);
      var content = LZString.decompressFromEncodedURIComponent(compressed);
      if (content) {
        editor.value = content;
        saveContent();
        // Clear the hash after loading so it doesn't stick
        window.history.replaceState(null, "", window.location.pathname);
        return true;
      }
    } catch (_) {}
    return false;
  }

  // --- Zen Mode ---
  function toggleZen() {
    document.body.classList.toggle("zen-mode");
  }

  function exitZen() {
    document.body.classList.remove("zen-mode");
  }

  // --- Find & Replace ---
  var findMatches = [];
  var findCurrentIndex = -1;

  function openFindBar() {
    findBar.hidden = false;
    findInput.focus();
    findInput.select();
  }

  function closeFindBar() {
    findBar.hidden = true;
    replaceRow.hidden = true;
    findMatches = [];
    findCurrentIndex = -1;
    findCount.textContent = "0/0";
    editor.focus();
  }

  function performFind() {
    var query = findInput.value;
    findMatches = [];
    findCurrentIndex = -1;

    if (!query) {
      findCount.textContent = "0/0";
      return;
    }

    var text = editor.value;
    var lowerText = text.toLowerCase();
    var lowerQuery = query.toLowerCase();
    var pos = 0;

    while (true) {
      var idx = lowerText.indexOf(lowerQuery, pos);
      if (idx === -1) break;
      findMatches.push(idx);
      pos = idx + 1;
    }

    if (findMatches.length > 0) {
      findCurrentIndex = 0;
      highlightFindMatch();
    }

    updateFindCount();
  }

  function highlightFindMatch() {
    if (findCurrentIndex < 0 || findCurrentIndex >= findMatches.length) return;
    var idx = findMatches[findCurrentIndex];
    var len = findInput.value.length;
    editor.focus();
    editor.setSelectionRange(idx, idx + len);

    // Scroll the match into view
    var linesBefore = editor.value.substring(0, idx).split("\n").length;
    var lineHeight = parseFloat(getComputedStyle(editor).lineHeight) || 20;
    editor.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
  }

  function findNextMatch() {
    if (findMatches.length === 0) return;
    findCurrentIndex = (findCurrentIndex + 1) % findMatches.length;
    highlightFindMatch();
    updateFindCount();
  }

  function findPrevMatch() {
    if (findMatches.length === 0) return;
    findCurrentIndex = (findCurrentIndex - 1 + findMatches.length) % findMatches.length;
    highlightFindMatch();
    updateFindCount();
  }

  function updateFindCount() {
    if (findMatches.length === 0) {
      findCount.textContent = "0/0";
    } else {
      findCount.textContent = (findCurrentIndex + 1) + "/" + findMatches.length;
    }
  }

  function replaceCurrentMatch() {
    if (findCurrentIndex < 0 || findCurrentIndex >= findMatches.length) return;
    var idx = findMatches[findCurrentIndex];
    var query = findInput.value;
    var replacement = replaceInput.value;
    var text = editor.value;

    editor.value = text.substring(0, idx) + replacement + text.substring(idx + query.length);
    editor.dispatchEvent(new Event("input"));
    performFind();
  }

  function replaceAllMatches() {
    var query = findInput.value;
    if (!query) return;
    var replacement = replaceInput.value;
    var text = editor.value;
    // Case-insensitive replace all
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    editor.value = text.replace(new RegExp(escaped, "gi"), replacement);
    editor.dispatchEvent(new Event("input"));
    performFind();
    showToast("Replaced all occurrences", "success");
  }

  // --- Auto-pairing ---
  var PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`", "*": "*", "~": "~" };

  function handleAutoPair(e) {
    var ch = e.key;
    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    var text = editor.value;

    // Opening bracket or quote with selection: wrap selection
    if (PAIRS[ch] && start !== end) {
      e.preventDefault();
      var selected = text.substring(start, end);
      var wrapped = ch + selected + PAIRS[ch];
      editor.setRangeText(wrapped, start, end);
      editor.selectionStart = start + 1;
      editor.selectionEnd = end + 1;
      editor.dispatchEvent(new Event("input"));
      return;
    }

    // Opening bracket or quote without selection: insert pair
    if (PAIRS[ch] && start === end) {
      // For quotes/backtick/asterisk, only pair if next char is empty, space, or end
      if (ch === '"' || ch === "'" || ch === "`" || ch === "*" || ch === "~") {
        var nextChar = text[start];
        if (nextChar && nextChar !== " " && nextChar !== "\n" && nextChar !== undefined) return;
      }
      e.preventDefault();
      editor.setRangeText(ch + PAIRS[ch], start, end);
      editor.selectionStart = editor.selectionEnd = start + 1;
      editor.dispatchEvent(new Event("input"));
      return;
    }

    // Closing bracket: skip if next char matches
    var closingChars = Object.values(PAIRS);
    if (closingChars.indexOf(ch) !== -1 && text[start] === ch) {
      e.preventDefault();
      editor.selectionStart = editor.selectionEnd = start + 1;
      return;
    }

    // Backspace: delete pair if both sides are a pair
    if (ch === "Backspace" && start === end && start > 0) {
      var before = text[start - 1];
      var after = text[start];
      if (PAIRS[before] && PAIRS[before] === after) {
        e.preventDefault();
        editor.value = text.substring(0, start - 1) + text.substring(start + 1);
        editor.selectionStart = editor.selectionEnd = start - 1;
        editor.dispatchEvent(new Event("input"));
      }
    }
  }

  // --- Paste Image Support ---
  function handlePaste(e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        var file = items[i].getAsFile();
        var reader = new FileReader();
        reader.onload = function (ev) {
          var base64 = ev.target.result;
          var markdown = "![pasted image](" + base64 + ")";
          var start = editor.selectionStart;
          editor.setRangeText(markdown, start, editor.selectionEnd);
          editor.selectionStart = editor.selectionEnd = start + markdown.length;
          editor.dispatchEvent(new Event("input"));
          showToast("Image pasted", "success");
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }

  // --- Table of Contents ---
  function buildToc() {
    var headings = preview.querySelectorAll("h1, h2, h3, h4");
    tocList.innerHTML = "";

    if (headings.length === 0) {
      tocEmpty.hidden = false;
      return;
    }

    tocEmpty.hidden = true;
    headings.forEach(function (h, i) {
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
        }).catch(function () {
          // Leave the code block as-is on error
        });
      } catch (_) {
        // Sync error fallback
      }
    });
  }

  // --- Version History ---
  var HISTORY_KEY = "marklivedit_history";

  function getHistory() {
    try {
      var data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (_) { return []; }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (_) {}
  }

  function saveSnapshot() {
    var content = editor.value;
    if (!content.trim()) {
      showToast("Nothing to save", "error");
      return;
    }

    var history = getHistory();
    var snapshot = {
      id: Date.now(),
      time: new Date().toLocaleString(),
      preview: content.substring(0, 80).replace(/\n/g, " "),
      content: content
    };

    history.unshift(snapshot);
    // Keep max 20 snapshots
    if (history.length > 20) history = history.slice(0, 20);
    saveHistory(history);
    renderHistoryList();
    showToast("Snapshot saved", "success");
  }

  function restoreSnapshot(id) {
    var history = getHistory();
    var snapshot = history.find(function (s) { return s.id === id; });
    if (!snapshot) return;

    if (editor.value.trim() && !confirm("Replace current content with this snapshot?")) return;

    editor.value = snapshot.content;
    editor.dispatchEvent(new Event("input"));
    showToast("Snapshot restored", "success");
  }

  function deleteSnapshot(id) {
    var history = getHistory();
    history = history.filter(function (s) { return s.id !== id; });
    saveHistory(history);
    renderHistoryList();
  }

  function renderHistoryList() {
    var history = getHistory();
    historyList.innerHTML = "";

    if (history.length === 0) {
      historyEmpty.hidden = false;
      return;
    }

    historyEmpty.hidden = true;
    history.forEach(function (s) {
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="history-info">' +
          '<span class="history-time">' + s.time + '</span>' +
          '<span class="history-preview">' + (s.preview || "Empty").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span>' +
        '</div>' +
        '<div class="history-actions">' +
          '<button class="history-restore" data-id="' + s.id + '">Restore</button>' +
          '<button class="history-delete" data-id="' + s.id + '">&times;</button>' +
        '</div>';
      historyList.appendChild(li);
    });

    historyList.querySelectorAll(".history-restore").forEach(function (btn) {
      btn.addEventListener("click", function () {
        restoreSnapshot(parseInt(this.dataset.id));
      });
    });

    historyList.querySelectorAll(".history-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteSnapshot(parseInt(this.dataset.id));
      });
    });
  }

  // --- Guide Modal ---
  var guideLoaded = false;
  var GUIDE_CONTENT = '# MarkLiveEdit User Guide\n\n' +
    '**URL:** [md.useaxra.com](https://md.useaxra.com)\n\n' +
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
    '- **Focus/Zen Mode** \u2014 distraction-free writing, just the editor\n\n' +
    '### Files & Export\n' +
    '- **Upload** \u2014 open any `.md`, `.markdown`, or `.txt` file\n' +
    '- **Drag & Drop** \u2014 drop files directly into the editor\n' +
    '- **Export PDF** \u2014 one-click PDF export with syntax highlighting\n' +
    '- **Copy HTML** \u2014 copy rendered HTML to clipboard\n' +
    '- **Download .md** \u2014 save your work as a markdown file\n' +
    '- **Share Link** \u2014 generate a URL that contains your document (no server needed)\n\n' +
    '### Tools\n' +
    '- **Theme Toggle** \u2014 switch between light and dark mode\n' +
    '- **Markdown Cheat Sheet** \u2014 quick reference panel\n' +
    '- **Table of Contents** \u2014 auto-generated from your headings\n' +
    '- **Version History** \u2014 save and restore snapshots of your work\n' +
    '- **Mermaid Diagrams** \u2014 render flowcharts and diagrams from code blocks\n' +
    '- **Code Syntax Highlighting** \u2014 Prism.js powered highlighting in preview\n\n' +
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
    '## Markdown Syntax\n\n' +
    '### Headings\n' +
    '```\n# Heading 1\n## Heading 2\n### Heading 3\n```\n\n' +
    '### Emphasis\n' +
    '```\n**bold** *italic* ~~strikethrough~~ `inline code`\n```\n\n' +
    '### Lists\n' +
    '```\n- Unordered item\n1. Ordered item\n- [ ] Task item\n```\n\n' +
    '### Links & Images\n' +
    '```\n[link text](url)\n![alt text](image-url)\n```\n\n' +
    '### Code Blocks\n' +
    '````\n```javascript\nconst greeting = "Hello, world!";\nconsole.log(greeting);\n```\n````\n\n' +
    '### Mermaid Diagrams\n' +
    '````\n```mermaid\ngraph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Action]\n  B -->|No| D[End]\n```\n````\n\n' +
    '### Tables\n' +
    '```\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n```\n\n' +
    '---\n\n' +
    '## Privacy\n\n' +
    'Everything runs 100% in your browser. No data is ever sent to any server. Your content is saved to `localStorage` on your device.\n\n' +
    '---\n\n' +
    'Built with love by [Axra](https://useaxra.com).\n';

  function openGuide() {
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
    guideModal.hidden = true;
  }

  // --- Panel toggles ---
  function togglePanel(panel) {
    // Close other panels
    [cheatsheetPanel, tocPanel, historyPanel].forEach(function (p) {
      if (p !== panel) p.hidden = true;
    });
    panel.hidden = !panel.hidden;

    // Build TOC when opening
    if (panel === tocPanel && !panel.hidden) {
      buildToc();
    }
    // Build history when opening
    if (panel === historyPanel && !panel.hidden) {
      renderHistoryList();
    }
  }

  // --- Init ---
  function init() {
    applyTheme(getPreferredTheme());

    // Configure Mermaid
    if (typeof mermaid !== "undefined") {
      mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
    }

    // Configure Prism autoloader
    if (typeof Prism !== "undefined" && Prism.plugins && Prism.plugins.autoloader) {
      Prism.plugins.autoloader.languages_path = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/";
    }

    // Load from shared URL hash first, else localStorage
    if (!loadFromHash()) {
      loadSavedContent();
    }

    renderPreview();
    updateStats();
    bindEvents();
  }

  // --- Persistence ---
  function loadSavedContent() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        editor.value = saved;
      }
    } catch (_) {
      // localStorage unavailable
    }
  }

  function saveContent() {
    try {
      localStorage.setItem(STORAGE_KEY, editor.value);
    } catch (_) {
      // quota exceeded or unavailable
    }
  }

  // --- Rendering ---
  function renderPreview() {
    const raw = editor.value;
    if (typeof marked === "undefined") {
      preview.innerHTML = "<p style='color:var(--text-muted)'>Loading markdown parser...</p>";
      return;
    }

    try {
      let html = marked.parse(raw);
      if (typeof DOMPurify !== "undefined") {
        html = DOMPurify.sanitize(html);
      }
      preview.innerHTML = html;

      // Syntax-highlight code blocks
      if (typeof Prism !== "undefined") {
        Prism.highlightAllUnder(preview);
      }

      // Render mermaid diagrams
      renderMermaidBlocks();

      // Update TOC if open
      if (tocPanel && !tocPanel.hidden) {
        buildToc();
      }

      status.textContent = "Updated";
      status.className = "pane-meta status-ready";
    } catch (err) {
      status.textContent = "Parse error";
      status.className = "pane-meta";
      status.style.color = "var(--error)";
    }
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 80);
  }

  // --- Stats ---
  function updateStats() {
    const text = editor.value;
    const chars = text.length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

    charCount.textContent = chars.toLocaleString() + " chars";
    wordCount.textContent = words.toLocaleString() + " words";
  }

  function updateLineInfo() {
    const val = editor.value;
    const pos = editor.selectionStart;
    const upToCursor = val.substring(0, pos);
    const line = (upToCursor.match(/\n/g) || []).length + 1;
    const lastNewline = upToCursor.lastIndexOf("\n");
    const col = pos - lastNewline;
    lineInfo.textContent = "Ln " + line + ", Col " + col;
  }

  // --- Event Binding ---
  function bindEvents() {
    // Editor input
    editor.addEventListener("input", function () {
      scheduleRender();
      updateStats();
      saveContent();
    });

    editor.addEventListener("keyup", updateLineInfo);
    editor.addEventListener("click", updateLineInfo);

    // Tab key support
    editor.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        scheduleRender();
        saveContent();
      }

      // Keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            insertFormat("**", "**");
            break;
          case "i":
            e.preventDefault();
            insertFormat("*", "*");
            break;
          case "k":
            e.preventDefault();
            insertFormat("[", "](url)");
            break;
          case "f":
            e.preventDefault();
            openFindBar();
            break;
        }
      }
    });

    // Toolbar buttons
    document.querySelectorAll(".toolbar-btn[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        handleToolbarAction(this.dataset.action);
      });
    });

    // Auto-pairing
    editor.addEventListener("keydown", handleAutoPair);

    // Paste image support
    editor.addEventListener("paste", handlePaste);

    // Theme & Share
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
    }
    if (shareBtn) {
      shareBtn.addEventListener("click", shareAsUrl);
    }

    // Zen mode
    if (zenBtn) {
      zenBtn.addEventListener("click", toggleZen);
    }

    // Find & Replace
    if (findBtn) {
      findBtn.addEventListener("click", openFindBar);
    }
    if (findClose) {
      findClose.addEventListener("click", closeFindBar);
    }
    if (findInput) {
      findInput.addEventListener("input", performFind);
      findInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.shiftKey ? findPrevMatch() : findNextMatch(); e.preventDefault(); }
        if (e.key === "Escape") closeFindBar();
      });
    }
    if (findNext) findNext.addEventListener("click", findNextMatch);
    if (findPrev) findPrev.addEventListener("click", findPrevMatch);
    if (findToggleReplace) {
      findToggleReplace.addEventListener("click", function () {
        replaceRow.hidden = !replaceRow.hidden;
        if (!replaceRow.hidden) replaceInput.focus();
      });
    }
    if (replaceOne) replaceOne.addEventListener("click", replaceCurrentMatch);
    if (replaceAllBtn) replaceAllBtn.addEventListener("click", replaceAllMatches);
    if (replaceInput) {
      replaceInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeFindBar();
      });
    }

    // Cheat sheet
    if (cheatsheetBtn) {
      cheatsheetBtn.addEventListener("click", function () { togglePanel(cheatsheetPanel); });
    }
    if (cheatsheetClose) {
      cheatsheetClose.addEventListener("click", function () { cheatsheetPanel.hidden = true; });
    }

    // Table of Contents
    if (tocBtn) {
      tocBtn.addEventListener("click", function () { togglePanel(tocPanel); });
    }
    if (tocClose) {
      tocClose.addEventListener("click", function () { tocPanel.hidden = true; });
    }

    // Guide
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

    // Version History
    if (historyBtn) {
      historyBtn.addEventListener("click", function () { togglePanel(historyPanel); });
    }
    if (historyClose) {
      historyClose.addEventListener("click", function () { historyPanel.hidden = true; });
    }
    if (historySave) {
      historySave.addEventListener("click", saveSnapshot);
    }

    // Global Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!findBar.hidden) closeFindBar();
        else if (!guideModal.hidden) closeGuide();
        else if (document.body.classList.contains("zen-mode")) exitZen();
        else {
          // Close any open panel
          [cheatsheetPanel, tocPanel, historyPanel].forEach(function (p) { p.hidden = true; });
        }
      }
    });

    // Action buttons
    exportBtn.addEventListener("click", exportPdf);
    clearBtn.addEventListener("click", clearEditor);
    uploadBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", handleFileUpload);
    copyHtmlBtn.addEventListener("click", copyHtml);
    downloadMdBtn.addEventListener("click", downloadMarkdown);

    // Mobile menu
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", function () {
        actionsNav.classList.toggle("open");
      });

      document.addEventListener("click", function (e) {
        if (!actionsNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
          actionsNav.classList.remove("open");
        }
      });
    }

    // Drag & drop
    bindDragDrop();

    // Pane resizer
    bindPaneResize();

    // Synchronized scrolling
    bindSyncScroll();
  }

  // --- Toolbar Actions ---
  function handleToolbarAction(action) {
    switch (action) {
      case "bold":       insertFormat("**", "**"); break;
      case "italic":     insertFormat("*", "*"); break;
      case "strikethrough": insertFormat("~~", "~~"); break;
      case "code":       insertFormat("`", "`"); break;
      case "h1":         insertLinePrefix("# "); break;
      case "h2":         insertLinePrefix("## "); break;
      case "h3":         insertLinePrefix("### "); break;
      case "ul":         insertLinePrefix("- "); break;
      case "ol":         insertLinePrefix("1. "); break;
      case "checklist":  insertLinePrefix("- [ ] "); break;
      case "blockquote": insertLinePrefix("> "); break;
      case "link":       insertFormat("[", "](url)"); break;
      case "image":      insertFormat("![alt](", ")"); break;
      case "hr":         insertBlock("\n---\n"); break;
      case "codeblock":  insertBlock("\n```\n\n```\n", 5); break;
      case "table":      insertTable(); break;
    }
    editor.focus();
  }

  function insertFormat(before, after) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.substring(start, end);
    const text = selected || "text";
    const replacement = before + text + after;

    editor.setRangeText(replacement, start, end, "select");

    if (!selected) {
      editor.selectionStart = start + before.length;
      editor.selectionEnd = start + before.length + text.length;
    }

    editor.dispatchEvent(new Event("input"));
  }

  function insertLinePrefix(prefix) {
    const start = editor.selectionStart;
    const val = editor.value;
    const lineStart = val.lastIndexOf("\n", start - 1) + 1;
    const beforeLine = val.substring(0, lineStart);
    const afterCursor = val.substring(start);
    const lineContent = val.substring(lineStart, start);

    editor.value = beforeLine + prefix + lineContent + afterCursor;
    editor.selectionStart = editor.selectionEnd = start + prefix.length;
    editor.dispatchEvent(new Event("input"));
  }

  function insertBlock(block, cursorOffset) {
    const start = editor.selectionStart;
    editor.setRangeText(block, start, editor.selectionEnd);
    editor.selectionStart = editor.selectionEnd = start + (cursorOffset || block.length);
    editor.dispatchEvent(new Event("input"));
  }

  function insertTable() {
    var table = "\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n";
    insertBlock(table);
  }

  // --- File Upload ---
  function handleFileUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    uploadedFileName = file.name;
    var reader = new FileReader();
    reader.onload = function (ev) {
      editor.value = ev.target.result;
      renderPreview();
      updateStats();
      saveContent();
      showToast("Loaded: " + file.name, "success");
    };
    reader.onerror = function () {
      showToast("Failed to read file", "error");
    };
    reader.readAsText(file);
    fileInput.value = "";
  }

  // --- Drag & Drop ---
  function bindDragDrop() {
    var dragCounter = 0;

    document.addEventListener("dragenter", function (e) {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        dropOverlay.hidden = false;
      }
    });

    document.addEventListener("dragleave", function (e) {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        dropOverlay.hidden = true;
      }
    });

    document.addEventListener("dragover", function (e) {
      e.preventDefault();
    });

    document.addEventListener("drop", function (e) {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.hidden = true;

      var files = e.dataTransfer.files;
      if (files.length === 0) return;

      var file = files[0];
      if (!file.name.match(/\.(md|markdown|mdown|mkd|txt)$/i)) {
        showToast("Please drop a Markdown (.md) file", "error");
        return;
      }

      uploadedFileName = file.name;
      var reader = new FileReader();
      reader.onload = function (ev) {
        editor.value = ev.target.result;
        renderPreview();
        updateStats();
        saveContent();
        showToast("Loaded: " + file.name, "success");
      };
      reader.readAsText(file);
    });
  }

  // --- Copy HTML ---
  function copyHtml() {
    if (typeof marked === "undefined") {
      showToast("Parser not loaded yet", "error");
      return;
    }

    var html = marked.parse(editor.value);
    if (typeof DOMPurify !== "undefined") {
      html = DOMPurify.sanitize(html);
    }

    navigator.clipboard.writeText(html).then(function () {
      showToast("HTML copied to clipboard", "success");
    }).catch(function () {
      showToast("Failed to copy", "error");
    });
  }

  // --- Download .md ---
  function downloadMarkdown() {
    var content = editor.value;
    if (!content.trim()) {
      showToast("Nothing to download", "error");
      return;
    }

    var blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = getDocumentName() + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded document.md", "success");
  }

  // --- Export PDF ---
  // Inline-style every element so html2canvas sees explicit colors regardless
  // of inherited dark-theme CSS. This is the only reliable approach because
  // html2canvas resolves computed styles from the live DOM, and our page uses
  // dark-theme CSS variables that would otherwise bleed through.
  function applyPdfInlineStyles(root) {
    // Root container
    root.style.cssText =
      "background:#fff;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont," +
      "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;" +
      "line-height:1.7;padding:8px;word-wrap:break-word;overflow-wrap:break-word;";

    // Force dark text on ALL descendants first (covers p, li, span, etc.)
    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var tag = el.tagName;

      // Skip elements that get specific colors below
      if (!tag) continue;

      // Default: dark text, transparent background
      if (!el.style.color) el.style.color = "#1a1a1a";
      if (!el.style.background) el.style.background = "transparent";
    }

    // Headings
    var headings = root.querySelectorAll("h1,h2,h3,h4,h5,h6");
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      h.style.color = "#111";
      h.style.fontWeight = "700";
      h.style.lineHeight = "1.3";
      h.style.marginTop = i === 0 && h.previousElementSibling === null ? "0" : "1.4em";
      h.style.marginBottom = "0.5em";
    }
    root.querySelectorAll("h1").forEach(function (el) {
      el.style.fontSize = "2em";
      el.style.letterSpacing = "-0.03em";
      el.style.borderBottom = "2px solid #e5e7eb";
      el.style.paddingBottom = "0.3em";
    });
    root.querySelectorAll("h2").forEach(function (el) {
      el.style.fontSize = "1.5em";
      el.style.letterSpacing = "-0.02em";
      el.style.borderBottom = "1px solid #e5e7eb";
      el.style.paddingBottom = "0.25em";
    });
    root.querySelectorAll("h3").forEach(function (el) { el.style.fontSize = "1.25em"; });
    root.querySelectorAll("h4").forEach(function (el) { el.style.fontSize = "1.1em"; });
    root.querySelectorAll("h6").forEach(function (el) { el.style.color = "#6b7280"; });

    // Paragraphs
    root.querySelectorAll("p").forEach(function (el) {
      el.style.marginBottom = "1em";
      el.style.color = "#1a1a1a";
    });

    // Strong
    root.querySelectorAll("strong,b").forEach(function (el) {
      el.style.color = "#111";
      el.style.fontWeight = "700";
    });

    // Del
    root.querySelectorAll("del,s").forEach(function (el) {
      el.style.color = "#9ca3af";
    });

    // Links
    root.querySelectorAll("a").forEach(function (el) {
      el.style.color = "#4f46e5";
      el.style.textDecoration = "none";
      el.style.borderBottom = "1px solid #a5b4fc";
    });

    // Inline code
    root.querySelectorAll("code").forEach(function (el) {
      if (el.parentElement && el.parentElement.tagName === "PRE") return;
      el.style.cssText =
        "font-family:SFMono-Regular,Consolas,'Liberation Mono',Menlo,Courier,monospace;" +
        "font-size:0.85em;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:4px;" +
        "padding:0.15em 0.4em;color:#c026d3;";
    });

    // Code blocks
    var tokenColorMap = {
      comment: "#6a737d", prolog: "#6a737d", doctype: "#6a737d", cdata: "#6a737d",
      punctuation: "#24292e",
      property: "#005cc5", tag: "#22863a", boolean: "#005cc5", number: "#005cc5",
      constant: "#005cc5", symbol: "#005cc5", deleted: "#b31d28",
      selector: "#22863a", "attr-name": "#6f42c1", string: "#032f62",
      char: "#032f62", builtin: "#005cc5", inserted: "#22863a",
      operator: "#d73a49", entity: "#d73a49", url: "#d73a49",
      atrule: "#d73a49", "attr-value": "#032f62", keyword: "#d73a49",
      function: "#6f42c1", "class-name": "#6f42c1",
      regex: "#e36209", important: "#e36209", variable: "#e36209"
    };

    root.querySelectorAll("pre").forEach(function (el) {
      el.style.cssText =
        "margin-bottom:1em;border-radius:8px;border:1px solid #e5e7eb;" +
        "background:#f8f9fa;overflow:hidden;";

      var code = el.querySelector("code");
      if (code) {
        code.style.cssText =
          "display:block;padding:14px 16px;background:transparent;border:none;" +
          "border-radius:0;font-size:0.8em;line-height:1.55;color:#1f2937;" +
          "font-family:SFMono-Regular,Consolas,'Liberation Mono',Menlo,Courier,monospace;" +
          "white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;";

        // Apply light colors to Prism token spans
        code.querySelectorAll(".token").forEach(function (tok) {
          var classes = tok.className.split(/\s+/);
          for (var c = 0; c < classes.length; c++) {
            if (tokenColorMap[classes[c]]) {
              tok.style.color = tokenColorMap[classes[c]];
              break;
            }
          }
        });
      }
    });

    // Blockquotes
    root.querySelectorAll("blockquote").forEach(function (el) {
      el.style.cssText =
        "margin:0 0 1em;padding:0.6em 1em;border-left:3px solid #6366f1;" +
        "background:#eef2ff;border-radius:0 6px 6px 0;color:#374151;";
      el.querySelectorAll("p").forEach(function (p) { p.style.color = "#374151"; });
    });

    // Lists
    root.querySelectorAll("ul,ol").forEach(function (el) {
      el.style.marginBottom = "1em";
      el.style.paddingLeft = "1.8em";
      el.style.color = "#1a1a1a";
    });
    root.querySelectorAll("li").forEach(function (el) {
      el.style.marginBottom = "0.3em";
      el.style.color = "#1a1a1a";
    });

    // HR
    root.querySelectorAll("hr").forEach(function (el) {
      el.style.cssText = "border:none;height:1px;background:#d1d5db;margin:1.5em 0;";
    });

    // Images
    root.querySelectorAll("img").forEach(function (el) {
      el.style.maxWidth = "100%";
      el.style.height = "auto";
      el.style.borderRadius = "8px";
    });

    // Tables
    root.querySelectorAll("table").forEach(function (el) {
      el.style.cssText =
        "width:100%;max-width:100%;border-collapse:collapse;margin-bottom:1em;" +
        "font-size:0.85em;table-layout:fixed;word-wrap:break-word;overflow-wrap:break-word;";
    });
    root.querySelectorAll("thead th").forEach(function (el) {
      el.style.cssText =
        "background:#f3f4f6;font-weight:600;text-align:left;" +
        "border-bottom:2px solid #d1d5db;padding:6px 10px;border:1px solid #e5e7eb;color:#111;";
    });
    root.querySelectorAll("td").forEach(function (el) {
      el.style.cssText = "padding:6px 10px;border:1px solid #e5e7eb;color:#1a1a1a;overflow:hidden;";
    });
    root.querySelectorAll("tbody tr:nth-child(even)").forEach(function (el) {
      el.style.background = "#f9fafb";
    });
  }

  function exportPdf() {
    if (typeof html2pdf === "undefined") {
      showToast("PDF exporter loading...", "error");
      return;
    }

    if (!editor.value.trim()) {
      showToast("Nothing to export", "error");
      return;
    }

    status.textContent = "Exporting...";
    status.className = "pane-meta";

    // Create a container at (0,0) behind the page. Position matters because
    // html2canvas captures at the element's actual DOM coordinates.
    var wrapper = document.createElement("div");
    wrapper.style.cssText =
      "position:fixed;left:0;top:0;z-index:-1;pointer-events:none;" +
      "background:#fff;overflow:hidden;";
    document.body.appendChild(wrapper);

    var root = document.createElement("div");
    root.innerHTML = preview.innerHTML;

    // Apply explicit inline styles to every element so html2canvas sees
    // the correct light-theme colors instead of inherited dark-theme ones.
    applyPdfInlineStyles(root);

    wrapper.appendChild(root);

    // Let the browser paint before capturing
    requestAnimationFrame(function () {
      setTimeout(function () {
        var options = {
          margin: [12, 12, 12, 12],
          filename: getDocumentName() + ".pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollX: 0,
            scrollY: 0,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        };

        html2pdf().set(options).from(root).save().then(function () {
          document.body.removeChild(wrapper);
          status.textContent = "PDF exported";
          status.className = "pane-meta status-ready";
          showToast("PDF exported successfully", "success");
        }).catch(function () {
          if (wrapper.parentNode) document.body.removeChild(wrapper);
          status.textContent = "Export failed";
          status.className = "pane-meta";
          showToast("PDF export failed", "error");
        });
      }, 100);
    });
  }

  // --- Clear ---
  function clearEditor() {
    if (editor.value.trim() && !confirm("Clear all content? This cannot be undone.")) {
      return;
    }
    editor.value = "";
    uploadedFileName = "";
    renderPreview();
    updateStats();
    saveContent();
    showToast("Editor cleared", "success");
  }

  // --- Pane Resize ---
  function bindPaneResize() {
    var isDragging = false;
    var startX = 0;
    var startEditorWidth = 0;

    paneDivider.addEventListener("mousedown", function (e) {
      isDragging = true;
      startX = e.clientX;
      startEditorWidth = editorPane.offsetWidth;
      paneDivider.classList.add("active");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!isDragging) return;
      var workspace = editorPane.parentElement;
      var totalWidth = workspace.offsetWidth - paneDivider.offsetWidth;
      var newEditorWidth = startEditorWidth + (e.clientX - startX);
      var minWidth = 200;

      newEditorWidth = Math.max(minWidth, Math.min(newEditorWidth, totalWidth - minWidth));

      var editorPct = (newEditorWidth / totalWidth) * 100;
      var previewPct = 100 - editorPct;

      editorPane.style.flex = "0 0 " + editorPct + "%";
      previewPane.style.flex = "0 0 " + previewPct + "%";
    });

    document.addEventListener("mouseup", function () {
      if (!isDragging) return;
      isDragging = false;
      paneDivider.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }

  // --- Synchronized Scrolling ---
  function bindSyncScroll() {
    var syncing = false;

    editor.addEventListener("scroll", function () {
      if (syncing) return;
      syncing = true;
      var pct = this.scrollTop / (this.scrollHeight - this.clientHeight || 1);
      preview.scrollTop = pct * (preview.scrollHeight - preview.clientHeight);
      requestAnimationFrame(function () { syncing = false; });
    });

    preview.addEventListener("scroll", function () {
      if (syncing) return;
      syncing = true;
      var pct = this.scrollTop / (this.scrollHeight - this.clientHeight || 1);
      editor.scrollTop = pct * (editor.scrollHeight - editor.clientHeight);
      requestAnimationFrame(function () { syncing = false; });
    });
  }

  // --- Toast ---
  function showToast(message, type) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    toastEl.className = "toast" + (type ? " toast-" + type : "");

    // Force reflow
    void toastEl.offsetWidth;
    toastEl.classList.add("show");

    setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () {
        toastEl.hidden = true;
      }, 200);
    }, 2500);
  }

  // --- Boot ---
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
