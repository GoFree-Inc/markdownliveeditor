/* =========================================================
   MarkLiveEdit — modules/editor-ui.js
   Pane resize, sync scroll, toast, zen mode
   ========================================================= */

(function () {
  "use strict";

  // --- Toast ---
  function showToast(message, type) {
    var toastEl = document.getElementById("toast");
    toastEl.textContent = message;
    toastEl.hidden = false;
    toastEl.className = "toast" + (type ? " toast-" + type : "");

    void toastEl.offsetWidth;
    toastEl.classList.add("show");

    setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () {
        toastEl.hidden = true;
      }, 200);
    }, 2500);
  }

  // --- Zen Mode ---
  function toggleZen() {
    document.body.classList.toggle("zen-mode");
  }

  function exitZen() {
    document.body.classList.remove("zen-mode");
  }

  // --- Pane Resize ---
  function bindPaneResize() {
    var paneDivider = document.getElementById("pane-divider");
    var editorPane = document.getElementById("editor-pane");
    var previewPane = document.getElementById("preview-pane");
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
    var editor = document.getElementById("editor");
    var preview = document.getElementById("preview");
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

  // --- Mobile Menu ---
  function bindMobileMenu() {
    var mobileMenuBtn = document.getElementById("mobile-menu-btn");
    var actionsNav = document.querySelector(".actions");

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
  }

  function bindEditorUI() {
    var zenBtn = document.getElementById("zen-btn");
    if (zenBtn) {
      zenBtn.addEventListener("click", toggleZen);
    }

    bindPaneResize();
    bindSyncScroll();
    bindMobileMenu();
  }

  window.MLE = window.MLE || {};
  window.MLE.showToast = showToast;
  window.MLE.toggleZen = toggleZen;
  window.MLE.exitZen = exitZen;
  window.MLE.bindEditorUI = bindEditorUI;
})();
