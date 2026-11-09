/* credit.js: credit scores, rule sets and limit overrides (phase 14, UI-90; design/25-credit.md,
 * models and services signed off 2026-11-08). Loaded after canon.js, kyc.js and groups.js; adds GF.credit.
 *
 * Scores are worked out here from the shared data, as note 25's services say, never typed:
 *   delivery  weeks with a RECORDED delivery in the last 26 (full at 20), and produce value paid on
 *             PAID payouts in the last 12 months (full at Ksh 50,000); 60% consistency, 40% volume
 *   circle    none 0.3, forming 0.5, complete 0.8, complete with every member verified 1.0 (S2);
 *             members behind (loans, 26) not registered yet, so nothing is taken off
 *   tenure    whole months since joined_on, full at 12
 *   repayment loans (26) isn't built: the placeholder answers 0.5, "no history"
 *   declared  recorded only (weight 0)
 *   score     300 + 550 × Σ(weight × sub-score) ÷ 100, rounded half up; ladder by score alone
 *
 * Drawn as if lending were switched on (staging's `trial`). Until consents (22) is built no real
 * member is scored, and production answers LENDING_OFF. Nightly scores cover ACTIVE members of
 * cooperatives that take new work and have ACTIVE coverage of an ACTIVE product (S4): Kijani,
 * Mawingu and Gatundu here (Ruiru is on hold).
 */
