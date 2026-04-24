"use strict";
// Adds "Copy PDF URL" and "Invert Colors" buttons to the main toolbar.
// Self-contained — no modifications to upstream viewer code or CSS.
(function () {
  var file = new URLSearchParams(location.search).get("file");

  // Inject CSS for button icons, matching the existing toolbar button pattern.
  var style = document.createElement("style");
  style.textContent =
    "#copyUrlButton::before{" +
    "-webkit-mask-image:url(images/toolbarButton-copyUrl.svg);" +
    "mask-image:url(images/toolbarButton-copyUrl.svg);" +
    "}" +
    "#copyUrlButton.copied::before{" +
    "-webkit-mask-image:url(images/toolbarButton-checkmark.svg);" +
    "mask-image:url(images/toolbarButton-checkmark.svg);" +
    "}" +
    "#invertColorsButton::before{" +
    "-webkit-mask-image:url(images/toolbarButton-invert.svg);" +
    "mask-image:url(images/toolbarButton-invert.svg);" +
    "}" +
    "#invertColorsButton.active{" +
    "background-color:var(--toggled-btn-bg-color, rgba(0,0,0,.12));" +
    "}";
  document.head.appendChild(style);

  // CSS filter applied to the viewer canvas when inversion is active.
  var INVERT_FILTER = "invert(1) hue-rotate(180deg)";
  var VIEWER_ID = "viewerContainer";

  // Per-session override: null = follow global pref, true/false = forced.
  var sessionOverride = null;

  // Dark mode: true when the UI is currently dark.
  var systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  // Cached global pref value (loaded from storage).
  var globalInvert = false;

  // Cached theme value from storage (0=system, 1=light, 2=dark).
  var themeSetting = 0;

  function isDarkModeActive() {
    if (themeSetting === 1) return false;
    if (themeSetting === 2) return true;
    return systemDark.matches;
  }

  function shouldInvert() {
    var invert = sessionOverride !== null ? sessionOverride : globalInvert;
    return invert && isDarkModeActive();
  }

  function applyInvert() {
    var container = document.getElementById(VIEWER_ID);
    if (!container) return;
    container.style.filter = shouldInvert() ? INVERT_FILTER : "";
  }

  function updateButton(btn) {
    if (!btn) return;
    var active = shouldInvert();
    btn.classList.toggle("active", active);
    btn.title = active ? "Invert colors: on (click to disable for this tab)" : "Invert colors: off (click to enable for this tab)";
  }

  // Load prefs from storage, then set up listeners and DOM.
  var storageArea = chrome.storage.sync || chrome.storage.local;
  storageArea.get(["invertPageColors", "viewerCssTheme"], function (prefs) {
    // Default true when theme is system (0) so dark-mode users get inversion
    // out of the box; explicit false in storage overrides this.
    var themeVal = typeof prefs.viewerCssTheme === "number" ? prefs.viewerCssTheme : 0;
    themeSetting = themeVal;
    var defaultInvert = themeVal !== 1; // default on unless explicitly light theme
    globalInvert = "invertPageColors" in prefs ? !!prefs.invertPageColors : defaultInvert;

    function init() {
      setupButtons();
      applyInvert();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  });

  // Re-apply when system dark mode changes (only matters when theme = system).
  systemDark.addEventListener("change", function () {
    applyInvert();
    updateButton(document.getElementById("invertColorsButton"));
  });

  // Re-apply when the global pref changes (e.g. user updates options page).
  chrome.storage.onChanged.addListener(function (changes) {
    if (changes.invertPageColors) {
      globalInvert = !!changes.invertPageColors.newValue;
      applyInvert();
      updateButton(document.getElementById("invertColorsButton"));
    }
    if (changes.viewerCssTheme) {
      themeSetting = typeof changes.viewerCssTheme.newValue === "number"
        ? changes.viewerCssTheme.newValue : 0;
      applyInvert();
      updateButton(document.getElementById("invertColorsButton"));
    }
  });

  function setupButtons() {
    var printBtn = document.getElementById("printButton");
    if (!printBtn) return;

    // --- Copy URL button (only when a PDF URL is present) ---
    if (file) {
      var copyBtn = document.createElement("button");
      copyBtn.id = "copyUrlButton";
      copyBtn.className = "toolbarButton";
      copyBtn.type = "button";
      copyBtn.tabIndex = 0;
      copyBtn.title = "Copy PDF URL";
      var copySpan = document.createElement("span");
      copySpan.textContent = "Copy PDF URL";
      copyBtn.appendChild(copySpan);
      copyBtn.addEventListener("click", function () {
        navigator.clipboard.writeText(file).then(function () {
          copyBtn.classList.add("copied");
          copyBtn.title = "Copied!";
          setTimeout(function () {
            copyBtn.classList.remove("copied");
            copyBtn.title = "Copy PDF URL";
          }, 1500);
        });
      });
      printBtn.parentNode.insertBefore(copyBtn, printBtn);
    }

    // --- Invert colors button (per-session toggle) ---
    var invertBtn = document.createElement("button");
    invertBtn.id = "invertColorsButton";
    invertBtn.className = "toolbarButton";
    invertBtn.type = "button";
    invertBtn.tabIndex = 0;
    var invertSpan = document.createElement("span");
    invertSpan.textContent = "Invert Colors";
    invertBtn.appendChild(invertSpan);
    updateButton(invertBtn);

    invertBtn.addEventListener("click", function () {
      // Toggle session override relative to current effective state.
      sessionOverride = !shouldInvert();
      applyInvert();
      updateButton(invertBtn);
    });

    printBtn.parentNode.insertBefore(invertBtn, printBtn);
    if (file) {
      // Insert invert before copy (copy is already before print).
      var copyBtn2 = document.getElementById("copyUrlButton");
      if (copyBtn2) {
        printBtn.parentNode.insertBefore(invertBtn, copyBtn2);
      }
    }
  }
})();
