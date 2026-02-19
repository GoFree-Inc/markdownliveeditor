/* =========================================================
   MarkLiveEdit — modules/history.js
   Version history snapshots
   ========================================================= */

(function () {
  "use strict";

  var HISTORY_KEY = "marklivedit_history";

  function getHistory() {
    try {
      var data = localStorage.getItem(HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (_) { return []; }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (_) {}
  }

  function saveSnapshot() {
    var editor = document.getElementById("editor");
    var content = editor.value;
    if (!content.trim()) {
      MLE.showToast("Nothing to save", "error");
      return;
    }

    var history = getHistory();
    var snapshot = {
      id: Date.now(),
      time: new Date().toLocaleString(),
      preview: content.substring(0, 80).replace(/\n/g, " "),
      content: content
    };

    history.unshift(snapshot);
    if (history.length > 20) history = history.slice(0, 20);
    saveHistory(history);
    renderHistoryList();
    MLE.showToast("Snapshot saved", "success");
  }

  function restoreSnapshot(id) {
    var editor = document.getElementById("editor");
    var history = getHistory();
    var snapshot = history.find(function (s) { return s.id === id; });
    if (!snapshot) return;

    if (editor.value.trim() && !confirm("Replace current content with this snapshot?")) return;

    editor.value = snapshot.content;
    editor.dispatchEvent(new Event("input"));
    MLE.showToast("Snapshot restored", "success");
  }

  function deleteSnapshot(id) {
    var history = getHistory();
    history = history.filter(function (s) { return s.id !== id; });
    saveHistory(history);
    renderHistoryList();
  }

  function renderHistoryList() {
    var historyList = document.getElementById("history-list");
    var historyEmpty = document.getElementById("history-empty");
    var history = getHistory();
    historyList.innerHTML = "";

    if (history.length === 0) {
      historyEmpty.hidden = false;
      return;
    }

    historyEmpty.hidden = true;
    history.forEach(function (s) {
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="history-info">' +
          '<span class="history-time">' + s.time + '</span>' +
          '<span class="history-preview">' + (s.preview || "Empty").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</span>' +
        '</div>' +
        '<div class="history-actions">' +
          '<button class="history-restore" data-id="' + s.id + '">Restore</button>' +
          '<button class="history-delete" data-id="' + s.id + '">&times;</button>' +
        '</div>';
      historyList.appendChild(li);
    });

    historyList.querySelectorAll(".history-restore").forEach(function (btn) {
      btn.addEventListener("click", function () {
        restoreSnapshot(parseInt(this.dataset.id));
      });
    });

    historyList.querySelectorAll(".history-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        deleteSnapshot(parseInt(this.dataset.id));
      });
    });
  }

  function bindHistory() {
    var historyBtn = document.getElementById("history-btn");
    var historyClose = document.getElementById("history-close");
    var historySave = document.getElementById("history-save");
    var historyPanel = document.getElementById("history-panel");

    if (historyBtn) {
      historyBtn.addEventListener("click", function () { MLE.togglePanel(historyPanel); });
    }
    if (historyClose) {
      historyClose.addEventListener("click", function () { historyPanel.hidden = true; });
    }
    if (historySave) {
      historySave.addEventListener("click", saveSnapshot);
    }
  }

  window.MLE = window.MLE || {};
  window.MLE.renderHistoryList = renderHistoryList;
  window.MLE.bindHistory = bindHistory;
})();
