/* groups-ui.js: what the console's Growth Circle screens share (phase 12, UI-70;
 * note 23, signed off 2026-11-08). Loaded after canon.js, kyc.js, groups.js and
 * console.js on gf/groups/ pages. */
(function () {
  "use strict";
  var G = GF.groups, f = GF.fmt;
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var icon = function (n, cls) { return '<span class="mdi mdi-' + n + (cls ? " " + cls : "") + '" aria-hidden="true"></span>'; };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var when = function (iso) { return f.date(iso, "short") + (iso && iso.length > 10 ? ", " + iso.slice(11, 16) : ""); };
  var coopName = function (id) { return GF.get(id).profile.short_name; };
  var where = function (c) { return coopName(c.cooperative) + (c.cluster ? " · " + GF.get(c.cluster).name + " cluster" : ""); };

  /** "2 members · 2 joining · 1 invited", from the open places. */
  function sizeLine(c) {
    var n = G.count(c.id), j = G.count(c.id, "JOINING"), i = G.count(c.id, "INVITED");
    return n + (n === 1 ? " member" : " members") + (j ? " · " + j + " joining" : "") + (i ? " · " + i + " invited" : "");
  }
  /** What a place's row says beside its status, for staff (groups.view sees every place). */
  function placeNote(x) {
    switch (x.status) {
      case "MEMBER": return "Joined " + f.date(x.joined_at, "short");
      case "JOINING": return "Joins on " + when(x.objection_ends_at) + " unless a member objects";
      case "INVITED": var d = G.daysLeft(G.expiresAt(x)); return "Invited " + f.date(x.invited_at, "short") + " by " + G.who(x.invited_by) + " · " + d + (d === 1 ? " day" : " days") + " left";
      case "DECLINED": return "Declined " + f.date(x.ended_at, "short");
      case "OBJECTED": return "Objected to by " + G.who(x.ended_by) + ", " + f.date(x.ended_at, "short");
      case "LEFT": return "Left " + f.date(x.ended_at, "short");
      default: return G.L.end[x.end_reason] + ", " + f.date(x.ended_at, "short") + (x.ended_by ? " · " + G.who(x.ended_by) : "");
    }
  }
  window.GroupsUI = { esc: esc, icon: icon, chip: chip, when: when, coopName: coopName, where: where, sizeLine: sizeLine, placeNote: placeNote };
})();
