/* groups.js: Growth Circles' fictional data (phase 12, UI-70; design/23-groups.md,
 * models and services signed off 2026-11-08). Loaded after canon.js and kyc.js
 * (agents and KYC standing come from there); adds GF.groups. Nothing here is a
 * real person or place.
 *
 * Shapes follow note 23: Circle rows (status, agent, borrowing_spaces,
 * completed_at, dissolved_*, details.meeting) and CircleMember places (role,
 * status, invited_by, objection_ends_at, joined_at, ended_*, end_reason,
 * details.note). Status changes, agent and spaces changes and SMS-code
 * acceptances live in the audit trail (no history table), here `audit`.
 *
 * The story, on "now" (Fri 30 Oct 2026, 10:30):
 *   Umoja Gathiru (Kijani)      FORMING: Wanjiku leads; 2 members, 2 joining, 1 invited; one didn't join (objected), one declined.
 *                               Kevin assigned early (S3), which opened v-101; Joseph's joining opened v-102
 *   Tujenge Kiamwangi (Kijani)  COMPLETE since 28 Oct, no agent yet: started by GroFunder for members without the app (Q6)
 *   Ndumberi Wakulima (Kijani)  COMPLETE, Mercy; 3 borrowing spaces (raised); Jane is suspended and keeps her place; one left, one removed
 *   Kiamwangi Vijana (Kijani)   DISSOLVED, EMPTIED: its last member exited the cooperative
 *   Kahawa Bora (Mawingu)       COMPLETE, Mercy: Wanjiku's other membership (a member, not the leader)
 *   Gitimu Vijana (Mawingu)     DISSOLVED by GroFunder
 *   Kiganjo Pamoja (Gatundu)    DISSOLVED, NEVER_COMPLETED after 60 days
 *   Juja Farm Mothers (Ruiru)   FORMING while Ruiru is ON_HOLD: nothing new starts
 */
