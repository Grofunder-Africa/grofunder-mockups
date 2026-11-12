/* portal-ui.js: what the partner portal's screens share (phase 19, UI-140; note 29, signed off
 * 2026-11-10). Loaded after the data files (recovery.js last) and before nav.js.
 *
 * Who may do what (29, "Roles and permissions"), as the prototype's roles:
 *   view       every role (partner_portal.view): the queue, loans, schedules, payments, charges,
 *              collections and the account; opening a member's details, which is logged
 *   decide     Administrator and Credit officer (partner_portal.decide): approve, reject, ask for an
 *              amendment, cancel before disbursement
 *   disburse   Administrator and Finance (partner_portal.disburse)
 *   payments   Administrator and Finance (partner_portal.payments): record and reverse payments, waive
 *              a late penalty
 *   write_off  the Administrator alone (partner_portal.write_off), Q4
 *   settle     Administrator and Finance (partner_portal.settle): remittances of GroFunder's share, and
 *              confirming recovered money received
 *
 * Every action here raises one of 27's canonical events with source PORTAL and the staff member as its
 * actor: one contract, two channels. Nothing in the portal writes the ledger directly.
 */
(function () {
  "use strict";
  var f = GF.fmt, P = GF.partners, Lo = GF.loans;
  var PARTNER = "lp-chemi";
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var icon = function (n, cls) { return '<span class="mdi mdi-' + n + (cls ? " " + cls : "") + '" aria-hidden="true"></span>'; };
  var when = function (iso) { return iso ? f.date(iso, "short") + (iso.length > 10 ? ", " + iso.slice(11, 16) : "") : "–"; };
  var money = function (c) { return f.money(c); };
  var whole = function (c) { return f.money(c, { whole: true }); };
  var ROLES = { view: "admin credit finance viewer", decide: "admin credit", disburse: "admin finance", payments: "admin finance", write_off: "admin", settle: "admin finance", export: "admin finance" };
  var FREQ = { MONTHLY: "monthly", WEEKLY: "weekly", BIWEEKLY: "fortnightly", DAILY: "daily", END_OF_TERM: "at the end" };
  var partner = function () { return P.get(PARTNER); };
  /* The same loan, in the lender's own words: "With the lender" is GroFunder's label, not theirs. */
  var STATUS = {
    FORWARDED: ["info", "To decide"], AMENDMENT_REQUIRED: ["warning", "You asked GroFunder for a change"],
    PARTNER_APPROVED: ["success", "To disburse"], ACTIVE: ["success", "Being repaid"], IN_ARREARS: ["warning", "Behind"],
    DEFAULTED: ["error", "Defaulted"], CLOSED: ["neutral", "Repaid"], WRITTEN_OFF: ["neutral", "Written off"],
    PARTNER_REJECTED: ["neutral", "You rejected it"], CANCELLED: ["neutral", "Cancelled"]
  };
  var statusOf = function (l) { return STATUS[l.status] || Lo.L.status[l.status]; };
  /** Who is signed in, from the review bar's role: every portal action records its actor (24 amendment). */
  function me() {
    var role = (function () { try { return localStorage.getItem("gf.role.partner") || "admin"; } catch (e) { return "admin"; } })();
    var want = { admin: "partner_admin", credit: "partner_credit", finance: "partner_finance", viewer: "partner_viewer" }[role];
    return (partner().profile.staff || []).find(function (s) { return s.role === want; }) || { name: "Rose Wambui", role: "partner_admin" };
  }
  var staffName = function (id) { var s = (partner().profile.staff || []).find(function (x) { return x.id === id; }); return s ? s.name : id ? "GroFunder" : "GroFunder"; };
  /** This partner's loans, newest first. */
  function loans(statuses) {
    return Lo.loans.filter(function (l) { return l.partner === PARTNER && (!statuses || statuses.indexOf(l.status) > -1); })
      .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
  }
  var queue = function () { return loans(["FORWARDED", "AMENDMENT_REQUIRED"]); };
  var behind = function () { return loans(["IN_ARREARS", "DEFAULTED"]); };
  /** The money the partner has out and in, worked out from the ledger (29, "Money"). */
  function account() {
    var all = loans(), out = { disbursed: 0, collected: 0, outstanding: 0, arrears: 0, live: 0, closed: 0, written_off: 0 };
    all.forEach(function (l) {
      if (l.disbursed_cents) out.disbursed += l.disbursed_cents;
      Lo.paymentsOf(l.id).filter(function (p) { return p.status === "POSTED"; }).forEach(function (p) { out.collected += p.amount_cents; });
      if (l.balance_cents) out.outstanding += l.balance_cents;
      if (l.status === "IN_ARREARS" || l.status === "DEFAULTED") out.arrears += l.overdue_cents;
      if (Lo.isLive(l)) out.live++;
      if (l.status === "CLOSED") out.closed++;
      if (l.status === "WRITTEN_OFF") out.written_off++;
    });
    return out;
  }
  /** GroFunder's share of a posted payment, from the terms' charge shares (26, "Settlement"). */
  function gfShare(loan, payment) {
    var t = P.get(loan.terms), share = 0;
    if (!payment.split_known) return null;
    t.charges.forEach(function (c) {
      if (c.kind === "INTEREST") share += payment.interest_cents * (c.gf_share_bps || 0) / 10000;
      else if (c.collected === "WITH_INSTALMENTS" && c.kind !== "LATE_PENALTY") share += payment.fees_cents * (c.gf_share_bps || 0) / 10000;
    });
    return Math.round(share);
  }
  /** What the partner owes GroFunder, by month, from the payments it has posted. */
  function shareByPeriod() {
    var out = {};
    loans().forEach(function (l) {
      Lo.paymentsOf(l.id).filter(function (p) { return p.status === "POSTED"; }).forEach(function (p) {
        var k = p.paid_on.slice(0, 7), s = gfShare(l, p);
        out[k] = out[k] || { period: k, share_cents: 0, payments: 0, unknown: 0 };
        out[k].payments++;
        if (s == null) out[k].unknown++; else out[k].share_cents += s;
      });
    });
    return Object.keys(out).sort().reverse().map(function (k) { return out[k]; });
  }
  /** The quote the member accepted, as the partner sees it (never GroFunder's score or review). */
  function quoteCard(q) {
    var i = q.instalments;
    var inst = i.frequency === "END_OF_TERM" ? "One payment of " + money(i.amount_cents) + " at the end"
      : i.count + " " + FREQ[i.frequency] + " of " + money(i.amount_cents) + (i.last_amount_cents !== i.amount_cents ? " (the last " + money(i.last_amount_cents) + ")" : "");
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Charge</th><th>How it is paid</th><th class="num">Amount</th></tr></thead><tbody>' +
      q.lines.map(function (l) { return '<tr><td class="primary-cell">' + esc(l.name) + '</td><td class="text-body-sm">' + P.L.collected[l.collected] + '</td><td class="num tabular">' + money(l.amount_cents) + "</td></tr>"; }).join("") +
      '<tr><td class="primary-cell">Total cost of credit</td><td class="text-body-sm tone-muted">Every charge, late penalties apart</td><td class="num tabular"><b>' + money(q.total_cost_cents) + "</b></td></tr></tbody></table></div>" +
      '<dl class="facts"><dt>Asked for</dt><dd class="tabular">' + money(q.amount_cents) + " for " + Lo.durationLine(q.duration, q.duration_unit) + "</dd>" +
      '<dt>The member receives</dt><dd class="tabular">' + money(q.amount_received_cents) + "</dd>" +
      '<dt>Instalments</dt><dd class="tabular">' + inst + "</dd>" +
      '<dt>Total repayable</dt><dd class="tabular"><b>' + money(q.total_repayable_cents) + "</b></dd>" +
      "<dt>If they pay late</dt><dd>" + (q.late_penalties.length ? q.late_penalties.map(function (x) { return esc(x.name) + ": " + esc(x.rule); }).join("<br>") : "No late penalty") + "</dd></dl>";
  }
  /** A member's details, opened on demand. Every opening is one logged read (29; 27, "Data partners read"). */
  var forceNotShared = false;
  function memberSheet(memberId, loanId, notShared) {
    forceNotShared = !!notShared || new URLSearchParams(location.search).has("notshared");
    var m = GF.get(memberId), CS = GF.consents, a = CS ? CS.allows(memberId, "PARTNER_SHARING", PARTNER, { for_existing: true }) : { ok: true };
    var circle = GF.groups.circleOf(memberId), gs = circle ? GF.groups.standing(circle.id) : null;
    var items = GF.kyc ? GF.kyc.current(memberId) : [];
    var farms = items.filter(function (i) { return i.data_type === "FARM"; }), crops = items.filter(function (i) { return i.data_type === "CROP"; });
    var mine = Lo.loans.filter(function (l) { return l.member === memberId && l.partner === PARTNER; });
    /* G140 (the owner, 2026-11-11): a loan is never forwarded without sharing consent. After a withdrawal, a live loan
     * keeps access; once every loan with this lender is final, opening the details is refused (NO_CONSENT, logged) and the
     * panel says "Not shared". The lender always sees the name and its own loan records. */
    var liveMine = mine.some(function (l) { return Lo.isLive(l); });
    if (!a.ok && !(a.reason === "WITHDRAWN" && liveMine) || forceNotShared) {
      return Proto.sheet({ wide: true, title: esc(m.full_name), body:
        '<div class="banner banner-warning" id="not-shared">' + icon("lock-outline") + '<div class="grow"><span class="text-title-sm">Not shared</span>' +
        '<span class="text-body-md">' + esc(m.full_name.split(" ")[0]) + " isn't sharing their details with " + esc(partner().name) + " and has no live loan with you. Opening the details was refused and logged.</span></div></div>" +
        '<dl class="facts"><dt>Name</dt><dd>' + esc(m.full_name) + "</dd><dt>Your loans</dt><dd>" + (mine.length ? mine.map(function (l) { return l.reference + " · " + Lo.L.status[l.status][1].toLowerCase(); }).join("<br>") : "None") + "</dd></dl>" });
    }
    var ID = { NATIONAL_ID: "National ID", PASSPORT: "Passport", ALIEN_ID: "Alien ID" };
    Proto.sheet({ wide: true, title: esc(m.full_name), body:
      '<div class="banner banner-info">' + icon("eye-outline") + '<div class="grow"><span class="text-body-md">This opening is logged as a data read, with your name, under ' +
        esc(m.full_name.split(" ")[0]) + "'s sharing consent and " + (mine.length ? "the loan it allows" : "no live loan") + ".</span></div></div>" +
      '<span class="text-title-sm">What ' + esc(partner().name) + "'s sharing text lists</span>" +
      '<dl class="facts"><dt>Name</dt><dd>' + esc(m.full_name) + '</dd><dt>Phone</dt><dd class="tabular">' + f.phone(m.phone) + "</dd>" +
      "<dt>" + (ID[m.id_type] || "ID") + '</dt><dd class="tabular">' + m.id_number + "</dd>" +
      "<dt>Born</dt><dd>" + (m.date_of_birth ? f.date(m.date_of_birth) : "–") + "</dd>" +
      "<dt>Where they live</dt><dd>" + esc([m.profile.address.village, m.profile.address.ward, GF.get(m.area).name].filter(Boolean).join(", ")) + "</dd>" +
      "<dt>Cooperative</dt><dd>" + esc(GF.get(m.cooperative).profile.short_name) + "</dd>" +
      "<dt>Farms and crops</dt><dd>" + (farms.length || crops.length ? farms.length + " farm" + (farms.length === 1 ? "" : "s") + ", " + crops.length + " crop" + (crops.length === 1 ? "" : "s") + " checked by GroFunder" : "Nothing checked yet") + "</dd>" +
      "<dt>Growth Circle</dt><dd>" + (circle ? gs.count + " members, " + gs.rows.filter(function (r) { return r.verified; }).length + " verified" : "None") +
        '<span class="cell-sub tone-muted">Counts only: other members\' names are never shown</span></dd>' +
      "<dt>Loans through GroFunder</dt><dd>" + (mine.length ? mine.map(function (l) { return l.reference + " · " + Lo.L.status[l.status][1].toLowerCase(); }).join("<br>") : "None") +
        '<span class="cell-sub tone-muted">With ' + esc(partner().name) + " only: never another lender's</span></dd></dl>" +
      '<p class="text-body-sm tone-muted">Not shown, by 29: the member\'s GroFunder credit score and its factors, any limit set by hand, GroFunder\'s review notes, other circle members\' names, and loans with other lenders.</p>' });
  }
  /** Record the action as the event it raises, so the prototype says what really happens. */
  function raised(event, extra) { Proto.snack("Recorded as " + event + (extra ? " · " + extra : "")); }
  window.PortalUI = { PARTNER: PARTNER, esc: esc, chip: chip, icon: icon, when: when, money: money, whole: whole, ROLES: ROLES, partner: partner, me: me, staffName: staffName, statusOf: statusOf,
    loans: loans, queue: queue, behind: behind, account: account, gfShare: gfShare, shareByPeriod: shareByPeriod, quoteCard: quoteCard, memberSheet: memberSheet, raised: raised };
})();
