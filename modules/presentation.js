/* =========================================================
   MarkLiveEdit — modules/presentation.js
   Feature 15: Presentation Mode — split by --- into slides
   ========================================================= */

(function () {
  "use strict";

  var slides = [];
  var currentSlide = 0;
  var touchStartX = 0;

  function parseSlides(markdown) {
    // Split by horizontal rules (--- on its own line)
    var parts = markdown.split(/\n---\n/);
    return parts.map(function (part) { return part.trim(); }).filter(function (p) { return p.length > 0; });
  }

  function renderSlideContent(markdown) {
    if (typeof marked === "undefined") return markdown;
    var html = marked.parse(markdown);
    if (typeof DOMPurify !== "undefined") {
      html = DOMPurify.sanitize(html);
    }
    return html;
  }

  function showSlide(index) {
    var slideContent = document.getElementById("pres-slide-content");
    var slideCounter = document.getElementById("pres-counter");
    if (!slideContent || !slideCounter) return;

    currentSlide = Math.max(0, Math.min(index, slides.length - 1));
    slideContent.innerHTML = renderSlideContent(slides[currentSlide]);
    slideCounter.textContent = (currentSlide + 1) + " / " + slides.length;

    // Apply syntax highlighting
    if (typeof Prism !== "undefined") {
      Prism.highlightAllUnder(slideContent);
    }

    // Render mermaid blocks
    if (typeof mermaid !== "undefined") {
      var codeBlocks = slideContent.querySelectorAll("code.language-mermaid");
      codeBlocks.forEach(function (code, i) {
        var pre = code.parentElement;
        if (!pre || pre.tagName !== "PRE") return;
        var graphDef = code.textContent;
        var container = document.createElement("div");
        container.className = "mermaid-container";
        var id = "pres-mermaid-" + Date.now() + "-" + i;
        try {
          mermaid.render(id, graphDef).then(function (result) {
            container.innerHTML = result.svg;
            pre.parentNode.replaceChild(container, pre);
          }).catch(function () {});
        } catch (_) {}
      });
    }

    // Fade animation
    slideContent.classList.remove("slide-fade-in");
    void slideContent.offsetWidth;
    slideContent.classList.add("slide-fade-in");
  }

  function nextSlide() {
    if (currentSlide < slides.length - 1) {
      showSlide(currentSlide + 1);
    }
  }

  function prevSlide() {
    if (currentSlide > 0) {
      showSlide(currentSlide - 1);
    }
  }

  function enterPresentation() {
    var editor = document.getElementById("editor");
    var content = editor.value.trim();
    if (!content) {
      MLE.showToast("Nothing to present", "error");
      return;
    }

    slides = parseSlides(content);
    if (slides.length === 0) {
      MLE.showToast("No slides found", "error");
      return;
    }

    currentSlide = 0;
    var overlay = document.getElementById("pres-overlay");
    overlay.hidden = false;
    document.body.classList.add("pres-active");
    showSlide(0);

    // Request fullscreen
    try {
      if (overlay.requestFullscreen) overlay.requestFullscreen();
      else if (overlay.webkitRequestFullscreen) overlay.webkitRequestFullscreen();
    } catch (_) {}
  }

  function exitPresentation() {
    var overlay = document.getElementById("pres-overlay");
    overlay.hidden = true;
    document.body.classList.remove("pres-active");
    slides = [];
    currentSlide = 0;

    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
  }

  function handlePresKeydown(e) {
    var overlay = document.getElementById("pres-overlay");
    if (overlay.hidden) return;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case " ":
        e.preventDefault();
        nextSlide();
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        prevSlide();
        break;
      case "Escape":
        e.preventDefault();
        exitPresentation();
        break;
      case "Home":
        e.preventDefault();
        showSlide(0);
        break;
      case "End":
        e.preventDefault();
        showSlide(slides.length - 1);
        break;
    }
  }

  function bindPresentation() {
    var presBtn = document.getElementById("present-btn");
    var presExit = document.getElementById("pres-exit");
    var presPrev = document.getElementById("pres-prev");
    var presNext = document.getElementById("pres-next");
    var overlay = document.getElementById("pres-overlay");

    if (presBtn) presBtn.addEventListener("click", enterPresentation);
    if (presExit) presExit.addEventListener("click", exitPresentation);
    if (presPrev) presPrev.addEventListener("click", prevSlide);
    if (presNext) presNext.addEventListener("click", nextSlide);

    document.addEventListener("keydown", handlePresKeydown);

    // Touch swipe support
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

    // Handle fullscreen exit
    document.addEventListener("fullscreenchange", function () {
      if (!document.fullscreenElement && !document.getElementById("pres-overlay").hidden) {
        exitPresentation();
      }
    });
  }

  window.MLE = window.MLE || {};
  window.MLE.bindPresentation = bindPresentation;
  window.MLE.enterPresentation = enterPresentation;
})();