(function (root) {
  "use strict";
  var GF = root.GF, G = GF.groups, K = GF.kyc, P = GF.partners;
  var T = function (d, t) { return "2026-" + d + "T" + (t || "09:00") + ":00+03:00"; };

  /* ----------------------------------------------------------- rule sets */
  var DEFAULT_FACTORS = [
    { key: "repayment", weight: 40, params: { no_history: 0.5 } },
    { key: "delivery", weight: 30, params: { window_weeks: 26, full_weeks: 20, full_value_cents: 5000000, consistency_share_bps: 6000 } },
    { key: "circle", weight: 20, params: { none: 0.3, forming: 0.5, complete: 0.8, complete_verified: 1.0, behind_penalty: 0.2 } },
    { key: "tenure", weight: 10, params: { full_months: 12 } },
    { key: "declared", weight: 0, params: {} }
  ];
  var LADDER = [{ step: 1, limit_cents: 500000, min_score: 500 }, { step: 2, limit_cents: 1000000, min_score: 600 }, { step: 3, limit_cents: 1500000, min_score: 680 }, { step: 4, limit_cents: 2000000, min_score: 750 }];
  var copy = function (o) { return JSON.parse(JSON.stringify(o)); };
  var withParam = function (factors, key, k, v) { factors.find(function (f) { return f.key === key; }).params[k] = v; return factors; };
  var weights = function (factors, w) { factors.forEach(function (f) { if (w[f.key] != null) f.weight = w[f.key]; }); return factors; };

  var ruleSets = [
    { id: "rs-1", version: 1, status: "PUBLISHED", effective_from: T("10-01", "00:00"), rules: { factors: copy(DEFAULT_FACTORS), ladder: copy(LADDER), refresh_hours: 24 },
      notes: "The first rules: the owner's ladder (Ksh 5,000 at 500 to Ksh 20,000 at 750), weights 40/30/20/10, and the circle values agreed in S2.", published_at: T("09-28", "15:00"), published_by: "u-amina", created_by: "u-peter", created_at: T("09-26", "10:00") },
    { id: "rs-2", version: 2, status: "WITHDRAWN", effective_from: T("11-15", "00:00"),
      rules: { factors: copy(DEFAULT_FACTORS), ladder: copy(LADDER).map(function (s) { if (s.step === 3) s.min_score = 860; return s; }), refresh_hours: 24 },
      notes: "A step for Ksh 15,000 at a higher score.\n\nWithdrawn 28 Oct by Amina Hassan: \"Step 3's minimum typed as 860, above the top score of 850. Corrected in version 3.\"", published_at: T("10-27", "16:00"), published_by: "u-peter", created_by: "u-peter", created_at: T("10-27", "11:00"), withdrawn: { reason: "Step 3's minimum typed as 860, above the top score of 850. Corrected in version 3.", by: "u-amina", at: T("10-28", "09:30") } },
    { id: "rs-3", version: 3, status: "PUBLISHED", effective_from: T("12-01", "00:00"),
      rules: { factors: withParam(copy(DEFAULT_FACTORS), "delivery", "full_value_cents", 6000000), ladder: copy(LADDER).concat([{ step: 5, limit_cents: 3000000, min_score: 800 }]), refresh_hours: 24 },
      notes: "Adds a fifth step, Ksh 30,000 at 800, for the strongest members. A full delivery volume is now Ksh 60,000 a year, as milk prices rose.", published_at: T("10-28", "11:00"), published_by: "u-amina", created_by: "u-peter", created_at: T("10-28", "10:00") },
    { id: "rs-4", version: 4, status: "DRAFT", effective_from: null,
      rules: { factors: withParam(weights(copy(DEFAULT_FACTORS), { repayment: 35, circle: 25 }), "circle", "complete", 0.85), ladder: copy(LADDER).concat([{ step: 5, limit_cents: 3000000, min_score: 800 }]), refresh_hours: 12 },
      notes: "Trying more weight on the circle, and a fresher score in the app.", published_at: null, published_by: null, created_by: "u-peter", created_at: T("10-29", "15:30") }
  ];
  var byId = {};
  ruleSets.forEach(function (r) { byId[r.id] = r; });
  function inForce(at) {
    at = at || GF.NOW;
    return ruleSets.filter(function (r) { return r.status === "PUBLISHED" && r.effective_from <= at; }).sort(function (a, b) { return a.effective_from < b.effective_from ? 1 : -1; })[0] || null;
  }
  function state(r) {
    if (r.status === "DRAFT") return "DRAFT";
    if (r.status === "WITHDRAWN") return "WITHDRAWN";
    if (r.effective_from > GF.NOW) return "SCHEDULED";
    return inForce().id === r.id ? "IN_FORCE" : "PAST";
  }

  /* ------------------------------------------------------------ factors */
  var DAY = 86400000;
  var delivByMember = {}, paidByMember = {};
  GF.deliveries.forEach(function (d) { if (d.status === "RECORDED") (delivByMember[d.member] = delivByMember[d.member] || []).push(d.delivered_on); });
  var paidOut = {};
  GF.payouts.forEach(function (p) { if (p.status === "PAID") paidOut[p.id] = p; });
  GF.deliveryPayments.forEach(function (dp) { var p = paidOut[dp.payout]; if (p) (paidByMember[p.member] = paidByMember[p.member] || []).push([p.paid_at, dp.amount_cents]); });
  var isoWeek = function (day) { var d = new Date(day + "T00:00:00Z"); var t = new Date(d); t.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); return t.toISOString().slice(0, 10); };
  var r4 = function (x) { return Math.round(x * 10000) / 10000; };

  /** As each factor's compute(member, at, params) → {sub, inputs, guidance}. */
  var FACTORS = {
    repayment: function (m, at, p) { return { sub: p.no_history, inputs: { instalments_due: 0, paid_on_time: 0, paid_late: 0, missed: 0, loans_closed: 0, loans_defaulted: 0 }, guidance: "repayment.no_history" }; },
    delivery: function (m, at, p) {
      var from = new Date(new Date(at) - p.window_weeks * 7 * DAY).toISOString().slice(0, 10), to = at.slice(0, 10), weeks = {};
      (delivByMember[m.id] || []).forEach(function (d) { if (d > from && d <= to) weeks[isoWeek(d)] = 1; });
      var yearAgo = new Date(new Date(at) - 365 * DAY).toISOString(), paid = 0;
      (paidByMember[m.id] || []).forEach(function (x) { if (x[0] > yearAgo && x[0] <= at) paid += x[1]; });
      var n = Object.keys(weeks).length, c = p.consistency_share_bps / 10000;
      var cons = Math.min(n / p.full_weeks, 1), vol = Math.min(paid / p.full_value_cents, 1);
      return { sub: r4(c * cons + (1 - c) * vol), inputs: { weeks_with_delivery: n, window_weeks: p.window_weeks, paid_value_cents_12m: paid },
        guidance: cons >= 1 && vol >= 1 ? "delivery.strong" : cons <= vol ? "delivery.weeks" : "delivery.value" };
    },
    circle: function (m, at, p) {
      var x = G && G.places.find(function (y) { return y.member === m.id && (y.status === "MEMBER" || y.status === "JOINING") && (y.joined_at || y.invited_at) <= at; });
      var c = x && G.get(x.circle), st = !c || x.status !== "MEMBER" ? "none" : c.completed_at && c.completed_at <= at ? "complete" : "forming";
      var s = c ? G.standing(c.id) : null, verified = s ? s.rows.filter(function (r) { return r.verified; }).length : 0;
      if (st === "complete" && s && s.all_verified) st = "complete_verified";
      return { sub: r4(p[st]), inputs: { circle_id: c ? c.id : null, circle_status: c ? (st === "none" ? "JOINING" : c.status) : null, members: s ? s.count : 0, members_verified: verified, members_behind: null },
        guidance: "circle." + st };
    },
    tenure: function (m, at, p) {
      var j = m.joined_on, a = at.slice(0, 10), months = (+a.slice(0, 4) - +j.slice(0, 4)) * 12 + (+a.slice(5, 7) - +j.slice(5, 7)) - (a.slice(8, 10) < j.slice(8, 10) ? 1 : 0);
      months = Math.max(0, months);
      return { sub: r4(Math.min(months / p.full_months, 1)), inputs: { joined_on: j, months: months }, guidance: months >= p.full_months ? "tenure.full" : "tenure.growing" };
    },
    declared: function (m) {
      var inc = K ? K.current(m.id, "INCOME") : [], ob = K ? K.current(m.id, "OBLIGATION") : [];
      var LOW = { BELOW_5K: 0, "5K_TO_10K": 500000, "10K_TO_20K": 1000100, ABOVE_20K: 2000000 };
      var income = inc.reduce(function (s, i) { return s + (LOW[i.data.monthly_band] || 0); }, 0), obl = ob.reduce(function (s, i) { return s + (i.data.monthly_cents || 0); }, 0);
      return { sub: !income ? 0 : obl < income / 2 ? 1 : obl < income ? 0.5 : 0, inputs: { income_band_total: income, obligations_monthly_cents: obl }, guidance: null };
    }
  };
  /* Guidance: one plain sentence per factor (G90: the note names the idea, not the sentences). */
  var GUIDANCE = {
    "repayment.no_history": "Repay your first loan on time to grow your limit.",
    "delivery.weeks": "Deliver every week to grow your limit.",
    "delivery.value": "Deliver more to the cooperative to grow your limit.",
    "delivery.strong": "Your deliveries are strong. Keep delivering every week.",
    "circle.none": "Join or start a Growth Circle to grow your limit.",
    "circle.forming": "Your limit grows once your Growth Circle has 5 members.",
    "circle.complete": "Your limit grows when every member of your circle is verified.",
    "circle.complete_verified": "Your Growth Circle is complete and verified.",
    "tenure.growing": "Each month with the cooperative adds to your limit.",
    "tenure.full": "Your time with the cooperative counts in full."
  };

  /** score(member, trigger, at): one CreditScore, as the service works it out. */
  function compute(m, at, trigger, rs) {
    rs = rs || inForce(at);
    if (!rs) return null;
    var factors = {}, inputs = {}, total = 0, guide = [];
    rs.rules.factors.forEach(function (f) {
      var r = FACTORS[f.key](m, at, f.params);
      var contribution = Math.round(550 * f.weight * r.sub / 100 * 100) / 100;
      factors[f.key] = { sub_score: r.sub, weight: f.weight, contribution: contribution };
      inputs[f.key] = r.inputs; total += f.weight * r.sub;
      if (f.weight > 0 && r.guidance) guide.push({ key: f.key, sub: r.sub, text: GUIDANCE[r.guidance] });
    });
    var score = Math.floor(300 + 550 * total / 100 + 0.5);
    var step = rs.rules.ladder.filter(function (s) { return score >= s.min_score; }).pop();
    guide.sort(function (a, b) { return a.sub - b.sub; });
    return { id: "cs-" + m.id + "-" + at.slice(0, 13), member: m.id, rule_set: rs.id, score: score, ladder_step: step ? step.step : 0, limit_cents: step ? step.limit_cents : 0,
      trigger: trigger, factors: factors, inputs: inputs, computed_at: at, guidance: guide };
  }

  /* Who is scored nightly (S4). */
  var covered = {};
  if (P) P.coverage.forEach(function (c) { if (c.status === "ACTIVE" && P.get(c.product).status === "ACTIVE") covered[c.cooperative] = 1; });
  var takesWork = function (coop) { var s = GF.get(coop).status; return s === "ACTIVE" || s === "ONBOARDING"; };
  var scored = GF.members.filter(function (m) { return m.status === "ACTIVE" && covered[m.cooperative] && takesWork(m.cooperative); });
  /* Members who opened "What can I borrow" this morning (MEMBER_VIEW); everyone else from last night. */
  var VIEWED = { "m-kij-0142": T("10-30", "07:45"), "m-maw-0907": T("10-30", "07:46"), "m-kij-0088": T("10-30", "09:50") };
  var latestCache = {};
  function latest(memberId) {
    if (latestCache[memberId] !== undefined) return latestCache[memberId];
    var m = GF.get(memberId), s = null;
    if (m && m.status === "ACTIVE" && (covered[m.cooperative] && takesWork(m.cooperative) || VIEWED[m.id])) s = compute(m, VIEWED[m.id] || T("10-30", "02:00"), VIEWED[m.id] ? "MEMBER_VIEW" : "NIGHTLY");
    else if (m && m.status === "SUSPENDED" && covered[m.cooperative]) s = compute(m, T("09-17", "02:00"), "NIGHTLY");
    return (latestCache[memberId] = s);
  }
  /** The member's score history, newest first: the nights and views on record. */
  function history(memberId) {
    var m = GF.get(memberId), out = [];
    if (!m) return out;
    var times = [[T("10-02", "02:00"), "NIGHTLY"], [T("10-09", "02:00"), "NIGHTLY"], [T("10-16", "09:12"), "MEMBER_VIEW"], [T("10-23", "02:00"), "NIGHTLY"]];
    if (memberId === "m-kij-0031") times.push([T("10-20", "10:05"), "STAFF"]);
    times.forEach(function (t) { if (m.status === "ACTIVE" || t[0] < T("09-18", "00:00")) { var s = compute(m, t[0], t[1]); if (s) out.push(s); } });
    var l = latest(memberId); if (l) out.push(l);
    return out.sort(function (a, b) { return a.computed_at < b.computed_at ? 1 : -1; });
  }

  /* ----------------------------------------------------------- overrides */
  var overrides = [
    { id: "ov-1", member: "m-kij-0164", kind: "BLOCK", limit_cents: null, status: "ACTIVE", reason: "Her KYC visit failed: the farm she showed is her neighbour's. Blocked while we look into it.", starts_at: T("10-17", "11:00"), expires_at: T("12-31", "23:59"), created_by: "u-brian", created_at: T("10-17", "11:00"), ended_at: null, ended_by: null },
    { id: "ov-2", member: "m-kij-0031", kind: "SET", limit_cents: 2500000, status: "ACTIVE", reason: "Kijani's manager vouches for him: twelve years of deliveries, and he chairs the Kiamwangi cluster. A pilot of a larger limit, above the ladder.", starts_at: T("10-20", "10:10"), expires_at: "2027-01-31T23:59:00+03:00", created_by: "u-peter", created_at: T("10-20", "10:10"), ended_at: null, ended_by: null },
    { id: "ov-3", member: "m-maw-MCG-0005", kind: "SET", limit_cents: 300000, status: "ACTIVE", reason: "He asked us to keep his limit low while he clears a SACCO loan.", starts_at: T("10-25", "14:30"), expires_at: null, created_by: "u-brian", created_at: T("10-25", "14:30"), ended_at: null, ended_by: null },
    { id: "ov-4", member: "m-kij-0031", kind: "SET", limit_cents: 1500000, status: "ENDED", reason: "Raised while the cooperative confirmed his deliveries.", starts_at: T("10-06", "09:00"), expires_at: T("11-06", "09:00"), created_by: "u-peter", created_at: T("10-06", "09:00"), ended_at: T("10-20", "10:10"), ended_by: null },
    { id: "ov-5", member: "m-kij-0088", kind: "BLOCK", limit_cents: null, status: "ENDED", reason: "Two records seemed to share his phone; checked, and they don't.", starts_at: T("09-20", "16:00"), expires_at: T("10-20", "16:00"), created_by: "u-brian", created_at: T("09-20", "16:00"), ended_at: T("10-21", "02:00"), ended_by: null }
  ];
  overrides.forEach(function (o) { byId[o.id] = o; });
  function activeOverride(memberId, at) {
    at = at || GF.NOW;
    return overrides.find(function (o) { return o.member === memberId && o.status === "ACTIVE" && o.starts_at <= at && (!o.expires_at || o.expires_at > at); }) || null;
  }
  /** limit(member): eligibility, the latest score, the override and the limit that counts. */
  function limit(memberId) {
    var m = GF.get(memberId), coop = m && GF.get(m.cooperative);
    var no = function (reason) { return { eligible: false, reason: reason, score: latest(memberId), override: activeOverride(memberId), limit_cents: 0 }; };
    if (!m || m.status === "EXITED" || m.status === "PENDING") return no("NOT_ACTIVE");
    if (m.status === "SUSPENDED") return no("SUSPENDED");
    if (coop.status === "ENDED") return no("COOPERATIVE_ENDED");
    if (!inForce()) return no("NO_RULES");
    var s = latest(memberId), o = activeOverride(memberId);
    if (o && o.kind === "BLOCK") return { eligible: false, reason: "PAUSED", score: s, override: o, limit_cents: 0 };
    return { eligible: true, reason: "", score: s, override: o, limit_cents: o ? o.limit_cents : s ? s.limit_cents : 0 };
  }
  function stage(memberId) {
    var s = latest(memberId), rs = s ? byId[s.rule_set] : inForce(), ladder = rs.rules.ladder, step = s ? s.ladder_step : 0;
    var next = ladder.find(function (x) { return x.step === step + 1; });
    return { step: step, steps: ladder.length, next_limit_cents: next ? next.limit_cents : null };
  }

  var L = {
    rs: { IN_FORCE: ["success", "In force"], SCHEDULED: ["info", "Scheduled"], PAST: ["neutral", "Past"], WITHDRAWN: ["neutral", "Withdrawn"], DRAFT: ["warning", "Draft"] },
    trigger: { REQUEST: "Loan request", MEMBER_VIEW: "Member opened the app", LOAN_EVENT: "Loan event", NIGHTLY: "Nightly", STAFF: "Recalculated by staff" },
    factor: { repayment: "Repayment", delivery: "Deliveries", circle: "Growth Circle", tenure: "Time in the cooperative", declared: "Declared income" },
    reason: { LENDING_OFF: "Lending is switched off", NOT_ACTIVE: "Not an active member", SUSPENDED: "Suspended by the cooperative", CONSENT: "No consent to lending", NO_RULES: "No scoring rules in force",
      COOPERATIVE_ENDED: "The cooperative has ended", PAUSED: "Borrowing paused (blocked)" },
    kind: { SET: "Limit set", BLOCK: "Blocked" }
  };

  GF.credit = {
    L: L, ruleSets: ruleSets, overrides: overrides, scored: scored, GUIDANCE: GUIDANCE, FACTORS: FACTORS, DEFAULT_FACTORS: DEFAULT_FACTORS,
    get: function (id) { return byId[id]; }, inForce: inForce, state: state, compute: compute, latest: latest, history: history, activeOverride: activeOverride, limit: limit, stage: stage,
    overridesOf: function (memberId) { return overrides.filter(function (o) { return o.member === memberId; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }
  };
})(typeof window !== "undefined" ? window : globalThis);
