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
    verified: G.places.filter(function (p) { return p.circle === "ci-kij-02" && p.status === "MEMBER"; }).map(function (p) { return p.member; })
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
    if (o.accepted_at && CS) [["cd-loan-sw-1", "loan.agreement"], ["cd-share-mavuno-sw-1", "loan.sharing"]].forEach(function (x, i) {
      var v = CS.version(x[0]);
      CS.add({ id: "cr-" + o.id + "-" + i, user: m.user || null, on_behalf_of: m.id, document: v.document, version: v.id, version_hash: v.content_hash, slot: x[1], context: "loan:" + o.ref, decision: "GRANTED",
        captured_by: "STAFF", recorded_by: o.accepted_by, occurred_at: o.accepted_at, recorded_at: o.accepted_at, metadata: { channel: "SMS_CODE", language: "sw", sms: { phone: m.phone, challenge_id: "otp-" + o.id } } });
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
  var byId = {}; loans.concat(pauses).forEach(function (x) { byId[x.id] = x; });
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
    via: { APP: "In the app", SMS_CODE: "By SMS code" }
  };

  GF.loans = {
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
