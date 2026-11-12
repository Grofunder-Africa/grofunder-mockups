/* console.js: what several console screens share (phase 4). Loaded after
 * assets/data/canon.js on console pages. Dialogs follow note 01's rules; the
 * shell's Proto.dialog / confirm / sheet draw them. */
(function () {
  "use strict";
  var q = GF.q, f = GF.fmt;
  var R = (function () { var t = document.querySelector('script[src$="gf/assets/console.js"], script[src$="assets/console.js"]'); return t ? t.getAttribute("src").replace(/assets\/console\.js$/, "") : "./"; })();

  var STATUS = { ONBOARDING: ["info", "Onboarding"], ACTIVE: ["success", "Active"], ON_HOLD: ["warning", "On hold"], ENDED: ["neutral", "Ended"] };
  var MEMBER = { ACTIVE: ["success", "Active"], SUSPENDED: ["warning", "Suspended"], EXITED: ["neutral", "Exited"] };
  var chip = function (map, s) { return '<span class="status status-' + map[s][0] + '">' + map[s][1] + "</span>"; };
  var esc = function (t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };

  /* Note 01's transitions: from -> [to, needs a reason, rule]. */
  var MOVES = {
    ONBOARDING: [["ACTIVE", false, "Needs at least one staff member who has accepted their invitation."], ["ENDED", true, "It never went live."]],
    ACTIVE: [["ON_HOLD", true, "Staff can still sign in and see everything; deliveries and payouts carry on; nothing new starts."], ["ENDED", true, "Read only from then on. This can't be undone."]],
    ON_HOLD: [["ACTIVE", false, "Everything starts again."], ["ENDED", true, "Read only from then on. This can't be undone."]],
    ENDED: []
  };
  var VERB = { ACTIVE: "Activate", ON_HOLD: "Put on hold", ENDED: "End", ONBOARDING: "" };

  function coopUrl(id) { return R + "cooperatives/detail.html?c=" + id; }
  /* A member opens as a panel on their cooperative's page (UI-13). */
  function memberUrl(id) { return R + "cooperatives/detail.html?c=" + GF.get(id).cooperative + "&m=" + id; }
  function accepted(coopId) { return q.staffOf(coopId).length; }

  function changeStatus(coopId) {
    var c = GF.get(coopId), moves = MOVES[c.status];
    if (!moves.length) return Proto.snack("An ended cooperative can't change status");
    var opts = moves.map(function (m, i) {
      var blocked = m[0] === "ACTIVE" && c.status === "ONBOARDING" && !accepted(coopId);
      return '<label class="radio-card" style="flex-direction:row;gap:12px;align-items:flex-start' + (blocked ? ";opacity:.5" : "") + '"><input type="radio" name="to" value="' + m[0] + '"' +
        (i === 0 && !blocked ? " checked" : "") + (blocked ? " disabled" : "") + ' style="margin-top:2px"><span class="col gap-1"><span class="text-title-sm">' + VERB[m[0]] + "</span>" +
        '<span class="text-body-sm tone-muted">' + (blocked ? "Not yet: nobody has accepted an invitation." : m[2]) + "</span></span></label>";
    }).join("");
    var el = Proto.dialog({
      title: "Change " + esc(c.profile.short_name) + "'s status",
      body: '<p class="text-body-md tone-muted">Now ' + STATUS[c.status][1].toLowerCase() + ". Every staff member is told by email and in the app.</p>" +
        '<div class="col gap-2" role="radiogroup" aria-label="New status">' + opts + "</div>" +
        '<div class="field" id="why-f"><label class="field-label" for="why">Reason</label><textarea class="field-input" id="why" placeholder="Shown in the history and in the notice to staff"></textarea></div>',
      submit: "Change status",
      onSubmit: function () { Proto.snack(esc(c.profile.short_name) + " is now " + STATUS[(document.querySelector('input[name="to"]:checked') || {}).value || c.status][1].toLowerCase()); }
    });
    var sync = function () {
      var v = (el.querySelector('input[name="to"]:checked') || {}).value;
      var m = moves.find(function (x) { return x[0] === v; });
      el.querySelector("#why-f").style.display = m && m[1] ? "" : "none";
    };
    el.addEventListener("change", sync); sync();
  }

  function invite(coopId, resend) {
    var c = GF.get(coopId), pending = q.invitationsOf(coopId).filter(function (i) { return i.owner; })[0];
    if (resend && pending) {
      return Proto.dialog({
        title: "Resend the invitation",
        body: '<p class="text-body-md">A new email goes to <b>' + esc(pending.email) + "</b>. The link in the earlier email stops working.</p>" +
          '<div class="field"><label class="field-label" for="lnk">Or send this link by WhatsApp or SMS</label><div class="field-box"><input class="field-input" id="lnk" readonly value="https://app.grofunder.example/invite/7Kq2mX9vT4" style="padding-right:52px">' +
          '<button class="icon-btn" type="button" aria-label="Copy the link" onclick="Proto.snack(\'Link copied\')"><span class="mdi mdi-content-copy" aria-hidden="true"></span></button></div>' +
          '<span class="field-help">The link is shown once, after resending. It works until someone uses it.</span></div>',
        submit: "Resend", onSubmit: function () { Proto.snack("Invitation sent again to " + pending.email); }
      });
    }
    /* One owner (01 amended): the invitation is as owner only while there is no owner and none is invited as one. */
    var owner = q.staffOf(coopId).find(function (u) { return u.memberships.some(function (m) { return m.account === coopId && m.owner; }); });
    var standing = owner ? "They join as an administrator. " + esc(owner.name) + " stays the owner and manages the team."
      : pending ? "They join as an administrator. " + esc(pending.email) + " is invited as the owner; revoke that invitation first if the address was wrong."
      : "They become its owner and invite the rest of their team.";
    Proto.dialog({
      title: "Invite an administrator",
      body: '<p class="text-body-md tone-muted">For ' + esc(c.profile.short_name) + "'s first administrator, or a replacement. " + standing + "</p>" +
        '<div class="field"><label class="field-label" for="em">Email</label><input class="field-input" id="em" type="email" placeholder="name@example.com"></div>',
      submit: "Send invitation", onSubmit: function () { Proto.snack("Invitation sent"); }
    });
  }

  /* G7 Staff: GroFunder's hand-over, for when the owner has left (01, hand_over). */
  function handOver(coopId, userId) {
    var c = GF.get(coopId), u = GF.get(userId);
    var owner = q.staffOf(coopId).find(function (x) { return x.memberships.some(function (m) { return m.account === coopId && m.owner; }); });
    Proto.dialog({
      title: "Make " + esc(u.name) + " the owner?",
      body: '<p class="text-body-md">' + esc(u.name.split(" ")[0]) + " manages " + esc(c.profile.short_name) + "'s team from now on" +
        (owner ? ". " + esc(owner.name) + " stops being the owner and stays on with their roles, until the new owner removes them." : ".") +
        " Both are told by email, with your reason.</p>" +
        '<p class="text-body-sm tone-muted">For when the owner has left or lost their login. An owner who is still there hands over themselves, in the portal.</p>' +
        '<div class="field"><label class="field-label" for="hr">Reason</label><textarea class="field-input" id="hr" rows="2" placeholder="Grace left the cooperative in October"></textarea>' +
        '<span class="field-help">Required. Both people see it.</span></div>',
      submit: "Make owner", onSubmit: function (d) {
        if (!d.querySelector("#hr").value.trim()) return Proto.snack("Nothing changed: a reason is needed");
        Proto.snack(u.name + " is now the owner");
      }
    });
  }

  function revoke(coopId, invId) {
    var i = q.invitationsOf(coopId).find(function (x) { return x.id === invId; });
    Proto.confirm({
      title: "Revoke this invitation?",
      message: "The link sent to " + esc(i.email) + " stops working." + (i.owner ? " The next administrator you invite is invited as the owner." : ""),
      confirm: "Revoke", destructive: true, onConfirm: function () { Proto.snack("Invitation revoked"); }
    });
  }

  function remove(coopId) {
    var c = GF.get(coopId);
    if (c.status !== "ONBOARDING") return Proto.snack("Only a cooperative still onboarding can be deleted");
    Proto.confirm({
      title: "Delete " + esc(c.profile.short_name) + "?",
      message: "It never went live and nothing is attached yet, so it can go: its account, its documents and its pending invitation are removed too. To keep the record, end it instead.",
      confirm: "Delete", destructive: true,
      onConfirm: function () { Proto.snack(esc(c.profile.short_name) + " deleted"); setTimeout(function () { location.href = R + "cooperatives/index.html"; }, 900); }
    });
  }

  /* G2: search across cooperatives and members. */
  function search() {
    var el = Proto.sheet({ title: "Search", body:
      '<div class="field search"><div class="field-box"><span class="lead"><span class="mdi mdi-magnify" aria-hidden="true"></span></span>' +
      '<input class="field-input" id="gsq" type="search" placeholder="Cooperative, member name, ID or phone" aria-label="Search everything" autocomplete="off"></div></div>' +
      '<div class="col gap-4" id="gsr"><p class="text-body-md tone-muted">Cooperatives by name or registration number; members of any cooperative by name, member number, ID or phone.</p></div>' });
    var input = el.querySelector("#gsq");
    input.focus();
    input.addEventListener("input", function () {
      var t = input.value.trim().toLowerCase(), digits = t.replace(/\D/g, "");
      if (t.length < 2) return;
      var coops = GF.cooperatives.filter(function (c) { return (c.name + c.registration_no).toLowerCase().indexOf(t) > -1; }).slice(0, 4);
      var mem = GF.members.filter(function (m) {
        return m.full_name.toLowerCase().indexOf(t) > -1 || m.member_no.toLowerCase() === t || (digits.length >= 4 && (m.id_number.indexOf(digits) > -1 || (m.phone || "").indexOf(digits.replace(/^0/, "")) > -1));
      });
      el.querySelector("#gsr").innerHTML =
        (coops.length ? '<div class="col gap-2"><span class="text-label-md tone-muted">Cooperatives</span><div class="list rowcards">' + coops.map(function (c) {
          return '<a class="rowcard" href="' + coopUrl(c.id) + '"><span class="grow"><span class="text-body-lg">' + esc(c.profile.short_name) + '</span><span class="text-body-md tone-muted">' + (c.registration_no || "No registration number") + "</span></span>" + chip(STATUS, c.status) + "</a>";
        }).join("") + "</div></div>" : "") +
        '<div class="col gap-2"><span class="text-label-md tone-muted">Members' + (mem.length > 6 ? " · first 6 of " + mem.length : "") + '</span><div class="list rowcards">' + (mem.length ? mem.slice(0, 6).map(function (m) {
          return '<a class="rowcard" href="' + memberUrl(m.id) + '"><span class="grow"><span class="text-body-lg">' + esc(m.full_name) + '</span><span class="text-body-md tone-muted tabular">' + m.member_no + " · " + esc(GF.get(m.cooperative).profile.short_name) + "</span></span>" + chip(MEMBER, m.status) + "</a>";
        }).join("") : '<div class="rowcard"><span class="text-body-md tone-muted">No member matches.</span></div>') + "</div></div>";
    });
  }

  /* G10 as a panel (UI-13): a member as their cooperative keeps them, plus
   * their member-app login. Opened from the Members tab or from search. */
  function memberPanel(memberId) {
    var m = GF.get(memberId), c = GF.get(m.cooperative), u = q.loginOf(m);
    var GENDER = { FEMALE: "Female", MALE: "Male", UNDISCLOSED: "Not said" }, ID = { NATIONAL_ID: "National ID", PASSPORT: "Passport", ALIEN_ID: "Alien ID" };
    var LABEL = { ACTIVE: "Active", SUSPENDED: "Suspended", EXITED: "Exited" };
    var age = m.date_of_birth ? " (" + (2026 - +m.date_of_birth.slice(0, 4) - ("10-30" < m.date_of_birth.slice(5) ? 1 : 0)) + ")" : "";
    var pos = q.memberPositions(m.id).map(function (p) { return GF.get(p.position).name + (p.cluster ? ", " + GF.get(p.cluster).name : ""); });
    var login = !u ? '<p class="text-body-md tone-muted">No login yet. The member signs up in the app with their ID and the phone on this record.</p>' :
      (u.is_active ? "" : '<div class="banner banner-error"><span class="mdi mdi-account-cancel-outline" aria-hidden="true"></span><div class="grow"><span class="text-body-md">Disabled ' + f.date(u.disabled.at) + " by " + u.disabled.by + ": " + esc(u.disabled.reason) + "</span></div></div>") +
      '<dl class="facts stack"><dt>Signs in as</dt><dd class="tabular">' + u.username + " or " + f.phone(u.phone) + '</dd><dt>Signed up · last signed in</dt><dd class="tabular">' + f.date(u.date_joined) + " · " + f.date(u.last_sign_in_at) +
      "</dd><dt>Records this login reaches</dt><dd>" + q.recordsOf(u.id).map(function (r) { return esc(GF.get(r.cooperative).profile.short_name) + " (" + r.member_no + ")"; }).join("<br>") + "</dd></dl>" +
      '<div class="actions actions-start" data-roles="owner full">' + (u.is_active
        ? '<button class="btn btn-outlined tone-error" type="button" onclick="Console.disableLogin(\'' + m.id + '\')">Disable login</button>'
        : '<button class="btn btn-outlined" type="button" onclick="Proto.confirm({title:\'Re-enable this login?\',message:\'The member can sign in again, with their PIN and an SMS code.\',confirm:\'Re-enable\',onConfirm:function(){Proto.snack(\'Login re-enabled\')}})">Re-enable login</button>') + "</div>";
    Proto.sheet({ wide: true, title: esc(m.full_name), body:
      '<div class="col gap-1"><div class="row gap-2 wrap">' + chip(MEMBER, m.status) + (u ? (u.is_active ? '<span class="status status-neutral">Uses the app</span>' : '<span class="status status-error">Login disabled</span>') : "") + "</div>" +
      '<span class="text-body-md tone-muted tabular">' + m.member_no + " · " + (m.cluster ? GF.get(m.cluster).name + " cluster · " : "") + esc(c.profile.short_name) + " · since " + f.date(m.joined_on) + "</span></div>" +
      '<span class="text-title-sm">Details</span><span class="text-body-sm tone-muted">As the cooperative keeps them. Only its staff change them.</span>' +
      '<dl class="facts"><dt>ID</dt><dd class="tabular">' + ID[m.id_type] + " " + m.id_number + '</dd><dt>Phone</dt><dd class="tabular">' + f.phone(m.phone) + "</dd><dt>Gender</dt><dd>" + GENDER[m.gender] +
      '</dd><dt>Born</dt><dd class="tabular">' + (m.date_of_birth ? f.date(m.date_of_birth) + age : "–") + "</dd><dt>Lives in</dt><dd>" + [m.profile.address.village, m.profile.address.ward, GF.get(m.area).name].filter(Boolean).join(", ") +
      "</dd><dt>Positions</dt><dd>" + (pos.join("; ") || "–") + "</dd><dt>Nominees</dt><dd>" + (m.profile.nominees.map(function (n) { return esc(n.name) + " (" + n.relationship.toLowerCase() + ", " + n.share_pct + "%)"; }).join("; ") || "–") + "</dd></dl>" +
      kycSection(m) + circleSection(m) + creditSection(m) + loanSection(m) + recoverySection(m) + consentSection(m) +
      '<div class="divider"></div><span class="text-title-sm">Member app login</span>' + login +
      '<div class="divider"></div><span class="text-title-sm">Status history</span><div class="rowcards">' + q.statusHistory(m.id).map(function (h) {
        return '<div class="rowcard" style="padding-left:0;padding-right:0">' + chip(MEMBER, h.to_status) + '<span class="grow"><span class="text-body-md">' + (h.from_status ? (h.details.reason ? '"' + esc(h.details.reason) + '"' : "Back to " + LABEL[h.to_status].toLowerCase()) : "Joined") +
          '</span><span class="text-body-sm tone-muted">' + f.date(h.changed_at) + (h.changed_by ? " · " + h.changed_by : " · imported") + "</span></span></div>";
      }).join("") + "</div>" +
      '<p class="proto-note proto-gap"><b>G2:</b> where the reason for disabling a login is kept (note 06 leaves it to the audit trail).</p>' });
  }
  /* Verification for loans (note 20): where this record stands, its live or last
   * visit, and Open a verification (kyc.assign, note 20 Q3). Pages that don't
   * load kyc.js leave it out. */
  function kycSection(m) {
    var K = GF.kyc;
    if (!K) return "";
    var st = K.standing(m.id), live = K.liveVisit(m.id), last = K.visitsOf(m.id)[0], v = live || last;
    var until = st.verified ? st.rows.filter(function (r) { return K.TYPES[r.type].need === "VERIFIED" || K.TYPES[r.type].need === "ONE_VERIFIED"; })
      .map(function (r) { return r.items.filter(function (i) { return K.counts(i); }).map(function (i) { return K.validUntil(i); }).sort().pop(); }).filter(Boolean).sort()[0] : null;
    /* Suspended: the checks stay, but don't count while suspended (note 23, gap 1). */
    var held = st.complete && st.suspended;
    var word = st.verified ? '<span class="status status-success">Verified</span>' : held ? '<span class="status status-warning">Not counted while suspended</span>' : live ? '<span class="status status-' + (live.status === "SUBMITTED" ? "warning" : "info") + '">' + (live.status === "SUBMITTED" ? "Visit to review" : "Visit open") + "</span>" : '<span class="status status-neutral">Not verified</span>';
    var line = st.verified ? "Verified for loans until " + f.date(until) + "." : held ? "The checks are in date, but a suspended member doesn't count as verified. They count again once the cooperative makes the record active." : live ? (live.agent ? "With " + esc(K.staffName(live.agent)) + "." : "No agent assigned yet.") : last ? "The last visit was " + K.L.visitStatus[last.status][1].toLowerCase() + "." : "No visit yet.";
    var cs = GF.get(m.cooperative).status, canOpen = m.status === "ACTIVE" && !live && (cs === "ACTIVE" || cs === "ONBOARDING");
    /* The member's current items, with Reject for reviewers (kyc.review): anything found false (audit, 2026-11-08). */
    var items = K.current(m.id).filter(function (i) { return i.status !== "REJECTED"; });
    var ST = { UNVERIFIED: ["neutral", "Declared"], VERIFIED: ["success", "Verified"], DIFFERS: ["warning", "Differs"] };
    var list = items.length ? '<div class="rowcards" id="kyc-items">' + items.map(function (i) {
      return '<div class="rowcard" style="padding-left:0;padding-right:0"><span class="grow"><span class="text-body-md">' + K.TYPES[i.data_type].label + '</span><span class="text-body-sm tone-muted">' + K.L.source[i.source] + "</span></span>" +
        chip(ST, i.status) + '<button class="btn btn-text btn-sm" type="button" data-roles="owner full ops" onclick="Console.rejectItem(\'' + i.id + '\')">Reject</button></div>';
    }).join("") + "</div>" : "";
    return '<div class="divider"></div><span class="text-title-sm">Verification for loans</span>' +
      '<span class="text-body-sm tone-muted">For this record at ' + esc(GF.get(m.cooperative).profile.short_name) + ' only. The cooperative sees whether it is verified, nothing more.</span>' +
      '<div class="row gap-2 wrap">' + word + '<span class="text-body-md">' + line + "</span></div>" +
      list + (m.status === "ACTIVE" && !live && !canOpen ? '<span class="text-body-sm tone-muted">' + esc(GF.get(m.cooperative).profile.short_name) + " is " + cs.toLowerCase().replace("_", " ") + ": no new verification can be opened.</span>" : "") +
      '<div class="actions actions-start">' + (v ? '<a class="btn btn-outlined" href="../kyc/visit.html?v=' + v.id + '">' + (live ? "Open the visit" : "See the last visit") + "</a>" : "") +
      (canOpen ? '<a class="btn btn-tonal" data-roles="owner full ops" href="../kyc/index.html?open=1&amp;m=' + m.id + '">Open a verification</a>' : "") + "</div>";
  }
  /* Growth Circle (note 23: the member page shows the circle through circles/?member=).
   * Pages that don't load groups.js leave it out. */
  function circleSection(m) {
    var G = GF.groups;
    if (!G) return "";
    var x = G.placeOf(m.id), inv = G.invitationsOf(m.id), c = x && G.get(x.circle);
    var line = c ? '<a href="' + R + 'groups/circle.html?c=' + c.id + '">' + esc(c.name) + "</a> · " + (x.role === "LEADER" ? "leader" : x.status === "JOINING" ? "joining on " + f.date(x.objection_ends_at, "short") : "member since " + f.date(x.joined_at, "short")) +
      " · circle " + G.L.status[c.status][1].toLowerCase() + (m.status === "SUSPENDED" ? ". Suspended: keeps the place, but can't borrow" : "")
      : inv.length ? "Not in a circle; invited to " + inv.map(function (i) { return '<a href="' + R + 'groups/circle.html?c=' + i.circle + '">' + esc(G.get(i.circle).name) + "</a>"; }).join(", ")
      : "Not in a circle";
    return '<div class="divider"></div><span class="text-title-sm">Growth Circle</span><span class="text-body-md" id="circle-line">' + line + "</span>";
  }
  /* Credit (note 25): the limit that counts, and a link to the member's credit (CR2). */
  function creditSection(m) {
    var C = GF.credit;
    if (!C) return "";
    var l = C.limit(m.id), s = l.score;
    var line = !l.eligible ? (l.reason === "PAUSED" ? "Borrowing blocked" : C.L.reason[l.reason]) : f.money(l.limit_cents, { whole: true }) + (l.override ? " (override)" : "") + (s ? " · score " + s.score + ", step " + s.ladder_step : "");
    return '<div class="divider"></div><span class="text-title-sm">Credit</span><span class="text-body-md" id="credit-line">' + esc(line) + ' · <a href="' + R + 'credit/member.html?m=' + m.id + '">Open</a></span>';
  }
  /* Loans (note 26 part 1; phase 16, UI-110): this record's loans, newest first, and Prepare a loan (loans.prepare). */
  function loanSection(m) {
    var Lo = GF.loans;
    if (!Lo) return "";
    var list = Lo.ofMember(m.id);
    return '<div class="divider"></div><span class="text-title-sm">Loans</span>' +
      '<div class="rowcards" id="loan-rows">' + (list.length ? list.map(function (l) {
        return '<a class="rowcard" style="padding-left:0;padding-right:0" href="' + R + 'loans/loan.html?l=' + l.id + '"><span class="grow"><span class="text-body-md tabular">' + l.reference + " · " + f.money(l.amount_cents, { whole: true }) + '</span><span class="text-body-sm tone-muted">' +
          esc(GF.partners.get(l.product).name) + " · " + f.date(l.created_at, "short") + "</span></span>" + chip(Lo.L.status, l.status) + "</a>";
      }).join("") : '<div class="rowcard" style="padding-left:0;padding-right:0"><span class="text-body-md tone-muted">No loans.</span></div>') + "</div>" +
      (m.status === "ACTIVE" && !list.some(Lo.isLive) ? '<div class="actions actions-start" data-roles="owner full ops"><a class="btn btn-tonal" href="' + R + "loans/prepare.html?m=" + m.id + '">Prepare a loan</a></div>' : "");
  }
  /* Recovery (note 28; phase 18, UI-130): a defaulted loan being recovered through this cooperative.
   * What has been taken and what is left; the arrangement is the cooperative's to agree, in its portal. */
  function recoverySection(m) {
    var Rc = GF.recovery;
    if (!Rc) return "";
    var list = Rc.cases.filter(function (c) { return c.member === m.id; }).sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    if (!list.length) return "";
    return '<div class="divider"></div><span class="text-title-sm">Recovery</span>' +
      '<span class="text-body-sm tone-muted">Only while a loan of theirs has defaulted. The cooperative sees the arrangement and what it withheld, never the lender\'s pricing.</span>' +
      '<div class="rowcards" id="recovery-rows">' + list.map(function (c) {
        var pr = Rc.progress(c), left = pr.loan_left_cents + pr.fee_left_cents;
        var agreed = c.arrangement === "FULL" ? "As much as the terms allow" : c.per_payout_bps ? (c.per_payout_bps / 100) + "% of each payout" : f.money(c.per_payout_cents, { whole: true }) + " from each payout";
        var sub = c.status === "RECOVERING" || c.status === "PAUSED" ? agreed + " · " + f.money(pr.loan_recovered_cents, { whole: true }) + " taken, " + f.money(left, { whole: true }) + " left"
          : c.status === "CLOSED" ? (Rc.L.end[c.end_reason] || "Closed") + (pr.fee_left_cents ? " · collection fee " + f.money(pr.fee_left_cents, { whole: true }) + " still owed" : "")
          : c.status === "PENDING" ? "Waiting for GroFunder to confirm" : c.status === "OPEN" ? "Waiting for the cooperative to agree an arrangement" : esc(c.details.decline_reason || "");
        return '<a class="rowcard" style="padding-left:0;padding-right:0" href="' + R + 'recovery/case.html?c=' + c.id + '"><span class="grow"><span class="text-body-md tabular">' + c.reference +
          '</span><span class="text-body-sm tone-muted">' + sub + "</span></span>" + chip(Rc.L.status, c.status) + "</a>";
      }).join("") + "</div>";
  }
  /* Consents (note 22; phase 15, UI-100): this record's lending consents and the login's terms.
   * consents.view for every office role; taking one by SMS code (consents.record) and withdrawing
   * (consents.withdraw) are Operations and up. Pages that don't load consents.js leave it out. */
  function consentSection(m) {
    var C = GF.consents;
    if (!C) return "";
    var u = q.loginOf(m), lend = C.allows(m.id, "LENDING"), recs = C.recordsOf(m.id);
    var verLine = function (r) { var v = C.version(r.version); return "Version " + v.number + " (" + C.L.locale[v.locale] + ")"; };
    var row = function (title, r, extra, action) {
      return '<div class="rowcard" style="padding-left:0;padding-right:0;align-items:flex-start"><span class="grow"><span class="text-body-md">' + esc(title) + '</span><span class="text-body-sm tone-muted">' +
        (r ? verLine(r) + " · " + f.date(r.occurred_at, "short") + ", " + r.occurred_at.slice(11, 16) + " · " + esc(C.how(r)) + (r.metadata.withdrawal ? ': "' + esc(r.metadata.withdrawal.reason) + '"' : "") : "No decision yet") +
        (extra ? "<br>" + extra : "") + "</span></span>" + (r ? chip(C.L.decision, r.decision) : '<span class="status status-neutral">Not agreed</span>') + (action || "") + "</div>";
    };
    var live = function (r) { var lv = r && C.live(r.document, C.version(r.version).locale); return lv ? lv : null; };
    var lendRec = C.current(m.id, "cd-lending");
    var lendExtra = !lend.ok && lend.reason === "NEEDS_RECONSENT" ? '<span class="tone-warning">Version ' + live(lendRec).number + " needs them to agree again before anything new.</span>" : "";
    var canTake = m.status === "ACTIVE" && (!lend.ok);
    var rows = [row("Lending", lendRec, lendExtra, lendRec && lendRec.decision === "GRANTED" ? '<button class="btn btn-text btn-sm" type="button" data-roles="owner full ops" onclick="Console.withdrawConsent(\'' + m.id + '\',\'cd-lending\')">Withdraw</button>' : "")];
    /* Sharing with each lender, and loan agreements, as loans (26) records them. */
    var seen = {};
    recs.filter(function (r) { return r.document !== "cd-lending" && !seen[r.document] && (seen[r.document] = true); }).forEach(function (r) {
      var d = C.doc(r.document), withdrawable = d.kind === "CONSENT" && r.decision === "GRANTED";
      rows.push(row(d.name, r, r.context && r.context.indexOf("loan:") === 0 ? esc(C.L.context(r.context)) : "", withdrawable ? '<button class="btn btn-text btn-sm" type="button" data-roles="owner full ops" onclick="Console.withdrawConsent(\'' + m.id + '\',\'' + d.id + '\')">Withdraw</button>' : ""));
    });
    var terms = u ? C.currentTerms(u.id) : null;
    var termsLine = !u ? "" : '<span class="text-body-sm tone-muted">Their login\'s terms of use: ' + (terms ? verLine(terms) + ", " + f.date(terms.occurred_at, "short") + (C.needsReconsent(terms) ? '. <span class="tone-warning">Version ' + C.live("cd-terms", C.version(terms.version).locale).number + " waits for them to agree in the app.</span>" : "") : "not recorded") + "</span>";
    var ledger = recs.filter(function (r) { return !r.implied; });
    return '<div class="divider"></div><span class="text-title-sm">Consents</span>' +
      '<span class="text-body-sm tone-muted">What this record at ' + esc(c(m).profile.short_name) + " has agreed to (22). Kept per membership. The cooperative sees none of it.</span>" +
      '<div class="rowcards" id="consent-rows">' + rows.join("") + "</div>" + termsLine +
      (canTake ? '<div class="actions actions-start" data-roles="owner full ops"><button class="btn btn-tonal" type="button" onclick="Console.takeConsent(\'' + m.id + '\',\'account\')">Take consent by SMS code</button></div>' : "") +
      (ledger.length ? '<div class="disclosure" style="flex:none"><div class="disclosure-item"><button class="disclosure-trigger" type="button" aria-expanded="false">Every decision (' + ledger.length + ')</button><div class="disclosure-panel" hidden><div class="rowcards">' + ledger.map(function (r) {
        return '<div class="rowcard" style="padding-left:0;padding-right:0"><span class="grow"><span class="text-body-sm">' + esc(C.doc(r.document).name) + " · " + verLine(r) + '</span><span class="text-body-sm tone-muted">' + f.date(r.occurred_at, "short") + ", " + r.occurred_at.slice(11, 16) + " · " + esc(C.how(r)) + " · " + esc(C.L.context(r.context)) + "</span></span>" + chip(C.L.decision, r.decision) + "</div>";
      }).join("") + "</div></div></div></div>" : "");
  }
  var c = function (m) { return GF.get(m.cooperative); };
  /* Taking consent by SMS code (22, step 4; consents.record): the summary read aloud, a code to the
   * phone on record that names what is agreed, and the code the member reads back. An agent may do it
   * only for the member of a visit assigned to them. */
  function takeConsent(memberId, context, done) {
    var C = GF.consents, m = GF.get(memberId), first = m.full_name.split(" ")[0], lang = (m.profile && m.profile.language) || GF.get(m.cooperative).profile.default_language || "en";
    var draw = function (l) { var v = C.live("cd-lending", l); return '<span class="text-title-sm">' + esc(v.title) + '</span><span class="text-body-md">' + esc(v.summary) + '</span><span class="text-body-sm tone-muted">Version ' + v.number + " · " + C.L.locale[l] + "</span>"; };
    var d = Proto.dialog({ title: "Ask " + esc(first) + " to agree to lending",
      body: '<p class="text-body-md tone-muted">Read this out, then send the code. ' + esc(first) + " reads it back only if they agree.</p>" +
        '<div class="chip-row" data-choice role="radiogroup" aria-label="Language" id="cl">' + ["sw", "en"].map(function (l) { return '<button class="chip" type="button" role="radio" data-l="' + l + '" aria-checked="' + (l === lang) + '">' + C.L.locale[l] + "</button>"; }).join("") + "</div>" +
        '<div class="card card-outlined col gap-2" id="ctext">' + draw(lang) + "</div>" +
        '<p class="text-body-sm tone-muted">The code goes to the phone on the record, ' + f.phone(m.phone) + ', and says what it is for. It works for 10 minutes.</p>',
      submit: "Send the code", onSubmit: function () { askCode(); } });
    d.querySelector("#cl").addEventListener("click", function (e) { var b = e.target.closest("[data-l]"); if (!b) return; lang = b.getAttribute("data-l"); d.querySelector("#ctext").innerHTML = draw(lang); });
    function askCode() {
      var v = C.live("cd-lending", lang);
      var e = Proto.dialog({ title: "Enter " + esc(first) + "'s code",
        body: '<div class="card col gap-1"><span class="text-label-md tone-muted">The SMS ' + esc(first) + " got</span><span class=\"text-body-md\">" + (lang === "sw" ? "GroFunder: unakubali GroFunder kutumia taarifa zako kwa mikopo (toleo " + v.number + "). Nambari yako ni 482913. Itoe tu kama unakubali."
          : "GroFunder: you are agreeing to GroFunder using your details for loans (version " + v.number + "). Your code is 482913. Share it only if you agree.") + "</span></div>" +
          '<div class="field"><label class="field-label" for="ccode">Code</label><input class="field-input tabular" id="ccode" inputmode="numeric" maxlength="6" placeholder="6 digits">' +
          '<span class="field-help">In the prototype any 6 digits work except 000000.</span><span class="field-error hidden" id="ccode-e">That code isn\'t right. 2 tries left.</span></div>',
        submit: "Record consent", onSubmit: function (dl) {
          var code = dl.querySelector("#ccode").value.replace(/\D/g, "");
          if (code.length !== 6 || code === "000000") { Proto.snack("That code isn't right. Nothing was recorded"); return; }
          Proto.snack(first + " agreed to lending, by SMS code");
          if (done) done();
        } });
    }
  }
  /* Withdrawing for a member who asks (22, step 7; KC2; consents.withdraw): how they asked and why,
   * after saying what stops and what carries on. */
  function withdrawConsent(memberId, docId) {
    var C = GF.consents, m = GF.get(memberId), d = C.doc(docId), p = C.PURPOSES[d.slug === "lending" ? "LENDING" : "PARTNER_SHARING"], first = m.full_name.split(" ")[0];
    var K = GF.kyc, open = K && d.slug === "lending" ? K.liveVisit(m.id) : null;
    var li = function (a) { return "<ul class=\"text-body-md\" style=\"margin:0;padding-left:20px\">" + a.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; };
    Proto.dialog({ title: "Withdraw " + esc(first) + "'s consent?",
      body: '<p class="text-body-md">' + esc(d.name) + ". Only on " + esc(first) + "'s own request.</p>" +
        '<span class="text-title-sm">Stops now</span>' + li(p.stops.concat(open && open.status === "OPEN" ? ["Visit " + open.id + " is cancelled"] : [])) +
        '<span class="text-title-sm">Carries on</span>' + li(p.carries) +
        '<div class="field"><span class="field-label">How they asked</span><div class="chip-row" data-choice role="radiogroup" aria-label="How they asked"><button class="chip" type="button" role="radio" aria-checked="true" data-via="PHONE_CALL">Phone call</button><button class="chip" type="button" role="radio" aria-checked="false" data-via="IN_PERSON">In person</button></div></div>' +
        '<div class="field"><label class="field-label" for="cwhy">Reason</label><textarea class="field-input" id="cwhy" rows="2" placeholder="What they said"></textarea><span class="field-help">Required. Kept with the record.</span></div>' +
        '<p class="text-body-sm tone-muted">' + esc(first) + " is told by SMS. They can agree again later, in the app or with an agent.</p>",
      submit: "Withdraw", onSubmit: function (dl) { if (!dl.querySelector("#cwhy").value.trim()) return Proto.snack("Nothing changed: a reason is needed"); Proto.snack("Withdrawn. " + first + " is told by SMS"); } });
  }
  function rejectItem(id) {
    Proto.dialog({ title: "Reject this item?", body: '<p class="text-body-md tone-muted">For something found false, whoever entered it. Any check on it stops counting; the rest stands.</p><div class="field"><label class="field-label" for="rj">Reason</label><textarea class="field-input" id="rj"></textarea></div>',
      submit: "Reject", onSubmit: function (d) { if (!d.querySelector("#rj").value.trim()) return Proto.snack("A reason is needed"); Proto.snack("Item rejected"); } });
  }
  function disableLogin(memberId) {
    var m = GF.get(memberId);
    Proto.dialog({ title: "Disable this login?", body: '<p class="text-body-md tone-muted">' + esc(m.full_name) + " can't sign in to the member app until it's re-enabled. Their memberships and records don't change, in any cooperative.</p>" +
      '<div class="field"><label class="field-label" for="why">Reason</label><textarea class="field-input" id="why" placeholder="Kept in the audit trail"></textarea></div>',
      submit: "Disable login", onSubmit: function () { Proto.snack("Login disabled"); } });
  }

  window.Console = { STATUS: STATUS, MEMBER: MEMBER, MOVES: MOVES, chip: chip, esc: esc, coopUrl: coopUrl, memberUrl: memberUrl, accepted: accepted,
    changeStatus: changeStatus, invite: invite, handOver: handOver, revoke: revoke, remove: remove, search: search, memberPanel: memberPanel, disableLogin: disableLogin, rejectItem: rejectItem, R: R,
    takeConsent: takeConsent, withdrawConsent: withdrawConsent };
})();
