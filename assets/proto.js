/* proto.js: the prototype's shell, and the little behaviour a clickable
 * mockup needs. Not product code. Adapted from Tribe Spot's proto.js
 * (D:\Projects\Tribe\designs\mockups\assets\proto.js): same structure, GroFunder's
 * three surfaces and roles.
 *
 * A page holds only its screen, as the app's rule says (a screen owns no
 * title, navigation or safe area):
 *
 *   <div data-screen data-title="Members" data-dest="members">…</div>
 *
 * and this file draws the app bar, the navigation and the review bar round it.
 * The surface's navigation comes from <surface>/assets/nav.js (window.PROTO_NAV),
 * loaded before this file; both are `defer`.
 *
 * Screen attributes:
 *   data-title, data-sub     the app bar's title (and an optional second line)
 *   data-dest                which destination is current
 *   data-wide | data-compact Screen width (default narrow, 768)
 *   data-back="url"          a back arrow before the title
 *   data-flow                a task you step through: app bar with Close/back, no navigation
 *   data-auth="sm|md"        signed out: no app bar, one centred column
 *   data-action='{"label","icon","on"|"href","variant"}'   the page's primary action
 *                            (labelled button in the bar from 600, extended FAB on compact)
 *   data-menu='[{label,icon,on|href,roles,destructive,sep}]'  the app bar's ⋮
 *
 * Content attributes:
 *   data-roles="admin manager"     removed for other roles (not dimmed)
 *   data-role-text='{"clerk":"…"}' copy per role
 *   data-coop="onboarding active on_hold ended"  shown only while the cooperative has one of those statuses
 *   data-write                     removed while the cooperative is ENDED (01: read only);
 *                                  in data-action / data-menu / Proto.menu JSON, "write": true does the same
 *   data-state="loaded|loading|empty|error|…"  states, switched from the review bar;
 *                                  ?state=empty deep-links one
 *   .proto-note / .proto-gap       lifted out of the page into the Notes panel
 *
 * Review bar switches, remembered per browser: role, cooperative status, theme.
 */
