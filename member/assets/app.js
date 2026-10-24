/* app.js: what the member app's screens share (phase 9, UI-18).
 * Load it right after assets/data/canon.js, without defer:
 *
 *   <script src="../../assets/data/canon.js"></script>
 *   <script src="../assets/app.js"></script>
 *
 * The member is Wanjiku Kamau ("Shiru"), signed in on one login (06) that
 * links her records at Kijani and Mawingu. Which cooperative the app shows is
 * remembered in gf.memberCoop and changed from Home's switch (M6, F8). Gatundu
 * has added a record with her ID that she hasn't linked yet (M7).
 */
(function () {
  "use strict";
  var q = GF.q, f = GF.fmt;
  var LOGIN = GF.get("u-wanjiku");
  var R = (function () { var t = document.querySelector('script[src$="member/assets/app.js"], script[src$="assets/app.js"]'); return t ? t.getAttribute("src").replace(/assets\/app\.js$/, "") : "./"; })();
  var store = {
    get: function (k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };

  /* 05: a member sees their ACTIVE records; a suspended one is listed but closed. */
  /* Records the member linked in this browser (M7) count as linked. */
  var linked = store.get("gf.memberLinked", "").split(",").filter(Boolean);
  var records = q.recordsOf(LOGIN.id).concat(linked.map(function (id) { return GF.get(id); }).filter(Boolean));
  var open = records.filter(function (m) { return m.status === "ACTIVE"; });
  var picked = store.get("gf.memberCoop", "");
  var current = open.find(function (m) { return m.cooperative === picked; }) || open[0];
  /* 06: a record with the same ID, in another cooperative, that nobody has linked. */
  var pending = GF.members.filter(function (m) {
    return !m.user && m.id_type === current.id_type && m.id_number === current.id_number && (m.status === "ACTIVE" || m.status === "SUSPENDED") && linked.indexOf(m.id) === -1;
  });

  var coopName = function (m) { return GF.get(m.cooperative).profile.short_name; };
  var mask = function (e164) { var n = f.phone(e164); return n.slice(0, 5) + "••• " + n.slice(-3); };
  /* The rounds for the member's cluster (07): the cluster's own, and those for every cluster. */
  function rounds(m) {
    return GF.rounds.filter(function (r) { return r.cooperative === m.cooperative && r.status === "ACTIVE" && (!r.cluster || r.cluster === m.cluster); });
  }
  var DAY = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function when(r) {
    var s = r.schedule, d = s.days.length === 7 ? "Every day" : s.days.map(function (x) { return DAY[x]; }).join(", ");
    var m = s.months.length ? ", " + MON[s.months[0] - 1] + " to " + MON[s.months[s.months.length - 1] - 1] : "";
    return d + ", " + s.start_time + " to " + s.end_time + m;
  }
  /* The next collection after now, for Home. */
  function nextRound(m) {
    var list = rounds(m); if (!list.length) return null;
    var keys = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], base = Date.parse(GF.TODAY + "T00:00:00Z"), clock = GF.NOW.slice(11, 16);
    for (var add = 0; add < 8; add++) {
      var day = new Date(base + add * 864e5), key = keys[day.getUTCDay()], month = day.getUTCMonth() + 1;
      var hits = list.filter(function (r) { return r.schedule.days.indexOf(key) > -1 && (!r.schedule.months.length || r.schedule.months.indexOf(month) > -1) && (add > 0 || r.schedule.start_time > clock); })
        .sort(function (a, b) { return a.schedule.start_time < b.schedule.start_time ? -1 : 1; });
      if (hits.length) return { round: hits[0], inDays: add };
    }
    return null;
  }
  /* The price in force today for each of the cooperative's products (07: members see current prices). */
  function prices(m) {
    return GF.coopProducts.filter(function (cp) { return cp.cooperative === m.cooperative && cp.status === "ACTIVE"; }).map(function (cp) {
      var now = q.priceOn(cp.id, null, GF.TODAY);
      var next = GF.prices.filter(function (p) { return p.product === cp.id && !p.grade && p.effective_from > GF.TODAY; }).sort(function (a, b) { return a.effective_from < b.effective_from ? -1 : 1; })[0];
      return { cp: cp, product: GF.get(cp.product), now: now, next: next };
    });
  }

  window.MemberApp = {
    R: R, login: LOGIN, records: records, open: open, current: current, pending: pending, esc: esc, mask: mask,
    coopName: coopName, rounds: rounds, when: when, nextRound: nextRound, prices: prices, store: store,
    name: function () { return current.profile.preferred_name || current.full_name.split(" ")[0]; },
    /* M6: show another cooperative. */
    switchTo: function (coopId) { store.set("gf.memberCoop", coopId); location.reload(); },
    /* M7: link a record to this login. */
    link: function (memberId) { if (linked.indexOf(memberId) === -1) linked.push(memberId); store.set("gf.memberLinked", linked.join(",")); },
    title: function () { var s = document.querySelector("[data-screen]"); if (s) s.setAttribute("data-title", coopName(current)); }
  };
})();
