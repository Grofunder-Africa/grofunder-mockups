/* recovery-ui.js: what the console's recovery screens share (phase 18, UI-130; note 28, models signed
 * off 2026-11-09). Loaded after the data files (recovery.js last) and console.js.
 *
 * Who may do what (note 28, Permissions), as the prototype's roles:
 *   view      every office role (recovery.view): cases, terms, remittances and pass-ons
 *   terms     Full and Owner (recovery.terms): draft, publish and withdraw collection terms
 *   confirm   Full and Owner (recovery.confirm): confirm, decline, pause, resume and close a case,
 *             and cancel a collection fee
 *   receive   Full and Owner (recovery.receive): confirm or dispute a remittance, and record the
 *             transfer that passes money on to the lender
 * The cooperative's own codes (agree, remit, acknowledge) are its portal's, not this surface's.
 */
(function () {
  "use strict";
  var R = GF.recovery, f = GF.fmt;
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var when = function (iso) { return iso ? f.date(iso, "short") + (iso.length > 10 ? ", " + iso.slice(11, 16) : "") : ""; };
  var money = function (c) { return f.money(c); };
  var whole = function (c) { return f.money(c, { whole: true }); };
  var who = function (id) { var s = GF.get(id); return s ? s.name : GF.kyc ? GF.kyc.staffName(id) || id : id || ""; };
  var ROLES = { terms: "owner full", confirm: "owner full", receive: "owner full" };
  var coopName = function (id) { var c = GF.get(id); return c ? c.profile.short_name : id; };
  var memberName = function (id) { var m = GF.get(id); return m ? m.full_name : id; };
  var partnerOf = function (loanId) { var l = GF.loans.get(loanId); return l ? GF.partners.get(l.partner) : null; };
  var days = function (iso) { return Math.floor((Date.parse(GF.NOW) - Date.parse(iso)) / 864e5); };
  var ageLine = function (iso) { var d = days(iso); return d === 0 ? "today" : d === 1 ? "1 day" : d + " days"; };
  /* A poll of the loan within the last hour, in API mode (28: "checks the loan, running the poll first").
   * Flipped by the Poll button on the case and queue screens, so the rule can be seen working. */
  var polled = {};
  function polledRecently(loan) {
    if (polled[loan.id]) return true;
    if (!GF.gateway) return false;
    return GF.gateway.callsOf(loan.reference).some(function (c) {
      return c.operation === "READ_LOAN" && (Date.parse(GF.NOW) - Date.parse(c.started_at)) < 36e5;
    });
  }
  function pollNow(loan, after) {
    Proto.dialog({ title: "Poll " + esc(partnerOf(loan.id).name) + " for " + loan.reference + "?",
      body: '<p class="text-body-md">The gateway reads the loan now: its status, schedule, payments and charges. Anything missing is applied; anything that can\'t be settled is flagged. Note 28 asks for this before a case is confirmed, so nothing is withheld on figures that have moved.</p>',
      submit: "Poll now", onSubmit: function () { polled[loan.id] = true; Proto.snack("Polled: " + loan.reference + " is as " + partnerOf(loan.id).name + " has it"); if (after) setTimeout(after, 300); } });
  }
  /** Why a case can't be confirmed today, or "" when it can. */
  function blockedReason(c) {
    var why = R.cannotRecover(c.cooperative);
    if (why) return coopName(c.cooperative) + ": " + why.charAt(0).toLowerCase() + why.slice(1);
    if (!polledRecently(GF.loans.get(c.loan))) return "The loan hasn't been polled in the last hour";
    return "";
  }
  /** The arrangement in words, from the case's own figures. */
  function arrangementLine(c) {
    if (!c.arrangement) return "Not agreed yet";
    if (c.arrangement === "FULL") return "As much of each payout as the terms allow, until it is paid";
    if (c.per_payout_bps) return (c.per_payout_bps / 100) + "% of each payout";
    return whole(c.per_payout_cents) + " from each payout";
  }
  /** The terms' cap and fee in words. */
  function feeLine(t) {
    if (!t || t.fee_basis === "NONE") return "No collection fee";
    if (t.fee_basis === "FLAT_PER_CASE") return whole(t.fee_amount_cents) + " per case";
    return (t.fee_rate_bps / 100) + "% of the debt when the arrangement is agreed" + (t.fee_cap_cents ? ", at most " + whole(t.fee_cap_cents) : "");
  }
  var capLine = function (t) { return t ? (t.max_per_payout_bps / 100) + "% of a payout" : ""; };
  /** The loan behind a case, as one line. */
  function loanLine(c) {
    var l = GF.loans.get(c.loan), p = GF.partners.get(l.partner);
    return '<a class="tabular" href="../loans/loan.html?l=' + l.id + '">' + l.reference + "</a> · " + esc(p.name) + " · " + whole(l.amount_cents) + " borrowed";
  }
  window.RecoveryUI = { esc: esc, chip: chip, when: when, money: money, whole: whole, who: who, ROLES: ROLES, coopName: coopName, memberName: memberName,
    partnerOf: partnerOf, days: days, ageLine: ageLine, polledRecently: polledRecently, pollNow: pollNow, blockedReason: blockedReason,
    arrangementLine: arrangementLine, feeLine: feeLine, capLine: capLine, loanLine: loanLine };
})();
