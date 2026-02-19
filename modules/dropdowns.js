/* =========================================================
   MarkLiveEdit — modules/dropdowns.js
   Header dropdown menus (View, File)
   ========================================================= */

(function () {
  "use strict";

  function closeAllDropdowns() {
    var openDropdowns = document.querySelectorAll(".dropdown.open");
    openDropdowns.forEach(function (d) { d.classList.remove("open"); });
  }

  function toggleDropdown(dropdown) {
    var isOpen = dropdown.classList.contains("open");
    closeAllDropdowns();
    if (!isOpen) dropdown.classList.add("open");
  }

  function bindDropdowns() {
    // Toggle on trigger click
    var triggers = document.querySelectorAll(".dropdown-trigger");
    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var dropdown = trigger.closest(".dropdown");
        if (dropdown) toggleDropdown(dropdown);
      });
    });

    // Item click: fire the underlying button, close dropdown + mobile drawer
    var items = document.querySelectorAll(".dropdown-item");
    items.forEach(function (item) {
      item.addEventListener("click", function () {
        closeAllDropdowns();
        // Close mobile drawer if open
        var actions = document.querySelector(".actions");
        if (actions && actions.classList.contains("open")) {
          actions.classList.remove("open");
        }
      });
    });

    // Click outside closes dropdowns
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".dropdown")) {
        closeAllDropdowns();
      }
    });
  }

  window.MLE = window.MLE || {};
  window.MLE.closeAllDropdowns = closeAllDropdowns;
  window.MLE.bindDropdowns = bindDropdowns;
})();
