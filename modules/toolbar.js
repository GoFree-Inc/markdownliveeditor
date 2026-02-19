/* =========================================================
   MarkLiveEdit — modules/toolbar.js
   Toolbar actions, insertFormat, insertBlock
   ========================================================= */

(function () {
  "use strict";

  function insertFormat(before, after) {
    var editor = document.getElementById("editor");
    var start = editor.selectionStart;
    var end = editor.selectionEnd;
    var selected = editor.value.substring(start, end);
    var text = selected || "text";
    var replacement = before + text + after;

    editor.setRangeText(replacement, start, end, "select");

    if (!selected) {
      editor.selectionStart = start + before.length;
      editor.selectionEnd = start + before.length + text.length;
    }

    editor.dispatchEvent(new Event("input"));
  }

  function insertLinePrefix(prefix) {
    var editor = document.getElementById("editor");
    var start = editor.selectionStart;
    var val = editor.value;
    var lineStart = val.lastIndexOf("\n", start - 1) + 1;
    var beforeLine = val.substring(0, lineStart);
    var afterCursor = val.substring(start);
    var lineContent = val.substring(lineStart, start);

    editor.value = beforeLine + prefix + lineContent + afterCursor;
    editor.selectionStart = editor.selectionEnd = start + prefix.length;
    editor.dispatchEvent(new Event("input"));
  }

  function insertBlock(block, cursorOffset) {
    var editor = document.getElementById("editor");
    var start = editor.selectionStart;
    editor.setRangeText(block, start, editor.selectionEnd);
    editor.selectionStart = editor.selectionEnd = start + (cursorOffset || block.length);
    editor.dispatchEvent(new Event("input"));
  }

  function insertTable() {
    var table = "\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n";
    insertBlock(table);
  }

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
    document.getElementById("editor").focus();
  }

  function bindToolbar() {
    document.querySelectorAll(".toolbar-btn[data-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        handleToolbarAction(this.dataset.action);
      });
    });
  }

  window.MLE = window.MLE || {};
  window.MLE.insertFormat = insertFormat;
  window.MLE.insertBlock = insertBlock;
  window.MLE.handleToolbarAction = handleToolbarAction;
  window.MLE.bindToolbar = bindToolbar;
})();
