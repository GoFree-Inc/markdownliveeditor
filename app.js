/* =========================================================
   Markdown Live Editor — app.js (Core)
   Free Online Markdown Editor with Live Preview
   Modules loaded via MLE namespace from /modules/*.js
   ========================================================= */

(function () {
  "use strict";

  // --- Ensure MLE namespace ---
  window.MLE = window.MLE || {};

  // --- DOM refs ---
  var editor = document.getElementById("editor");
  var preview = document.getElementById("preview");
  var charCount = document.getElementById("char-count");
  var wordCount = document.getElementById("word-count");
  var lineInfo = document.getElementById("line-info");
  var status = document.getElementById("status");
  var themeToggle = document.getElementById("theme-toggle");
  var shareBtn = document.getElementById("share-btn");
  var findBar = document.getElementById("find-bar");
  var guideModal = document.getElementById("guide-modal");
  var cheatsheetPanel = document.getElementById("cheatsheet-panel");
  var tocPanel = document.getElementById("toc-panel");
  var historyPanel = document.getElementById("history-panel");

  // --- Marked config ---
  if (typeof marked !== "undefined") {
    marked.setOptions({ breaks: true, gfm: true });
  }

  // --- State ---
  var STORAGE_KEY = "marklivedit_content";
  var renderTimer = null;

  // --- Persistence ---
  function loadSavedContent() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        editor.value = saved;
      }
    } catch (_) {}
  }

  function saveContent() {
    try {
      localStorage.setItem(STORAGE_KEY, editor.value);
    } catch (_) {}
  }

  // --- Rendering ---
  function renderPreview() {
    var raw = editor.value;
    if (typeof marked === "undefined") {
      preview.innerHTML = "<p style='color:var(--text-muted)'>Loading markdown parser...</p>";
      return;
    }

    try {
      var html = marked.parse(raw);
      if (typeof DOMPurify !== "undefined") {
        html = DOMPurify.sanitize(html);
      }
      preview.innerHTML = html;

      if (typeof Prism !== "undefined") {
        Prism.highlightAllUnder(preview);
      }

      if (MLE.renderMermaidBlocks) MLE.renderMermaidBlocks();

      if (tocPanel && !tocPanel.hidden && MLE.buildToc) {
        MLE.buildToc();
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
    var text = editor.value;
    var chars = text.length;
    var words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

    charCount.textContent = chars.toLocaleString() + " chars";
    wordCount.textContent = words.toLocaleString() + " words";
  }

  function updateLineInfo() {
    var val = editor.value;
    var pos = editor.selectionStart;
    var upToCursor = val.substring(0, pos);
    var line = (upToCursor.match(/\n/g) || []).length + 1;
    var lastNewline = upToCursor.lastIndexOf("\n");
    var col = pos - lastNewline;
    lineInfo.textContent = "Ln " + line + ", Col " + col;
  }

  // --- Expose shared functions on MLE namespace ---
  MLE.renderPreview = renderPreview;
  MLE.scheduleRender = scheduleRender;
  MLE.saveContent = saveContent;
  MLE.updateStats = updateStats;

  // --- Event Binding ---
  function bindEvents() {
    // Editor input
    editor.addEventListener("input", function () {
      scheduleRender();
      updateStats();
      MLE.saveContent(); // Use MLE.saveContent which may be overridden by tabs
    });

    editor.addEventListener("keyup", updateLineInfo);
    editor.addEventListener("click", updateLineInfo);

    // Tab key + keyboard shortcuts
    editor.addEventListener("keydown", function (e) {
      // Check if vim/emacs mode is active and in non-insert mode
      if (MLE.getKeyMode && MLE.getKeyMode() === "vim") {
        // Vim handles its own keys in normal/visual mode
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        var start = this.selectionStart;
        var end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "  " + this.value.substring(end);
        this.selectionStart = this.selectionEnd = start + 2;
        scheduleRender();
        MLE.saveContent();
      }

      // Keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        // Skip if emacs mode handles these
        if (MLE.getKeyMode && MLE.getKeyMode() === "emacs") {
          if (["b", "k", "f"].indexOf(e.key.toLowerCase()) !== -1) return;
        }

        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            MLE.insertFormat("**", "**");
            break;
          case "i":
            e.preventDefault();
            MLE.insertFormat("*", "*");
            break;
          case "k":
            e.preventDefault();
            MLE.insertFormat("[", "](url)");
            break;
          case "f":
            e.preventDefault();
            if (MLE.openFindBar) MLE.openFindBar();
            break;
        }
      }
    });

    // Auto-pairing
    if (MLE.handleAutoPair) {
      editor.addEventListener("keydown", MLE.handleAutoPair);
    }

    // Theme & Share
    if (themeToggle && MLE.toggleTheme) {
      themeToggle.addEventListener("click", MLE.toggleTheme);
    }
    if (shareBtn && MLE.shareAsUrl) {
      shareBtn.addEventListener("click", MLE.shareAsUrl);
    }

    // Module bindings
    if (MLE.bindDropdowns) MLE.bindDropdowns();
    if (MLE.bindToolbar) MLE.bindToolbar();
    if (MLE.bindFindReplace) MLE.bindFindReplace();
    if (MLE.bindFileOps) MLE.bindFileOps();
    if (MLE.bindPanels) MLE.bindPanels();
    if (MLE.bindHistory) MLE.bindHistory();
    if (MLE.bindEditorUI) MLE.bindEditorUI();
    if (MLE.bindPresentation) MLE.bindPresentation();
    if (MLE.bindKeybindings) MLE.bindKeybindings();
    if (MLE.bindCollab) MLE.bindCollab();
    if (MLE.bindUrlToMd) MLE.bindUrlToMd();

    // Global Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        // Presentation mode handles its own Escape via capture phase
        if (MLE.isPresActive && MLE.isPresActive()) return;
        // Close open dropdown first
        if (document.querySelector(".dropdown.open")) {
          MLE.closeAllDropdowns();
          return;
        }
        if (findBar && !findBar.hidden && MLE.closeFindBar) MLE.closeFindBar();
        else if (guideModal && !guideModal.hidden && MLE.closeGuide) MLE.closeGuide();
        else if (!document.getElementById("url-to-md-modal").hidden) document.getElementById("url-to-md-modal").hidden = true;
        else if (document.body.classList.contains("zen-mode") && MLE.exitZen) MLE.exitZen();
        else {
          var panels = [cheatsheetPanel, tocPanel, historyPanel];
          var collabPanel = document.getElementById("collab-panel");
          if (collabPanel) panels.push(collabPanel);
          panels.forEach(function (p) { if (p) p.hidden = true; });
        }
      }
    });
  }

  // --- Init ---
  function init() {
    if (MLE.applyTheme && MLE.getPreferredTheme) {
      MLE.applyTheme(MLE.getPreferredTheme());
    }

    // Configure Mermaid
    if (typeof mermaid !== "undefined") {
      mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
    }

    // Configure Prism autoloader
    if (typeof Prism !== "undefined" && Prism.plugins && Prism.plugins.autoloader) {
      Prism.plugins.autoloader.languages_path = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/";
    }

    // Initialize tabs (loads content)
    if (MLE.initTabs) {
      MLE.initTabs();
    } else {
      // Fallback: load from hash or localStorage
      if (MLE.loadFromHash && !MLE.loadFromHash()) {
        loadSavedContent();
      }
    }

    // Load from hash if present (overrides tab content)
    if (MLE.loadFromHash) {
      MLE.loadFromHash();
    }

    renderPreview();
    updateStats();
    bindEvents();
  }

  // --- Boot ---
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
