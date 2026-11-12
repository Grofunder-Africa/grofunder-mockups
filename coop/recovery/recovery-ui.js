/* recovery-ui.js: what the cooperative portal's recovery screens share (phase 18, UI-130;
 * design/28-recovery.md, models signed off 2026-11-09). Loaded after the data files and portal.js.
 *
 * Who may do what in the cooperative (note 28, Permissions), as the prototype's roles:
 *   recovery.view         every role but the clerk: cases, withholdings, remittances, fees, terms
 *   recovery.agree        Administrator and Manager: record and change an arrangement
 *   recovery.remit        Administrator, Manager and Accountant: record and void a remittance
 *   recovery.acknowledge  the Administrator alone: acknowledge the collection terms
 *
 * The cooperative never sees the loan's terms, the lender's pricing or any score (28, Objectives).
 */
(function (root) {
  "use strict";
  var GF = root.GF, R = GF.recovery, f = GF.fmt;
  var ROLES = { view: "admin manager accountant viewer", agree: "admin manager", remit: "admin manager accountant", acknowledge: "admin" };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var money = function (c) { return f.money(c); };
  var whole = function (c) { return f.money(c, { whole: true }); };
  var when = function (iso) { return iso ? f.date(iso, "short") + (iso.length > 10 ? ", " + iso.slice(11, 16) : "") : ""; };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var can = function (code) { return !root.Proto || ROLES[code].split(" ").indexOf(Proto.role()) > -1; };
  var pct = function (bps) { return (bps / 100).toFixed(bps % 100 ? 1 : 0) + "%"; };
  /** The lender's name for a case, which is all the cooperative sees of the lender. */
  var lenderOf = function (c) { return GF.partners.get(GF.loans.get(c.loan).partner).name; };
  var refOf = function (c) { return GF.loans.get(c.loan).reference; };
  /** The arrangement in plain words: "30% of each payout", "Ksh 2,000 from each payout", "As much as allowed". */
  function arrangementLine(c) {
    if (!c.arrangement) return "Not agreed yet";
    if (c.arrangement === "FULL") return "As much of each payout as the terms allow";
    return c.per_payout_bps ? pct(c.per_payout_bps) + " of each payout" : money(c.per_payout_cents) + " from each payout";
  }
  /** A case's two charges as one line: what is left on the loan, and on the fee. */
  function leftLine(c) {
    var p = R.progress(c);
    if (!p.loan) return "Nothing is being taken yet";
    var bits = [money(p.loan_left_cents) + " of the loan left"];
    if (p.fee && p.fee_left_cents) bits.push(money(p.fee_left_cents) + " of the fee");
    return bits.join(" · ");
  }
  /** The terms in force for the portal's cooperative, and why a case can't be taken on. */
  var terms = function () { return R.inForce(Portal.COOP); };
  window.RecoveryUI = { R: R, ROLES: ROLES, esc: esc, money: money, whole: whole, when: when, chip: chip, can: can, pct: pct,
    lenderOf: lenderOf, refOf: refOf, arrangementLine: arrangementLine, leftLine: leftLine, terms: terms };
})(typeof window !== "undefined" ? window : globalThis);
