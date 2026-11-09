/* screens.js: every screen the signed-off apps (notes 01–09) need, by surface.
 * Phase 3's inventory (UI-10). One source: sitemap.html draws it, and
 * tools/screens-md.mjs writes mockups/screens.md from it.
 *
 * Who sees a screen is worked out from the permission codes it needs, using
 * the standard roles in note 09, so the inventory can't drift from the
 * permission design. `owner` means the kit's account owners (team and roles).
 *
 * Fields: id, title, kind (dashboard | list | detail | form | flow | dialog |
 * sheet | settings | signed-out), purpose, notes (design notes it draws from),
 * codes (any one of them opens the screen; [] = any signed-in person on that
 * surface), phase (the flow that draws it), href (a drawn page, or none yet),
 * kit (true when the kit already has the screen and GroFunder only themes it).
 */
(function (root) {
  "use strict";

  /* Standard roles and their codes (note 09). */
  var COOP_ALL = ["cooperatives.view", "cooperatives.edit_profile", "cooperatives.manage_clusters", "members.view", "members.manage", "members.configure",
    "produce.view", "produce.record", "produce.configure", "payouts.view", "payouts.record", "payouts.configure"];
  var GF_VIEW = ["cooperatives.view", "members.view", "produce.view", "payouts.view"];
  /* KYC codes (note 20, draft revision 2): view, open and assign, review. */
  var KYC_OFFICE = ["kyc.view", "kyc.assign", "kyc.review"];
  /* Growth Circle codes (note 23): view, manage, assign; agents hold groups.assigned. */
  var GROUPS_OFFICE = ["groups.view", "groups.manage", "groups.assign"];
  /* Lending partner codes (note 24): view for every office role; manage, publish and settle
   * for Full and Owner; credentials for the Owner only. */
  var LP_FULL = ["lending_partners.view", "lending_partners.manage", "lending_partners.publish", "lending_partners.settle"];
  /* Credit codes (note 25): view for every office role; override and recalculate for Operations
   * and up; publish (rule sets, overrides above the ladder) for Full and Owner. */
  var CREDIT_OPS = ["credit.view", "credit.override", "credit.recalculate"];
  /* Consent codes (note 22): view for every office role; record (an SMS code) and withdraw for Operations
   * and up, and record for agents on their own visits; manage (drafts, binding) for Full; publish for the Owner. */
  var CONSENTS_OPS = ["consents.view", "consents.record", "consents.withdraw"];
  /* Loan codes (note 26): view for every office role; prepare for Operations and up; review, manage and
   * pause for Full and Owner; pausing everyone for the Owner only. */
  var LOANS_OPS = ["loans.view", "loans.prepare"], LOANS_FULL = LOANS_OPS.concat(["loans.review", "loans.manage", "loans.pause"]);
  var ROLES = {
    coop: {
      admin: { label: "Administrator", codes: COOP_ALL, owner: true },
      manager: { label: "Manager", codes: COOP_ALL },
      accountant: { label: "Accountant", codes: ["cooperatives.view", "members.view", "produce.view", "payouts.view", "payouts.record", "payouts.configure"] },
      clerk: { label: "Clerk", codes: ["cooperatives.view", "members.view", "produce.view", "produce.record"] },
      viewer: { label: "Viewer", codes: ["cooperatives.view", "members.view", "produce.view", "payouts.view"] }
    },
    gf: {
      owner: { label: "Owner", codes: GF_VIEW.concat(["cooperatives.onboard", "cooperatives.edit_profile", "cooperatives.set_status", "catalog.manage", "places.manage", "member_access.disable"], KYC_OFFICE, GROUPS_OFFICE, LP_FULL, ["lending_partners.credentials"], CREDIT_OPS, ["credit.publish"], CONSENTS_OPS, ["consents.manage", "consents.publish"], LOANS_FULL, ["loans.pause_all"]), owner: true },
      full: { label: "Full", codes: GF_VIEW.concat(["cooperatives.onboard", "cooperatives.edit_profile", "cooperatives.set_status", "catalog.manage", "places.manage", "member_access.disable"], KYC_OFFICE, GROUPS_OFFICE, LP_FULL, CREDIT_OPS, ["credit.publish"], CONSENTS_OPS, ["consents.manage"], LOANS_FULL) },
      ops: { label: "Operations", codes: GF_VIEW.concat(["cooperatives.onboard", "cooperatives.edit_profile"], KYC_OFFICE, GROUPS_OFFICE, ["lending_partners.view"], CREDIT_OPS, CONSENTS_OPS, LOANS_OPS) },
      view: { label: "View only", codes: GF_VIEW.concat(["kyc.view", "groups.view", "lending_partners.view", "credit.view", "consents.view", "loans.view"]) },
      /* Farmer Support Agent (note 20, draft): only their own visits. */
      agent: { label: "Farmer Support Agent", codes: ["kyc.capture", "groups.assigned", "consents.record"] }
    },
    member: { "in": { label: "Signed in", codes: [] }, out: { label: "Signed out", codes: [] } }
  };

  var P = "coop/patterns/", G = "gf/", M = "member/patterns/";
  var SURFACES = [
    { id: "staff", name: "Staff sign-in and account", about: "Shared by the portal and the console: one app, one staff login. Staff in several accounts (a cooperative, GroFunder) switch between them.", roleSet: "coop",
      sections: [
        { label: "Signed out", screens: [
          { id: "S1", title: "Sign in", kind: "signed-out", purpose: "Email, phone or username and password, then an authenticator code if the person turned one on", notes: ["06", "09"], codes: [], phase: 5, href: "coop/auth/sign-in.html", kit: true, signedOut: true },
          { id: "S2", title: "Accept an invitation", kind: "signed-out", purpose: "From the invitation email or a copied link: name and password, then straight into the cooperative; an invalid link says what to do", notes: ["01", "09"], codes: [], phase: 5, href: "coop/auth/accept.html", kit: true, signedOut: true },
          { id: "S3", title: "Forgot password", kind: "signed-out", purpose: "A code by email or SMS, then a new password; ends every session", notes: ["09"], codes: [], phase: 5, href: "coop/auth/forgot.html", kit: true, signedOut: true }
        ] },
        { label: "Signed in", screens: [
          { id: "S4", title: "Account switcher", kind: "sheet", purpose: "Who is signed in, and the accounts to switch to (two cooperatives, or GroFunder)", notes: ["09"], codes: [], phase: 5, href: "coop/home/index.html", kit: true },
          { id: "S5", title: "Your account", kind: "settings", purpose: "Name, email, phone, two-step sign-in, password, recent sign-ins and sign out everywhere", notes: ["09"], codes: [], phase: 5, href: "coop/account/index.html", kit: true },
          { id: "S6", title: "Notifications", kind: "list", purpose: "In-app notices, such as a cooperative's status changing", notes: ["01"], codes: [], phase: 5, href: "coop/account/notifications.html", kit: true }
        ] }
      ] },

    { id: "gf", name: "GroFunder console", about: "Web, for GroFunder staff. Every cooperative, read through the GroFunder account; changes as each role allows.", roleSet: "gf",
      sections: [
        { label: "Overview", dest: "home", screens: [
          { id: "G1", title: "Overview", kind: "dashboard", purpose: "Platform figures, members by county, cooperatives onboarding or on hold, recent status changes", notes: ["01"], codes: ["cooperatives.view"], phase: 4, href: G + "home/index.html" },
          { id: "G2", title: "Search", kind: "sheet", purpose: "Cooperatives by name or registration number; members by name, ID or phone, across cooperatives", notes: ["01", "05"], codes: ["cooperatives.view"], phase: 4, href: G + "home/index.html" }
        ] },
        { label: "Cooperatives", dest: "cooperatives", screens: [
          { id: "G3", title: "Cooperatives", kind: "list", purpose: "Find and compare by status, county or sub-county, value chain and product", notes: ["01"], codes: ["cooperatives.view"], phase: 4, href: G + "cooperatives/index.html"},
          { id: "G4", title: "Add a cooperative", kind: "flow", purpose: "Name, registration number, place, profile and the first administrator's email; ends with the invitation sent and a link to copy", notes: ["01", "04"], codes: ["cooperatives.onboard"], phase: 4, href: G + "cooperatives/new.html" },
          { id: "G5", title: "Cooperative", kind: "detail", purpose: "Status, place, value chains, staff and pending invitations; tabs for profile, products, clusters, documents, members, deliveries, payouts and status history", notes: ["01", "05", "07", "08"], codes: ["cooperatives.view"], phase: 4, href: G + "cooperatives/detail.html" },
          { id: "G6", title: "Edit a cooperative (panel per card)", kind: "sheet", purpose: "From each Profile card: that card's fields in a panel. The registered name and number are GroFunder's alone", notes: ["01"], codes: ["cooperatives.edit_profile"], phase: 4, href: G + "cooperatives/detail.html"},
          { id: "G7", title: "Change status", kind: "dialog", purpose: "From Change status beside the status: only the moves the rules allow; a reason where they ask for one", notes: ["01", "03"], codes: ["cooperatives.set_status"], phase: 4, href: G + "cooperatives/detail.html?c=co-ruiru" },
          { id: "G8", title: "Invite or re-invite an administrator", kind: "dialog", purpose: "From the Staff tab or the onboarding banner: send, resend (the old link stops working), copy the link for WhatsApp or SMS", notes: ["01"], codes: ["cooperatives.onboard"], phase: 4, href: G + "cooperatives/detail.html?c=co-mumbi" },
          { id: "G9", title: "Delete a cooperative", kind: "dialog", purpose: "Only while onboarding and with nothing attached; the one item in the menu", notes: ["01"], codes: ["cooperatives.onboard"], phase: 4, href: G + "cooperatives/detail.html?c=co-mumbi" },
          { id: "G10", title: "Member and their login (panel)", kind: "sheet", purpose: "A cooperative's member as its staff see them, plus whether a login is linked; disable or re-enable the login in a fraud case; verification for loans and Open a verification; their Growth Circle; their consents, taken by SMS code or withdrawn on request; their loans and Prepare a loan", notes: ["05", "06", "20", "23", "22", "26"], codes: ["members.view"], phase: 4, href: G + "cooperatives/detail.html?c=co-kijani&m=m-kij-0142"}
        ] },
        { label: "Reference data", dest: "reference", screens: [
          { id: "G11", title: "Catalog", kind: "list", purpose: "Every value chain as a section with its products; Edit and Add product on each; archive (cascades, counted), reactivate, delete if unused", notes: ["02"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/catalog.html" },
          { id: "G12", title: "Edit a value chain", kind: "dialog", purpose: "Name, Swahili name, what it covers; from the section's visible Edit", notes: ["02"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/catalog.html"},
          { id: "G13", title: "Product and its grades (panel)", kind: "sheet", purpose: "From a product's row: details, unit (locked once used), grades added and edited in place, cooperatives using it", notes: ["02"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/catalog.html?p=p-milk"},
          { id: "G14", title: "Places", kind: "list", purpose: "The 47 counties; a county opens a panel with its sub-counties and wards: add (UI-14), correct, archive", notes: ["04"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/places.html" }
        ] },
        { label: "Team", dest: "team", screens: [
          { id: "G15", title: "GroFunder team", kind: "list", purpose: "GroFunder staff, their roles and pending invitations; invite, change role, remove (the kit's team page)", notes: ["09"], codes: ["owner"], phase: 4, href: G + "team/index.html", kit: true }
        ] },
        { label: "Verifications (KYC, phase 11, note 20 draft)", dest: "kyc", screens: [
          { id: "K1", title: "Verifications", kind: "list", purpose: "Every visit by status (to review first), cooperative, agent and the Growth Circle that opened it; open a verification and assign an agent", notes: ["20", "23"], codes: ["kyc.view"], phase: 11, href: G + "kyc/index.html" },
          { id: "K2", title: "Open a verification", kind: "dialog", purpose: "An ACTIVE member record with no live visit, and optionally an agent; also opened from the member's panel (G10) with the member filled in", notes: ["20"], codes: ["kyc.assign"], phase: 11, href: G + "kyc/index.html?open=1" },
          { id: "K3", title: "Verification", kind: "detail", purpose: "Tabbed by kind of information (UI-62): summary and decision, identification, farms and crops, income and loans, next of kin and home, visit and history; each item with where it came from and what the check found; approve, send back, fail, revoke; assign or cancel", notes: ["20", "05"], codes: ["kyc.view"], phase: 11, href: G + "kyc/visit.html?v=v-101" },
          { id: "K4", title: "Approve, send back or fail", kind: "dialog", purpose: "Never by the agent who did the visit; a reason to send back, a reason and a failure reason to fail or revoke", notes: ["20"], codes: ["kyc.review"], phase: 11, href: G + "kyc/visit.html?v=v-101" }
        ] },
        { label: "Growth Circles (phase 12, note 23)", dest: "groups", screens: [
          { id: "GC1", title: "Growth Circles", kind: "list", purpose: "Every circle by status (open first), cooperative, cluster and agent; the Needs an agent queue; start a circle for members", notes: ["23"], codes: ["groups.view"], phase: 12, href: G + "groups/index.html" },
          { id: "GC2", title: "Growth Circle", kind: "detail", purpose: "Meeting, agent, borrowing spaces; every place from invitation to leaving, with who objected (staff only) and each member's KYC; assign or change the agent, change spaces, invite, answer by SMS code, remove, hand over, dissolve; audit entries", notes: ["23", "20"], codes: ["groups.view"], phase: 12, href: G + "groups/circle.html?c=ci-kij-01" },
          { id: "GC3", title: "Start a circle for members", kind: "flow", purpose: "For members without the app (Q6): leader, name, meeting (with an optional map point) and at least 4 invitations from the leader's cluster", notes: ["23"], codes: ["groups.manage"], phase: 12, href: G + "groups/start.html" }
        ] },
        { label: "Lending partners (phase 13, note 24 part 1)", dest: "partners", screens: [
          { id: "LP1", title: "Lending partners", kind: "list", purpose: "Every partner: code, mode, status, environment, products in force, cooperatives covered", notes: ["24"], codes: ["lending_partners.view"], phase: 13, href: G + "partners/index.html" },
          { id: "LP2", title: "Add a partner", kind: "dialog", purpose: "Name, code, mode, environment, legal details, contact, what members see, texts it sends, remittance cycle; creates its account, onboarding", notes: ["24"], codes: ["lending_partners.manage"], phase: 13, href: G + "partners/index.html" },
          { id: "LP3", title: "Partner", kind: "detail", purpose: "Details and the activation checklist (API waits for L4, portal for L6); the connection with secrets shown only as set (Owner replaces them); products; remittances by period; activate, pause, end", notes: ["24"], codes: ["lending_partners.view"], phase: 13, href: G + "partners/partner.html?p=lp-mavuno" },
          { id: "LP4", title: "Loan product", kind: "detail", purpose: "What it's for in English and Swahili, the purposes members pick, every terms version (in force, scheduled, past, withdrawn, draft) and the cooperatives it covers; draft, link, pause, retire", notes: ["24"], codes: ["lending_partners.view"], phase: 13, href: G + "partners/product.html?pr=pr-mav-dairy" },
          { id: "LP5", title: "Terms version", kind: "detail", purpose: "Limits, repayment, overdue, default and flag days, and each charge with its GroFunder/partner split; a worked example from loans' quote (26); edit a draft, publish (Full and Owner), withdraw a scheduled version", notes: ["24"], codes: ["lending_partners.view"], phase: 13, href: G + "partners/terms.html?t=pt-dairy-4" },
          { id: "LP6", title: "Coverage", kind: "list", purpose: "Which products serve which cooperatives, and whether each is offered today", notes: ["24"], codes: ["lending_partners.view"], phase: 13, href: G + "partners/coverage.html" },
          { id: "LP7", title: "Remittances", kind: "list", purpose: "What partners have paid GroFunder of its share, by period and one by one; record from the bank statement and void (Full and Owner)", notes: ["24"], codes: ["lending_partners.view"], phase: 13, href: G + "partners/remittances.html" }
        ] },
        { label: "Credit (phase 14, note 25)", dest: "credit", screens: [
          { id: "CR1", title: "Credit scores", kind: "list", purpose: "Each scored member's latest score, step and limit that counts; filters by cooperative, step and score", notes: ["25"], codes: ["credit.view"], phase: 14, href: G + "credit/index.html" },
          { id: "CR2", title: "A member's credit", kind: "detail", purpose: "The limit that counts, the latest score factor by factor with its inputs, what the member sees, overrides and every score; recalculate, set a limit or block", notes: ["25"], codes: ["credit.view"], phase: 14, href: G + "credit/member.html?m=m-kij-0142" },
          { id: "CR3", title: "Limit overrides", kind: "list", purpose: "Every limit set by hand and every block, active or ended, with who, why and when it lapses", notes: ["25"], codes: ["credit.view"], phase: 14, href: G + "credit/overrides.html" },
          { id: "CR4", title: "Scoring rule sets", kind: "list", purpose: "Every version, in force, scheduled, past, withdrawn or draft; draft a new one", notes: ["25"], codes: ["credit.view"], phase: 14, href: G + "credit/rules.html" },
          { id: "CR5", title: "Scoring rules version", kind: "detail", purpose: "Factors with weights and settings, the ladder, refresh time; edit and preview a draft, publish, withdraw a scheduled version", notes: ["25"], codes: ["credit.view"], phase: 14, href: G + "credit/rule-set.html?r=rs-4" }
        ] },
        { label: "Loans (phase 16, note 26 part 1)", dest: "loans", screens: [
          { id: "LN1", title: "Loans", kind: "list", purpose: "One queue: requests to review oldest first with their approvals (1 of 2), drafts with their expiry, approved loans waiting to be sent, ended ones; what fails a check now", notes: ["26"], codes: ["loans.view"], phase: 16, href: G + "loans/index.html" },
          { id: "LN2", title: "Prepare a loan", kind: "flow", purpose: "For a member without the app: pick the member (every check, with reasons), then product, amount, duration and purpose with the quote; saves a DRAFT the member accepts within 7 days", notes: ["26"], codes: ["loans.prepare"], phase: 16, href: G + "loans/prepare.html" },
          { id: "LN3", title: "Loan", kind: "detail", purpose: "The request and the quote as accepted, the checks now with a fresh score, the score, override, KYC, circle and spaces, declarations and consents it relies on, reviews and history; approve, reject, cancel; accept a draft by SMS code; forwarding shown as the next step (L4)", notes: ["26", "22"], codes: ["loans.view"], phase: 16, href: G + "loans/loan.html?l=ln-105" },
          { id: "LN4", title: "Approve or reject", kind: "dialog", purpose: "Each approval by a different person, never the drafter or the borrower; the last needed makes it APPROVED; any one rejection ends it, with a reason code and words, prefilled when a check fails", notes: ["26"], codes: ["loans.review"], phase: 16, href: G + "loans/loan.html?l=ln-105" },
          { id: "LN5", title: "Accept a draft by SMS code", kind: "dialog", purpose: "The quote read out from a script, the declarations confirmed, an SMS carrying the key figures, the code read back", notes: ["26", "22"], codes: ["loans.prepare"], phase: 16, href: G + "loans/loan.html?l=ln-104" },
          { id: "LN6", title: "Pauses", kind: "list", purpose: "Pauses in force and ended, for everyone, a cooperative, a cluster or a circle, with the reason and what members see in both languages; start and end (everyone: Owner only)", notes: ["26"], codes: ["loans.view"], phase: 16, href: G + "loans/pauses.html" }
        ] },
        { label: "Consents (phase 15, note 22)", dest: "consents", screens: [
          { id: "CN1", title: "Consent documents", kind: "list", purpose: "GroFunder's documents and each lender's, with the slots they are bound to and the version in force in English and Swahili; flags languages out of step; where members are asked", notes: ["22"], codes: ["consents.view"], phase: 15, href: G + "consents/index.html" },
          { id: "CN2", title: "Consent document", kind: "detail", purpose: "Owner, kind, slots bound; every version per language, in force, scheduled, past, archived or draft; members' decisions; write a new version, bind a lender's document", notes: ["22"], codes: ["consents.view"], phase: 15, href: G + "consents/document.html?d=cd-lending" },
          { id: "CN3", title: "Consent version", kind: "detail", purpose: "One version's wording per language: title, summary, body, change note, whether members agree again, when it was in force, its hash; edit a draft, compare with the version in force", notes: ["22"], codes: ["consents.view"], phase: 15, href: G + "consents/version.html?d=cd-lending&n=2" },
          { id: "CN4", title: "Publish, schedule, take down, archive", kind: "dialog", purpose: "The owner alone: both languages together, now or from a date; refused while one language has no draft; taking down brings back the version before", notes: ["22"], codes: ["consents.publish"], phase: 15, href: G + "consents/version.html?d=cd-lending&n=2" },
          { id: "CN5", title: "Take consent by SMS code", kind: "dialog", purpose: "From the member panel (G10) or the start of a visit (K6): the summary read out in the member's language, a code to the phone on record that says what it is for, the code read back", notes: ["22"], codes: ["consents.record"], phase: 15, href: G + "cooperatives/detail.html?c=co-kijani&m=m-kij-0164" },
          { id: "CN6", title: "Withdraw for a member", kind: "dialog", purpose: "On the member's request, from the member panel: what stops and what carries on, how they asked (phone call, in person) and why", notes: ["22"], codes: ["consents.withdraw"], phase: 15, href: G + "cooperatives/detail.html?c=co-kijani&m=m-kij-0088" }
        ] },
        { label: "My circles (Farmer Support Agent)", dest: "circles", screens: [
          { id: "GC4", title: "My circles", kind: "list", purpose: "The agent's circles: meeting, members' names and phones, and whose KYC visit is still to do", notes: ["23", "20"], codes: ["groups.assigned"], phase: 12, href: G + "groups/agent.html" }
        ] },
        { label: "My visits (Farmer Support Agent)", dest: "visits", screens: [
          { id: "K5", title: "My visits", kind: "list", purpose: "The agent's open visits, those sent back with the reason, and those waiting for review", notes: ["20"], codes: ["kyc.capture"], phase: 11, href: G + "kyc/agent.html" },
          { id: "K6", title: "Visit", kind: "flow", purpose: "Phone-first: lending consent by SMS code first (22), then the checklist of items, each captured or confirmed in a panel (ID, portrait, phone, farms with their points and photos, declared items); submit", notes: ["20"], codes: ["kyc.capture"], phase: 11, href: G + "kyc/capture.html?v=v-102" },
          { id: "K7", title: "Farm (panel)", kind: "sheet", purpose: "Stand on the farm: take its point, size, tenure, whether it is farmed, photos; confirm or correct what the member declared", notes: ["20"], codes: ["kyc.capture"], phase: 11, href: G + "kyc/capture.html?v=v-102&show=farm" }
        ] }
      ] },

    { id: "coop", name: "Cooperative portal", about: "Web, for cooperative staff; on a phone at the collection centres (UI-2).", roleSet: "coop",
      sections: [
        { label: "Home", dest: "home", screens: [
          { id: "C1", title: "Home", kind: "dashboard", purpose: "Today's collection, members, what's still to pay; a set-up checklist while onboarding; the on-hold notice", notes: ["01", "05", "07", "08"], codes: ["cooperatives.view"], phase: 5, href: "coop/home/index.html" },
          { id: "C2", title: "Search", kind: "sheet", purpose: "Members by name, number, ID or phone; deliveries by receipt number", notes: ["05", "07"], codes: ["members.view"], phase: 6, href: "coop/home/index.html" }
        ] },
        { label: "Produce", dest: "produce", screens: [
          { id: "C3", title: "Deliveries", kind: "list", purpose: "By day, product, round and centre, with totals; voided ones marked", notes: ["07"], codes: ["produce.view"], phase: 7, href: "coop/produce/index.html" },
          { id: "C4", title: "Record a delivery", kind: "flow", purpose: "Member, product, grade, quantity in the recording unit, date, round, centre, receipt; soft warnings; stays open for the next", notes: ["07"], codes: ["produce.record"], phase: 7, href: "coop/produce/record.html" },
          { id: "C5", title: "Delivery (panel)", kind: "sheet", purpose: "What was entered and stored, grade, round, centre, receipt, who recorded it, and what has been paid against it", notes: ["07", "08"], codes: ["produce.view"], phase: 7, href: "coop/produce/index.html?d=R-4254" },
          { id: "C6", title: "Edit or void a delivery", kind: "dialog", purpose: "Edit until money has gone against it; void with a reason, never delete", notes: ["07", "08"], codes: ["produce.record"], phase: 7, href: "coop/produce/index.html?d=R-4471" },
          { id: "C7", title: "Import deliveries", kind: "flow", purpose: "Upload a spreadsheet, see every row's problem, import all or nothing", notes: ["07"], codes: ["produce.record"], phase: 7, href: "coop/produce/import.html" },
          { id: "C8", title: "Prices", kind: "list", purpose: "The dated price per product and grade, the one in force today, future prices; add a price per catalog or recording unit", notes: ["07"], codes: ["produce.view"], phase: 7, href: "coop/produce/prices.html" }
        ] },
        { label: "Members", dest: "members", screens: [
          { id: "C9", title: "Members", kind: "list", purpose: "The register: search by name, number, ID or phone; filter by cluster, status and gender", notes: ["05"], codes: ["members.view"], phase: 6, href: "coop/members/index.html" },
          { id: "C10", title: "Add a member", kind: "flow", purpose: "ID type and number (duplicate check), names, phone, cluster, joined date, suggested member number, nominees adding up to 100%", notes: ["05"], codes: ["members.manage"], phase: 6, href: "coop/members/new.html" },
          { id: "C11", title: "Member", kind: "detail", purpose: "Identity, status, figures, and GroFunder's verification and loan standing only; tabs for details, deliveries, payouts and history; positions and nominees", notes: ["05", "07", "08", "20"], codes: ["members.view"], phase: 6, href: "coop/members/member.html?m=m-kij-0142" },
          { id: "C12", title: "Edit a member", kind: "sheet", purpose: "Staff-held details; the member edits their own phone, preferred name, email and language in the app", notes: ["05"], codes: ["members.manage"], phase: 6, href: "coop/members/member.html?m=m-kij-0142" },
          { id: "C13", title: "Change a member's status", kind: "dialog", purpose: "Suspend, reactivate, record an exit (withdrew, expelled, died, transferred), rejoin; reasons as the rules say", notes: ["05", "03"], codes: ["members.manage"], phase: 6, href: "coop/members/member.html?m=m-kij-0412" },
          { id: "C14", title: "Assign or end a position", kind: "dialog", purpose: "Within the position's scope and holder limit", notes: ["05"], codes: ["members.manage"], phase: 6, href: "coop/members/member.html?m=m-kij-0142&tab=positions" },
          { id: "C15", title: "Import members", kind: "flow", purpose: "Upload a spreadsheet, fix rows without an ID, import all or nothing", notes: ["05"], codes: ["members.manage"], phase: 6, href: "coop/members/import.html" }
        ] },
        { label: "Payouts", dest: "payouts", screens: [
          { id: "C16", title: "Payouts", kind: "list", purpose: "Drafts, paid and cancelled, by period, product and method, with totals", notes: ["08"], codes: ["payouts.view"], phase: 8, href: "coop/payouts/index.html" },
          { id: "C17", title: "Start a payout", kind: "dialog", purpose: "A member, deliveries up to a date, optionally one product", notes: ["08"], codes: ["payouts.record"], phase: 8, href: "coop/payouts/index.html?start=1" },
          { id: "C18", title: "Payout draft", kind: "flow", purpose: "Deliveries with a balance: pay in full, a percentage or an amount oldest first, or set one; additions and deductions; where the money goes", notes: ["08"], codes: ["payouts.record"], phase: 8, href: "coop/payouts/draft.html?m=m-kij-0142&to=2026-10-30" },
          { id: "C19", title: "Mark as paid", kind: "dialog", purpose: "Method, reference and date; fixes the deliveries and prices it used", notes: ["08"], codes: ["payouts.record"], phase: 8, href: "coop/payouts/draft.html?p=po-9" },
          { id: "C20", title: "Payout statement", kind: "detail", purpose: "What was paid against which deliveries, what's still owed, additions, deductions, net, and where it went", notes: ["08"], codes: ["payouts.view"], phase: 8, href: "coop/payouts/statement.html?p=po-3" },
          { id: "C21", title: "Cancel a draft", kind: "dialog", purpose: "Nothing was fixed; its items are dropped", notes: ["08"], codes: ["payouts.record"], phase: 8, href: "coop/payouts/draft.html?p=po-9" }
        ] },
        { label: "Settings", dest: "settings", screens: [
          { id: "C22", title: "Profile", kind: "settings", purpose: "About, address, contact, language, logo and documents; the registered name and number read-only (GroFunder changes them)", notes: ["01", "04"], codes: ["cooperatives.edit_profile"], phase: 5, href: "coop/settings/profile.html" },
          { id: "C23", title: "Products", kind: "settings", purpose: "Add from the catalog, recording unit and factor, local name, archive", notes: ["01", "02"], codes: ["cooperatives.edit_profile"], phase: 5, href: "coop/settings/products.html" },
          { id: "C24", title: "Clusters", kind: "settings", purpose: "Create, rename, archive, reactivate (offered when an archived name is typed), delete if never used", notes: ["01"], codes: ["cooperatives.manage_clusters"], phase: 5, href: "coop/settings/clusters.html" },
          { id: "C25", title: "Positions", kind: "settings", purpose: "The cooperative's list: scope and holder limit, starting from the default list", notes: ["05"], codes: ["members.configure"], phase: 5, href: "coop/settings/positions.html" },
          { id: "C26", title: "Collection rounds", kind: "settings", purpose: "Days, times, months, cluster and product per round", notes: ["07"], codes: ["produce.configure"], phase: 5, href: "coop/settings/rounds.html" },
          { id: "C27", title: "Additions and deductions", kind: "settings", purpose: "The named kinds of extra amounts on a payout", notes: ["08"], codes: ["payouts.configure"], phase: 5, href: "coop/settings/pay-items.html" },
          { id: "C28", title: "Team", kind: "settings", purpose: "Staff, their roles, pending invitations; invite, change role, remove (the kit's team page, for owners)", notes: ["09"], codes: ["owner"], phase: 5, href: "coop/settings/team.html", kit: true },
          { id: "C29", title: "Roles", kind: "settings", purpose: "The standard roles, read-only, and the cooperative's own roles built from codes it may use", notes: ["09"], codes: ["owner"], phase: 5, href: "coop/settings/roles.html", kit: true },
          { id: "C30", title: "Notifications", kind: "settings", purpose: "Which status notices reach the staff, by email and in the app; the mandatory ones locked", notes: ["01"], codes: ["cooperatives.edit_profile"], phase: 5, href: "coop/settings/notifications.html" }
        ] }
      ] },

    { id: "member", name: "Member app", about: "Android and iOS, for members. One login reaches every cooperative the member belongs to.", roleSet: "member",
      sections: [
        { label: "Signed out", screens: [
          { id: "M1", title: "Welcome", kind: "signed-out", purpose: "Sign in, or find your membership the first time", notes: ["06"], codes: [], phase: 9, href: "member/auth/welcome.html", signedOut: true },
          { id: "M2", title: "Sign in", kind: "signed-out", purpose: "ID (with its type) or phone, PIN on a keypad, then the SMS code", notes: ["06"], codes: [], phase: 9, href: "member/auth/sign-in.html", signedOut: true },
          { id: "M3", title: "Find your membership (sign up)", kind: "signed-out", purpose: "ID and the phone on the cooperative's record, SMS code, terms, a new PIN; links every matching record", notes: ["06", "05"], codes: [], phase: 9, href: "member/auth/claim.html", signedOut: true },
          { id: "M4", title: "Forgot PIN", kind: "signed-out", purpose: "An SMS code to the phone, then a new PIN; other phones are signed out", notes: ["06"], codes: [], phase: 9, href: "member/auth/forgot.html", signedOut: true }
        ] },
        { label: "Home", dest: "home", screens: [
          { id: "M5", title: "Home", kind: "dashboard", purpose: "This month's deliveries and value, what's been paid, the next collection, recent deliveries and payments", notes: ["07", "08"], codes: [], phase: 9, href: "member/home/index.html" },
          { id: "M6", title: "Switch cooperative", kind: "sheet", purpose: "For members of more than one cooperative (F8)", notes: ["06"], codes: [], phase: 9, href: "member/home/index.html?show=switch" },
          { id: "M7", title: "Link another membership", kind: "flow", purpose: "Offered when a cooperative adds a record with the member's ID: PIN if the phone matches, else an SMS code to the record's phone", notes: ["06"], codes: [], phase: 9, href: "member/home/link.html" },
          { id: "M8", title: "Collection times", kind: "detail", purpose: "The rounds for the member's cluster: days, times, months", notes: ["07"], codes: [], phase: 9, href: "member/home/index.html?show=rounds" }
        ] },
        { label: "Deliveries", dest: "deliveries", screens: [
          { id: "M9", title: "Deliveries", kind: "list", purpose: "By month, with totals; voided ones marked", notes: ["07"], codes: [], phase: 9, href: "member/deliveries/index.html" },
          { id: "M10", title: "Delivery", kind: "detail", purpose: "What was recorded, as entered and as stored, and how much has been paid", notes: ["07", "08"], codes: [], phase: 9, href: "member/deliveries/index.html?d=first" }
        ] },
        { label: "Payments", dest: "payments", screens: [
          { id: "M11", title: "Payments", kind: "list", purpose: "Paid payouts, newest first", notes: ["08"], codes: [], phase: 9, href: "member/payments/index.html" },
          { id: "M12", title: "Statement", kind: "detail", purpose: "Per delivery group: value, paid before, paid now, still owed; additions, deductions, net and where it was sent", notes: ["08"], codes: [], phase: 9, href: "member/payments/statement.html" }
        ] },
        { label: "Account", dest: "account", screens: [
          { id: "M13", title: "Account", kind: "settings", purpose: "Your details, your memberships (number, status, positions), PIN, phone, terms, sign out", notes: ["05", "06"], codes: [], phase: 9, href: "member/account/index.html" },
          { id: "M14", title: "Edit your details", kind: "form", purpose: "Preferred name, email, language (the cooperative sees changes at once)", notes: ["05"], codes: [], phase: 9, href: "member/account/index.html?show=details" },
          { id: "M15", title: "Change PIN", kind: "flow", purpose: "Current PIN, new PIN twice; other phones are signed out", notes: ["06"], codes: [], phase: 9, href: "member/account/pin.html" },
          { id: "M16", title: "Change phone", kind: "flow", purpose: "The new number gets a code; the old number gets an SMS; records follow", notes: ["06"], codes: [], phase: 9, href: "member/account/phone.html" },
          { id: "M17", title: "Terms and privacy", kind: "detail", purpose: "What the member accepted at sign-up", notes: ["06"], codes: [], phase: 9, href: "member/account/terms.html" }
        ] },
        { label: "Verification for loans (KYC, phase 11, note 20 draft)", dest: "account", screens: [
          { id: "MK1", title: "Get verified for loans", kind: "detail", purpose: "From Account: what GroFunder holds on you, item by item, what's verified, what's still needed, your visit, and your lending consent", notes: ["20", "22"], codes: [], phase: 11, href: "member/kyc/index.html" },
          { id: "MK2", title: "Your farm and money", kind: "flow", purpose: "Agree to lending first if you haven't (22); declare background, farms, crops, other income, loans and regular payments, next of kin; review; crops already delivered come in verified", notes: ["20"], codes: [], phase: 11, href: "member/kyc/declare.html" }
        ] },
        { label: "Borrowing (phase 14, note 25)", dest: "home", screens: [
          { id: "MB1", title: "What can I borrow", kind: "detail", purpose: "Your limit, your growth stage and the next stage's limit, and how to grow it; never the score", notes: ["25"], codes: [], phase: 14, href: "member/credit/index.html" }
        ] },
        { label: "Loans (phase 16, note 26 part 1)", dest: "home", screens: [
          { id: "ML1", title: "Borrow", kind: "detail", purpose: "From What can I borrow: each product offered, its lender and the most you can borrow from it; or every reason you can't yet, each with what to do", notes: ["26"], codes: [], phase: 16, href: "member/loans/index.html" },
          { id: "ML2", title: "Ask for a loan", kind: "flow", purpose: "How much, how long, what for; the quote with every charge and the total cost; your declarations confirmed; the loan agreement and sharing with the named lender. Also accepting a GroFunder draft", notes: ["26", "22"], codes: [], phase: 16, href: "member/loans/request.html?pr=pr-mav-dairy" },
          { id: "ML3", title: "Your loan", kind: "detail", purpose: "Where it stands in plain words, the quote as agreed and our reference; cancel a request; accept or decline a draft", notes: ["26"], codes: [], phase: 16, href: "member/loans/loan.html?state=requested" }
        ] },
        { label: "Consents (phase 15, note 22)", dest: "account", screens: [
          { id: "MS1", title: "Consents", kind: "list", purpose: "From Account: what you've agreed to, per cooperative, then your login's terms; the version, when and how (in the app, or with whom by SMS code)", notes: ["22"], codes: [], phase: 15, href: "member/consents/index.html" },
          { id: "MS2", title: "Read and agree", kind: "detail", purpose: "The version in force in your language, with the other a tap away; what changed when asked again; agree, or say no to a consent. At the first KYC step, a Home prompt, What can I borrow and Consents", notes: ["22"], codes: [], phase: 15, href: "member/consents/agree.html?d=cd-terms&for=prompt" },
          { id: "MS3", title: "A decision and withdrawing", kind: "sheet", purpose: "What you agreed to, the exact wording, and Withdraw for a consent, with what stops and what carries on", notes: ["22"], codes: [], phase: 15, href: "member/consents/index.html" }
        ] },
        { label: "Growth Circle (phase 12, note 23)", dest: "home", screens: [
          { id: "MC1", title: "Your Growth Circle", kind: "detail", purpose: "From Home or Account: your circle for the membership shown, its meeting, agent and members (joining dates, didn't join, left); object while someone is joining; leave; the leader invites, edits, removes members, hands over and dissolves. With no circle: your invitations and Start a circle", notes: ["23"], codes: [], phase: 12, href: "member/circle/index.html" },
          { id: "MC2", title: "Start a circle", kind: "flow", purpose: "Name, weekly meeting, and at least 4 people you know from your cluster to invite", notes: ["23"], codes: [], phase: 12, href: "member/circle/start.html" },
          { id: "MC3", title: "Invitation", kind: "detail", purpose: "Who invited you, the meeting and everyone in or invited; accepting vouches for them, and you join after 5 days unless someone objects; or decline", notes: ["23"], codes: [], phase: 12, href: "member/circle/invitation.html?p=cp-105" }
        ] }
      ] }
  ];

  /** The roles that can open a screen, from its codes. */
  function rolesFor(surface, screen) {
    var set = ROLES[surface.roleSet];
    return Object.keys(set).filter(function (r) {
      if (surface.roleSet === "member") return screen.signedOut ? r === "out" : r === "in";
      if (!screen.codes.length) return true;
      return screen.codes.some(function (c) { return c === "owner" ? !!set[r].owner : set[r].codes.indexOf(c) > -1; });
    });
  }

  /* Flows whose screens are drawn for real; other links are phase 2 pattern samples. */
  var DRAWN = [4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16];
  root.GF_SCREENS = { ROLES: ROLES, SURFACES: SURFACES, rolesFor: rolesFor, DRAWN: DRAWN };
})(typeof window !== "undefined" ? window : globalThis);
