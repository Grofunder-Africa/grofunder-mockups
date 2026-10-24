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
  var ROLES = {
    coop: {
      admin: { label: "Administrator", codes: COOP_ALL, owner: true },
      manager: { label: "Manager", codes: COOP_ALL },
      accountant: { label: "Accountant", codes: ["cooperatives.view", "members.view", "produce.view", "payouts.view", "payouts.record", "payouts.configure"] },
      clerk: { label: "Clerk", codes: ["cooperatives.view", "members.view", "produce.view", "produce.record"] },
      viewer: { label: "Viewer", codes: ["cooperatives.view", "members.view", "produce.view", "payouts.view"] }
    },
    gf: {
      owner: { label: "Owner", codes: GF_VIEW.concat(["cooperatives.onboard", "cooperatives.edit_profile", "cooperatives.set_status", "catalog.manage", "places.manage", "member_access.disable"]), owner: true },
      full: { label: "Full", codes: GF_VIEW.concat(["cooperatives.onboard", "cooperatives.edit_profile", "cooperatives.set_status", "catalog.manage", "places.manage", "member_access.disable"]) },
      ops: { label: "Operations", codes: GF_VIEW.concat(["cooperatives.onboard", "cooperatives.edit_profile"]) },
      view: { label: "View only", codes: GF_VIEW }
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
          { id: "G10", title: "Member and their login (panel)", kind: "sheet", purpose: "A cooperative's member as its staff see them, plus whether a login is linked; disable or re-enable the login in a fraud case", notes: ["05", "06"], codes: ["members.view"], phase: 4, href: G + "cooperatives/detail.html?c=co-kijani&m=m-kij-0142"}
        ] },
        { label: "Reference data", dest: "reference", screens: [
          { id: "G11", title: "Catalog", kind: "list", purpose: "Every value chain as a section with its products; Edit and Add product on each; archive (cascades, counted), reactivate, delete if unused", notes: ["02"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/catalog.html" },
          { id: "G12", title: "Edit a value chain", kind: "dialog", purpose: "Name, Swahili name, what it covers; from the section's visible Edit", notes: ["02"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/catalog.html"},
          { id: "G13", title: "Product and its grades (panel)", kind: "sheet", purpose: "From a product's row: details, unit (locked once used), grades added and edited in place, cooperatives using it", notes: ["02"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/catalog.html?p=p-milk"},
          { id: "G14", title: "Places", kind: "list", purpose: "The 47 counties; a county opens a panel with its sub-counties and wards: add (UI-14), correct, archive", notes: ["04"], codes: ["cooperatives.view"], phase: 4, href: G + "reference/places.html" }
        ] },
        { label: "Team", dest: "team", screens: [
          { id: "G15", title: "GroFunder team", kind: "list", purpose: "GroFunder staff, their roles and pending invitations; invite, change role, remove (the kit's team page)", notes: ["09"], codes: ["owner"], phase: 4, href: G + "team/index.html", kit: true }
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
          { id: "C11", title: "Member", kind: "detail", purpose: "Identity, status, figures; tabs for details, deliveries, payouts and history; positions and nominees", notes: ["05", "07", "08"], codes: ["members.view"], phase: 6, href: "coop/members/member.html?m=m-kij-0142" },
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
  var DRAWN = [4, 5, 6, 7, 8, 9];
  root.GF_SCREENS = { ROLES: ROLES, SURFACES: SURFACES, rolesFor: rolesFor, DRAWN: DRAWN };
})(typeof window !== "undefined" ? window : globalThis);