(function () {
  "use strict";

  var ROOT = (function () {
    var tag = document.querySelector('script[src$="proto.js"]');
    return tag ? tag.getAttribute("src").replace(/assets\/proto\.js$/, "") : "./";
  })();

  var NAV = window.PROTO_NAV || {};
  var APP = NAV.app || "coop";
  var APP_NAME = { member: "member app", coop: "cooperative portal", gf: "console" }[APP];
  var SOON = NAV.soon || ROOT + APP + "/soon.html";

  /* Roles per surface: staff_roles (09) for the portal and the console, and
   * signed in / out for the member app. */
  var ROLES = {
    coop: [["admin", "Administrator"], ["manager", "Manager"], ["accountant", "Accountant"], ["clerk", "Clerk"], ["viewer", "Viewer"]],
    gf: [["owner", "GroFunder owner"], ["full", "Full"], ["ops", "Operations"], ["view", "View only"], ["agent", "Farmer Support Agent"]],
    member: [["in", "Signed in"], ["out", "Signed out"]]
  }[APP];
  var ROLE_KEYS = ROLES.map(function (r) { return r[0]; });
  var ROLE_LABEL = {};
  ROLES.forEach(function (r) { ROLE_LABEL[r[0]] = r[1]; });
  var DEFAULT_ROLE = { coop: "admin", gf: "full", member: "in" }[APP];

  var store = {
    get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var ROLE_KEY = "gf.role." + APP;
  var state = {
    role: store.get(ROLE_KEY, DEFAULT_ROLE),
    coop: store.get("gf.coopStatus", "active"),
    theme: store.get("gf.theme", "system"),
    chrome: store.get("gf.chrome", "on"),
    rail: store.get("gf.rail", "")
  };
  if (ROLE_KEYS.indexOf(state.role) === -1) state.role = DEFAULT_ROLE;
  var HAS_COOP_STATUS = APP !== "gf";

  /* Destinations for the role. `dests` lists them; each may carry `roles`. */
  function destsFor(role) {
    return (NAV.dests || []).filter(function (d) { return !d.roles || d.roles.split(" ").indexOf(role) > -1; });
  }
  var REST = (NAV.rest || []).filter(function (d) { return !d.roles || d.roles.split(" ").indexOf(state.role) > -1; });

  /* The rail expands by default from 1200 unless the screen has a side pane
   * (one expanded vertical navigation at a time); a choice is remembered. */
  var paneOnScreen = false;
  function railExpanded() {
    if (state.rail) return state.rail === "expanded";
    return window.innerWidth >= 1200 && !paneOnScreen;
  }

  function icon(name, cls) {
    return '<span class="mdi mdi-' + name + (cls ? " " + cls : "") + '" aria-hidden="true"></span>';
  }

  var THEME_NEXT = { system: "light", light: "dark", dark: "system" };
  var THEME_ICON = { system: "circle-half-full", light: "white-balance-sunny", dark: "weather-night" };
  var THEME_NAME = { system: "the system setting", light: "light", dark: "dark" };
  function themeLabel() { return "Theme: " + THEME_NAME[state.theme] + ". Switch to " + THEME_NAME[THEME_NEXT[state.theme]]; }
  function themeToggleHtml(cls) {
    return '<button class="icon-btn theme-toggle ' + cls + '" type="button" aria-label="' + themeLabel() + '">' + icon(THEME_ICON[state.theme]) + "</button>";
  }
  function applyTheme() {
    var r = document.documentElement;
    if (state.theme === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", state.theme);
  }

  /* Content a role can't see is removed, not disabled. */
  function applyRole(root) {
    root = root || document;
    root.querySelectorAll("[data-roles]").forEach(function (el) {
      el.classList.toggle("role-hidden", el.getAttribute("data-roles").split(/\s+/).indexOf(state.role) === -1);
    });
    root.querySelectorAll("[data-role-text]").forEach(function (el) {
      var map = JSON.parse(el.getAttribute("data-role-text"));
      if (map[state.role]) el.textContent = map[state.role];
    });
    root.querySelectorAll("[data-coop]").forEach(function (el) {
      el.classList.toggle("coop-hidden", el.getAttribute("data-coop").split(/\s+/).indexOf(state.coop) === -1);
    });
    if (HAS_COOP_STATUS) root.querySelectorAll("[data-write]").forEach(function (el) { el.classList.toggle("coop-hidden", state.coop === "ended"); });
  }

  function protoBar() {
    var sel = function (id, label, options, value) {
      return "<label>" + label + ' <select id="' + id + '">' + options.map(function (o) {
        return '<option value="' + o[0] + '"' + (o[0] === value ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></label>";
    };
    var el = document.createElement("div");
    el.className = "proto-bar";
    el.innerHTML =
      '<a href="' + ROOT + 'index.html">&larr; Prototype</a>' +
      "<span>GroFunder " + APP_NAME + " &middot; mockup, not the app</span>" +
      '<span class="spacer"></span>' +
      sel("proto-role", APP === "member" ? "Viewer" : "Role", ROLES, state.role) +
      (HAS_COOP_STATUS ? sel("proto-coop", "Cooperative", [["onboarding", "Onboarding"], ["active", "Active"], ["on_hold", "On hold"], ["ended", "Ended"]], state.coop) : "") +
      sel("proto-theme", "Theme", [["system", "System"], ["light", "Light"], ["dark", "Dark"]], state.theme) +
      '<span id="proto-state-slot"></span>' +
      '<button class="proto-btn" id="proto-notes" type="button" aria-expanded="false" hidden>Notes<span class="count" id="proto-notes-n" hidden>0</span></button>' +
      '<button class="proto-btn" id="proto-hide" type="button" title="Hide the review bar (H)">Hide &uarr;</button>';
    return el;
  }

  function navItems() { return destsFor(state.role); }
  function railItems() {
    var items = [];
    navItems().forEach(function (d) {
      if (d.rest) REST.forEach(function (r) { items.push(r); }); else items.push(d);
    });
    return items;
  }
  function destHref(d) { return (d.hrefByRole && d.hrefByRole[state.role]) || d.href || SOON; }
  function inRest(current) { return REST.some(function (r) { return r.id === current; }); }
  var BADGES = NAV.badges || {};

  function navHtml(items, current) {
    return items.map(function (d) {
      var count = d.badge && BADGES[d.badge];
      var on = d.rest ? inRest(current) : d.id === current;
      var cur = on ? ' aria-current="page"' : "";
      var label = d.label + (count ? ", " + count + " to do" : "");
      var body = '<span class="pill' + (count ? ' nav-badge" data-badge="' + count : "") + '">' + icon(d.icon) + "</span>" +
        '<span class="lbl">' + d.label + "</span>";
      return d.rest
        ? '<button type="button" id="proto-more" aria-haspopup="menu" aria-label="More"' + cur + ">" + body + "</button>"
        : '<a href="' + destHref(d) + '" aria-label="' + label + '"' + cur + ">" + body + "</a>";
    }).join("");
  }

  function brandHtml(expanded) {
    return '<div class="rail-brand"><img src="' + ROOT + "assets/brand/" + (expanded ? "grofunder-wordmark.png" : "grofunder-leaf.png") +
      '" alt="GroFunder"></div>';
  }

  function actionData(screen, attr) {
    var raw = screen.getAttribute(attr);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) {
      console.error(attr + " is not valid JSON on " + (screen.getAttribute("data-title") || "this screen") + ": " + e.message);
      return null;
    }
  }
  function attrEsc(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;"); }
  function actionHtml(a, cls) {
    var inner = (a.icon ? icon(a.icon) : "") + "<span>" + a.label + "</span>";
    return a.href
      ? '<a class="' + cls + '" href="' + attrEsc(a.href) + '">' + inner + "</a>"
      : '<button class="' + cls + '" type="button"' + (a.on ? ' onclick="' + attrEsc(a.on) + '"' : "") + ">" + inner + "</button>";
  }
  /* A JSON item (action, ⋮, menu) is dropped for other roles, and, with
   * "write": true, while the cooperative is ENDED (01: read only). */
  function allowed(it) {
    if (it.write && HAS_COOP_STATUS && state.coop === "ended") return false;
    return !it.roles || it.roles.split(" ").indexOf(state.role) > -1;
  }

  function paneLayout(root) {
    var sub = root.querySelector(".subnav");
    if (sub && sub.parentElement) sub.parentElement.classList.add("pane-layout");
  }

  /* A second level drawn from nav.js (NAV.sections[name]) into
   * <div data-subnav="settings" data-current="clusters">. */
  function subnavs(screen) {
    screen.querySelectorAll("[data-subnav]").forEach(function (slot) {
      var tabs = (NAV.sections || {})[slot.getAttribute("data-subnav")] || [];
      var current = slot.getAttribute("data-current") || "";
      slot.className = "subnav";
      slot.setAttribute("role", "tablist");
      slot.setAttribute("aria-label", slot.getAttribute("data-label") || "Sections");
      slot.innerHTML = tabs.filter(allowed).map(function (t) {
        return t.id === current
          ? '<span class="subnav-item" role="tab" aria-selected="true">' + t.label + "</span>"
          : '<a class="subnav-item" role="tab" aria-selected="false" href="' + (t.href || SOON) + '">' + t.label + "</a>";
      }).join("");
    });
  }

  function build() {
    var screen = document.querySelector("[data-screen]");
    if (!screen) return;
    var title = screen.getAttribute("data-title") || document.title;
    var sub = screen.getAttribute("data-sub") || "";
    var dest = screen.getAttribute("data-dest") || "";
    var width = screen.hasAttribute("data-wide") ? " screen-wide" : screen.hasAttribute("data-compact") ? " screen-compact" : "";
    var primary = actionData(screen, "data-action");
    if (primary && !allowed(primary)) primary = null;
    var pageMenu = actionData(screen, "data-menu");
    if (pageMenu) {
      pageMenu = pageMenu.filter(allowed).map(function (it) { return it.on && !it.onSelect ? Object.assign({}, it, { onSelect: it.on }) : it; });
      if (!pageMenu.length) pageMenu = null;
    }
    var back = screen.getAttribute("data-back") || "";
    var flow = screen.hasAttribute("data-flow");
    var auth = screen.getAttribute("data-auth");
    if (auth === null && !flow && !window.PROTO_NAV) console.error("proto.js: no PROTO_NAV; load <surface>/assets/nav.js before proto.js");
    paneOnScreen = !!(screen.querySelector(".subnav") || screen.querySelector("[data-subnav]"));

    var titles = '<div class="appbar-titles"><span class="appbar-title">' + title + "</span>" +
      (sub ? '<span class="appbar-sub">' + sub + "</span>" : "") + "</div>";
    var primaryBar = primary ? actionHtml(primary, "btn " + (primary.variant || "btn-filled") + " appbar-primary") : "";
    var menuBtn = pageMenu ? '<button class="icon-btn" type="button" id="proto-page-menu" aria-haspopup="menu" aria-label="More actions">' + icon("dots-vertical") + "</button>" : "";
    var globals = (NAV.globals || []).filter(allowed).map(function (g) {
      var cls = "icon-btn" + (g.badge ? ' nav-badge" data-badge="' + g.badge : "");
      /* `on`: a global that opens something in place (search opens a sheet). */
      return g.on
        ? '<button class="' + cls + '" type="button" aria-label="' + g.label + '" onclick="' + attrEsc(g.on) + '">' + icon(g.icon) + "</button>"
        : '<a class="' + cls + '" href="' + (g.href || SOON) + '" aria-label="' + g.label + '">' + icon(g.icon) + "</a>";
    }).join("");
    var account = NAV.account ? '<button class="icon-btn" type="button" id="proto-account" aria-label="Account and switching" data-roles="' +
      ROLE_KEYS.filter(function (r) { return r !== "out"; }).join(" ") + '"><span class="mark-sq">' + (NAV.account.initials || "") + "</span></button>" : "";

    var bar = protoBar();
    var shell = document.createElement("div");
    shell.className = "shell";
    if (auth !== null) {
      shell.innerHTML = '<div class="shell-main"><div class="shell-body screen-centre">' +
        '<div class="screen ' + (auth === "md" ? "screen-md" : "screen-sm") + '" id="proto-slot"></div></div></div>';
    } else if (flow) {
      shell.innerHTML = '<div class="shell-main"><header class="appbar">' +
        '<a class="icon-btn" href="' + (back || "javascript:history.back()") + '" aria-label="' + (back ? "Back" : "Close") + '">' + icon(back ? "arrow-left" : "close") + "</a>" +
        titles + '<span class="spacer"></span>' + menuBtn + "</header>" +
        '<div class="shell-body" style="padding-bottom:0"><div class="screen' + width + '" id="proto-slot"></div></div></div>';
    } else {
      var exp = railExpanded();
      shell.innerHTML =
        '<nav class="rail' + (exp ? " expanded" : "") + '" aria-label="Sections">' + brandHtml(exp) +
          navHtml(railItems(), dest) + themeToggleHtml("rail-foot") + "</nav>" +
        '<div class="shell-main"><header class="appbar">' +
          '<button class="icon-btn appbar-nav-toggle" type="button" id="proto-rail-toggle" aria-expanded="' + exp + '" aria-label="' +
            (exp ? "Collapse" : "Expand") + ' the navigation">' + icon(exp ? "menu-open" : "menu") + "</button>" +
          (back ? '<a class="icon-btn" href="' + back + '" aria-label="Back">' + icon("arrow-left") + "</a>" : "") +
          titles + '<span class="spacer"></span>' + primaryBar + menuBtn + globals +
          themeToggleHtml("appbar-theme-toggle") + account +
        "</header>" +
        '<div class="shell-body"><div class="screen' + width + '" id="proto-slot"></div></div></div>' +
        '<nav class="navbar" aria-label="Sections">' + navHtml(navItems(), dest) + "</nav>";
      if (primary) {
        shell.classList.add("has-fab");
        shell.querySelector(".shell-main").insertAdjacentHTML("beforeend", actionHtml(primary, "fab"));
      }
    }

    document.body.insertBefore(shell, document.body.firstChild);
    document.body.insertBefore(bar, shell);

    /* The review bar and the app bar both stick; the app bar sits under the bar. */
    var appbar = shell.querySelector(".appbar");
    var measure = function () {
      document.documentElement.style.setProperty("--proto-bar-h", (state.chrome === "off" ? 0 : bar.offsetHeight) + "px");
      if (appbar) document.documentElement.style.setProperty("--appbar-h", appbar.offsetHeight + "px");
    };
    var tab = document.createElement("button");
    tab.type = "button"; tab.className = "proto-show"; tab.id = "proto-show";
    tab.textContent = "Review \u2193"; tab.title = "Show the review bar (H)";
    document.body.appendChild(tab);
    var applyChrome = function () { bar.hidden = state.chrome === "off"; tab.hidden = state.chrome !== "off"; measure(); };
    var toggleChrome = function () {
      state.chrome = state.chrome === "off" ? "on" : "off"; store.set("gf.chrome", state.chrome); applyChrome();
    };
    tab.addEventListener("click", toggleChrome);
    bar.querySelector("#proto-hide").addEventListener("click", toggleChrome);
    document.addEventListener("keydown", function (e) {
      if ((e.key !== "h" && e.key !== "H") || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      e.preventDefault(); toggleChrome();
    });
    applyChrome();
    window.addEventListener("resize", measure);
    if (window.ResizeObserver) { new ResizeObserver(measure).observe(bar); if (appbar) new ResizeObserver(measure).observe(appbar); }
    /* The app bar takes a tonal fill once content scrolls under it (M3). */
    if (appbar) window.addEventListener("scroll", function () { appbar.classList.toggle("scrolled", window.scrollY > 4); }, { passive: true });

    var slot = shell.querySelector("#proto-slot");
    slot.appendChild(screen);
    screen.removeAttribute("data-screen");
    screen.classList.add("screen-content");
    /* Screen `footer`: the main action pinned over the foot of the screen. */
    var foot = screen.querySelector("[data-footer]");
    if (foot) {
      foot.classList.add("screen-footer");
      foot.innerHTML = '<div class="screen-footer-inner">' + foot.innerHTML + "</div>";
      foot.firstChild.style.maxWidth = getComputedStyle(slot).maxWidth;
      slot.parentElement.appendChild(foot);
    }
    subnavs(screen);
    paneLayout(screen);

    bar.querySelector("#proto-role").addEventListener("change", function (e) { state.role = e.target.value; store.set(ROLE_KEY, state.role); location.reload(); });
    var coopSel = bar.querySelector("#proto-coop");
    if (coopSel) coopSel.addEventListener("change", function (e) { state.coop = e.target.value; store.set("gf.coopStatus", state.coop); location.reload(); });
    bar.querySelector("#proto-theme").addEventListener("change", function (e) {
      state.theme = e.target.value; store.set("gf.theme", state.theme); applyTheme(); syncThemeToggles();
    });

    function syncThemeToggles() {
      shell.querySelectorAll(".theme-toggle").forEach(function (t) {
        t.innerHTML = icon(THEME_ICON[state.theme]); t.setAttribute("aria-label", themeLabel());
      });
    }
    shell.querySelectorAll(".theme-toggle").forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        state.theme = THEME_NEXT[state.theme] || "system"; store.set("gf.theme", state.theme); applyTheme();
        var sel = document.getElementById("proto-theme"); if (sel) sel.value = state.theme;
        syncThemeToggles();
      });
    });

    var railToggle = shell.querySelector("#proto-rail-toggle");
    if (railToggle) railToggle.addEventListener("click", function () {
      var rail = shell.querySelector(".rail");
      state.rail = railExpanded() ? "collapsed" : "expanded"; store.set("gf.rail", state.rail);
      var open = state.rail === "expanded";
      rail.classList.toggle("expanded", open);
      rail.querySelector(".rail-brand").outerHTML = brandHtml(open);
      railToggle.innerHTML = icon(open ? "menu-open" : "menu");
      railToggle.setAttribute("aria-expanded", String(open));
      railToggle.setAttribute("aria-label", (open ? "Collapse" : "Expand") + " the navigation");
    });

    var more = shell.querySelector("#proto-more");
    if (more) more.addEventListener("click", function () {
      Proto.menu(more, { heading: "More", items: REST.map(function (r) { return { label: r.label, icon: r.icon, href: destHref(r) }; }) });
    });
    var pageMenuBtn = shell.querySelector("#proto-page-menu");
    if (pageMenuBtn) pageMenuBtn.addEventListener("click", function () { Proto.menu(pageMenuBtn, { heading: title, items: pageMenu }); });

    /* The account sheet: who is signed in, the places they can switch to
     * (cooperatives for staff in several; memberships for a member in several),
     * their own account pages, and sign out. From nav.js. */
    var accountBtn = shell.querySelector("#proto-account");
    if (accountBtn) accountBtn.addEventListener("click", function () {
      var a = NAV.account;
      /* A place with an `account` switches the portal to it (gf.portalCoop),
       * keeping the review bar's role; the current one shows that role. */
      var places = a.places || [];
      var stored = store.get("gf.portalCoop", "");
      var current = Math.max(0, places.findIndex(function (p) { return p.account && p.account === stored; }));
      var place = function (p, i) {
        var mark = '<span class="mark-sq lg">' + p.name.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2) + "</span>";
        var text = '<span class="grow"><span class="text-body-lg">' + p.name + '</span><span class="text-body-md tone-muted">' +
          (i === current || p.sub === "{role}" ? ROLE_LABEL[state.role] : p.sub) + "</span></span>";
        if (i === current) return '<div class="rowcard" aria-current="true">' + mark + text + icon("check", "tone-primary") + "</div>";
        return p.account
          ? '<a class="rowcard" href="#" data-switch="' + attrEsc(p.account) + '">' + mark + text + "</a>"
          : '<a class="rowcard" href="#" onclick="Proto.close();Proto.snack(\'Now in ' + attrEsc(p.name) + '\');return false">' + mark + text + "</a>";
      };
      var sheet = Proto.sheet({
        title: a.title || "Account",
        body: '<span class="text-label-md tone-muted">' + (a.placesLabel || "Signed in to") + "</span>" +
          '<div class="list rowcards">' + places.map(place).join("") + "</div>" +
          '<div class="list rowcards">' + (a.links || []).map(function (l) {
            return '<a class="rowcard" href="' + (l.href || SOON) + '">' + icon(l.icon) + '<span class="grow"><span class="text-body-lg">' + l.label + "</span>" +
              (l.sub ? '<span class="text-body-md tone-muted">' + l.sub + "</span>" : "") + "</span></a>";
          }).join("") +
          '<a class="rowcard" href="' + (a.signOut || SOON) + '">' + icon("logout") + '<span class="grow"><span class="text-body-lg">Sign out</span></span></a></div>'
      });
      sheet.addEventListener("click", function (e) {
        var s = e.target.closest ? e.target.closest("[data-switch]") : null;
        if (!s) return;
        e.preventDefault(); store.set("gf.portalCoop", s.getAttribute("data-switch")); location.reload();
      });
    });

    applyRole();
    buildStates(bar.querySelector("#proto-state-slot"), screen);
    buildNotes(bar, screen);
  }

  /* ----------------------------------------------------------- states */
  var goState = function () {};
  function buildStates(slot, screen) {
    var nodes = screen.querySelectorAll("[data-state]");
    if (!nodes.length || !slot) return;
    var order = ["loaded", "loading", "empty", "error", "offline"];
    var found = [];
    nodes.forEach(function (n) { n.getAttribute("data-state").split(/\s+/).forEach(function (s) { if (found.indexOf(s) === -1) found.push(s); }); });
    var rank = function (s) { var i = order.indexOf(s); return i === -1 ? order.length : i; };
    found.sort(function (a, b) { return rank(a) - rank(b); });
    var el = document.createElement("div");
    el.className = "proto-states";
    el.innerHTML = '<span class="lbl">State</span>' + found.map(function (s) {
      return '<button type="button" data-go="' + s + '" aria-pressed="false">' + s + "</button>";
    }).join("");
    slot.appendChild(el);
    function show(s) {
      nodes.forEach(function (n) { n.classList.toggle("state-hidden", n.getAttribute("data-state").split(/\s+/).indexOf(s) === -1); });
      el.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-go") === s)); });
      document.dispatchEvent(new CustomEvent("proto:state", { detail: s }));
    }
    el.addEventListener("click", function (e) { var b = e.target.closest("button[data-go]"); if (b) show(b.getAttribute("data-go")); });
    goState = function (s) { if (found.indexOf(s) !== -1) { show(s); window.scrollTo(0, 0); } };
    var asked = new URLSearchParams(location.search).get("state");
    show(asked && found.indexOf(asked) !== -1 ? asked : found.indexOf("loaded") !== -1 ? "loaded" : found[0]);
  }

  /* ------------------------------------------------------------ notes */
  var notes = [], panel = null;
  function lift(root) {
    var found = root.querySelectorAll(".proto-note");
    found.forEach(function (el) {
      notes.push('<div class="proto-note' + (el.classList.contains("proto-gap") ? " proto-gap" : "") + '">' + el.innerHTML + "</div>");
      el.remove();
    });
    if (found.length) refreshNotes();
  }
  function refreshNotes() {
    var btn = document.getElementById("proto-notes"), n = document.getElementById("proto-notes-n");
    if (!btn || !n) return;
    btn.hidden = notes.length === 0;
    var gaps = notes.filter(function (h) { return h.indexOf("proto-gap") !== -1; }).length;
    n.hidden = gaps === 0; n.textContent = String(gaps);
    if (panel) panel.querySelector("#proto-panel-body").innerHTML = notes.join("");
  }
  function buildNotes(bar, screen) {
    lift(screen);
    var btn = bar.querySelector("#proto-notes");
    btn.addEventListener("click", function () {
      if (panel) return closeNotes();
      panel = document.createElement("div");
      panel.className = "proto-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "About this screen");
      panel.innerHTML = '<div class="hd"><span class="text-title-md">About this screen</span>' +
        '<button class="btn btn-text btn-sm" type="button" id="proto-panel-x">Close</button></div>' +
        '<span class="text-body-sm tone-muted">Why it is built this way, and what it needs that does not exist yet (gaps, in red). None of this is part of the screen.</span>' +
        '<div class="col gap-2" id="proto-panel-body"></div>';
      document.body.appendChild(panel);
      panel.querySelector("#proto-panel-body").innerHTML = notes.join("");
      panel.querySelector("#proto-panel-x").addEventListener("click", closeNotes);
      btn.setAttribute("aria-expanded", "true");
      document.addEventListener("keydown", escNotes);
    });
    refreshNotes();
  }
  function closeNotes() {
    if (panel) panel.remove(); panel = null;
    var btn = document.getElementById("proto-notes"); if (btn) btn.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", escNotes);
  }
  function escNotes(e) { if (e.key === "Escape") closeNotes(); }

  /* --------------------------------------------------------- overlays */
  var Proto = window.Proto = {
    /** Sheet: bottom sheet on compact, side sheet from 600. opts: title, body, footer. */
    sheet: function (opts) {
      Proto.close();
      var scrim = document.createElement("div"); scrim.className = "scrim"; scrim.addEventListener("click", Proto.close);
      var el = document.createElement("div");
      el.className = "sheet" + (opts.wide ? " sheet-wide" : ""); el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", opts.title || "");
      el.innerHTML = '<div class="sheet-handle"></div>' +
        (opts.title ? '<div class="sheet-head"><span class="text-title-lg">' + opts.title + '</span><button class="icon-btn" type="button" aria-label="Close">' + icon("close") + "</button></div>" : "") +
        opts.body + (opts.footer ? '<div class="sheet-foot actions">' + opts.footer + "</div>" : "");
      document.body.appendChild(scrim); document.body.appendChild(el);
      applyRole(el); lift(el);
      var close = el.querySelector('[aria-label="Close"]'); if (close) close.addEventListener("click", Proto.close);
      document.addEventListener("keydown", escClose);
      return el;
    },
    /** ActionMenu: a flat list of actions; on a phone, near the bottom, a sheet instead. */
    menu: function (trigger, opts) {
      opts = opts || {};
      var items = (opts.items || []).filter(allowed);
      var r = trigger.getBoundingClientRect();
      if (window.innerWidth < 600 && r.top > window.innerHeight * 0.72) {
        return Proto.sheet({ title: opts.heading || "", body: '<div class="rowcards">' + items.map(function (it) {
          var inner = icon(it.icon || "chevron-right") + '<span class="grow"><span class="text-body-lg">' + it.label + "</span>" +
            (it.sub ? '<span class="text-body-md tone-muted">' + it.sub + "</span>" : "") + "</span>";
          return it.href ? '<a class="rowcard" href="' + it.href + '">' + inner + "</a>"
            : '<button class="rowcard" type="button"' + (it.onSelect ? ' onclick="' + attrEsc("Proto.close();" + it.onSelect) + '"' : "") + ">" + inner + "</button>";
        }).join("") + "</div>" });
      }
      Proto.closeMenu();
      if (!document.querySelector(".sheet")) Proto.close();
      var scrim = document.createElement("div"); scrim.className = "scrim menu-scrim"; scrim.style.background = "transparent"; scrim.addEventListener("click", Proto.closeMenu);
      var el = document.createElement("div");
      el.className = "menu"; el.setAttribute("role", "menu"); if (opts.heading) el.setAttribute("aria-label", opts.heading);
      el.innerHTML = items.map(function (it) {
        var inner = (it.icon ? icon(it.icon) : "") + '<span class="grow"><span>' + it.label + "</span>" + (it.sub ? '<span class="sub">' + it.sub + "</span>" : "") + "</span>";
        var cls = "menu-item" + (it.destructive ? " destructive" : "");
        return (it.sep ? '<hr class="menu-sep">' : "") + (it.href
          ? '<a class="' + cls + '" role="menuitem" tabindex="-1" href="' + it.href + '">' + inner + "</a>"
          : '<button class="' + cls + '" role="menuitem" tabindex="-1" type="button"' + (it.onSelect ? ' onclick="' + attrEsc("Proto.closeMenu();" + it.onSelect) + '"' : "") + ">" + inner + "</button>");
      }).join("");
      document.body.appendChild(scrim); document.body.appendChild(el);
      var w = el.offsetWidth, h = el.offsetHeight, pad = 8;
      var left = Math.min(Math.max(pad, r.right - w), window.innerWidth - w - pad), top = r.bottom + 4;
      if (top + h > window.innerHeight - pad) { var above = r.top - h - 4; top = above >= pad ? above : Math.max(pad, window.innerHeight - h - pad); }
      el.style.left = left + "px"; el.style.top = top + "px";
      var cells = [].slice.call(el.querySelectorAll('[role="menuitem"]'));
      if (cells.length) cells[0].focus();
      el.addEventListener("keydown", function (e) {
        var i = cells.indexOf(document.activeElement), n = cells.length;
        if (e.key === "ArrowDown") { e.preventDefault(); cells[(i + 1) % n].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); cells[(i - 1 + n) % n].focus(); }
        else if (e.key === "Tab") Proto.close();
      });
      Proto._returnFocus = trigger;
      document.addEventListener("keydown", escClose);
      return el;
    },
    /** FormDialog: full screen on compact, centred from 600. opts: title, body, submit, onSubmit. */
    dialog: function (opts) {
      var over = stackable();
      var scrim = document.createElement("div"); scrim.className = "scrim" + (over ? " stacked" : ""); scrim.addEventListener("click", function () { done(); });
      var el = document.createElement("div");
      el.className = "dialog" + (over ? " stacked" : ""); el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
      var done = function () { if (over) { scrim.remove(); el.remove(); } else Proto.close(); };
      el.innerHTML = '<div class="row between"><span class="dialog-title">' + (opts.title || "") + '</span><button class="icon-btn" type="button" aria-label="Close">' + icon("close") + "</button></div>" +
        opts.body + (opts.submit ? '<div class="actions"><button class="btn btn-text" type="button" data-cancel>Cancel</button><button class="btn btn-filled" type="button" data-submit>' + opts.submit + "</button></div>" : "");
      document.body.appendChild(scrim); document.body.appendChild(el);
      applyRole(el); lift(el);
      el.querySelector('[aria-label="Close"]').addEventListener("click", done);
      var c = el.querySelector("[data-cancel]"); if (c) c.addEventListener("click", done);
      var s = el.querySelector("[data-submit]"); if (s) s.addEventListener("click", function () { done(); if (opts.onSubmit) opts.onSubmit(el); });
      var first = el.querySelector("input, select, textarea"); if (first) first.focus();
      document.addEventListener("keydown", escClose);
      return el;
    },
    /** ConfirmDialog: a short question before a destructive or final step. */
    confirm: function (opts) {
      var over = stackable();
      var scrim = document.createElement("div"); scrim.className = "scrim" + (over ? " stacked" : "");
      var el = document.createElement("div");
      el.className = "dialog confirm" + (over ? " stacked" : ""); el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true");
      var done = function () { if (over) { scrim.remove(); el.remove(); } else Proto.close(); };
      el.innerHTML = '<span class="text-headline-sm">' + opts.title + "</span>" + (opts.message ? '<p class="text-body-md tone-muted">' + opts.message + "</p>" : "") +
        (opts.body || "") + '<div class="actions"><button class="btn btn-text" type="button" data-cancel>' + (opts.cancel || "Cancel") + "</button>" +
        '<button class="btn ' + (opts.destructive ? "btn-text tone-error" : "btn-text") + '" type="button" data-ok>' + opts.confirm + "</button></div>";
      document.body.appendChild(scrim); document.body.appendChild(el);
      el.querySelector("[data-cancel]").addEventListener("click", done);
      el.querySelector("[data-ok]").addEventListener("click", function () { done(); if (opts.onConfirm) opts.onConfirm(); });
      document.addEventListener("keydown", escClose);
      return el;
    },
    /** Close only an open menu, leaving any panel under it. */
    closeMenu: function () {
      var back = Proto._returnFocus; Proto._returnFocus = null;
      document.querySelectorAll(".menu, .menu-scrim").forEach(function (n) { n.remove(); });
      if (back && back.focus) back.focus();
    },
    close: function () {
      var back = Proto._returnFocus; Proto._returnFocus = null;
      document.querySelectorAll(".scrim, .sheet, .dialog, .menu").forEach(function (n) { n.remove(); });
      document.removeEventListener("keydown", escClose);
      if (back && back.focus) back.focus();
    },
    /** Snackbar: the result of an action. Never a dialog for success. */
    snack: function (text, action, onAction) {
      var old = document.querySelector(".snackbar"); if (old) old.remove();
      var el = document.createElement("div");
      el.className = "snackbar"; el.setAttribute("role", "status");
      el.innerHTML = '<span class="grow">' + text + "</span>" + (action ? '<button type="button">' + action + "</button>" : "");
      document.body.appendChild(el);
      if (action) el.querySelector("button").addEventListener("click", function () { el.remove(); if (onAction) onAction(); });
      setTimeout(function () { el.remove(); }, action ? 8000 : 4000);
    },
    icon: icon,
    /** Re-apply role and status hiding to content a page drew after load. */
    applyRoles: function (root) { applyRole(root); },
    role: function () { return state.role; },
    coop: function () { return state.coop; },
    go: function (s) { goState(s); },
    ROOT: ROOT,
    SOON: SOON
  };
  function escClose(e) {
    if (e.key !== "Escape") return;
    if (document.querySelector(".menu")) return Proto.closeMenu();
    var top = document.querySelectorAll(".dialog.stacked, .scrim.stacked");
    if (top.length) top.forEach(function (n) { n.remove(); }); else Proto.close();
  }
  /* A dialog opened while a panel is open sits on top of it, so finishing the
   * dialog returns to the panel rather than to the page. */
  function stackable() { if (document.querySelector(".sheet")) return true; Proto.close(); return false; }

  /* Save per card: an editable card carries its own [data-save] button,
   * disabled until something inside the card changes (react-hook-form's
   * isDirty in the app). The attribute's value is the snackbar. */
  function cardSave(el) {
    var card = el && el.closest ? el.closest(".card, .section") : null;
    return card ? card.querySelector("[data-save]") : null;
  }
  function cardDirty(e) { var b = cardSave(e.target); if (b) b.disabled = false; }
  document.addEventListener("input", cardDirty);
  document.addEventListener("change", cardDirty);
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-save], .chip") : null;
    if (!t) return;
    if (!t.hasAttribute("data-save")) { cardDirty(e); return; }
    t.disabled = true;
    Proto.snack(t.getAttribute("data-save") || "Saved");
  }, true);

  /* In-page Tabs: <div class="tabs" data-tabs> with buttons [data-tab="x"],
   * panels [data-panel="x"] in the same [data-tabset]. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-tab]") : null;
    if (!b) return;
    var set = b.closest("[data-tabset]") || document;
    var id = b.getAttribute("data-tab");
    set.querySelectorAll("[data-tab]").forEach(function (t) { t.setAttribute("aria-selected", String(t === b)); });
    set.querySelectorAll("[data-panel]").forEach(function (p) { p.classList.toggle("hidden", p.getAttribute("data-panel") !== id); });
  });

  /* ChoiceChips: one choice from a row; [data-choice] on the row. */
  document.addEventListener("click", function (e) {
    var c = e.target.closest ? e.target.closest("[data-choice] .chip") : null;
    if (!c) return;
    c.parentElement.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-checked", String(x === c)); });
  });

  /* Disclosure rows open and close. */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest(".disclosure-trigger") : null;
    if (!t) return;
    var open = t.getAttribute("aria-expanded") !== "true";
    t.setAttribute("aria-expanded", String(open));
    var panel = t.nextElementSibling; if (panel) panel.hidden = !open;
  });

  applyTheme();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
