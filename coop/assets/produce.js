/* produce.js: what the portal's produce screens share (phase 7, UI-30).
 * Load it right after canon.js, without defer: pages pick their cooperative
 * with Produce.coop() before proto.js draws the shell. Proto is only used
 * once a panel opens.
 *
 *   Produce.coop()            the cooperative shown: ?c=, else the one picked in the account switcher
 *                             (localStorage gf.portalCoop), else Kijani
 *   Produce.products(c)       its active products, with catalog product and unit
 *   Produce.delivery(id)      C5: the delivery panel; Edit works inside it, Void is a dialog over it (C6)
 *   Produce.payments(id)      the DeliveryPayments against a delivery, with their payouts (08)
 *   Produce.findMembers(c, t) members matching a name, number, ID or phone
 *   Produce.url / statementUrl / memberUrl    links between the flows
 *
 * The member's page (C11, phase 6) opens the same panel with Produce.delivery(id).
 */
(function () {
  "use strict";
  var tag = document.querySelector('script[src$="assets/produce.js"]');
  var R = tag ? tag.getAttribute("src").replace(/assets\/produce\.js$/, "") : "../";
  var q = GF.q, f = GF.fmt, get = GF.get;
  var esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var SHOWN = ["co-kijani", "co-mawingu"];
  var RECORDERS = "admin manager clerk";

  /* ?c= first (links in the notes), then the cooperative picked in the account switcher. */
  function coop() {
    var c = new URLSearchParams(location.search).get("c");
    if (SHOWN.indexOf(c) === -1) { try { c = localStorage.getItem("gf.portalCoop"); } catch (e) { c = null; } }
    return get(SHOWN.indexOf(c) > -1 ? c : GF.who.kijani);
  }
  function products(c) {
    return GF.coopProducts.filter(function (cp) { return cp.cooperative === c.id && cp.status === "ACTIVE"; }).map(function (cp) {
      var p = get(cp.product);
      return { id: cp.id, cp: cp, product: p, unit: p.unit, grades: q.gradesOf(p.id).filter(function (g) { return g.status === "ACTIVE"; }) };
    });
  }
  /** Keep ?c= on links inside the produce flow, so Mawingu stays Mawingu. */
  function url(page, extra) {
    var c = new URLSearchParams(location.search).get("c"), qs = [];
    if (c && c !== GF.who.kijani) qs.push("c=" + c);
    if (extra) qs.push(extra);
    return R + "produce/" + page + (qs.length ? "?" + qs.join("&") : "");
  }
  var statementUrl = function (payoutId) { return R + "payouts/statement.html?p=" + payoutId; };
  /* The member's full record is a page in phase 6 (design system §3.0). */
  var memberUrl = function (id) { return R + "members/member.html?m=" + id; };

  function payments(id) {
    return GF.deliveryPayments.filter(function (p) { return p.delivery === id; }).map(function (p) { return { dp: p, payout: get(p.payout) }; });
  }
  function findMembers(c, term) {
    var t = term.trim().toLowerCase().replace(/\s+/g, "");
    if (!t) return [];
    return q.members(c.id).filter(function (m) {
      return (m.full_name.toLowerCase().replace(/\s+/g, "").indexOf(t) > -1) || m.member_no.toLowerCase().replace("-", "").indexOf(t.replace("-", "")) > -1 ||
        m.id_number.indexOf(t) === 0 || (m.phone && ("0" + m.phone.slice(4)).indexOf(t) === 0);
    }).slice(0, 8);
  }

  var SOURCE = { PORTAL: "Typed in the portal", IMPORT: "Imported from a spreadsheet", DEVICE: "From a collection device", API: "From a buyer or mill system" };
  var payState = function (st) {
    return st.state === "VOIDED" ? '<span class="status status-neutral">Voided</span>'
      : st.state === "PAID" ? '<span class="status status-success">Paid</span>'
      : st.state === "PART_PAID" ? '<span class="status status-warning">Part paid</span>' : "";
  };
  function priceLine(d) {
    var pr = q.priceOn(d.product, d.grade, d.delivered_on), unit = get(get(d.product).product).unit;
    if (!pr) return "No price for this date yet";
    return f.money(pr.price_cents) + " per " + GF.UNITS[unit][0] + (pr.grade ? " (" + get(pr.grade).name + ")" : "") + ", from " + f.date(pr.effective_from);
  }

  /* C5 · the delivery, as a panel from a row (UI-13). */
  function delivery(id) {
    var d = get(id), m = get(d.member), cp = get(d.product), p = get(cp.product), st = q.standing(d), pays = payments(id);
    var voided = d.status === "VOIDED", fixed = pays.length > 0, e = d.details.entered;
    var stored = f.qty(d.quantity_milli / 1000, p.unit, { digits: p.unit === "LITRE" ? 1 : 0 });
    var quality = d.details.quality ? Object.keys(d.details.quality).map(function (k) { return k + " " + d.details.quality[k]; }).join(", ") : "";
    var round = d.round ? get(d.round).name : "No round";

    var body =
      '<div class="row gap-2 wrap">' + (voided ? "" : '<span class="status status-success">Recorded</span>') + payState(st) +
        '<span class="text-body-md tone-muted tabular">' + f.date(d.delivered_on) + " · " + round + "</span></div>" +
      (voided ? '<div class="banner banner-info"><span class="mdi mdi-cancel" aria-hidden="true"></span><div class="grow"><span class="text-title-sm">Voided</span>' +
        '<span class="text-body-md">' + esc(d.details.void_reason) + ". Left out of every total, and kept for the record.</span></div></div>" : "") +
      '<a class="rowcard" href="' + memberUrl(m.id) + '"><span class="avatar avatar-sm" aria-hidden="true">' + f.initials(m.full_name) + '</span><span class="grow"><span class="text-body-lg">' + m.full_name +
        '</span><span class="text-body-md tone-muted tabular">' + m.member_no + " · " + get(m.cluster).name + "</span></span>" + Proto.icon("chevron-right") + "</a>" +
      '<div class="col gap-1"><span class="text-headline-sm tabular' + (voided ? " struck tone-muted" : "") + '">' + f.delivery(d) + "</span>" +
        (e ? '<span class="text-body-sm tone-muted">Entered as ' + e.quantity + " " + GF.UNITS[e.unit][e.quantity === 1 ? 0 : 1] + "; stored as " + stored + " at 1 " + GF.UNITS[e.unit][0] + " = " + e.factor + " " + GF.UNITS[p.unit][0] + "</span>" : "") + "</div>" +
      '<dl class="facts">' +
        "<dt>Product</dt><dd>" + f.productName(d.product, d.grade) + "</dd>" +
        "<dt>Received at</dt><dd>" + get(d.cluster).name + "</dd>" +
        '<dt>Receipt</dt><dd class="tabular">' + (d.receipt_no || "None") + "</dd>" +
        (d.details.rejected_quantity ? '<dt>Turned away</dt><dd class="tabular">' + f.qty(d.details.rejected_quantity, p.unit) + "</dd>" : "") +
        (quality ? "<dt>Quality readings</dt><dd class=\"tabular\">" + esc(quality) + "</dd>" : "") +
        (d.details.note ? "<dt>Note</dt><dd>" + esc(d.details.note) + "</dd>" : "") +
        "<dt>Entered</dt><dd>" + SOURCE[d.source] + (d.recorded_by ? ", by " + d.recorded_by : "") + "</dd>" +
      "</dl>" +
      (voided ? "" :
      '<div class="card card-outlined"><div class="card-header"><div class="card-header-text"><span class="card-title">Value and payments</span>' +
        '<span class="card-description">' + (fixed ? "Price fixed at the first payment" : priceLine(d)) + "</span></div></div>" +
        '<div class="totals" style="width:100%"><div><span>Value</span><span>' + f.money(st.value_cents) + "</span></div>" +
        pays.map(function (x) {
          return '<div><span><a href="' + statementUrl(x.payout.id) + '">' + esc(x.payout.details.label) + '</a> <span class="sub">paid ' + f.date(x.payout.paid_at) + "</span></span><span>− " + f.money(x.dp.amount_cents) + "</span></div>";
        }).join("") +
        '<div class="net"><span>Still owed</span><span>' + f.money(st.balance_cents) + "</span></div></div></div>") +
      (fixed && !voided ? '<div class="banner banner-info" data-roles="' + RECORDERS + '"><span class="mdi mdi-lock-outline" aria-hidden="true"></span><div class="grow">' +
        '<span class="text-body-md">Money has gone against this delivery, so it can\'t be edited or voided. If it\'s wrong, correct it on ' + m.full_name.split(" ")[0] + "'s next payout with an addition or a deduction.</span></div></div>" : "");

    var foot = voided || fixed ? "" :
      '<span class="row gap-1" data-roles="' + RECORDERS + '" data-write><button class="btn btn-text" type="button" data-void>Void</button><button class="btn btn-tonal" type="button" data-edit>Edit</button></span>';
    var el = Proto.sheet({ title: "Delivery", body: '<div class="col gap-4" data-view>' + body + "</div>", footer: foot });
    var ed = el.querySelector("[data-edit]"), vo = el.querySelector("[data-void]");
    if (ed) ed.addEventListener("click", function () { editInPanel(el, d); });
    if (vo) vo.addEventListener("click", function () { voidDialog(d); });
    return el;
  }

  /* C6 · edit inside the same panel: a panel never opens another (UI-13). */
  function editInPanel(el, d) {
    var cp = get(d.product), p = get(cp.product), c = get(d.cooperative), e = d.details.entered;
    var grades = q.gradesOf(p.id).filter(function (g) { return g.status === "ACTIVE"; });
    var unitLabel = cp.recording_unit ? GF.UNITS[cp.recording_unit][1] : GF.UNITS[p.unit][1];
    var qty = e ? e.quantity : d.quantity_milli / 1000;
    var opt = function (list, cur, label) { return list.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cur ? " selected" : "") + ">" + label(x) + "</option>"; }).join(""); };
    var view = el.querySelector("[data-view]");
    view.hidden = true;
    var form = document.createElement("div");
    form.className = "col gap-4";
    form.innerHTML =
      '<span class="text-body-md tone-muted">' + get(d.member).full_name + " · " + f.date(d.delivered_on) + ". Every change is kept in the audit trail.</span>" +
      (grades.length ? '<div class="field"><span class="field-label" id="eg-l">Grade</span><div class="chip-row" data-choice role="radiogroup" aria-labelledby="eg-l">' +
        grades.map(function (g) { return '<button class="chip" type="button" role="radio" aria-checked="' + (g.id === d.grade) + '">' + g.name + "</button>"; }).join("") +
        '<button class="chip" type="button" role="radio" aria-checked="' + !d.grade + '">Not graded</button></div></div>' : "") +
      '<div class="field qty-entry"><label class="field-label" for="eq">Quantity</label><div class="field-box has-trail"><input class="field-input tabular" id="eq" inputmode="decimal" value="' + qty + '">' +
        '<span class="trail affix">' + unitLabel + "</span></div>" +
        (cp.recording_unit ? '<div class="converted"><span class="text-title-md tabular" id="eq-c"></span><span class="text-body-sm tone-muted">1 ' + GF.UNITS[cp.recording_unit][0] + " = " + (e ? e.factor : cp.unit_factor) + " " + GF.UNITS[p.unit][0] + (e && e.factor !== cp.unit_factor ? ", the factor when it was recorded" : "") + "</span></div>" : "") +
        '<span class="field-error" id="eq-e" hidden>Enter a quantity above 0.</span></div>' +
      '<div class="form-grid"><div class="field"><label class="field-label" for="ed">Date</label><input class="field-input tabular" id="ed" type="date" value="' + d.delivered_on + '" max="' + GF.TODAY + '"></div>' +
        '<div class="field"><label class="field-label" for="er">Round</label><select class="field-input" id="er">' + opt(GF.rounds.filter(function (r) { return r.cooperative === c.id && r.status === "ACTIVE"; }), d.round, function (r) { return r.name; }) + '<option value=""' + (d.round ? "" : " selected") + ">No round</option></select></div>" +
        '<div class="field"><label class="field-label" for="ec">Received at</label><select class="field-input" id="ec">' + opt(GF.clusters.filter(function (x) { return x.cooperative === c.id && x.status === "ACTIVE"; }), d.cluster, function (x) { return x.name; }) + "</select></div>" +
        '<div class="field"><label class="field-label" for="ercpt">Receipt number <span class="optional">(optional)</span></label><input class="field-input tabular" id="ercpt" value="' + esc(d.receipt_no) + '"></div></div>';
    view.parentNode.insertBefore(form, view.nextSibling);
    var foot = el.querySelector(".sheet-foot");
    var oldFoot = foot.innerHTML;
    foot.innerHTML = '<button class="btn btn-text" type="button" data-back>Cancel</button><button class="btn btn-filled" type="button" data-save-edit>Save changes</button>';
    var input = form.querySelector("#eq"), conv = form.querySelector("#eq-c");
    var factor = e ? e.factor : cp.unit_factor;
    var sync = function () {
      var v = parseFloat(input.value.replace(",", "."));
      var bad = !(v > 0);
      form.querySelector("#eq-e").hidden = !bad; input.setAttribute("aria-invalid", String(bad));
      if (conv) conv.textContent = bad ? "" : "= " + f.qty(v * factor, p.unit, { digits: 0 });
      return !bad;
    };
    input.addEventListener("input", sync); sync();
    foot.querySelector("[data-back]").addEventListener("click", function () { form.remove(); view.hidden = false; foot.innerHTML = oldFoot; rebind(el, d); });
    foot.querySelector("[data-save-edit]").addEventListener("click", function () { if (!sync()) return input.focus(); Proto.close(); Proto.snack("Delivery saved"); });
    input.focus();
  }
  function rebind(el, d) {
    var ed = el.querySelector("[data-edit]"), vo = el.querySelector("[data-void]");
    if (ed) ed.addEventListener("click", function () { editInPanel(el, d); });
    if (vo) vo.addEventListener("click", function () { voidDialog(d); });
  }

  /* C6 · void: a dialog over the panel, with a required reason (07). */
  function voidDialog(d) {
    var m = get(d.member);
    var el = Proto.dialog({ title: "Void this delivery?", submit: "Void delivery", body:
      '<p class="text-body-md">' + f.delivery(d) + " from " + m.full_name + " on " + f.date(d.delivered_on) + ". It stays on the record, marked voided, and leaves every total. To correct it, void it and record it again.</p>" +
      '<div class="field"><span class="field-label" id="vr-l">Why</span><div class="chip-row" data-choice role="radiogroup" aria-labelledby="vr-l">' +
        ["Entered twice", "Wrong member", "Wrong quantity, re-entered"].map(function (r) { return '<button class="chip" type="button" role="radio" aria-checked="false" data-r="' + r + '">' + r + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><label class="field-label" for="vr">Reason</label><textarea class="field-input" id="vr"></textarea><span class="field-error" id="vr-e" hidden>Say why it is voided. Members see it next to the entry.</span></div>' });
    var ta = el.querySelector("#vr");
    el.querySelectorAll("[data-r]").forEach(function (c) { c.addEventListener("click", function () { ta.value = c.getAttribute("data-r"); el.querySelector("#vr-e").hidden = true; }); });
    /* The reason is required: the submit only closes once there is one. */
    var btn = el.querySelector("[data-submit]"), fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", function () {
      if (!ta.value.trim()) { el.querySelector("#vr-e").hidden = false; ta.setAttribute("aria-invalid", "true"); ta.focus(); return; }
      Proto.close(); Proto.snack("Delivery voided. Record it again if it was wrong.");
    });
  }

  window.Produce = { coop: coop, products: products, delivery: delivery, payments: payments, findMembers: findMembers, url: url, statementUrl: statementUrl, memberUrl: memberUrl,
    esc: esc, payState: payState, priceLine: priceLine, RECORDERS: RECORDERS };
})();
