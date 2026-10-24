/* kyc-ui.js: what the KYC screens share (phase 11, UI-60; note 20 draft).
 * Loaded after canon.js, kyc.js and console.js on gf/kyc/ pages.
 *
 * Photos and map points are drawn as placeholders: the prototype has no
 * pictures of people (UI-37: everything fictional and public). The kit has no
 * component for either yet: F60 (MapPoint) and F61 (PhotoTile, with the
 * capture metadata), proposed in gaps.md.
 */
(function () {
  "use strict";
  var K = GF.kyc, f = GF.fmt, T = K.TYPES, L = K.L;
  var esc = function (t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
  var icon = function (n, cls) { return '<span class="mdi mdi-' + n + (cls ? " " + cls : "") + '" aria-hidden="true"></span>'; };
  var chip = function (pair) { return '<span class="status status-' + pair[0] + '">' + pair[1] + "</span>"; };
  var time = function (iso) { return iso.slice(11, 16); };
  var when = function (iso) { return f.date(iso, "short") + (iso.length > 10 ? ", " + time(iso) : ""); };
  var acres = function (n) { return n == null ? "–" : String(Math.round(n * 100) / 100) + (n === 1 ? " acre" : " acres"); };
  var coords = function (lat, lng) { return Math.abs(lat).toFixed(5) + "° " + (lat < 0 ? "S" : "N") + ", " + Math.abs(lng).toFixed(5) + "° E"; };

  /** Where a value came from, and who wrote it. */
  function sourceLine(it) {
    if (it.source === "COOPERATIVE_RECORD") return "From " + GF.get(GF.get(it.member).cooperative).profile.short_name + "'s delivery records";
    var who = it.source === "MEMBER" ? "The member, in the app" : it.source === "DOCUMENT" ? "Typed from the ID by " + K.staffName(it.entered_by) : "Agent " + K.staffName(it.entered_by);
    if (it.source === "MEMBER" && !it.entered_by) who = "The member";
    return who + " · " + when(it.created_at);
  }

  /** The status as a reviewer reads it: a check on a visit not yet approved is "Checked". */
  function itemChip(it) {
    var v = it.verification ? K.get(it.verification) : null;
    if (it.status === "VERIFIED" && v && v.status !== "APPROVED") return chip(["info", "Checked, to approve"]);
    if (it.status === "VERIFIED" && !K.counts(it)) return chip(["neutral", "Lapsed"]);
    return chip(L.itemStatus[it.status]);
  }

  /** One line of facts per type. */
  function summary(it) {
    var d = it.data || {}, x = it.details || {};
    switch (it.data_type) {
      case "IDENTITY": return { title: ({ NATIONAL_ID: "National ID", PASSPORT: "Passport", ALIEN_ID: "Alien ID" })[d.id_type] + " " + d.id_number, sub: d.full_name + (d.date_of_birth ? " · born " + f.date(d.date_of_birth) : "") };
      case "PORTRAIT": return { title: "Photo of the member", sub: it.photos.length ? "" : "No photo yet" };
      case "PHONE": return { title: f.phone(x.phone), sub: "M-Pesa name: " + (x.mpesa_name || "–") };
      case "BACKGROUND": return { title: "Farming " + (L.experience[x.farming_experience] || "–").toLowerCase(), sub: (x.has_other_income ? "Has other income" : "No other income") + " · " + (x.has_obligations ? "Has loans or regular payments" : "No loans or regular payments") };
      case "FARM": return { title: (x.name || "Farm") + (x.village ? ", " + x.village : ""), sub: acres(d.size_acres) + (d.cultivated_acres != null ? " (" + acres(d.cultivated_acres) + " farmed)" : "") + " · " + L.tenure[d.tenure] + (x.tenure_evidence ? " · " + L.evidence[x.tenure_evidence].toLowerCase() : "") + (d.is_cultivated === true ? " · being farmed" : d.is_cultivated === false ? " · not being farmed" : "") };
      case "CROP": return { title: (d.value_chain ? GF.get(d.value_chain).name : x.other_name || "Other") + (d.is_main ? " · main income" : ""), sub: [x.note, d.acres != null ? acres(d.acres) : ""].filter(Boolean).join(" · ") };
      case "INCOME": return { title: L.incomeKind[d.kind], sub: (d.monthly_cents != null ? f.money(d.monthly_cents, { whole: true }) : L.band[d.monthly_band]) + " a month" + (x.note ? " · " + x.note : "") };
      case "OBLIGATION": return { title: d.kind === "LOAN" ? "Loan from a " + (d.lender_type === "SACCO" ? "SACCO" : L.lender[d.lender_type].toLowerCase()) : L.obligationKind[d.kind], sub: (d.kind === "LOAN" ? f.money(d.owed_cents, { whole: true }) + " owed · " : "") + f.money(d.monthly_cents, { whole: true }) + " a month" + (x.note ? " · " + x.note : "") };
      case "NEXT_OF_KIN": return { title: x.name + " (" + (x.relationship || "").toLowerCase() + ")", sub: f.phone(x.phone) };
      case "HOME": return { title: [x.village, x.landmark].filter(Boolean).join(" · "), sub: x.lat ? coords(x.lat, x.lng) : "" };
    }
    return { title: it.data_type, sub: "" };
  }

  /** F61 PhotoTile: a placeholder with what the photo carries (time, place, accuracy). */
  function photo(p, opts) {
    opts = opts || {};
    return '<button class="card card-outlined col gap-1" type="button" style="padding:8px;min-width:120px;flex:0 1 150px;text-align:left" ' +
      'onclick="Proto.snack(\'Opens the photo full size\')" aria-label="' + esc(L.photo[p.purpose]) + " photo, taken " + esc(when(p.taken_at)) + '">' +
      '<span class="tone-secondary-box" style="aspect-ratio:4/3;border-radius:4px;font-size:28px;display:flex;align-items:center;justify-content:center">' + icon({ id_front: "card-account-details-outline", id_back: "card-bulleted-outline", portrait: "account-outline", farm: "image-filter-hdr", home: "home-outline" }[p.purpose]) + "</span>" +
      '<span class="text-label-md">' + L.photo[p.purpose] + (opts.flag ? " " + icon("alert-outline", "tone-error") : "") + "</span>" +
      '<span class="text-body-sm tone-muted tabular">' + when(p.taken_at) + " · ±" + p.accuracy_m + " m</span></button>";
  }
  function photos(it, flagIndex) {
    if (!it.photos.length) return "";
    return '<div class="row gap-2 wrap">' + it.photos.map(function (p, i) { return photo(p, { flag: flagIndex === i }); }).join("") + "</div>";
  }

  /** F60 MapPoint: a placeholder map with the point, its accuracy, and an "open in maps" action. */
  function mapPoint(lat, lng, acc, label) {
    if (lat == null) return '<div class="tone-secondary-box row gap-2" style="padding:12px;border-radius:4px">' + icon("map-marker-off-outline") + '<span class="text-body-md">No point yet. The agent takes it standing on the farm.</span></div>';
    return '<div class="card card-outlined" style="padding:0;overflow:hidden"><div class="tone-secondary-box col gap-1" style="height:112px;border-radius:0;display:flex;align-items:center;justify-content:center">' +
      '<span style="font-size:32px">' + icon("map-marker") + '</span><span class="text-body-sm tabular">' + coords(lat, lng) + "</span></div>" +
      '<div class="row between gap-2" style="padding:8px 12px"><span class="text-body-sm tone-muted">' + esc(label || "") + " ±" + acc + ' m</span>' +
      '<button class="btn btn-text btn-sm" type="button" onclick="Proto.snack(\'Opens the point in a map app\')">' + icon("map-outline") + "Map</button></div></div>";
  }

  /** "Valid until" in words, for an item whose check counts. */
  function validity(it) {
    if (!K.counts(it)) return "";
    var u = K.validUntil(it);
    return u ? "Counts until " + f.date(u) : "Counts until replaced";
  }

  function needText(t) {
    return { VERIFIED: "Lending needs it verified", ONE_VERIFIED: "Lending needs at least one verified", PRESENT: "Lending needs it declared", PRESENT_OR_NONE: "Lending needs it declared, or \"none\"", NONE: "Optional" }[T[t].need];
  }

  window.KycUI = { esc: esc, icon: icon, chip: chip, when: when, acres: acres, coords: coords, sourceLine: sourceLine, itemChip: itemChip, summary: summary,
    photo: photo, photos: photos, mapPoint: mapPoint, validity: validity, needText: needText };
})();
