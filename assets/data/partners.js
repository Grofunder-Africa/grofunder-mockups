/* partners.js: lending partners' fictional data (phase 13, UI-80; design/24-lending-partners.md
 * part 1, models and services signed off 2026-11-08). Loaded after canon.js; adds
 * GF.partners. Every partner, URL, key id and reference here is invented: no real
 * lender is named in the public prototype.
 *
 * The console is drawn as the production deployment: GROFUNDER['LENDING']['ENVIRONMENTS']
 * is PRODUCTION, so partners and connections here are PRODUCTION only (S2). Staging's
 * console looks the same with SANDBOX.
 *
 * The story, on "now" (Fri 30 Oct 2026, 10:30):
 *   Mavuno Capital (API)     ONBOARDING: connection set but not verified (no adapter until L4, S1);
 *                            Dairy input loan v1 in force, v2 withdrawn, v3 scheduled for 1 Dec, v4 a draft
 *   Shamba Finance (PORTAL)  ONBOARDING: can't be activated until the partner portal exists (L6)
 *   Tegemeo Microfinance     ACTIVE, drawn as after L4 (adapters exist), so its remittances,
 *                            pause and history can be shown; today no partner can be active
 */
(function (root) {
  "use strict";
  var GF = root.GF;
  var CONFIG = { environments: ["PRODUCTION"], deployment: "production", rotate_days: 365 };

  var L = {
    status: { ONBOARDING: ["info", "Onboarding"], ACTIVE: ["success", "Active"], PAUSED: ["warning", "Paused"], ENDED: ["neutral", "Ended"] },
    mode: { API: "API", PORTAL: "Partner portal" },
    env: { SANDBOX: "Sandbox", PRODUCTION: "Production" },
    product: { ACTIVE: ["success", "Active"], PAUSED: ["warning", "Paused"], RETIRED: ["neutral", "Retired"] },
    terms: { IN_FORCE: ["success", "In force"], SCHEDULED: ["info", "Scheduled"], PAST: ["neutral", "Past"], WITHDRAWN: ["neutral", "Withdrawn"], DRAFT: ["warning", "Draft"] },
    unit: { DAILY: ["day", "days"], WEEKLY: ["week", "weeks"], BIWEEKLY: ["fortnight", "fortnights"], MONTHLY: ["month", "months"] },
    freq: { DAILY: "Daily", WEEKLY: "Weekly", BIWEEKLY: "Every two weeks", MONTHLY: "Monthly", END_OF_TERM: "At the end" },
    kind: { INTEREST: "Interest", PROCESSING_FEE: "Processing fee", INSURANCE: "Insurance", SERVICE_FEE: "Service fee", LATE_PENALTY: "Late penalty", OTHER: "Other" },
    basis: { FLAT_AMOUNT: "Flat amount", PERCENT_OF_PRINCIPAL: "% of the amount borrowed", PERCENT_OF_BALANCE: "% of the balance", PERCENT_OF_OVERDUE: "% of what is overdue" },
    chargeFreq: { ONE_OFF: "Once", PER_INSTALMENT: "Each instalment", PER_WEEK: "A week", PER_MONTH: "A month", PER_YEAR: "A year", PER_MISSED_INSTALMENT: "Each missed instalment" },
    collected: { DEDUCTED_AT_DISBURSEMENT: "Taken off what the member receives", ADDED_TO_LOAN: "Added to what they owe", WITH_INSTALMENTS: "Paid with each instalment" },
    sms: { ACCOUNT_CREATED: "Account created", REQUEST_RECEIVED: "Request received", APPROVED: "Approved", DISBURSED: "Disbursed", PAYMENT_RECEIVED: "Payment received", OVERDUE: "Overdue" },
    source: { STAFF: "Recorded by staff", PARTNER_EVENT: "From the partner's event" }
  };

  var T = function (d, t) { return "2026-" + d + "T" + (t || "09:00") + ":00+03:00"; };
  var partners = [
    { id: "lp-mavuno", name: "Mavuno Capital", code: "MAVUNO", mode: "API", status: "ONBOARDING", environment: "PRODUCTION", created_at: T("10-12", "11:00"), updated_at: T("10-29", "16:20"),
      profile: { legal_name: "Mavuno Capital Limited", registration_no: "PVT-7XK2M9QA", licence: "Digital credit provider licence DCP/2026/118",
        contact: { name: "Akinyi Odera", role: "Partnerships lead", phone: "+254711808101", email: "akinyi@mavuno.example" },
        member_display: { name: "Mavuno Capital", phone: "+254709600600", paybill: "880055" },
        sends_sms: ["APPROVED", "DISBURSED", "PAYMENT_RECEIVED"], remittance: { cycle: "MONTHLY", notes: "By the 10th, for the month before, with a breakdown by charge." } } },
    { id: "lp-shamba", name: "Shamba Finance", code: "SHAMBA", mode: "PORTAL", status: "ONBOARDING", environment: "PRODUCTION", created_at: T("10-26", "14:00"), updated_at: T("10-26", "14:00"),
      profile: { legal_name: "Shamba Finance Sacco Society Ltd", registration_no: "CS/9921", licence: "SASRA deposit-taking licence 2026/044",
        contact: { name: "Joseph Kiprono", role: "Credit manager", phone: "+254722410977", email: "jkiprono@shamba.example" },
        member_display: { name: "Shamba Finance", phone: "+254733100200", paybill: "557712" },
        sends_sms: [], remittance: { cycle: "QUARTERLY", notes: "" } } },
    { id: "lp-tegemeo", name: "Tegemeo Microfinance", code: "TEGEMEO", mode: "API", status: "ACTIVE", environment: "PRODUCTION", created_at: T("06-02", "10:00"), updated_at: T("09-10", "09:30"),
      profile: { legal_name: "Tegemeo Microfinance Bank Ltd", registration_no: "PVT-4LB8Z1RT", licence: "CBK microfinance bank licence MFB/2025/017",
        contact: { name: "Halima Noor", role: "Head of agri lending", phone: "+254720555310", email: "halima.noor@tegemeo.example" },
        member_display: { name: "Tegemeo Microfinance", phone: "+254709300300", paybill: "411422" },
        sends_sms: ["ACCOUNT_CREATED", "DISBURSED", "PAYMENT_RECEIVED", "OVERDUE"], remittance: { cycle: "MONTHLY", notes: "Bank transfer by the 12th." } } }
  ];

  var history = [
    ["lp-mavuno", "", "ONBOARDING", T("10-12", "11:00"), "u-peter", ""],
    ["lp-shamba", "", "ONBOARDING", T("10-26", "14:00"), "u-peter", ""],
    ["lp-tegemeo", "", "ONBOARDING", T("06-02", "10:00"), "u-amina", ""],
    ["lp-tegemeo", "ONBOARDING", "ACTIVE", T("07-01", "08:30"), "u-amina", ""],
    ["lp-tegemeo", "ACTIVE", "PAUSED", T("09-02", "15:10"), "u-peter", "July's remittance is three weeks late; paused until it arrives."],
    ["lp-tegemeo", "PAUSED", "ACTIVE", T("09-10", "09:30"), "u-peter", ""]
  ].map(function (h) { return { partner: h[0], from_status: h[1], to_status: h[2], changed_at: h[3], changed_by: h[4], reason: h[5] }; });

  /* Connections: only what the console may see. Secrets are never returned, only whether each is set (S&E). */
  var connections = [
    { id: "pc-mavuno-prod", partner: "lp-mavuno", environment: "PRODUCTION", base_url: "https://api.mavuno.example/v1", api_key_id: "gf_live_7Q2X", status: "ACTIVE",
      secrets: { api_secret: true, inbound_secret: true, outbound_secret: false }, secrets_set_at: T("10-28", "17:05"), verified_at: null, rotated_at: null,
      details: { timeout_s: 20, rate_limit_per_min: 120, notes: "One secret both ways, as Mavuno signs today." }, created_at: T("10-28", "17:05") },
    { id: "pc-tegemeo-prod", partner: "lp-tegemeo", environment: "PRODUCTION", base_url: "https://partners.tegemeo.example/api", api_key_id: "grofunder-01", status: "ACTIVE",
      secrets: { api_secret: true, inbound_secret: true, outbound_secret: true }, secrets_set_at: T("06-20", "12:00"), verified_at: T("06-30", "16:45"), rotated_at: null,
      details: { timeout_s: 15, rate_limit_per_min: 60, notes: "" }, created_at: T("06-20", "12:00") }
  ];

  var products = [
    { id: "pr-mav-dairy", partner: "lp-mavuno", code: "MAV-DAIRY-M", name: "Dairy input loan", status: "ACTIVE", reviews_required: 2, created_at: T("10-12", "11:30"),
      details: { description: "Feed, minerals and vet care, repaid monthly from milk payouts.", description_sw: "Chakula cha mifugo, madini na huduma ya mifugo, kulipwa kila mwezi kutoka malipo ya maziwa.",
        purposes: [{ value: "FEED", en: "Animal feed", sw: "Chakula cha mifugo" }, { value: "VET", en: "Vet care and drugs", sw: "Huduma ya mifugo na dawa" }, { value: "HEIFER", en: "A heifer", sw: "Mtamba" }] } },
    { id: "pr-mav-school", partner: "lp-mavuno", code: "MAV-SCHOOL", name: "School fees loan", status: "PAUSED", reviews_required: 1, created_at: T("10-12", "11:40"),
      details: { description: "School fees at the start of term.", description_sw: "Karo ya shule mwanzoni mwa muhula.", purposes: [{ value: "FEES", en: "School fees", sw: "Karo ya shule" }] } },
    { id: "pr-shb-harvest", partner: "lp-shamba", code: "SHB-HARVEST", name: "Coffee harvest advance", status: "ACTIVE", reviews_required: 1, created_at: T("10-26", "14:20"),
      details: { description: "Picking labour before the cherry is paid for.", description_sw: "Malipo ya wachumaji kabla ya kulipwa kwa cheri.", purposes: [{ value: "LABOUR", en: "Picking labour", sw: "Wachumaji" }] } },
    { id: "pr-teg-avo", partner: "lp-tegemeo", code: "TEG-AVO-W", name: "Avocado grower loan", status: "ACTIVE", reviews_required: 1, created_at: T("06-02", "10:30"),
      details: { description: "Seedlings, fertiliser and spraying for avocado orchards.", description_sw: "Miche, mbolea na dawa za kunyunyizia kwa mashamba ya parachichi.",
        purposes: [{ value: "INPUTS", en: "Fertiliser and sprays", sw: "Mbolea na dawa" }, { value: "SEEDLINGS", en: "Seedlings", sw: "Miche" }] } }
  ];

  /* Charges: [name, kind, basis, amount_cents, rate_bps, frequency, collected, min, max, gf_share_bps]. */
  var ch = function (rows) { return rows.map(function (r, i) { return { name: r[0], kind: r[1], basis: r[2], amount_cents: r[3], rate_bps: r[4], frequency: r[5], collected: r[6], min_cents: r[7], max_cents: r[8], gf_share_bps: r[9], position: i + 1 }; }); };
  var dairyV1 = ch([
    ["Interest", "INTEREST", "PERCENT_OF_PRINCIPAL", null, 450, "PER_MONTH", "WITH_INSTALMENTS", null, null, 3333],
    ["Processing fee", "PROCESSING_FEE", "PERCENT_OF_PRINCIPAL", null, 300, "ONE_OFF", "DEDUCTED_AT_DISBURSEMENT", 10000, null, 5000],
    ["Credit life cover", "INSURANCE", "PERCENT_OF_PRINCIPAL", null, 100, "ONE_OFF", "ADDED_TO_LOAN", null, null, 0],
    ["Late penalty", "LATE_PENALTY", "PERCENT_OF_OVERDUE", null, 200, "PER_MISSED_INSTALMENT", "WITH_INSTALMENTS", null, null, 5000]
  ]);
  var dairyV3 = ch([
    ["Interest", "INTEREST", "PERCENT_OF_PRINCIPAL", null, 400, "PER_MONTH", "WITH_INSTALMENTS", null, null, 3750],
    ["Processing fee", "PROCESSING_FEE", "PERCENT_OF_PRINCIPAL", null, 300, "ONE_OFF", "DEDUCTED_AT_DISBURSEMENT", 10000, 150000, 5000],
    ["Credit life cover", "INSURANCE", "PERCENT_OF_PRINCIPAL", null, 100, "ONE_OFF", "ADDED_TO_LOAN", null, null, 0],
    ["Late penalty", "LATE_PENALTY", "PERCENT_OF_OVERDUE", null, 200, "PER_MISSED_INSTALMENT", "WITH_INSTALMENTS", null, null, 5000]
  ]);
  var dairyV2 = ch([
    ["Interest", "INTEREST", "PERCENT_OF_PRINCIPAL", null, 40, "PER_MONTH", "WITH_INSTALMENTS", null, null, 3750],
    ["Processing fee", "PROCESSING_FEE", "PERCENT_OF_PRINCIPAL", null, 300, "ONE_OFF", "DEDUCTED_AT_DISBURSEMENT", 10000, 150000, 5000],
    ["Credit life cover", "INSURANCE", "PERCENT_OF_PRINCIPAL", null, 100, "ONE_OFF", "ADDED_TO_LOAN", null, null, 0],
    ["Late penalty", "LATE_PENALTY", "PERCENT_OF_OVERDUE", null, 200, "PER_MISSED_INSTALMENT", "WITH_INSTALMENTS", null, null, 5000]
  ]);
  var dairyV4 = ch([
    ["Interest", "INTEREST", "PERCENT_OF_BALANCE", null, 500, "PER_MONTH", "WITH_INSTALMENTS", null, null, 3750],
    ["Processing fee", "PROCESSING_FEE", "PERCENT_OF_PRINCIPAL", null, 300, "ONE_OFF", "DEDUCTED_AT_DISBURSEMENT", 10000, 150000, 5000],
    ["Credit life cover", "INSURANCE", "PERCENT_OF_PRINCIPAL", null, 100, "ONE_OFF", "ADDED_TO_LOAN", null, null, 0],
    ["Late penalty", "LATE_PENALTY", "PERCENT_OF_OVERDUE", null, 200, "PER_MISSED_INSTALMENT", "WITH_INSTALMENTS", null, null, 5000]
  ]);
  var base = { grace_days: 7, default_after_days: 30, flag_after_days: 45, terms: { allowed_durations: [], early_repayment: "Repay early at any time; interest stops from the day you repay.", disclosure: { en: "", sw: "" } } };
  var V = function (o) { var t = Object.assign({}, base, o); t.terms = Object.assign({}, base.terms, o.terms || {}); return t; };
  var terms = [
    V({ id: "pt-dairy-1", product: "pr-mav-dairy", version: 1, status: "PUBLISHED", effective_from: T("10-20", "00:00"), min_amount_cents: 500000, max_amount_cents: 5000000,
      duration_unit: "MONTHLY", min_duration: 1, max_duration: 6, repayment_frequency: "MONTHLY", published_at: T("10-15", "12:10"), published_by: "u-peter", created_by: "u-peter", created_at: T("10-13", "10:00"), charges: dairyV1 }),
    V({ id: "pt-dairy-2", product: "pr-mav-dairy", version: 2, status: "WITHDRAWN", effective_from: T("12-01", "00:00"), min_amount_cents: 500000, max_amount_cents: 8000000,
      duration_unit: "MONTHLY", min_duration: 1, max_duration: 6, repayment_frequency: "MONTHLY", published_at: T("10-27", "15:00"), published_by: "u-peter", created_by: "u-peter", created_at: T("10-27", "10:00"),
      terms: { withdrawal: { reason: "Interest typed as 0.4% a month instead of 4%. Corrected as version 3.", by: "u-amina", at: T("10-28", "09:20") } }, charges: dairyV2 }),
    V({ id: "pt-dairy-3", product: "pr-mav-dairy", version: 3, status: "PUBLISHED", effective_from: T("12-01", "00:00"), min_amount_cents: 500000, max_amount_cents: 8000000,
      duration_unit: "MONTHLY", min_duration: 1, max_duration: 6, repayment_frequency: "MONTHLY", published_at: T("10-28", "10:05"), published_by: "u-amina", created_by: "u-peter", created_at: T("10-28", "09:30"), charges: dairyV3 }),
    V({ id: "pt-dairy-4", product: "pr-mav-dairy", version: 4, status: "DRAFT", effective_from: null, min_amount_cents: 500000, max_amount_cents: 8000000,
      duration_unit: "MONTHLY", min_duration: 1, max_duration: 9, repayment_frequency: "BIWEEKLY", published_at: null, published_by: null, created_by: "u-peter", created_at: T("10-29", "16:20"),
      terms: { disclosure: { en: "Interest is worked out on what you still owe.", sw: "Riba inahesabiwa kwa kiasi unachodaiwa bado." } }, charges: dairyV4 }),
    V({ id: "pt-school-1", product: "pr-mav-school", version: 1, status: "PUBLISHED", effective_from: T("10-20", "00:00"), min_amount_cents: 300000, max_amount_cents: 3000000,
      duration_unit: "MONTHLY", min_duration: 1, max_duration: 4, repayment_frequency: "MONTHLY", published_at: T("10-15", "12:20"), published_by: "u-peter", created_by: "u-peter", created_at: T("10-13", "10:30"),
      charges: ch([["Interest", "INTEREST", "PERCENT_OF_PRINCIPAL", null, 500, "PER_MONTH", "WITH_INSTALMENTS", null, null, 3000], ["Processing fee", "PROCESSING_FEE", "FLAT_AMOUNT", 25000, null, "ONE_OFF", "DEDUCTED_AT_DISBURSEMENT", null, null, 5000]]) }),
    V({ id: "pt-harvest-1", product: "pr-shb-harvest", version: 1, status: "DRAFT", effective_from: T("11-16", "00:00"), min_amount_cents: 200000, max_amount_cents: 2000000,
      duration_unit: "WEEKLY", min_duration: 4, max_duration: 12, repayment_frequency: "END_OF_TERM", grace_days: 3, default_after_days: 21, flag_after_days: 21, published_at: null, published_by: null, created_by: "u-peter", created_at: T("10-26", "14:30"),
      charges: ch([["Interest", "INTEREST", "PERCENT_OF_PRINCIPAL", null, 120, "PER_WEEK", "WITH_INSTALMENTS", null, null, 2500]]) }),
    V({ id: "pt-avo-1", product: "pr-teg-avo", version: 1, status: "PUBLISHED", effective_from: T("06-15", "00:00"), min_amount_cents: 1000000, max_amount_cents: 10000000,
      duration_unit: "WEEKLY", min_duration: 8, max_duration: 16, repayment_frequency: "WEEKLY", grace_days: 7, default_after_days: 21, flag_after_days: 28, published_at: T("06-10", "11:00"), published_by: "u-amina", created_by: "u-amina", created_at: T("06-05", "09:00"),
      terms: { allowed_durations: [8, 12, 16] },
      charges: ch([["Interest", "INTEREST", "PERCENT_OF_PRINCIPAL", null, 450, "PER_MONTH", "WITH_INSTALMENTS", null, null, 3333], ["Processing fee", "PROCESSING_FEE", "PERCENT_OF_PRINCIPAL", null, 250, "ONE_OFF", "DEDUCTED_AT_DISBURSEMENT", 15000, null, 5000],
        ["Late penalty", "LATE_PENALTY", "FLAT_AMOUNT", 20000, null, "PER_MISSED_INSTALMENT", "WITH_INSTALMENTS", null, null, 5000]]) })
  ];

  var coverage = [
    { id: "cv-1", product: "pr-mav-dairy", cooperative: "co-kijani", status: "ACTIVE", started_at: T("10-20", "08:00"), ended_at: null },
    { id: "cv-2", product: "pr-mav-dairy", cooperative: "co-ruiru", status: "ACTIVE", started_at: T("10-20", "08:00"), ended_at: null },
    { id: "cv-3", product: "pr-mav-school", cooperative: "co-kijani", status: "ENDED", started_at: T("10-20", "08:05"), ended_at: T("10-27", "11:00") },
    { id: "cv-4", product: "pr-shb-harvest", cooperative: "co-mawingu", status: "ACTIVE", started_at: T("10-26", "14:40"), ended_at: null },
    { id: "cv-5", product: "pr-teg-avo", cooperative: "co-gatundu", status: "ACTIVE", started_at: T("06-20", "10:00"), ended_at: null }
  ];

  var remittances = [
    { id: "rm-1", partner: "lp-tegemeo", amount_cents: 1845000, received_on: "2026-09-08", period_start: "2026-07-01", period_end: "2026-07-31", reference: "TGM-REM-2607", source: "STAFF", status: "RECORDED",
      details: { breakdown: [{ charge_name: "Interest", amount_cents: 1520000 }, { charge_name: "Processing fee", amount_cents: 325000 }], note: "Late: due by 12 Aug.", void_reason: "" }, recorded_by: "u-peter", created_at: T("09-08", "14:00") },
    { id: "rm-2", partner: "lp-tegemeo", amount_cents: 2461000, received_on: "2026-09-11", period_start: "2026-08-01", period_end: "2026-08-31", reference: "TGM-REM-2608", source: "STAFF", status: "RECORDED",
      details: { breakdown: [{ charge_name: "Interest", amount_cents: 1981000 }, { charge_name: "Processing fee", amount_cents: 410000 }, { charge_name: "Late penalty", amount_cents: 70000 }], note: "", void_reason: "" }, recorded_by: "u-peter", created_at: T("09-11", "10:15") },
    { id: "rm-3", partner: "lp-tegemeo", amount_cents: 2461000, received_on: "2026-09-11", period_start: "2026-08-01", period_end: "2026-08-31", reference: "TGM-REM-2608B", source: "STAFF", status: "VOIDED",
      details: { breakdown: [], note: "", void_reason: "Entered twice: the same bank credit as TGM-REM-2608." }, recorded_by: "u-peter", created_at: T("09-11", "10:22") },
    { id: "rm-4", partner: "lp-tegemeo", amount_cents: 3128000, received_on: "2026-10-12", period_start: "2026-09-01", period_end: "2026-09-30", reference: "TGM-REM-2609", source: "STAFF", status: "RECORDED",
      details: { breakdown: [], note: "No breakdown sent this month.", void_reason: "" }, recorded_by: "u-amina", created_at: T("10-12", "15:40") }
  ];

  /* A partner's audit entries (G81, approved 2026-11-08: a read-only endpoint for Full and Owner,
   * like the circle's). Shaped like groups' AuditEntry: action, who, what, when. Secrets' values
   * never appear, only which ones changed. Status moves are in `history`, not here. */
  var audit = [
    ["lp-mavuno", "partner_added", "u-peter", T("10-12", "11:00"), "Added, onboarding, production"],
    ["lp-mavuno", "product_added", "u-peter", T("10-12", "11:30"), "Dairy input loan (MAV-DAIRY-M)"],
    ["lp-mavuno", "product_added", "u-peter", T("10-12", "11:40"), "School fees loan (MAV-SCHOOL)"],
    ["lp-mavuno", "terms_published", "u-peter", T("10-15", "12:10"), "Dairy input loan version 1, from 20 Oct"],
    ["lp-mavuno", "terms_published", "u-peter", T("10-15", "12:20"), "School fees loan version 1, from 20 Oct"],
    ["lp-mavuno", "coverage_linked", "u-peter", T("10-20", "08:00"), "Dairy input loan: Kijani Valley Dairy, Ruiru Hills Dairy"],
    ["lp-mavuno", "coverage_linked", "u-peter", T("10-20", "08:05"), "School fees loan: Kijani Valley Dairy"],
    ["lp-mavuno", "coverage_ended", "u-peter", T("10-27", "11:00"), "School fees loan: Kijani Valley Dairy"],
    ["lp-mavuno", "product_status_changed", "u-peter", T("10-27", "11:01"), "School fees loan: active to paused"],
    ["lp-mavuno", "terms_published", "u-peter", T("10-27", "15:00"), "Dairy input loan version 2, from 1 Dec"],
    ["lp-mavuno", "connection_added", "u-amina", T("10-28", "17:05"), "Production: https://api.mavuno.example/v1, key gf_live_7Q2X; secrets set: our key's, theirs"],
    ["lp-mavuno", "terms_withdrawn", "u-amina", T("10-28", "09:20"), "Dairy input loan version 2: \"Interest typed as 0.4% a month instead of 4%.\""],
    ["lp-mavuno", "terms_published", "u-amina", T("10-28", "10:05"), "Dairy input loan version 3, from 1 Dec"],
    ["lp-mavuno", "terms_drafted", "u-peter", T("10-29", "16:20"), "Dairy input loan version 4, from version 1"],
    ["lp-shamba", "partner_added", "u-peter", T("10-26", "14:00"), "Added, onboarding, production, partner portal"],
    ["lp-shamba", "product_added", "u-peter", T("10-26", "14:20"), "Coffee harvest advance (SHB-HARVEST)"],
    ["lp-shamba", "coverage_linked", "u-peter", T("10-26", "14:40"), "Coffee harvest advance: Mawingu Coffee Growers"],
    ["lp-tegemeo", "partner_added", "u-amina", T("06-02", "10:00"), "Added, onboarding, production"],
    ["lp-tegemeo", "connection_added", "u-amina", T("06-20", "12:00"), "Production: https://partners.tegemeo.example/api, key grofunder-01; all three secrets set"],
    ["lp-tegemeo", "connection_verified", "u-amina", T("06-30", "16:45"), "Production: test call passed"],
    ["lp-tegemeo", "terms_published", "u-amina", T("06-10", "11:00"), "Avocado grower loan version 1, from 15 Jun"],
    ["lp-tegemeo", "coverage_linked", "u-amina", T("06-20", "10:00"), "Avocado grower loan: Gatundu Avocado Growers"],
    ["lp-tegemeo", "remittance_recorded", "u-peter", T("09-08", "14:00"), "Ksh 18,450.00, ref TGM-REM-2607, July"],
    ["lp-tegemeo", "remittance_recorded", "u-peter", T("09-11", "10:15"), "Ksh 24,610.00, ref TGM-REM-2608, August"],
    ["lp-tegemeo", "remittance_recorded", "u-peter", T("09-11", "10:22"), "Ksh 24,610.00, ref TGM-REM-2608B, August"],
    ["lp-tegemeo", "remittance_voided", "u-peter", T("09-11", "10:40"), "Ref TGM-REM-2608B: \"Entered twice: the same bank credit as TGM-REM-2608.\""],
    ["lp-tegemeo", "remittance_recorded", "u-amina", T("10-12", "15:40"), "Ksh 31,280.00, ref TGM-REM-2609, September"]
  ].map(function (a) { return { partner: a[0], action: "lending_partners." + a[1], by: a[2], at: a[3], text: a[4] }; });

  /* ------------------------------------------------------------ reading */
  var byId = {};
  [partners, connections, products, terms, coverage, remittances].forEach(function (l) { l.forEach(function (x) { byId[x.id] = x; }); });
  var NOW = GF.NOW;
  /** The version in force: the latest PUBLISHED with effective_from on or before the date (24). */
  function inForce(productId, at) {
    at = at || NOW;
    return terms.filter(function (t) { return t.product === productId && t.status === "PUBLISHED" && t.effective_from <= at; })
      .sort(function (a, b) { return a.effective_from < b.effective_from ? 1 : -1; })[0] || null;
  }
  /** How the console marks a version: in force, scheduled, past, withdrawn or draft. */
  function termsState(t) {
    if (t.status === "DRAFT") return "DRAFT";
    if (t.status === "WITHDRAWN") return "WITHDRAWN";
    if (t.effective_from > NOW) return "SCHEDULED";
    var f = inForce(t.product); return f && f.id === t.id ? "IN_FORCE" : "PAST";
  }
  function productsOf(partnerId) { return products.filter(function (p) { return p.partner === partnerId; }); }
  function termsOf(productId) { return terms.filter(function (t) { return t.product === productId; }).sort(function (a, b) { return b.version - a.version; }); }
  function coverageOf(productId, all) { return coverage.filter(function (c) { return c.product === productId && (all || c.status === "ACTIVE"); }); }
  /** readiness (S&E): what activation still needs, as a checklist. */
  function readiness(p) {
    var conn = connections.find(function (c) { return c.partner === p.id && c.environment === p.environment && c.status === "ACTIVE"; });
    var ready = productsOf(p.id).some(function (pr) { return pr.status === "ACTIVE" && inForce(pr.id) && coverageOf(pr.id).some(function (c) { return GF.get(c.cooperative).status !== "ENDED"; }); });
    var rows = [];
    if (p.mode === "API") rows.push({ ok: !!(conn && conn.verified_at), text: "A verified " + L.env[p.environment].toLowerCase() + " connection",
      why: !conn ? "No connection yet" : conn.verified_at ? "" : "Not verified: the test call needs " + p.name + "'s adapter, which comes with the gateway (L4)", at: conn && conn.verified_at });
    else rows.push({ ok: false, text: "Partner staff can sign in to the partner portal", why: "The partner portal isn't built yet (L6)" });
    rows.push({ ok: ready, text: "A product with terms in force that covers a cooperative", why: ready ? "" : "No active product has terms in force and coverage" });
    rows.push({ ok: CONFIG.environments.indexOf(p.environment) > -1, text: L.env[p.environment] + " is allowed on this deployment", why: "" });
    /* 22's amendment to 24 (2026-11-09): loan.sharing bound for this partner, with a version of its sharing document in force. */
    if (GF.consents) { var sd = GF.consents.boundTo("loan.sharing", p.id), own = GF.consents.partnerDocs(p.id).filter(function (d) { return d.slug === "partner-sharing"; })[0];
      rows.push({ ok: GF.consents.sharingReady(p.id), text: "Its sharing document is in force and bound to loan.sharing", doc: (sd || own || {}).id,
        why: GF.consents.sharingReady(p.id) ? "" : !own ? "No sharing document yet" : !sd ? "The sharing document isn't bound to loan.sharing, and has no version in force" : "Nothing in force yet" }); }
    return rows;
  }
  /** Remitted per partner and period (remittances/totals/): RECORDED only. */
  function totals() {
    var out = {};
    remittances.filter(function (r) { return r.status === "RECORDED"; }).forEach(function (r) {
      var k = r.partner + "|" + r.period_start + "|" + r.period_end;
      out[k] = out[k] || { partner: r.partner, period_start: r.period_start, period_end: r.period_end, amount_cents: 0, count: 0 };
      out[k].amount_cents += r.amount_cents; out[k].count++;
    });
    return Object.keys(out).map(function (k) { return out[k]; }).sort(function (a, b) { return a.period_start < b.period_start ? 1 : -1; });
  }
  /** Amendment 2026-11-08: repaid in the duration's unit, or once at the end. */
  var freqFits = function (t) { return t.repayment_frequency === t.duration_unit || t.repayment_frequency === "END_OF_TERM"; };
  var pct = function (bps) { return (bps / 100).toFixed(bps % 100 ? (bps % 10 ? 2 : 1) : 0) + "%"; };

  GF.partners = {
    CONFIG: CONFIG, L: L, partners: partners, history: history, connections: connections, products: products, terms: terms, coverage: coverage, remittances: remittances,
    get: function (id) { return byId[id]; }, inForce: inForce, termsState: termsState, freqFits: freqFits, productsOf: productsOf, termsOf: termsOf, coverageOf: coverageOf, readiness: readiness, totals: totals, pct: pct,
    auditOf: function (id) { return audit.filter(function (a) { return a.partner === id; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }); },
    historyOf: function (id) { return history.filter(function (h) { return h.partner === id; }).sort(function (a, b) { return a.changed_at < b.changed_at ? 1 : -1; }); },
    connectionsOf: function (id) { return connections.filter(function (c) { return c.partner === id; }); },
    draftOf: function (productId) { return terms.find(function (t) { return t.product === productId && t.status === "DRAFT"; }) || null; }
  };
})(typeof window !== "undefined" ? window : globalThis);
