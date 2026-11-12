/* loans.js: loans, part 1, origination (phase 16, UI-110; design/26-loans.md, part 1 signed off
 * 2026-11-09). Loaded after canon.js, kyc.js, groups.js, partners.js, consents.js and credit.js; adds GF.loans.
 *
 * Worked out here, as note 26 says, never typed:
 *   quote        one function from a terms version, an amount and a duration (30-day months, 7-day
 *                weeks, periods pro rata; charges on the amount requested; equal instalments, the
 *                last taking the rounding; late penalties apart, as "if you pay late")
 *   eligibility  the full table of refusals, in order, each with the member's words
 *   offers       products_for (24) with the most each member can borrow: the smaller of their
 *                limit (25) and the product's maximum
 *   spaces       a circle's live loans against its borrowing spaces (G73); can_release
 *
 * What the story assumes (declared, because phases 11 and 13 aren't changed while the owner reviews
 * them):
 *   - Mavuno Capital is treated as ACTIVE for offers (partners.js keeps it onboarding, as LP1 shows).
 *     Forwarding still waits for the gateway (L4): an approved loan shows it as the next step only.
 *   - Tujenge Kiamwangi's members all passed their KYC visits (kyc.js keeps Mary's visit sent back).
 * So, on "now" (Fri 30 Oct 2026, 10:30), Tujenge Kiamwangi is the one circle that can borrow:
 *   MAVUNO-000101  David      a GroFunder draft nobody accepted: expired after 7 days
 *   MAVUNO-000102  Mumbi      a draft cancelled when she called to say she'd wait
 *   MAVUNO-000103  Mary       accepted by SMS code, then rejected by Amina on her declarations
 *   MAVUNO-000104  Mary       a smaller draft Brian prepared after that rejection, waiting for her
 *   MAVUNO-000105  Samuel     accepted by SMS code; 1 of 2 approvals (Peter); the product needs two
 * The two live loans fill Tujenge's 2 borrowing spaces, so a third draft there is refused.
 * Part 2 (phase 17, UI-120): Tegemeo (ACTIVE, as after L4) lends to Parachichi Bora at Gatundu: Kamau repaid (CLOSED),
 * Paul repays on time, Nyambura is 12 days behind, George is with Tegemeo, Moses's ID needs an amendment, Lydia was
 * approved for less than she asked. Schedules, payments, charges and flags are here; the gateway's logs in gateway.js.
 * Recovery (phase 18, UI-130) needs defaulted loans where members are paid, so Tegemeo's dairy cohort at Kijani
 * carries four: Peter Ndungu (recovering), Peter Gathogo (just defaulted), Kamau Nduati (recovery declined) and
 * Muthoni Thuku (repaid through the cooperative, closed). Their cases are in recovery.js.
 * Wanjiku can't borrow: her visit waits for review and Umoja Gathiru is still forming. The member
 * app draws her request, quote and loan as review states.
 */
