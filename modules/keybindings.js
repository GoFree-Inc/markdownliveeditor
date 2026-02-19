/* =========================================================
   MarkLiveEdit — modules/keybindings.js
   Feature 13: Vim/Emacs Keybindings
   ========================================================= */

(function () {
  "use strict";

  var KEY_MODE_KEY = "marklivedit_keymode";
  var MODES = ["normal", "vim", "emacs"];
  var keyMode = "normal"; // normal | vim | emacs
  var vimMode = "normal"; // normal | insert | visual
  var yankBuffer = "";
  var visualStart = -1;

  function getKeyMode() {
    try {
      var saved = localStorage.getItem(KEY_MODE_KEY);
      if (saved && MODES.indexOf(saved) !== -1) return saved;
    } catch (_) {}
    return "normal";
  }

  function setKeyMode(mode) {
    keyMode = mode;
    try { localStorage.setItem(KEY_MODE_KEY, mode); } catch (_) {}
    updateModeIndicator();
    updateKeybindBtn();
    if (mode === "vim") {
      vimMode = "normal";
    }
  }

  function cycleKeyMode() {
    var idx = MODES.indexOf(keyMode);
    var next = MODES[(idx + 1) % MODES.length];
    setKeyMode(next);
    MLE.showToast("Keybinding mode: " + next.charAt(0).toUpperCase() + next.slice(1), "success");
  }

  function updateModeIndicator() {
    var indicator = document.getElementById("keymode-indicator");
    if (!indicator) return;

    if (keyMode === "vim") {
      indicator.hidden = false;
      switch (vimMode) {
        case "normal": indicator.textContent = "-- NORMAL --"; break;
        case "insert": indicator.textContent = "-- INSERT --"; break;
        case "visual": indicator.textContent = "-- VISUAL --"; break;
      }
    } else if (keyMode === "emacs") {
      indicator.hidden = false;
      indicator.textContent = "-- EMACS --";
    } else {
      indicator.hidden = true;
    }
  }

  function updateKeybindBtn() {
    var btn = document.getElementById("keybind-btn");
    if (!btn) return;
    var label = btn.querySelector("span");
    if (label) {
      switch (keyMode) {
        case "normal": label.textContent = "Keys"; break;
        case "vim": label.textContent = "Vim"; break;
        case "emacs": label.textContent = "Emacs"; break;
      }
    }
  }

  // --- Vim Handler ---
  function getLineInfo(editor) {
    var val = editor.value;
    var pos = editor.selectionStart;
    var lines = val.split("\n");
    var lineIdx = val.substring(0, pos).split("\n").length - 1;
    var lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    var lineEnd = val.indexOf("\n", pos);
    if (lineEnd === -1) lineEnd = val.length;
    return { lineIdx: lineIdx, lineStart: lineStart, lineEnd: lineEnd, lines: lines, pos: pos };
  }

  var pendingKey = "";

  function handleVimKeydown(e) {
    var editor = document.getElementById("editor");
    if (e.target !== editor) return;

    if (vimMode === "insert") {
      if (e.key === "Escape") {
        e.preventDefault();
        vimMode = "normal";
        updateModeIndicator();
        // Move cursor one back like real vim
        if (editor.selectionStart > 0) {
          editor.selectionStart = editor.selectionEnd = editor.selectionStart - 1;
        }
      }
      return; // Let normal typing through in insert mode
    }

    if (vimMode === "visual") {
      var info = getLineInfo(editor);
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          vimMode = "normal";
          editor.selectionEnd = editor.selectionStart;
          updateModeIndicator();
          return;
        case "h":
          e.preventDefault();
          if (editor.selectionEnd > 0) editor.selectionEnd--;
          return;
        case "l":
          e.preventDefault();
          if (editor.selectionEnd < editor.value.length) editor.selectionEnd++;
          return;
        case "j":
          e.preventDefault();
          moveSelectionDown(editor);
          return;
        case "k":
          e.preventDefault();
          moveSelectionUp(editor);
          return;
        case "d":
        case "x":
          e.preventDefault();
          yankBuffer = editor.value.substring(editor.selectionStart, editor.selectionEnd);
          editor.setRangeText("", editor.selectionStart, editor.selectionEnd);
          editor.dispatchEvent(new Event("input"));
          vimMode = "normal";
          updateModeIndicator();
          return;
        case "y":
          e.preventDefault();
          yankBuffer = editor.value.substring(editor.selectionStart, editor.selectionEnd);
          editor.selectionEnd = editor.selectionStart;
          vimMode = "normal";
          updateModeIndicator();
          MLE.showToast("Yanked", "success");
          return;
      }
      return;
    }

    // Normal mode
    e.preventDefault();
    var val = editor.value;
    var pos = editor.selectionStart;
    var info = getLineInfo(editor);

    // Handle two-key sequences
    if (pendingKey) {
      var combo = pendingKey + e.key;
      pendingKey = "";
      switch (combo) {
        case "dd":
          yankBuffer = info.lines[info.lineIdx] + "\n";
          var deleteStart = info.lineStart;
          var deleteEnd = info.lineEnd < val.length ? info.lineEnd + 1 : info.lineEnd;
          editor.value = val.substring(0, deleteStart) + val.substring(deleteEnd);
          editor.selectionStart = editor.selectionEnd = deleteStart;
          editor.dispatchEvent(new Event("input"));
          return;
        case "yy":
          yankBuffer = info.lines[info.lineIdx] + "\n";
          MLE.showToast("Line yanked", "success");
          return;
        case "gg":
          editor.selectionStart = editor.selectionEnd = 0;
          editor.scrollTop = 0;
          return;
      }
      return;
    }

    switch (e.key) {
      // Movement
      case "h":
        if (pos > 0) editor.selectionStart = editor.selectionEnd = pos - 1;
        break;
      case "j":
        moveCursorDown(editor);
        break;
      case "k":
        moveCursorUp(editor);
        break;
      case "l":
        if (pos < val.length) editor.selectionStart = editor.selectionEnd = pos + 1;
        break;

      // Word movement
      case "w":
        var nextWord = val.substring(pos).search(/\b\w/);
        if (nextWord > 0) editor.selectionStart = editor.selectionEnd = pos + nextWord;
        else if (nextWord === 0) {
          var next2 = val.substring(pos + 1).search(/\b\w/);
          if (next2 >= 0) editor.selectionStart = editor.selectionEnd = pos + 1 + next2;
        }
        break;
      case "b":
        var before = val.substring(0, pos);
        var prevWord = before.search(/\w+\s*$/);
        if (prevWord >= 0) editor.selectionStart = editor.selectionEnd = prevWord;
        break;

      // Line movement
      case "0":
        editor.selectionStart = editor.selectionEnd = info.lineStart;
        break;
      case "$":
        editor.selectionStart = editor.selectionEnd = info.lineEnd;
        break;
      case "^":
        var firstNonSpace = val.substring(info.lineStart, info.lineEnd).search(/\S/);
        editor.selectionStart = editor.selectionEnd = info.lineStart + (firstNonSpace >= 0 ? firstNonSpace : 0);
        break;

      // Insert mode entries
      case "i":
        vimMode = "insert";
        updateModeIndicator();
        break;
      case "a":
        vimMode = "insert";
        if (pos < val.length) editor.selectionStart = editor.selectionEnd = pos + 1;
        updateModeIndicator();
        break;
      case "o":
        vimMode = "insert";
        editor.setRangeText("\n", info.lineEnd, info.lineEnd);
        editor.selectionStart = editor.selectionEnd = info.lineEnd + 1;
        editor.dispatchEvent(new Event("input"));
        updateModeIndicator();
        break;
      case "O":
        vimMode = "insert";
        editor.setRangeText("\n", info.lineStart, info.lineStart);
        editor.selectionStart = editor.selectionEnd = info.lineStart;
        editor.dispatchEvent(new Event("input"));
        updateModeIndicator();
        break;
      case "A":
        vimMode = "insert";
        editor.selectionStart = editor.selectionEnd = info.lineEnd;
        updateModeIndicator();
        break;
      case "I":
        vimMode = "insert";
        var fns = val.substring(info.lineStart, info.lineEnd).search(/\S/);
        editor.selectionStart = editor.selectionEnd = info.lineStart + (fns >= 0 ? fns : 0);
        updateModeIndicator();
        break;

      // Delete/change
      case "x":
        if (pos < val.length && val[pos] !== "\n") {
          editor.value = val.substring(0, pos) + val.substring(pos + 1);
          editor.selectionStart = editor.selectionEnd = pos;
          editor.dispatchEvent(new Event("input"));
        }
        break;

      // Paste
      case "p":
        if (yankBuffer) {
          var insertPos = yankBuffer.endsWith("\n") ? info.lineEnd + 1 : pos + 1;
          insertPos = Math.min(insertPos, val.length);
          editor.setRangeText(yankBuffer, insertPos, insertPos);
          editor.selectionStart = editor.selectionEnd = insertPos + yankBuffer.length;
          editor.dispatchEvent(new Event("input"));
        }
        break;
      case "P":
        if (yankBuffer) {
          var iPos = yankBuffer.endsWith("\n") ? info.lineStart : pos;
          editor.setRangeText(yankBuffer, iPos, iPos);
          editor.selectionStart = editor.selectionEnd = iPos + yankBuffer.length;
          editor.dispatchEvent(new Event("input"));
        }
        break;

      // Visual mode
      case "v":
        vimMode = "visual";
        visualStart = pos;
        updateModeIndicator();
        break;

      // Top/bottom
      case "G":
        editor.selectionStart = editor.selectionEnd = val.length;
        editor.scrollTop = editor.scrollHeight;
        break;

      // Search (open find bar)
      case "/":
        MLE.openFindBar();
        vimMode = "insert"; // Allow typing in find bar
        updateModeIndicator();
        break;

      // Two-key sequences
      case "d":
      case "y":
      case "g":
        pendingKey = e.key;
        break;

      // Undo/Redo - allow default
      case "u":
        document.execCommand("undo");
        break;
    }
  }

  function moveCursorDown(editor) {
    var info = getLineInfo(editor);
    var col = info.pos - info.lineStart;
    if (info.lineEnd < editor.value.length) {
      var nextLineStart = info.lineEnd + 1;
      var nextLineEnd = editor.value.indexOf("\n", nextLineStart);
      if (nextLineEnd === -1) nextLineEnd = editor.value.length;
      var newPos = Math.min(nextLineStart + col, nextLineEnd);
      editor.selectionStart = editor.selectionEnd = newPos;
    }
  }

  function moveCursorUp(editor) {
    var info = getLineInfo(editor);
    var col = info.pos - info.lineStart;
    if (info.lineStart > 0) {
      var prevLineEnd = info.lineStart - 1;
      var prevLineStart = editor.value.lastIndexOf("\n", prevLineEnd - 1) + 1;
      var newPos = Math.min(prevLineStart + col, prevLineEnd);
      editor.selectionStart = editor.selectionEnd = newPos;
    }
  }

  function moveSelectionDown(editor) {
    var pos = editor.selectionEnd;
    var val = editor.value;
    var lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    var lineEnd = val.indexOf("\n", pos);
    if (lineEnd === -1) lineEnd = val.length;
    var col = pos - lineStart;
    if (lineEnd < val.length) {
      var nextLineStart = lineEnd + 1;
      var nextLineEnd = val.indexOf("\n", nextLineStart);
      if (nextLineEnd === -1) nextLineEnd = val.length;
      editor.selectionEnd = Math.min(nextLineStart + col, nextLineEnd);
    }
  }

  function moveSelectionUp(editor) {
    var pos = editor.selectionEnd;
    var val = editor.value;
    var lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    var col = pos - lineStart;
    if (lineStart > 0) {
      var prevLineEnd = lineStart - 1;
      var prevLineStart = val.lastIndexOf("\n", prevLineEnd - 1) + 1;
      editor.selectionEnd = Math.min(prevLineStart + col, prevLineEnd);
    }
  }

  // --- Emacs Handler ---
  function handleEmacsKeydown(e) {
    var editor = document.getElementById("editor");
    if (e.target !== editor) return;
    if (!e.ctrlKey) return;

    var val = editor.value;
    var pos = editor.selectionStart;
    var info = getLineInfo(editor);

    switch (e.key) {
      case "a": // Beginning of line
        e.preventDefault();
        editor.selectionStart = editor.selectionEnd = info.lineStart;
        break;
      case "e": // End of line
        e.preventDefault();
        editor.selectionStart = editor.selectionEnd = info.lineEnd;
        break;
      case "k": // Kill to end of line
        e.preventDefault();
        yankBuffer = val.substring(pos, info.lineEnd);
        editor.value = val.substring(0, pos) + val.substring(info.lineEnd);
        editor.selectionStart = editor.selectionEnd = pos;
        editor.dispatchEvent(new Event("input"));
        break;
      case "y": // Yank (paste killed text)
        e.preventDefault();
        if (yankBuffer) {
          editor.setRangeText(yankBuffer, pos, pos);
          editor.selectionStart = editor.selectionEnd = pos + yankBuffer.length;
          editor.dispatchEvent(new Event("input"));
        }
        break;
      case "n": // Next line
        e.preventDefault();
        moveCursorDown(editor);
        break;
      case "p": // Previous line
        e.preventDefault();
        moveCursorUp(editor);
        break;
      case "f": // Forward one char
        e.preventDefault();
        if (pos < val.length) editor.selectionStart = editor.selectionEnd = pos + 1;
        break;
      case "b": // Back one char
        e.preventDefault();
        if (pos > 0) editor.selectionStart = editor.selectionEnd = pos - 1;
        break;
      case "d": // Delete forward
        e.preventDefault();
        if (pos < val.length) {
          editor.value = val.substring(0, pos) + val.substring(pos + 1);
          editor.selectionStart = editor.selectionEnd = pos;
          editor.dispatchEvent(new Event("input"));
        }
        break;
    }
  }

  // --- Master Key Handler (capture phase) ---
  function masterKeyHandler(e) {
    if (keyMode === "vim") {
      handleVimKeydown(e);
    } else if (keyMode === "emacs") {
      handleEmacsKeydown(e);
    }
  }

  function bindKeybindings() {
    keyMode = getKeyMode();

    var btn = document.getElementById("keybind-btn");
    if (btn) {
      btn.addEventListener("click", cycleKeyMode);
    }

    // Use capture phase to intercept before other handlers
    document.addEventListener("keydown", masterKeyHandler, true);

    updateModeIndicator();
    updateKeybindBtn();
  }

  window.MLE = window.MLE || {};
  window.MLE.bindKeybindings = bindKeybindings;
  window.MLE.getKeyMode = function () { return keyMode; };
})();
