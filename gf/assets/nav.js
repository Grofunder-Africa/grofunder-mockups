/* nav.js: the GroFunder console's destinations, by role (UI-10, phase 3).
 * Loaded before proto.js on every console page.
 *
 *   Every role   Overview, Cooperatives, Reference data (catalog and places)
 *   Owner        + Team
 *   Every role but the agent  + Verifications (phase 11, note 20), Growth Circles (phase 12, note 23),
 *                Lending partners (phase 13, note 24: partners, coverage, remittances),
 *                Credit (phase 14, note 25: scores, overrides, rule sets),
 *                Loans (phase 16, note 26 part 1: the queue and pauses),
 *                Consents (phase 15, note 22: the consent documents and where members are asked)
 *   Agent        My visits and My circles only (kyc.capture and groups.assigned reach only what is assigned to them)
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
      { id: "groups", label: "Circles", icon: "account-group-outline", href: R + "groups/index.html", roles: "owner full ops view", badge: "groups" },
      { id: "partners", label: "Partners", icon: "handshake-outline", href: R + "partners/index.html", roles: "owner full ops view" },
      { id: "credit", label: "Credit", icon: "chart-line", href: R + "credit/index.html", roles: "owner full ops view" },
      { id: "loans", label: "Loans", icon: "cash-multiple", href: R + "loans/index.html", roles: "owner full ops view", badge: "loans" },
      { id: "consents", label: "Consents", icon: "file-sign", href: R + "consents/index.html", roles: "owner full ops view" },
      { id: "reference", label: "Reference data", icon: "sprout-outline", href: R + "reference/catalog.html", roles: "owner full ops view" },
      { id: "team", label: "Team", icon: "shield-account-outline", href: R + "team/index.html", roles: "owner" },
      /* Farmer Support Agent (gf_agent, note 20): only their own visits. */
      { id: "visits", label: "My visits", icon: "clipboard-check-outline", href: R + "kyc/agent.html", roles: "agent" },
      /* ...and the circles they support (groups.assigned, note 23). */
      { id: "circles", label: "My circles", icon: "account-group-outline", href: R + "groups/agent.html", roles: "agent" }
    ],
    sections: {
      loans: [
        { id: "loans", label: "Loans", href: R + "loans/index.html" },
        { id: "pauses", label: "Pauses", href: R + "loans/pauses.html" }
      ],
      credit: [
        { id: "scores", label: "Scores", href: R + "credit/index.html" },
        { id: "overrides", label: "Overrides", href: R + "credit/overrides.html" },
        { id: "rules", label: "Rule sets", href: R + "credit/rules.html" }
      ],
      partners: [
        { id: "partners", label: "Partners", href: R + "partners/index.html" },
        { id: "coverage", label: "Coverage", href: R + "partners/coverage.html" },
        { id: "remittances", label: "Remittances", href: R + "partners/remittances.html" }
      ],
      reference: [
        { id: "catalog", label: "Catalog", href: R + "reference/catalog.html" },
        { id: "places", label: "Places", href: R + "reference/places.html" }
      ]
    },
    /* Verifications waiting for review (note 20: SUBMITTED). */
    badges: { kyc: 2, groups: 1, loans: 1 },
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
