/* =========================================================
   Markdown Live Editor — modules/file-ops.js
   Upload, drag-drop, download, copy HTML, clear, paste image
   ========================================================= */

(function () {
  "use strict";

  var uploadedFileName = "";

  function getDocumentName() {
    var editor = document.getElementById("editor");
    if (uploadedFileName) {
      return uploadedFileName.replace(/\.(md|markdown|mdown|mkd|txt)$/i, "");
    }
    var text = editor.value;
    var match = text.match(/^#{1,6}\s+(.+)/m);
    if (match) {
      return match[1].trim().replace(/[\\/:*?"<>|]/g, "").substring(0, 80);
    }
    return "document";
  }

  function handleFileUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    var editor = document.getElementById("editor");
    var fileInput = document.getElementById("file-input");
    uploadedFileName = file.name;
    var reader = new FileReader();
    reader.onload = function (ev) {
      editor.value = ev.target.result;
      MLE.renderPreview();
      MLE.updateStats();
      MLE.saveContent();
      MLE.showToast("Loaded: " + file.name, "success");
    };
    reader.onerror = function () {
      MLE.showToast("Failed to read file", "error");
    };
    reader.readAsText(file);
    fileInput.value = "";
  }

  function bindDragDrop() {
    var dropOverlay = document.getElementById("drop-overlay");
    var editor = document.getElementById("editor");
    var dragCounter = 0;

    document.addEventListener("dragenter", function (e) {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        dropOverlay.hidden = false;
      }
    });

    document.addEventListener("dragleave", function (e) {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        dropOverlay.hidden = true;
      }
    });

    document.addEventListener("dragover", function (e) {
      e.preventDefault();
    });

    document.addEventListener("drop", function (e) {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.hidden = true;

      var files = e.dataTransfer.files;
      if (files.length === 0) return;

      var file = files[0];
      if (!file.name.match(/\.(md|markdown|mdown|mkd|txt)$/i)) {
        MLE.showToast("Please drop a Markdown (.md) file", "error");
        return;
      }

      uploadedFileName = file.name;
      var reader = new FileReader();
      reader.onload = function (ev) {
        editor.value = ev.target.result;
        MLE.renderPreview();
        MLE.updateStats();
        MLE.saveContent();
        MLE.showToast("Loaded: " + file.name, "success");
      };
      reader.readAsText(file);
    });
  }

  function copyHtml() {
    var editor = document.getElementById("editor");
    if (typeof marked === "undefined") {
      MLE.showToast("Parser not loaded yet", "error");
      return;
    }

    var html = marked.parse(editor.value);
    if (typeof DOMPurify !== "undefined") {
      html = DOMPurify.sanitize(html);
    }

    navigator.clipboard.writeText(html).then(function () {
      MLE.showToast("HTML copied to clipboard", "success");
    }).catch(function () {
      MLE.showToast("Failed to copy", "error");
    });
  }

  function downloadMarkdown() {
    var editor = document.getElementById("editor");
    var content = editor.value;
    if (!content.trim()) {
      MLE.showToast("Nothing to download", "error");
      return;
    }

    var blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = getDocumentName() + ".md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    MLE.showToast("Downloaded " + getDocumentName() + ".md", "success");
  }

  function clearEditor() {
    var editor = document.getElementById("editor");
    if (editor.value.trim() && !confirm("Clear all content? This cannot be undone.")) {
      return;
    }
    editor.value = "";
    uploadedFileName = "";
    MLE.renderPreview();
    MLE.updateStats();
    MLE.saveContent();
    MLE.showToast("Editor cleared", "success");
  }

  function handlePaste(e) {
    var items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    var editor = document.getElementById("editor");

    // Check for HTML content first — convert to Markdown via Turndown
    var htmlData = e.clipboardData.getData("text/html");
    if (htmlData && MLE.convertHtmlToMarkdown) {
      // Skip trivially simple HTML (plain text wrapped in a single span/p)
      var tmp = document.createElement("div");
      tmp.innerHTML = htmlData;
      var hasRichContent =
        tmp.querySelector("h1,h2,h3,h4,h5,h6,table,pre,code,ul,ol,blockquote,img,a,strong,em,li") !== null ||
        tmp.querySelectorAll("p").length > 1;

      if (hasRichContent) {
        var md = MLE.convertHtmlToMarkdown(htmlData);
        if (md && md.trim()) {
          e.preventDefault();
          var start = editor.selectionStart;
          editor.setRangeText(md, start, editor.selectionEnd);
          editor.selectionStart = editor.selectionEnd = start + md.length;
          editor.dispatchEvent(new Event("input"));
          MLE.showToast("Pasted as Markdown", "success");
          return;
        }
      }
    }

    // Then check for images
    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        var file = items[i].getAsFile();
        var reader = new FileReader();
        reader.onload = function (ev) {
          var base64 = ev.target.result;
          var markdown = "![pasted image](" + base64 + ")";
          var start = editor.selectionStart;
          editor.setRangeText(markdown, start, editor.selectionEnd);
          editor.selectionStart = editor.selectionEnd = start + markdown.length;
          editor.dispatchEvent(new Event("input"));
          MLE.showToast("Image pasted", "success");
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }

  function bindFileOps() {
    var exportBtn = document.getElementById("export-btn");
    var clearBtn = document.getElementById("clear-btn");
    var uploadBtn = document.getElementById("upload-btn");
    var fileInput = document.getElementById("file-input");
    var copyHtmlBtn = document.getElementById("copy-html-btn");
    var downloadMdBtn = document.getElementById("download-md-btn");
    var editor = document.getElementById("editor");

    exportBtn.addEventListener("click", function () { MLE.exportPdf(); });
    clearBtn.addEventListener("click", clearEditor);
    uploadBtn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", handleFileUpload);
    copyHtmlBtn.addEventListener("click", copyHtml);
    downloadMdBtn.addEventListener("click", downloadMarkdown);
    editor.addEventListener("paste", handlePaste);

    bindDragDrop();
  }

  window.MLE = window.MLE || {};
  window.MLE.getDocumentName = getDocumentName;
  window.MLE.clearEditor = clearEditor;
  window.MLE.handlePaste = handlePaste;
  window.MLE.bindFileOps = bindFileOps;
})();
