/* =========================================================
   Markdown Live Editor — modules/theme.js
   Theme toggle with localStorage persistence
   ========================================================= */

(function () {
  "use strict";

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

  window.MLE = window.MLE || {};
  window.MLE.getPreferredTheme = getPreferredTheme;
  window.MLE.applyTheme = applyTheme;
  window.MLE.toggleTheme = toggleTheme;
})();
