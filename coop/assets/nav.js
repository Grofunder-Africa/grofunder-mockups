/* nav.js: the cooperative portal's destinations, by role (UI-10, phase 3).
 * Loaded before proto.js on every portal page.
 *
 * Who sees what follows the permission codes in note 09 (the same rule the
 * screen inventory, assets/data/screens.js, uses):
 *   Administrator, Manager  Home, Produce, Members, Payouts, Settings
 *   Accountant              Home, Produce, Members, Payouts, Settings (additions and deductions only)
 *   Clerk                   Home, Produce, Members
 *   Viewer                  Home, Produce, Members, Payouts
 * Team and Roles in Settings are for the account's owners (the administrators).
 * A place not drawn yet points at soon.html.
 */
(function () {
  "use strict";
  var tag = document.querySelector('script[src$="coop/assets/nav.js"], script[src$="assets/nav.js"]');
  var R = tag ? tag.getAttribute("src").replace(/assets\/nav\.js$/, "") : "./";
  var SOON = R + "soon.html";
  var ONB = (function () { try { return localStorage.getItem("gf.coopStatus") === "onboarding"; } catch (e) { return false; } })();
  var ACCOUNT_LINKS = [
    { icon: "account-circle-outline", label: "Your account", sub: "Name, email, phone, password, two-step sign-in", href: R + "account/index.html" }
  ];

  window.PROTO_NAV = {
    app: "coop",
    soon: SOON,
    dests: [
      { id: "home", label: "Home", icon: "home-variant-outline", href: R + "home/index.html" },
      /* Clerks spend their day here, so it comes second (UI-2: on a phone). */
      { id: "produce", label: "Produce", icon: "basket-outline", href: R + "produce/index.html" },
      { id: "members", label: "Members", icon: "account-group-outline", href: R + "members/index.html" },
      { id: "payouts", label: "Payouts", icon: "cash-multiple", href: R + "payouts/index.html", roles: "admin manager accountant viewer" },
      { id: "settings", label: "Settings", icon: "cog-outline", href: R + "settings/profile.html", roles: "admin manager accountant",
        hrefByRole: { accountant: R + "settings/pay-items.html" } }
    ],
    /* Second levels: Tabs below 840, a side pane from 840. */
    sections: {
      produce: [
        { id: "deliveries", label: "Deliveries", href: R + "produce/index.html" },
        { id: "prices", label: "Prices", href: R + "produce/prices.html" }
      ],
      settings: [
        { id: "profile", label: "Profile", href: R + "settings/profile.html", roles: "admin manager" },
        { id: "products", label: "Products", href: R + "settings/products.html", roles: "admin manager" },
        { id: "clusters", label: "Clusters", href: R + "settings/clusters.html", roles: "admin manager" },
        { id: "positions", label: "Positions", href: R + "settings/positions.html", roles: "admin manager" },
        { id: "rounds", label: "Collection rounds", href: R + "settings/rounds.html", roles: "admin manager" },
        { id: "pay-items", label: "Additions and deductions", href: R + "settings/pay-items.html", roles: "admin manager accountant" },
        { id: "notifications", label: "Notifications", href: R + "settings/notifications.html", roles: "admin manager" },
        { id: "team", label: "Team", href: R + "settings/team.html", roles: "admin" },
        { id: "roles", label: "Roles", href: R + "settings/roles.html", roles: "admin" }
      ]
    },
    globals: [
      /* C2: a sheet; members.js and search.js are loaded the first time (phase 6, UI-35). */
      { id: "search", label: "Search members and receipts", icon: "magnify",
        on: "(function(){var R='" + R + "';function go(){PortalSearch.open()}function load(f,cb){var s=document.createElement('script');s.src=R+'assets/'+f;s.onload=cb;document.head.appendChild(s)}" +
          "if(window.PortalSearch)return go();var then=function(){load('search.js',go)};window.Members?then():load('members.js',then)})()" },
      { id: "notifications", label: "Notifications", icon: "bell-outline", href: R + "account/notifications.html" }
    ],
    /* The account sheet (S4): staff in two cooperatives switch here. While the
     * review bar says Onboarding the portal is Mumbi's, as Rose (portal.js). */
    account: ONB ? {
      initials: "RW",
      placesLabel: "Signed in as Rose Wairimu",
      places: [{ name: "Mumbi Maize & Beans", sub: "{role}" }],
      links: ACCOUNT_LINKS,
      signOut: R + "auth/sign-in.html"
    } : {
      initials: "GW",
      placesLabel: "Signed in as Grace Wambui",
      places: [
        { name: "Kijani Valley Dairy", sub: "Administrator", account: "co-kijani" },
        { name: "Mawingu Coffee Growers", sub: "Clerk", account: "co-mawingu" }
      ],
      links: ACCOUNT_LINKS,
      signOut: R + "auth/sign-in.html"
    }
  };
})();
