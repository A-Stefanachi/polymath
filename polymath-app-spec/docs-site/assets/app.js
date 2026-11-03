(function () {
  var body = document.body;
  var page = body.getAttribute("data-page") || "";
  var sidebar = document.getElementById("sidebar");
  var toggle = document.getElementById("nav-toggle");

  if (sidebar && typeof POLYMATH_NAV !== "undefined") {
    var html = '<div class="sidebar-brand"><span class="mark" aria-hidden="true"></span><span>Polymath docs</span></div>';
    html += '<p class="sidebar-tag">Overview for readers. Authoritative specification: <code>docs/*.md</code></p>';
    html += "<nav class=\"sidebar-nav\" aria-label=\"Documentation\">";
    POLYMATH_NAV.forEach(function (item) {
      if (item.section) {
        html += "<div class=\"nav-section\">" + item.section + "</div>";
        return;
      }
      var cls = item.id === page ? " class=\"active\"" : "";
      var ext = item.external ? " target=\"_blank\" rel=\"noopener\"" : "";
      html += "<a href=\"" + item.href + "\"" + cls + ext + ">" + item.label + "</a>";
    });
    html += "</nav>";
    sidebar.innerHTML = html;
  }

  if (toggle && sidebar) {
    toggle.addEventListener("click", function () {
      body.classList.toggle("nav-open");
      var open = body.classList.contains("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  var search = document.getElementById("doc-search");
  var list = document.getElementById("source-list");
  if (search && list) {
    search.addEventListener("input", function () {
      var q = search.value.toLowerCase().trim();
      var rows = list.querySelectorAll("[data-search]");
      rows.forEach(function (row) {
        var text = row.getAttribute("data-search") || "";
        row.hidden = q.length > 0 && text.indexOf(q) === -1;
      });
    });
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll("[role=tab]"));
  var panels = Array.prototype.slice.call(document.querySelectorAll("[role=tabpanel]"));
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var id = tab.getAttribute("data-tab");
      tabs.forEach(function (t) {
        t.setAttribute("aria-selected", String(t === tab));
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute("data-tabpanel") !== id;
      });
    });
  });
})();
