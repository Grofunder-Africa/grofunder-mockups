/* credit-ui.js: what the console's credit screens share (phase 14, UI-90; note 25, signed off
 * 2026-11-08). Loaded after canon.js, kyc.js, groups.js, partners.js, credit.js and console.js.
 *
 * Who may do what (note 25, Permissions), as the prototype's roles:
 *   view          every office role (credit.view): scores, factors, inputs, rule sets, overrides
 *   override      Operations and up: set, replace and end overrides up to the ladder limit, and blocks
 *   recalculate   Operations and up: a fresh score on demand
 *   publish       Full and Owner: draft, publish and withdraw rule sets; overrides above the ladder
 */
(function () {
  "use strict";
  var C = GF.credit, f = GF.fmt, L = C.L;
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var icon = function (n, cls) { return '<span class="mdi mdi-' + n + (cls ? " " + cls : "") + '" aria-hidden="true"></span>'; };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var when = function (iso) { return f.date(iso, "short") + (iso && iso.length > 10 ? ", " + iso.slice(11, 16) : ""); };
  var money = function (c) { return f.money(c, { whole: true }); };
  var who = function (id) { var s = GF.get(id); return s ? s.name : id ? id : "The nightly run"; };
  var ROLES = { override: "owner full ops", recalculate: "owner full ops", publish: "owner full" };
  var coopName = function (m) { return GF.get(m.cooperative).profile.short_name; };
  /** The limit that counts, as one line: "Ksh 10,000 (step 2)" or "Blocked". */
  function limitLine(l) {
    if (!l.eligible) return l.reason === "PAUSED" ? "Blocked" : L.reason[l.reason];
    return money(l.limit_cents) + (l.override ? " (override)" : l.score ? " (step " + l.score.ladder_step + ")" : "");
  }
  /** A factor's inputs in words. */
  function inputsLine(key, x) {
    switch (key) {
      case "repayment": return x.instalments_due ? x.paid_on_time + " of " + x.instalments_due + " instalments on time" : "No loans yet (loans, 26, not built: 0.5 means no history)";
      case "delivery": return x.weeks_with_delivery + " of the last " + x.window_weeks + " weeks with a delivery · " + money(x.paid_value_cents_12m) + " paid for produce in 12 months";
      case "circle": return x.circle_id ? (GF.groups.get(x.circle_id).name + " · " + (x.circle_status || "").toLowerCase() + " · " + x.members_verified + " of " + x.members + " verified · members behind: " + (x.members_behind == null ? "not known yet (26)" : x.members_behind)) : "Not in a circle";
      case "tenure": return x.months + " months since " + f.date(x.joined_on);
      case "declared": return x.income_band_total ? "Income from " + money(x.income_band_total) + " a month · obligations " + money(x.obligations_monthly_cents) + " a month" : "Nothing declared";
    }
    return "";
  }
  function factorsTable(s) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Factor</th><th class="num">Sub-score</th><th class="num">Weight</th><th class="num">Points</th><th>From</th></tr></thead><tbody>' +
      Object.keys(s.factors).map(function (k) {
        var x = s.factors[k];
        return '<tr><td class="primary-cell">' + L.factor[k] + (x.weight ? "" : '<span class="cell-sub">Recorded only</span>') + '</td><td class="num">' + x.sub_score.toFixed(2) + '</td><td class="num">' + x.weight +
          '</td><td class="num">' + x.contribution.toFixed(1) + '</td><td class="text-body-sm">' + esc(inputsLine(k, s.inputs[k])) + "</td></tr>";
      }).join("") + '<tr><td class="primary-cell">Base</td><td></td><td></td><td class="num">300.0</td><td class="text-body-sm tone-muted">Every score starts at 300; all factors full adds 550</td></tr></tbody></table></div>';
  }
  window.CreditUI = { esc: esc, icon: icon, chip: chip, when: when, money: money, who: who, ROLES: ROLES, coopName: coopName, limitLine: limitLine, inputsLine: inputsLine, factorsTable: factorsTable };
})();
