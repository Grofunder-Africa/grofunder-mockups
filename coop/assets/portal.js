/* portal.js: what the cooperative portal's screens share (phase 5, UI-16).
 * Load it right after assets/data/canon.js, without defer, so a page can
 * pick its cooperative before proto.js draws the shell:
 *
 *   <script src="../../assets/data/canon.js"></script>
 *   <script src="../assets/portal.js"></script>
 *
 * Which cooperative the portal shows follows the review bar's status:
 *   Onboarding           Mumbi Maize & Beans, as Rose Wairimu just after she
 *                        accepted GroFunder's invitation (phase 4 drew it pending)
 *   Active, On hold,     Kijani Valley Dairy, as Grace Wambui; the status is
 *   Ended                the review bar's, so one set-up shows every status
 */
(function () {
  "use strict";
  var q = GF.q, f = GF.fmt;
  var status = (function () { try { return localStorage.getItem("gf.coopStatus") || "active"; } catch (e) { return "active"; } })();
  var ONB = status === "onboarding";
  /* The account sheet switches between Grace's two cooperatives (gf.portalCoop). */
  var picked = (function () { try { return localStorage.getItem("gf.portalCoop") || ""; } catch (e) { return ""; } })();
  var COOP = ONB ? "co-mumbi" : (picked === "co-mawingu" ? "co-mawingu" : GF.who.kijani);
  var CODE = { onboarding: "ONBOARDING", active: "ACTIVE", on_hold: "ON_HOLD", ended: "ENDED" }[status] || "ACTIVE";
  var R = (function () { var t = document.querySelector('script[src$="coop/assets/portal.js"], script[src$="assets/portal.js"]'); return t ? t.getAttribute("src").replace(/assets\/portal\.js$/, "") : "./"; })();

  /* Rose, once she has accepted: the invitation becomes her membership. */
  var ROSE = { id: "u-rose", name: "Rose Wairimu", email: "rose.wairimu@mumbi.example", memberships: [{ account: "co-mumbi", roles: ["cooperative_admin"], owner: true, joined: "2026-10-30" }] };
  var ME = ONB ? ROSE : GF.get("u-grace");

  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var ROLE = { cooperative_admin: "Administrator", cooperative_manager: "Manager", cooperative_accountant: "Accountant", cooperative_clerk: "Clerk", cooperative_viewer: "Viewer" };

  function coop() {
    var c = GF.get(COOP);
    return { id: c.id, name: c.name, registration_no: c.registration_no, area: c.area, status: CODE, created_at: c.created_at, profile: c.profile, raw: c };
  }
  function staff() {
    var list = q.staffOf(COOP).slice();
    if (ONB) list.unshift(ROSE);
    return list;
  }
  function invitations() {
    return q.invitationsOf(COOP).filter(function (i) { return !(ONB && i.email === ROSE.email); });
  }
  /* The review bar's status, as the banner every portal screen carries (01). */
  function banner() {
    var c = coop(), s = c.profile.short_name;
    if (CODE === "ONBOARDING") return '<div class="banner banner-info"><span class="mdi mdi-progress-wrench" aria-hidden="true"></span><div class="grow"><span class="text-title-sm">Setting up</span>' +
      '<span class="text-body-md">GroFunder makes ' + esc(s) + " active once it's set up. Until then you can set up everything and load your members.</span></div>" +
      '<a class="btn btn-text" href="' + R + 'home/index.html">Set-up checklist</a></div>';
    if (CODE === "ON_HOLD") return '<div class="banner banner-warning"><span class="mdi mdi-pause-circle-outline" aria-hidden="true"></span><div class="grow"><span class="text-title-sm">On hold since 14 Oct</span>' +
      '<span class="text-body-md">GroFunder put ' + esc(s) + ' on hold: "Annual returns for 2025 not filed with the Commissioner". Recording deliveries, paying members and keeping the set-up up to date carry on; adding members is paused.</span></div></div>';
    if (CODE === "ENDED") return '<div class="banner banner-error"><span class="mdi mdi-lock-outline" aria-hidden="true"></span><div class="grow"><span class="text-title-sm">Ended on 28 Oct</span>' +
      '<span class="text-body-md">' + esc(s) + "'s time on GroFunder has ended. Everything stays readable; nothing can be changed.</span></div></div>";
    return "";
  }
  /* Put the banner at the top of the screen. Call from the page's script. */
  function mountBanner() {
    var screen = document.querySelector("[data-screen]"); if (!screen) return;
    var html = banner(); if (!html) return;
    var holder = document.createElement("div"); holder.innerHTML = html;
    var first = screen.querySelector("[data-subnav]");
    screen.insertBefore(holder.firstChild, first ? first.nextSibling : screen.firstChild);
  }
  /* The cooperative's short name in the app bar. */
  function title(t) { var s = document.querySelector("[data-screen]"); if (s) s.setAttribute("data-title", t || coop().profile.short_name); }

  window.Portal = {
    status: status, onboarding: ONB, COOP: COOP, me: ME, ROLE: ROLE, R: R,
    coop: coop, staff: staff, invitations: invitations, banner: banner, mountBanner: mountBanner, title: title, esc: esc,
    roleNames: function (u) { var m = u.memberships.find(function (x) { return x.account === COOP; }); return m ? m.roles.map(function (r) { return ROLE[r] || (GF.get(r) || {}).name || r; }) : []; },
    isOwner: function (u) { var m = u.memberships.find(function (x) { return x.account === COOP; }); return !!(m && m.owner); }
  };
})();
