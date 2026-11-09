/* consents.js: what members have agreed to (phase 15, UI-100; design/22-consents.md, revision 2,
 * signed off 2026-11-09). Loaded after canon.js, kyc.js, groups.js and partners.js; adds GF.consents.
 *
 * Shapes follow the kit's `consents` app as 22 reads it: Document (slug, kind, owner), DocumentVersion
 * (one wording in one language: number, status, title, summary, body, change_note,
 * requires_reconsent, content_hash), LivePeriod (when each version was in force), Placement (a slot
 * bound to a document, per partner for loan.sharing) and ConsentRecord (append-only decisions, with
 * on_behalf_of = the member record for lending purposes, and GroFunder's metadata keys).
 * GroFunder adds no models; member_consents holds the purposes, the slots and `allows`.
 *
 * Every wording here is a placeholder, in English and Swahili: the real text waits for the legal
 * check (22, concern 3) and the owner (G101).
 *
 * The story, on "now" (Fri 30 Oct 2026, 10:30):
 *   member-terms     v1 imported from the 06 sign-up wording; v2 (needs re-consent) published 29 Oct
 *                    to apply from 16 Nov, so members can agree early (G100): Wanjiku's Home asks her
 *                    now. Until a member agrees to a version in force, nothing new starts for them
 *   lending          v1 in force since 1 Aug in both languages; v2 drafted in English only (the
 *                    console flags the missing Swahili)
 *   loan-agreement   GroFunder's v1 in force; v2 scheduled for 1 Dec in both languages
 *   partner-sharing  Mavuno's and Tegemeo's in force and bound to loan.sharing for them; Shamba's is
 *                    an English draft, not bound, so Shamba can't be activated (24 amendment)
 *   Tegemeo's own loan agreement replaces GroFunder's for its loans (Q9)
 * Records: Wanjiku agreed to lending in the app before declaring (Kijani) and when she accepted
 * Kahawa Bora's invitation (Mawingu); Joseph agreed by SMS code this morning at the start of Kevin's
 * visit; Samuel by SMS code with Mercy; Esther called the office today and Brian withdrew hers.
 * Everyone else in a covered cooperative is taken to have agreed on 1 Oct (in the app, or by SMS code with the office), as credit.js
 * scores them (it isn't changed while phase 14 is reviewed).
 */
