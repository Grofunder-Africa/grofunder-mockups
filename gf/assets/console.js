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
    Proto.dialog({
      title: "Invite an administrator",
      body: '<p class="text-body-md tone-muted">For ' + esc(c.profile.short_name) + "'s first administrator, or a replacement. They become an owner of its account and can invite the rest of their team.</p>" +
        '<div class="field"><label class="field-label" for="em">Email</label><input class="field-input" id="em" type="email" placeholder="name@example.com"></div>',
      submit: "Send invitation", onSubmit: function () { Proto.snack("Invitation sent"); }
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
      '<div class="divider"></div><span class="text-title-sm">Member app login</span>' + login +
      '<div class="divider"></div><span class="text-title-sm">Status history</span><div class="rowcards">' + q.statusHistory(m.id).map(function (h) {
        return '<div class="rowcard" style="padding-left:0;padding-right:0">' + chip(MEMBER, h.to_status) + '<span class="grow"><span class="text-body-md">' + (h.from_status ? (h.details.reason ? '"' + esc(h.details.reason) + '"' : "Back to " + LABEL[h.to_status].toLowerCase()) : "Joined") +
          '</span><span class="text-body-sm tone-muted">' + f.date(h.changed_at) + (h.changed_by ? " · " + h.changed_by : " · imported") + "</span></span></div>";
      }).join("") + "</div>" +
      '<p class="proto-note proto-gap"><b>G2:</b> where the reason for disabling a login is kept (note 06 leaves it to the audit trail).</p>' });
  }
  function disableLogin(memberId) {
    var m = GF.get(memberId);
    Proto.dialog({ title: "Disable this login?", body: '<p class="text-body-md tone-muted">' + esc(m.full_name) + " can't sign in to the member app until it's re-enabled. Their memberships and records don't change, in any cooperative.</p>" +
      '<div class="field"><label class="field-label" for="why">Reason</label><textarea class="field-input" id="why" placeholder="Kept in the audit trail"></textarea></div>',
      submit: "Disable login", onSubmit: function () { Proto.snack("Login disabled"); } });
  }

  window.Console = { STATUS: STATUS, MEMBER: MEMBER, MOVES: MOVES, chip: chip, esc: esc, coopUrl: coopUrl, memberUrl: memberUrl, accepted: accepted,
    changeStatus: changeStatus, invite: invite, remove: remove, search: search, memberPanel: memberPanel, disableLogin: disableLogin, R: R };
})();
