/* =========================================================
   MarkLiveEdit — modules/tabs.js
   Feature 6: Multiple Document Tabs
   ========================================================= */

(function () {
  "use strict";

  var TABS_KEY = "marklivedit_tabs";
  var ACTIVE_TAB_KEY = "marklivedit_active_tab";
  var MAX_TABS = 10;
  var tabs = [];
  var activeTabId = null;

  function generateId() {
    return "tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  }

  function loadTabs() {
    try {
      var data = localStorage.getItem(TABS_KEY);
      if (data) {
        tabs = JSON.parse(data);
        activeTabId = localStorage.getItem(ACTIVE_TAB_KEY) || (tabs[0] && tabs[0].id);
        return;
      }
    } catch (_) {}

    // Migration: convert single content to a tab
    var content = "";
    try {
      content = localStorage.getItem("marklivedit_content") || "";
    } catch (_) {}

    var tab = createTabObject("Untitled", content);
    tabs = [tab];
    activeTabId = tab.id;
    saveTabs();
  }

  function saveTabs() {
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
      localStorage.setItem(ACTIVE_TAB_KEY, activeTabId);
    } catch (_) {}
  }

  function createTabObject(name, content) {
    return {
      id: generateId(),
      name: name || "Untitled",
      content: content || "",
      cursorStart: 0,
      cursorEnd: 0,
      scrollTop: 0
    };
  }

  function getActiveTab() {
    return tabs.find(function (t) { return t.id === activeTabId; }) || tabs[0];
  }

  function saveActiveTabState() {
    var tab = getActiveTab();
    if (!tab) return;
    var editor = document.getElementById("editor");
    tab.content = editor.value;
    tab.cursorStart = editor.selectionStart;
    tab.cursorEnd = editor.selectionEnd;
    tab.scrollTop = editor.scrollTop;
    saveTabs();
  }

  function switchToTab(id) {
    saveActiveTabState();
    activeTabId = id;
    var tab = getActiveTab();
    if (!tab) return;

    var editor = document.getElementById("editor");
    editor.value = tab.content;
    editor.selectionStart = tab.cursorStart;
    editor.selectionEnd = tab.cursorEnd;

    requestAnimationFrame(function () {
      editor.scrollTop = tab.scrollTop;
    });

    // Also save to legacy key for compatibility
    try { localStorage.setItem("marklivedit_content", tab.content); } catch (_) {}

    saveTabs();
    renderTabBar();
    MLE.renderPreview();
    MLE.updateStats();
  }

  function addTab() {
    if (tabs.length >= MAX_TABS) {
      MLE.showToast("Maximum " + MAX_TABS + " tabs reached", "warning");
      return;
    }
    saveActiveTabState();
    var tab = createTabObject("Untitled " + (tabs.length + 1));
    tabs.push(tab);
    activeTabId = tab.id;
    saveTabs();

    var editor = document.getElementById("editor");
    editor.value = "";
    editor.selectionStart = editor.selectionEnd = 0;

    renderTabBar();
    MLE.renderPreview();
    MLE.updateStats();
    MLE.showToast("New tab created", "success");
  }

  function closeTab(id) {
    if (tabs.length <= 1) {
      MLE.showToast("Cannot close the last tab", "warning");
      return;
    }

    var idx = tabs.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;

    var closingActive = (id === activeTabId);
    tabs.splice(idx, 1);

    if (closingActive) {
      var newIdx = Math.min(idx, tabs.length - 1);
      activeTabId = tabs[newIdx].id;
      var tab = tabs[newIdx];
      var editor = document.getElementById("editor");
      editor.value = tab.content;
      editor.selectionStart = tab.cursorStart;
      editor.selectionEnd = tab.cursorEnd;
      MLE.renderPreview();
      MLE.updateStats();
    }

    saveTabs();
    renderTabBar();
  }

  function renameTab(id) {
    var tab = tabs.find(function (t) { return t.id === id; });
    if (!tab) return;
    var newName = prompt("Rename tab:", tab.name);
    if (newName && newName.trim()) {
      tab.name = newName.trim().substring(0, 30);
      saveTabs();
      renderTabBar();
    }
  }

  function renderTabBar() {
    var tabBar = document.getElementById("tab-bar");
    if (!tabBar) return;

    tabBar.innerHTML = "";
    tabs.forEach(function (tab) {
      var el = document.createElement("div");
      el.className = "tab-item" + (tab.id === activeTabId ? " active" : "");
      el.dataset.id = tab.id;

      var nameSpan = document.createElement("span");
      nameSpan.className = "tab-name";
      nameSpan.textContent = tab.name;
      el.appendChild(nameSpan);

      var closeBtn = document.createElement("button");
      closeBtn.className = "tab-close";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Close tab";
      el.appendChild(closeBtn);

      // Click to switch
      nameSpan.addEventListener("click", function () {
        switchToTab(tab.id);
      });

      // Double-click to rename
      nameSpan.addEventListener("dblclick", function (e) {
        e.stopPropagation();
        renameTab(tab.id);
      });

      // Close button
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeTab(tab.id);
      });

      tabBar.appendChild(el);
    });

    // Add new tab button
    var addBtn = document.createElement("button");
    addBtn.className = "tab-add";
    addBtn.innerHTML = "+";
    addBtn.title = "New tab";
    addBtn.addEventListener("click", addTab);
    tabBar.appendChild(addBtn);

    // Scroll active tab into view
    var activeEl = tabBar.querySelector(".tab-item.active");
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    }
  }

  // Override saveContent to save tab state
  function saveContentWithTabs() {
    var tab = getActiveTab();
    if (!tab) return;
    var editor = document.getElementById("editor");
    tab.content = editor.value;
    saveTabs();
    // Also save to legacy key
    try { localStorage.setItem("marklivedit_content", editor.value); } catch (_) {}
  }

  function initTabs() {
    loadTabs();
    var tab = getActiveTab();
    if (tab) {
      var editor = document.getElementById("editor");
      editor.value = tab.content;
      editor.selectionStart = tab.cursorStart;
      editor.selectionEnd = tab.cursorEnd;
    }
    renderTabBar();

    // Override MLE.saveContent with tab-aware version
    MLE.saveContent = saveContentWithTabs;
  }

  window.MLE = window.MLE || {};
  window.MLE.initTabs = initTabs;
  window.MLE.saveActiveTabState = saveActiveTabState;
})();
