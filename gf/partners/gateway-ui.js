/* gateway-ui.js: what the gateway log screens share (phase 17, UI-120; note 24 part 2, note 27, both
 * signed off 2026-11-09). Loaded after the data files (gateway.js last), console.js and partners-ui.js.
 *
 * The logs are lending_partners.operate: Operations and up (owner full ops). View only doesn't see them.
 * Every row is written by the gateway and never edited; staff may run a FAILED event again after a fix,
 * and ask the gateway to poll a loan (loans.follow_up, Operations and up).
 */
(function () {
  "use strict";
  var U = PartnersUI, esc = U.esc, f = GF.fmt, Gw = GF.gateway, Lo = GF.loans;
  var OPERATE = "owner full ops";
  /** Events · Calls · Data reads: the gateway's own second level. */
  function tabs(current) {
    var t = [["events", "Events", "events.html"], ["calls", "Calls", "calls.html"], ["reads", "Data reads", "reads.html"]];
    return '<div class="chip-row" role="tablist" aria-label="Gateway logs" id="gw-tabs">' + t.map(function (x) {
      return x[0] === current ? '<span class="chip" role="tab" aria-selected="true" aria-checked="true">' + x[1] + "</span>" : '<a class="chip" role="tab" aria-selected="false" href="' + x[2] + '">' + x[1] + "</a>";
    }).join("") + "</div>";
  }
  /** Our loan reference, linked to the loan when it exists (the gateway keeps refs as text, never FKs). */
  function loanByRef(ref) { return ref && Lo ? Lo.loans.find(function (l) { return l.reference === ref; }) : null; }
  function refLink(ref) {
    if (!ref) return '<span class="tone-muted">None</span>';
    var l = loanByRef(ref);
    return l ? '<a class="tabular" href="../loans/loan.html?l=' + l.id + '">' + esc(ref) + "</a>" : '<span class="tabular">' + esc(ref) + '</span> <span class="text-body-sm tone-muted">(not found yet)</span>';
  }
  function partnerName(id) { var p = GF.partners.get(id); return p ? p.name : id; }
  function pre(obj) {
    var text = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    try { if (typeof obj === "string") text = JSON.stringify(JSON.parse(obj), null, 2); } catch (e) {}
    return '<div class="card" style="overflow-x:auto"><code style="white-space:pre;display:block;font-size:13px;line-height:18px">' + esc(text) + "</code></div>";
  }
  /** Run a FAILED event again (24 part 2): after a fix; it never edits the event. */
  function runAgain(id) {
    var ev = Gw.get(id);
    Proto.confirm({ title: "Run this event again?", message: "Processing runs again on the event exactly as received, after a fix on our side. The event itself is never edited; the attempt is counted (now " + ev.attempts + ").",
      confirm: "Run again", onConfirm: function () { Proto.snack("Running again: the result shows here when it finishes"); } });
  }
  /** Ask the gateway to poll one loan (27, the poll; loans.follow_up). */
  function pollLoan(ref) {
    Proto.confirm({ title: "Poll " + ref + "?", message: "The gateway reads the loan's status, schedule, payments and charges from the partner now. What it finds missing is applied as POLL events; what it can't settle is flagged.",
      confirm: "Poll now", onConfirm: function () { Proto.snack("Polling " + ref); } });
  }
  window.GatewayUI = { OPERATE: OPERATE, tabs: tabs, refLink: refLink, loanByRef: loanByRef, partnerName: partnerName, pre: pre, runAgain: runAgain, pollLoan: pollLoan };
})();
