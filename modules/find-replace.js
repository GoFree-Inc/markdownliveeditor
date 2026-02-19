/* =========================================================
   MarkLiveEdit — modules/find-replace.js
   Find bar, match navigation, replace
   ========================================================= */

(function () {
  "use strict";

  var findMatches = [];
  var findCurrentIndex = -1;

  function getFindEls() {
    return {
      editor: document.getElementById("editor"),
      findBar: document.getElementById("find-bar"),
      findInput: document.getElementById("find-input"),
      findCount: document.getElementById("find-count"),
      replaceRow: document.getElementById("replace-row"),
      replaceInput: document.getElementById("replace-input")
    };
  }

  function openFindBar() {
    var els = getFindEls();
    els.findBar.hidden = false;
    els.findInput.focus();
    els.findInput.select();
  }

  function closeFindBar() {
    var els = getFindEls();
    els.findBar.hidden = true;
    els.replaceRow.hidden = true;
    findMatches = [];
    findCurrentIndex = -1;
    els.findCount.textContent = "0/0";
    els.editor.focus();
  }

  function performFind() {
    var els = getFindEls();
    var query = els.findInput.value;
    findMatches = [];
    findCurrentIndex = -1;

    if (!query) {
      els.findCount.textContent = "0/0";
      return;
    }

    var text = els.editor.value;
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
    var els = getFindEls();
    var idx = findMatches[findCurrentIndex];
    var len = els.findInput.value.length;
    els.editor.focus();
    els.editor.setSelectionRange(idx, idx + len);

    var linesBefore = els.editor.value.substring(0, idx).split("\n").length;
    var lineHeight = parseFloat(getComputedStyle(els.editor).lineHeight) || 20;
    els.editor.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
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
    var els = getFindEls();
    if (findMatches.length === 0) {
      els.findCount.textContent = "0/0";
    } else {
      els.findCount.textContent = (findCurrentIndex + 1) + "/" + findMatches.length;
    }
  }

  function replaceCurrentMatch() {
    if (findCurrentIndex < 0 || findCurrentIndex >= findMatches.length) return;
    var els = getFindEls();
    var idx = findMatches[findCurrentIndex];
    var query = els.findInput.value;
    var replacement = els.replaceInput.value;
    var text = els.editor.value;

    els.editor.value = text.substring(0, idx) + replacement + text.substring(idx + query.length);
    els.editor.dispatchEvent(new Event("input"));
    performFind();
  }

  function replaceAllMatches() {
    var els = getFindEls();
    var query = els.findInput.value;
    if (!query) return;
    var replacement = els.replaceInput.value;
    var text = els.editor.value;
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    els.editor.value = text.replace(new RegExp(escaped, "gi"), replacement);
    els.editor.dispatchEvent(new Event("input"));
    performFind();
    MLE.showToast("Replaced all occurrences", "success");
  }

  function bindFindReplace() {
    var findBtn = document.getElementById("find-btn");
    var findClose = document.getElementById("find-close");
    var findInput = document.getElementById("find-input");
    var findNext = document.getElementById("find-next");
    var findPrev = document.getElementById("find-prev");
    var findToggleReplace = document.getElementById("find-toggle-replace");
    var replaceOne = document.getElementById("replace-one");
    var replaceAllBtn = document.getElementById("replace-all-btn");
    var replaceInput = document.getElementById("replace-input");
    var replaceRow = document.getElementById("replace-row");

    if (findBtn) findBtn.addEventListener("click", openFindBar);
    if (findClose) findClose.addEventListener("click", closeFindBar);
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
  }

  window.MLE = window.MLE || {};
  window.MLE.openFindBar = openFindBar;
  window.MLE.closeFindBar = closeFindBar;
  window.MLE.bindFindReplace = bindFindReplace;
})();
