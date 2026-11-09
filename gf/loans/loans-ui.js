/* loans-ui.js: what the console's loan screens share (phase 16, UI-110; note 26 part 1, signed off
 * 2026-11-09). Loaded after the data files (loans.js last) and console.js. LP5 loads it too, for the
 * worked example (G80).
 *
 * Who may do what (note 26, Permissions), as the prototype's roles:
 *   view       every office role (loans.view): loans, queues, pauses, what each decision relied on
 *   prepare    Operations and up (loans.prepare): drafts, the SMS code and accepting with it
 *   review     Full and Owner (loans.review): approve or reject; never the drafter or the borrower
 *   manage     Full and Owner (loans.manage): cancel after approval
 *   pause      Full and Owner (loans.pause); everyone at once is the Owner's (loans.pause_all)
 */
(function () {
  "use strict";
  var f = GF.fmt, P = GF.partners;
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var when = function (iso) { return f.date(iso, "short") + (iso && iso.length > 10 ? ", " + iso.slice(11, 16) : ""); };
  var money = function (c) { return f.money(c); };
  var whole = function (c) { return f.money(c, { whole: true }); };
  var who = function (id) { var s = GF.get(id); return s ? s.name : GF.kyc ? GF.kyc.staffName(id) || id : id; };
  var ROLES = { prepare: "owner full ops", review: "owner full", manage: "owner full", pause: "owner full", pause_all: "owner" };
  var FREQ = { MONTHLY: "monthly", WEEKLY: "weekly", BIWEEKLY: "fortnightly", DAILY: "daily", END_OF_TERM: "at the end" };
  /** The quote, as note 26 lists it: each charge, what the member receives, instalments, totals, late penalties apart. */
  function quoteCard(q, opts) {
    opts = opts || {};
    var i = q.instalments, L = P.L;
    var inst = i.frequency === "END_OF_TERM" ? "One payment of " + money(i.amount_cents) + " at the end" :
      i.count + " " + FREQ[i.frequency] + " of " + money(i.amount_cents) + (i.last_amount_cents !== i.amount_cents ? " (the last " + money(i.last_amount_cents) + ")" : "");
    return '<div class="col gap-4">' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Charge</th><th>How it is paid</th><th class="num">Amount</th></tr></thead><tbody>' +
      q.lines.map(function (l) { return '<tr><td class="primary-cell">' + esc(l.name) + '</td><td class="text-body-sm">' + L.collected[l.collected] + '</td><td class="num tabular">' + money(l.amount_cents) + "</td></tr>"; }).join("") +
      '<tr><td class="primary-cell">Total cost of credit</td><td class="text-body-sm tone-muted">Every charge, late penalties apart</td><td class="num tabular"><b>' + money(q.total_cost_cents) + "</b></td></tr></tbody></table></div>" +
      '<dl class="facts"><dt>Borrowed</dt><dd class="tabular">' + money(q.amount_cents) + " for " + GF.loans.durationLine(q.duration, q.duration_unit) + "</dd>" +
      '<dt>The member receives</dt><dd class="tabular">' + money(q.amount_received_cents) + "</dd>" +
      '<dt>Instalments</dt><dd class="tabular">' + inst + "</dd>" +
      '<dt>Total repayable</dt><dd class="tabular"><b>' + money(q.total_repayable_cents) + "</b></dd>" +
      "<dt>If they pay late</dt><dd>" + (q.late_penalties.length ? q.late_penalties.map(function (x) { return esc(x.name) + ": " + esc(x.rule); }).join("<br>") : "No late penalty") + "</dd>" +
      (opts.partner === false ? "" : "<dt>Repaid to</dt><dd>" + esc(q.partner.name) + ', paybill <span class="tabular">' + q.partner.paybill + "</span></dd>") +
      "<dt>Repaying early</dt><dd>" + esc(q.early_repayment) + "</dd>" +
      (q.disclosure && q.disclosure.en ? "<dt>The lender says</dt><dd>" + esc(q.disclosure.en) + "</dd>" : "") + "</dl></div>";
  }
  /** A loan's status chip, with approvals or expiry beside it. */
  function statusLine(l) {
    var Lo = GF.loans, out = chip(Lo.L.status[l.status]);
    if (l.status === "REQUESTED") { var a = Lo.approvals(l); if (a.of > 1) out += ' <span class="text-body-sm tone-muted">' + a.done + " of " + a.of + " approvals</span>"; }
    if (l.status === "DRAFT") out += ' <span class="text-body-sm tone-muted">until ' + f.date(Lo.expiresAt(l), "short") + "</span>";
    return out;
  }
  window.LoansUI = { esc: esc, chip: chip, when: when, money: money, whole: whole, who: who, ROLES: ROLES, quoteCard: quoteCard, statusLine: statusLine };
})();
