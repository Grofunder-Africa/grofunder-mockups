/* nav.js: the GroFunder console's destinations, by role (UI-10, phase 3).
 * Loaded before proto.js on every console page.
 *
 *   Every role   Overview, Cooperatives, Reference data (catalog and places)
 *   Owner        + Team
 *   Every role but the agent  + Verifications (phase 11, note 20)
 *   Agent        My visits only (kyc.capture reaches only visits assigned to them)
 * What a role may change inside them follows note 09 (Operations onboards and
 * edits profiles; Full also changes status, curates reference data and
 * disables member logins). A cooperative's members, deliveries and payouts
 * are tabs of the cooperative, not destinations.
 */
(function () {
  "use strict";
  var tag = document.querySelector('script[src$="gf/assets/nav.js"], script[src$="assets/nav.js"]');
  var R = tag ? tag.getAttribute("src").replace(/assets\/nav\.js$/, "") : "./";
  var SOON = R + "soon.html";
  /* The agent signs in as Kevin Odhiambo (kyc.js); everyone else as Peter Otieno. */
  var agent = (function () { try { return localStorage.getItem("gf.role.gf") === "agent"; } catch (e) { return false; } })();

  window.PROTO_NAV = {
    app: "gf",
    soon: SOON,
    dests: [
      { id: "home", label: "Overview", icon: "view-dashboard-outline", href: R + "home/index.html", roles: "owner full ops view" },
      { id: "cooperatives", label: "Cooperatives", icon: "office-building-outline", href: R + "cooperatives/index.html", roles: "owner full ops view" },
      { id: "kyc", label: "Verifications", icon: "shield-check-outline", href: R + "kyc/index.html", roles: "owner full ops view", badge: "kyc" },
      { id: "reference", label: "Reference data", icon: "sprout-outline", href: R + "reference/catalog.html", roles: "owner full ops view" },
      { id: "team", label: "Team", icon: "shield-account-outline", href: R + "team/index.html", roles: "owner" },
      /* Farmer Support Agent (gf_agent, note 20): only their own visits. */
      { id: "visits", label: "My visits", icon: "clipboard-check-outline", href: R + "kyc/agent.html", roles: "agent" }
    ],
    sections: {
      reference: [
        { id: "catalog", label: "Catalog", href: R + "reference/catalog.html" },
        { id: "places", label: "Places", href: R + "reference/places.html" }
      ]
    },
    /* Verifications waiting for review (note 20: SUBMITTED). */
    badges: { kyc: 2 },
    globals: [
      { id: "search", label: "Search cooperatives and members", icon: "magnify", on: "Console.search()", roles: "owner full ops view" },
      { id: "notifications", label: "Notifications", icon: "bell-outline", href: SOON }
    ],
    account: {
      initials: agent ? "KO" : "PO",
      placesLabel: agent ? "Signed in as Kevin Odhiambo" : "Signed in as Peter Otieno",
      places: [{ name: "GroFunder", sub: "{role}" }],
      links: [{ icon: "account-circle-outline", label: "Your account", sub: "Name, email, password, two-step sign-in", href: SOON }],
      signOut: SOON
    }
  };
})();
