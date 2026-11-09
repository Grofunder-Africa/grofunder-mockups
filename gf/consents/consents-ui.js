/* consents-ui.js: what the console's consent screens share (phase 15, UI-100; note 22, revision 2,
 * signed off 2026-11-09). Loaded after canon.js, kyc.js, partners.js, consents.js and console.js.
 *
 * Who may do what (note 22, Permissions), as the prototype's roles:
 *   view      every office role (consents.view): documents, versions, slots, members' records
 *   manage    Full and Owner (consents.manage): create documents, write drafts, bind slots (Q7)
 *   publish   Owner only (consents.publish): publish, schedule, take down, archive (Q7)
 *   record, withdraw   Operations and up, from the member panel (G10); agents record at their visits (K6)
 */
(function () {
  "use strict";
  var C = GF.consents, f = GF.fmt;
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var when = function (iso) { return f.date(iso, "short") + (iso && iso.length > 10 ? ", " + iso.slice(11, 16) : ""); };
  var who = function (id) { var s = GF.get(id); return s ? s.name : GF.kyc ? GF.kyc.staffName(id) || id : id; };
  var ROLES = { manage: "owner full", publish: "owner" };
  var owner = function (d) { return d.owner ? GF.partners.get(d.owner).name : "GroFunder"; };
  /** The kit stores Markdown; the prototype shows its headings and paragraphs only. */
  function body(lines) {
    return lines.map(function (b) {
      var parts = b.split("\n"), h = parts[0].replace(/^##\s*/, "");
      return '<div class="col gap-1"><span class="text-title-sm">' + esc(h) + '</span><span class="text-body-md">' + esc(parts.slice(1).join(" ")) + "</span></div>";
    }).join("");
  }
  /** "In force since 27 Oct", "From 1 Dec", "27 Oct to 2 Nov". */
  function periodLine(v) {
    return v.periods.map(function (p) {
      return p.live_until ? f.date(p.live_from, "short") + " to " + f.date(p.live_until, "short") + (p.taken_down ? " (taken down)" : "") : p.live_from > GF.NOW ? "From " + f.date(p.live_from, "short") : "Since " + f.date(p.live_from, "short");
    }).join("; ");
  }
  /** One language's cell for a version number: its state, or "none". */
  function langCell(docId, n, locale) {
    var v = C.versions.find(function (x) { return x.document === docId && x.number === n && x.locale === locale; });
    return v ? '<a href="version.html?d=' + docId + "&amp;n=" + n + "&amp;l=" + locale + '">' + chip(C.L.vstate[C.state(v)]) + "</a>" : '<span class="text-body-sm tone-muted">None</span>';
  }
  /** Slots bound to a document, in words. */
  function boundLine(d) {
    var s = C.slotsOf(d.id);
    return s.length ? s.map(function (p) { return "<code>" + p.slot + "</code>" + (p.owner ? " for " + esc(GF.partners.get(p.owner).name) : ""); }).join(", ") : "Not bound to any slot";
  }
  window.ConsentsUI = { esc: esc, chip: chip, when: when, who: who, ROLES: ROLES, owner: owner, body: body, periodLine: periodLine, langCell: langCell, boundLine: boundLine };
})();
