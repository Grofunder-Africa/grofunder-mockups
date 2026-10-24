/* search.js: the portal's search sheet (C2, phase 6, UI-35).
 * Opened from the app bar's search on every portal page; nav.js loads this
 * file (and members.js) the first time it's needed.
 *
 * One box, as note 05's `q` works: a member number or ID exactly, a phone
 * exactly when the text reads as one, otherwise a name, loosely. A receipt
 * number finds the delivery (07), recorded or voided.
 *
 *   PortalSearch.open([term])
 */
(function () {
  "use strict";
  var q = GF.q, f = GF.fmt, get = GF.get, M = window.Members;
  var LIMIT = 8;

  function deliveriesByReceipt(cid, term) {
    var t = term.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z]{1,3}-?\d{2,}$/.test(t)) return [];
    var norm = function (r) { return r.toUpperCase().replace("-", ""); };
    return q.deliveries({ cooperative: cid }).filter(function (d) { return d.receipt_no && norm(d.receipt_no) === norm(t); });
  }
  function results(term) {
    var cid = M.coopId(), t = term.trim();
    if (!t) return '<div class="col gap-2 tone-muted"><span class="text-body-md">Type a name, a member number (M-0142), an ID number, a phone (0712 345 678) or a receipt number (R-4471).</span>' +
      '<span class="text-body-sm">Numbers and phones must be whole; names can be partly typed or slightly misspelt.</span></div>';
    var ms = M.find(cid, t), ds = deliveriesByReceipt(cid, t);
    var html = "";
    if (ds.length) html += '<span class="text-label-md tone-muted">Receipt</span><div class="list rowcards">' + ds.map(function (d) {
      var m = get(d.member), v = d.status === "VOIDED";
      var link = M.R + "produce/index.html?d=" + (v ? d.id : encodeURIComponent(d.receipt_no));
      return '<a class="rowcard" href="' + link + '"><span class="grow"><span class="text-body-lg tabular">' + d.receipt_no + " · " + M.esc(m.full_name) + '</span><span class="text-body-md tone-muted tabular">' +
        f.date(d.delivered_on) + " · " + f.productName(d.product, d.grade) + "</span></span>" +
        '<span class="col end gap-1"><span class="text-title-md tabular' + (v ? " struck tone-muted" : "") + '">' + f.delivery(d) + "</span>" + (v ? '<span class="status status-neutral">Voided</span>' : "") + "</span></a>";
    }).join("") + "</div>";
    if (ms.length) html += '<span class="text-label-md tone-muted">Members</span><div class="list rowcards">' + ms.slice(0, LIMIT).map(function (m) {
      var pn = m.profile && m.profile.preferred_name;
      return '<a class="rowcard" href="' + M.url(m.id) + '"><span class="avatar avatar-sm" aria-hidden="true">' + f.initials(m.full_name) + '</span><span class="grow"><span class="text-body-lg">' + M.esc(m.full_name) + (pn ? ' <span class="tone-muted">(' + M.esc(pn) + ")</span>" : "") + "</span>" +
        '<span class="text-body-md tone-muted tabular">' + (m.member_no || "No number") + " · " + M.clusterName(m.cluster) + (m.phone ? " · " + f.phone(m.phone) : "") + "</span></span>" + M.chip(m.status) + "</a>";
    }).join("") + "</div>" +
      (ms.length > LIMIT ? '<a class="btn btn-text" href="' + M.listUrl + "?q=" + encodeURIComponent(t) + '">See all ' + ms.length + " in the register</a>" : "");
    if (!html) html = '<div class="empty"><span class="mdi mdi-magnify" aria-hidden="true"></span><span class="text-title-lg">Nothing matches "' + M.esc(t) + '"</span>' +
      '<span class="text-body-md">' + (/\d{5,}/.test(t) ? "A number or phone must be typed in full." : "Try part of the name, or the member number.") + "</span></div>";
    return html;
  }

  function open(term) {
    var el = Proto.sheet({ title: "Search", body:
      '<div class="field search"><div class="field-box"><span class="lead"><span class="mdi mdi-magnify" aria-hidden="true"></span></span>' +
        '<input class="field-input" id="ps-q" type="search" autocomplete="off" placeholder="Name, number, ID, phone or receipt" aria-label="Search members and receipts" aria-controls="ps-r"></div></div>' +
      '<div class="col gap-3" id="ps-r" aria-live="polite"></div>' });
    var input = el.querySelector("#ps-q"), out = el.querySelector("#ps-r");
    input.value = term || "";
    var draw = function () { out.innerHTML = results(input.value); };
    input.addEventListener("input", draw);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { var first = out.querySelector("a.rowcard"); if (first) location.href = first.getAttribute("href"); } });
    draw(); input.focus();
    return el;
  }

  window.PortalSearch = { open: open, results: results };
})();
