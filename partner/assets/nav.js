/* nav.js: the partner portal's destinations, by role (phase 19, UI-140; note 29, signed off
 * 2026-11-10). Loaded before proto.js on every portal page.
 *
 * The portal is the fourth shell in the one web app (29, Q1), at /partner/[partner]/. A login whose
 * account is in the PARTNER category lands here. The partner drawn is Chemi Chemi Sacco, a lender with
 * no system of its own, which works its loans here instead of over an API.
 *
 * Who sees what follows 29's codes:
 *   Administrator   everything, and the team (the account's owner)
 *   Credit officer  view and decide: the queue and the loans
 *   Finance         view, disburse, payments and settle: loans, collections and money
 *   Viewer          view only
 * Every destination is readable by every role (partner_portal.view); what a role may *do* is gated on
 * each page with data-roles.
 */
(function () {
  "use strict";
  var tag = document.querySelector('script[src$="partner/assets/nav.js"], script[src$="assets/nav.js"]');
  var R = tag ? tag.getAttribute("src").replace(/assets\/nav\.js$/, "") : "./";
  var SOON = R + "soon.html";
  /* The review bar's role picks who is signed in, as the console does with its agent. */
  var ROLE = (function () { try { return localStorage.getItem("gf.role.partner") || "admin"; } catch (e) { return "admin"; } })();
  var WHO = {
    admin: { name: "Rose Wambui", initials: "RW", sub: "Administrator" },
    credit: { name: "Dennis Mwaura", initials: "DM", sub: "Credit officer" },
    finance: { name: "Faith Wairimu", initials: "FW", sub: "Finance" },
    viewer: { name: "Joy Atieno", initials: "JA", sub: "Viewer" }
  }[ROLE] || { name: "Rose Wambui", initials: "RW", sub: "Administrator" };

  window.PROTO_NAV = {
    app: "partner",
    soon: SOON,
    dests: [
      { id: "home", label: "Overview", icon: "view-dashboard-outline", href: R + "index.html" },
      { id: "applications", label: "Applications", icon: "inbox-arrow-down-outline", href: R + "applications/index.html", badge: "applications" },
      { id: "loans", label: "Loans", icon: "cash-multiple", href: R + "loans/index.html" },
      { id: "collections", label: "Collections", icon: "cash-clock", href: R + "collections/index.html", badge: "collections" },
      { id: "money", label: "Money", icon: "bank-outline", href: R + "money/index.html" },
      /* The kit's team screens, for the account's owner (29: staff are members of the partner's account). */
      { id: "team", label: "Team", icon: "shield-account-outline", href: R + "team/index.html" }
    ],
    /* Applications waiting, and loans behind: worked out from the data when the page loads. */
    badges: { applications: 1, collections: 1 },
    globals: [
      { id: "notifications", label: "Notifications", icon: "bell-outline", href: SOON }
    ],
    account: {
      initials: WHO.initials,
      placesLabel: "Signed in as " + WHO.name,
      places: [{ name: "Chemi Chemi Sacco", sub: WHO.sub }],
      links: [{ icon: "account-circle-outline", label: "Your account", sub: "Name, email, password, two-step sign-in", href: SOON }],
      signOut: SOON
    }
  };
})();
