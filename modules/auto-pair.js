/* =========================================================
   Markdown Live Editor — modules/auto-pair.js
   Bracket/quote auto-pairing
   ========================================================= */

(function () {
  "use strict";

  var PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`", "*": "*", "~": "~" };

  function handleAutoPair(e) {
    var editor = document.getElementById("editor");
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

  window.MLE = window.MLE || {};
  window.MLE.handleAutoPair = handleAutoPair;
})();
