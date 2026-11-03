(function () {
  var PILLARS = [
    { id: "T0", label: "T0 — Foundation", file: "pillar-T0-foundation.md", skills: 142, modules: 17 },
    { id: "T1", label: "T1 — Power & motion", file: "pillar-T1-power-motion.md" },
    { id: "T2", label: "T2 — Control", file: "pillar-T2-control.md" },
    { id: "T3", label: "T3 — Mechanical", file: "pillar-T3-mechanical.md" },
    { id: "T4", label: "T4 — UAV integration", file: "pillar-T4-robo.md" },
    { id: "T5", label: "T5 — Cloud twin", file: "pillar-T5-cloud-twin.md" },
    { id: "T6", label: "T6 — Governance", file: "pillar-T6-governance.md" }
  ];

  var BASE = "../content/syllabi/";
  var cache = {};

  function bundledMarkdown(file) {
    var bundle = window.POLYMATH_SYLLABI;
    if (bundle && Object.prototype.hasOwnProperty.call(bundle, file)) {
      return bundle[file];
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inlineMd(text) {
    var s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var h = href;
      if (h.indexOf("../") === 0 || h.indexOf("content/") === 0) {
        /* keep repo-relative links */
      } else if (h.indexOf("http") !== 0 && h.indexOf("#") !== 0) {
        h = BASE + h;
      }
      return '<a href="' + escapeHtml(h) + '">' + label + "</a>";
    });
    return s;
  }

  function slugHeading(text) {
    var m = text.match(/`([^`]+)`/);
    if (m) {
      return m[1].replace(/[^\w.-]/g, "-");
    }
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 48);
  }

  function isTableSep(line) {
    return /^\|[\s\-:|]+\|$/.test(line.trim());
  }

  function parseTableRow(line) {
    var cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
    return cells.map(function (c) {
      return inlineMd(c.trim());
    });
  }

  function tableToHtml(rows) {
    if (rows.length < 2) {
      return "<p>" + inlineMd(rows.join(" ")) + "</p>";
    }
    var html = "<table><thead><tr>";
    parseTableRow(rows[0]).forEach(function (c) {
      html += "<th>" + c + "</th>";
    });
    html += "</tr></thead><tbody>";
    var start = isTableSep(rows[1]) ? 2 : 1;
    for (var i = start; i < rows.length; i++) {
      html += "<tr>";
      parseTableRow(rows[i]).forEach(function (c) {
        html += "<td>" + c + "</td>";
      });
      html += "</tr>";
    }
    html += "</tbody></table>";
    return html;
  }

  function markdownToHtml(md) {
    var lines = md.replace(/\r\n/g, "\n").split("\n");
    var out = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }
      if (line.charAt(0) === "|") {
        var trows = [];
        while (i < lines.length && lines[i].charAt(0) === "|") {
          trows.push(lines[i]);
          i++;
        }
        out.push(tableToHtml(trows));
        continue;
      }
      if (line.indexOf("# ") === 0) {
        out.push("<h1>" + inlineMd(line.slice(2)) + "</h1>");
        i++;
        continue;
      }
      if (line.indexOf("## ") === 0) {
        var h2 = line.slice(3);
        out.push('<h2 id="' + escapeHtml(slugHeading(h2)) + '">' + inlineMd(h2) + "</h2>");
        i++;
        continue;
      }
      if (line.indexOf("### ") === 0) {
        var h3 = line.slice(4);
        out.push('<h3 id="' + escapeHtml(slugHeading(h3)) + '">' + inlineMd(h3) + "</h3>");
        i++;
        continue;
      }
      if (line.indexOf("- ") === 0) {
        var items = [];
        while (i < lines.length && lines[i].indexOf("- ") === 0) {
          items.push("<li>" + inlineMd(lines[i].slice(2)) + "</li>");
          i++;
        }
        out.push("<ul>" + items.join("") + "</ul>");
        continue;
      }
      var para = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        lines[i].charAt(0) !== "#" &&
        lines[i].indexOf("- ") !== 0 &&
        lines[i].charAt(0) !== "|"
      ) {
        para.push(lines[i]);
        i++;
      }
      out.push("<p>" + inlineMd(para.join(" ")) + "</p>");
    }
    return out.join("\n");
  }

  function pillarFromHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    var h = raw.split(":")[0].toUpperCase();
    if (!h) {
      return "T0";
    }
    for (var j = 0; j < PILLARS.length; j++) {
      if (PILLARS[j].id === h) {
        return h;
      }
    }
    return "T0";
  }

  function moduleIdFromHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    var parts = raw.split(":");
    if (parts.length > 1) {
      return parts.slice(1).join(":");
    }
    if (/^T\d$/i.test(raw)) {
      return "";
    }
    return raw;
  }

  function buildModuleToc(panel, pillarId) {
    var toc = document.getElementById("syllabus-toc");
    var list = document.getElementById("syllabus-toc-list");
    if (!toc || !list) {
      return;
    }
    list.innerHTML = "";
    var h3s = panel.querySelectorAll(".syllabus-body h3");
    if (!h3s.length) {
      toc.hidden = true;
      return;
    }
    toc.hidden = false;
    h3s.forEach(function (h3) {
      var id = h3.id;
      if (!id) {
        return;
      }
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + pillarId + ":" + id;
      a.textContent = h3.textContent.replace(/\s+/g, " ").trim().slice(0, 48);
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function scrollToModuleHash(pillarId) {
    var modId = moduleIdFromHash();
    if (!modId) {
      return;
    }
    var el = document.getElementById(modId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function applySyllabusSearch(query) {
    var body = document.querySelector(".syllabus-body");
    if (!body) {
      return;
    }
    var q = query.toLowerCase().trim();
    body.querySelectorAll(".search-hit").forEach(function (n) {
      n.classList.remove("search-hit");
    });
    body.querySelectorAll(".search-dim").forEach(function (n) {
      n.classList.remove("search-dim");
    });
    if (!q) {
      return;
    }
    var h3s = body.querySelectorAll("h3");
    var firstHit = null;
    h3s.forEach(function (h3) {
      var section = h3;
      var text = "";
      while (section.nextElementSibling && section.nextElementSibling.tagName !== "H3") {
        section = section.nextElementSibling;
        text += " " + section.textContent;
      }
      var block = (h3.textContent + text).toLowerCase();
      var match = block.indexOf(q) !== -1;
      h3.classList.toggle("search-dim", !match);
      var sib = h3.nextElementSibling;
      while (sib && sib.tagName !== "H3") {
        sib.classList.toggle("search-dim", !match);
        if (match && !firstHit) {
          firstHit = h3;
        }
        sib = sib.nextElementSibling;
      }
    });
    if (firstHit) {
      firstHit.classList.add("search-hit");
      firstHit.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function setHash(id) {
    if (location.hash.replace("#", "").toUpperCase() !== id) {
      history.replaceState(null, "", "#" + id);
    }
  }

  function loadPillar(id, panel, meta) {
    var pillar = PILLARS.filter(function (p) {
      return p.id === id;
    })[0];
    if (!pillar) {
      return;
    }
    panel.setAttribute("aria-busy", "true");
    panel.classList.remove("error");
    panel.innerHTML = "<p>Loading " + escapeHtml(pillar.label) + "…</p>";
    function afterRender(fromBundle) {
      buildModuleToc(panel, pillar.id);
      scrollToModuleHash(pillar.id);
      var search = document.getElementById("syllabus-search");
      if (search && search.value) {
        applySyllabusSearch(search.value);
      }
      var plan =
        pillar.id === "T0"
          ? "foundation-module-plan.yaml"
          : "spine-module-plan.yaml";
      var src =
        'Source: <a href="' +
        BASE +
        pillar.file +
        '">' +
        pillar.file +
        "</a> · Plan: <a href=\"" +
        BASE +
        plan +
        '">' +
        plan +
        "</a>";
      if (fromBundle) {
        src += " · <span>Rendered from bundled copy (offline)</span>";
      }
      meta.innerHTML = src;
    }

    function render(md, fromBundle) {
      panel.removeAttribute("aria-busy");
      panel.innerHTML = '<div class="syllabus-body">' + markdownToHtml(md) + "</div>";
      afterRender(fromBundle);
    }

    if (cache[pillar.file]) {
      render(cache[pillar.file], true);
      return;
    }

    var bundled = bundledMarkdown(pillar.file);
    if (bundled !== null) {
      cache[pillar.file] = bundled;
      render(bundled, true);
      return;
    }

    fetch(BASE + pillar.file)
      .then(function (res) {
        if (!res.ok) {
          throw new Error(res.status + " " + res.statusText);
        }
        return res.text();
      })
      .then(function (text) {
        cache[pillar.file] = text;
        render(text, false);
      })
      .catch(function (err) {
        panel.removeAttribute("aria-busy");
        panel.classList.add("error");
        panel.innerHTML =
          "<p><strong>Could not load syllabus.</strong> " +
          escapeHtml(err.message) +
          "</p><p class=\"note\">Regenerate the offline bundle: " +
          "<code>python reference/generate_pillar_syllabi.py</code> " +
          "(writes <code>docs-site/assets/syllabi-data.js</code>).</p>" +
          '<p>Or open markdown: <a href="' +
          BASE +
          pillar.file +
          '">' +
          pillar.file +
          "</a></p>";
      });
  }

  var select = document.getElementById("syllabus-pillar");
  var panel = document.getElementById("syllabus-panel");
  var meta = document.getElementById("syllabus-meta");
  var tabs = document.getElementById("syllabus-tabs");

  if (!select || !panel) {
    return;
  }

  PILLARS.forEach(function (p) {
    var opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label + (p.skills ? " (" + p.modules + " modules)" : "");
    select.appendChild(opt);
    if (tabs) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("data-pillar", p.id);
      btn.textContent = p.id;
      btn.title = p.label;
      tabs.appendChild(btn);
    }
  });

  function activate(id) {
    select.value = id;
    setHash(id);
    if (tabs) {
      var buttons = tabs.querySelectorAll("[data-pillar]");
      buttons.forEach(function (b) {
        b.setAttribute("aria-selected", String(b.getAttribute("data-pillar") === id));
      });
    }
    loadPillar(id, panel, meta);
  }

  select.addEventListener("change", function () {
    activate(select.value);
  });

  if (tabs) {
    tabs.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-pillar]");
      if (btn) {
        activate(btn.getAttribute("data-pillar"));
      }
    });
  }

  window.addEventListener("hashchange", function () {
    var pid = pillarFromHash();
    if (select.value !== pid) {
      activate(pid);
    } else {
      scrollToModuleHash(pid);
    }
  });

  var searchInput = document.getElementById("syllabus-search");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      applySyllabusSearch(searchInput.value);
    });
  }

  activate(pillarFromHash());
})();
