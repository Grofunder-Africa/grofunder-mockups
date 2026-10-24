/* nav.js: the GroFunder console's destinations, by role (UI-10, phase 3).
 * Loaded before proto.js on every console page.
 *
 *   Every role   Overview, Cooperatives, Reference data (catalog and places)
 *   Owner        + Team
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

  window.PROTO_NAV = {
    app: "gf",
    soon: SOON,
    dests: [
      { id: "home", label: "Overview", icon: "view-dashboard-outline", href: R + "home/index.html" },
      { id: "cooperatives", label: "Cooperatives", icon: "office-building-outline", href: R + "cooperatives/index.html" },
      { id: "reference", label: "Reference data", icon: "sprout-outline", href: R + "reference/catalog.html" },
      { id: "team", label: "Team", icon: "shield-account-outline", href: R + "team/index.html", roles: "owner" }
    ],
    sections: {
      reference: [
        { id: "catalog", label: "Catalog", href: R + "reference/catalog.html" },
        { id: "places", label: "Places", href: R + "reference/places.html" }
      ]
    },
    globals: [
      { id: "search", label: "Search cooperatives and members", icon: "magnify", on: "Console.search()" },
      { id: "notifications", label: "Notifications", icon: "bell-outline", href: SOON }
    ],
    account: {
      initials: "PO",
      placesLabel: "Signed in as Peter Otieno",
      places: [{ name: "GroFunder", sub: "{role}" }],
      links: [{ icon: "account-circle-outline", label: "Your account", sub: "Name, email, password, two-step sign-in", href: SOON }],
      signOut: SOON
    }
  };
})();
