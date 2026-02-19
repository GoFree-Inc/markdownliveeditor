/* =========================================================
   Markdown Live Editor — modules/pdf-export.js
   PDF export with inline styles
   ========================================================= */

(function () {
  "use strict";

  function applyPdfInlineStyles(root) {
    root.style.cssText =
      "background:#fff;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont," +
      "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:14px;" +
      "line-height:1.7;padding:8px;word-wrap:break-word;overflow-wrap:break-word;";

    var all = root.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var tag = el.tagName;
      if (!tag) continue;
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

    // Code blocks with Prism token colors
    var tokenColorMap = {
      comment: "#6a737d", prolog: "#6a737d", doctype: "#6a737d", cdata: "#6a737d",
      punctuation: "#24292e",
      property: "#005cc5", tag: "#22863a", boolean: "#005cc5", number: "#005cc5",
      constant: "#005cc5", symbol: "#005cc5", deleted: "#b31d28",
      selector: "#22863a", "attr-name": "#6f42c1", string: "#032f62",
      char: "#032f62", builtin: "#005cc5", inserted: "#22863a",
      operator: "#d73a49", entity: "#d73a49", url: "#d73a49",
      atrule: "#d73a49", "attr-value": "#032f62", keyword: "#d73a49",
      function: "#6f42c1", "class-name": "#6f42c1",
      regex: "#e36209", important: "#e36209", variable: "#e36209"
    };

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

        code.querySelectorAll(".token").forEach(function (tok) {
          var classes = tok.className.split(/\s+/);
          for (var c = 0; c < classes.length; c++) {
            if (tokenColorMap[classes[c]]) {
              tok.style.color = tokenColorMap[classes[c]];
              break;
            }
          }
        });
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
      MLE.showToast("PDF exporter loading...", "error");
      return;
    }

    var editor = document.getElementById("editor");
    var preview = document.getElementById("preview");
    var status = document.getElementById("status");

    if (!editor.value.trim()) {
      MLE.showToast("Nothing to export", "error");
      return;
    }

    status.textContent = "Exporting...";
    status.className = "pane-meta";

    var wrapper = document.createElement("div");
    wrapper.style.cssText =
      "position:fixed;left:0;top:0;z-index:-1;pointer-events:none;" +
      "background:#fff;overflow:hidden;";
    document.body.appendChild(wrapper);

    var root = document.createElement("div");
    root.innerHTML = preview.innerHTML;
    applyPdfInlineStyles(root);
    wrapper.appendChild(root);

    requestAnimationFrame(function () {
      setTimeout(function () {
        var options = {
          margin: [12, 12, 12, 12],
          filename: MLE.getDocumentName() + ".pdf",
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
          MLE.showToast("PDF exported successfully", "success");
        }).catch(function () {
          if (wrapper.parentNode) document.body.removeChild(wrapper);
          status.textContent = "Export failed";
          status.className = "pane-meta";
          MLE.showToast("PDF export failed", "error");
        });
      }, 100);
    });
  }

  window.MLE = window.MLE || {};
  window.MLE.exportPdf = exportPdf;
})();