(function (root) {
  "use strict";
  var GF = root.GF, G = GF.groups, K = GF.kyc, P = GF.partners, C = GF.credit, CS = GF.consents;
  var T = function (d, t) { return "2026-" + d + "T" + (t || "09:00") + ":00+03:00"; };
  var NOW = GF.NOW;

  var ASSUME = {
    partnersActive: ["lp-mavuno"],
    verified: G.places.filter(function (p) { return (p.circle === "ci-kij-02" || p.circle === "ci-gat-02") && p.status === "MEMBER"; }).map(function (p) { return p.member; })
  };
  var SETTINGS = { DRAFT_DAYS: 7, SWITCH: "trial" };

  /* ---------------------------------------------------------------- the quote */
  var DAYS = { DAILY: 1, WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 };
  var PERIOD = { PER_WEEK: 7, PER_MONTH: 30, PER_YEAR: 365 };
  var half = function (x) { return Math.round(x + 1e-9); };
  /** quote(terms, amount, duration): note 26, "The quote". Amounts in cents. */
  function quote(t, amount, duration) {
    var days = duration * DAYS[t.duration_unit], end = t.repayment_frequency === "END_OF_TERM";
    var n = end ? 1 : duration, instDays = end ? days : DAYS[t.repayment_frequency];
    var lines = [], late = [];
    t.charges.forEach(function (c) {
      if (c.kind === "LATE_PENALTY") {
        late.push({ name: c.name, rule: (c.basis === "FLAT_AMOUNT" ? GF.fmt.money(c.amount_cents, { whole: true }) : P.pct(c.rate_bps) + " of " + (c.basis === "PERCENT_OF_OVERDUE" ? "what is overdue" : "the amount")) + ", " + P.L.chargeFreq[c.frequency].toLowerCase() });
        return;
      }
      var occ = c.frequency === "ONE_OFF" ? 1 : c.frequency === "PER_INSTALMENT" ? n : days / PERIOD[c.frequency];
      var amt;
      if (c.basis === "PERCENT_OF_BALANCE") {
        /* Reducing balance: the rate per instalment period, equal instalments; the interest is the schedule's total. */
        var r = c.rate_bps / 10000 * instDays / (PERIOD[c.frequency] || instDays);
        var pay = r ? amount * r / (1 - Math.pow(1 + r, -n)) : amount / n;
        amt = pay * n - amount;
      } else {
        var each = c.basis === "FLAT_AMOUNT" ? c.amount_cents : c.rate_bps / 10000 * amount;
        if (c.min_cents != null) each = Math.max(each, c.min_cents);
        if (c.max_cents != null) each = Math.min(each, c.max_cents);
        amt = each * occ;
      }
      lines.push({ name: c.name, kind: c.kind, collected: c.collected, amount_cents: half(amt) });
    });
    var sum = function (k) { return lines.filter(function (l) { return !k || l.collected === k; }).reduce(function (s, l) { return s + l.amount_cents; }, 0); };
    var repay = amount + sum("ADDED_TO_LOAN") + sum("WITH_INSTALMENTS"), inst = half(repay / n);
    var partner = P.get(P.get(t.product).partner), md = partner.profile.member_display;
    return {
      lines: lines, amount_cents: amount, duration: duration, duration_unit: t.duration_unit, amount_received_cents: amount - sum("DEDUCTED_AT_DISBURSEMENT"),
      instalments: { count: n, frequency: t.repayment_frequency, amount_cents: inst, last_amount_cents: repay - inst * (n - 1) },
      total_repayable_cents: repay, total_cost_cents: sum(), late_penalties: late, quote_version: "q1",
      partner: { name: md.name, paybill: md.paybill }, early_repayment: t.terms.early_repayment, disclosure: t.terms.disclosure, terms: t.id
    };
  }
  /** "3 months", "8 weeks". */
  function durationLine(n, unit) { var u = P.L.unit[unit]; return n + " " + (n === 1 ? u[0] : u[1]); }

  /* ---------------------------------------------------------------- loans */
  var LIVE = ["DRAFT", "REQUESTED", "APPROVED", "FORWARDED", "AMENDMENT_REQUIRED", "PARTNER_APPROVED", "ACTIVE", "IN_ARREARS", "DEFAULTED"];
  var loans = [], reviews = [], history = [];
  function loan(o) {
    var m = GF.get(o.member), pl = G.placeOf(o.member), t = P.get(o.terms), pr = P.get(t.product);
    var row = { id: o.id, reference: o.ref, member: o.member, cooperative: m.cooperative, borrower_key: m.id_type + ":" + m.id_number, circle: pl ? pl.circle : null,
      product: pr.id, terms: t.id, partner: pr.partner, status: o.status, origin: o.origin, amount_cents: o.amount, duration: o.duration, purpose: o.purpose,
      credit_score: C.latest(o.member) ? "cs:" + o.member : null, limit_override: (C.activeOverride(o.member) || {}).id || null, kyc_verification: o.visit || null,
      prepared_by: o.prepared_by || null, accepted_at: o.accepted_at || null, accepted_via: o.accepted_via || "", accepted_by: o.accepted_by || null,
      reviews_required: o.accepted_at ? pr.reviews_required : null, reviewed_at: o.reviewed_at || null, reviewed_by: o.reviewed_by || null,
      end_reason: o.end_reason || "", partner_ref: "", forwarded_at: null, forward_error: "", created_at: o.created_at, updated_at: o.updated_at || o.created_at,
      details: { quote: quote(t, o.amount, o.duration), acceptance: o.accepted_at ? { declarations_confirmed_at: o.accepted_at, code_sent_to: o.accepted_via === "SMS_CODE" ? m.phone : null } : {},
        review: o.note ? { note: o.note } : {}, checks: o.checks || null } };
    loans.push(row);
    (o.moves || []).forEach(function (h) { history.push({ loan: o.id, from_status: h[0], to_status: h[1], changed_at: h[2], changed_by: h[3] || null, source: h[4], details: h[5] ? { reason: h[5] } : {} }); });
    /* The consents the acceptance wrote (22): the loan agreement and sharing with the partner, by SMS code here. */
    if (o.accepted_at && CS) ["loan.agreement", "loan.sharing"].forEach(function (slot, i) {
      var d = CS.boundTo(slot, pr.partner), v = CS.versionsOf(d.id, "sw").filter(function (x) { return x.status === "PUBLISHED" && x.periods.some(function (p) { return p.live_from <= o.accepted_at; }); })[0];
      var app = o.accepted_via === "APP";
      CS.add({ id: "cr-" + o.id + "-" + i, user: m.user || null, on_behalf_of: m.id, document: v.document, version: v.id, version_hash: v.content_hash, slot: slot, context: "loan:" + o.ref, decision: "GRANTED",
        captured_by: app ? "USER" : "STAFF", recorded_by: app ? null : o.accepted_by, occurred_at: o.accepted_at, recorded_at: o.accepted_at,
        metadata: app ? { channel: "APP", language: "sw", app: { platform: "android", version: "1.4.0" } } : { channel: "SMS_CODE", language: "sw", sms: { phone: m.phone, challenge_id: "otp-" + o.id } } });
    });
    return row;
  }
  var MAV = "pt-dairy-1";
  loan({ id: "ln-101", ref: "MAVUNO-000101", member: "m-kij-M-0011", terms: MAV, status: "CANCELLED", origin: "GROFUNDER", amount: 500000, duration: 2, purpose: "FEED", prepared_by: "u-brian",
    end_reason: "DRAFT_EXPIRED", created_at: T("10-20", "10:00"), updated_at: T("10-27", "10:00"),
    moves: [["", "DRAFT", T("10-20", "10:00"), "u-brian", "CONSOLE"], ["DRAFT", "CANCELLED", T("10-27", "10:00"), null, "SYSTEM", "Not accepted within 7 days."]] });
  loan({ id: "ln-102", ref: "MAVUNO-000102", member: "m-kij-M-0004", terms: MAV, status: "CANCELLED", origin: "GROFUNDER", amount: 500000, duration: 2, purpose: "VET", prepared_by: "u-brian",
    end_reason: "BY_GROFUNDER", created_at: T("10-22", "11:30"), updated_at: T("10-24", "15:05"),
    moves: [["", "DRAFT", T("10-22", "11:30"), "u-brian", "CONSOLE"], ["DRAFT", "CANCELLED", T("10-24", "15:05"), "u-brian", "CONSOLE", "She called: she'd rather wait until after the long rains."]] });
  loan({ id: "ln-103", ref: "MAVUNO-000103", member: "m-kij-0217", terms: MAV, status: "GF_REJECTED", origin: "GROFUNDER", amount: 1000000, duration: 3, purpose: "HEIFER", prepared_by: "u-brian",
    accepted_at: T("10-27", "11:05"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("10-28", "15:00"), reviewed_by: "u-amina", end_reason: "DECLARATIONS",
    note: "School fees and her SACCO loan come to Ksh 9,000 a month, against declared income of Ksh 5,000 to 10,000. Offer Ksh 5,000 instead.", created_at: T("10-26", "09:40"), updated_at: T("10-28", "15:00"),
    moves: [["", "DRAFT", T("10-26", "09:40"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("10-27", "11:05"), "u-brian", "CONSOLE"],
      ["REQUESTED", "GF_REJECTED", T("10-28", "15:00"), "u-amina", "CONSOLE", "School fees and her SACCO loan come to Ksh 9,000 a month, against declared income of Ksh 5,000 to 10,000. Offer Ksh 5,000 instead."]] });
  loan({ id: "ln-104", ref: "MAVUNO-000104", member: "m-kij-0217", terms: MAV, status: "DRAFT", origin: "GROFUNDER", amount: 500000, duration: 2, purpose: "FEED", prepared_by: "u-brian",
    created_at: T("10-29", "16:20"), moves: [["", "DRAFT", T("10-29", "16:20"), "u-brian", "CONSOLE"]] });
  loan({ id: "ln-105", ref: "MAVUNO-000105", member: "m-kij-0031", terms: MAV, status: "REQUESTED", origin: "GROFUNDER", amount: 2000000, duration: 4, purpose: "HEIFER", prepared_by: "u-brian", visit: "v-104",
    accepted_at: T("10-28", "14:40"), accepted_via: "SMS_CODE", accepted_by: "u-brian", created_at: T("10-27", "09:30"), updated_at: T("10-29", "10:15"),
    moves: [["", "DRAFT", T("10-27", "09:30"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("10-28", "14:40"), "u-brian", "CONSOLE"]] });
  reviews.push({ id: "lr-1", loan: "ln-105", reviewer: "u-peter", decision: "APPROVE", credit_score: "cs:m-kij-0031", note: "Twelve years of deliveries; the heifer fits his feed records.", reviewed_at: T("10-29", "10:15") });
  reviews.push({ id: "lr-2", loan: "ln-103", reviewer: "u-amina", decision: "REJECT", credit_score: "cs:m-kij-0217", note: "School fees and her SACCO loan come to Ksh 9,000 a month, against declared income of Ksh 5,000 to 10,000. Offer Ksh 5,000 instead.", reviewed_at: T("10-28", "15:00") });

  /* ---------------------------------------------------------------- part 2: servicing (phase 17, UI-120) */
  /* Tegemeo (ACTIVE, drawn as after L4) lends to Parachichi Bora at Gatundu on its avocado loan, weekly.
   * Tegemeo's adapter doesn't send overdue signals (signals_arrears false), so arrears are COUNTED (26 part 2). */
  var instalments = [], payments = [], charges = [], flags = [];
  var TODAY = GF.TODAY;
  var addDays = function (d, n) { return new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10); };
  var daysBetween = function (a, b) { return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5); };
  /** Settle instalments in due order against posted payments in date order (26 part 2): settled_on, days past due, amount overdue. */
  function ledger(l) {
    var lines = instalments.filter(function (i) { return i.loan === l.id && !i.superseded_at; }).sort(function (a, b) { return a.number - b.number; });
    var pays = payments.filter(function (x) { return x.loan === l.id && x.status === "POSTED"; }).sort(function (a, b) { return a.paid_on < b.paid_on ? -1 : 1; });
    var toSchedule = function (x) { return x.amount_cents - (x.split_known ? x.charges_cents : 0); };
    var due = 0, paid = 0, pi = 0;
    lines.forEach(function (i) {
      due += i.total_cents; i.settled_on = null;
      while (paid < due && pi < pays.length) { paid += toSchedule(pays[pi]); if (paid >= due) i.settled_on = pays[pi].paid_on; pi++; }
      if (!i.settled_on && paid >= due) i.settled_on = pays[pi - 1] ? pays[pi - 1].paid_on : null;
    });
    var totalPaid = pays.reduce(function (t, x) { return t + toSchedule(x); }, 0);
    var oldest = lines.find(function (i) { return !i.settled_on && i.due_on < TODAY; });
    var dueBefore = lines.filter(function (i) { return i.due_on < TODAY; }).reduce(function (t, i) { return t + i.total_cents; }, 0);
    return { lines: lines, payments: pays, days_past_due: oldest ? daysBetween(oldest.due_on, TODAY) : 0, overdue_cents: Math.max(0, dueBefore - totalPaid),
      paid_cents: totalPaid, total_cents: lines.reduce(function (t, i) { return t + i.total_cents; }, 0) };
  }
  /** svc: a loan past forwarding. o adds: forwarded, stage, approved {amount, at}, disbursed (ISO), paid (instalments paid, each on its due date or o.payDay offset), unknownSplit (payment number), closed. */
  function svc(o) {
    var l = loan(o), t = P.get(l.terms), q = l.details.quote, m = GF.get(l.member);
    l.partner_ref = o.forwarded ? "TMF-" + o.ref.slice(-4) + "-LN" : "";
    l.forwarded_at = o.forwarded || null;
    l.details.partner = o.forwarded ? { customer_id: "TMF-C-" + m.member_no, loan_id: l.partner_ref, stage: o.stage || "", approved: o.approved ? { amount_cents: o.approved.amount, duration: l.duration, duration_unit: t.duration_unit, at: o.approved.at } : null } : null;
    l.disbursed_at = o.disbursed || null; l.disbursed_cents = null; l.received_cents = null; l.balance_cents = null;
    l.days_past_due = 0; l.overdue_cents = 0; l.arrears_as_of = null; l.arrears_source = ""; l.defaulted_at = o.defaulted || null; l.closed_at = o.closed || null; l.last_partner_event_at = o.lastEvent || o.forwarded || null;
    if (o.disbursed) {
      var amt = o.approved ? o.approved.amount : l.amount_cents, qq = quote(t, amt, l.duration), n = qq.instalments.count, step = DAYS[t.repayment_frequency] || 7;
      var start = o.disbursed.slice(0, 10), added = qq.lines.filter(function (x) { return x.collected === "ADDED_TO_LOAN"; }).reduce(function (a, x) { return a + x.amount_cents; }, 0);
      l.disbursed_cents = amt; l.received_cents = qq.amount_received_cents;
      l.details.disbursement = { channel: "MPESA", reference: "QK" + o.ref.slice(-4) + "XT9", fees_deducted_cents: amt - qq.amount_received_cents, first_due_on: addDays(start, step), estimated: !!o.estimated };
      var pr0 = Math.round(amt / n), fe0 = Math.round(added / n);
      for (var k = 1; k <= n; k++) {
        var total = k < n ? qq.instalments.amount_cents : qq.instalments.last_amount_cents, pc = k < n ? pr0 : amt - pr0 * (n - 1), fc = k < n ? fe0 : added - fe0 * (n - 1);
        instalments.push({ id: l.id + "-i" + k, loan: l.id, version: 1, number: k, due_on: addDays(start, step * k), principal_cents: pc, interest_cents: total - pc - fc, fees_cents: fc, total_cents: total,
          partner_paid_cents: null, partner_status: "", settled_on: null, source: "PARTNER", superseded_at: null, created_at: o.disbursed });
      }
      var lines = instalments.filter(function (i) { return i.loan === l.id; });
      for (k = 1; k <= (o.paid || 0); k++) {
        var li = lines[k - 1], unknown = o.unknownSplit === k, on = addDays(li.due_on, o.payEarly ? -o.payEarly : 0);
        payments.push({ id: l.id + "-p" + k, loan: l.id, partner_payment_id: "TMF-PAY-" + o.ref.slice(-3) + k, amount_cents: li.total_cents, paid_on: on, received_at: on + "T18:20:00+03:00",
          split_known: !unknown, principal_cents: unknown ? null : li.principal_cents, interest_cents: unknown ? null : li.interest_cents, fees_cents: unknown ? null : li.fees_cents, charges_cents: unknown ? null : 0,
          balance_after_cents: null, receipt: "QK" + (8800 + k) + o.ref.slice(-3) + "M", channel: "MEMBER_DIRECT", source: unknown ? "POLL" : "CALLBACK", event: "pe-" + l.id + "-p" + k, status: "POSTED", reversed_at: null, reversal_event: null,
          details: { charges: [], reversal_reason: "", partner_split: unknown ? null : { principal: li.principal_cents, interest: li.interest_cents, fees: li.fees_cents } } });
      }
      var lg = ledger(l), run = 0;
      payments.filter(function (x) { return x.loan === l.id; }).forEach(function (x) { run += x.amount_cents; x.balance_after_cents = lg.total_cents - run; });
      lines.forEach(function (i) { i.partner_paid_cents = i.settled_on ? i.total_cents : 0; i.partner_status = i.settled_on ? "PAID" : i.due_on < TODAY ? "OVERDUE" : "DUE"; });
      l.balance_cents = lg.total_cents - lg.paid_cents; l.days_past_due = lg.days_past_due; l.overdue_cents = lg.overdue_cents; l.arrears_as_of = TODAY; l.arrears_source = "COUNTED";
      if (o.closed) { l.balance_cents = 0; l.days_past_due = 0; l.overdue_cents = 0; }
    }
    return l;
  }
  var AVO = "pt-avo-1", Mercy = "u-mercy";
  var mv = function (rows) { return rows; };
  /* Kamau: repaid all 12 weeks; Tegemeo closed it on 27 Oct. A stale "active" it resent after closing was ignored (STATUS_CONFLICT, dismissed). */
  svc({ id: "ln-131", ref: "TEGEMEO-000031", member: "m-gat-GA-0007", terms: AVO, status: "CLOSED", origin: "GROFUNDER", amount: 2000000, duration: 12, purpose: "INPUTS", prepared_by: "u-brian",
    accepted_at: T("07-28", "10:20"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("07-29", "09:00"), reviewed_by: "u-peter", created_at: T("07-27", "15:00"), updated_at: T("10-27", "18:30"),
    forwarded: T("07-29", "09:01"), disbursed: T("08-01", "11:00"), paid: 12, payEarly: 1, closed: T("10-23", "18:30"), lastEvent: T("10-28", "07:10"),
    moves: [["", "DRAFT", T("07-27", "15:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("07-28", "10:20"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("07-29", "09:00"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("07-29", "09:01"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("07-30", "14:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("08-01", "11:00"), null, "PARTNER"],
      ["ACTIVE", "CLOSED", T("10-23", "18:30"), null, "PARTNER"]] });
  /* Paul: 16 weeks, every instalment so far paid; one payment's split arrived as 0.00 (SPLIT_UNKNOWN); the disbursement was estimated from a read. */
  svc({ id: "ln-134", ref: "TEGEMEO-000034", member: "m-gat-GA-0004", terms: AVO, status: "ACTIVE", origin: "GROFUNDER", amount: 3000000, duration: 16, purpose: "SEEDLINGS", prepared_by: "u-brian",
    accepted_at: T("09-02", "11:40"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("09-03", "10:00"), reviewed_by: "u-amina", created_at: T("09-01", "16:00"), updated_at: T("10-27", "19:05"),
    forwarded: T("09-03", "10:01"), disbursed: T("09-08", "09:30"), paid: 7, unknownSplit: 7, estimated: true, lastEvent: T("10-27", "19:05"),
    moves: [["", "DRAFT", T("09-01", "16:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("09-02", "11:40"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("09-03", "10:00"), "u-amina", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("09-03", "10:01"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("09-05", "12:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("09-08", "09:30"), null, "PARTNER"]] });
  /* Nyambura: 12 weeks; paid 4, then nothing since 11 Oct: 12 days past due, 2 instalments overdue; Tegemeo levied two late fees. */
  svc({ id: "ln-136", ref: "TEGEMEO-000036", member: "m-gat-GA-0010", terms: AVO, status: "IN_ARREARS", origin: "GROFUNDER", amount: 1500000, duration: 12, purpose: "INPUTS", prepared_by: "u-brian",
    accepted_at: T("09-09", "10:00"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("09-10", "09:30"), reviewed_by: "u-peter", created_at: T("09-08", "14:00"), updated_at: T("10-26", "02:00"),
    forwarded: T("09-10", "09:31"), disbursed: T("09-13", "10:00"), paid: 4, lastEvent: T("10-25", "16:40"),
    moves: [["", "DRAFT", T("09-08", "14:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("09-09", "10:00"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("09-10", "09:30"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("09-10", "09:31"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("09-11", "15:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("09-13", "10:00"), null, "PARTNER"],
      ["ACTIVE", "IN_ARREARS", T("10-26", "02:00"), null, "SYSTEM", "The count: 8 days past due, past the 7 grace days"]] });
  /* George: with Tegemeo's credit officer. */
  svc({ id: "ln-138", ref: "TEGEMEO-000038", member: "m-gat-GA-0014", terms: AVO, status: "FORWARDED", origin: "GROFUNDER", amount: 2500000, duration: 16, purpose: "INPUTS", prepared_by: "u-brian",
    accepted_at: T("10-26", "11:00"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("10-28", "09:40"), reviewed_by: "u-amina", created_at: T("10-24", "10:00"), updated_at: T("10-29", "08:15"),
    forwarded: T("10-28", "09:41"), stage: "Pending: Credit officer", lastEvent: T("10-29", "08:15"),
    moves: [["", "DRAFT", T("10-24", "10:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("10-26", "11:00"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("10-28", "09:40"), "u-amina", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("10-28", "09:41"), null, "SYSTEM"]] });
  /* Moses: Tegemeo asks for a clearer ID. */
  svc({ id: "ln-139", ref: "TEGEMEO-000039", member: "m-gat-GA-0011", terms: AVO, status: "AMENDMENT_REQUIRED", origin: "GROFUNDER", amount: 1200000, duration: 8, purpose: "INPUTS", prepared_by: "u-brian",
    accepted_at: T("10-26", "11:30"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("10-28", "09:50"), reviewed_by: "u-amina", created_at: T("10-24", "10:30"), updated_at: T("10-29", "11:20"),
    forwarded: T("10-28", "09:51"), stage: "Returned: documents", lastEvent: T("10-29", "11:20"),
    moves: [["", "DRAFT", T("10-24", "10:30"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("10-26", "11:30"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("10-28", "09:50"), "u-amina", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("10-28", "09:51"), null, "SYSTEM"], ["FORWARDED", "AMENDMENT_REQUIRED", T("10-29", "11:20"), null, "PARTNER", "The back of the ID photo is unreadable. Please send a clearer one."]] });
  /* Lydia asked in the app for Ksh 20,000; Tegemeo approved Ksh 18,000 (QUOTE_DIFFERENCE), waiting to disburse. */
  svc({ id: "ln-140", ref: "TEGEMEO-000040", member: "m-gat-GA-0013", terms: AVO, status: "PARTNER_APPROVED", origin: "MEMBER", amount: 2000000, duration: 12, purpose: "SEEDLINGS",
    accepted_at: T("10-25", "20:10"), accepted_via: "APP", accepted_by: "u-m-gat-GA-0013", reviewed_at: T("10-27", "10:00"), reviewed_by: "u-peter", created_at: T("10-25", "20:10"), updated_at: T("10-29", "16:00"),
    forwarded: T("10-27", "10:01"), stage: "Approved", approved: { amount: 1800000, at: T("10-29", "16:00") }, lastEvent: T("10-29", "16:00"),
    moves: [["", "REQUESTED", T("10-25", "20:10"), null, "MEMBER_APP"], ["REQUESTED", "APPROVED", T("10-27", "10:00"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("10-27", "10:01"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("10-29", "16:00"), null, "PARTNER"]] });
  ["ln-131", "ln-134", "ln-136", "ln-138", "ln-139", "ln-140"].forEach(function (id) {
    var r = { "ln-131": "u-peter", "ln-134": "u-amina", "ln-136": "u-peter", "ln-138": "u-amina", "ln-139": "u-amina", "ln-140": "u-peter" }[id];
    reviews.push({ id: "lr-" + id, loan: id, reviewer: r, decision: "APPROVE", credit_score: null, note: "", reviewed_at: loans.find(function (l) { return l.id === id; }).reviewed_at });
  });
  /* Tegemeo's late fees on Nyambura's two missed instalments (charge.levied). */
  ["ln-136-i5", "ln-136-i6"].forEach(function (iid, k) {
    var i = instalments.find(function (x) { return x.id === iid; });
    charges.push({ id: "lc-" + iid, loan: "ln-136", ref: "TMF-LF-" + (6201 + k), origin: "PARTNER", kind: "LATE_PENALTY", terms_charge: "Late penalty", instalment: iid, name: "Late fee", amount_cents: 20000, collected_cents: 0, status: "OPEN",
      charged_at: addDays(i.due_on, 8) + "T02:10:00+03:00", updated_at: addDays(i.due_on, 8) + "T02:10:00+03:00" });
  });
  var F = function (id, loanId, kind, status, opened, d, by, at, note) { flags.push({ id: id, loan: loanId, kind: kind, status: status, opened_at: opened, resolved_at: at || null, resolved_by: by || null, note: note || "", details: d }); };
  F("lf-1", "ln-140", "QUOTE_DIFFERENCE", "OPEN", T("10-29", "16:00"), { quoted_cents: 2000000, approved_cents: 1800000, text: "Approved Ksh 18,000 against Ksh 20,000 quoted. Lydia was told at once." });
  F("lf-2", "ln-134", "SPLIT_UNKNOWN", "OPEN", T("10-27", "19:05"), { payment: "ln-134-p7", text: "Tegemeo's repayments read gave the split of 27 Oct's payment as 0.00. Counted as all to the schedule until the callback gives it." });
  F("lf-3", "ln-134", "DISBURSEMENT_ESTIMATED", "RESOLVED", T("09-08", "09:31"), { text: "Fees deducted and the first due date were filled from the schedule read." }, "u-brian", T("09-09", "10:15"), "Halima confirmed the figures by email.");
  F("lf-4", "ln-136", "EVENT_FAILED", "OPEN", T("10-25", "16:41"), { event: "pe-9", text: "A charge.status event failed: its amount \"200.005\" can't be converted to cents without rounding." });
  F("lf-5", "ln-131", "STATUS_CONFLICT", "DISMISSED", T("10-28", "07:10"), { event: "pe-12", text: "Tegemeo sent loan.status ACTIVE after the loan closed." }, "u-brian", T("10-28", "09:00"), "Tegemeo replayed old events after an outage; the loan is repaid. Ignored.");

  /* Kijani, Tegemeo's dairy cohort (phase 18, recovery): loans that defaulted, and one recovered in full.
   * Tegemeo paused new dairy lending at Kijani on 18 Sep, so nothing new is offered there. */
  var KIJ = "pt-tegkij-1";
  svc({ id: "ln-150", ref: "TEGEMEO-000050", member: "m-kij-0199", terms: KIJ, status: "DEFAULTED", origin: "GROFUNDER", amount: 1500000, duration: 4, purpose: "FEED", prepared_by: "u-brian",
    accepted_at: T("06-26", "11:00"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("06-27", "09:00"), reviewed_by: "u-peter", created_at: T("06-25", "15:00"), updated_at: T("09-10", "02:00"),
    forwarded: T("06-27", "09:01"), disbursed: T("07-01", "10:00"), paid: 1, defaulted: T("09-10", "02:00"), lastEvent: T("09-10", "02:00"),
    moves: [["", "DRAFT", T("06-25", "15:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("06-26", "11:00"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("06-27", "09:00"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("06-27", "09:01"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("06-29", "12:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("07-01", "10:00"), null, "PARTNER"],
      ["ACTIVE", "IN_ARREARS", T("09-07", "02:00"), null, "SYSTEM", "The count: 8 days past due"], ["IN_ARREARS", "DEFAULTED", T("09-10", "02:00"), null, "PARTNER", "Tegemeo defaulted the loan after 30 days overdue."]] });
  svc({ id: "ln-151", ref: "TEGEMEO-000051", member: "m-kij-M-0013", terms: KIJ, status: "DEFAULTED", origin: "GROFUNDER", amount: 1000000, duration: 3, purpose: "VET", prepared_by: "u-brian",
    accepted_at: T("07-20", "10:00"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("07-21", "09:00"), reviewed_by: "u-peter", created_at: T("07-19", "14:00"), updated_at: T("10-28", "02:00"),
    forwarded: T("07-21", "09:01"), disbursed: T("07-25", "09:00"), paid: 1, defaulted: T("10-28", "02:00"), lastEvent: T("10-28", "02:00"),
    moves: [["", "DRAFT", T("07-19", "14:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("07-20", "10:00"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("07-21", "09:00"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("07-21", "09:01"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("07-23", "11:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("07-25", "09:00"), null, "PARTNER"],
      ["ACTIVE", "IN_ARREARS", T("09-30", "02:00"), null, "SYSTEM", "The count: 8 days past due"], ["IN_ARREARS", "DEFAULTED", T("10-28", "02:00"), null, "PARTNER", "Tegemeo defaulted the loan."]] });
  svc({ id: "ln-152", ref: "TEGEMEO-000052", member: "m-kij-M-0005", terms: KIJ, status: "CLOSED", origin: "GROFUNDER", amount: 800000, duration: 3, purpose: "FEED", prepared_by: "u-brian",
    accepted_at: T("06-26", "14:00"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("06-27", "10:00"), reviewed_by: "u-peter", created_at: T("06-25", "16:00"), updated_at: T("10-20", "16:00"),
    forwarded: T("06-27", "10:01"), disbursed: T("06-30", "09:00"), paid: 3, closed: T("10-20", "16:00"), lastEvent: T("10-20", "16:00"),
    moves: [["", "DRAFT", T("06-25", "16:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("06-26", "14:00"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("06-27", "10:00"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("06-27", "10:01"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("06-28", "15:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("06-30", "09:00"), null, "PARTNER"],
      ["ACTIVE", "IN_ARREARS", T("08-07", "02:00"), null, "SYSTEM", "The count: 8 days past due"], ["IN_ARREARS", "DEFAULTED", T("09-05", "02:00"), null, "PARTNER", "Tegemeo defaulted the loan."],
      ["DEFAULTED", "CLOSED", T("10-20", "16:00"), null, "PARTNER", "Repaid in full through the cooperative."]] });
  svc({ id: "ln-153", ref: "TEGEMEO-000053", member: "m-kij-M-0007", terms: KIJ, status: "DEFAULTED", origin: "GROFUNDER", amount: 600000, duration: 3, purpose: "FEED", prepared_by: "u-brian",
    accepted_at: T("07-20", "11:30"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("07-21", "09:30"), reviewed_by: "u-peter", created_at: T("07-19", "15:00"), updated_at: T("10-10", "02:00"),
    forwarded: T("07-21", "09:31"), disbursed: T("07-25", "10:00"), paid: 0, defaulted: T("10-10", "02:00"), lastEvent: T("10-10", "02:00"),
    moves: [["", "DRAFT", T("07-19", "15:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("07-20", "11:30"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("07-21", "09:30"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("07-21", "09:31"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("07-23", "12:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("07-25", "10:00"), null, "PARTNER"],
      ["ACTIVE", "IN_ARREARS", T("09-02", "02:00"), null, "SYSTEM", "The count: 8 days past due"], ["IN_ARREARS", "DEFAULTED", T("10-10", "02:00"), null, "PARTNER", "Tegemeo defaulted the loan."]] });
  ["ln-150", "ln-151", "ln-152", "ln-153"].forEach(function (id) {
    var l = loans.find(function (x) { return x.id === id; });
    reviews.push({ id: "lr-" + id, loan: id, reviewer: l.reviewed_by, decision: "APPROVE", credit_score: null, note: "", reviewed_at: l.reviewed_at });
  });

  /* Mawingu, Chemi Chemi Sacco's cherry advances (phase 19, the partner portal): a lender with no system
   * of its own works these in the portal, so every move is a PORTAL event by its own staff (gateway.js). */
  var CHEMI = "pt-chemi-1";
  svc({ id: "ln-160", ref: "CHEMI-000060", member: "m-maw-MCG-0004", terms: CHEMI, status: "FORWARDED", origin: "GROFUNDER", amount: 400000, duration: 3, purpose: "LABOUR", prepared_by: "u-brian",
    accepted_at: T("10-28", "19:40"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("10-29", "11:00"), reviewed_by: "u-peter", created_at: T("10-27", "15:00"), updated_at: T("10-29", "11:01"),
    forwarded: T("10-29", "11:01"), stage: "In the queue", lastEvent: T("10-29", "11:01"),
    moves: [["", "DRAFT", T("10-27", "15:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("10-28", "19:40"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("10-29", "11:00"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("10-29", "11:01"), null, "SYSTEM", "A portal lender: GroFunder raises application.received itself (29)."]] });
  svc({ id: "ln-161", ref: "CHEMI-000061", member: "m-maw-MCG-0001", terms: CHEMI, status: "IN_ARREARS", origin: "GROFUNDER", amount: 500000, duration: 3, purpose: "INPUTS", prepared_by: "u-brian",
    accepted_at: T("08-04", "10:30"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("08-05", "09:20"), reviewed_by: "u-peter", created_at: T("08-03", "15:00"), updated_at: T("10-15", "02:00"),
    forwarded: T("08-05", "09:21"), disbursed: T("08-10", "11:00"), paid: 1, lastEvent: T("10-12", "16:20"),
    moves: [["", "DRAFT", T("08-03", "15:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("08-04", "10:30"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("08-05", "09:20"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("08-05", "09:21"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("08-07", "14:00"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("08-10", "11:00"), null, "PARTNER"],
      ["ACTIVE", "IN_ARREARS", T("10-15", "02:00"), null, "SYSTEM", "GroFunder's nightly sweep: 8 days past due."]] });
  svc({ id: "ln-162", ref: "CHEMI-000062", member: "m-maw-MCG-0011", terms: CHEMI, status: "CLOSED", origin: "GROFUNDER", amount: 300000, duration: 2, purpose: "LABOUR", prepared_by: "u-brian",
    accepted_at: T("08-04", "11:00"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("08-05", "09:40"), reviewed_by: "u-peter", created_at: T("08-03", "16:00"), updated_at: T("10-09", "12:00"),
    forwarded: T("08-05", "09:41"), disbursed: T("08-10", "12:00"), paid: 2, closed: T("10-09", "12:00"), lastEvent: T("10-09", "12:00"),
    moves: [["", "DRAFT", T("08-03", "16:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("08-04", "11:00"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("08-05", "09:40"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("08-05", "09:41"), null, "SYSTEM"], ["FORWARDED", "PARTNER_APPROVED", T("08-07", "14:30"), null, "PARTNER"], ["PARTNER_APPROVED", "ACTIVE", T("08-10", "12:00"), null, "PARTNER"],
      ["ACTIVE", "CLOSED", T("10-09", "12:00"), null, "PARTNER", "Repaid in full: GroFunder's ledger reached zero with no open charges (29)."]] });
  svc({ id: "ln-163", ref: "CHEMI-000063", member: "m-maw-MCG-0012", terms: CHEMI, status: "PARTNER_REJECTED", origin: "GROFUNDER", amount: 600000, duration: 4, purpose: "INPUTS", prepared_by: "u-brian",
    accepted_at: T("09-14", "20:10"), accepted_via: "SMS_CODE", accepted_by: "u-brian", reviewed_at: T("09-15", "10:00"), reviewed_by: "u-peter", created_at: T("09-13", "16:00"), updated_at: T("09-17", "15:40"),
    forwarded: T("09-15", "10:01"), lastEvent: T("09-17", "15:40"),
    moves: [["", "DRAFT", T("09-13", "16:00"), "u-brian", "CONSOLE"], ["DRAFT", "REQUESTED", T("09-14", "20:10"), "u-brian", "CONSOLE"], ["REQUESTED", "APPROVED", T("09-15", "10:00"), "u-peter", "CONSOLE"],
      ["APPROVED", "FORWARDED", T("09-15", "10:01"), null, "SYSTEM"],
      ["FORWARDED", "PARTNER_REJECTED", T("09-17", "15:40"), null, "PARTNER", "Chemi Chemi: \"He already has an advance with us from last season.\""]] });
  ["ln-160", "ln-161", "ln-162", "ln-163"].forEach(function (id) {
    var l = loans.find(function (x) { return x.id === id; });
    reviews.push({ id: "lr-" + id, loan: id, reviewer: l.reviewed_by, decision: "APPROVE", credit_score: null, note: "", reviewed_at: l.reviewed_at });
  });
  /* Chemi Chemi's late fee on Otieno's missed instalment, levied by GroFunder's sweep in portal mode (26). */
  (function () {
    var i = instalments.find(function (x) { return x.loan === "ln-161" && x.number === 2; });
    if (i) charges.push({ id: "lc-ln-161-i2", loan: "ln-161", ref: "GF-LF-7701", origin: "PARTNER", kind: "LATE_PENALTY", terms_charge: "Late penalty", instalment: i.id, name: "Late fee",
      amount_cents: 15000, collected_cents: 0, status: "OPEN", charged_at: T("10-15", "02:10"), updated_at: T("10-15", "02:10") });
  })();

  /* ---------------------------------------------------------------- pauses */
  var pauses = [
    { id: "ps-1", scope: "CIRCLE", cooperative: null, cluster: null, circle: "ci-kij-03", status: "ACTIVE", reason: "Two members' records share one phone number. Checking before any loan in the circle.",
      started_at: T("10-20", "12:00"), started_by: "u-peter", ended_at: null, ended_by: null,
      details: { message: { en: "Borrowing in your circle is paused while GroFunder checks some details. We'll tell you when it opens again.", sw: "Kukopa katika kikundi chako kumesimamishwa GroFunder inapokagua taarifa fulani. Tutakujulisha kikifunguliwa tena." } } },
    { id: "ps-2", scope: "ALL", cooperative: null, cluster: null, circle: null, status: "ENDED", reason: "The SMS provider was down, so drafts couldn't be accepted by code.",
      started_at: T("10-26", "08:00"), started_by: "u-amina", ended_at: T("10-26", "10:30"), ended_by: "u-amina",
      details: { message: { en: "Loans are paused for a short while. Please try again later today.", sw: "Mikopo imesimamishwa kwa muda mfupi. Tafadhali jaribu tena baadaye leo." } } },
    { id: "ps-3", scope: "CLUSTER", cooperative: null, cluster: "cl-kij-kiamwangi", circle: null, status: "ENDED", reason: "Kijani was correcting the Kiamwangi centre's September deliveries.",
      started_at: T("10-15", "09:00"), started_by: "u-peter", ended_at: T("10-16", "17:00"), ended_by: "u-peter",
      details: { message: { en: "Borrowing is paused in your area while your cooperative corrects some records.", sw: "Kukopa kumesimamishwa katika eneo lako chama kinaporekebisha rekodi fulani." } } }
  ];

  /* ---------------------------------------------------------------- reading */
  var byId = {}; loans.concat(pauses, flags).forEach(function (x) { byId[x.id] = x; });
  var isLive = function (l) { return LIVE.indexOf(l.status) > -1; };
  function verified(memberId) { return ASSUME.verified.indexOf(memberId) > -1 || K.standing(memberId).verified; }
  function partnerOk(p) { return (p.status === "ACTIVE" || ASSUME.partnersActive.indexOf(p.id) > -1) && P.CONFIG.environments.indexOf(p.environment) > -1; }
  /** products_for (24): ACTIVE product and coverage, partner ACTIVE in a listed environment, terms in force. */
  function productsFor(coopId) {
    return P.products.filter(function (pr) {
      return pr.status === "ACTIVE" && P.coverageOf(pr.id).some(function (c) { return c.cooperative === coopId; }) && partnerOk(P.get(pr.partner)) && P.inForce(pr.id);
    }).map(function (pr) { return { product: pr, terms: P.inForce(pr.id), partner: P.get(pr.partner) }; });
  }
  function liveIn(circleId, except) { return loans.filter(function (l) { return l.circle === circleId && isLive(l) && l.id !== except; }); }
  function pauseFor(m, circleId) {
    return pauses.find(function (p) { return p.status === "ACTIVE" && (p.scope === "ALL" || (p.scope === "COOPERATIVE" && p.cooperative === m.cooperative) || (p.scope === "CLUSTER" && p.cluster === m.cluster) || (p.scope === "CIRCLE" && p.circle === circleId)); }) || null;
  }
  var LIVE_WORD = { DRAFT: "waiting for you to accept", REQUESTED: "with GroFunder for review", APPROVED: "approved", FORWARDED: "with the lender", AMENDMENT_REQUIRED: "with the lender", PARTNER_APPROVED: "approved by the lender", ACTIVE: "being repaid", IN_ARREARS: "behind", DEFAULTED: "in default" };
  /** Eligibility (note 26, the full table), in order. opts: loan (the loan being checked, so it doesn't count against itself), product, amount, duration, purpose. */
  function eligibility(memberId, opts) {
    opts = opts || {};
    var m = GF.get(memberId), coop = GF.get(m.cooperative), pl = G.placeOf(memberId), circle = pl && pl.status === "MEMBER" ? G.get(pl.circle) : null, out = [];
    var no = function (code, text) { out.push({ code: code, text: text }); };
    if (SETTINGS.SWITCH === "off") no("LENDING_OFF", "Loans aren't available yet.");
    if (CS && !CS.allows(memberId, "LENDING").ok) no("CONSENT", "Agree to lending first.");
    if (m.status !== "ACTIVE") no("NOT_ACTIVE", "Your membership is not active. Talk to your cooperative.");
    if (coop.status !== "ACTIVE") no("COOPERATIVE", "Your cooperative isn't taking loan requests right now.");
    var pz = pauseFor(m, circle && circle.id);
    if (pz) no("PAUSED", pz.details.message.en);
    if (!verified(memberId)) {
      var st = K.standing(memberId), lv = K.liveVisit(memberId);
      no("KYC", lv && lv.status === "SUBMITTED" ? "Get verified: your visit is with GroFunder for review." : lv ? "Get verified: your agent's visit isn't finished yet." :
        "Get verified: " + (st.rows.filter(function (r) { return !r.ok; }).map(function (r) { return K.TYPES[r.type].label.toLowerCase(); }).join(", ") || "an agent visits you") + ".");
    }
    if (!circle) no("NO_CIRCLE", "Join or start a Growth Circle.");
    else {
      var mem = G.places.filter(function (p) { return p.circle === circle.id && p.status === "MEMBER"; }), ok = mem.filter(function (p) { return verified(p.member) && GF.get(p.member).status === "ACTIVE"; });
      if (circle.status !== "COMPLETE" || ok.length < mem.length) no("CIRCLE_NOT_READY", "Your circle needs at least " + G.RULES.MIN_SIZE + " members, all verified. Now " + mem.length + " member" + (mem.length === 1 ? "" : "s") + ", " + ok.length + " verified.");
      if (loans.some(function (l) { return l.circle === circle.id && (l.status === "IN_ARREARS" || l.status === "DEFAULTED"); })) no("CIRCLE_BEHIND", "No new loans in your circle until everyone is up to date.");
      if (liveIn(circle.id, opts.loan).length >= circle.borrowing_spaces) no("NO_SPACE", "Your circle's borrowing spaces are in use. One opens when a loan is repaid.");
    }
    var key = m.id_type + ":" + m.id_number, other = loans.find(function (l) { return l.borrower_key === key && isLive(l) && l.id !== opts.loan; });
    if (other) no("LIVE_LOAN", "You already have a loan that's " + LIVE_WORD[other.status] + ".");
    var lim = C.limit(memberId);
    if (!lim.eligible || !lim.limit_cents) no("NO_LIMIT", lim.reason === "PAUSED" ? "Borrowing is paused. Contact GroFunder." : "You can't borrow yet. See how to grow your limit.");
    var offers = productsFor(m.cooperative).map(function (o) { o.max_cents = Math.min(lim.limit_cents || 0, o.terms.max_amount_cents); return o; });
    if (!offers.length || offers.every(function (o) { return o.terms.min_amount_cents > (lim.limit_cents || 0); })) no("NO_PRODUCT", "No loan is offered to you right now.");
    if (opts.product && opts.amount) {
      var o = offers.find(function (x) { return x.product.id === opts.product; }), t = o && o.terms, ad = t && t.terms.allowed_durations;
      if (!o || opts.amount < t.min_amount_cents || opts.amount > o.max_cents || opts.duration < t.min_duration || opts.duration > t.max_duration || (ad && ad.length && ad.indexOf(opts.duration) === -1) ||
        (opts.purpose && !o.product.details.purposes.some(function (p) { return p.value === opts.purpose; })))
        no("TERMS", o ? "Between " + GF.fmt.money(t.min_amount_cents, { whole: true }) + " and " + GF.fmt.money(o.max_cents, { whole: true }) + ", for " + durationLine(t.min_duration, t.duration_unit).replace(/^\d+ /, t.min_duration + " to " + t.max_duration + " ").replace(/s?$/, "s") : "That product isn't offered to you.");
    }
    if (opts.sharing && opts.product && CS && !CS.allows(memberId, "PARTNER_SHARING", P.get(opts.product).partner).ok) no("SHARING_CONSENT", "Agree to share your details with the lender.");
    return { ok: !out.length, failed: out, limit_cents: lim.limit_cents || 0, offers: offers, circle: circle };
  }
  /** How many approvals a loan has, of how many. */
  function approvals(l) { var a = reviews.filter(function (r) { return r.loan === l.id && r.decision === "APPROVE"; }); return { done: a.length, of: l.reviews_required || P.get(l.product).reviews_required, by: a.map(function (r) { return r.reviewer; }) }; }
  /** Who may review: loans.review (Full and Owner), not whoever prepared it, not the borrower, not someone who already reviewed. */
  function canReview(l, userId) {
    if (l.status !== "REQUESTED") return "Only a requested loan is reviewed";
    if (l.prepared_by === userId) return "You prepared it: someone else reviews";
    var m = GF.get(l.member); if (m.user && m.user === userId) return "It's your own loan";
    if (reviews.some(function (r) { return r.loan === l.id && r.reviewer === userId; })) return "You've already approved it: a different person gives the next approval";
    return "";
  }
  /** When a draft expires (Q4: 7 days). */
  function expiresAt(l) { return new Date(Date.parse(l.created_at) + SETTINGS.DRAFT_DAYS * 864e5 + 3 * 36e5).toISOString().slice(0, 19) + "+03:00"; }
  /** can_release (23): what a live loan holds in a circle. */
  function canRelease(memberId) { var l = loans.find(function (x) { return x.member === memberId && isLive(x); }); return l ? { ok: false, loan: l } : { ok: true }; }
  /** The cooperative's view (21 Q4): standing only. */
  function standing(memberId) {
    var l = loans.find(function (x) { return x.member === memberId && isLive(x); });
    return !l ? "NONE" : l.status === "IN_ARREARS" ? "IN_ARREARS" : l.status === "DEFAULTED" ? "DEFAULTED" : "LIVE";
  }

  var L = {
    status: { DRAFT: ["warning", "Draft"], REQUESTED: ["info", "To review"], GF_REJECTED: ["error", "Rejected"], APPROVED: ["success", "Approved"], FORWARDED: ["info", "With the lender"],
      AMENDMENT_REQUIRED: ["warning", "Lender asks for changes"], PARTNER_REJECTED: ["error", "Lender rejected"], PARTNER_APPROVED: ["success", "Lender approved"], CANCELLED: ["neutral", "Cancelled"],
      ACTIVE: ["success", "Being repaid"], IN_ARREARS: ["error", "Behind"], DEFAULTED: ["error", "Defaulted"], CLOSED: ["neutral", "Closed"], WRITTEN_OFF: ["neutral", "Written off"] },
    origin: { MEMBER: "Asked for in the app", GROFUNDER: "Prepared by GroFunder" },
    end: { KYC: "KYC", CREDIT: "Credit", CIRCLE: "Growth Circle", DECLARATIONS: "Declarations", FRAUD: "Fraud", OTHER: "Other", MEMBER_CANCELLED: "Cancelled by the member", MEMBER_DECLINED: "Declined by the member",
      DRAFT_EXPIRED: "Not accepted in 7 days", BY_GROFUNDER: "Cancelled by GroFunder", PARTNER_TERMS: "Outside the lender's terms", BY_PARTNER: "Cancelled by the lender" },
    reject: ["KYC", "CREDIT", "CIRCLE", "DECLARATIONS", "FRAUD", "OTHER"],
    scope: { ALL: "Everyone", COOPERATIVE: "A cooperative", CLUSTER: "A cluster", CIRCLE: "A circle" },
    standing: { NONE: "No loan", LIVE: "Has a loan", IN_ARREARS: "Behind on a loan", DEFAULTED: "Loan in default" },
    via: { APP: "In the app", SMS_CODE: "By SMS code" },
    flag: { FORWARDING_FAILED: "Forwarding failed", QUOTE_DIFFERENCE: "Differs from the quote", DISBURSEMENT_FAILED: "Disbursement failed", DISBURSEMENT_ESTIMATED: "Disbursement estimated",
      SCHEDULE_CHANGED: "Schedule changed", POLL_DIFFERENCE: "The poll found a difference", STATUS_CONFLICT: "Status against the rules", SPLIT_UNKNOWN: "Payment split unknown", PAST_FLAG_THRESHOLD: "Past the flag threshold", EVENT_FAILED: "An event failed" },
    flagStatus: { OPEN: ["warning", "Open"], RESOLVED: ["success", "Resolved"], DISMISSED: ["neutral", "Dismissed"] },
    paymentStatus: { POSTED: ["success", "Posted"], REVERSED: ["neutral", "Reversed"] },
    chargeStatus: { OPEN: ["warning", "Owed"], PAID: ["success", "Paid"], WAIVED: ["neutral", "Waived"] },
    channel: { MEMBER_DIRECT: "Paid by the member", RECOVERY: "Recovered through the cooperative" }
  };

  GF.loans = {
    instalments: instalments, payments: payments, charges: charges, flags: flags, ledger: ledger,
    scheduleOf: function (id) { return instalments.filter(function (i) { return i.loan === id; }).sort(function (a, b) { return a.version - b.version || a.number - b.number; }); },
    paymentsOf: function (id) { return payments.filter(function (x) { return x.loan === id; }).sort(function (a, b) { return a.paid_on < b.paid_on ? 1 : -1; }); },
    chargesOf: function (id) { return charges.filter(function (x) { return x.loan === id; }); },
    flagsOf: function (id) { return flags.filter(function (x) { return x.loan === id; }); },
    /** Members of a circle behind on a loan (G72): name, days past due, amount overdue, while IN_ARREARS or DEFAULTED. */
    behindIn: function (circleId) { return loans.filter(function (l) { return l.circle === circleId && (l.status === "IN_ARREARS" || l.status === "DEFAULTED"); }).map(function (l) { return { loan: l, member: GF.get(l.member), days: l.days_past_due, overdue_cents: l.overdue_cents }; }); },
    ASSUME: ASSUME, SETTINGS: SETTINGS, LIVE: LIVE, L: L, loans: loans, reviews: reviews, history: history, pauses: pauses,
    get: function (id) { return byId[id]; }, isLive: isLive, quote: quote, durationLine: durationLine, productsFor: productsFor, eligibility: eligibility, verified: verified,
    approvals: approvals, canReview: canReview, expiresAt: expiresAt, liveIn: liveIn, canRelease: canRelease, standing: standing, pauseFor: pauseFor,
    reviewsOf: function (id) { return reviews.filter(function (r) { return r.loan === id; }).sort(function (a, b) { return a.reviewed_at < b.reviewed_at ? -1 : 1; }); },
    historyOf: function (id) { return history.filter(function (h) { return h.loan === id; }).sort(function (a, b) { return a.changed_at < b.changed_at ? 1 : -1; }); },
    ofMember: function (memberId) { return loans.filter(function (l) { return l.member === memberId; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); },
    /** The circle's wording (G72, final in 27): in-app only, to the circle. A notice when it starts and when it clears. */
    behindLine: function (name, days, overdue) { return name + " is " + days + " days late, with " + GF.fmt.money(overdue, { whole: true }).replace(/^Ksh/, "KES") + " overdue."; },
    behindLineSw: function (name, days, overdue) { return name + " amechelewa siku " + days + ", na " + GF.fmt.money(overdue, { whole: true }).replace(/^Ksh/, "KES") + " hazijalipwa."; },
    BEHIND: { second: { en: "No new loans in your circle until everyone is up to date.", sw: "Hakuna mkopo mpya katika kikundi chenu hadi kila mtu alipe kwa wakati." },
      notice: { en: "{name} in your Growth Circle is behind on a loan repayment.", sw: "{name} katika kikundi chako cha Growth Circle amechelewa kulipa mkopo." } }
  };
})(typeof window !== "undefined" ? window : globalThis);
