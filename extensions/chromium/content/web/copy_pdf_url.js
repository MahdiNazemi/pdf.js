"use strict";
// Adds a "Copy PDF URL" button to the main toolbar.
// Self-contained — no modifications to upstream viewer code or CSS.
(function () {
  var file = new URLSearchParams(location.search).get("file");
  if (!file) return;

  // Inject CSS for the icon, matching the existing toolbar button pattern.
  var style = document.createElement("style");
  style.textContent =
    "#copyUrlButton::before{" +
    "-webkit-mask-image:url(images/toolbarButton-copyUrl.svg);" +
    "mask-image:url(images/toolbarButton-copyUrl.svg);" +
    "}" +
    "#copyUrlButton.copied::before{" +
    "-webkit-mask-image:url(images/toolbarButton-checkmark.svg);" +
    "mask-image:url(images/toolbarButton-checkmark.svg);" +
    "}";
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.createElement("button");
    btn.id = "copyUrlButton";
    btn.className = "toolbarButton";
    btn.type = "button";
    btn.tabIndex = 0;
    btn.title = "Copy PDF URL";

    var span = document.createElement("span");
    span.textContent = "Copy PDF URL";
    btn.appendChild(span);

    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(file).then(function () {
        btn.classList.add("copied");
        btn.title = "Copied!";
        setTimeout(function () {
          btn.classList.remove("copied");
          btn.title = "Copy PDF URL";
        }, 1500);
      });
    });

    // Insert before the print button in the main toolbar.
    var printBtn = document.getElementById("printButton");
    if (printBtn) {
      printBtn.parentNode.insertBefore(btn, printBtn);
    }
  });
})();