(function (root) {
  "use strict";
  var GF = root.GF;
  var T = function (d, t) { return "2026-" + d + "T" + (t || "09:00") + ":00+03:00"; };

  /* ------------------------------------------------- purposes (member_consents/purposes.py) */
  var PURPOSES = {
    MEMBER_TERMS: { slug: "member-terms", kind: "AGREEMENT", perPartner: false, withdrawable: false, subject: "LOGIN",
      name: "Terms of use and privacy", what: "The member app's terms of use and privacy notice" },
    LENDING: { slug: "lending", kind: "CONSENT", perPartner: false, withdrawable: true, subject: "MEMBER",
      name: "Lending", what: "GroFunder collecting your details, an agent checking them, and using your deliveries and payments to work out what you can borrow",
      stops: ["New details and agent visits (an open visit is cancelled)", "Working out your limit", "New loan requests", "You leave lending lists"],
      carries: ["What GroFunder already holds, kept for the time the law sets", "Any loan you have now, under its loan agreement"] },
    PARTNER_SHARING: { slug: "partner-sharing", kind: "CONSENT", perPartner: true, withdrawable: true, subject: "MEMBER",
      name: "Sharing with a lender", what: "GroFunder sending the lender your loan request and details, and the lender reading the records its document lists",
      stops: ["New loan requests to this lender", "The lender reading your records, except what a loan you have with it needs"],
      carries: ["A loan you have with this lender: its payments and follow-up go on under the loan agreement, not this consent"] },
    LOAN_AGREEMENT: { slug: "loan-agreement", kind: "AGREEMENT", perPartner: true, withdrawable: false, subject: "MEMBER",
      name: "Loan agreement", what: "A loan's terms, holding back pay if it defaults, and your circle seeing if you fall behind" }
  };

  /* ------------------------------------------------- slots (member_consents/consent_slots.py) */
  var SLOTS = [
    { key: "signup.terms", kind: "AGREEMENT", required: true, purpose: "MEMBER_TERMS", asked: "Sign-up (06)" },
    { key: "account.terms", kind: "AGREEMENT", required: true, purpose: "MEMBER_TERMS", asked: "The Home prompt after a version that needs re-consent" },
    { key: "lending.consent", kind: "CONSENT", required: false, purpose: "LENDING", asked: "The first KYC step, the start of an agent's visit, the Home prompt, Account › Consents" },
    { key: "loan.sharing", kind: "CONSENT", required: false, purpose: "PARTNER_SHARING", perPartner: true, asked: "The quote, with the lender named; a GroFunder draft's acceptance" },
    { key: "loan.agreement", kind: "AGREEMENT", required: true, purpose: "LOAN_AGREEMENT", asked: "The quote; a GroFunder draft's acceptance" }
  ];

  /* ------------------------------------------------- documents */
  var documents = [
    { id: "cd-terms", slug: "member-terms", kind: "AGREEMENT", owner: null, name: "Terms of use and privacy notice", description: "What every member agrees to when they sign up.", created_at: T("03-01", "08:00") },
    { id: "cd-lending", slug: "lending", kind: "CONSENT", owner: null, name: "Lending", description: "Collecting KYC details, agents checking them, and scoring from the cooperative's records.", created_at: T("07-28", "10:00") },
    { id: "cd-loan", slug: "loan-agreement", kind: "AGREEMENT", owner: null, name: "Loan agreement", description: "GroFunder's loan agreement, for every lender without its own.", created_at: T("10-12", "10:00") },
    { id: "cd-share-mavuno", slug: "partner-sharing", kind: "CONSENT", owner: "lp-mavuno", name: "Sharing with Mavuno Capital", description: "What Mavuno Capital receives and may read.", created_at: T("10-26", "11:00") },
    { id: "cd-share-tegemeo", slug: "partner-sharing", kind: "CONSENT", owner: "lp-tegemeo", name: "Sharing with Tegemeo Microfinance", description: "What Tegemeo Microfinance receives and may read.", created_at: T("06-20", "12:30") },
    { id: "cd-share-shamba", slug: "partner-sharing", kind: "CONSENT", owner: "lp-shamba", name: "Sharing with Shamba Finance", description: "What Shamba Finance receives and may read.", created_at: T("10-26", "14:50") },
    { id: "cd-loan-tegemeo", slug: "loan-agreement", kind: "AGREEMENT", owner: "lp-tegemeo", name: "Tegemeo Microfinance loan agreement", description: "Tegemeo's own wording, which replaces GroFunder's for its loans (Q9).", created_at: T("06-20", "12:40") }
  ];

  /* ------------------------------------------------- versions: one wording in one language */
  var versions = [];
  var hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ("0000000" + h.toString(16)).slice(-8) + "a41c" + ("0000000" + (h ^ 0x5bd1e995 >>> 0).toString(16)).slice(-8); };
  /* v(doc, locale, number, status, o): o = title, summary, body [sections], change_note, reconsent, published (at, by), periods [[from, until, takenDown]], created (at, by). */
  function v(doc, locale, number, status, o) {
    var row = { id: doc + "-" + locale + "-" + number, document: doc, locale: locale, number: number, status: status, title: o.title, summary: o.summary, body: o.body || [], body_format: "MARKDOWN",
      change_note: o.change_note || "", requires_reconsent: !!o.reconsent, published_at: o.published ? o.published[0] : null, published_by: o.published ? o.published[1] : null,
      created_at: o.created ? o.created[0] : (o.published ? o.published[0] : null), created_by: o.created ? o.created[1] : (o.published ? o.published[1] : null),
      periods: (o.periods || []).map(function (p) { return { live_from: p[0], live_until: p[1] || null, taken_down: !!p[2] }; }), content_hash: null };
    if (status !== "DRAFT") row.content_hash = hash(row.title + row.summary + row.body.join("|"));
    versions.push(row);
  }
  var TERMS_EN = ["## What GroFunder holds\nYour cooperatives keep your membership records. GroFunder keeps them for your cooperatives and shows them to you here.", "## Who sees it\nEach cooperative's staff see only that cooperative's records.", "## Your login\nKeep your PIN to yourself. Each person needs their own phone number."];
  var TERMS_SW = ["## GroFunder inahifadhi nini\nVyama vyako vinahifadhi rekodi zako za uanachama. GroFunder inazihifadhi kwa niaba yao na kukuonyesha hapa.", "## Nani anaona\nWafanyakazi wa kila chama wanaona rekodi za chama hicho pekee.", "## Kuingia kwako\nWeka PIN yako siri. Kila mtu anahitaji namba yake ya simu."];
  v("cd-terms", "en", 1, "PUBLISHED", { title: "Terms of use and privacy notice", summary: "How the member app works, what it keeps about you and who sees it.", body: TERMS_EN,
    published: [T("03-01", "08:00"), "u-amina"], periods: [[T("03-01", "08:00"), T("11-16", "00:00")]] });
  v("cd-terms", "sw", 1, "PUBLISHED", { title: "Masharti ya matumizi na faragha", summary: "Jinsi programu inavyofanya kazi, inachohifadhi kukuhusu na nani anaona.", body: TERMS_SW,
    published: [T("03-01", "08:00"), "u-amina"], periods: [[T("03-01", "08:00"), T("11-16", "00:00")]] });
  v("cd-terms", "en", 2, "PUBLISHED", { title: "Terms of use and privacy notice", summary: "How the member app works, what it keeps about you, who sees it, and how lending uses it.",
    body: TERMS_EN.concat(["## Lending\nIf you choose to borrow, GroFunder asks you separately before it uses your details for loans. You can say no and still use the app."]),
    change_note: "We added how lending uses your details. Nothing changes unless you choose to borrow.", reconsent: true,
    published: [T("10-29", "11:00"), "u-amina"], periods: [[T("11-16", "00:00")]], created: [T("10-19", "16:00"), "u-peter"] });
  v("cd-terms", "sw", 2, "PUBLISHED", { title: "Masharti ya matumizi na faragha", summary: "Jinsi programu inavyofanya kazi, inachohifadhi, nani anaona, na jinsi mikopo inavyotumia taarifa zako.",
    body: TERMS_SW.concat(["## Mikopo\nUkichagua kukopa, GroFunder itakuuliza kando kabla ya kutumia taarifa zako kwa mikopo. Unaweza kukataa na bado kutumia programu."]),
    change_note: "Tumeongeza jinsi mikopo inavyotumia taarifa zako. Hakuna kinachobadilika usipochagua kukopa.", reconsent: true,
    published: [T("10-29", "11:00"), "u-amina"], periods: [[T("11-16", "00:00")]], created: [T("10-19", "16:10"), "u-peter"] });

  var LEND_EN = ["## What we collect\nYour background, farms, crops, other income, loans and regular payments, next of kin, your ID, a photo of you and your phone.", "## Who checks it\nA GroFunder Farmer Support Agent visits you and checks it. Someone else at GroFunder approves the visit.",
    "## What we use\nYour deliveries and payments at your cooperative, your Growth Circle and what you told us, to work out what you can borrow.", "## What your cooperative sees\nOnly whether you're verified, never what you told us.",
    "## Saying no, or changing your mind\nYou can still deliver, be paid and use the app. Withdraw any time in Account › Consents, or call GroFunder."];
  var LEND_SW = ["## Tunachokusanya\nHistoria yako, mashamba, mazao, mapato mengine, mikopo na malipo ya kila mwezi, ndugu wa karibu, kitambulisho, picha yako na simu yako.", "## Nani anakagua\nAfisa wa GroFunder anakutembelea na kukagua. Mtu mwingine wa GroFunder anaidhinisha ziara.",
    "## Tunachotumia\nUsafirishaji na malipo yako katika chama, kikundi chako cha Growth Circle na ulichotueleza, ili kujua kiasi unachoweza kukopa.", "## Chama chako kinaona nini\nKama umethibitishwa tu, si ulichotueleza.",
    "## Kukataa au kubadili nia\nBado unaweza kusafirisha, kulipwa na kutumia programu. Ondoa idhini wakati wowote kwenye Akaunti › Idhini, au piga simu GroFunder."];
  v("cd-lending", "en", 1, "PUBLISHED", { title: "Using your details for loans", summary: "GroFunder collects and checks your details and uses your cooperative's records of your deliveries and payments to work out what you can borrow.",
    body: LEND_EN, published: [T("07-30", "15:00"), "u-amina"], periods: [[T("08-01", "00:00")]], created: [T("07-28", "10:00"), "u-peter"] });
  v("cd-lending", "sw", 1, "PUBLISHED", { title: "Kutumia taarifa zako kwa mikopo", summary: "GroFunder inakusanya na kukagua taarifa zako na kutumia rekodi za chama za usafirishaji na malipo yako kujua kiasi unachoweza kukopa.",
    body: LEND_SW, published: [T("07-30", "15:00"), "u-amina"], periods: [[T("08-01", "00:00")]], created: [T("07-28", "10:20"), "u-peter"] });
  v("cd-lending", "en", 2, "DRAFT", { title: "Using your details for loans", summary: "GroFunder collects and checks your details and uses your cooperative's records of your deliveries and payments to work out what you can borrow.",
    body: LEND_EN.slice(0, 4).concat(["## Saying no, or changing your mind\nYou can still deliver, be paid and use the app. Withdraw any time in Account › Consents, or call GroFunder on 0709 100 100."]),
    change_note: "Adds the number to call.", created: [T("10-29", "11:40"), "u-peter"] });

  var LOAN_EN = ["## Your loan\nThe amount, charges, instalments and total you repay are as on the quote you accepted.", "## Repaying\nYou repay the lender, through its paybill.",
    "## If the loan defaults\nOnce GroFunder confirms recovery, your cooperative may hold back part or all of your pay until it is repaid, and add its collection fee.",
    "## Your circle\nWhile you are behind, the other members of your Growth Circle see your name, how many days late you are and the amount overdue. Never the loan's size, lender or terms.", "## Your limit\nHow you repay affects what you can borrow next time."];
  var LOAN_SW = ["## Mkopo wako\nKiasi, ada, awamu na jumla utakayolipa ni kama kwenye makadirio uliyokubali.", "## Kulipa\nUnamlipa mkopeshaji, kupitia paybill yake.",
    "## Mkopo usipolipwa\nGroFunder ikithibitisha urejeshaji, chama chako kinaweza kuzuia sehemu au malipo yako yote hadi deni lilipwe, na kuongeza ada yake ya ukusanyaji.",
    "## Kikundi chako\nUkichelewa, wanachama wengine wa Growth Circle yako wanaona jina lako, siku ulizochelewa na kiasi kilichochelewa. Kamwe si ukubwa wa mkopo, mkopeshaji au masharti.", "## Kikomo chako\nJinsi unavyolipa kunaathiri kiasi utakachoweza kukopa baadaye."];
  v("cd-loan", "en", 1, "PUBLISHED", { title: "Loan agreement", summary: "Your loan's terms, repaying the lender, what happens if it defaults, and what your circle sees if you fall behind.", body: LOAN_EN,
    published: [T("10-15", "12:00"), "u-amina"], periods: [[T("10-15", "12:00")]], created: [T("10-12", "10:00"), "u-peter"] });
  v("cd-loan", "sw", 1, "PUBLISHED", { title: "Mkataba wa mkopo", summary: "Masharti ya mkopo wako, kumlipa mkopeshaji, kinachotokea usipolipa, na kikundi chako kinaona nini ukichelewa.", body: LOAN_SW,
    published: [T("10-15", "12:00"), "u-amina"], periods: [[T("10-15", "12:00")]], created: [T("10-12", "10:30"), "u-peter"] });
  v("cd-loan", "en", 2, "PUBLISHED", { title: "Loan agreement", summary: "Your loan's terms, repaying the lender, what happens if it defaults, and what your circle sees if you fall behind.",
    body: LOAN_EN.slice(0, 2).concat(["## If the loan defaults\nOnce GroFunder confirms recovery, your cooperative may hold back part or all of your pay until it is repaid, and add its collection fee, which it tells you in writing first."], LOAN_EN.slice(3)),
    change_note: "Your cooperative tells you its collection fee in writing first.", reconsent: false, published: [T("10-29", "09:00"), "u-amina"], periods: [[T("12-01", "00:00")]], created: [T("10-28", "15:00"), "u-peter"] });
  v("cd-loan", "sw", 2, "PUBLISHED", { title: "Mkataba wa mkopo", summary: "Masharti ya mkopo wako, kumlipa mkopeshaji, kinachotokea usipolipa, na kikundi chako kinaona nini ukichelewa.",
    body: LOAN_SW.slice(0, 2).concat(["## Mkopo usipolipwa\nGroFunder ikithibitisha urejeshaji, chama chako kinaweza kuzuia sehemu au malipo yako yote hadi deni lilipwe, na kuongeza ada yake ya ukusanyaji, ambayo kitakueleza kwa maandishi kwanza."], LOAN_SW.slice(3)),
    change_note: "Chama chako kitakueleza ada yake ya ukusanyaji kwa maandishi kwanza.", reconsent: false, published: [T("10-29", "09:00"), "u-amina"], periods: [[T("12-01", "00:00")]], created: [T("10-28", "15:20"), "u-peter"] });

  var share = function (name, sw) {
    return sw ? ["## " + name + " inapokea\nOmbi lako la mkopo, kitambulisho chako, picha yako, simu yako na mashamba yako, chini ya kumbukumbu yetu.", "## " + name + " inaweza kusoma\nRekodi za uzalishaji, ukaguzi wa mashamba, kikundi chako, historia ya mikopo na picha.", "## Kamwe\nAlama yako ya mkopo kutoka GroFunder."]
      : ["## " + name + " receives\nYour loan request, your ID, your photo, your phone and your farms, under our reference.", "## " + name + " may read\nYour production records, farm checks, your circle, your loan history and photos.", "## Never\nYour GroFunder credit score."];
  };
  v("cd-share-mavuno", "en", 1, "PUBLISHED", { title: "Sharing your details with Mavuno Capital", summary: "GroFunder sends Mavuno Capital your loan request and details, and Mavuno Capital may read the records listed here.", body: share("Mavuno Capital"),
    published: [T("10-28", "16:00"), "u-amina"], periods: [[T("10-28", "16:00")]], created: [T("10-26", "11:00"), "u-peter"] });
  v("cd-share-mavuno", "sw", 1, "PUBLISHED", { title: "Kushiriki taarifa zako na Mavuno Capital", summary: "GroFunder inatuma Mavuno Capital ombi lako la mkopo na taarifa zako, na Mavuno Capital inaweza kusoma rekodi zilizoorodheshwa hapa.", body: share("Mavuno Capital", true),
    published: [T("10-28", "16:00"), "u-amina"], periods: [[T("10-28", "16:00")]], created: [T("10-26", "11:20"), "u-peter"] });
  v("cd-share-tegemeo", "en", 1, "PUBLISHED", { title: "Sharing your details with Tegemeo Microfinance", summary: "GroFunder sends Tegemeo Microfinance your loan request and details, and Tegemeo may read the records listed here.", body: share("Tegemeo Microfinance"),
    published: [T("06-25", "10:00"), "u-amina"], periods: [[T("06-25", "10:00")]], created: [T("06-20", "12:30"), "u-amina"] });
  v("cd-share-tegemeo", "sw", 1, "PUBLISHED", { title: "Kushiriki taarifa zako na Tegemeo Microfinance", summary: "GroFunder inatuma Tegemeo Microfinance ombi lako la mkopo na taarifa zako, na Tegemeo inaweza kusoma rekodi zilizoorodheshwa hapa.", body: share("Tegemeo Microfinance", true),
    published: [T("06-25", "10:00"), "u-amina"], periods: [[T("06-25", "10:00")]], created: [T("06-20", "12:35"), "u-amina"] });
  v("cd-share-shamba", "en", 1, "DRAFT", { title: "Sharing your details with Shamba Finance", summary: "GroFunder sends Shamba Finance your loan request and details, and Shamba Finance may read the records listed here.", body: share("Shamba Finance"),
    created: [T("10-26", "14:50"), "u-peter"] });
  v("cd-loan-tegemeo", "en", 1, "PUBLISHED", { title: "Tegemeo Microfinance loan agreement", summary: "Tegemeo's terms for your loan, repaying through its paybill, what happens if it defaults, and what your circle sees if you fall behind.",
    body: LOAN_EN.concat(["## Tegemeo's own terms\nTegemeo may report a loan more than 90 days late to a credit reference bureau, as the law allows."]), published: [T("06-25", "10:05"), "u-amina"], periods: [[T("06-25", "10:05")]], created: [T("06-20", "12:40"), "u-amina"] });
  v("cd-loan-tegemeo", "sw", 1, "PUBLISHED", { title: "Mkataba wa mkopo wa Tegemeo Microfinance", summary: "Masharti ya Tegemeo kwa mkopo wako, kulipa kupitia paybill yake, kinachotokea usipolipa, na kikundi chako kinaona nini ukichelewa.",
    body: LOAN_SW.concat(["## Masharti ya Tegemeo\nTegemeo inaweza kuripoti mkopo uliochelewa zaidi ya siku 90 kwa ofisi ya marejeleo ya mikopo, kama sheria inavyoruhusu."]), published: [T("06-25", "10:05"), "u-amina"], periods: [[T("06-25", "10:05")]], created: [T("06-20", "12:45"), "u-amina"] });

  /* ------------------------------------------------- placements: slot → document (per partner for loan.sharing) */
  var placements = [
    { slot: "signup.terms", owner: null, document: "cd-terms", bound_at: T("03-01", "08:00"), bound_by: "u-amina" },
    { slot: "account.terms", owner: null, document: "cd-terms", bound_at: T("03-01", "08:00"), bound_by: "u-amina" },
    { slot: "lending.consent", owner: null, document: "cd-lending", bound_at: T("07-30", "15:05"), bound_by: "u-peter" },
    { slot: "loan.agreement", owner: null, document: "cd-loan", bound_at: T("10-15", "12:05"), bound_by: "u-peter" },
    { slot: "loan.agreement", owner: "lp-tegemeo", document: "cd-loan-tegemeo", bound_at: T("06-25", "10:10"), bound_by: "u-amina" },
    { slot: "loan.sharing", owner: "lp-tegemeo", document: "cd-share-tegemeo", bound_at: T("06-25", "10:10"), bound_by: "u-amina" },
    { slot: "loan.sharing", owner: "lp-mavuno", document: "cd-share-mavuno", bound_at: T("10-28", "16:05"), bound_by: "u-peter" }
  ];

  /* ------------------------------------------------- records: the append-only ledger */
  var records = [];
  /* r(id, user, member, version, slot, context, decision, captured_by, recorded_by, at, metadata) */
  function r(id, user, member, version, slot, context, decision, by, recBy, at, meta) {
    var ver = byVersion(version);
    records.push({ id: id, user: user, on_behalf_of: member, document: ver.document, version: version, version_hash: ver.content_hash, slot: slot, context: context, decision: decision,
      captured_by: by, recorded_by: recBy, occurred_at: at, recorded_at: at, metadata: meta || {} });
  }
  var byVersion = function (id) { return versions.find(function (x) { return x.id === id; }); };
  var app = function (lang) { return { channel: "APP", language: lang || "en", app: { platform: "android", version: "1.4.0" } }; };
  var sms = function (lang, phone, ch) { return { channel: "SMS_CODE", language: lang, sms: { phone: phone, challenge_id: ch } }; };
  var mem = function (id) { return GF.get(id) || {}; };

  /* Wanjiku: the 06 sign-up wording, imported (IMPORT, at the original time); lending at each cooperative in the app. */
  r("cr-1", "u-wanjiku", null, "cd-terms-en-1", "signup.terms", "signup", "GRANTED", "IMPORT", null, "2026-03-25T18:40:00+03:00", { channel: "APP", language: "en" });
  r("cr-2", "u-wanjiku", "m-kij-0142", "cd-lending-en-1", "lending.consent", "kyc", "GRANTED", "USER", null, T("10-20", "19:08"), app("en"));
  r("cr-3", "u-wanjiku", "m-maw-0907", "cd-lending-sw-1", "lending.consent", "prompt", "GRANTED", "USER", null, T("10-06", "20:12"), app("sw"));
  /* Joseph signed up on a borrowed phone but has no smartphone of his own: Kevin sent the code to his phone at the start of
   * the visit and read the summary out in Swahili. Mary has no login: Kevin did the same at her visit. */
  r("cr-4", "u-m-kij-0088", "m-kij-0088", "cd-lending-sw-1", "lending.consent", "visit:v-102", "GRANTED", "STAFF", "u-kevin", T("10-30", "09:18"), sms("sw", mem("m-kij-0088").phone, "otp-7f31c2"));
  r("cr-5", null, "m-kij-0031", "cd-lending-sw-1", "lending.consent", "visit:v-104", "GRANTED", "STAFF", "u-mercy", T("09-02", "10:04"), sms("sw", mem("m-kij-0031").phone, "otp-2a90e1"));
  r("cr-6", null, "m-kij-0217", "cd-lending-en-1", "lending.consent", "visit:v-103", "GRANTED", "STAFF", "u-kevin", T("10-22", "10:20"), sms("en", mem("m-kij-0217").phone, "otp-91be03"));
  /* Esther: agreed at her visit; after it failed she called the office, and Brian withdrew it this morning (KC2). */
  r("cr-7", null, "m-kij-0164", "cd-lending-sw-1", "lending.consent", "visit:v-107", "GRANTED", "STAFF", "u-mercy", T("10-14", "09:40"), sms("sw", mem("m-kij-0164").phone, "otp-c4d812"));
  r("cr-8", null, "m-kij-0164", "cd-lending-sw-1", "lending.consent", "account", "WITHDRAWN", "STAFF", "u-brian", T("10-30", "10:05"),
    { channel: "SMS_CODE", language: "sw", withdrawal: { reason: "She called after her visit failed: she doesn't want GroFunder using her details for loans any more.", via: "PHONE_CALL" } });

  /* ------------------------------------------------- reading */
  var docById = {}; documents.forEach(function (d) { docById[d.id] = d; });
  var NOW = GF.NOW;
  /** Versions of a document, newest first; one language or both. */
  function versionsOf(docId, locale) {
    return versions.filter(function (x) { return x.document === docId && (!locale || x.locale === locale); }).sort(function (a, b) { return b.number - a.number || (a.locale < b.locale ? -1 : 1); });
  }
  var isLive = function (x, at) { at = at || NOW; return x.periods.some(function (p) { return p.live_from <= at && (!p.live_until || p.live_until > at); }); };
  var scheduled = function (x) { return x.status === "PUBLISHED" && x.periods.some(function (p) { return p.live_from > NOW; }); };
  /** The version in force for a document and language, at a time ("is it live?" is answered by periods only). */
  function live(docId, locale, at) { return versions.find(function (x) { return x.document === docId && x.locale === locale && isLive(x, at); }) || null; }
  /** How the console marks a version. */
  function state(x) {
    if (x.status === "DRAFT") return "DRAFT";
    if (x.status === "ARCHIVED") return "ARCHIVED";
    if (isLive(x)) return "LIVE";
    if (scheduled(x)) return "SCHEDULED";
    return "PAST";
  }
  /** The document bound to a slot, for a partner where the slot is per partner (a partner's own binding wins; loan.sharing has no platform-wide one). */
  function boundTo(slot, partnerId) {
    var own = partnerId && placements.find(function (p) { return p.slot === slot && p.owner === partnerId; });
    if (own) return docById[own.document];
    if (slot === "loan.sharing") return null;
    var plat = placements.find(function (p) { return p.slot === slot && !p.owner; });
    return plat ? docById[plat.document] : null;
  }
  function slotsOf(docId) { return placements.filter(function (p) { return p.document === docId; }); }
  /** Whether the two languages are out of step: different numbers in force, or a draft or schedule in one only (concern 4). */
  function languagesDiffer(docId) {
    var en = live(docId, "en"), sw = live(docId, "sw"), d = function (l) { return versionsOf(docId, l).filter(function (x) { return x.status === "DRAFT"; }).length; };
    var s = function (l) { return versionsOf(docId, l).filter(scheduled).length; };
    if ((en && en.number) !== (sw && sw.number)) return "Different versions in force";
    if (d("en") !== d("sw")) return d("en") ? "Swahili has no draft" : "English has no draft";
    if (s("en") !== s("sw")) return "Scheduled in one language only";
    return "";
  }

  /* Covered cooperatives (credit.js S4): their members are taken to have agreed to lending in the app on 1 Oct. */
  var COVERED = { "co-kijani": 1, "co-mawingu": 1, "co-gatundu": 1 };
  function implied(m) {
    /* With a login, in the app; without one, by SMS code with GroFunder's office. */
    return { id: "cr-implied-" + m.id, implied: true, user: m.user || null, on_behalf_of: m.id, document: "cd-lending", version: m.user ? "cd-lending-en-1" : "cd-lending-sw-1", slot: "lending.consent", context: m.user ? "prompt" : "account",
      decision: "GRANTED", captured_by: m.user ? "USER" : "STAFF", recorded_by: m.user ? null : "u-brian", occurred_at: T("10-01", "08:00"), metadata: m.user ? app("en") : sms("sw", m.phone, "otp-bulk") };
  }
  /** Every record on behalf of a member record (newest first), plus the login's terms records when asked. */
  function recordsOf(memberId) {
    var m = GF.get(memberId), own = records.filter(function (x) { return x.on_behalf_of === memberId; });
    if (m && COVERED[m.cooperative] && !own.some(function (x) { return x.document === "cd-lending"; })) own.push(implied(m));
    return own.sort(function (a, b) { return a.occurred_at < b.occurred_at ? 1 : -1; });
  }
  function recordsOfLogin(userId) {
    var own = records.filter(function (x) { return x.user === userId && !x.on_behalf_of; });
    if (!own.length && userId) own.push({ id: "cr-implied-" + userId, implied: true, user: userId, on_behalf_of: null, document: "cd-terms", version: "cd-terms-en-1", slot: "signup.terms", context: "signup",
      decision: "GRANTED", captured_by: "IMPORT", recorded_by: null, occurred_at: T("04-01", "08:00"), metadata: { channel: "APP", language: "en" } });
    return own.sort(function (a, b) { return a.occurred_at < b.occurred_at ? 1 : -1; });
  }
  /** The current answer for a document: the latest record on behalf of the member record, whoever's login made it (KC1). */
  function current(memberId, docId) { return recordsOf(memberId).find(function (x) { return x.document === docId; }) || null; }
  function currentTerms(userId) { return recordsOfLogin(userId).find(function (x) { return x.document === "cd-terms"; }) || null; }
  /** A later version in the language they agreed in, needing re-consent, has come into force (the kit's needs_decision). */
  function needsReconsent(rec, at) {
    if (!rec || rec.decision !== "GRANTED") return false;
    var agreed = byVersion(rec.version), now = live(rec.document, agreed.locale, at);
    return !!(now && now.number > agreed.number && versions.some(function (x) { return x.document === rec.document && x.locale === agreed.locale && x.number > agreed.number && x.number <= now.number && x.requires_reconsent; }));
  }
  /** The next version of a document that asks members again, published to apply later (a notice period). */
  function upcoming(docId, locale) {
    return versions.filter(function (x) { return x.document === docId && x.locale === locale && x.status === "PUBLISHED" && x.requires_reconsent && x.periods.some(function (p) { return p.live_from > NOW; }); })
      .sort(function (a, b) { return a.number - b.number; })[0] || null;
  }
  /** G100 (owner, 2026-11-09): where a login stands with the member terms.
   *  BLOCKED: a version in force asks them again and they haven't agreed. Nothing new starts (no KYC, circle or
   *           loan action, no new consent); what they have stays visible and a live loan carries on.
   *  EARLY:   a later version is scheduled and they can agree to it now.  OK otherwise. */
  function termsState(userId) {
    var t = currentTerms(userId); if (!t) return { state: "OK" };
    if (needsReconsent(t)) return { state: "BLOCKED", version: live("cd-terms", version(t.version).locale) };
    var up = upcoming("cd-terms", version(t.version).locale);
    if (up && version(t.version).number < up.number) return { state: "EARLY", version: up, from: up.periods[0].live_from };
    return { state: "OK" };
  }
  var version = function (id) { return byVersion(id); };
  /** member_consents.services.allows: the record that counts, or a refusal with its reason. */
  function allows(memberId, purpose, partnerId, opts) {
    opts = opts || {};
    var p = PURPOSES[purpose], slot = { LENDING: "lending.consent", PARTNER_SHARING: "loan.sharing", LOAN_AGREEMENT: "loan.agreement" }[purpose];
    var doc = boundTo(slot, partnerId);
    if (!doc || !live(doc.id, "en") && !live(doc.id, "sw")) return { ok: false, reason: "NOTHING_PUBLISHED", document: doc };
    var rec = current(memberId, doc.id);
    if (!rec) return { ok: false, reason: "NO_CONSENT", document: doc };
    if (rec.decision !== "GRANTED") return { ok: false, reason: rec.decision, record: rec, document: doc };
    if (!opts.for_existing && needsReconsent(rec)) return { ok: false, reason: "NEEDS_RECONSENT", record: rec, document: doc };
    return { ok: true, record: rec, document: doc, purpose: p };
  }
  /** Who took a record, in words: "you, in the app", "Kevin Odhiambo, by SMS code". */
  function how(rec) {
    var name = function (id) { var s = GF.get(id); return s ? s.name : GF.kyc ? GF.kyc.staffName(id) : id; };
    if (rec.captured_by === "IMPORT") return "When signing up (carried over)";
    if (rec.captured_by === "USER") return "In the app";
    var w = rec.metadata.withdrawal;
    if (w) return name(rec.recorded_by) + ", on a " + { PHONE_CALL: "phone call", IN_PERSON: "visit to the office", APP: "request in the app" }[w.via];
    return name(rec.recorded_by) + ", by SMS code";
  }

  var L = {
    kind: { AGREEMENT: "Agreement", CONSENT: "Consent" },
    decision: { GRANTED: ["success", "Agreed"], DECLINED: ["neutral", "Declined"], WITHDRAWN: ["warning", "Withdrawn"] },
    vstate: { LIVE: ["success", "In force"], SCHEDULED: ["info", "Scheduled"], PAST: ["neutral", "Past"], ARCHIVED: ["neutral", "Archived"], DRAFT: ["warning", "Draft"] },
    locale: { en: "English", sw: "Swahili" },
    via: { PHONE_CALL: "Phone call", IN_PERSON: "In person" },
    reason: { NO_CONSENT: "Not agreed", DECLINED: "Declined", WITHDRAWN: "Withdrawn", NEEDS_RECONSENT: "Needs to agree again", NOTHING_PUBLISHED: "Nothing published", LENDING_OFF: "Lending is switched off" },
    context: function (c) {
      if (!c) return "";
      if (c === "kyc") return "Before declaring their details";
      if (c === "prompt") return "From a prompt in the app";
      if (c === "account") return "In Account › Consents";
      if (c === "signup") return "Signing up";
      if (c.indexOf("visit:") === 0) return "At the start of visit " + c.slice(6);
      if (c.indexOf("loan:") === 0) return "With loan " + c.slice(5);
      return c;
    }
  };

  GF.consents = {
    PURPOSES: PURPOSES, SLOTS: SLOTS, L: L, documents: documents, versions: versions, placements: placements, records: records, COVERED: COVERED,
    get: function (id) { return docById[id] || byVersion(id) || records.find(function (x) { return x.id === id; }); },
    doc: function (id) { return docById[id]; }, version: byVersion,
    versionsOf: versionsOf, live: live, isLive: isLive, state: state, boundTo: boundTo, slotsOf: slotsOf, languagesDiffer: languagesDiffer,
    upcoming: upcoming, termsState: termsState,
    recordsOf: recordsOf, recordsOfLogin: recordsOfLogin, current: current, currentTerms: currentTerms, needsReconsent: needsReconsent, allows: allows, how: how,
    partnerDocs: function (partnerId) { return documents.filter(function (d) { return d.owner === partnerId; }); },
    /** For a partner (24 amendment): loan.sharing bound for it, with a version in force. */
    sharingReady: function (partnerId) { var d = boundTo("loan.sharing", partnerId); return !!(d && (live(d.id, "en") || live(d.id, "sw"))); },
    add: function (rec) { records.push(rec); }
  };
})(typeof window !== "undefined" ? window : globalThis);
