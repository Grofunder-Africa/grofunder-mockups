/* nav.js: the member app's destinations (UI-10; phase 9, UI-18). Loaded before
 * proto.js on every member page.
 *
 * Home, Deliveries, Payments, Account (the kit's host adds Home and Account).
 * Collection times, switching cooperative and linking a membership hang off Home.
 * Signed out there is no navigation: welcome, sign-in, sign-up and forgot PIN
 * are `data-auth` pages under auth/.
 */
(function () {
  "use strict";
  var tag = document.querySelector('script[src$="member/assets/nav.js"], script[src$="assets/nav.js"]');
  var R = tag ? tag.getAttribute("src").replace(/assets\/nav\.js$/, "") : "./";
  var SOON = R + "soon.html";

  window.PROTO_NAV = {
    app: "member",
    soon: SOON,
    dests: [
      { id: "home", label: "Home", icon: "home-variant-outline", href: R + "home/index.html" },
      { id: "deliveries", label: "Deliveries", icon: "basket-outline", href: R + "deliveries/index.html" },
      { id: "payments", label: "Payments", icon: "cash-multiple", href: R + "payments/index.html" },
      { id: "account", label: "Account", icon: "account-circle-outline", href: R + "account/index.html" }
    ]
  };
})();
