/* recovery.js: recovering a defaulted loan through the member's cooperative (phase 18, UI-130;
 * design/28-recovery.md, models signed off 2026-11-09, with 08's charge amendment). Loaded after
 * loans.js and gateway.js; adds GF.recovery. Every figure is worked out from the shared data.
 *
 *   CollectionTerms        one dated version per cooperative: whether it recovers, the most one payout
 *                          may give up, the fee, and how often it remits. Acknowledged by its administrator
 *   RecoveryCase           one attempt to recover one defaulted loan, PENDING to CLOSED
 *   Charge (08)            the loan's recovery and the collection fee, taken from payouts by themselves,
 *                          the loan's charge first and the fee only once the loan's is recovered (Q1)
 *   CooperativeRemittance  what the cooperative sent GroFunder, with a line per withholding
 *   PassOn                 what GroFunder passed to the partner for one loan, and whether it posted
 *
 * The story, on "now" (Fri 30 Oct 2026, 10:30). Tegemeo's dairy cohort at Kijani left four loans (loans.js):
 *   REC-000001  Kamau Nduati    DECLINED: he had already agreed to pay Tegemeo himself, and has
 *   REC-000002  Muthoni Thuku   CLOSED, repaid in full from her pay; the collection fee is still owed
 *   REC-000003  Peter Ndungu    RECOVERING: 30% of each payout, agreed 28 Sep; one withholding remitted
 *                               and passed on, and his October draft carries the next
 *   REC-000004  Peter Gathogo   PENDING: defaulted on 28 Oct, waiting for GroFunder to confirm
 * Kijani's terms are in force and acknowledged. Mawingu's are published but not acknowledged, so no case
 * can be confirmed there. Ruiru's say it doesn't recover. Gatundu has none, so its defaulted loans are
 * GroFunder's to handle with the partner.
 */
