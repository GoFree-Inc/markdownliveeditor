/* =========================================================
   Markdown Live Editor — modules/presentation.js
   Feature 15: Presentation Mode — bespoke slide deck
   ========================================================= */

(function () {
  "use strict";

  var slides = [];
  var currentSlide = 0;
  var slideDirection = 0; // -1 = left, 1 = right, 0 = none
  var touchStartX = 0;
  var isActive = false;

  // ---- Slide parsing ----
  function parseSlides(markdown) {
    // Split on --- that appears on its own line (with optional whitespace)
    // Handles start-of-doc, end-of-doc, trailing spaces, Windows \r\n
    var parts = markdown.split(/^[ \t]*---[ \t]*$/m);
    return parts
      .map(function (p) { return p.replace(/^\r?\n|\r?\n$/g, "").trim(); })
      .filter(function (p) { return p.length > 0; });
  }

  function renderSlideHTML(markdown) {
    if (typeof marked === "undefined") return "<p>" + markdown + "</p>";
    var html = marked.parse(markdown);
    if (typeof DOMPurify !== "undefined") html = DOMPurify.sanitize(html);
    return html;
  }

  // ---- Slide rendering ----
  function showSlide(index, direction) {
    var content = document.getElementById("pres-slide-content");
    var counter = document.getElementById("pres-counter");
    var progress = document.getElementById("pres-progress-fill");
    if (!content) return;

    currentSlide = Math.max(0, Math.min(index, slides.length - 1));
    slideDirection = direction || 0;

    // Set transition direction class
    content.className = "pres-slide-inner";
    if (slideDirection !== 0) {
      void content.offsetWidth; // reflow
      content.classList.add(slideDirection > 0 ? "slide-in-right" : "slide-in-left");
    } else {
      content.classList.add("slide-in-up");
    }

    content.innerHTML = renderSlideHTML(slides[currentSlide]);

    // Counter
    if (counter) counter.textContent = (currentSlide + 1) + " / " + slides.length;

    // Progress bar
    if (progress) {
      var pct = slides.length <= 1 ? 100 : ((currentSlide) / (slides.length - 1)) * 100;
      progress.style.width = pct + "%";
    }

    // Syntax highlighting
    if (typeof Prism !== "undefined") Prism.highlightAllUnder(content);

    // Mermaid
    if (typeof mermaid !== "undefined") {
      var blocks = content.querySelectorAll("code.language-mermaid");
      blocks.forEach(function (code, i) {
        var pre = code.parentElement;
        if (!pre || pre.tagName !== "PRE") return;
        var graphDef = code.textContent;
        var container = document.createElement("div");
        container.className = "mermaid-container";
        var id = "pres-mermaid-" + Date.now() + "-" + i;
        try {
          mermaid.render(id, graphDef).then(function (result) {
            container.innerHTML = result.svg;
            if (pre.parentNode) pre.parentNode.replaceChild(container, pre);
          }).catch(function () {});
        } catch (_) {}
      });
    }

    // Update nav button states
    var prevBtn = document.getElementById("pres-prev");
    var nextBtn = document.getElementById("pres-next");
    if (prevBtn) prevBtn.disabled = currentSlide === 0;
    if (nextBtn) nextBtn.disabled = currentSlide === slides.length - 1;
  }

  function nextSlide() {
    if (currentSlide < slides.length - 1) showSlide(currentSlide + 1, 1);
  }

  function prevSlide() {
    if (currentSlide > 0) showSlide(currentSlide - 1, -1);
  }

  // ---- Enter / Exit ----
  function enterPresentation() {
    var editor = document.getElementById("editor");
    var content = editor.value.trim();
    if (!content) {
      MLE.showToast("Nothing to present", "error");
      return;
    }

    slides = parseSlides(content);
    if (slides.length === 0) {
      MLE.showToast("No slide content found. Separate slides with ---", "warning");
      return;
    }

    isActive = true;
    currentSlide = 0;

    var overlay = document.getElementById("pres-overlay");
    overlay.hidden = false;
    document.body.classList.add("pres-active");

    showSlide(0, 0);

    // Try fullscreen (non-blocking — presentation works without it)
    try {
      if (overlay.requestFullscreen) overlay.requestFullscreen().catch(function () {});
      else if (overlay.webkitRequestFullscreen) overlay.webkitRequestFullscreen();
    } catch (_) {}
  }

  function exitPresentation() {
    if (!isActive) return;
    isActive = false;

    var overlay = document.getElementById("pres-overlay");
    overlay.hidden = true;
    document.body.classList.remove("pres-active");
    slides = [];
    currentSlide = 0;

    // Exit fullscreen only if we're in it
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
    } catch (_) {}
  }

  // ---- Keyboard handling ----
  // Registered on CAPTURE phase at highest priority so vim/emacs can't eat our keys
  function handlePresKeydown(e) {
    if (!isActive) return;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case " ":
      case "PageDown":
        e.preventDefault();
        e.stopImmediatePropagation();
        nextSlide();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        e.preventDefault();
        e.stopImmediatePropagation();
        prevSlide();
        break;
      case "Escape":
        e.preventDefault();
        e.stopImmediatePropagation();
        exitPresentation();
        break;
      case "Home":
        e.preventDefault();
        e.stopImmediatePropagation();
        showSlide(0, -1);
        break;
      case "End":
        e.preventDefault();
        e.stopImmediatePropagation();
        showSlide(slides.length - 1, 1);
        break;
      case "f":
      case "F":
        // Toggle fullscreen
        e.preventDefault();
        e.stopImmediatePropagation();
        var overlay = document.getElementById("pres-overlay");
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else overlay.requestFullscreen();
        } catch (_) {}
        break;
    }
  }

  // ---- Binding ----
  function bindPresentation() {
    var presBtn = document.getElementById("present-btn");
    var presExit = document.getElementById("pres-exit");
    var presPrev = document.getElementById("pres-prev");
    var presNext = document.getElementById("pres-next");
    var overlay = document.getElementById("pres-overlay");
    var slideArea = document.getElementById("pres-slide-area");

    if (presBtn) presBtn.addEventListener("click", enterPresentation);
    if (presExit) presExit.addEventListener("click", exitPresentation);
    if (presPrev) presPrev.addEventListener("click", prevSlide);
    if (presNext) presNext.addEventListener("click", nextSlide);

    // Click on slide area to advance
    if (slideArea) {
      slideArea.addEventListener("click", function (e) {
        // Don't advance if clicking a link or interactive element
        if (e.target.closest("a, button, input, code, pre")) return;
        nextSlide();
      });
    }

    // Capture phase so this fires before vim/emacs keybinding handler
    document.addEventListener("keydown", handlePresKeydown, true);

    // Touch swipe
    if (overlay) {
      overlay.addEventListener("touchstart", function (e) {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      overlay.addEventListener("touchend", function (e) {
        var diff = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(diff) > 50) {
          if (diff < 0) nextSlide();
          else prevSlide();
        }
      }, { passive: true });
    }

    // Fullscreen exit should NOT auto-close presentation
    // (user may have pressed Esc in fullscreen, which we catch above,
    // or the browser blocked fullscreen entirely)
  }

  window.MLE = window.MLE || {};
  window.MLE.bindPresentation = bindPresentation;
  window.MLE.enterPresentation = enterPresentation;
  window.MLE.isPresActive = function () { return isActive; };
})();
