(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".explainer [role=tab]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".explainer [role=tabpanel]"));

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-tab");
      var panelPrefix = tab.getAttribute("aria-controls").charAt(0);
      tabs.forEach(function (t) {
        if (t.closest(".explainer") !== tab.closest(".explainer")) return;
        t.setAttribute("aria-selected", String(t === tab));
      });
      panels.forEach(function (p) {
        if (p.closest(".explainer") !== tab.closest(".explainer")) return;
        p.hidden = p.id !== panelPrefix + id;
      });
    });
  });

  var rungs = Array.prototype.slice.call(document.querySelectorAll(".explainer #rungs li"));
  var rung = 0;

  function paintRungs() {
    rungs.forEach(function (li, i) {
      if (i < rung) li.classList.add("is-on");
      else li.classList.remove("is-on");
    });
  }

  var next = document.getElementById("rung-next");
  var reset = document.getElementById("rung-reset");
  if (next) {
    next.addEventListener("click", function () {
      if (rung < rungs.length) rung += 1;
      paintRungs();
    });
  }
  if (reset) {
    reset.addEventListener("click", function () {
      rung = 0;
      paintRungs();
    });
  }
  if (rungs.length) paintRungs();
})();
