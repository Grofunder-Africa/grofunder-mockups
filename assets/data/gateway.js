/* gateway.js: the lending partner gateway's logs (phase 17, UI-120; design/24-lending-partners.md part 2,
 * design/27-partner-contract.md, both signed off 2026-11-09). Loaded after loans.js; adds GF.gateway.
 *
 *   events  PartnerEvent: every message in (CALLBACK), every difference the poll found (POLL), as received,
 *           with the signature result and what the handler did: APPLIED, IGNORED, HELD, FAILED, REJECTED
 *   calls   PartnerCall: every attempt at an operation we sent (SUBMIT, AMEND, CANCEL, READ_*, TEST…)
 *   reads   PartnerDataRead: every read of a member's data by a partner, served or refused, with the consent
 * Tegemeo (ACTIVE, drawn as after L4) talks to us over its API. Chemi Chemi Sacco works in the partner
 * portal instead (29), so its rows have source PORTAL, an actor (the staff member who acted) and no
 * connection or signature: one contract, two channels.
 * Only Tegemeo and Chemi Chemi talk to us. Every id, key and body here is invented; ID numbers are
 * masked to their last 3 digits in what we keep (24, redaction).
 */
(function (root) {
  "use strict";
  var GF = root.GF, Lo = GF.loans;
  var T = function (d, t) { return "2026-" + d + "T" + (t || "09:00") + ":00+03:00"; };

  /* The adapters' declared capabilities (24 part 2): what the rest of the system makes up for. */
  var ADAPTERS = {
    TEGEMEO: { signals_arrears: false, signals_closed: true, pushes_schedule: true, signs_timestamp: true, supports_amend: true, cancel_after_approval: false, sends_disbursement_details: false },
    MAVUNO: { signals_arrears: true, signals_closed: true, pushes_schedule: true, signs_timestamp: false, supports_amend: false, cancel_after_approval: true, sends_disbursement_details: true }
  };
  var CAP = { signals_arrears: "Sends overdue and back-up-to-date", signals_closed: "Sends a closed state", pushes_schedule: "Pushes the schedule", signs_timestamp: "Signs the timestamp",
    supports_amend: "Takes amendments", cancel_after_approval: "Can cancel after approval", sends_disbursement_details: "Sends disbursement details" };

  /* ------------------------------------------------------------ events */
  var events = [];
  /* e(id, loan ref, source, partner event, canonical, status, received, signature, o: result, error, attempts, duplicates, body) */
  function e(id, ref, source, pev, canon, status, at, o) {
    o = o || {};
    var sig = source === "CALLBACK" ? (status === "REJECTED" ? "INVALID" : "VALID") : "NOT_REQUIRED";
    events.push({ id: id, partner: "lp-tegemeo", connection: source === "CALLBACK" ? "pc-tegemeo-prod" : null, source: source, event_id: status === "REJECTED" ? "" : (o.event_id || "tmf-ev-" + id.slice(3) + "a91"),
      partner_event: pev, loan_ref: ref, occurred_at: o.occurred || at, sequence: o.seq || null, signature: sig, status: status, attempts: o.attempts || 1, received_at: at,
      processed_at: status === "RECEIVED" || status === "HELD" ? null : at.replace(/:00\+03:00$/, ":02+03:00"),
      raw_body: o.body || JSON.stringify({ event: pev, loanRef: ref, data: o.data || {} }),
      details: { headers: { "x-tmf-timestamp": at, "content-type": "application/json" }, canonical: status === "REJECTED" ? [] : canon.map(function (c) { return { event: c, data: o.data || {} }; }),
        result: o.result || "", error: o.error || "", duplicates: o.dup || 0 } });
  }
  e("pe-1", "TEGEMEO-000031", "CALLBACK", "loan.status", ["loan.closed"], "APPLIED", T("10-23", "18:30"), { seq: 31, result: "TEGEMEO-000031 closed: fully repaid", data: { status: "CLOSED", closedOn: "2026-10-23" } });
  e("pe-2", "TEGEMEO-000034", "CALLBACK", "payment.received", ["payment.posted"], "APPLIED", T("10-20", "18:20"), { seq: 40, result: "Payment of Ksh 2,043.75 posted; instalment 6 settled", data: { paymentId: "TMF-PAY-0346", amount: "2043.75" } });
  e("pe-3", "TEGEMEO-000034", "POLL", "repayments", ["payment.posted"], "APPLIED", T("10-27", "19:05"), { result: "A payment we hadn't heard of, posted with its split unknown (SPLIT_UNKNOWN)", data: { paymentId: "TMF-PAY-0347", principal: "0.00", interest: "0.00" } });
  e("pe-4", "TEGEMEO-000036", "CALLBACK", "payment.received", ["payment.posted"], "APPLIED", T("10-11", "18:20"), { seq: 22, result: "Payment of Ksh 1,407.50 posted; instalment 4 settled", data: { paymentId: "TMF-PAY-0364", amount: "1407.50" } });
  e("pe-5", "TEGEMEO-000036", "CALLBACK", "charge.levied", ["charge.levied"], "APPLIED", T("10-26", "02:10"), { seq: 23, result: "Late fee Ksh 200 on instalment 5", data: { chargeRef: "TMF-LF-6201", amount: "200.00", kind: "LATE_FEE" } });
  e("pe-6", "TEGEMEO-000038", "CALLBACK", "application.created", ["application.received"], "IGNORED", T("10-28", "09:42"), { seq: 1, result: "Already FORWARDED by the SUBMIT answer: nothing to change", data: { applicationId: "TMF-0038-LN" } });
  e("pe-7", "TEGEMEO-000038", "CALLBACK", "application.stage", ["application.stage"], "APPLIED", T("10-29", "08:15"), { seq: 2, result: "Stage shown: Pending: Credit officer", data: { stage: "Pending: Credit officer" } });
  e("pe-8", "TEGEMEO-000039", "CALLBACK", "application.returned", ["application.amendment_required"], "APPLIED", T("10-29", "11:20"), { seq: 2, result: "AMENDMENT_REQUIRED: staff to answer", data: { note: "The back of the ID photo is unreadable. Please send a clearer one." } });
  e("pe-9", "TEGEMEO-000036", "CALLBACK", "charge.updated", ["charge.status"], "FAILED", T("10-25", "16:40"), { seq: 24, attempts: 3, error: "Amount \"200.005\" can't be converted to cents without rounding (rule 4)", result: "Flagged EVENT_FAILED", data: { chargeRef: "TMF-LF-6202", amount: "200.005" } });
  e("pe-10", "TEGEMEO-000040", "CALLBACK", "application.approved", ["application.approved"], "APPLIED", T("10-29", "16:00"), { seq: 3, result: "PARTNER_APPROVED at Ksh 18,000 (quoted Ksh 20,000): QUOTE_DIFFERENCE; Lydia told", data: { approvedAmount: "18000.00", tenure: 12, tenureUnit: "WEEKS" } });
  e("pe-11", "", "CALLBACK", "loan.status", [], "REJECTED", T("10-27", "03:12"), { result: "Refused with 401: the signature didn't match. Never parsed", body: "{\"event\":\"loan.status\",\"loanRef\":\"TEGEMEO-000036\",\"data\":{\"status\":\"CLOSED\"}}" });
  e("pe-12", "TEGEMEO-000031", "CALLBACK", "loan.status", ["loan.current"], "IGNORED", T("10-28", "07:10"), { seq: 18, occurred: T("10-02", "09:00"), dup: 1, result: "Stale: older than the last status applied (sequence 31). Flagged STATUS_CONFLICT", data: { status: "ACTIVE" } });
  e("pe-13", "TEGEMEO-000041", "CALLBACK", "application.created", ["application.received"], "HELD", T("10-30", "10:05"), { seq: 1, attempts: 2, result: "No loan with this reference yet: held, retried for 24 hours", data: { applicationId: "TMF-0041-LN" } });

  /* Chemi Chemi's portal actions, as events (29): the same names, applied by the same handler. */
  function pe(id, ref, pev, canon, status, at, actor, o) {
    o = o || {};
    events.push({ id: id, partner: "lp-chemi", connection: null, source: "PORTAL", event_id: "portal-" + id.slice(3), partner_event: pev, loan_ref: ref,
      occurred_at: at, sequence: o.seq || null, signature: "NOT_REQUIRED", status: status, attempts: 1, received_at: at, processed_at: at.replace(/:00\+03:00$/, ":01+03:00"),
      actor: actor, raw_body: JSON.stringify({ action: o.action || pev, by: actor, data: o.data || {} }),
      details: { headers: {}, canonical: canon.map(function (c) { return { event: c, data: o.data || {} }; }), result: o.result || "", error: "", duplicates: 0 } });
  }
  pe("pe-20", "CHEMI-000061", "application.approved", ["application.approved"], "APPLIED", T("08-07", "14:00"), "u-rose", { seq: 2, result: "Approved as requested, Ksh 5,000", data: { amount: "5000.00" } });
  pe("pe-21", "CHEMI-000061", "loan.disbursed", ["loan.disbursed"], "APPLIED", T("08-10", "11:00"), "u-faith-c", { seq: 3, result: "ACTIVE; GroFunder generated the schedule from the terms", data: { amount: "5000.00", channel: "MPESA", reference: "RGH4K2P9QT" } });
  pe("pe-22", "CHEMI-000061", "payment.posted", ["payment.posted"], "APPLIED", T("09-12", "16:00"), "u-faith-c", { seq: 4, result: "Ksh 1,787.50 posted; GroFunder split it by the portal rule", data: { amount: "1787.50", receipt: "RHK9MM2L01" } });
  pe("pe-23", "CHEMI-000063", "application.rejected", ["application.rejected"], "APPLIED", T("09-17", "15:40"), "u-dennis", { seq: 2, result: "PARTNER_REJECTED", data: { reason: "EXISTING_FACILITY" } });
  pe("pe-24", "CHEMI-000062", "loan.closed", ["loan.closed"], "APPLIED", T("10-09", "12:00"), null, { seq: 6, result: "Closed by GroFunder's ledger: zero balance, no open charges (29)", data: {} });
  pe("pe-25", "CHEMI-000060", "application.received", ["application.received"], "APPLIED", T("10-29", "11:01"), null, { seq: 1, result: "Raised by GroFunder for a portal lender; in Chemi Chemi's queue", data: {} });

  /* ------------------------------------------------------------ calls */
  var calls = [];
  function c(id, op, ref, key, attempt, trigger, actor, at, ms, http, outcome, o) {
    o = o || {};
    calls.push({ id: id, partner: "lp-tegemeo", connection: "pc-tegemeo-prod", operation: op, loan_ref: ref, idempotency_key: key, attempt: attempt, trigger: trigger, actor: actor,
      started_at: at, finished_at: outcome ? at.replace(/:00\+03:00$/, ":0" + Math.min(9, Math.round(ms / 1000)) + "+03:00") : null, http_status: http, outcome: outcome, error_code: o.code || "",
      details: { request: o.req || {}, response: o.res || {}, partner_ids: o.ids || {}, duration_ms: ms } });
  }
  c("pk-1", "SUBMIT", "TEGEMEO-000038", "TEGEMEO-000038", 1, "FORWARDING", null, T("10-28", "09:40"), 1800, null, "UNREACHABLE", { res: { error: "Timed out after 15 s" } });
  c("pk-2", "SUBMIT", "TEGEMEO-000038", "TEGEMEO-000038", 2, "SYSTEM", null, T("10-28", "09:41"), 1400, 201, "OK", { req: { partnerLoanRef: "TEGEMEO-000038", product: "TEG-AVO-W", amount: "25000.00", tenure: 16, idNumber: "*****412" }, res: { applicationId: "TMF-0038-LN" }, ids: { loan_id: "TMF-0038-LN" } });
  c("pk-3", "SUBMIT", "TEGEMEO-000039", "TEGEMEO-000039", 1, "FORWARDING", null, T("10-28", "09:51"), 1200, 201, "OK", { req: { partnerLoanRef: "TEGEMEO-000039", product: "TEG-AVO-W", amount: "12000.00", tenure: 8, idNumber: "*****087" }, ids: { loan_id: "TMF-0039-LN" } });
  c("pk-4", "SUBMIT", "TEGEMEO-000040", "TEGEMEO-000040", 1, "FORWARDING", null, T("10-27", "10:01"), 1500, 409, "ALREADY_DONE", { code: "DUPLICATE_REF", res: { message: "Application already exists", applicationId: "TMF-0040-LN" }, ids: { loan_id: "TMF-0040-LN" } });
  c("pk-5", "READ_PAYMENTS", "TEGEMEO-000034", "poll-2026-10-27-0034", 1, "POLL", null, T("10-27", "19:04"), 900, 200, "OK", { res: { payments: 7, newest: "TMF-PAY-0347", split: "0.00" } });
  c("pk-6", "READ_LOAN", "TEGEMEO-000036", "poll-2026-10-30-0036", 1, "POLL", null, T("10-30", "02:00"), 700, 200, "OK", { res: { status: "ACTIVE", balance: "11260.00" } });
  c("pk-7", "READ_ACCOUNT", "", "account-2026-10-30", 1, "POLL", null, T("10-30", "02:05"), 1100, 200, "OK", { res: { gfShareHeld: "4120.00", asOf: "2026-10-29" } });
  c("pk-8", "TEST", "", "test-2026-10-29", 1, "STAFF", "u-amina", T("10-29", "15:00"), 600, 200, "OK", { res: { ok: true } });
  c("pk-9", "READ_LOAN", "TEGEMEO-000039", "staff-2026-10-30-0039", 1, "STAFF", "u-brian", T("10-30", "10:20"), 15000, null, "", {});

  /* ------------------------------------------------------------ data reads */
  var reads = [];
  function r(id, member, resource, outcome, at, o) {
    o = o || {};
    /* An API partner reads with its service-account key; a portal partner's staff read as themselves (29). */
    var rec = outcome === "SERVED" && GF.consents ? GF.consents.records.find(function (x) { return x.on_behalf_of === member && x.slot === "loan.sharing"; }) : null;
    reads.push({ id: id, partner: "lp-tegemeo", key_prefix: "tmf_sa_7Hq", reader: null, member: member, resource: resource, outcome: outcome, consent: rec ? rec.id : null, read_at: at,
      details: { params: o.params || {}, counts: o.counts || {}, loan_refs: o.loans || [] } });
  }
  r("pr-1", "m-gat-GA-0014", "PRODUCTION_RECORDS", "SERVED", T("10-28", "15:20"), { params: { from: "2026-07-28", to: "2026-10-28" }, counts: { weeks: 13 }, loans: ["TEGEMEO-000038"] });
  r("pr-2", "m-gat-GA-0014", "FARM_VERIFICATION", "SERVED", T("10-28", "15:21"), { counts: { items: 3 }, loans: ["TEGEMEO-000038"] });
  r("pr-3", "m-gat-GA-0014", "GROUP", "SERVED", T("10-28", "15:21"), { counts: { members: 7, behind: 1 }, loans: ["TEGEMEO-000038"] });
  r("pr-4", "m-gat-GA-0011", "PHOTOS", "SERVED", T("10-29", "11:05"), { counts: { photos: 2 }, loans: ["TEGEMEO-000039"] });
  r("pr-5", "m-gat-GA-0009", "LOAN_HISTORY", "NO_LOAN", T("10-29", "12:40"), { params: {}, counts: {} });
  r("pr-6", null, "PRODUCTION_RECORDS", "NOT_FOUND", T("10-29", "12:42"), { params: { customerRef: "m-gat-XX-9999" } });
  r("pr-7", "m-gat-GA-0013", "LOAN_HISTORY", "SERVED", T("10-28", "09:00"), { counts: { loans: 1 }, loans: ["TEGEMEO-000040"] });

  var L = {
    source: { CALLBACK: "Callback", POLL: "Poll", PORTAL: "Portal" },
    eventStatus: { RECEIVED: ["info", "Received"], APPLIED: ["success", "Applied"], IGNORED: ["neutral", "Ignored"], HELD: ["warning", "Held"], FAILED: ["error", "Failed"], REJECTED: ["error", "Rejected"] },
    signature: { VALID: "Valid", INVALID: "Invalid", NOT_REQUIRED: "Not needed" },
    outcome: { OK: ["success", "OK"], ALREADY_DONE: ["info", "Already done"], REFUSED: ["error", "Refused"], UNREACHABLE: ["warning", "Unreachable"], ERROR: ["error", "Error"], "": ["info", "In flight"] },
    trigger: { FORWARDING: "Forwarding", STAFF: "Staff", POLL: "Poll", SYSTEM: "Retry" },
    resource: { PRODUCTION_RECORDS: "Production records", FARM_VERIFICATION: "Farm checks", GROUP: "Growth Circle", LOAN_HISTORY: "Loan history", PHOTOS: "Photos" },
    readOutcome: { SERVED: ["success", "Served"], NO_CONSENT: ["error", "No consent"], NO_LOAN: ["warning", "No loan"], NOT_FOUND: ["neutral", "Not found"], BAD_REQUEST: ["neutral", "Bad request"] },
    CAP: CAP
  };
  /* Chemi Chemi's staff open members' details in the portal; each opening is one logged read, by a reader. */
  [["pr-10", "m-maw-MCG-0004", "PRODUCTION_RECORDS", "SERVED", T("10-29", "11:30"), "u-dennis", { counts: { weeks: 13 }, loans: ["CHEMI-000060"] }],
   ["pr-11", "m-maw-MCG-0004", "FARM_VERIFICATION", "SERVED", T("10-29", "11:31"), "u-dennis", { counts: { items: 2 }, loans: ["CHEMI-000060"] }],
   ["pr-12", "m-maw-MCG-0001", "LOAN_HISTORY", "SERVED", T("10-15", "09:10"), "u-rose", { counts: { loans: 1 }, loans: ["CHEMI-000061"] }],
   ["pr-13", "m-maw-MCG-0012", "PRODUCTION_RECORDS", "NO_CONSENT", T("10-20", "14:00"), "u-dennis", {}]].forEach(function (r) {
    var rec = GF.consents && GF.consents.records.find(function (x) { return x.on_behalf_of === r[1] && x.slot === "loan.sharing"; });
    var d = r[6] || {};
    reads.push({ id: r[0], partner: "lp-chemi", key_prefix: "", reader: r[5], member: r[1], resource: r[2], outcome: r[3], consent: r[3] === "SERVED" && rec ? rec.id : null, read_at: r[4],
      details: { params: d.params || {}, counts: d.counts || {}, loan_refs: d.loans || [] } });
  });

  var byId = {}; events.concat(calls, reads).forEach(function (x) { byId[x.id] = x; });
  GF.gateway = {
    ADAPTERS: ADAPTERS, L: L, events: events, calls: calls, reads: reads,
    get: function (id) { return byId[id]; },
    eventsOf: function (ref) { return events.filter(function (x) { return x.loan_ref === ref; }).sort(function (a, b) { return a.received_at < b.received_at ? 1 : -1; }); },
    callsOf: function (ref) { return calls.filter(function (x) { return x.loan_ref === ref; }).sort(function (a, b) { return a.started_at < b.started_at ? 1 : -1; }); },
    readsOf: function (memberId) { return reads.filter(function (x) { return x.member === memberId; }); },
    /** Partner silence (27): a partner with live forwarded loans that has sent nothing for 3 days. */
    /** partners/{id}/health/ (design, 2026-11-10): a partner with live loans and no event for 3 days. */
    health: function (partnerId) {
      var live = Lo.loans.some(function (l) { return l.partner === partnerId && Lo.isLive(l) && l.forwarded_at; });
      var last = events.filter(function (x) { return x.partner === partnerId; }).map(function (x) { return x.received_at; }).sort().pop();
      var days = last ? Math.floor((Date.parse(GF.NOW) - Date.parse(last)) / 864e5) : null;
      return { last_event_at: last || null, silent_since: live && days !== null && days >= 3 ? last : null, silent_days: live && days !== null && days >= 3 ? days : null };
    },
    portalStaff: function (partnerId) { return (GF.partners.get(partnerId).profile.staff || []); },
    silent: function (partnerId) { var last = events.filter(function (x) { return x.partner === partnerId; }).map(function (x) { return x.received_at; }).sort().pop(); return last ? (Date.parse(GF.NOW) - Date.parse(last)) / 864e5 > 3 : false; }
  };
})(typeof window !== "undefined" ? window : globalThis);
