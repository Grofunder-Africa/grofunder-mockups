/* members.js: what the portal's member screens share (phase 6, UI-35).
 * Load it after canon.js (and portal.js where the page has it), without defer.
 * Proto is only used once a dialog opens.
 *
 *   Members.coop()              the cooperative shown (Portal's, else the switcher's pick, else Kijani)
 *   Members.url(id) / listUrl   links to the member page and the register
 *   Members.chip(status)        the status chip: Active success, Suspended warning, Exited neutral
 *   Members.find(coopId, term)  note 05's search: number or ID exactly, phone exactly, else name
 *   Members.suggestNo(coopId)   the next member number after the highest in use
 *   Members.holdings(id)        a member's positions, current and past
 *   Members.canDelete(m)        added by mistake: one status change, no positions, no login, nothing pointing at it
 *   Members.statusDialog(id)    C13
 *   Members.assignDialog(id)    C14, assign; Members.endDialog(holdingId) ends one
 */
(function () {
  "use strict";
  var q = GF.q, f = GF.fmt, get = GF.get;
  var tag = document.querySelector('script[src$="assets/members.js"]');
  var R = tag ? tag.getAttribute("src").replace(/assets\/members\.js$/, "") : "../";
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var MANAGE = "admin manager";

  function coopId() {
    if (window.Portal) return Portal.COOP;
    var c = null; try { c = localStorage.getItem("gf.portalCoop"); } catch (e) {}
    return c === "co-mawingu" ? c : GF.who.kijani;
  }
  /** The cooperative's status, as the review bar sets it (01). */
  function coopStatus() { return window.Portal ? Portal.status : (function () { try { return localStorage.getItem("gf.coopStatus") || "active"; } catch (e) { return "active"; } })(); }
  var acceptsNewWork = function () { var s = coopStatus(); return s === "active" || s === "onboarding"; };

  var STATUS = { ACTIVE: ["success", "Active"], SUSPENDED: ["warning", "Suspended"], EXITED: ["neutral", "Exited"] };
  var chip = function (s) { return '<span class="status status-' + STATUS[s][0] + '">' + STATUS[s][1] + "</span>"; };
  var clusterName = function (id) { if (!id) return "No cluster"; var c = get(id); return c.name + (c.status === "ARCHIVED" ? " (archived)" : ""); };
  var url = function (id, tab) { return R + "members/member.html?m=" + id + (tab ? "&tab=" + tab : ""); };
  var listUrl = R + "members/index.html";

  /* Search (05): a member number or an ID matches exactly (ignoring case, after the ID normaliser),
   * a phone exactly when the text reads as one, otherwise the name, loosely (the trigram index). */
  var normId = function (t) { return t.replace(/\s+/g, "").replace(/\.0$/, "").toUpperCase(); };
  function phoneOf(t) {
    var d = t.replace(/[\s-]/g, "");
    if (/^(\+?254|0)[17]\d{8}$/.test(d)) return "+254" + d.replace(/^(\+?254|0)/, "");
    return null;
  }
  function find(cid, term) {
    var t = (term || "").trim(); if (!t) return [];
    var list = q.members(cid), up = t.toUpperCase(), id = normId(t), ph = phoneOf(t);
    var exact = list.filter(function (m) { return m.member_no.toUpperCase() === up || m.id_number.toUpperCase() === id || (ph && m.phone === ph); });
    if (exact.length) return exact;
    if (ph || /^\d{5,}$/.test(id)) return [];
    var words = t.toLowerCase().split(/\s+/);
    return list.filter(function (m) {
      var n = m.full_name.toLowerCase() + " " + ((m.profile && m.profile.preferred_name) || "").toLowerCase();
      return words.every(function (w) { return n.indexOf(w) > -1 || near(w, n); });
    }).sort(function (a, b) { return a.full_name < b.full_name ? -1 : 1; });
  }
  /* A small misspelling still matches: one letter off in a word of five or more. */
  function near(w, name) {
    if (w.length < 5) return false;
    return name.split(/\s+/).some(function (x) {
      if (Math.abs(x.length - w.length) > 1) return false;
      var i = 0, j = 0, miss = 0;
      while (i < w.length && j < x.length) { if (w[i] === x[j]) { i++; j++; } else { miss++; if (w.length > x.length) i++; else if (x.length > w.length) j++; else { i++; j++; } } }
      return miss + (w.length - i) + (x.length - j) <= 1;
    });
  }

  /* suggest_member_no (05): the highest trailing number, plus one, same prefix and padding. */
  function suggestNo(cid) {
    var best = null;
    q.members(cid).forEach(function (m) {
      var mm = /^(.*?)(\d+)$/.exec(m.member_no || ""); if (!mm) return;
      if (!best || +mm[2] > +best[2]) best = mm;
    });
    return best ? best[1] + String(+best[2] + 1).padStart(best[2].length, "0") : "";
  }

  function holdings(memberId) { return GF.memberPositions.filter(function (h) { return h.member === memberId; }); }
  function canDelete(m) {
    return q.statusHistory(m.id).length <= 1 && !holdings(m.id).length && !m.user && !q.deliveries({ member: m.id }).length && !q.payouts({ member: m.id }).length;
  }
  function age(m) {
    if (!m.date_of_birth) return null;
    var t = GF.TODAY, a = +t.slice(0, 4) - +m.date_of_birth.slice(0, 4);
    return t.slice(5) < m.date_of_birth.slice(5) ? a - 1 : a;
  }

  /* --------------------------------------------- C13: change status */
  var MOVES = {
    ACTIVE: [["SUSPENDED", "Suspend", true], ["EXITED", "Record an exit", true]],
    SUSPENDED: [["ACTIVE", "Reactivate", false], ["EXITED", "Record an exit", true]],
    EXITED: [["ACTIVE", "Rejoin", true]]
  };
  var EXIT_KINDS = ["Withdrew", "Expelled", "Died", "Transferred"];
  function statusDialog(memberId, onDone) {
    var m = get(memberId), moves = MOVES[m.status], hs = holdings(m.id).filter(function (h) { return h.status === "ACTIVE"; });
    var clusterHs = hs.filter(function (h) { return get(h.position).scope === "CLUSTER"; });
    var el = Proto.dialog({ title: "Change " + m.full_name.split(" ")[0] + "'s status", submit: "Save", body:
      '<p class="text-body-md tone-muted">Now ' + STATUS[m.status][1].toLowerCase() + ". Every change is kept in the member's history with who made it and why.</p>" +
      '<div class="field"><span class="field-label" id="st-l">Change to</span><div class="radio-cards" role="radiogroup" aria-labelledby="st-l">' + moves.map(function (mv, i) {
        var blocked = mv[0] === "ACTIVE" && m.status === "EXITED" && !acceptsNewWork();
        return '<label class="radio-card" style="flex-direction:row;gap:12px;align-items:flex-start' + (blocked ? ";opacity:.5" : "") + '"><input type="radio" name="st" value="' + mv[0] + '"' + (i === 0 && !blocked ? " checked" : "") + (blocked ? " disabled" : "") + '><span class="col"><span class="text-body-lg">' + mv[1] + "</span>" +
          (blocked ? '<span class="text-body-sm tone-muted">Not while the cooperative is ' + (coopStatus() === "ended" ? "ended" : "on hold") + ": rejoining counts as a new member (05).</span>" : "") + "</span></label>";
      }).join("") + "</div></div>" +
      '<div class="field hidden" id="st-kind-f"><span class="field-label" id="st-k">Why they left</span><div class="chip-row" data-choice role="radiogroup" aria-labelledby="st-k">' +
        EXIT_KINDS.map(function (k) { return '<button class="chip" type="button" role="radio" aria-checked="false" data-k="' + k + '">' + k + "</button>"; }).join("") + "</div></div>" +
      '<div class="field" id="st-r-f"><label class="field-label" for="st-r" id="st-rl">Reason</label><textarea class="field-input" id="st-r"></textarea><span class="field-error hidden" id="st-e"></span></div>' +
      '<div class="banner banner-warning hidden" id="st-ends"><span class="mdi mdi-alert-outline" aria-hidden="true"></span><div class="grow"><span class="text-body-md" id="st-ends-t"></span></div></div>' });
    var reason = el.querySelector("#st-r"), err = el.querySelector("#st-e");
    function sync() {
      var to = (el.querySelector('input[name="st"]:checked') || {}).value, mv = moves.find(function (x) { return x[0] === to; }) || [];
      el.querySelector("#st-kind-f").classList.toggle("hidden", to !== "EXITED");
      el.querySelector("#st-rl").innerHTML = mv[2] ? "Reason" : 'Reason <span class="optional">(optional)</span>';
      var ending = to === "EXITED" ? hs : to === "SUSPENDED" ? clusterHs : [];
      el.querySelector("#st-ends").classList.toggle("hidden", !ending.length);
      el.querySelector("#st-ends-t").textContent = ending.length ? (to === "EXITED" ? "Leaving ends every position they hold: " : "Leaving active ends their cluster positions: ") +
        ending.map(function (h) { return get(h.position).name + (h.cluster ? " (" + get(h.cluster).name + ")" : ""); }).join(", ") + "." : "";
    }
    el.addEventListener("change", sync);
    el.querySelectorAll("[data-k]").forEach(function (c) { c.addEventListener("click", function () { if (!reason.value.trim() || EXIT_KINDS.indexOf(reason.value.split(".")[0]) > -1) reason.value = c.getAttribute("data-k") + ". "; reason.focus(); }); });
    sync();
    var btn = el.querySelector("[data-submit]"), fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", function () {
      var to = (el.querySelector('input[name="st"]:checked') || {}).value, mv = moves.find(function (x) { return x[0] === to; });
      if (!mv) return;
      if (mv[2] && !reason.value.trim()) {
        err.textContent = "Say why. It's kept in the history and shown to staff."; err.classList.remove("hidden"); reason.setAttribute("aria-invalid", "true"); reason.focus(); return;
      }
      Proto.close();
      Proto.snack(m.full_name + (to === "EXITED" ? " recorded as exited" : to === "SUSPENDED" ? " suspended" : m.status === "EXITED" ? " rejoined" : " reactivated"), "Undo");
      if (onDone) onDone(to);
    });
    return el;
  }

  /* --------------------------------------------- C14: positions */
  function assignDialog(memberId) {
    var m = get(memberId);
    if (m.status !== "ACTIVE") return Proto.snack("Only active members can hold a position (05).");
    var mine = holdings(m.id).filter(function (h) { return h.status === "ACTIVE"; }).map(function (h) { return h.position; });
    var ps = GF.positions.filter(function (p) { return p.cooperative === m.cooperative && p.status === "ACTIVE"; });
    var el = Proto.dialog({ title: "Give " + m.full_name.split(" ")[0] + " a position", submit: "Assign", body:
      '<div class="field"><label class="field-label" for="ap">Position</label><select class="field-input" id="ap">' + ps.map(function (p) {
        return '<option value="' + p.id + '"' + (mine.indexOf(p.id) > -1 ? " disabled" : "") + ">" + p.name + (mine.indexOf(p.id) > -1 ? " (holds it now)" : "") + "</option>";
      }).join("") + '</select><span class="field-help" id="ap-h"></span><span class="field-error hidden" id="ap-e"></span></div>' +
      '<div class="field"><label class="field-label" for="ad">From</label><input class="field-input tabular" id="ad" type="date" value="' + GF.TODAY + '" max="' + GF.TODAY + '"></div>' +
      '<div class="field"><label class="field-label" for="an">Note <span class="optional">(optional)</span></label><input class="field-input" id="an" placeholder="For example: elected at the AGM"></div>' +
      '<a class="text-body-sm" href="' + R + 'settings/positions.html" data-roles="' + MANAGE + '">Positions are set up in Settings</a>' });
    var sel = el.querySelector("#ap");
    var firstFree = ps.find(function (p) { return mine.indexOf(p.id) === -1; }); if (firstFree) sel.value = firstFree.id;
    /* The holder limit, counted per cluster for a cluster position (05). */
    function full(p) {
      var holders = GF.memberPositions.filter(function (h) { return h.position === p.id && h.status === "ACTIVE" && (p.scope !== "CLUSTER" || h.cluster === m.cluster); });
      return p.max_holders && holders.length >= p.max_holders ? holders : null;
    }
    function sync() {
      var p = get(sel.value), h = full(p), e = el.querySelector("#ap-e");
      el.querySelector("#ap-h").textContent = p.scope === "CLUSTER" ? (m.cluster ? "For " + get(m.cluster).name + ", " + m.full_name.split(" ")[0] + "'s cluster." : "") : (p.max_holders ? "Up to " + p.max_holders + " at a time." : "No limit on holders.");
      var noCluster = p.scope === "CLUSTER" && !m.cluster;
      e.classList.toggle("hidden", !h && !noCluster);
      e.textContent = noCluster ? "A cluster position needs the member to be in a cluster." :
        h ? p.name + (p.scope === "CLUSTER" ? " for " + get(m.cluster).name : "") + " is held by " + h.map(function (x) { return get(x.member).full_name; }).join(" and ") + ". End that first, on their page." : "";
      sel.setAttribute("aria-invalid", String(!!(h || noCluster)));
      return !(h || noCluster);
    }
    sel.addEventListener("change", sync); sync();
    var btn = el.querySelector("[data-submit]"), fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", function () { if (!sync()) return sel.focus(); var p = get(sel.value); Proto.close(); Proto.snack(m.full_name + " is now " + p.name.toLowerCase() + (p.scope === "CLUSTER" ? " for " + get(m.cluster).name : "")); });
    return el;
  }
  function endDialog(holdingId) {
    var h = GF.memberPositions.find(function (x) { return x.id === holdingId; }), p = get(h.position), m = get(h.member);
    return Proto.dialog({ title: "End " + m.full_name.split(" ")[0] + "'s time as " + p.name.toLowerCase(), submit: "End", body:
      '<p class="text-body-md tone-muted">Held since ' + f.date(h.details.started_on) + ". It stays on their record as past service.</p>" +
      '<div class="field"><label class="field-label" for="ee">Last day</label><input class="field-input tabular" id="ee" type="date" value="' + GF.TODAY + '" max="' + GF.TODAY + '"></div>' +
      '<div class="field"><label class="field-label" for="en">Note <span class="optional">(optional)</span></label><input class="field-input" id="en" placeholder="For example: term ended at the AGM"></div>',
      onSubmit: function () { Proto.snack(m.full_name + " no longer " + p.name.toLowerCase(), "Undo"); } });
  }

  window.Members = {
    coop: function () { return get(coopId()); }, coopId: coopId, coopStatus: coopStatus, acceptsNewWork: acceptsNewWork,
    STATUS: STATUS, chip: chip, clusterName: clusterName, url: url, listUrl: listUrl, R: R, esc: esc, MANAGE: MANAGE,
    find: find, phoneOf: phoneOf, suggestNo: suggestNo, holdings: holdings, canDelete: canDelete, age: age,
    statusDialog: statusDialog, assignDialog: assignDialog, endDialog: endDialog
  };
})();
