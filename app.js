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

  // --- Init ---
  function init() {
    loadSavedContent();
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
        }
      }
    });

    // Toolbar buttons
    document.querySelectorAll(".toolbar-btn[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        handleToolbarAction(this.dataset.action);
      });
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
