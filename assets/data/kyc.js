/* kyc.js: the KYC app's fictional data (phase 11, UI-60; design/20-kyc.md,
 * draft revision 2). Loaded after canon.js; adds GF.kyc. Nothing here is a
 * real person, ID number or place.
 *
 * Shapes follow note 20: KycItem rows (data_type, source, status, entered_by,
 * verification, verified_at, replaces, ended_at, details) with the type
 * table's columns under `data`, photos as media assets with their capture
 * metadata, Verification rows (visits) and their status history.
 *
 * The story, on "now" (Fri 30 Oct 2026, 10:30):
 *   v-101 Wanjiku Kamau (Kijani)   SUBMITTED by Kevin: two warnings; ready to review
 *   v-102 Joseph Mwangi (Kijani)   OPEN, Kevin is with him now (no smartphone: Kevin enters it all)
 *   v-103 Mary Njeri (Kijani)      OPEN, sent back yesterday: a blurred farm photo
 *   v-104 Samuel Kariuki (Kijani)  APPROVED in September
 *   v-105 a Mawingu member         SUBMITTED by Mercy: the ID number differs from the record; a farm 30 m from v-106's
 *   v-106 a Mawingu member         APPROVED in October
 *   v-107 Esther Wairimu (Kijani)  FAILED: farm not found
 *   v-108 a Gatundu member         OPEN, no agent yet
 *   v-109 Peter Ndungu (Kijani)    CANCELLED: opened by mistake
 */