(function (root) {
  "use strict";
  var GF = root.GF, Lo = GF.loans;
  var T = function (d, t) { return "2026-" + d + "T" + (t || "09:00") + ":00+03:00"; };
  var round = function (x) { return Math.round(x); };

  /* --------------------------------------------------------- collection terms */
  var terms = [
    { id: "ct-kij-1", cooperative: "co-kijani", version: 1, status: "PUBLISHED", effective_from: T("06-01", "00:00"), recovers: true, max_per_payout_bps: 5000,
      fee_basis: "PERCENT_OF_DEBT", fee_amount_cents: null, fee_rate_bps: 500, fee_cap_cents: 100000, remittance_cycle: "MONTHLY", remit_within_days: 10,
      details: { remit_to: { method: "BANK", bank_name: "Co-op Bank", account_no: "01120****447", paybill: "", account: "" }, notes: "Kijani keeps the collection fee and remits the loan money only.", withdrawal: null },
      acknowledged_at: T("06-03", "11:20"), acknowledged_by: "u-grace", published_at: T("05-30", "15:00"), published_by: "u-amina", created_by: "u-peter", created_at: T("05-28", "10:00"), updated_at: T("06-03", "11:20") },
    { id: "ct-kij-2", cooperative: "co-kijani", version: 2, status: "DRAFT", effective_from: T("12-01", "00:00"), recovers: true, max_per_payout_bps: 4000,
      fee_basis: "PERCENT_OF_DEBT", fee_amount_cents: null, fee_rate_bps: 500, fee_cap_cents: 150000, remittance_cycle: "MONTHLY", remit_within_days: 7,
      details: { remit_to: { method: "BANK", bank_name: "Co-op Bank", account_no: "01120****447", paybill: "", account: "" }, notes: "Lowers the cap to 40% after members said half was too much, and shortens the remittance window.", withdrawal: null },
      acknowledged_at: null, acknowledged_by: null, published_at: null, published_by: null, created_by: "u-peter", created_at: T("10-29", "14:00"), updated_at: T("10-29", "14:00") },
    { id: "ct-maw-1", cooperative: "co-mawingu", version: 1, status: "PUBLISHED", effective_from: T("10-25", "00:00"), recovers: true, max_per_payout_bps: 3000,
      fee_basis: "FLAT_PER_CASE", fee_amount_cents: 50000, fee_rate_bps: null, fee_cap_cents: null, remittance_cycle: "MONTHLY", remit_within_days: 14,
      details: { remit_to: { method: "MPESA", paybill: "247247", account: "GF-MAWINGU", bank_name: "", account_no: "" }, notes: "", withdrawal: null },
      acknowledged_at: null, acknowledged_by: null, published_at: T("10-22", "10:00"), published_by: "u-amina", created_by: "u-peter", created_at: T("10-20", "09:00"), updated_at: T("10-22", "10:00") },
    { id: "ct-rui-1", cooperative: "co-ruiru", version: 1, status: "PUBLISHED", effective_from: T("07-01", "00:00"), recovers: false, max_per_payout_bps: 1,
      fee_basis: "NONE", fee_amount_cents: null, fee_rate_bps: null, fee_cap_cents: null, remittance_cycle: "MONTHLY", remit_within_days: 10,
      details: { remit_to: {}, notes: "Ruiru asked not to recover from members' pay while it is on hold. Its defaulted loans stay with GroFunder and the lender.", withdrawal: null },
      acknowledged_at: null, acknowledged_by: null, published_at: T("06-28", "12:00"), published_by: "u-amina", created_by: "u-peter", created_at: T("06-26", "10:00"), updated_at: T("07-04", "09:00") }
  ];
  var RULES = { AGREE_REMINDER_DAYS: 14, PASS_ON_FLAG_DAYS: 7 };

  /* --------------------------------------------------------- managed payout item types (08) */
  /* Created once per cooperative by recovery, never edited by the cooperative. */
  var TYPES = [
    { id: "pit-kij-rec", cooperative: "co-kijani", name: "Loan recovery (Tegemeo Microfinance)", name_sw: "Kurejesha mkopo (Tegemeo Microfinance)", direction: "DEDUCTION", managed: true, key: "recovery.loan:lp-tegemeo", status: "ACTIVE" },
    { id: "pit-kij-recfee", cooperative: "co-kijani", name: "Collection fee", name_sw: "Ada ya ukusanyaji", direction: "DEDUCTION", managed: true, key: "recovery.fee", status: "ACTIVE" }
  ];
  TYPES.forEach(function (t) { if (!GF.payoutItemTypes.some(function (x) { return x.id === t.id; })) GF.payoutItemTypes.push(t); });
  if (GF.index) GF.index(TYPES);

  /* --------------------------------------------------------- charges (08 amendment) */
  var charges = [];
  function charge(o) {
    charges.push({ id: o.id, member: o.member, cooperative: GF.get(o.member).cooperative, type: o.type, key: o.key, source: "recovery", source_ref: o.case,
      amount_cents: o.amount, per_payout_cents: o.per_cents || null, per_payout_bps: o.per_bps || null, cap_group: "recovery", priority: o.priority,
      status: o.status, note: o.note || "", created_at: o.at, updated_at: o.updated || o.at });
    return o.id;
  }
  /* --------------------------------------------------------- withholding on payouts */
  /* Each withholding is one deduction item on one payout, which is where the money is actually taken. */
  var withheld = [];
  function withhold(caseId, chargeId, payoutId, amount, typeId) {
    var p = GF.get(payoutId);
    if (!p) return null;
    var item = { type: typeId, amount_cents: amount, note: "", charge: chargeId };
    p.items.push(item);
    p.deductions_cents += amount;
    p.net_cents = p.gross_cents + p.additions_cents - p.deductions_cents;
    var row = { id: "wh-" + withheld.length + 1, "case": caseId, charge: chargeId, payout: payoutId, amount_cents: amount, status: p.status, paid_at: p.paid_at, item: item };
    withheld.push(row);
    return row;
  }
  var paidOf = function (memberId) { return GF.payouts.filter(function (p) { return p.member === memberId && p.status === "PAID"; }).sort(function (a, b) { return a.paid_at < b.paid_at ? -1 : 1; }); };
  var draftOf = function (memberId) { return GF.payouts.find(function (p) { return p.member === memberId && p.status === "DRAFT"; }) || null; };

  /* --------------------------------------------------------- cases */
  var cases = [], history = [];
  function kase(o) {
    var l = Lo.get(o.loan), m = GF.get(l.member);
    cases.push({ id: o.id, reference: o.ref, loan: o.loan, member: l.member, cooperative: l.cooperative, terms: o.terms || null, status: o.status, end_reason: o.end_reason || "",
      confirmed_at: o.confirmed || null, confirmed_by: o.confirmed_by || null, arrangement: o.arrangement || "", per_payout_cents: o.per_cents || null, per_payout_bps: o.per_bps || null,
      agreed_on: o.agreed_on || null, agreed_by: o.agreed_by || null, debt_at_agreement_cents: o.debt || null, loan_charge: o.loan_charge || null, fee_charge: o.fee_charge || null,
      details: { agreed_via: o.via || "", agreement_note: o.note || "", decline_reason: o.decline || "", pause_reason: "" }, created_at: o.at, updated_at: o.updated || o.at });
    (o.moves || []).forEach(function (h, i) { history.push({ id: o.id + "-h" + i, "case": o.id, from_status: h[0], to_status: h[1], changed_at: h[2], changed_by: h[3] || null, source: h[4], details: h[5] ? { reason: h[5] } : {} }); });
  }
  /* REC-000001 Kamau Nduati: declined, he pays Tegemeo himself. */
  kase({ id: "rc-1", ref: "REC-000001", loan: "ln-153", status: "DECLINED", at: T("10-10", "02:05"), updated: T("10-13", "11:30"),
    decline: "He had already agreed a plan with Tegemeo and has paid twice since. Recovering from his pay as well would take too much.",
    moves: [["", "PENDING", T("10-10", "02:05"), null, "SYSTEM"], ["PENDING", "DECLINED", T("10-13", "11:30"), "u-peter", "CONSOLE", "He had already agreed a plan with Tegemeo and has paid twice since. Recovering from his pay as well would take too much."]] });
  /* REC-000002 Muthoni Thuku: recovered in full from her pay; the fee is still owed. */
  var mu = "m-kij-M-0005", muPaid = paidOf(mu);
  var muLoanCharge = charge({ id: "rch-2a", member: mu, type: "pit-kij-rec", key: "recovery.loan:lp-tegemeo", "case": "rc-2", amount: 540000, per_bps: 4000, priority: 10, status: "SETTLED", at: T("09-08", "10:00"), updated: T("10-20", "16:00") });
  var muFeeCharge = charge({ id: "rch-2b", member: mu, type: "pit-kij-recfee", key: "recovery.fee", "case": "rc-2", amount: 27000, per_bps: 4000, priority: 20, status: "OPEN", at: T("09-08", "10:00") });
  kase({ id: "rc-2", ref: "REC-000002", loan: "ln-152", status: "CLOSED", end_reason: "PAID", terms: "ct-kij-1", at: T("09-05", "02:05"), updated: T("10-20", "16:05"),
    confirmed: T("09-06", "09:40"), confirmed_by: "u-peter", arrangement: "PARTIAL", per_bps: 4000, agreed_on: "2026-09-08", agreed_by: "u-grace", debt: 540000, via: "IN_PERSON",
    note: "She asked for 40% of each payout so it would be over before the dry season.", loan_charge: muLoanCharge, fee_charge: muFeeCharge,
    moves: [["", "PENDING", T("09-05", "02:05"), null, "SYSTEM"], ["PENDING", "OPEN", T("09-06", "09:40"), "u-peter", "CONSOLE"], ["OPEN", "RECOVERING", T("09-08", "10:00"), "u-grace", "PORTAL"],
      ["RECOVERING", "CLOSED", T("10-20", "16:05"), null, "SYSTEM", "Tegemeo closed the loan: repaid in full. The collection fee is still owed."]] });
  /* REC-000003 Peter Ndungu: recovering now, 30% of each payout. */
  var pn = "m-kij-0199", pnPaid = paidOf(pn), pnDraft = draftOf(pn), pnDebt = Lo.get("ln-150").balance_cents;
  var pnFee = Math.min(round(pnDebt * 500 / 10000), 100000);
  var pnLoanCharge = charge({ id: "rch-3a", member: pn, type: "pit-kij-rec", key: "recovery.loan:lp-tegemeo", "case": "rc-3", amount: pnDebt, per_bps: 3000, priority: 10, status: "OPEN", at: T("09-28", "16:00") });
  var pnFeeCharge = charge({ id: "rch-3b", member: pn, type: "pit-kij-recfee", key: "recovery.fee", "case": "rc-3", amount: pnFee, per_bps: 3000, priority: 20, status: "OPEN", at: T("09-28", "16:00") });
  kase({ id: "rc-3", ref: "REC-000003", loan: "ln-150", status: "RECOVERING", terms: "ct-kij-1", at: T("09-10", "02:05"), updated: T("09-28", "16:00"),
    confirmed: T("09-12", "10:15"), confirmed_by: "u-peter", arrangement: "PARTIAL", per_bps: 3000, agreed_on: "2026-09-28", agreed_by: "u-grace", debt: pnDebt, via: "PHONE",
    note: "He milks 9 cows and asked for 30%, so the family still has something each month.", loan_charge: pnLoanCharge, fee_charge: pnFeeCharge,
    moves: [["", "PENDING", T("09-10", "02:05"), null, "SYSTEM"], ["PENDING", "OPEN", T("09-12", "10:15"), "u-peter", "CONSOLE"], ["OPEN", "RECOVERING", T("09-28", "16:00"), "u-grace", "PORTAL"]] });
  /* REC-000004 Peter Gathogo: queued when Tegemeo defaulted the loan; waiting for GroFunder. */
  kase({ id: "rc-4", ref: "REC-000004", loan: "ln-151", status: "PENDING", at: T("10-28", "02:05"),
    moves: [["", "PENDING", T("10-28", "02:05"), null, "SYSTEM"]] });

  /* Withholdings. Muthoni's cleared her loan; Peter's last payout gave 30%, and his October draft carries the next. */
  if (muPaid.length) {
    var muTake = [220000, 180000, 140000], muLeft = 540000;
    muPaid.forEach(function (p, i) {
      if (muLeft <= 0 || i >= muTake.length) return;
      var amt = Math.min(muTake[i], muLeft, round(p.net_cents * 4000 / 10000));
      if (amt > 0) { withhold("rc-2", muLoanCharge, p.id, amt, "pit-kij-rec"); muLeft -= amt; }
    });
    var last = muPaid[muPaid.length - 1];
    withhold("rc-2", muFeeCharge, last.id, 9000, "pit-kij-recfee");
  }
  if (pnPaid.length) {
    var pLast = pnPaid[pnPaid.length - 1];
    withhold("rc-3", pnLoanCharge, pLast.id, Math.min(round(pLast.net_cents * 3000 / 10000), pnDebt), "pit-kij-rec");
  }
  if (pnDraft) withhold("rc-3", pnLoanCharge, pnDraft.id, round(pnDraft.net_cents * 3000 / 10000), "pit-kij-rec");

  /* --------------------------------------------------------- remittances and pass-ons */
  var remittances = [], lines = [], passOns = [];
  function remit(o) {
    var rows = o.lines.map(function (w, i) { return { id: o.id + "-l" + i, remittance: o.id, payout_item: w.payout, "case": w["case"], amount_cents: w.amount_cents, live: o.status !== "VOIDED" }; });
    lines.push.apply(lines, rows);
    remittances.push({ id: o.id, cooperative: o.coop, period_start: o.from, period_end: o.to, amount_cents: rows.reduce(function (t, r) { return t + r.amount_cents; }, 0),
      sent_on: o.sent, method: o.method || "BANK", reference: o.ref, status: o.status, recorded_by: o.by, confirmed_at: o.confirmed || null, confirmed_by: o.confirmed_by || null,
      details: { note: o.note || "", dispute_note: o.dispute || "", void_reason: o.voided || "" }, created_at: o.at, updated_at: o.updated || o.at });
  }
  /* Kijani remits the loan money monthly and keeps the fee. Peter's September withholding hasn't been
   * remitted yet, so the cooperative sees it as due. A pass-on becomes PENDING when GroFunder confirms a
   * remittance, SENT when the transfer goes, REPORTED once the lender is told, and POSTED when it posts it. */
  var muWh = withheld.filter(function (w) { return w.charge === muLoanCharge && w.status === "PAID"; });
  remit({ id: "crm-0", coop: "co-kijani", from: "2026-08-01", to: "2026-08-31", sent: "2026-09-08", ref: "KVD-REC-2608", status: "CONFIRMED", by: "u-grace",
    confirmed: T("09-09", "10:20"), confirmed_by: "u-peter", lines: muWh.slice(0, 1), at: T("09-08", "16:00"), updated: T("09-09", "10:20"), note: "August's withholding for Muthoni Thuku." });
  remit({ id: "crm-1", coop: "co-kijani", from: "2026-09-01", to: "2026-09-30", sent: "2026-10-08", ref: "KVD-REC-2609", status: "CONFIRMED", by: "u-grace",
    confirmed: T("10-09", "11:00"), confirmed_by: "u-peter", lines: muWh.slice(1, 2), at: T("10-08", "16:00"), updated: T("10-09", "11:00"), note: "September's withholding." });
  remit({ id: "crm-2", coop: "co-kijani", from: "2026-10-01", to: "2026-10-31", sent: "2026-10-29", ref: "KVD-REC-2610", status: "RECORDED", by: "u-grace",
    lines: muWh.slice(2, 3), at: T("10-29", "17:10"), note: "The last of Muthoni Thuku's, which cleared her loan. Peter Ndungu's is next month's." });
  remit({ id: "crm-3", coop: "co-kijani", from: "2026-07-01", to: "2026-07-31", sent: "2026-08-10", ref: "KVD-REC-2607", status: "DISPUTED", by: "u-grace",
    lines: [], dispute: "The reference doesn't appear on our statement for that week. Please check it and send the bank's confirmation.",
    at: T("08-10", "15:00"), updated: T("08-13", "09:30") });
  remittances[3].amount_cents = 180000;

  function passOn(o) {
    passOns.push({ id: o.id, reference: o.ref, loan: o.loan, partner: Lo.get(o.loan).partner, remittance: o.remittance, amount_cents: o.amount, status: o.status,
      sent_on: o.sent || null, sent_by: o.sent_by || null, transfer_ref: o.transfer || "", reported_at: o.reported || null, payment: o.payment || null,
      created_at: o.at, updated_at: o.updated || o.at });
  }
  passOn({ id: "rpo-1", ref: "TEGEMEO-000052-R1", loan: "ln-152", remittance: "crm-0", amount: remittances[0].amount_cents, status: "POSTED", sent: "2026-09-09", sent_by: "u-peter",
    transfer: "FT26090900318", reported: T("09-09", "14:30"), payment: "ln-152-p2", at: T("09-09", "10:25"), updated: T("09-10", "08:20") });
  passOn({ id: "rpo-2", ref: "TEGEMEO-000052-R2", loan: "ln-152", remittance: "crm-1", amount: remittances[1].amount_cents, status: "REPORTED", sent: "2026-10-09", sent_by: "u-peter",
    transfer: "FT26100900412", reported: T("10-09", "14:40"), at: T("10-09", "11:05"), updated: T("10-09", "14:40") });

  /* --------------------------------------------------------- reading */
  var byId = {}; terms.concat(cases, charges, remittances, passOns).forEach(function (x) { byId[x.id] = x; });
  var LIVE_CASE = ["PENDING", "OPEN", "RECOVERING", "PAUSED"];
  var NOW = GF.NOW;
  /** The version in force for a cooperative, at a date: the latest PUBLISHED on or before it. */
  function inForce(coopId, at) {
    at = at || NOW;
    return terms.filter(function (t) { return t.cooperative === coopId && t.status === "PUBLISHED" && t.effective_from <= at; })
      .sort(function (a, b) { return a.effective_from < b.effective_from ? 1 : -1; })[0] || null;
  }
  function termsState(t) {
    if (t.status === "DRAFT") return "DRAFT";
    if (t.status === "WITHDRAWN") return "WITHDRAWN";
    if (t.effective_from > NOW) return "SCHEDULED";
    var f = inForce(t.cooperative); return f && f.id === t.id ? "IN_FORCE" : "PAST";
  }
  /** Why a cooperative can't take a case today, or "" when it can (28, step 1 and the status table). */
  function cannotRecover(coopId) {
    var t = inForce(coopId);
    if (!t) return "No collection terms in force";
    if (!t.recovers) return "Its terms say it doesn't recover";
    if (!t.acknowledged_at) return "Its terms aren't acknowledged yet";
    return "";
  }
  /** The fee a cooperative's terms work out on a debt, once, when the arrangement is agreed (Q2). */
  function feeFor(t, debtCents) {
    if (!t || t.fee_basis === "NONE") return 0;
    if (t.fee_basis === "FLAT_PER_CASE") return t.fee_amount_cents;
    var fee = round(debtCents * t.fee_rate_bps / 10000);
    return t.fee_cap_cents ? Math.min(fee, t.fee_cap_cents) : fee;
  }
  var withheldFor = function (chargeId, onlyPaid) { return withheld.filter(function (w) { return w.charge === chargeId && (!onlyPaid || w.status === "PAID"); }); };
  var recovered = function (chargeId) { return withheldFor(chargeId, true).reduce(function (t, w) { return t + w.amount_cents; }, 0); };
  var chargeOf = function (id) { return charges.find(function (c) { return c.id === id; }) || null; };
  /** What a case has taken and what is left, loan and fee apart. */
  function progress(c) {
    var lc = chargeOf(c.loan_charge), fc = chargeOf(c.fee_charge);
    var lr = lc ? recovered(lc.id) : 0, fr = fc ? recovered(fc.id) : 0;
    return { loan: lc, fee: fc, loan_recovered_cents: lr, loan_left_cents: lc ? Math.max(0, lc.amount_cents - lr) : 0,
      fee_recovered_cents: fr, fee_left_cents: fc ? Math.max(0, fc.amount_cents - fr) : 0, pending_cents: withheld.filter(function (w) { return w["case"] === c.id && w.status === "DRAFT"; }).reduce(function (t, w) { return t + w.amount_cents; }, 0) };
  }
  /** What a payout gives up for recovery, within the arrangement and the terms' cap (08: the loan's charge first). */
  function takeFrom(memberId, netCents) {
    var open = charges.filter(function (c) { return c.member === memberId && c.status === "OPEN"; }).sort(function (a, b) { return a.priority - b.priority; });
    var t = inForce(GF.get(memberId).cooperative), cap = t ? round(netCents * t.max_per_payout_bps / 10000) : netCents, out = [], total = 0;
    open.forEach(function (c) {
      var want = c.per_payout_bps ? round(netCents * c.per_payout_bps / 10000) : c.per_payout_cents || c.amount_cents;
      var left = c.amount_cents - recovered(c.id);
      var amt = Math.max(0, Math.min(want, left, cap - total));
      /* The fee waits until the loan's charge is recovered (Q1). */
      if (c.priority > 10 && out.some(function (x) { return x.charge.priority === 10 && x.left_after > 0; })) amt = 0;
      if (amt > 0) { out.push({ charge: c, amount_cents: amt, left_after: left - amt }); total += amt; }
      else if (left > 0) out.push({ charge: c, amount_cents: 0, left_after: left });
    });
    return { items: out.filter(function (x) { return x.amount_cents > 0; }), all: out, total_cents: total, cap_cents: cap };
  }
  /** A member's live case, for the app and for eligibility (26's IN_RECOVERY). */
  function caseOf(memberId) { return cases.find(function (c) { return c.member === memberId && LIVE_CASE.indexOf(c.status) > -1; }) || null; }
  /** Defaulted loans GroFunder must handle itself: the cooperative can't take a case (28, step 1). */
  function noCaseLoans() {
    return Lo.loans.filter(function (l) { return l.status === "DEFAULTED" && !cases.some(function (c) { return c.loan === l.id; }) && cannotRecover(l.cooperative); })
      .map(function (l) { return { loan: l, why: cannotRecover(l.cooperative) }; });
  }
  /** Withholdings on PAID payouts that no live remittance covers yet. */
  function unremitted(coopId) {
    var done = {}; lines.filter(function (l) { return l.live; }).forEach(function (l) { done[l.payout_item] = true; });
    return withheld.filter(function (w) {
      var c = byId[w["case"]];
      return w.status === "PAID" && w.charge && chargeOf(w.charge).type === "pit-kij-rec" && c && c.cooperative === coopId && !done[w.payout];
    });
  }
  var feesEarned = function (coopId) { return withheld.filter(function (w) { return chargeOf(w.charge) && chargeOf(w.charge).type === "pit-kij-recfee" && byId[w["case"]].cooperative === coopId; }); };

  var L = {
    status: { PENDING: ["warning", "To confirm"], DECLINED: ["neutral", "Declined"], WITHDRAWN: ["neutral", "Withdrawn"], OPEN: ["info", "To agree"], RECOVERING: ["success", "Recovering"], PAUSED: ["warning", "Paused"], CLOSED: ["neutral", "Closed"] },
    end: { PAID: "Repaid in full", CURED: "The loan came back up to date", WRITTEN_OFF_STOPPED: "Written off", PARTNER_STOPPED: "The lender asked us to stop", LOAN_ENDED: "The loan ended", OTHER: "Other" },
    arrangement: { FULL: "As much as the terms allow, until it is paid", PARTIAL: "A part of each payout" },
    via: { IN_PERSON: "In person", PHONE: "By phone" },
    termsState: { IN_FORCE: ["success", "In force"], SCHEDULED: ["info", "Scheduled"], PAST: ["neutral", "Past"], WITHDRAWN: ["neutral", "Withdrawn"], DRAFT: ["warning", "Draft"] },
    fee: { NONE: "No fee", FLAT_PER_CASE: "A flat fee per case", PERCENT_OF_DEBT: "A share of the debt" },
    cycle: { WEEKLY: "Weekly", MONTHLY: "Monthly" },
    remittance: { RECORDED: ["info", "To confirm"], CONFIRMED: ["success", "Confirmed"], DISPUTED: ["error", "Disputed"], VOIDED: ["neutral", "Voided"] },
    passOn: { PENDING: ["warning", "To send"], SENT: ["info", "Sent"], REPORTED: ["info", "Reported"], POSTED: ["success", "Posted by the lender"] },
    chargeStatus: { OPEN: ["warning", "Being taken"], SETTLED: ["success", "Recovered"], PAUSED: ["neutral", "Paused"], CANCELLED: ["neutral", "Cancelled"] }
  };

  GF.recovery = {
    L: L, RULES: RULES, terms: terms, cases: cases, charges: charges, withheld: withheld, remittances: remittances, lines: lines, passOns: passOns, history: history, LIVE_CASE: LIVE_CASE,
    get: function (id) { return byId[id]; }, inForce: inForce, termsState: termsState, cannotRecover: cannotRecover, feeFor: feeFor,
    termsOf: function (coopId) { return terms.filter(function (t) { return t.cooperative === coopId; }).sort(function (a, b) { return b.version - a.version; }); },
    casesOf: function (coopId) { return cases.filter(function (c) { return c.cooperative === coopId; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); },
    caseOf: caseOf, caseForLoan: function (loanId) { return cases.find(function (c) { return c.loan === loanId; }) || null; },
    historyOf: function (id) { return history.filter(function (h) { return h["case"] === id; }).sort(function (a, b) { return a.changed_at < b.changed_at ? 1 : -1; }); },
    progress: progress, takeFrom: takeFrom, recovered: recovered, chargeOf: chargeOf, withheldFor: withheldFor,
    withheldOf: function (caseId) { return withheld.filter(function (w) { return w["case"] === caseId; }); },
    onPayout: function (payoutId) { return withheld.filter(function (w) { return w.payout === payoutId; }); },
    linesOf: function (remId) { return lines.filter(function (l) { return l.remittance === remId; }); },
    passOnsOf: function (remId) { return passOns.filter(function (p) { return p.remittance === remId; }); },
    noCaseLoans: noCaseLoans, unremitted: unremitted, feesEarned: feesEarned,
    /** 26's IN_RECOVERY: a member with a case that hasn't ended can't borrow. */
    inRecovery: function (memberId) { return !!caseOf(memberId); }
  };
})(typeof window !== "undefined" ? window : globalThis);
