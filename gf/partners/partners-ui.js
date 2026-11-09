/* partners-ui.js: what the console's lending-partner screens share (phase 13, UI-80;
 * note 24 part 1, signed off 2026-11-08). Loaded after canon.js, partners.js and
 * console.js on gf/partners/ pages.
 *
 * Who may do what (note 24, Permissions), as the prototype's roles:
 *   view          every office role (lending_partners.view), never secrets
 *   manage        Full and Owner: partners, products, drafts, coverage, status
 *   publish       Full and Owner: publish and withdraw terms (Q1)
 *   settle        Full and Owner: record and void remittances
 *   credentials   Owner only: connections and their secrets
 */
(function () {
  "use strict";
  var P = GF.partners, f = GF.fmt, L = P.L;
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var icon = function (n, cls) { return '<span class="mdi mdi-' + n + (cls ? " " + cls : "") + '" aria-hidden="true"></span>'; };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var when = function (iso) { return f.date(iso, "short") + (iso && iso.length > 10 ? ", " + iso.slice(11, 16) : ""); };
  var money = function (c) { return f.money(c, { whole: true }); };
  var ROLES = { manage: "owner full", publish: "owner full", settle: "owner full", credentials: "owner" };
  var who = function (id) { var s = GF.get(id); return s ? s.name : id; };

  /** "4.5% of the amount borrowed, a month" or "Ksh 250, once". */
  function chargeHow(c) {
    var amt = c.basis === "FLAT_AMOUNT" ? money(c.amount_cents) : P.pct(c.rate_bps) + " " + L.basis[c.basis].replace(/^% /, "");
    var lim = (c.min_cents ? ", at least " + money(c.min_cents) : "") + (c.max_cents ? ", at most " + money(c.max_cents) : "");
    return amt + lim + ", " + L.chargeFreq[c.frequency].toLowerCase();
  }
  function split(c) { return "GroFunder " + P.pct(c.gf_share_bps) + " · partner " + P.pct(10000 - c.gf_share_bps); }
  /** "Ksh 5,000 to 50,000 · 1 to 6 months · repaid monthly". */
  function termsLine(t) {
    var u = L.unit[t.duration_unit];
    var d = t.terms.allowed_durations.length ? t.terms.allowed_durations.join(", ") + " " + u[1] : t.min_duration + " to " + t.max_duration + " " + u[1];
    return money(t.min_amount_cents) + " to " + money(t.max_amount_cents).replace(/^Ksh\s?/, "") + " · " + d + " · repaid " + L.freq[t.repayment_frequency].toLowerCase();
  }
  function stateChip(t) { return chip(L.terms[P.termsState(t)]); }
  function chargesTable(t) {
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Charge</th><th>How much</th><th>When the member pays</th><th>Split</th></tr></thead><tbody>' +
      t.charges.map(function (c) {
        return '<tr><td class="primary-cell">' + esc(c.name) + '<span class="cell-sub">' + L.kind[c.kind] + "</span></td><td>" + esc(chargeHow(c)) + "</td><td>" + L.collected[c.collected] + '</td><td class="tabular">' + split(c) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ------------------------------------------------------------- forms */
  var field = function (id, label, value, o) {
    o = o || {};
    return '<div class="field"><label class="field-label" for="' + id + '">' + label + "</label>" +
      (o.area ? '<textarea class="field-input" id="' + id + '">' + esc(value || "") + "</textarea>" :
        '<input class="field-input' + (o.tabular ? " tabular" : "") + '" id="' + id + '"' + (o.type ? ' type="' + o.type + '"' : "") + (o.mode ? ' inputmode="' + o.mode + '"' : "") +
        (o.max ? ' maxlength="' + o.max + '"' : "") + (o.disabled ? " disabled" : "") + ' value="' + esc(value == null ? "" : value) + '">') +
      (o.help ? '<span class="field-help">' + o.help + "</span>" : "") + "</div>";
  };
  /** The partner's form (add_partner, update_partner): code and mode are fixed once added. */
  function partnerForm(p) {
    var pr = p ? p.profile : { contact: {}, member_display: {}, sends_sms: [], remittance: { cycle: "MONTHLY", notes: "" } }, L = P.L;
    return field("pn", "Trading name", p && p.name, { help: "Shown to members on the quote. Unique." }) +
      '<div class="form-grid">' + field("pc", "Code", p && p.code, { max: 20, tabular: true, disabled: !!p, help: p ? "Fixed once added" : "Upper-case letters and digits; fixed once added" }) +
      '<div class="field"><span class="field-label">How it works with us</span>' + (p ? '<span class="text-body-md">' + L.mode[p.mode] + '</span><span class="field-help">Fixed once added</span>' :
        '<div class="chip-row" data-choice role="radiogroup" aria-label="Mode"><button class="chip" type="button" role="radio" aria-checked="true">API: its own system</button><button class="chip" type="button" role="radio" aria-checked="false">Partner portal (L6)</button></div>') + "</div></div>" +
      '<span class="text-title-sm">Legal details</span>' + field("pl", "Legal name", pr.legal_name) + '<div class="form-grid">' + field("pr", "Registration number", pr.registration_no) + field("pli", "Licence", pr.licence, { help: "CBK or digital-lender licence" }) + "</div>" +
      '<span class="text-title-sm">Operations contact</span><div class="form-grid">' + field("cn", "Name", pr.contact.name) + field("cr", "Role", pr.contact.role) +
        field("cp", "Phone", pr.contact.phone ? GF.fmt.phone(pr.contact.phone) : "", { type: "tel", tabular: true }) + field("ce", "Email", pr.contact.email, { type: "email" }) + "</div>" +
      '<span class="text-title-sm">What members see</span><div class="form-grid">' + field("mn", "Name on the quote", pr.member_display.name) +
        field("mp", "Customer care phone", pr.member_display.phone ? GF.fmt.phone(pr.member_display.phone) : "", { type: "tel", tabular: true }) + field("mb", "Paybill members repay to", pr.member_display.paybill, { mode: "numeric", tabular: true }) + "</div>" +
      '<span class="text-title-sm">Texts the partner sends members itself</span><span class="text-body-sm tone-muted">So GroFunder doesn\'t text them twice.</span><div class="col gap-1">' +
        Object.keys(L.sms).map(function (k) { return '<label class="check"><input type="checkbox" value="' + k + '"' + (pr.sends_sms.indexOf(k) > -1 ? " checked" : "") + "><span>" + L.sms[k] + "</span></label>"; }).join("") + "</div>" +
      '<div class="form-grid"><div class="field"><label class="field-label" for="rc">Remits GroFunder\'s share</label><select class="field-input" id="rc"><option value="MONTHLY"' + (pr.remittance.cycle === "MONTHLY" ? " selected" : "") + '>Monthly</option><option value="QUARTERLY"' + (pr.remittance.cycle === "QUARTERLY" ? " selected" : "") + ">Quarterly</option></select></div>" +
        field("rn", "Remittance notes", pr.remittance.notes) + "</div>";
  }
  /** Checks the partner form as the service does; returns an error or "". */
  function checkPartner(d, p) {
    var name = d.querySelector("#pn").value.trim(), code = d.querySelector("#pc").value.trim().toUpperCase();
    if (!name) return "A name is needed";
    if (!p && !code) return "A code is needed";
    if (!p && !/^[A-Z0-9]+$/.test(code)) return "The code is upper-case letters and digits only";
    var clash = P.partners.find(function (x) { return x !== p && (x.name.toLowerCase() === name.toLowerCase() || (!p && x.code === code)); });
    if (clash) return clash.name + " already uses that " + (clash.name.toLowerCase() === name.toLowerCase() ? "name" : "code");
    var phone = /^(\+?254|0)?[17]\d{8}$/;
    var cp = d.querySelector("#cp").value.replace(/\s/g, ""), mp = d.querySelector("#mp").value.replace(/\s/g, "");
    if (cp && !phone.test(cp)) return "The contact's phone isn't a Kenyan mobile number";
    if (mp && !phone.test(mp)) return "The customer care phone isn't a Kenyan mobile number";
    return "";
  }
  /** Purposes members pick from (P3): rows of value, English and Swahili. */
  function purposesEditor(list) {
    var row = function (q, i) { return '<div class="form-grid" data-purpose style="align-items:end">' + field("pv" + i, "Value sent", q.value, { tabular: true }) + field("pe" + i, "English", q.en) + field("ps" + i, "Swahili", q.sw) +
      '<button class="btn btn-text btn-sm" type="button" data-drop aria-label="Remove this purpose">Remove</button></div>'; };
    return '<div class="col gap-2" id="purposes">' + (list || []).map(row).join("") + "</div>" +
      '<div class="actions actions-start"><button class="btn btn-outlined btn-sm" type="button" id="add-purpose">Add a purpose</button></div>';
  }
  function wirePurposes(el) {
    var host = el.querySelector("#purposes"), n = host.children.length;
    el.querySelector("#add-purpose").addEventListener("click", function () {
      host.insertAdjacentHTML("beforeend", '<div class="form-grid" data-purpose style="align-items:end">' + field("pv" + n, "Value sent", "", { tabular: true }) + field("pe" + n, "English", "") + field("ps" + n, "Swahili", "") +
        '<button class="btn btn-text btn-sm" type="button" data-drop aria-label="Remove this purpose">Remove</button></div>'); n++;
    });
    host.addEventListener("click", function (e) { var b = e.target.closest("[data-drop]"); if (b) b.closest("[data-purpose]").remove(); });
  }
  function checkPurposes(el) {
    var rows = [].map.call(el.querySelectorAll("[data-purpose]"), function (r) { var v = r.querySelectorAll("input"); return [v[0].value.trim(), v[1].value.trim(), v[2].value.trim()]; });
    if (!rows.length) return "Add at least one purpose";
    if (rows.some(function (r) { return !r[0] || !r[1] || !r[2]; })) return "Each purpose needs a value, English and Swahili";
    var vals = rows.map(function (r) { return r[0].toUpperCase(); });
    if (vals.some(function (v, i) { return vals.indexOf(v) !== i; })) return "Each purpose's value must be different";
    return "";
  }
  /** The product form (add_product, update_product). */
  function productForm(x) {
    x = x || { code: "", name: "", reviews_required: 1, details: { description: "", description_sw: "", purposes: [] } };
    return '<div class="form-grid">' + field("pc", "Partner's product code", x.code, { tabular: true, disabled: !!x.id, help: x.id ? "Fixed: sent with every request" : "Sent with every request" }) + field("pn", "Name members see", x.name) + "</div>" +
      field("pd", "What it's for (English)", x.details.description, { area: true }) + field("psw", "What it's for (Swahili)", x.details.description_sw, { area: true }) +
      '<div class="field"><span class="field-label">Reviewers needed per loan</span><div class="chip-row" data-choice role="radiogroup" aria-label="Reviewers needed" id="rv">' +
        [1, 2, 3].map(function (n) { return '<button class="chip" type="button" role="radio" aria-checked="' + (n === x.reviews_required) + '" data-n="' + n + '">' + n + "</button>"; }).join("") +
        '</div><span class="field-help">GroFunder people who approve each loan request before it goes to the partner</span></div>' +
      '<span class="text-title-sm">Purposes members pick from</span><span class="text-body-sm tone-muted">The value is what the partner receives as the loan\'s purpose</span>' + purposesEditor(x.details.purposes);
  }

  window.PartnersUI = { esc: esc, icon: icon, chip: chip, when: when, money: money, ROLES: ROLES, who: who, chargeHow: chargeHow, split: split, termsLine: termsLine, stateChip: stateChip, chargesTable: chargesTable,
    field: field, partnerForm: partnerForm, checkPartner: checkPartner, productForm: productForm, wirePurposes: wirePurposes, checkPurposes: checkPurposes };
})();