(function (root) {
  "use strict";
  var GF = root.GF;

  /* ---------------------------------------------------- the registry (code) */
  var TYPES = {
    IDENTITY: { label: "Identity document", icon: "card-account-details-outline", many: false, by: ["Agent"], verify: "The document, seen by the agent", need: "VERIFIED", months: null },
    PORTRAIT: { label: "Photo of the member", icon: "account-box-outline", many: false, by: ["Agent"], verify: "Agent visit: matches the ID photo", need: "VERIFIED", months: 24 },
    PHONE: { label: "Phone and M-Pesa name", icon: "cellphone-check", many: false, by: ["Agent"], verify: "Agent visit", need: "VERIFIED", months: 12 },
    BACKGROUND: { label: "Background", icon: "account-details-outline", many: false, by: ["Member", "Agent"], verify: "", need: "PRESENT", months: null },
    FARM: { label: "Farms", icon: "map-marker-radius-outline", many: true, by: ["Member", "Agent"], verify: "Agent visit", need: "ONE_VERIFIED", months: 12 },
    CROP: { label: "Crops and livestock", icon: "sprout-outline", many: true, by: ["Member", "Agent", "Cooperative records"], verify: "Agent visit, or the cooperative's deliveries", need: "PRESENT", months: 12 },
    INCOME: { label: "Other income", icon: "cash-multiple", many: true, by: ["Member", "Agent"], verify: "", need: "PRESENT_OR_NONE", months: null },
    OBLIGATION: { label: "Loans and regular payments", icon: "calendar-sync-outline", many: true, by: ["Member", "Agent"], verify: "", need: "PRESENT_OR_NONE", months: null },
    NEXT_OF_KIN: { label: "Next of kin", icon: "account-heart-outline", many: false, by: ["Member", "Agent"], verify: "A call by the agent", need: "PRESENT", months: null },
    HOME: { label: "Home", icon: "home-map-marker", many: false, by: ["Agent"], verify: "Agent visit", need: "NONE", months: 24 }
  };
  var ORDER = ["IDENTITY", "PORTRAIT", "PHONE", "FARM", "CROP", "BACKGROUND", "INCOME", "OBLIGATION", "NEXT_OF_KIN", "HOME"];
  var DECLARED_ONLY = ["BACKGROUND", "INCOME", "OBLIGATION", "NEXT_OF_KIN"];

  var L = {
    source: { MEMBER: "Member", AGENT: "Agent", COOPERATIVE_RECORD: "Cooperative records", DOCUMENT: "ID document", EXTERNAL: "Outside check" },
    itemStatus: { UNVERIFIED: ["neutral", "Declared"], VERIFIED: ["success", "Verified"], DIFFERS: ["warning", "Differs"], REJECTED: ["error", "Rejected"] },
    visitStatus: { OPEN: ["info", "Open"], SUBMITTED: ["warning", "To review"], APPROVED: ["success", "Approved"], FAILED: ["error", "Failed"], REVOKED: ["error", "Revoked"], CANCELLED: ["neutral", "Cancelled"] },
    failure: { IDENTITY_MISMATCH: "Identity doesn't match", MEMBER_NOT_MET: "Member not met", FARM_NOT_FOUND: "Farm not found", FALSE_DECLARATION: "False declaration", DUPLICATE: "Duplicate", OTHER: "Other" },
    tenure: { OWNED: "Owned", FAMILY: "Family land", LEASED: "Leased", COMMUNAL: "Communal" },
    evidence: { TITLE_DEED: "Title deed seen", LEASE: "Lease seen", LETTER: "Letter (chief or family)", NONE: "Nothing shown" },
    experience: { UNDER_1: "Under a year", "1_TO_3": "1 to 3 years", "4_TO_7": "4 to 7 years", "8_TO_15": "8 to 15 years", OVER_15: "Over 15 years" },
    incomeKind: { BUSINESS: "Business or shop", EMPLOYMENT: "Employment", CASUAL_WORK: "Casual work", TRANSPORT: "Transport", FOOD_BUSINESS: "Food business", OTHER: "Other" },
    band: { BELOW_5K: "Below Ksh 5,000", "5K_TO_10K": "Ksh 5,000–10,000", "10K_TO_20K": "Ksh 10,001–20,000", ABOVE_20K: "Above Ksh 20,000" },
    obligationKind: { LOAN: "Loan", RENT: "Rent", SCHOOL_FEES: "School fees", BUSINESS_PAYMENT: "Business payment", OTHER: "Other" },
    lender: { BANK: "Bank", SACCO: "SACCO", MFI: "Microfinance", DIGITAL_LENDER: "Digital lender", CHAMA: "Chama", FAMILY_FRIEND: "Family or friend", OTHER: "Other" },
    place: { MEETING: "At a meeting", HOME: "At home", FARM: "On the farm", OTHER: "Elsewhere" },
    photo: { id_front: "ID, front", id_back: "ID, back", portrait: "Portrait", farm: "Farm", home: "Home" }
  };

  /* GroFunder agents (new role gf_agent, note 20). Reviewers are existing staff:
   * Brian Kipchoge (Operations) and Peter Otieno (Full). */
  var agents = [
    { id: "u-kevin", name: "Kevin Odhiambo", email: "kevin@grofunder.example", phone: "+254711300400", area: "ke-022", memberships: [{ account: "grofunder", roles: ["gf_agent"], owner: false }] },
    { id: "u-mercy", name: "Mercy Chebet", email: "mercy@grofunder.example", phone: "+254711300511", area: "ke-019", memberships: [{ account: "grofunder", roles: ["gf_agent"], owner: false }] }
  ];
  var staffName = function (id) { var s = GF.get(id) || agents.find(function (a) { return a.id === id; }); return s ? s.name : ""; };

  /* People from canon.js. Mawingu and Gatundu members are generated there, so
   * they are picked the same way on every load. */
  var M = {
    wanjiku: "m-kij-0142", joseph: "m-kij-0088", mary: "m-kij-0217", samuel: "m-kij-0031", esther: "m-kij-0164", peter: "m-kij-0199"
  };
  var active = function (coop, skip) { return GF.members.filter(function (m) { return m.cooperative === coop && m.status === "ACTIVE" && skip.indexOf(m.id) === -1; }); };
  var maw = active("co-mawingu", ["m-maw-0907"]);
  M.mawA = maw[0].id; M.mawB = maw[1].id;
  M.gat = active("co-gatundu", ["m-gat-0118"])[0].id;

  /* ------------------------------------------------------------- visits */
  var visits = [
    { id: "v-101", member: M.wanjiku, status: "SUBMITTED", agent: "u-kevin", submitted_at: "2026-10-28T16:10:00+03:00", reviewed_at: null, reviewed_by: null, failure_reason: "",
      created_by: "u-brian", created_at: "2026-10-21T11:02:00+03:00",
      notes: { visit: { met_at: "2026-10-28T09:40:00+03:00", place: "MEETING", lat: -1.11893, lng: 36.83521, accuracy_m: 8, where: "Gathiru collection centre, after the morning round" }, went_through_declared: true,
        warnings: [
          { code: "FARM_SIZE", item: "ki-108", message: "Leased plot: Wanjiku declared 3.00 acres; Kevin saw 1.25 acres." },
          { code: "PHOTO_DISTANCE", item: "ki-106", message: "One photo of Home farm was taken 240 m from the farm's point." }
        ], review_note: "" } },
    { id: "v-102", member: M.joseph, status: "OPEN", agent: "u-kevin", submitted_at: null, reviewed_at: null, reviewed_by: null, failure_reason: "",
      created_by: "u-brian", created_at: "2026-10-26T09:15:00+03:00",
      notes: { visit: { met_at: "2026-10-30T09:15:00+03:00", place: "HOME", lat: -1.12411, lng: 36.84102, accuracy_m: 11, where: "His home in Gathiru" }, went_through_declared: false, warnings: [], review_note: "" } },
    { id: "v-103", member: M.mary, status: "OPEN", agent: "u-kevin", submitted_at: "2026-10-27T15:20:00+03:00", reviewed_at: null, reviewed_by: null, failure_reason: "",
      created_by: "u-brian", created_at: "2026-10-22T10:00:00+03:00",
      notes: { visit: { met_at: "2026-10-27T11:05:00+03:00", place: "FARM", lat: -1.13502, lng: 36.81977, accuracy_m: 6, where: "Her farm in Kiamwangi" }, went_through_declared: true, warnings: [], review_note: "" } },
    { id: "v-104", member: M.samuel, status: "APPROVED", agent: "u-mercy", submitted_at: "2026-09-10T17:00:00+03:00", reviewed_at: "2026-09-12T10:20:00+03:00", reviewed_by: "u-brian", failure_reason: "",
      created_by: "u-peter", created_at: "2026-09-01T09:00:00+03:00",
      notes: { visit: { met_at: "2026-09-10T10:30:00+03:00", place: "FARM", lat: -1.13311, lng: 36.82201, accuracy_m: 5, where: "His farm in Kiamwangi" }, went_through_declared: true, warnings: [], review_note: "All clear. Good photos." } },
    { id: "v-105", member: M.mawA, status: "SUBMITTED", agent: "u-mercy", submitted_at: "2026-10-29T15:30:00+03:00", reviewed_at: null, reviewed_by: null, failure_reason: "",
      created_by: "u-peter", created_at: "2026-10-20T08:40:00+03:00",
      notes: { visit: { met_at: "2026-10-29T10:10:00+03:00", place: "MEETING", lat: -0.48021, lng: 37.13116, accuracy_m: 10, where: "Mawingu factory, members' meeting" }, went_through_declared: true,
        warnings: [
          { code: "RECORD_MISMATCH", item: "ki-301", message: "The ID number on the document doesn't match Mawingu's record. Approval waits until the cooperative corrects its record." },
          { code: "NEAR_FARM", item: "ki-304", message: "This farm's point is 30 m from a verified farm of another Mawingu member." }
        ], review_note: "" } },
    { id: "v-106", member: M.mawB, status: "APPROVED", agent: "u-mercy", submitted_at: "2026-09-30T16:00:00+03:00", reviewed_at: "2026-10-02T09:05:00+03:00", reviewed_by: "u-peter", failure_reason: "",
      created_by: "u-peter", created_at: "2026-09-20T08:40:00+03:00",
      notes: { visit: { met_at: "2026-09-30T11:00:00+03:00", place: "FARM", lat: -0.48122, lng: 37.12901, accuracy_m: 7, where: "The member's farm" }, went_through_declared: true, warnings: [], review_note: "" } },
    { id: "v-107", member: M.esther, status: "FAILED", agent: "u-mercy", submitted_at: "2026-10-14T14:00:00+03:00", reviewed_at: "2026-10-16T12:30:00+03:00", reviewed_by: "u-peter", failure_reason: "FARM_NOT_FOUND",
      created_by: "u-brian", created_at: "2026-10-05T09:00:00+03:00",
      notes: { visit: { met_at: "2026-10-14T10:00:00+03:00", place: "FARM", lat: -1.12087, lng: 36.83011, accuracy_m: 9, where: "The plot she named" }, went_through_declared: true, warnings: [],
        review_note: "The plot she showed belongs to her neighbour, who was there. No farm of her own at the place she gave." } },
    { id: "v-108", member: M.gat, status: "OPEN", agent: null, submitted_at: null, reviewed_at: null, reviewed_by: null, failure_reason: "",
      created_by: "u-brian", created_at: "2026-10-29T14:30:00+03:00", notes: { visit: null, went_through_declared: false, warnings: [], review_note: "" } },
    { id: "v-109", member: M.peter, status: "CANCELLED", agent: "u-kevin", submitted_at: null, reviewed_at: null, reviewed_by: null, failure_reason: "",
      created_by: "u-brian", created_at: "2026-10-05T09:30:00+03:00", notes: { visit: null, went_through_declared: false, warnings: [], review_note: "" } }
  ];
  var history = [
    ["v-101", "", "OPEN", "2026-10-21T11:02:00+03:00", "u-brian", ""], ["v-101", "OPEN", "SUBMITTED", "2026-10-28T16:10:00+03:00", "u-kevin", ""],
    ["v-102", "", "OPEN", "2026-10-26T09:15:00+03:00", "u-brian", ""],
    ["v-103", "", "OPEN", "2026-10-22T10:00:00+03:00", "u-brian", ""], ["v-103", "OPEN", "SUBMITTED", "2026-10-27T15:20:00+03:00", "u-kevin", ""],
    ["v-103", "SUBMITTED", "OPEN", "2026-10-29T09:40:00+03:00", "u-peter", "The photo of the Kiamwangi farm is blurred. Please take it again in daylight, with the maize in view."],
    ["v-104", "", "OPEN", "2026-09-01T09:00:00+03:00", "u-peter", ""], ["v-104", "OPEN", "SUBMITTED", "2026-09-10T17:00:00+03:00", "u-mercy", ""], ["v-104", "SUBMITTED", "APPROVED", "2026-09-12T10:20:00+03:00", "u-brian", ""],
    ["v-105", "", "OPEN", "2026-10-20T08:40:00+03:00", "u-peter", ""], ["v-105", "OPEN", "SUBMITTED", "2026-10-29T15:30:00+03:00", "u-mercy", ""],
    ["v-106", "", "OPEN", "2026-09-20T08:40:00+03:00", "u-peter", ""], ["v-106", "OPEN", "SUBMITTED", "2026-09-30T16:00:00+03:00", "u-mercy", ""], ["v-106", "SUBMITTED", "APPROVED", "2026-10-02T09:05:00+03:00", "u-peter", ""],
    ["v-107", "", "OPEN", "2026-10-05T09:00:00+03:00", "u-brian", ""], ["v-107", "OPEN", "SUBMITTED", "2026-10-14T14:00:00+03:00", "u-mercy", ""],
    ["v-107", "SUBMITTED", "FAILED", "2026-10-16T12:30:00+03:00", "u-peter", "The plot she showed belongs to her neighbour, who was there. No farm of her own at the place she gave."],
    ["v-108", "", "OPEN", "2026-10-29T14:30:00+03:00", "u-brian", ""],
    ["v-109", "", "OPEN", "2026-10-05T09:30:00+03:00", "u-brian", ""], ["v-109", "OPEN", "CANCELLED", "2026-10-09T08:10:00+03:00", "u-brian", "Opened for the wrong member: Peter Ndungu asked about a loan for his brother."]
  ].map(function (h) { return { verification: h[0], from_status: h[1], to_status: h[2], changed_at: h[3], changed_by: h[4], reason: h[5] }; });

  /* -------------------------------------------------------------- items */
  var items = [];
  var photo = function (purpose, at, lat, lng, acc) { return { purpose: purpose, taken_at: at, lat: lat, lng: lng, accuracy_m: acc }; };
  function add(id, member, type, o) {
    var row = { id: id, member: member, data_type: type, source: o.source, status: o.status || "UNVERIFIED", entered_by: o.by === undefined ? null : o.by,
      verification: o.v || null, verified_at: o.at || null, replaces: o.replaces || null, ended_at: o.ended || null,
      details: o.details || {}, data: o.data || null, photos: o.photos || [], created_at: o.created };
    items.push(row);
    return row;
  }
  var WJ_DECL = "2026-10-20T19:12:00+03:00", WJ_VISIT = "2026-10-28T", KEV = "u-kevin";

  /* Wanjiku (v-101, submitted): declared in the app on 20 Oct, checked on 28 Oct. */
  add("ki-101", M.wanjiku, "BACKGROUND", { source: "MEMBER", by: "u-wanjiku", created: WJ_DECL, details: { farming_experience: "OVER_15", has_other_income: true, has_obligations: true, other_activities: "" } });
  add("ki-102", M.wanjiku, "IDENTITY", { source: "DOCUMENT", by: KEV, status: "VERIFIED", v: "v-101", created: WJ_VISIT + "09:52:00+03:00",
    data: { id_type: "NATIONAL_ID", id_number: "23456789", full_name: "Wanjiku Kamau", date_of_birth: "1981-06-14" }, details: { gender: "FEMALE", serial_no: "238114762", issued_on: "2000-02-18" },
    photos: [photo("id_front", WJ_VISIT + "09:50:12+03:00", -1.11894, 36.83520, 8), photo("id_back", WJ_VISIT + "09:50:40+03:00", -1.11894, 36.83520, 8)] });
  add("ki-103", M.wanjiku, "PORTRAIT", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-101", created: WJ_VISIT + "09:53:00+03:00", details: { check_note: "Matches the ID photo." },
    photos: [photo("portrait", WJ_VISIT + "09:53:05+03:00", -1.11893, 36.83521, 8)] });
  add("ki-104", M.wanjiku, "PHONE", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-101", created: WJ_VISIT + "09:55:00+03:00", details: { phone: "+254712345678", mpesa_name: "WANJIKU KAMAU" } });
  add("ki-105", M.wanjiku, "FARM", { source: "MEMBER", by: "u-wanjiku", status: "VERIFIED", v: "v-101", ended: WJ_VISIT + "10:31:00+03:00", created: WJ_DECL,
    data: { area: "ke-022-1", lat: -1.12011, lng: 36.83402, size_acres: 2.0, cultivated_acres: 1.5, tenure: "OWNED", is_cultivated: null }, details: { name: "Home farm", village: "Gathiru", landmark: "Behind the primary school", accuracy_m: 35 } });
  add("ki-106", M.wanjiku, "FARM", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-101", replaces: "ki-105", created: WJ_VISIT + "10:31:00+03:00",
    data: { area: "ke-022-1", lat: -1.12034, lng: 36.83391, size_acres: 2.0, cultivated_acres: 1.5, tenure: "OWNED", is_cultivated: true },
    details: { name: "Home farm", village: "Gathiru", landmark: "Behind the primary school", accuracy_m: 6, tenure_evidence: "TITLE_DEED", check_note: "Two cows, Napier grass and maize. Title deed in her husband's name and hers." },
    photos: [photo("farm", WJ_VISIT + "10:28:10+03:00", -1.12030, 36.83395, 6), photo("farm", WJ_VISIT + "10:46:02+03:00", -1.11821, 36.83300, 12)] });
  add("ki-107", M.wanjiku, "FARM", { source: "MEMBER", by: "u-wanjiku", status: "DIFFERS", v: "v-101", ended: WJ_VISIT + "11:20:00+03:00", created: WJ_DECL,
    data: { area: "ke-022-1", lat: null, lng: null, size_acres: 3.0, cultivated_acres: 3.0, tenure: "LEASED", is_cultivated: null }, details: { name: "Leased plot", village: "Kiamwangi", landmark: "Next to the cattle dip" } });
  add("ki-108", M.wanjiku, "FARM", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-101", replaces: "ki-107", created: WJ_VISIT + "11:20:00+03:00",
    data: { area: "ke-022-1", lat: -1.13188, lng: 36.82114, size_acres: 1.25, cultivated_acres: 1.25, tenure: "LEASED", is_cultivated: true },
    details: { name: "Leased plot", village: "Kiamwangi", landmark: "Next to the cattle dip", accuracy_m: 5, tenure_evidence: "LEASE", check_note: "Paced it out: about 1¼ acres of maize. The owner showed the lease; she thought it was 3." },
    photos: [photo("farm", WJ_VISIT + "11:12:30+03:00", -1.13190, 36.82110, 5), photo("farm", WJ_VISIT + "11:14:02+03:00", -1.13185, 36.82121, 5)] });
  add("ki-109", M.wanjiku, "CROP", { source: "COOPERATIVE_RECORD", by: null, status: "VERIFIED", at: "2026-10-01T02:00:00+03:00", created: "2026-10-01T02:00:00+03:00",
    data: { value_chain: "vc-dairy", acres: null, is_main: true }, details: { note: "Milk delivered to Kijani Valley Dairy every month since August." } });
  add("ki-110", M.wanjiku, "CROP", { source: "MEMBER", by: "u-wanjiku", status: "VERIFIED", v: "v-101", created: WJ_DECL, data: { value_chain: "vc-cereals", acres: 1.0, is_main: false }, details: { check_note: "Maize on the leased plot." } });
  add("ki-111", M.wanjiku, "CROP", { source: "MEMBER", by: "u-wanjiku", created: WJ_DECL, data: { value_chain: "vc-horti", acres: 0.25, is_main: false }, details: { note: "Kale and spinach", check_note: "The kale bed was cleared for replanting; nothing to see this week." } });
  add("ki-112", M.wanjiku, "INCOME", { source: "MEMBER", by: "u-wanjiku", created: WJ_DECL, data: { kind: "BUSINESS", monthly_band: "5K_TO_10K", monthly_cents: null }, details: { note: "A small shop at Gathiru selling milk and eggs" } });
  add("ki-113", M.wanjiku, "OBLIGATION", { source: "MEMBER", by: "u-wanjiku", created: WJ_DECL, data: { kind: "LOAN", lender_type: "SACCO", owed_cents: 4500000, monthly_cents: 450000 }, details: { note: "Kiambu teachers' SACCO, for the dairy shed" } });
  add("ki-114", M.wanjiku, "OBLIGATION", { source: "MEMBER", by: "u-wanjiku", created: WJ_DECL, data: { kind: "SCHOOL_FEES", lender_type: "", owed_cents: 0, monthly_cents: 300000 }, details: {} });
  add("ki-115", M.wanjiku, "NEXT_OF_KIN", { source: "MEMBER", by: "u-wanjiku", status: "VERIFIED", v: "v-101", created: WJ_DECL, details: { name: "James Kamau", relationship: "Husband", phone: "+254722111222", check_note: "Called him during the visit; he answered." } });
  add("ki-116", M.wanjiku, "HOME", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-101", created: WJ_VISIT + "10:05:00+03:00",
    details: { lat: -1.11942, lng: 36.83451, accuracy_m: 9, village: "Gathiru", landmark: "Green gate behind Gathiru primary school" }, photos: [photo("home", WJ_VISIT + "10:05:20+03:00", -1.11942, 36.83451, 9)] });

  /* Joseph (v-102, open): no smartphone, so Kevin enters everything with him today. Half done. */
  var JO = "2026-10-30T";
  add("ki-201", M.joseph, "CROP", { source: "COOPERATIVE_RECORD", by: null, status: "VERIFIED", at: "2026-10-01T02:00:00+03:00", created: "2026-10-01T02:00:00+03:00", data: { value_chain: "vc-dairy", acres: null, is_main: true }, details: {} });
  add("ki-202", M.joseph, "IDENTITY", { source: "DOCUMENT", by: KEV, status: "VERIFIED", v: "v-102", created: JO + "09:24:00+03:00",
    data: { id_type: "NATIONAL_ID", id_number: GF.get(M.joseph).id_number, full_name: "Joseph Mwangi", date_of_birth: GF.get(M.joseph).date_of_birth }, details: { gender: "MALE", serial_no: "201733980", issued_on: "1988-07-11" },
    photos: [photo("id_front", JO + "09:22:10+03:00", -1.12411, 36.84102, 11), photo("id_back", JO + "09:22:35+03:00", -1.12411, 36.84102, 11)] });
  add("ki-203", M.joseph, "PORTRAIT", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-102", created: JO + "09:25:00+03:00", photos: [photo("portrait", JO + "09:25:02+03:00", -1.12411, 36.84102, 11)] });
  add("ki-204", M.joseph, "BACKGROUND", { source: "AGENT", by: KEV, created: JO + "09:31:00+03:00", details: { farming_experience: "OVER_15", has_other_income: false, has_obligations: true, other_activities: "" } });
  add("ki-205", M.joseph, "OBLIGATION", { source: "AGENT", by: KEV, created: JO + "09:34:00+03:00", data: { kind: "LOAN", lender_type: "DIGITAL_LENDER", owed_cents: 320000, monthly_cents: 160000 }, details: { note: "A phone loan for feed" } });

  /* Mary (v-103, sent back): entered by Kevin on 27 Oct; the farm photo needs taking again. */
  var MA = "2026-10-27T";
  add("ki-251", M.mary, "IDENTITY", { source: "DOCUMENT", by: KEV, status: "VERIFIED", v: "v-103", created: MA + "11:10:00+03:00",
    data: { id_type: "NATIONAL_ID", id_number: GF.get(M.mary).id_number, full_name: "Mary Njeri", date_of_birth: GF.get(M.mary).date_of_birth }, details: { gender: "FEMALE" },
    photos: [photo("id_front", MA + "11:08:00+03:00", -1.13502, 36.81977, 6), photo("id_back", MA + "11:08:20+03:00", -1.13502, 36.81977, 6)] });
  add("ki-252", M.mary, "PORTRAIT", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-103", created: MA + "11:11:00+03:00", photos: [photo("portrait", MA + "11:11:04+03:00", -1.13502, 36.81977, 6)] });
  add("ki-253", M.mary, "PHONE", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-103", created: MA + "11:12:00+03:00", details: { phone: GF.get(M.mary).phone, mpesa_name: "MARY NJERI" } });
  add("ki-254", M.mary, "BACKGROUND", { source: "AGENT", by: KEV, created: MA + "11:15:00+03:00", details: { farming_experience: "4_TO_7", has_other_income: true, has_obligations: false, other_activities: "" } });
  add("ki-255", M.mary, "FARM", { source: "AGENT", by: KEV, status: "VERIFIED", v: "v-103", created: MA + "11:30:00+03:00",
    data: { area: "ke-022-1", lat: -1.13502, lng: 36.81977, size_acres: 0.75, cultivated_acres: 0.75, tenure: "FAMILY", is_cultivated: true },
    details: { name: "Family plot", village: "Kiamwangi", accuracy_m: 6, tenure_evidence: "LETTER" }, photos: [photo("farm", MA + "11:28:00+03:00", -1.13503, 36.81975, 6)] });
  add("ki-256", M.mary, "CROP", { source: "COOPERATIVE_RECORD", by: null, status: "VERIFIED", at: "2026-10-01T02:00:00+03:00", created: "2026-10-01T02:00:00+03:00", data: { value_chain: "vc-dairy", acres: null, is_main: true }, details: {} });
  add("ki-257", M.mary, "INCOME", { source: "AGENT", by: KEV, created: MA + "11:17:00+03:00", data: { kind: "CASUAL_WORK", monthly_band: "BELOW_5K", monthly_cents: null }, details: { note: "Picks tea in the season" } });
  add("ki-258", M.mary, "NEXT_OF_KIN", { source: "AGENT", by: KEV, created: MA + "11:18:00+03:00", details: { name: "Grace Njeri", relationship: "Sister", phone: "+254713440201" } });

  /* Samuel (v-104, approved 12 Sep). */
  var SA = "2026-09-10T", SAV = "2026-09-12T10:20:00+03:00", MER = "u-mercy";
  add("ki-401", M.samuel, "IDENTITY", { source: "DOCUMENT", by: MER, status: "VERIFIED", v: "v-104", at: SAV, created: SA + "10:40:00+03:00",
    data: { id_type: "NATIONAL_ID", id_number: GF.get(M.samuel).id_number, full_name: "Samuel Kariuki", date_of_birth: GF.get(M.samuel).date_of_birth }, details: { gender: "MALE" },
    photos: [photo("id_front", SA + "10:38:00+03:00", -1.13311, 36.82201, 5), photo("id_back", SA + "10:38:30+03:00", -1.13311, 36.82201, 5)] });
  add("ki-402", M.samuel, "PORTRAIT", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-104", at: SAV, created: SA + "10:41:00+03:00", photos: [photo("portrait", SA + "10:41:00+03:00", -1.13311, 36.82201, 5)] });
  add("ki-403", M.samuel, "PHONE", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-104", at: SAV, created: SA + "10:42:00+03:00", details: { phone: GF.get(M.samuel).phone, mpesa_name: "SAMUEL KARIUKI" } });
  add("ki-404", M.samuel, "FARM", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-104", at: SAV, created: SA + "10:55:00+03:00",
    data: { area: "ke-022-1", lat: -1.13311, lng: 36.82201, size_acres: 4.0, cultivated_acres: 3.5, tenure: "OWNED", is_cultivated: true },
    details: { name: "Kiamwangi farm", village: "Kiamwangi", accuracy_m: 5, tenure_evidence: "TITLE_DEED" }, photos: [photo("farm", SA + "10:52:00+03:00", -1.13312, 36.82199, 5)] });
  add("ki-405", M.samuel, "CROP", { source: "COOPERATIVE_RECORD", by: null, status: "VERIFIED", at: "2026-09-01T02:00:00+03:00", created: "2026-09-01T02:00:00+03:00", data: { value_chain: "vc-dairy", acres: null, is_main: true }, details: {} });
  add("ki-406", M.samuel, "BACKGROUND", { source: "AGENT", by: MER, created: SA + "10:45:00+03:00", details: { farming_experience: "OVER_15", has_other_income: false, has_obligations: false, other_activities: "" } });
  add("ki-407", M.samuel, "NEXT_OF_KIN", { source: "AGENT", by: MER, created: SA + "10:46:00+03:00", details: { name: "Lucy Wanjiru", relationship: "Wife", phone: "+254724551002" } });

  /* Mawingu A (v-105, submitted): the cooperative's record has a mistyped ID number. */
  var mA = GF.get(M.mawA), mB = GF.get(M.mawB), MW = "2026-10-29T";
  var swapped = mA.id_number.slice(0, -2) + mA.id_number.slice(-1) + mA.id_number.slice(-2, -1);
  if (swapped === mA.id_number) swapped = mA.id_number.slice(0, -1) + ((+mA.id_number.slice(-1) + 1) % 10);
  add("ki-301", M.mawA, "IDENTITY", { source: "DOCUMENT", by: MER, status: "VERIFIED", v: "v-105", created: MW + "10:20:00+03:00",
    data: { id_type: "NATIONAL_ID", id_number: swapped, full_name: mA.full_name, date_of_birth: mA.date_of_birth }, details: { gender: mA.gender },
    photos: [photo("id_front", MW + "10:18:00+03:00", -0.48021, 37.13116, 10), photo("id_back", MW + "10:18:20+03:00", -0.48021, 37.13116, 10)] });
  add("ki-302", M.mawA, "PORTRAIT", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-105", created: MW + "10:21:00+03:00", photos: [photo("portrait", MW + "10:21:00+03:00", -0.48021, 37.13116, 10)] });
  add("ki-303", M.mawA, "PHONE", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-105", created: MW + "10:22:00+03:00", details: { phone: mA.phone, mpesa_name: mA.full_name.toUpperCase() } });
  add("ki-304", M.mawA, "FARM", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-105", created: MW + "12:05:00+03:00",
    data: { area: "ke-019-1", lat: -0.48135, lng: 37.12925, size_acres: 1.5, cultivated_acres: 1.5, tenure: "FAMILY", is_cultivated: true },
    details: { name: "Coffee shamba", village: "Mawingu", accuracy_m: 7, tenure_evidence: "LETTER" }, photos: [photo("farm", MW + "12:03:00+03:00", -0.48136, 37.12924, 7)] });
  add("ki-305", M.mawA, "CROP", { source: "COOPERATIVE_RECORD", by: null, status: "VERIFIED", at: "2026-10-01T02:00:00+03:00", created: "2026-10-01T02:00:00+03:00", data: { value_chain: "vc-coffee", acres: null, is_main: true }, details: {} });
  add("ki-306", M.mawA, "BACKGROUND", { source: "AGENT", by: MER, created: MW + "10:25:00+03:00", details: { farming_experience: "8_TO_15", has_other_income: false, has_obligations: false, other_activities: "" } });
  add("ki-307", M.mawA, "NEXT_OF_KIN", { source: "AGENT", by: MER, created: MW + "10:26:00+03:00", details: { name: "Anne Wangui", relationship: "Daughter", phone: "+254715223310" } });

  /* Mawingu B (v-106, approved 2 Oct): the farm 30 m away. */
  var MBV = "2026-10-02T09:05:00+03:00";
  add("ki-351", M.mawB, "IDENTITY", { source: "DOCUMENT", by: MER, status: "VERIFIED", v: "v-106", at: MBV, created: "2026-09-30T11:10:00+03:00", data: { id_type: "NATIONAL_ID", id_number: mB.id_number, full_name: mB.full_name, date_of_birth: mB.date_of_birth }, details: {} });
  add("ki-352", M.mawB, "PORTRAIT", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-106", at: MBV, created: "2026-09-30T11:11:00+03:00" });
  add("ki-353", M.mawB, "PHONE", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-106", at: MBV, created: "2026-09-30T11:12:00+03:00", details: { phone: mB.phone, mpesa_name: mB.full_name.toUpperCase() } });
  add("ki-354", M.mawB, "FARM", { source: "AGENT", by: MER, status: "VERIFIED", v: "v-106", at: MBV, created: "2026-09-30T11:40:00+03:00",
    data: { area: "ke-019-1", lat: -0.48122, lng: 37.12901, size_acres: 2.0, cultivated_acres: 2.0, tenure: "OWNED", is_cultivated: true }, details: { name: "Home shamba", village: "Mawingu", accuracy_m: 7, tenure_evidence: "TITLE_DEED" } });
  add("ki-357", M.mawB, "CROP", { source: "COOPERATIVE_RECORD", by: null, status: "VERIFIED", at: "2026-10-01T02:00:00+03:00", created: "2026-10-01T02:00:00+03:00", data: { value_chain: "vc-coffee", acres: null, is_main: true }, details: {} });
  add("ki-355", M.mawB, "BACKGROUND", { source: "AGENT", by: MER, created: "2026-09-30T11:15:00+03:00", details: { farming_experience: "OVER_15", has_other_income: false, has_obligations: false, other_activities: "" } });
  add("ki-356", M.mawB, "NEXT_OF_KIN", { source: "AGENT", by: MER, created: "2026-09-30T11:16:00+03:00", details: { name: "Paul Mwangi", relationship: "Son", phone: "+254716200455" } });

  /* Esther (v-107, failed): the farm she named isn't hers. */
  add("ki-451", M.esther, "FARM", { source: "MEMBER", by: null, status: "DIFFERS", v: "v-107", ended: "2026-10-14T10:40:00+03:00", created: "2026-10-04T18:00:00+03:00",
    data: { area: "ke-022-1", lat: null, lng: null, size_acres: 2.5, cultivated_acres: 2.0, tenure: "OWNED", is_cultivated: null }, details: { name: "Shamba", village: "Gathiru", check_note: "The neighbour farms this plot and has the title." } });

  /* Gatundu (v-108, no agent yet): only what the cooperative's records give. */
  add("ki-501", M.gat, "CROP", { source: "COOPERATIVE_RECORD", by: null, status: "VERIFIED", at: "2026-10-01T02:00:00+03:00", created: "2026-10-01T02:00:00+03:00", data: { value_chain: "vc-horti", acres: null, is_main: true }, details: { note: "Avocado delivered to Gatundu Avocado Growers" } });

  /* ------------------------------------------------------------ queries */
  var byId = {};
  visits.concat(items, agents).forEach(function (x) { byId[x.id] = x; });
  var addMonths = function (iso, n) { var d = new Date(iso.slice(0, 10) + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };

  /** Whether an item's check counts today (note 20): current, VERIFIED, within its period, and its visit APPROVED (or no visit). */
  function counts(it, today) {
    today = today || GF.TODAY;
    if (it.ended_at || it.status !== "VERIFIED") return false;
    var v = it.verification ? byId[it.verification] : null;
    if (v && v.status !== "APPROVED") return false;
    var at = it.verified_at || (v && v.reviewed_at);
    if (!at) return false;
    var m = TYPES[it.data_type].months;
    return !m || addMonths(at, m) >= today;
  }
  function validUntil(it) {
    var v = it.verification ? byId[it.verification] : null, at = it.verified_at || (v && v.status === "APPROVED" && v.reviewed_at);
    var m = TYPES[it.data_type].months;
    return at && m ? addMonths(at, m) : null;
  }
  function current(memberId, type) { return items.filter(function (i) { return i.member === memberId && !i.ended_at && (!type || i.data_type === type); }); }
  function background(memberId) { return current(memberId, "BACKGROUND")[0]; }

  /** Per type: current items, and whether lending's need is met (note 20, "Lending needs"). */
  function standing(memberId) {
    var bg = background(memberId);
    var rows = ORDER.map(function (t) {
      var cur = current(memberId, t), need = TYPES[t].need, ok;
      if (need === "VERIFIED") ok = cur.some(function (i) { return counts(i); });
      else if (need === "ONE_VERIFIED") ok = cur.some(function (i) { return counts(i); });
      else if (need === "PRESENT") ok = cur.length > 0;
      else if (need === "PRESENT_OR_NONE") ok = cur.length > 0 || (bg && bg.details[t === "INCOME" ? "has_other_income" : "has_obligations"] === false);
      else ok = true;
      return { type: t, items: cur, ok: ok, verified: cur.filter(function (i) { return counts(i); }).length };
    });
    return { rows: rows, verified: rows.every(function (r) { return r.ok; }) };
  }
  function visitsOf(memberId) { return visits.filter(function (v) { return v.member === memberId; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }); }
  function liveVisit(memberId) { return visits.find(function (v) { return v.member === memberId && (v.status === "OPEN" || v.status === "SUBMITTED"); }); }
  /** Items a visit checked, plus the member's other current items (the review shows both). */
  function ofVisit(vId) { return items.filter(function (i) { return i.verification === vId; }); }
  function historyOf(vId) { return history.filter(function (h) { return h.verification === vId; }); }
  function sentBack(v) { var h = historyOf(v.id).filter(function (x) { return x.from_status === "SUBMITTED" && x.to_status === "OPEN"; }); return h[h.length - 1] || null; }
  function farmMoney(memberId) {
    var ob = current(memberId, "OBLIGATION");
    return { owed: ob.reduce(function (s, i) { return s + i.data.owed_cents; }, 0), monthly: ob.reduce(function (s, i) { return s + i.data.monthly_cents; }, 0) };
  }

  GF.kyc = {
    TYPES: TYPES, ORDER: ORDER, DECLARED_ONLY: DECLARED_ONLY, L: L, M: M,
    agents: agents, visits: visits, items: items, history: history,
    get: function (id) { return byId[id]; },
    staffName: staffName,
    counts: counts, validUntil: validUntil, current: current, background: background, standing: standing,
    visitsOf: visitsOf, liveVisit: liveVisit, ofVisit: ofVisit, historyOf: historyOf, sentBack: sentBack, obligations: farmMoney,
    /** The record's ID compared with the IDENTITY item (note 20: approval waits on a mismatch). */
    recordDiffers: function (memberId) {
      var it = current(memberId, "IDENTITY")[0], m = GF.get(memberId);
      if (!it) return [];
      var out = [];
      if (it.data.id_number !== m.id_number) out.push("ID number");
      if (it.data.full_name.toLowerCase() !== m.full_name.toLowerCase()) out.push("name");
      if (it.data.date_of_birth && m.date_of_birth && it.data.date_of_birth !== m.date_of_birth) out.push("birth date");
      return out;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
