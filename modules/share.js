/* =========================================================
   Markdown Live Editor — modules/share.js
   URL sharing with LZString compression
   ========================================================= */

(function () {
  "use strict";

  function shareAsUrl() {
    var editor = document.getElementById("editor");
    var content = editor.value;
    if (!content.trim()) {
      MLE.showToast("Nothing to share", "error");
      return;
    }

    if (typeof LZString === "undefined") {
      MLE.showToast("Share library loading...", "error");
      return;
    }

    var compressed = LZString.compressToEncodedURIComponent(content);
    var hash = "#doc=" + compressed;
    var fullUrl = window.location.origin + window.location.pathname + hash;

    if (fullUrl.length > 8000) {
      MLE.showToast("Content may be too large for URL sharing (>8KB)", "warning");
    }

    window.history.replaceState(null, "", hash);
    navigator.clipboard.writeText(fullUrl).then(function () {
      MLE.showToast("Share link copied to clipboard", "success");
    }).catch(function () {
      MLE.showToast("URL updated — copy it from the address bar", "success");
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
        var editor = document.getElementById("editor");
        editor.value = content;
        MLE.saveContent();
        window.history.replaceState(null, "", window.location.pathname);
        return true;
      }
    } catch (_) {}
    return false;
  }

  window.MLE = window.MLE || {};
  window.MLE.shareAsUrl = shareAsUrl;
  window.MLE.loadFromHash = loadFromHash;
})();