(function (root) {
  "use strict";
  var GF = root.GF, K = GF.kyc;

  /* GROFUNDER['GROUPS'] (note 23, Rules): one setting for every cooperative (Q2). */
  var RULES = { MIN_SIZE: 5, MAX_SIZE: 10, OBJECTION_WINDOW_DAYS: 5, INVITATION_DAYS: 14, DEFAULT_BORROWING_SPACES: 2 };

  var L = {
    status: { FORMING: ["info", "Forming"], COMPLETE: ["success", "Complete"], DISSOLVED: ["neutral", "Dissolved"] },
    place: { INVITED: ["info", "Invited"], JOINING: ["warning", "Joining"], MEMBER: ["success", "Member"], DECLINED: ["neutral", "Declined"], CANCELLED: ["neutral", "Cancelled"],
      OBJECTED: ["error", "Objected to"], LEFT: ["neutral", "Left"], REMOVED: ["neutral", "Removed"] },
    dissolve: { BY_LEADER: "By the leader", BY_GROFUNDER: "By GroFunder", NEVER_COMPLETED: "Didn't fill in 60 days", EMPTIED: "Its last member left" },
    end: { MEMBER_EXITED: "Left the cooperative", BY_LEADER: "Removed by the leader", BY_GROFUNDER: "Removed by GroFunder", CIRCLE_DISSOLVED: "Circle dissolved", EXPIRED: "Not answered in 14 days", WITHDRAWN: "Withdrawn" },
    day: { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday", SUN: "Sunday" }
  };

  var circles = [
    { id: "ci-kij-01", cooperative: "co-kijani", cluster: "cl-kij-gathiru", name: "Umoja Gathiru", status: "FORMING", agent: "u-kevin", borrowing_spaces: 2,
      completed_at: null, dissolved_at: null, dissolved_by: null, dissolve_reason: "", created_by: "u-wanjiku", created_at: "2026-10-19T09:00:00+03:00", updated_at: "2026-10-29T07:45:00+03:00",
      details: { meeting: { day: "TUE", time: "14:00", place: "Gathiru collection centre, after the afternoon collection", lat: -1.11893, lng: 36.83521 }, description: "Dairy farmers from Gathiru who have delivered together for years." } },
    { id: "ci-kij-02", cooperative: "co-kijani", cluster: "cl-kij-kiamwangi", name: "Tujenge Kiamwangi", status: "COMPLETE", agent: null, borrowing_spaces: 2,
      completed_at: "2026-10-28T15:00:00+03:00", dissolved_at: null, dissolved_by: null, dissolve_reason: "", created_by: "u-brian", created_at: "2026-10-14T10:00:00+03:00", updated_at: "2026-10-29T09:00:00+03:00",
      details: { meeting: { day: "THU", time: "10:00", place: "Kiamwangi church hall", lat: null, lng: null }, description: "" } },
    { id: "ci-kij-03", cooperative: "co-kijani", cluster: "cl-kij-ndumberi", name: "Ndumberi Wakulima", status: "COMPLETE", agent: "u-mercy", borrowing_spaces: 3,
      completed_at: "2026-08-11T09:00:00+03:00", dissolved_at: null, dissolved_by: null, dissolve_reason: "", created_by: "u-m-kij-M-0013", created_at: "2026-07-20T09:00:00+03:00", updated_at: "2026-10-10T16:00:00+03:00",
      details: { meeting: { day: "SAT", time: "08:00", place: "Ndumberi primary school", lat: -1.14102, lng: 36.84455 }, description: "We share a bull and a milk cooler." } },
    { id: "ci-kij-04", cooperative: "co-kijani", cluster: "cl-kij-kiamwangi", name: "Kiamwangi Vijana", status: "DISSOLVED", agent: null, borrowing_spaces: 2,
      completed_at: null, dissolved_at: "2026-08-30T10:00:00+03:00", dissolved_by: null, dissolve_reason: "EMPTIED", created_by: "u-brian", created_at: "2026-07-10T09:00:00+03:00", updated_at: "2026-08-30T10:00:00+03:00",
      details: { meeting: { day: "MON", time: "16:00", place: "Kiamwangi shopping centre", lat: null, lng: null }, description: "" } },
    { id: "ci-maw-01", cooperative: "co-mawingu", cluster: "cl-maw-mawingu", name: "Kahawa Bora", status: "COMPLETE", agent: "u-mercy", borrowing_spaces: 2,
      completed_at: "2026-10-12T11:00:00+03:00", dissolved_at: null, dissolved_by: null, dissolve_reason: "", created_by: "u-peter", created_at: "2026-09-29T09:00:00+03:00", updated_at: "2026-10-20T08:40:00+03:00",
      details: { meeting: { day: "WED", time: "15:00", place: "Mawingu factory buying centre", lat: -0.48021, lng: 37.13116 }, description: "Coffee farmers who deliver to the Mawingu factory." } },
    { id: "ci-maw-02", cooperative: "co-mawingu", cluster: "cl-maw-gitimu", name: "Gitimu Vijana", status: "DISSOLVED", agent: null, borrowing_spaces: 2,
      completed_at: null, dissolved_at: "2026-09-15T14:00:00+03:00", dissolved_by: "u-brian", dissolve_reason: "BY_GROFUNDER", created_by: "u-peter", created_at: "2026-08-18T09:00:00+03:00", updated_at: "2026-09-15T14:00:00+03:00",
      details: { meeting: { day: "FRI", time: "09:00", place: "Gitimu factory", lat: null, lng: null }, description: "" } },
    { id: "ci-gat-01", cooperative: "co-gatundu", cluster: "cl-gat-kiganjo", name: "Kiganjo Pamoja", status: "DISSOLVED", agent: null, borrowing_spaces: 2,
      completed_at: null, dissolved_at: "2026-10-09T00:15:00+03:00", dissolved_by: null, dissolve_reason: "NEVER_COMPLETED", created_by: "u-brian", created_at: "2026-08-10T09:00:00+03:00", updated_at: "2026-10-09T00:15:00+03:00",
      details: { meeting: { day: "WED", time: "11:00", place: "Kiganjo market", lat: null, lng: null }, description: "" } },
    { id: "ci-rui-01", cooperative: "co-ruiru", cluster: "cl-rui-juja", name: "Juja Farm Mothers", status: "FORMING", agent: null, borrowing_spaces: 2,
      completed_at: null, dissolved_at: null, dissolved_by: null, dissolve_reason: "", created_by: "u-brian", created_at: "2026-10-02T10:00:00+03:00", updated_at: "2026-10-27T00:15:00+03:00",
      details: { meeting: { day: "SUN", time: "14:00", place: "Juja Farm chief's camp", lat: null, lng: null }, description: "" } }
  ];

  /* Places. o: by (invited_by), at (invited_at), ends (objection_ends_at), joined, ended, end_by, why (end_reason), note. */
  var places = [];
  function p(id, circle, member, role, status, o) {
    places.push({ id: id, circle: circle, member: member, role: role, status: status, invited_by: o.by || null, invited_at: o.at, objection_ends_at: o.ends || null,
      joined_at: o.joined || null, ended_at: o.ended || null, ended_by: o.end_by || null, end_reason: o.why || "", details: o.note ? { note: o.note } : {} });
  }
  var T = function (d, t) { return "2026-" + d + "T" + (t || "09:00") + ":00+03:00"; };

  /* Umoja Gathiru: Wanjiku invited five on 19 Oct; Margaret later, after Joshua declined. */
  p("cp-101", "ci-kij-01", "m-kij-0142", "LEADER", "MEMBER", { at: T("10-19"), joined: T("10-19") });
  p("cp-102", "ci-kij-01", "m-kij-0088", "MEMBER", "MEMBER", { by: "u-wanjiku", at: T("10-19"), joined: T("10-26", "09:15") });
  p("cp-103", "ci-kij-01", "m-kij-M-0002", "MEMBER", "JOINING", { by: "u-wanjiku", at: T("10-19"), ends: T("11-02", "18:20") });
  p("cp-104", "ci-kij-01", "m-kij-M-0006", "MEMBER", "JOINING", { by: "u-wanjiku", at: T("10-27", "08:30"), ends: T("11-03", "07:45") });
  p("cp-105", "ci-kij-01", "m-kij-M-0009", "MEMBER", "INVITED", { by: "u-wanjiku", at: T("10-19") });
  p("cp-106", "ci-kij-01", "m-kij-M-0008", "MEMBER", "DECLINED", { by: "u-wanjiku", at: T("10-19"), ended: T("10-20", "19:05") });
  p("cp-107", "ci-kij-01", "m-kij-M-0023", "MEMBER", "OBJECTED", { by: "u-wanjiku", at: T("10-19"), ends: T("10-27", "12:00"), ended: T("10-23", "20:10"), end_by: "u-m-kij-0088",
    note: "He still owes me for a heifer from last year." });

  /* Tujenge Kiamwangi: Brian started it for Mumbi, whose members have no app; most accepted by SMS code. */
  p("cp-201", "ci-kij-02", "m-kij-M-0004", "LEADER", "MEMBER", { at: T("10-14", "10:00"), joined: T("10-14", "10:00") });
  p("cp-202", "ci-kij-02", "m-kij-0217", "MEMBER", "MEMBER", { by: "u-brian", at: T("10-14", "10:00"), joined: T("10-22", "11:00") });
  p("cp-203", "ci-kij-02", "m-kij-0031", "MEMBER", "MEMBER", { by: "u-brian", at: T("10-14", "10:00"), joined: T("10-23", "09:30") });
  p("cp-204", "ci-kij-02", "m-kij-M-0005", "MEMBER", "MEMBER", { by: "u-brian", at: T("10-14", "10:00"), joined: T("10-25", "14:00") });
  p("cp-205", "ci-kij-02", "m-kij-M-0011", "MEMBER", "MEMBER", { by: "u-brian", at: T("10-14", "10:00"), joined: T("10-28", "15:00") });
  p("cp-206", "ci-kij-02", "m-kij-M-0012", "MEMBER", "MEMBER", { by: "u-brian", at: T("10-14", "10:00"), joined: T("10-29", "09:00") });
  p("cp-207", "ci-kij-02", "m-kij-M-0020", "MEMBER", "INVITED", { by: "u-brian", at: T("10-27", "10:00") });

  /* Ndumberi Wakulima: Peter Gathogo started it in the app. */
  p("cp-301", "ci-kij-03", "m-kij-M-0013", "LEADER", "MEMBER", { at: T("07-20"), joined: T("07-20") });
  p("cp-302", "ci-kij-03", "m-kij-0412", "MEMBER", "MEMBER", { by: "u-m-kij-M-0013", at: T("07-20"), joined: T("07-27") });
  p("cp-303", "ci-kij-03", "m-kij-0199", "MEMBER", "MEMBER", { by: "u-m-kij-M-0013", at: T("07-20"), joined: T("07-28", "10:00") });
  p("cp-304", "ci-kij-03", "m-kij-M-0007", "MEMBER", "MEMBER", { by: "u-m-kij-M-0013", at: T("07-20"), joined: T("07-29") });
  p("cp-305", "ci-kij-03", "m-kij-M-0014", "MEMBER", "MEMBER", { by: "u-m-kij-M-0013", at: T("07-20"), joined: T("08-11") });
  p("cp-306", "ci-kij-03", "m-kij-M-0027", "MEMBER", "MEMBER", { by: "u-m-kij-M-0013", at: T("08-12"), joined: T("08-20") });
  p("cp-307", "ci-kij-03", "m-kij-M-0028", "MEMBER", "MEMBER", { by: "u-m-kij-M-0013", at: T("08-28"), joined: T("09-05") });
  p("cp-308", "ci-kij-03", "m-kij-M-0032", "MEMBER", "LEFT", { by: "u-m-kij-M-0013", at: T("08-15"), joined: T("08-25"), ended: T("10-10", "16:00"), end_by: null });
  p("cp-309", "ci-kij-03", "m-kij-M-0041", "MEMBER", "REMOVED", { by: "u-m-kij-M-0013", at: T("07-20"), joined: T("07-30"), ended: T("09-20", "12:00"), end_by: "u-brian", why: "BY_GROFUNDER",
    note: "Moved to Nairobi for work and asked to be taken off. He has no app." });

  /* Kiamwangi Vijana: Daniel's circle never filled; he was its last member when he exited the cooperative (EMPTIED). */
  p("cp-401", "ci-kij-04", "m-kij-0077", "LEADER", "REMOVED", { at: T("07-10"), joined: T("07-10"), ended: T("08-30", "10:00"), why: "MEMBER_EXITED" });
  p("cp-402", "ci-kij-04", "m-kij-M-0021", "MEMBER", "LEFT", { by: "u-brian", at: T("07-10"), joined: T("07-16"), ended: T("08-12", "17:30") });
  p("cp-403", "ci-kij-04", "m-kij-M-0019", "MEMBER", "CANCELLED", { by: "u-brian", at: T("07-10"), ended: T("07-24", "09:15"), why: "EXPIRED" });
  p("cp-404", "ci-kij-04", "m-kij-M-0022", "MEMBER", "DECLINED", { by: "u-brian", at: T("07-10"), ended: T("07-11", "10:00") });
  p("cp-405", "ci-kij-04", "m-kij-M-0020", "MEMBER", "CANCELLED", { by: "u-brian", at: T("07-10"), ended: T("07-24", "09:15"), why: "EXPIRED" });

  /* Kahawa Bora: Peter started it for Otieno; Wanjiku accepted in the app. */
  p("cp-501", "ci-maw-01", "m-maw-MCG-0001", "LEADER", "MEMBER", { at: T("09-29"), joined: T("09-29") });
  p("cp-502", "ci-maw-01", "m-maw-0907", "MEMBER", "MEMBER", { by: "u-peter", at: T("09-29"), joined: T("10-06", "20:15") });
  p("cp-503", "ci-maw-01", "m-maw-MCG-0004", "MEMBER", "MEMBER", { by: "u-peter", at: T("09-29"), joined: T("10-06") });
  p("cp-504", "ci-maw-01", "m-maw-MCG-0005", "MEMBER", "MEMBER", { by: "u-peter", at: T("09-29"), joined: T("10-08", "14:00") });
  p("cp-505", "ci-maw-01", "m-maw-MCG-0011", "MEMBER", "MEMBER", { by: "u-peter", at: T("09-29"), joined: T("10-12", "11:00") });
  p("cp-506", "ci-maw-01", "m-maw-MCG-0012", "MEMBER", "MEMBER", { by: "u-peter", at: T("10-08"), joined: T("10-15", "10:00") });

  /* Gitimu Vijana: dissolved by GroFunder at the members' request. */
  p("cp-601", "ci-maw-02", "m-maw-MCG-0002", "LEADER", "REMOVED", { at: T("08-18"), joined: T("08-18"), ended: T("09-15", "14:00"), why: "CIRCLE_DISSOLVED" });
  p("cp-602", "ci-maw-02", "m-maw-MCG-0003", "MEMBER", "REMOVED", { by: "u-peter", at: T("08-18"), joined: T("08-25"), ended: T("09-15", "14:00"), why: "CIRCLE_DISSOLVED" });
  p("cp-603", "ci-maw-02", "m-maw-MCG-0006", "MEMBER", "REMOVED", { by: "u-peter", at: T("08-18"), joined: T("08-26"), ended: T("09-15", "14:00"), why: "CIRCLE_DISSOLVED" });
  p("cp-604", "ci-maw-02", "m-maw-MCG-0008", "MEMBER", "CANCELLED", { by: "u-peter", at: T("09-05"), ended: T("09-15", "14:00"), why: "WITHDRAWN" });
  p("cp-605", "ci-maw-02", "m-maw-MCG-0009", "MEMBER", "DECLINED", { by: "u-peter", at: T("08-18"), ended: T("08-20", "18:00") });
  p("cp-606", "ci-maw-02", "m-maw-MCG-0010", "MEMBER", "DECLINED", { by: "u-peter", at: T("08-18"), ended: T("08-22", "08:40") });

  /* Kiganjo Pamoja: only Chebet; the invitations ran out, and 60 days later the service dissolved it. */
  p("cp-701", "ci-gat-01", "m-gat-GA-0001", "LEADER", "REMOVED", { at: T("08-10"), joined: T("08-10"), ended: T("10-09", "00:15"), why: "CIRCLE_DISSOLVED" });
  p("cp-702", "ci-gat-01", "m-gat-GA-0002", "MEMBER", "CANCELLED", { by: "u-brian", at: T("08-10"), ended: T("08-24", "09:15"), why: "EXPIRED" });
  p("cp-703", "ci-gat-01", "m-gat-GA-0003", "MEMBER", "DECLINED", { by: "u-brian", at: T("08-10"), ended: T("08-12", "15:00") });
  p("cp-704", "ci-gat-01", "m-gat-GA-0004", "MEMBER", "CANCELLED", { by: "u-brian", at: T("08-10"), ended: T("08-24", "09:15"), why: "EXPIRED" });
  p("cp-705", "ci-gat-01", "m-gat-GA-0005", "MEMBER", "CANCELLED", { by: "u-brian", at: T("08-10"), ended: T("08-24", "09:15"), why: "EXPIRED" });

  /* Juja Farm Mothers: three members when Ruiru went on hold on 14 Oct; the last invitation ran out. */
  p("cp-801", "ci-rui-01", "m-rui-RH-0003", "LEADER", "MEMBER", { at: T("10-02", "10:00"), joined: T("10-02", "10:00") });
  p("cp-802", "ci-rui-01", "m-rui-RH-0008", "MEMBER", "MEMBER", { by: "u-brian", at: T("10-02", "10:00"), joined: T("10-08", "12:00") });
  p("cp-803", "ci-rui-01", "m-rui-RH-0016", "MEMBER", "MEMBER", { by: "u-brian", at: T("10-02", "10:00"), joined: T("10-09", "16:30") });
  p("cp-804", "ci-rui-01", "m-rui-RH-0005", "MEMBER", "CANCELLED", { by: "u-brian", at: T("10-02", "10:00"), ended: T("10-16", "10:15"), why: "EXPIRED" });
  p("cp-805", "ci-rui-01", "m-rui-RH-0004", "MEMBER", "DECLINED", { by: "u-brian", at: T("10-02", "10:00"), ended: T("10-04", "07:30") });
  p("cp-806", "ci-rui-01", "m-rui-RH-0009", "MEMBER", "CANCELLED", { by: "u-brian", at: T("10-13", "11:00"), ended: T("10-27", "11:15"), why: "EXPIRED" });

  /* The audit trail's entries for circles (note 23: no history table). */
  var audit = [
    ["ci-kij-01", T("10-19"), "u-wanjiku", "Started in the app, with five invitations"],
    ["ci-kij-01", T("10-21", "11:02"), "u-brian", "Agent assigned: Kevin Odhiambo"],
    ["ci-kij-01", T("10-23", "20:10"), "u-m-kij-0088", "Objected to Kamau Waweru joining"],
    ["ci-kij-01", T("10-27", "08:30"), "u-wanjiku", "Invited Margaret Githinji"],
    ["ci-kij-02", T("10-14", "10:00"), "u-brian", "Started in the console for Mumbi Waweru, with five invitations"],
    ["ci-kij-02", T("10-17", "11:00"), "u-brian", "Accepted for Mary Njeri with an SMS code"],
    ["ci-kij-02", T("10-18", "09:30"), "u-brian", "Accepted for Samuel Kariuki with an SMS code"],
    ["ci-kij-02", T("10-20", "14:00"), "u-brian", "Accepted for Muthoni Thuku with an SMS code"],
    ["ci-kij-02", T("10-28", "15:00"), null, "Complete: 5 members"],
    ["ci-kij-03", T("07-20"), "u-m-kij-M-0013", "Started in the app, with four invitations"],
    ["ci-kij-03", T("08-03", "10:00"), "u-peter", "Agent assigned: Mercy Chebet"],
    ["ci-kij-03", T("08-11"), null, "Complete: 5 members"],
    ["ci-kij-03", T("09-20", "12:00"), "u-brian", "Removed James Njoroge: \"Moved to Nairobi for work and asked to be taken off. He has no app.\""],
    ["ci-kij-03", T("10-05", "11:20"), "u-peter", "Borrowing spaces 2 → 3: \"Seven members; the cooperative asked for a third space for the planting season.\""],
    ["ci-kij-04", T("07-10"), "u-brian", "Started in the console for Daniel Kiprotich, with four invitations"],
    ["ci-kij-04", T("08-30", "10:00"), null, "Dissolved: its last member exited the cooperative"],
    ["ci-maw-01", T("09-29"), "u-peter", "Started in the console for Otieno Wanyoike, with four invitations"],
    ["ci-maw-01", T("10-12", "11:00"), null, "Complete: 5 members"],
    ["ci-maw-01", T("10-20", "08:40"), "u-peter", "Agent assigned: Mercy Chebet"],
    ["ci-maw-02", T("08-18"), "u-peter", "Started in the console for Kimani Kiarie, with five invitations"],
    ["ci-maw-02", T("09-15", "14:00"), "u-brian", "Dissolved: \"The members asked us to; most deliver to the Mawingu factory now.\""],
    ["ci-gat-01", T("08-10"), "u-brian", "Started in the console for Chebet Kibe, with four invitations"],
    ["ci-gat-01", T("10-09", "00:15"), null, "Dissolved: fewer than 2 members after 60 days"],
    ["ci-rui-01", T("10-02", "10:00"), "u-brian", "Started in the console for Teresia Karanja, with four invitations"]
  ].map(function (a) { return { circle: a[0], at: a[1], by: a[2], text: a[3] }; });

  /* Stand-in for loans (26, not designed): a member of Kahawa Bora behind on a loan,
   * as the circle would see it (note 23 Q4: name, days late, amount overdue only).
   * Shown only in the member app's "late" state (G72). */
  var lateStandIn = { circle: "ci-maw-01", member: "m-maw-MCG-0005", days_late: 12, overdue_cents: 245000 };

  /* ------------------------------------------------------------ reading */
  var byId = {};
  circles.forEach(function (c) { byId[c.id] = c; });
  places.forEach(function (x) { byId[x.id] = x; });
  var OPEN = ["INVITED", "JOINING", "MEMBER"];

  /** A login's name: GroFunder staff, an agent, or a member's own login. */
  function who(userId) {
    if (!userId) return "GroFunder (automatic)";
    var s = GF.get(userId); if (s && s.name) return s.name;
    if (K) { var a = K.agents.find(function (x) { return x.id === userId; }); if (a) return a.name; }
    var m = GF.members.find(function (x) { return x.user === userId; });
    return m ? m.full_name : userId;
  }
  function placesOf(circleId, statuses) { return places.filter(function (x) { return x.circle === circleId && (!statuses || statuses.indexOf(x.status) > -1); }); }
  function count(circleId, status) { return placesOf(circleId, [status || "MEMBER"]).length; }
  /** The member's current place (JOINING or MEMBER), as one circle at a time. */
  function placeOf(memberId) { return places.find(function (x) { return x.member === memberId && (x.status === "JOINING" || x.status === "MEMBER"); }); }
  function circleOf(memberId) { var x = placeOf(memberId); return x ? byId[x.circle] : null; }
  function invitationsOf(memberId) { return places.filter(function (x) { return x.member === memberId && x.status === "INVITED"; }); }
  function leaderOf(circleId) { return places.find(function (x) { return x.circle === circleId && x.role === "LEADER" && x.status === "MEMBER"; }); }
  function addDays(iso, n) { var d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString(); }
  function expiresAt(place) { return addDays(place.invited_at, RULES.INVITATION_DAYS); }
  function daysLeft(iso) { return Math.max(0, Math.ceil((new Date(iso) - new Date(GF.NOW)) / 86400000)); }
  /** groups.services.standing (note 23): the circle and, per member, whether KYC counts now. A suspended member never counts. */
  function standing(circleId) {
    var members = placesOf(circleId, ["MEMBER"]);
    var rows = members.map(function (x) {
      var m = GF.get(x.member), ok = K ? K.standing(m.id).verified : null;
      return { place: x, member: m, suspended: m.status === "SUSPENDED", verified: m.status === "SUSPENDED" ? false : ok };
    });
    return { rows: rows, count: members.length, all_verified: rows.length > 0 && rows.every(function (r) { return r.verified; }) };
  }
  function meetingLine(c) { var g = c.details.meeting; return L.day[g.day] + "s at " + g.time + " · " + g.place; }
  /** What a cooperative's status allows (note 23, S&E): ON_HOLD stops new work; ENDED is read only. */
  function newWork(c) { var s = GF.get(c.cooperative).status; return s === "ACTIVE" || s === "ONBOARDING"; }
  /** candidates (S1): ACTIVE, same cooperative and cluster, no JOINING or MEMBER place; name, number and cluster only. */
  function candidates(coop, cluster, q, skip) {
    q = (q || "").trim().toLowerCase(); skip = skip || [];
    return GF.members.filter(function (m) {
      return m.cooperative === coop && (!cluster || m.cluster === cluster) && m.status === "ACTIVE" && !placeOf(m.id) && skip.indexOf(m.id) === -1 &&
        (!q || m.full_name.toLowerCase().indexOf(q) > -1 || m.member_no.toLowerCase().indexOf(q) > -1);
    }).slice(0, 20);
  }

  GF.groups = {
    RULES: RULES, L: L, circles: circles, places: places, audit: audit, OPEN: OPEN, lateStandIn: lateStandIn,
    get: function (id) { return byId[id]; }, who: who, placesOf: placesOf, count: count, placeOf: placeOf, circleOf: circleOf, invitationsOf: invitationsOf,
    leaderOf: leaderOf, expiresAt: expiresAt, daysLeft: daysLeft, addDays: addDays, standing: standing, meetingLine: meetingLine, newWork: newWork, candidates: candidates,
    auditOf: function (id) { return audit.filter(function (a) { return a.circle === id; }).sort(function (a, b) { return a.at < b.at ? 1 : -1; }); },
    needsAgent: function () { return circles.filter(function (c) { return c.status === "COMPLETE" && !c.agent; }); }
  };
  /* KYC visits name the circle that opened them (note 20, Verification.circle). */
  if (K) K.circles = circles;
})(typeof window !== "undefined" ? window : globalThis);
