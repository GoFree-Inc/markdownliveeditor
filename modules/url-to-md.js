/* =========================================================
   Markdown Live Editor — modules/url-to-md.js
   URL-to-Markdown fetching + HTML paste conversion
   Uses Turndown.js for HTML -> Markdown conversion
   ========================================================= */

(function () {
  "use strict";

  var turndownService = null;

  function getTurndown() {
    if (turndownService) return turndownService;
    if (typeof TurndownService === "undefined") return null;

    turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    // Strip page chrome elements
    turndownService.remove(["script", "style", "nav", "footer", "header", "noscript", "iframe"]);

    return turndownService;
  }

  function convertHtmlToMarkdown(html) {
    var td = getTurndown();
    if (!td) return null;

    // Parse and extract main content if available
    var doc = new DOMParser().parseFromString(html, "text/html");

    // Prefer <article>, <main>, or <section> content
    var content =
      doc.querySelector("article") ||
      doc.querySelector("main") ||
      doc.querySelector('[role="main"]') ||
      doc.body;

    if (!content) return null;

    try {
      return td.turndown(content.innerHTML);
    } catch (_) {
      return null;
    }
  }

  function openModal() {
    var modal = document.getElementById("url-to-md-modal");
    if (!modal) return;
    modal.hidden = false;

    var input = document.getElementById("url-to-md-input");
    if (input) {
      input.value = "";
      input.focus();
    }

    var status = document.getElementById("url-to-md-status");
    if (status) {
      status.textContent = "";
      status.className = "url-to-md-status";
    }

    var fetchBtn = document.getElementById("url-to-md-fetch");
    if (fetchBtn) fetchBtn.disabled = false;
  }

  function closeModal() {
    var modal = document.getElementById("url-to-md-modal");
    if (modal) modal.hidden = true;
  }

  function doFetch() {
    var input = document.getElementById("url-to-md-input");
    var statusEl = document.getElementById("url-to-md-status");
    var fetchBtn = document.getElementById("url-to-md-fetch");
    var replaceCheck = document.getElementById("url-to-md-replace");
    var editor = document.getElementById("editor");

    var url = (input.value || "").trim();
    if (!url) {
      statusEl.textContent = "Please enter a URL";
      statusEl.className = "url-to-md-status url-to-md-error";
      return;
    }

    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
      input.value = url;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (_) {
      statusEl.textContent = "Invalid URL format";
      statusEl.className = "url-to-md-status url-to-md-error";
      return;
    }

    fetchBtn.disabled = true;
    statusEl.textContent = "Fetching page...";
    statusEl.className = "url-to-md-status url-to-md-loading";

    fetch("/api/fetch?url=" + encodeURIComponent(url))
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Fetch failed");
          return data;
        });
      })
      .then(function (data) {
        if (!data.html) throw new Error("Empty response from server");

        statusEl.textContent = "Converting to Markdown...";

        var md = convertHtmlToMarkdown(data.html);
        if (!md || !md.trim()) {
          throw new Error("Could not extract content from page");
        }

        // Add title as heading if available
        if (data.title) {
          md = "# " + data.title + "\n\n" + md;
        }

        // Add source URL
        md = md + "\n\n---\n*Source: [" + url + "](" + url + ")*\n";

        var shouldReplace = replaceCheck && replaceCheck.checked;
        if (shouldReplace) {
          editor.value = md;
        } else {
          var pos = editor.selectionStart;
          var prefix = pos > 0 && editor.value[pos - 1] !== "\n" ? "\n\n" : "";
          editor.setRangeText(prefix + md, pos, editor.selectionEnd);
          editor.selectionStart = editor.selectionEnd = pos + prefix.length + md.length;
        }

        editor.dispatchEvent(new Event("input"));
        closeModal();
        MLE.showToast("Page imported as Markdown", "success");
      })
      .catch(function (err) {
        statusEl.textContent = err.message || "Failed to fetch URL";
        statusEl.className = "url-to-md-status url-to-md-error";
        fetchBtn.disabled = false;
      });
  }

  function bindUrlToMd() {
    var btn = document.getElementById("url-to-md-btn");
    if (btn) btn.addEventListener("click", openModal);

    var closeBtn = document.getElementById("url-to-md-close");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    var modal = document.getElementById("url-to-md-modal");
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
    }

    var fetchBtn = document.getElementById("url-to-md-fetch");
    if (fetchBtn) fetchBtn.addEventListener("click", doFetch);

    var input = document.getElementById("url-to-md-input");
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doFetch();
        }
      });
    }
  }

  // Expose on MLE namespace
  window.MLE = window.MLE || {};
  window.MLE.bindUrlToMd = bindUrlToMd;
  window.MLE.convertHtmlToMarkdown = convertHtmlToMarkdown;
})();
