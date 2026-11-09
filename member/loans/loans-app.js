/* loans-app.js: what the member app's loan screens share (phase 16, UI-110; note 26 part 1).
 * Loaded after the data files (loans.js last) and app.js.
 *
 * Wanjiku can't borrow today (her visit waits for review; Umoja Gathiru is forming), so her loan is
 * drawn as review states: DEMO is the loan she would ask for, worked out with the real quote on
 * Mavuno Capital's dairy input loan, terms version 1, within her real limit.
 */
(function () {
  "use strict";
  var A = MemberApp, Lo = GF.loans, P = GF.partners, f = GF.fmt, esc = A.esc;
  var money = function (c) { return f.money(c, { whole: c % 100 === 0 }); };
  var YOU = { DEDUCTED_AT_DISBURSEMENT: "taken off what you get", ADDED_TO_LOAN: "added to what you repay", WITH_INSTALMENTS: "paid with each instalment" };
  var FREQ = { MONTHLY: "month", WEEKLY: "week", BIWEEKLY: "two weeks", DAILY: "day" };
  /** The quote in the member's words: what you get, what you repay, what it costs; each charge; if you pay late. */
  function quoteHtml(q) {
    var i = q.instalments, each = i.frequency === "END_OF_TERM" ? "Repay " + money(i.amount_cents) + " at the end" : "Repay " + money(i.amount_cents) + " a " + FREQ[i.frequency] + " for " + Lo.durationLine(i.count, q.duration_unit);
    return '<div class="card card-outlined col gap-3">' +
      '<div class="row between gap-2"><span class="text-body-md">You get</span><span class="text-title-md tabular">' + money(q.amount_received_cents) + "</span></div>" +
      '<div class="row between gap-2"><span class="text-body-md">' + each + (i.last_amount_cents !== i.amount_cents ? " (the last " + money(i.last_amount_cents) + ")" : "") + "</span></div>" +
      '<div class="row between gap-2"><span class="text-body-md">You repay in all</span><span class="text-title-md tabular">' + money(q.total_repayable_cents) + "</span></div>" +
      '<div class="divider"></div><div class="row between gap-2"><span class="text-title-sm">The loan costs you</span><span class="text-title-lg tabular">' + money(q.total_cost_cents) + "</span></div>" +
      q.lines.map(function (l) { return '<div class="row between gap-2"><span class="text-body-md tone-muted">' + esc(l.name) + " · " + YOU[l.collected] + '</span><span class="text-body-md tabular">' + money(l.amount_cents) + "</span></div>"; }).join("") +
      "</div>" +
      (q.late_penalties.length ? '<div class="banner banner-warning"><span class="mdi mdi-clock-alert-outline" aria-hidden="true"></span><div class="grow"><span class="text-title-sm">If you pay late</span><span class="text-body-md">' + q.late_penalties.map(function (x) { return esc(x.name) + ": " + esc(x.rule); }).join("<br>") + "</span></div></div>" : "") +
      '<p class="text-body-sm tone-muted">You repay ' + esc(q.partner.name) + " through paybill " + q.partner.paybill + ". " + esc(q.early_repayment) + "</p>";
  }
  var me = A.current, offer = Lo.productsFor(me.cooperative)[0];
  var DEMO = null;
  if (offer) {
    var lim = GF.credit.limit(me.id).limit_cents || 0, amt = Math.min(lim || 1000000, offer.terms.max_amount_cents), dur = Math.min(3, offer.terms.max_duration);
    DEMO = { reference: "MAVUNO-000106", product: offer.product, terms: offer.terms, partner: offer.partner, amount_cents: amt, duration: dur, purpose: offer.product.details.purposes[0], quote: Lo.quote(offer.terms, amt, dur), max_cents: Math.min(lim, offer.terms.max_amount_cents) };
  }
  window.LoansApp = { quoteHtml: quoteHtml, money: money, DEMO: DEMO };
})();
