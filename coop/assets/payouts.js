/* payouts.js: what every portal page needs to start and finish a payout
 * (note 08, phase 8, UI-31 and UI-33). Loaded after canon.js, so any page can
 * open the dialogs: the payouts list, the draft, the statement, and the member
 * (C11, phase 6), which calls Payouts.start({ member: id }).
 *
 *   Payouts.start(opts)       C17 dialog. opts: member, to, product, cooperative
 *   Payouts.markPaid(ctx)     C19 dialog. ctx: from the draft page (see draft.html)
 *   Payouts.cancel(ctx)       C21 confirmation
 *   Payouts.offered(member, to, product)  deliveries a new draft would offer
 *   Payouts.fill(lines, mode, value)      Full / Percentage / Amount (oldest first)
 *
 * Not product code: the service does all of this in the app (08's lifecycle).
 */
(function (root) {
  "use strict";
  var GF = root.GF, q = GF.q, f = GF.fmt;
  var RECORD = "admin manager accountant"; // payouts.record (09)
  var METHOD = { MPESA: "M-Pesa", BANK: "Bank", CASH: "Cash" };
  var STATUS = { DRAFT: ["info", "Draft"], PAID: ["success", "Paid"], CANCELLED: ["neutral", "Cancelled"] };
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var url = function (page) { return (root.Proto ? Proto.ROOT : "../../") + "coop/payouts/" + page; };
  /* Dates are typed and shown day first (D7): "30 Oct 2026". A picker in the app. */
  var isoOf = function (s) { var d = new Date(String(s).trim() + " 12:00"); if (isNaN(d)) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  var canRecord = function () { return !root.Proto || RECORD.split(" ").indexOf(Proto.role()) > -1; };

  /** One delivery as a payout line: its price (fixed at the first payment), value, paid before and balance. */
  function line(d, amount) {
    var s = q.standing(d);
    var hasPrice = s.price_cents > 0;
    return { d: d, price_cents: s.price_cents, value_cents: s.value_cents, paid_before_cents: s.paid_cents, balance_cents: s.balance_cents,
      amount_cents: amount === undefined ? s.balance_cents : amount, selected: true, noPrice: !hasPrice };
  }
  /** What a new draft offers (08): RECORDED deliveries up to the date, for the product if set, that still have a balance. Oldest first. */
  function offered(member, to, product) {
    return q.deliveries({ member: member, to: to, recorded: true }).filter(function (d) {
      if (product && d.product !== product) return false;
      var s = q.standing(d);
      return s.price_cents === 0 || s.balance_cents > 0;
    }).map(function (d) { return line(d); });
  }
  /** Full, Percentage or Amount: writes only per-delivery amounts (08, recommendations for the screens). */
  function fill(lines, mode, value) {
    var left = value;
    lines.forEach(function (l) {
      if (!l.selected) { l.amount_cents = 0; return; }
      if (mode === "percent") l.amount_cents = Math.round(l.balance_cents * Math.max(0, Math.min(100, value)) / 100);
      else if (mode === "amount") { l.amount_cents = Math.max(0, Math.min(l.balance_cents, left)); left -= l.amount_cents; }
      else l.amount_cents = l.balance_cents;
    });
    return lines;
  }
  function draftOf(member) { return q.payouts({ member: member, status: "DRAFT" })[0] || null; }
  function memberLine(m) { return m.member_no + " · " + (GF.get(m.cluster) || {}).name + (m.status !== "ACTIVE" ? " · " + { SUSPENDED: "Suspended", EXITED: "Exited" }[m.status] : ""); }
  function productsOf(coop) { return GF.coopProducts.filter(function (cp) { return cp.cooperative === coop && cp.status === "ACTIVE"; }); }
  function chip(status) { var s = STATUS[status]; return '<span class="status status-' + s[0] + '">' + s[1] + "</span>"; }
  function payTo(p) {
    var t = p.details.pay_to || {};
    if (p.method === "CASH") return "Cash";
    return t.bank_name ? t.bank_name + " ····" + t.account_last4 : f.phone(t.phone);
  }

  /* ------------------------------------------------ C17 Start a payout */
  function start(opts) {
    opts = opts || {};
    var coop = opts.cooperative || (opts.member && GF.get(opts.member).cooperative) || GF.who.kijani;
    var people = q.members(coop);
    var prods = productsOf(coop);
    var chosen = opts.member ? GF.get(opts.member) : null;
    var body =
      '<div class="field combo"><label class="field-label" for="ps-m">Member</label>' +
        '<div class="field-box has-trail"><input class="field-input" id="ps-m" autocomplete="off" placeholder="Name, member number or ID" value="' + (chosen ? esc(chosen.full_name) : "") + '">' +
        '<span class="trail"><span class="mdi mdi-account-search-outline" aria-hidden="true"></span></span></div>' +
        '<div class="combo-list hidden" role="listbox" id="ps-list"></div>' +
        '<span class="field-help tabular" id="ps-mh">' + (chosen ? memberLine(chosen) : "") + "</span></div>" +
      '<div class="field"><label class="field-label" for="ps-to">Deliveries up to</label>' +
        '<div class="field-box has-trail"><input class="field-input tabular" id="ps-to" value="' + f.date(opts.to || GF.TODAY) + '">' +
        '<span class="trail"><span class="mdi mdi-calendar-blank-outline" aria-hidden="true"></span></span></div>' +
        '<span class="field-help">Every recorded delivery up to this day that still has a balance is offered, paid in full. You can lower any of them next.</span></div>' +
      (prods.length > 1 ? '<div class="field"><label class="field-label" for="ps-p">Product</label><select class="field-input" id="ps-p"><option value="">All products</option>' +
        prods.map(function (cp) { return '<option value="' + cp.id + '"' + (opts.product === cp.id ? " selected" : "") + ">" + f.productName(cp.id) + "</option>"; }).join("") + "</select></div>" : "") +
      '<div id="ps-preview" role="status"></div>' +
      '<div class="actions"><button class="btn btn-text" type="button" data-cancel>Cancel</button><button class="btn btn-filled" type="button" id="ps-go">Start payout</button></div>';
    var el = Proto.dialog({ title: "Start a payout", body: body });
    var input = el.querySelector("#ps-m"), list = el.querySelector("#ps-list"), help = el.querySelector("#ps-mh");
    var toEl = el.querySelector("#ps-to"), prodEl = el.querySelector("#ps-p"), prev = el.querySelector("#ps-preview"), go = el.querySelector("#ps-go");
    var action = null;
    var day = function () { var d = isoOf(toEl.value); return d && d <= GF.TODAY ? d : GF.TODAY; };

    function preview() {
      action = null;
      if (!chosen) { prev.innerHTML = ""; go.textContent = "Start payout"; return; }
      var draft = draftOf(chosen.id);
      if (draft) {
        prev.innerHTML = '<div class="banner banner-info"><span class="mdi mdi-information-outline" aria-hidden="true"></span><div class="grow"><span class="text-title-sm">' + esc(chosen.full_name) + " already has a draft</span>" +
          '<span class="text-body-md">' + esc(draft.details.label) + ", up to " + f.date(draft.period_end) + ", " + f.money(draft.net_cents) + ". A member has one draft at a time: finish or cancel it first.</span></div></div>";
        go.textContent = "Open the draft"; action = url("draft.html?p=" + draft.id); return;
      }
      var lines = offered(chosen.id, day(), prodEl ? prodEl.value : "");
      var bal = lines.reduce(function (s, l) { return s + l.balance_cents; }, 0), part = lines.filter(function (l) { return l.paid_before_cents > 0; }).length;
      go.textContent = "Start payout";
      if (!lines.length) {
        prev.innerHTML = '<div class="banner banner-warning"><span class="mdi mdi-alert-outline" aria-hidden="true"></span><div class="grow"><span class="text-body-md">Nothing to pay: ' + esc(chosen.full_name) +
          " has no recorded deliveries up to " + f.date(day()) + " with a balance.</span></div></div>";
        action = "none"; return;
      }
      prev.innerHTML = '<dl class="facts"><dt>Deliveries offered</dt><dd class="tabular">' + lines.length + (part ? " (" + part + " part paid before)" : "") + "</dd>" +
        '<dt>Balance on them</dt><dd class="tabular text-title-md">' + f.money(bal) + "</dd></dl>";
      action = url("draft.html?m=" + chosen.id + "&to=" + (day()) + (prodEl && prodEl.value ? "&product=" + prodEl.value : ""));
    }
    function search() {
      var t = input.value.trim().toLowerCase();
      if (chosen && input.value === chosen.full_name) { list.classList.add("hidden"); return; }
      chosen = null; help.textContent = ""; preview();
      if (t.length < 2) { list.classList.add("hidden"); return; }
      var hits = people.filter(function (m) { return (m.full_name + " " + m.member_no + " " + (m.id_number || "")).toLowerCase().indexOf(t) > -1; }).slice(0, 6);
      list.innerHTML = hits.map(function (m) {
        return '<div class="combo-item" role="option" data-id="' + m.id + '"><span class="avatar avatar-sm">' + f.initials(m.full_name) + '</span><span class="col"><span class="text-body-lg">' + esc(m.full_name) +
          '</span><span class="text-body-sm tone-muted tabular">' + memberLine(m) + "</span></span></div>";
      }).join("") || '<div class="combo-item"><span class="text-body-md tone-muted">No member matches</span></div>';
      list.classList.remove("hidden");
    }
    list.addEventListener("click", function (e) {
      var it = e.target.closest("[data-id]"); if (!it) return;
      chosen = GF.get(it.getAttribute("data-id")); input.value = chosen.full_name; help.textContent = memberLine(chosen); list.classList.add("hidden"); preview();
    });
    input.addEventListener("input", search);
    toEl.addEventListener("change", function () { toEl.value = f.date(day()); preview(); });
    if (prodEl) prodEl.addEventListener("change", preview);
    go.addEventListener("click", function () {
      if (!chosen) { help.textContent = "Pick the member to pay."; help.className = "field-error"; input.setAttribute("aria-invalid", "true"); return; }
      if (action === "none") { Proto.snack("Nothing to pay up to that date"); return; }
      location.href = action;
    });
    preview();
    return el;
  }

  /** A refusal with one way out: the service said no, and why. */
  function refuse(title, message) {
    return Proto.dialog({ title: title, body: '<p class="text-body-md">' + message + '</p><div class="actions"><button class="btn btn-text" type="button" data-cancel>OK</button></div>' });
  }

  /* ------------------------------------------------ C19 Mark as paid
   * ctx: { member, lines, net_cents, gross_cents, method, pay_to (text), id? } */
  function markPaid(ctx) {
    var paid = ctx.lines.filter(function (l) { return l.selected && l.amount_cents > 0; });
    var noPrice = paid.filter(function (l) { return l.noPrice; });
    if (noPrice.length) {
      return Proto.confirm({ title: "Can't mark this paid yet", message: noPrice.length + " deliver" + (noPrice.length === 1 ? "y has" : "ies have") + " no price for " + f.date(noPrice[0].d.delivered_on) +
        ". Add the price under Produce, then recalculate, or leave " + (noPrice.length === 1 ? "it" : "them") + " out of this payout.", confirm: "Leave out", cancel: "Close", onConfirm: ctx.onLeaveOut });
    }
    if (!paid.length) return refuse("Nothing would be paid", "A payout needs at least one delivery with an amount (08). Select a delivery, or cancel the draft.");
    if (ctx.net_cents < 0) return refuse("The net is below zero", "Deductions are more than what is paid. Lower a deduction, or pay more of the deliveries.");
    var m = GF.get(ctx.member), cash = ctx.method === "CASH";
    var body =
      '<dl class="facts"><dt>Net to ' + esc(m.full_name.split(" ")[0]) + '</dt><dd class="tabular text-title-lg">' + f.money(ctx.net_cents) + "</dd>" +
      "<dt>By</dt><dd>" + METHOD[ctx.method] + (cash ? "" : ", to " + esc(ctx.pay_to)) + "</dd></dl>" +
      (cash ? "" : '<div class="field"><label class="field-label" for="mp-ref">' + (ctx.method === "MPESA" ? "M-Pesa receipt" : "Bank reference") + ' <span class="optional">(optional)</span></label>' +
        '<input class="field-input tabular" id="mp-ref" autocomplete="off" maxlength="50" placeholder="' + (ctx.method === "MPESA" ? "SKL4H7Q2XM" : "") + '">' +
        '<span class="field-help">So the payment can be found later. Nothing checks it until the M-Pesa link exists (08, concern 1).</span></div>') +
      '<div class="field"><label class="field-label" for="mp-on">Paid on</label><div class="field-box has-trail"><input class="field-input tabular" id="mp-on" value="' + f.date(GF.TODAY) + '">' +
        '<span class="trail"><span class="mdi mdi-calendar-blank-outline" aria-hidden="true"></span></span></div></div>' +
      '<div class="banner banner-warning"><span class="mdi mdi-lock-outline" aria-hidden="true"></span><div class="grow"><span class="text-body-md">This fixes the ' + paid.length + " deliver" + (paid.length === 1 ? "y" : "ies") +
        " it pays and the prices used. A paid payout can't be changed or cancelled: a mistake goes on " + esc(m.full_name.split(" ")[0]) + "'s next payout.</span></div></div>" +
      '<div class="actions"><button class="btn btn-text" type="button" data-cancel>Cancel</button><button class="btn btn-filled" type="button" id="mp-go">Mark as paid</button></div>';
    var el = Proto.dialog({ title: "Mark as paid", body: body });
    el.querySelector("#mp-go").addEventListener("click", function () {
      Proto.close();
      Proto.snack("Paid " + f.money(ctx.net_cents) + " to " + m.full_name, ctx.id ? "View statement" : "Payouts", function () {
        location.href = ctx.id ? url("statement.html?p=" + ctx.id + "&preview=paid&method=" + ctx.method) : url("index.html");
      });
      if (ctx.onPaid) ctx.onPaid();
    });
    return el;
  }

  /* ------------------------------------------------ C21 Cancel a draft */
  function cancel(ctx) {
    return Proto.confirm({ title: "Cancel this draft?", message: "Nothing was paid or fixed. Its deliveries are offered again on " + GF.get(ctx.member).full_name.split(" ")[0] + "'s next payout, and its additions and deductions are dropped.",
      confirm: "Cancel draft", cancel: "Keep draft", destructive: true, onConfirm: function () {
        Proto.snack("Draft cancelled");
        setTimeout(function () { location.href = url("index.html"); }, 900);
      } });
  }

  root.Payouts = { RECORD: RECORD, METHOD: METHOD, STATUS: STATUS, esc: esc, url: url, canRecord: canRecord, line: line, offered: offered, fill: fill,
    draftOf: draftOf, refuse: refuse, memberLine: memberLine, productsOf: productsOf, chip: chip, payTo: payTo, start: start, markPaid: markPaid, cancel: cancel };
})(window);
